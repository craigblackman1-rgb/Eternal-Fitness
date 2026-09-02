# BUG-EF-111 duplicate exercise-uid sweep (prod, read-only) — 2026-09-02T16:58:21.604Z

- Sessions total: 176 (with versions JSON: 176; cancelled: 2); exercises lacking uid: 790
- Distinct duplicated uids: 132 — scope: {"same_block":132}
- Sessions affected: 8 — (A) zero set_logs: 3 · (B) with set_logs: 5

## By client / block

| Client | client status | Block | block status | sessions | with set_logs | without |
|---|---|---|---|---|---|---|
| Emma Atkinson | active | 2 | complete | 4 | 4 | 0 |
| Monique Wearden | active | 1 | active | 4 | 1 | 3 |

## (B) sessions WITH set_logs — misattribution risk, needs human decision

| session | client | block | sess# | status | scheduled | completed | set_logs | set_logs on dup uids | dup uids |
|---|---|---|---|---|---|---|---|---|---|
| dbd376d2 | Emma Atkinson | 2 | 1 | completed | 2026-08-14T11:30 | 2026-08-17T17:03 | 31 | 31 | 9 |
| f4635373 | Emma Atkinson | 2 | 2 | completed | 2026-08-17T11:00 | 2026-08-17T12:25 | 20 | 20 | 13 |
| 9ac77530 | Emma Atkinson | 2 | 3 | completed | 2026-08-19T11:30 | 2026-08-19T12:43 | 31 | 0 | 9 |
| 2312da96 | Emma Atkinson | 2 | 4 | completed | 2026-08-21T11:30 | 2026-08-21T12:51 | 35 | 0 | 13 |
| 95d64eb6 | Monique Wearden | 1 | 7 | completed | 2026-08-19T10:00 | 2026-08-31T16:35 | 98 | 0 | 68 |

## (A) sessions with ZERO set_logs — safe to regenerate uids

| session | client | block | sess# | status | scheduled | dup uids |
|---|---|---|---|---|---|---|
| a3ee0ac1 | Monique Wearden | 1 | 3 | scheduled | 2026-09-15T10:00 | 42 |
| fc5427f7 | Monique Wearden | 1 | 5 | scheduled | 2026-10-20T10:00 | 42 |
| ecbb3fc9 | Monique Wearden | 1 | 8 | scheduled | 2026-09-01T10:00 | 68 |