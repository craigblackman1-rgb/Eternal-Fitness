# Design roadmap — the hub, one surface at a time

**Work Order:** `wo-ef-client-record-flow-2026-09-03`
**Brief:** `.context/design-brief-client-record-flow-2026-09-03.md` (Craig, 3 Sep)
**Governing constraint:** Esther has ADHD. Cognitive load is the specification.
**Method Craig set:** the whole client profile and every route out of it, **one screen at a time.**

---

## The method, applied identically to every surface

Doing this consistently is what stops surface 7 contradicting surface 2.

1. **Drive the live screen** on production and inventory what is actually there — not what we
   think is there. Screenshot plus rendered text.
2. **Score it against the six rules** from the brief: no tabs · queue before record · depth
   sideways not down · one click to act, one click to see · nothing on screen that says nothing ·
   less text. Every failure written down with evidence.
3. **Draw it** against the brief, reusing the primitives below. New primitives only when the
   surface genuinely needs one, and then they go into the shared set.
4. **Measure before showing Craig** — contrast on every coloured label, and a check that the
   thing she opened the screen to do is above the fold.
5. **Craig reviews** in the browser pane and marks it up.
6. **Register the CR, brief the lane, hand-review the diff, verify live.** No lane self-report.

---

## Shared primitives — the design system additions this brief has produced

These already exist in `hub-client-record-v4-flow.html` and are what every later surface reuses.
They should be lifted into the pattern spec once two more surfaces have used them.

| Primitive | What it is |
|---|---|
| **Drawer standard** | 3 widths (420 / 560 / 720). Right edge, full height, 40% scrim. Esc + scrim + X always dismiss. Stacks exactly ONE level with a back affordance. Never contains a tab. Focus to heading on open, back to opener on close, `preventScroll` so the page never moves. |
| **Action row** | dot · what it is · **one** action. Nothing else may live in a row. Used by the queue and by session lists. |
| **Panel accent** | Semantic, four colours, same meaning everywhere: teal = the plan and the arrangement · amber = constraints and cautions · rose = her body · ink = the audit trail. Filled header, 3px coloured top edge. |
| **Superset block** | A pair reads as one object: 4px coloured left edge, tinted header, inner rule that stops short of the edges. Tints cycle so adjacent pairs never match. |
| **Density tokens** | `--d-row-y`, `--d-section-gap`, `--d-block-gap`. "Too long" becomes a knob, not an argument. |
| **Quiet empty** | A missing value is a short sentence and one action, or it is not on screen. No em-dash is ever a value. |
| **Edit in place** | There is no edit *page*. A drawer's values become fields; footer swaps to Cancel/Save. Editing never moves her. |
| **Text-weight colours** | `--status-*-text` for any coloured TEXT. The fill hues fail WCAG AA as text (primary 2.73:1, warning 2.80:1, success 4.21:1). Danger is the exception and is compliant. |

---

## Sequence

Ordered by what Esther touches most, and by dependency — the record first because it defines the
primitives everything else reuses.

### S0 · Client record — studio client ✅ DONE
`hub-client-record-v4-flow.html`. One screen, no tabs. Header · drawer strip · Needs you ·
Training. Eight drawers: workout, block, progress, pre-app history, profile, health, compliance,
documents, comms, package. Emma Atkinson, real production data.

### S1 · Client record — home-training client
Same surface, second state. Monique Weardon: portal self-logging, the 7-day gone-quiet alert,
equipment chips, supplementary work that actually exists, and a package with almost nothing
recorded. **This is the cheap proof that the design generalises** rather than fitting one client.
Do it before anything else.

### S2 · Block page
The most-used route out of the record. Its current mockup (`hub-block-at-a-glance.html`) is
already behind the code — it contains no Assign-workout affordance at all. Needs redrawing, not
patching. Must absorb the session-row action set the record now implies.

### S3 · Session / workout log
The delivery screen — what Esther looks at with a client in front of her, mid-session. **The
highest-stakes surface for the ADHD constraint**, and the one where a wall of numbers costs the
most. Currently `SessionWorkoutLog.tsx` is 74KB and `SessionEditor.tsx` 64KB.

### S4 · Schedule triage
One screen for all six exception queues (Craig's route decision 3). This is where the 29 Outlook
rows went when they left the client record — so the record's design is not finished until this
screen exists to receive them.

### S5 · Today
The entry point; where the day starts and where Tasks now folds in. Should be the same
"Needs you" pattern at estate level rather than per client.

### S6 · Clients list
The way into every record. Currently a table with a Compliance column and cadence — needs to
answer "who needs me today" before "who exists".

### S7 · Documents and the document viewer
Documents is already the strongest surface in the hub. Mostly a conform-to-the-new-primitives
pass, not a redesign.

### S8 · Write an update, and the client review flow
The two guided flows. The record currently has no representation of the review flow at all —
it should appear in Needs you when one is due, and that trigger needs deciding.

### S9 · Finance touchpoints
Raise invoice from a client, and what comes back to the record. Smallest surface, depends on S0.

### S10 · Mobile session-running tool
Not parity — Craig's route decision 6 keeps mobile as the session-running tool only. A pass to
make sure it speaks the same language as S3.

---

## Cross-cutting, running alongside

- **Hub-wide contrast sweep** — adopt `--status-*-text` at ~108 call sites. In flight
  (`lane/ef-contrast-sweep`).
- **Vocabulary ruling** — template vs workout (`wo ask qmtl462i6db`). Blocks every copy change.
- **Ungated Outlook delete** — `lib/calendar-sync.ts:222` (deferred `dmtl5io5w60`).
- **Pattern spec** — lift the primitives table above into the shared spec after S2 and S3 have
  used them, so it is derived from real use rather than asserted up front.

---

## Open questions to settle at the right moment, not now

1. **S8** — what triggers "a client review is due"? Time since last review, block completion, or
   Esther marking it?
2. **S5** — does Today show every client needing something, or only today's booked clients?
3. **S2/S3** — the block page and the session screen overlap. Is the session screen reachable
   only through a block, or also directly from Today?
