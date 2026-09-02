// BUG-EF-111 derived sweep: exercise uids appearing in more than one session. READ-ONLY.
const fs = require('fs');
const { pool } = require('./db.cjs');

const EX_CTE = `
  ex as (
    select distinct s.id session_id, b.client_id, b.id block_id, e.elem->>'uid' uid, e.elem->>'exercise_name' exercise_name
    from sessions s join blocks b on b.id = s.block_id
    cross join lateral jsonb_each(s.data->'versions') v
    cross join lateral jsonb_each(v.value) sec
    cross join lateral jsonb_array_elements(case when jsonb_typeof(sec.value) = 'array' then sec.value else '[]'::jsonb end) e(elem)
    where s.data ? 'versions' and jsonb_typeof(s.data->'versions') = 'object' and e.elem->>'uid' is not null
  )`;

(async () => {
  const p = pool('prod');
  try {
    const one = async (sql, params) => (await p.query(sql, params)).rows[0];
    const total = (await one(`select count(*)::int n from sessions`)).n;
    const totalWithVersions = (await one(`select count(*)::int n from sessions where data ? 'versions'`)).n;
    const cancelled = (await one(`select count(*)::int n from sessions where status = 'cancelled'`)).n;
    const nullUidCount = (await one(`
      select count(*)::int n from sessions s
      cross join lateral jsonb_each(s.data->'versions') v cross join lateral jsonb_each(v.value) sec
      cross join lateral jsonb_array_elements(case when jsonb_typeof(sec.value) = 'array' then sec.value else '[]'::jsonb end) e
      where s.data ? 'versions' and jsonb_typeof(s.data->'versions') = 'object' and e->>'uid' is null`)).n;

    const dupUids = (await p.query(`with ${EX_CTE}
      select uid, count(distinct session_id)::int n_sessions, array_agg(distinct session_id::text) session_ids, array_agg(distinct exercise_name) names,
             count(distinct client_id)::int n_clients, count(distinct block_id)::int n_blocks
      from ex group by uid having count(distinct session_id) > 1 order by n_sessions desc, uid`)).rows;

    const scopeSummary = dupUids.reduce((a, r) => {
      const k = r.n_clients > 1 ? 'cross_client' : r.n_blocks > 1 ? 'cross_block_same_client' : 'same_block';
      a[k] = (a[k] || 0) + 1; return a;
    }, {});

    const affectedIds = [...new Set(dupUids.flatMap(r => r.session_ids))];
    let sessions = [];
    if (affectedIds.length) {
      sessions = (await p.query(`
        select s.id, c.name client_name, c.client_status, b.block_number, b.status block_status, s.session_number, s.week, s.status,
               s.scheduled_at, s.completed_at, s.parent_session_id, s.archetype,
          (select count(*)::int from set_logs sl where sl.session_id = s.id) set_log_count,
          (select count(*)::int from set_logs sl where sl.session_id = s.id and sl.exercise_uid = any($2)) set_logs_on_dup_uids
        from sessions s join blocks b on b.id = s.block_id join clients c on c.id = b.client_id
        where s.id = any($1::uuid[]) order by c.name, b.block_number, s.session_number`, [affectedIds, dupUids.map(r => r.uid)])).rows;
    }
    const uidsBySession = {};
    for (const r of dupUids) for (const sid of r.session_ids) (uidsBySession[sid] ||= []).push(r.uid);
    for (const s of sessions) { s.duplicated_uids = uidsBySession[s.id] || []; s.duplicated_uid_count = s.duplicated_uids.length; }

    const A = sessions.filter(s => s.set_log_count === 0);
    const B = sessions.filter(s => s.set_log_count > 0);
    const grouped = {};
    for (const s of sessions) {
      const k = `${s.client_name} / block ${s.block_number}`;
      grouped[k] ||= { client: s.client_name, client_status: s.client_status, block_number: s.block_number, block_status: s.block_status, sessions: 0, with_set_logs: 0, without_set_logs: 0 };
      grouped[k].sessions++; if (s.set_log_count > 0) grouped[k].with_set_logs++; else grouped[k].without_set_logs++;
    }

    const report = {
      generated_at: new Date().toISOString(), db: 'eternal_fitness (prod)', read_only: true,
      note: 'No archived flag exists on sessions or blocks; every session was scanned. Session status (cancelled) and client_status (archived) are carried per row for filtering.',
      totals: {
        sessions_total: total, sessions_with_versions_json: totalWithVersions, sessions_cancelled: cancelled, exercises_with_null_uid: nullUidCount,
        distinct_duplicated_uids: dupUids.length, sessions_affected: sessions.length,
        sessions_affected_zero_set_logs_A: A.length, sessions_affected_with_set_logs_B: B.length, duplicated_uid_scope: scopeSummary,
      },
      grouped_by_client_block: Object.values(grouped),
      A_safe_zero_set_logs: A, B_misattribution_risk_with_set_logs: B, duplicated_uids: dupUids,
    };
    fs.writeFileSync(`${__dirname}/bug-ef-111-dup-uid-report.json`, JSON.stringify(report, null, 2));

    const ts = d => d ? new Date(d).toISOString().slice(0, 16) : '';
    const md = [
      `# BUG-EF-111 duplicate exercise-uid sweep (prod, read-only) — ${report.generated_at}`, '',
      `- Sessions total: ${total} (with versions JSON: ${totalWithVersions}; cancelled: ${cancelled}); exercises lacking uid: ${nullUidCount}`,
      `- Distinct duplicated uids: ${dupUids.length} — scope: ${JSON.stringify(scopeSummary)}`,
      `- Sessions affected: ${sessions.length} — (A) zero set_logs: ${A.length} · (B) with set_logs: ${B.length}`, '',
      '## By client / block', '',
      '| Client | client status | Block | block status | sessions | with set_logs | without |', '|---|---|---|---|---|---|---|',
      ...Object.values(grouped).map(g => `| ${g.client} | ${g.client_status} | ${g.block_number} | ${g.block_status} | ${g.sessions} | ${g.with_set_logs} | ${g.without_set_logs} |`), '',
      '## (B) sessions WITH set_logs — misattribution risk, needs human decision', '',
      '| session | client | block | sess# | status | scheduled | completed | set_logs | set_logs on dup uids | dup uids |', '|---|---|---|---|---|---|---|---|---|---|',
      ...B.map(s => `| ${s.id.slice(0, 8)} | ${s.client_name} | ${s.block_number} | ${s.session_number} | ${s.status} | ${ts(s.scheduled_at)} | ${ts(s.completed_at)} | ${s.set_log_count} | ${s.set_logs_on_dup_uids} | ${s.duplicated_uid_count} |`), '',
      '## (A) sessions with ZERO set_logs — safe to regenerate uids', '',
      '| session | client | block | sess# | status | scheduled | dup uids |', '|---|---|---|---|---|---|---|',
      ...A.map(s => `| ${s.id.slice(0, 8)} | ${s.client_name} | ${s.block_number} | ${s.session_number} | ${s.status} | ${ts(s.scheduled_at)} | ${s.duplicated_uid_count} |`),
    ].join('\n');
    fs.writeFileSync(`${__dirname}/bug-ef-111-dup-uid-summary.md`, md);
    console.log(md);
  } finally { await p.end(); }
})().catch(e => { console.error('ERR', e.stack); process.exit(1); });
