import { getPool } from "@/lib/pg-client";
import { computeComplianceFlags } from "@/lib/compliance";

/**
 * Who currently needs Esther's attention on paperwork/clearance, derived the
 * SAME way everywhere it is shown.
 *
 * This exists because Today and Clients were computing it differently: the
 * dashboard read the stored `compliance_status` column, while the clients
 * list ran `computeComplianceFlags` (which also folds in `outstanding_actions`
 * and the real signature state of PAR-Q / agreement / documents). Two screens
 * side by side would then quote different numbers for the same question, and
 * the one that disagreed with the client record it links to would be the one
 * people stopped trusting.
 *
 * The derived version wins: it is what the client record itself treats as
 * authoritative.
 */
export interface AttentionClient {
  clientId: string;
  clientNumber: number;
  name: string;
  /** Derived outstanding items — compliance-driven plus manually added. */
  outstanding: string[];
  doNotTrain: boolean;
}

export async function getClientsNeedingAttention(): Promise<AttentionClient[]> {
  const pool = getPool();

  const { rows: clients } = await pool.query(
    `SELECT id, client_number, name, compliance_status, outstanding_actions,
            medical_clearance_status, gp_letter_status, risk_level
       FROM clients
      WHERE client_status IS DISTINCT FROM 'archived'
      ORDER BY name`,
  );
  if (clients.length === 0) return [];
  const ids = clients.map((c: any) => c.id);

  const [docs, parqs, agreements] = await Promise.all([
    pool
      .query(`SELECT client_id, kind, status FROM client_documents WHERE client_id = ANY($1)`, [ids])
      .then((r) => r.rows),
    pool
      .query(
        `SELECT client_id, status, client_signature_date, created_at
           FROM signed_parq WHERE client_id = ANY($1) ORDER BY created_at DESC`,
        [ids],
      )
      .then((r) => r.rows),
    pool
      .query(
        `SELECT client_id, status, client_signature_date, parq_date, created_at
           FROM signed_agreements WHERE client_id = ANY($1) ORDER BY created_at DESC`,
        [ids],
      )
      .then((r) => r.rows),
  ]);

  const group = (rows: any[]) => {
    const m = new Map<string, any[]>();
    for (const r of rows) {
      const l = m.get(r.client_id) ?? [];
      l.push(r);
      m.set(r.client_id, l);
    }
    return m;
  };
  const docsBy = group(docs);
  const parqBy = group(parqs);
  const agreeBy = group(agreements);

  const out: AttentionClient[] = [];
  for (const c of clients as any[]) {
    const flags = computeComplianceFlags({
      client: c,
      latestParq: ((parqBy.get(c.id) ?? [])[0] ?? null) as any,
      latestAgreement: ((agreeBy.get(c.id) ?? [])[0] ?? null) as any,
      hasSignedParqDocument: (docsBy.get(c.id) ?? []).some((d: any) => d.kind === "parq" && d.status === "signed"),
      hasSignedAgreementDocument: (docsBy.get(c.id) ?? []).some((d: any) => d.kind === "terms" && d.status === "signed"),
    });
    const outstanding = [...flags.autoOutstanding, ...(c.outstanding_actions ?? [])];
    const doNotTrain =
      c.medical_clearance_status === "do_not_train" || flags.effectiveStatus === "do_not_train";
    if (outstanding.length > 0 || doNotTrain) {
      out.push({
        clientId: c.id,
        clientNumber: c.client_number,
        name: c.name,
        outstanding,
        doNotTrain,
      });
    }
  }
  return out;
}
