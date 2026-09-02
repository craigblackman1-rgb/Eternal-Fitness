// Safe, derivable data fixes (DO-SOP-012): (1) BUG-EF-111 (A) regenerate exercise uids on 3 Monique
// sessions that have ZERO set_logs and ZERO exercise-note references; (2) BUG-EF-112 Emma block 1
// renumber fd8dd288 3 -> 2 (+ data.session_number). Dry-run by default. `--apply --db prod|staging`.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { pool } = require('./db.cjs');
const APPLY = process.argv.includes('--apply');
const DB = (process.argv.find(a => a.startsWith('--db=')) || '--db=prod').slice(5);
const MONIQUE = ['a3ee0ac1','fc5427f7','ecbb3fc9'];
const EMMA_SESSION = 'fd8dd288-8dd0-4df2-9f46-50c3b210ffa0', EMMA_BLOCK = 'a2ece082-2b2b-4786-821b-fc28b9784210';
const ARCH = 'D:/apps/infrastructure/db-archives/eternal_fitness' + (DB === 'staging' ? '_staging' : '');
(async () => {
  const p = pool(DB); const c = await p.connect();
  try {
    const sess = (await c.query(`select id, session_number, block_id, parent_session_id, data from sessions where left(id::text,8) = any($1)`, [MONIQUE])).rows;
    if (sess.length !== 3) throw new Error('expected 3 Monique sessions, got ' + sess.length);
    for (const s of sess) {
      const logs = (await c.query('select count(*)::int n from set_logs where session_id=$1', [s.id])).rows[0].n;
      const notes = (await c.query('select count(*)::int n from clients where pinned_note_refs::text like $1', ['%' + s.id + '%'])).rows[0].n;
      const exNotes = Object.keys((s.data && s.data.exercise_notes) || {}).length;
      console.log(`Monique ${s.id.slice(0,8)} #${s.session_number} set_logs=${logs} note_refs=${notes} data.exercise_notes=${exNotes}`);
      if (logs || notes) throw new Error('ABORT: session has references, not safe: ' + s.id); // exercise_notes keys are remapped below
    }
    const emma = (await c.query('select id, session_number, parent_session_id, data->>\'session_number\' jsn, (select count(*)::int from set_logs l where l.session_id=s.id) logs from sessions s where block_id=$1 order by session_number', [EMMA_BLOCK])).rows;
    console.log('Emma block1 before:', emma.map(r => `${r.id.slice(0,8)} #${r.session_number} json=${r.jsn} parent=${r.parent_session_id} logs=${r.logs}`).join(' | '));
    if (!(emma.length === 2 && emma[1].id === EMMA_SESSION && emma[1].session_number === 3)) throw new Error('ABORT: Emma block 1 not in expected {1,3} state');
    // archive
    fs.mkdirSync(ARCH, { recursive: true });
    const archive = path.join(ARCH, `2026-09-02-sessions-bug-ef-111A-112-${DB}.json`);
    const rows = (await c.query('select row_to_json(s) r from sessions s where id = any($1)', [[...sess.map(s=>s.id), EMMA_SESSION]])).rows.map(r=>r.r);
    fs.writeFileSync(archive, JSON.stringify(rows, null, 1)); console.log('archived', rows.length, 'rows ->', archive);
    if (!APPLY) { console.log('DRY RUN - no changes'); return; }
    await c.query('BEGIN');
    let regen = 0;
    for (const s of sess) {
      const map = new Map(); for (const v of Object.values(s.data.versions || {})) for (const sec of ['warm_up','main_block','cooldown']) for (const ex of (v && v[sec]) || []) { if (ex && ex.uid && !map.has(ex.uid)) map.set(ex.uid, crypto.randomUUID()); }
      let str = JSON.stringify(s.data); for (const [o, n] of map) str = str.split(o).join(n); const data = JSON.parse(str); regen += map.size;
      const u = await c.query('update sessions set data=$2 where id=$1 and (select count(*) from set_logs where session_id=$1)=0', [s.id, data]);
      if (u.rowCount !== 1) { await c.query('ROLLBACK'); throw new Error('rollback: update did not hit exactly 1 row for ' + s.id); }
    }
    const e = await c.query(`update sessions set parent_session_id=null, session_number=2, data=jsonb_set(data,'{session_number}',to_jsonb(2)) where id=$1 and block_id=$2 and session_number=3`, [EMMA_SESSION, EMMA_BLOCK]);
    if (e.rowCount !== 1) { await c.query('ROLLBACK'); throw new Error('rollback: Emma update hit ' + e.rowCount); }
    await c.query('COMMIT');
    console.log(`APPLIED on ${DB}: regenerated ${regen} uids across 3 sessions; Emma fd8dd288 renumbered 3->2`);
    // verify
    const dup = (await c.query(`with ex as (select s.id sid, e->>'uid' uid from sessions s, jsonb_each(s.data->'versions') v, jsonb_each(v.value) sec, jsonb_array_elements(case when jsonb_typeof(sec.value)='array' then sec.value else '[]'::jsonb end) e where e->>'uid' is not null) select count(distinct uid)::int n from (select uid from ex group by uid having count(distinct sid)>1) d`)).rows[0].n;
    const after = (await c.query('select id, session_number, data->>\'session_number\' jsn, parent_session_id from sessions where block_id=$1 order by session_number', [EMMA_BLOCK])).rows;
    console.log('duplicated uids remaining (all sessions):', dup, '| Emma block1 after:', after.map(r=>`${r.id.slice(0,8)} #${r.session_number} json=${r.jsn} parent=${r.parent_session_id}`).join(' | '));
  } finally { c.release(); await p.end(); }
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
