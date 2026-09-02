# Lane brief — FIX 2 (type coercion) `scripts/reconcile-trainerize-hub.mjs`

**WO:** wo-ef-full-grind-2026-09-02 · **Model:** opencode-go/mimo-v2.5
**Worktree:** this one. Your last commit was `922dcf6`. The script now RUNS, but its answers are wrong.

## The defect — one root cause

The script reports `MATCHED:0` and `HUB_ONLY:19` even though 13 hub blocks now have a correct
`trainerize_phase_id` that exactly equals an archive block's. It also prints `tz_account:N/A` for
every client although 20 of 22 have a `clients.trainerize_client_id`.

**Cause: node-postgres returns `INT` (int4) as a JavaScript number, but `BIGINT` (int8) as a
string.** The two columns are different widths:

- `trainerize_training_blocks.trainerize_phase_id` is **INT** → comes back as `38056627` (number)
- `blocks.trainerize_phase_id` is **BIGINT** → comes back as `"38056627"` (string)
- `clients.trainerize_client_id` is **BIGINT** → string

So this comparison at ~line 179 is always false:

```js
(h) => h.trainerize_phase_id === tz.trainerize_phase_id
```

`"38056627" === 38056627` is `false`. Every Trainerize block therefore fails to match and falls
through to HUB_ONLY.

## The fix

Normalise every id to a string at the point it leaves the query, then compare strings. Add one
helper and use it everywhere an id is compared or keyed:

```js
const idStr = (v) => (v === null || v === undefined ? null : String(v));
```

Apply it to `trainerize_phase_id` (both the archive and hub sides), `trainerize_client_id`, and
`client_id`. Do not use `parseInt`/`Number` — these ids can exceed `Number.MAX_SAFE_INTEGER` in
principle and string comparison is exact.

Also fix the `tz_account:N/A` display: it should print the client's `trainerize_client_id` when set.

**Do not change any SQL, any classification rule, or the output format.** This is a type-coercion
fix only.

## VERIFY — run it, and check the numbers are sane

`.env.local` in this worktree must contain only:

```
DATABASE_URL=postgresql://ef_staging_app:<REDACTED-see-infrastructure/credentials>@localhost:5433/eternal_fitness_staging
```

Then:

```
node scripts/reconcile-trainerize-hub.mjs --since 2026-08-02
```

**Expected result — the run is only correct if it shows all of these:**

- **MATCHED: 13** (Amanda Munday, Anne Wareing, Becky Price, Camilla Arnold, Colin Farley,
  Ellie Wallwork, Ian Healey, Odul Bozkurt, Rick Frenken, Saffron Somerset, Sam Gibbons,
  Sarah Tyler, Steph White — one block each)
- **NEW: 0** (Rick Frenken's "August 2026" block has now been promoted, so nothing is outstanding)
- **HUB_ONLY: ~8** — the genuinely hub-authored blocks: Camilla Arnold #2, Craig Blackman #1,
  Emma Atkinson #1 and #2, Monique Weardon #1, Nathan Wadey #1, Sarah Tyler #2, Tom Putnam #1,
  Test - Home Training #1
- **`tz_account:` populated** for every client except Nathan Wadey and Test - Home Training

If your numbers differ from that, the fix is not done — keep going, do not report success.
Paste the real stdout into your final message.

## COMMIT

```
git add scripts/reconcile-trainerize-hub.mjs .context/lane-brief-recon-fix2-2026-09-02.md
git commit -m "T3 fix 2: coerce bigint ids to strings so phase/client matching actually matches"
```

Do not push. No dev server, no browser.

---

## ADDENDUM (attempt 2)

Your previous run stopped because you tried to READ `.env.local` and the permission was rejected.

**`.env.local` already exists in this worktree and is correctly configured for staging. Do NOT read it, edit it, create it, or check for it. Just run the script — it reads the file itself.**

`pg` is also already installed and resolvable here. Do NOT run `npm install` or `pnpm install`.

Go straight to: edit the script, then `node scripts/reconcile-trainerize-hub.mjs --since 2026-08-02`, then commit.
