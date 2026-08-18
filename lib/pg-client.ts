// PostgREST-compatible shim over plain Postgres (pg).
// Replaces the Supabase JS data client so the app runs on a dedicated
// Postgres VPS with no PostgREST. Implements the chainable subset the app uses:
//   from().select()/insert()/update()/upsert()/delete()
//   .eq/.neq/.gt/.gte/.lt/.lte/.like/.ilike/.is/.in/.contains/.match/.or
//   .order/.limit/.range/.single/.maybeSingle
//   .select(cols, { count, head }) for count queries
//   to-one embeds "*, rel(cols)" / "*, rel!inner(cols)"
import { Pool, types } from "pg";

// Match Supabase/PostgREST JSON behaviour: return timestamps/dates as strings
// (not JS Date objects, which crash React rendering) and numerics as numbers.
types.setTypeParser(1114, (v) => v); // timestamp
types.setTypeParser(1184, (v) => v); // timestamptz
types.setTypeParser(1082, (v) => v); // date
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // numeric

let _pool: Pool | null = null;
export function getPool(): Pool {
  if (!_pool) {
    const cs = process.env.DATABASE_URL;
    _pool = new Pool({
      connectionString: cs,
      // Remote VPS uses TLS with a self-signed cert; accept it. Localhost (dev tunnel) = no TLS.
      ssl: cs && !/127\.0\.0\.1|localhost/.test(cs) ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return _pool;
}

type PgError = Error & { code?: string; details?: string };
type Res = { data: any; error: PgError | null; count: number | null };
type ListRes = { data: any[]; error: PgError | null; count: number | null };
type Filter = { col: string; op: string; val: unknown };

function q(id: string): string {
  return '"' + id.replace(/"/g, '""') + '"';
}

class QueryBuilder implements PromiseLike<ListRes> {
  private table: string;
  private _selectCols = "*";
  private _count = false;
  private _head = false;
  private filters: Filter[] = [];
  private _orderBy: { col: string; asc: boolean; nullsLast?: boolean }[] = [];
  private _limit: number | null = null;
  private _offset: number | null = null;
  private action: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: any = null;
  private _returning = false;
  private _returningCols = "*";
  private _single: false | "single" | "maybe" = false;
  private _onConflict = "id";
  private _orExpr: string | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    if (this.action === "select") {
      this._selectCols = cols;
      if (opts?.count) this._count = true;
      if (opts?.head) this._head = true;
    } else {
      this._returning = true;
      this._returningCols = cols;
    }
    return this;
  }
  insert(values: any) { this.action = "insert"; this.payload = values; return this; }
  update(values: any) { this.action = "update"; this.payload = values; return this; }
  upsert(values: any, opts?: { onConflict?: string }) {
    this.action = "upsert";
    this.payload = values;
    if (opts?.onConflict) this._onConflict = opts.onConflict;
    return this;
  }
  delete() { this.action = "delete"; return this; }

  private push(col: string, op: string, val: unknown) { this.filters.push({ col, op, val }); return this; }
  eq(c: string, v: unknown) { return this.push(c, "=", v); }
  neq(c: string, v: unknown) { return this.push(c, "<>", v); }
  gt(c: string, v: unknown) { return this.push(c, ">", v); }
  gte(c: string, v: unknown) { return this.push(c, ">=", v); }
  lt(c: string, v: unknown) { return this.push(c, "<", v); }
  lte(c: string, v: unknown) { return this.push(c, "<=", v); }
  like(c: string, v: unknown) { return this.push(c, "LIKE", v); }
  ilike(c: string, v: unknown) { return this.push(c, "ILIKE", v); }
  is(c: string, v: unknown) { return this.push(c, "IS", v); }
  not(c: string, op: string, v: unknown) {
    if (op === "is") return this.push(c, "IS NOT", v);
    throw new Error(`QueryBuilder.not: unsupported operator "${op}"`);
  }
  in(c: string, v: unknown[]) { return this.push(c, "IN", v); }
  contains(c: string, v: unknown) { return this.push(c, "@>", v); }
  match(obj: Record<string, unknown>) { for (const [k, v] of Object.entries(obj)) this.eq(k, v); return this; }
  or(expr: string) { this._orExpr = expr; return this; }
  order(c: string, opts?: { ascending?: boolean; nullsLast?: boolean }) { this._orderBy.push({ col: c, asc: opts?.ascending !== false, nullsLast: opts?.nullsLast }); return this; }
  limit(n: number) { this._limit = n; return this; }
  range(from: number, to: number) { this._offset = from; this._limit = to - from + 1; return this; }
  single() { this._single = "single"; return this as unknown as PromiseLike<Res>; }
  maybeSingle() { this._single = "maybe"; return this as unknown as PromiseLike<Res>; }

  then<R1 = ListRes, R2 = never>(
    onOk?: ((v: ListRes) => R1 | PromiseLike<R1>) | null,
    onErr?: ((e: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.exec().then(onOk as any, onErr);
  }

  private selectList(cols: string): string {
    if (cols.trim() === "*") return "*";
    return cols.split(",").map((c) => q(c.trim())).join(", ");
  }

  // Resolve PostgREST-style to-one embeds into correlated row_to_json subqueries.
  private buildSelectColumns(cols: string): { expr: string; innerConds: string[] } {
    if (cols.trim() === "*") return { expr: "*", innerConds: [] };
    const parts: string[] = [];
    let depth = 0, cur = "";
    for (const ch of cols) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      if (ch === "," && depth === 0) { parts.push(cur); cur = ""; }
      else cur += ch;
    }
    if (cur.trim()) parts.push(cur);

    const flat: string[] = [];
    const embeds: string[] = [];
    const innerConds: string[] = [];
    for (const raw of parts) {
      const p = raw.trim();
      const m = p.match(/^(?:([a-zA-Z_]\w*):)?([a-zA-Z_]\w*)(!inner|!left)?\s*\((.*)\)$/);
      if (m) {
        const rel = m[2];
        const alias = m[1] || rel;
        const inner = m[3] === "!inner";
        const embCols = m[4].trim();
        const fk = rel.replace(/s$/, "") + "_id";
        const innerSel = embCols === "*" ? `${q(rel)}.*` : embCols.split(",").map((c) => q(c.trim())).join(", ");
        embeds.push(
          `(SELECT row_to_json(_e) FROM (SELECT ${innerSel} FROM ${q(rel)} WHERE ${q(rel)}.${q("id")} = ${q(this.table)}.${q(fk)}) _e) AS ${q(alias)}`,
        );
        if (inner) innerConds.push(`${q(this.table)}.${q(fk)} IS NOT NULL`);
      } else if (p === "*") {
        flat.push(`${q(this.table)}.*`);
      } else {
        flat.push(q(p));
      }
    }
    return { expr: [...flat, ...embeds].join(", "), innerConds };
  }

  private where(params: unknown[]): string {
    const clauses: string[] = [];
    for (const f of this.filters) {
      if (f.op === "IN") {
        const arr = (f.val as unknown[]) ?? [];
        if (arr.length === 0) { clauses.push("false"); continue; }
        const ph = arr.map((v) => { params.push(v); return `$${params.length}`; }).join(", ");
        clauses.push(`${q(f.col)} IN (${ph})`);
      } else if (f.op === "IS" || f.op === "IS NOT") {
        const lit = f.val === null ? "NULL" : f.val === true ? "TRUE" : f.val === false ? "FALSE" : "NULL";
        clauses.push(`${q(f.col)} ${f.op} ${lit}`);
      } else {
        params.push(f.val);
        clauses.push(`${q(f.col)} ${f.op} $${params.length}`);
      }
    }
    if (this._orExpr) {
      const ops: Record<string, string> = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "LIKE", ilike: "ILIKE" };
      const parts = this._orExpr.split(",").map((seg) => {
        const [col, op, ...rest] = seg.split(".");
        const val = rest.join(".");
        if (op === "is") return `${q(col)} IS ${/^null$/i.test(val) ? "NULL" : val.toUpperCase()}`;
        const sqlOp = ops[op] ?? "=";
        params.push(op === "like" || op === "ilike" ? val.replace(/\*/g, "%") : val);
        return `${q(col)} ${sqlOp} $${params.length}`;
      });
      if (parts.length) clauses.push(`(${parts.join(" OR ")})`);
    }
    return clauses.length ? " WHERE " + clauses.join(" AND ") : "";
  }

  private async exec(): Promise<Res> {
    try {
      const params: unknown[] = [];
      let sql = "";

      if (this.action === "select") {
        let whereSql = this.where(params);
        // count / head queries
        if (this._head || this._count) {
          const countSql = `SELECT count(*)::int AS count FROM ${q(this.table)}${whereSql}`;
          const cres = await getPool().query(countSql, params);
          const count = cres.rows[0]?.count ?? 0;
          if (this._head) return { data: null, error: null, count };
          // count + data: fall through to fetch data, keep count
          const p2: unknown[] = [];
          const { expr, innerConds } = this.buildSelectColumns(this._selectCols);
          let w2 = this.where(p2);
          if (innerConds.length) w2 = w2 ? `${w2} AND ${innerConds.join(" AND ")}` : ` WHERE ${innerConds.join(" AND ")}`;
          let s2 = `SELECT ${expr} FROM ${q(this.table)}${w2}`;
          if (this._orderBy.length) s2 += " ORDER BY " + this._orderBy.map((o) => `${q(o.col)} ${o.asc ? "ASC" : "DESC"}${o.nullsLast ? " NULLS LAST" : ""}`).join(", ");
          if (this._limit != null) s2 += ` LIMIT ${this._limit}`;
          if (this._offset != null) s2 += ` OFFSET ${this._offset}`;
          const dres = await getPool().query(s2, p2);
          return { data: dres.rows, error: null, count };
        }
        const { expr, innerConds } = this.buildSelectColumns(this._selectCols);
        if (innerConds.length) whereSql = whereSql ? `${whereSql} AND ${innerConds.join(" AND ")}` : ` WHERE ${innerConds.join(" AND ")}`;
        sql = `SELECT ${expr} FROM ${q(this.table)}${whereSql}`;
        if (this._orderBy.length) sql += " ORDER BY " + this._orderBy.map((o) => `${q(o.col)} ${o.asc ? "ASC" : "DESC"}${o.nullsLast ? " NULLS LAST" : ""}`).join(", ");
        if (this._limit != null) sql += ` LIMIT ${this._limit}`;
        if (this._offset != null) sql += ` OFFSET ${this._offset}`;
      } else if (this.action === "insert" || this.action === "upsert") {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
        const cols = Object.keys(rows[0] ?? {});
        if (cols.length === 0) throw new Error("[pg-client] insert with no columns");
        const valuesSql = rows.map((r) => "(" + cols.map((c) => { params.push(r[c]); return `$${params.length}`; }).join(", ") + ")").join(", ");
        sql = `INSERT INTO ${q(this.table)} (${cols.map(q).join(", ")}) VALUES ${valuesSql}`;
        if (this.action === "upsert") {
          const conflictCols = this._onConflict.split(",").map((c) => c.trim());
          const updates = cols.filter((c) => !conflictCols.includes(c)).map((c) => `${q(c)}=EXCLUDED.${q(c)}`);
          sql += ` ON CONFLICT (${conflictCols.map(q).join(", ")}) DO ${updates.length ? "UPDATE SET " + updates.join(", ") : "NOTHING"}`;
        }
        if (this._returning) sql += ` RETURNING ${this.selectList(this._returningCols)}`;
      } else if (this.action === "update") {
        // supabase-js drops undefined values (JSON serialisation); mirror that here,
        // otherwise partial updates null out every unspecified column.
        const cols = Object.keys(this.payload ?? {}).filter((c) => this.payload[c] !== undefined);
        if (cols.length === 0) throw new Error("[pg-client] update with no defined columns");
        const setSql = cols.map((c) => { params.push(this.payload[c]); return `${q(c)}=$${params.length}`; }).join(", ");
        sql = `UPDATE ${q(this.table)} SET ${setSql}${this.where(params)}`;
        if (this._returning) sql += ` RETURNING ${this.selectList(this._returningCols)}`;
      } else if (this.action === "delete") {
        sql = `DELETE FROM ${q(this.table)}${this.where(params)}`;
        if (this._returning) sql += ` RETURNING ${this.selectList(this._returningCols)}`;
      }

      const res = await getPool().query(sql, params);
      let data: any = res.rows;
      if (this.action !== "select" && !this._returning) data = null;

      if (this._single && data) {
        if (data.length === 1) data = data[0];
        else if (this._single === "maybe") data = data.length ? data[0] : null;
        else {
          const e: PgError = Object.assign(new Error(`JSON object requested, multiple (or no) rows returned`), { code: "PGRST116" });
          return { data: null, error: e, count: null };
        }
      }
      return { data, error: null, count: res.rowCount ?? null };
    } catch (e: any) {
      return { data: null, error: e instanceof Error ? (e as PgError) : new Error(String(e)), count: null };
    }
  }
}

export type PgClient = {
  from: (table: string) => QueryBuilder;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<Res>;
};

export function createPgClient(): PgClient {
  return {
    from: (table: string) => new QueryBuilder(table),
    rpc: async (fn: string, args: Record<string, unknown> = {}) => {
      try {
        const keys = Object.keys(args);
        const params = keys.map((k) => args[k]);
        const argSql = keys.map((k, i) => `${q(k)} => $${i + 1}`).join(", ");
        const res = await getPool().query(`SELECT * FROM ${q(fn)}(${argSql})`, params);
        let data: any = res.rows;
        if (res.rows.length === 1 && Object.keys(res.rows[0]).length === 1) {
          data = res.rows[0][Object.keys(res.rows[0])[0]];
        }
        return { data, error: null, count: res.rowCount ?? null };
      } catch (e: any) {
        return { data: null, error: e instanceof Error ? (e as PgError) : new Error(String(e)), count: null };
      }
    },
  };
}
