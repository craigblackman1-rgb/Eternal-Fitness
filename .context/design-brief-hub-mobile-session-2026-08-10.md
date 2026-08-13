# Design Brief — L3a Mockups: Mobile Session PWA + Desktop Touch-Points

**For:** whoever builds these — Craig directly, or briefed to a design tool (OpenDesign)
**Output location:** `D:\apps\design-systems\ef-control-hub\` (same folder as every existing `hub-*.html`)
**Gate:** these 7 files, signed off by Craig, before any code in L4 starts (`wo-eternalfitness-hub-mobile-session-pwa-2026-08-10`, `.context/workorder-eternalfitness-hub-mobile-session-pwa-2026-08-10.md`)

Static HTML files, same format as every existing `hub-*.html` mockup — self-contained, embedded CSS/JS, `data-od-id="hub-m-…"` on `<body>`, no build step. Not code that ships; a design reference the real implementation gets checked against (Design Parity Gate, `/gate`).

---

## Conventions to reuse — don't invent new ones

**Base every mobile file on `hub-session-log.html`.** It's the one genuinely mobile-first mockup in the folder already — copy its `<head>`, its token block, and its structural patterns rather than starting blank.

**Mobile token aliases** (from `hub-session-log.html`'s `:root`) — use these names, not the desktop `--hub-*` set:
```
--rose --teal --ink --navy --body --muted --canvas --card --border --hover
--field-border --field-hover --s-primary/-bg/-bd --s-success/-bg/-bd
--font --shadow-sm --shadow-lg
```
Same hex values as the desktop `--hub-*` tokens, different names — a mobile file using `--hub-card` instead of `--card` is wrong, not just inconsistent.

**Desktop token block** (for the 3 desktop files) — the standard `hub-dashboard.html` set: `--color-rose/-teal/-amber/-ink/-body/-muted-text/-white`, `--hub-canvas/-card/-border/-hover/-sidebar/-sidebar-hover/-sidebar-active`, `--hub-field-border/-hover`, `--hub-section-border`, `--status-{primary|success|warning|danger|neutral}` (+ `-bg`/`-border`), `--font-body`, `--hub-shadow`, `--max: 1400px`.

**Mobile-specific technical requirements** (all 4 mobile files):
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` on any sticky/fixed top or bottom bar
- `-webkit-tap-highlight-color: transparent`; `button { touch-action: manipulation; }`
- Numeric inputs get `inputmode="numeric"` or `inputmode="decimal"`
- Base styles ARE the phone layout — breakpoints scale *up* (`@media (min-width: 700px)`), not down
- Everything interactive is delegated off `data-action="…"` + `data-id`/`data-idx` attributes, matching every existing mockup's script convention
- 44×44px minimum tap targets throughout

**No bottom tab bar exists anywhere in the estate yet — `hub-m-today.html` invents it.** Once designed there, the other 3 mobile files reuse the identical bar, not a redrawn variant.

---

## The 4 mobile screens

### 1. `hub-m-today.html` — Today tab (default screen on launch)

**Purpose:** the first thing Esther sees opening the PWA. Day-at-a-time, not a calendar grid (matches the existing desktop `hub-schedule.html` pattern — single-day agenda with prev/next day paging, not a month/week view).

**Must show:**
- Bottom tab bar: Today (active) / Train / Clients — **this is the reference implementation for the bar used on the other 3 screens**
- Day nav — prev/next day chevrons, jump-to-date, matching `hub-schedule.html`'s `.daynav` pattern
- Today's sessions in time order, each a tappable card → leads to screen 2 (`hub-m-train.html`) for that session
- A double-booking / clash indicator, reusing `hub-schedule.html`'s `.clash-pill` concept
- Below the session list: date-driven upcoming tasks (from the existing task system)
- Empty state for a day with nothing scheduled
- A visible "Desktop site" link/toggle (escape hatch back to `/hub`)

**States:** populated day, empty day, a day with a clash warning.

### 2. `hub-m-train.html` — the live session screen (the primary screen)

**Purpose:** supersedes `hub-session-log.html` as the actual training-delivery screen. This is the one screen Esther will have open the most.

**Must show, per L0's confirmed answers:**
- Sticky header: client name, session/block/date meta, status pill, progress bar (base this directly on `hub-session-log.html`'s `.top`)
- **Archetype filter is implicit** — only the session's own A/B/C archetype content shows; there's no toggle, the session already is one archetype
- Sections: Warm-up / Main / Cooldown, collapsible, same as `hub-session-log.html`'s `.sec` pattern — **the warm-up section is unchanged, it's a separate mechanism from warm-up sets (below)**
- Per exercise: **thumbnail image** (from `exercises.image_url`) and a **video link/icon** (from `exercises.video_url`) — neither exists in the current live-log mockup, this is new
- Prescribed reps + tempo shown inline per exercise (already exists in `hub-session-log.html`, keep)
- Per set row: reps/weight or duration input (existing pattern) — **plus a "Warm-up" badge on whichever of the first N sets are flagged as warm-up** (e.g. sets 1-2 of a 5-set exercise show the badge, sets 3-5 don't)
- **Weight unit is shown but not a toggle the trainer operates every time** — label reads "kg" or "lb" depending on the exercise's equipment (band-tagged exercises show "lb" by default); include a small inline "switch unit" affordance for the rare correction, not a prominent control
- **"Add set" affordance** on each exercise — tapping adds a 4th/5th/etc. set to that exercise mid-session
- **One "Start Rest" control per exercise/set**, not two separate widgets — tapping it opens **a single countdown/stopwatch mode switch** (two tabs or a toggle within one control), with countdown pre-filled from `Exercise.rest`. Design both the pre-trigger state (a button, e.g. "Rest 60s") and the running state (large numeral, count down or count up depending on mode, a stop/skip action)
- **Superset group card** (reuse `hub-session-log.html`'s `.grp-wrap`/`.grp-pill`), but this mockup needs the group to be **actionable, not read-only**: an "Ungroup" action on an existing group, AND a way to select 2+ exercises and "Group as superset" — design the selection-mode UI (checkboxes appearing on exercise rows, a floating "Group selected" action bar)
- **Estimated completion time** — a static label, explicitly presented as a guide (e.g. "~55 min"), not tied to a live countdown of remaining tempo/rest
- RPE + fatigue + notes summary card (existing pattern from `hub-session-log.html`, keep)
- Sticky "Mark session complete" bottom bar + confirm overlay (existing pattern, keep)
- Bottom tab bar (Train active)
- An entry point into screen 3 (an "Edit workout" or "+" action opening `hub-m-train-edit.html`)
- A **conflict/offline state**: what does the screen look like when a save fails or the connection drops mid-session (ties to L5, but the visual state belongs in this mockup)

**States to design explicitly:** empty/not-started session, mid-session with a mix of done/pending/skipped sets, a superset group in both read and selection mode, the rest-control in idle/countdown/stopwatch-running states, the complete-confirm overlay, an offline/save-failed banner.

### 3. `hub-m-train-edit.html` — the mid-session edit sheet

**Purpose:** everything from screen 2's "Edit workout" entry point. A sheet/drawer over the train screen, not a separate full page (confirm this pattern rather than a hard navigation — she shouldn't lose her place in the live session).

**Must show, per L0:**
- Add a single exercise (search/pick from the exercise library, with its thumbnail)
- **Add from a previous session or block for this client** — a picker listing past completed sessions/blocks (client + date + block labelled), NOT just "the latest one" — this is broader than the existing desktop "Roll Over Previous Session" button
- **Add from the workout template library** — a picker into `workout_templates`, filterable the same way the existing template browser is
- Remove an exercise
- Group multiple selected exercises into a new superset / tri-set (N-way, not just pairs)
- Ungroup an existing superset

**States:** the picker empty-state, a populated previous-session list, a populated template list, multi-select-for-grouping in progress.

### 4. `hub-m-clients.html` — reduced client list + detail

**Purpose:** read-mostly. Not the desktop client-detail page shrunk down — a deliberately smaller subset.

**Must show:**
- List: name, next session, at-a-glance medical/compliance flag if one exists — reuse `HubTable`-equivalent styling but mobile-native (card list, not a horizontal-scroll table — see `hub-site-content.html`'s `@media (max-width: 700px)` card-list pattern, the best existing example of a mobile-reflowed table in the estate)
- Detail: contact info, medical/compliance flags, current block summary, recent sessions (tap through to `hub-m-train.html` for a past session's log, read-only)
- Explicitly **absent**: no document editing, no cashflow, no admin actions, no send-update composer — this screen is for glancing at a client before/during a session, not managing them
- Bottom tab bar (Clients active)

**States:** list populated, a client with a medical flag, empty search/filter result.

---

## The 3 desktop screens (existing files, add states — don't create new files for these)

### 5. `hub-session-editor.html` — add two new states

- **"Live on Esther's phone right now" lock banner** — shown when the session's `started_at` is set and `completed_at` is null. Non-destructive: the editor can still be viewed, but the Save action is disabled or requires an explicit confirm, with copy making clear why ("This session is being logged live on Esther's phone — changes here may conflict").
- **409 conflict state** — shown if a save is attempted and the server rejects it because the mobile side changed the session first. Refuse-and-reload pattern: the save fails, a clear message explains what happened, and a "Reload" action re-fetches the current state. Don't design a merge UI — there isn't one.

### 6. `hub-settings-integrations.html` — new screen, standard desktop chrome

Settings → Integrations, the Outlook/Microsoft Graph connection (matches `app/hub/(protected)/settings/` conventions — sibling to Training Rules, Studio Equipment, Plan Agent Rules in the sidebar).

**States:**
- Disconnected — a "Connect Outlook" CTA, brief copy on what it does (one-way: hub sessions appear on her calendar)
- Connecting — mid-OAuth-redirect state (brief, likely just a loading treatment)
- Connected — shows the linked Microsoft account (email), the target calendar name, last-sync time, a "Disconnect" action
- Token expired / needs re-auth — a warning state distinct from disconnected, since it means sync silently stopped
- Calendar picker — if she has multiple calendars, which one hub sessions sync to (recommend a dedicated "Eternal Fitness" calendar per the WO, not her personal default)

### 7. `hub-schedule.html` — add a deep-link affordance

- Each session row needs a visible way to say "open this on your phone" — since tapping the row on desktop should behave differently than tapping it on the phone (phone → straight into `hub-m-train.html`; desktop → today's existing behaviour, or a QR/link affordance to hand off to the phone)
- A "View on mobile" or equivalent treatment, consistent with whatever `hub-m-today.html` and `hub-m-train.html` end up looking like once designed

---

## What NOT to do

- Don't touch the sidebar/nav grouping or any other desktop screen not listed above — that's L3b, a separate parallel lane with its own sign-off, deliberately not bundled with this gate.
- Don't design a merge/real-time-collaboration UI for the 409 state — the plan is refuse-and-reload, not operational transform.
- Don't add a global kg/lb toggle anywhere — L0 confirmed unit is derived per-exercise from equipment, not a setting.
- Don't design two separate timer widgets — one control, countdown/stopwatch is a mode switch on it.

---

## If Claude should build the first pass instead

I can draft first-cut HTML for all 7 files directly against these conventions — same self-contained format as the existing mockups, ready for you to mark up rather than starting from a blank page. Say the word and I'll produce them; otherwise this brief is what goes to whoever does build them.
