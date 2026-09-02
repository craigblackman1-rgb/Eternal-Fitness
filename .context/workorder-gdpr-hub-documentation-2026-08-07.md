# Work Order: GDPR internal documentation in the hub — 2026-08-07

OWNER: (cleared — session closed 2026-08-07. Only remaining gate: Esther+Craig sign the DPA)
SCOPE: eternal-fitness-website (app/hub/(protected)/process-quality — SOPs + Process Register tabs only; no new feature, no schema changes expected)

GOAL: the internal GDPR/data-protection documentation a business processing special-category health data actually needs (ROPA, breach procedure + log, Subject Access Request procedure, processor/DPA register, retention schedule, internal data-handling policy) exists as real, accurate SOP/Process Register entries in the hub's existing Process & Quality module — not a new feature, not generic boilerplate.
MUST: ground every entry in the actual live Privacy Policy/Cookie Policy/Terms (eternal-fitness-website commit `39a8c44`, pushed 2026-08-07) and the actual codebase (confirmed processors: Microsoft Bookings, email provider via `lib/email.ts`, hosting/DB, the OpenRouter-routed AI assistant in `app/api/claude/*`, Trainerize historic import). Use the existing `Sop`/`ProcessEntry` types and DB tables (`db/migrations/20260720_process_quality_system.sql`, `20260730_sops_meta_fields.sql`) as-is — don't add new columns/tables unless something in DONE genuinely can't be represented in the existing schema. **Read the live `sops`/`process_register` tables before writing anything** — Lane B of an earlier WO seeded some Process Register/SOP content that Esther hadn't reviewed as of late July; don't duplicate or silently overwrite it.
FORBIDDEN: app/about, app/contact, app/faqs, app/personal-training, app/pricing, app/testimonials, app/privacy-policy, app/terms, app/cookies-policy, components/Navbar.tsx, components/Footer.tsx, components/ConsultationDialog* (all already handled this session — out of scope here). No `db/migrations` schema changes without checking DONE can't be met with the existing schema first.
DECIDE YOURSELF: SOP wording, `ref` numbering scheme, `area`/`category` naming (recommend grouping everything under a "Data Protection" area, consistent with the module's existing area-based grouping), whether the ROPA becomes one SOP entry or a Process Register entry with a linked SOP — whatever fits the existing module's actual usage pattern once you've read it live.
ASK FIRST — RESOLVED 2026-08-07:
- ICO registration: **not done yet** (Craig confirmed). Content is drafted but should not be presented as proof of full compliance until registration completes — flag this if Esther asks.
- Decoded Ops DB-access wording: **resolved via a full DPA** (see DONE — Processor/DPA register above), not just a register line. Awaiting signature.
- Craig's hub login: **confirmed he has his own**, separate from Esther's.
- No conflicts found with the pre-existing, Esther-unreviewed content (SOP-001 through SOP-010) — this WO's new entries (SOP-011–015) are additive, nothing overlaps.

**Still open:** get Esther and Craig's actual signatures on the DPA; once ICO registration completes, that status should be noted wherever it's referenced (none of the current SOP content currently claims registration is done, so nothing needs correcting — just don't imply completeness elsewhere).

## DONE  (ticks to zero = stop condition)
- [x] Live `sops` + `process_entries` tables read first (2026-08-07) — 10 existing SOPs/entries inventoried (SOP-001 through SOP-010), nothing duplicated. Found SOP-010 "Client Data Privacy & Health Record Handling" already covers general internal data-handling policy ground — no separate new entry needed for that DONE item, existing one satisfies it.
- [x] ROPA (Record of Processing Activities) — SOP-011 / PR-011, cross-checked line-by-line against the live `PrivacyPolicyClient.tsx` (commit `39a8c44`) after discovering and fixing a stale worktree (see note below)
- [x] Data breach response procedure — SOP-012 / PR-012, names the ICO 72-hour window correctly, logs every incident (reportable or not, per Art. 33(5)) via the existing Improvement Log table tagged `process_ref: SOP-012`
- [x] Subject Access Request procedure — SOP-013 / PR-013, includes the 1-month statutory deadline and a step-by-step checklist
- [x] Processor / DPA register — SOP-015 / PR-015, drafted. Five confirmed processors (Microsoft Bookings, email provider, hosting, OpenRouter AI assistant, Trainerize) are live/active. Craig asked for the Decoded Ops/Craig DB-access line to be formalised properly rather than just worded internally: drafted a real Art. 28 UK GDPR Data Processing Agreement between Esther (Controller) and Decoded Ops (Processor) — `.context/decoded-ops-dpa-2026-08-07.md`, also sent as a signable `.docx`. Covers instructions-only processing, confidentiality, security, 24hr breach notification to Esther (to meet the 72hr ICO window), sub-processor consent, and deletion/return on termination. SOP-015's Decoded Ops line now references the DPA; `PR-015.status` set to `review` (not `active`) pending signature by both parties.
- [x] Retention/deletion schedule — SOP-014 / PR-014, every period copied verbatim from the live Privacy Policy §9 (enquiries ~12 months, financial records 6 years/HMRC, PAR-Q/health for the relationship + further period, portal data while active + reasonable period after) — flagged internally that the exact "further period" for health records isn't a fixed number and should be confirmed against Esther's insurer, not invented
- [x] Internal data-handling policy — already covered by pre-existing SOP-010, confirmed still accurate, no new entry created
- [x] Every new entry cross-checked against the live Privacy Policy before being marked done — grounded in real file content, not generic AI-drafted text

**Note (2026-08-07):** this worktree (`claude/pending-changes-b8cddb`) was 3 commits behind `origin/main` when this WO was picked up — missing the actual Privacy Policy/Cookie Policy/Terms rewrite (`39a8c44`) that this WO's ROPA/retention content depends on being accurate. First read of `PrivacyPolicyClient.tsx` in this worktree returned the stale 2020 US/Termly template. Fast-forwarded (`git merge --ff-only origin/main`, no conflicts, uncommitted UI-fix changes preserved) before drafting any content, so everything above is grounded in the real, live-on-main policy text.

## LANES
- Lane A — eternal-fitness-website Process & Quality module (SOPs + Process Register) · depends on: none

## UNITS
### Lane A
- [AUTO] Read live `sops`/`process_register` tables (via hub UI or a disposable staff login per this project's standing capability) — inventory what already exists, note any overlap with this WO's scope — VERIFY: written inventory of existing rows before any new row is added
- [AUTO] ROPA SOP entry — files: DB row(s) in `sops`/`process_register` via the hub UI or a migration seed, matching `Sop`/`ProcessEntry` types in `types/index.ts` — VERIFY: cross-checked line-by-line against `app/privacy-policy/PrivacyPolicyClient.tsx` (commit `39a8c44`) for consistency, no invented processors/lawful bases beyond what that file already states
- [AUTO] Data breach procedure + log entry point — VERIFY: procedure names the ICO 72-hour requirement correctly and includes a place to log non-reportable incidents (Art. 33(5)), not just reportable ones
- [AUTO] SAR procedure — VERIFY: includes the 1-month statutory deadline and a step-by-step Esther can actually follow without further research
- [GATE] Processor/DPA register — draft the entries for Microsoft Bookings/email/hosting/OpenRouter/Trainerize freely ([AUTO]), but the Decoded Ops/Craig DB-access entry is a [GATE] — draft wording, surface to Craig, don't finalize without his explicit sign-off on how his own access is described
- [AUTO] Retention/deletion schedule SOP — VERIFY: every retention period matches the live Privacy Policy exactly, no new numbers invented
- [AUTO] Internal data-handling policy SOP — VERIFY: "who has access" section is checked against the actual current hub login state (who genuinely has a `/hub` account today), not assumed

## LEDGER
Progress written to: eternal-fitness-website/.context/state.md + handoff.md as each unit ticks.
Live status: eternal-fitness-website/.context/loop-status.md

CONTEXT: Follows directly from this session's rewrite of the three public legal pages (Privacy Policy, Cookie Policy, Terms & Conditions — pushed `39a8c44`, live on staging.eternal-fitness.co.uk), which surfaced that the site had never disclosed UK GDPR-relevant practices at all (was a stale 2020 US/Termly template). That session also confirmed, by reading the actual codebase, the real data flows this WO's documents must match: no analytics/tracking cookies on the public site; 3 essential auth cookies (hub session, `better_auth_portal_session`, hub sidebar state); PAR-Q collects genuine special-category health data (diagnosed conditions, medications, implanted devices, surgical history); an OpenRouter-routed AI assistant helps draft client update emails/training plans (explicitly excluding PAR-Q data); Microsoft Bookings is now the live consultation-booking flow (external controller for that data); no online payment processor exists; Trainerize was used historically for client data import only.

The hub's Process & Quality module (`/hub/process-quality`) already exists with Overview/Process Register/SOPs/Improvement Log tabs and a `Sop` type (`ref`, `title`, `area`, `trigger`, `owner`, `what`, `good_looks_like`, `steps[]`, `review_date`, ...) that's essentially built for exactly this kind of internal procedure documentation — this WO's working assumption is to use that module as-is rather than build anything new, but that assumption should be confirmed once the live table content is actually read (this session had no live DB/hub access to check it).

Separately flagged the same session, not part of this WO: whether Esther is registered with the ICO (Craig said 2026-08-07 he'd handle it — Tier 1 fee, currently £52/year, self-assessment at ico.org.uk/for-organisations/data-protection-fee/data-protection-fee-self-assessment/).
