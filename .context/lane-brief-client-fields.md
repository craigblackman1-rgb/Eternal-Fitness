# Lane: CR-EF-133 emergency contact + CR-EF-135 per-client rate & session length

**WO:** wo-ef-full-grind-2026-09-02 · Model: opencode-go/mimo-v2.5 · branch `lane/ef-client-fields`

Two related gaps on the client record. Both are Esther/Craig requests from 2026-09-02.

## CR-EF-133 — put EMERGENCY CONTACT back
It has been dropped from the client record UI. The data layer still knows about it —
`app/api/clients/route.ts` already destructures `emergency_contact`, and `signed_parq` carries emergency
contact fields. So this is a UI regression, not new capability. Restore it on the client record view and
in the onboarding wizard (`app/hub/(protected)/clients/new/`) and the edit page. Clinically important
given this client population; treat it as a field that should be hard to leave empty.

## CR-EF-135 — per-client rate and session length
Emma Atkinson buys a Block of 24 like everyone else but pays a NON-STANDARD RATE because her sessions
run 75 minutes rather than the standard. Today there is nowhere to record that: `clients` has
`package_type`, `sessions_purchased`, `payment_method`, `payment_status` — and no rate. That absence is
why she was miscoded as "Monthly ongoing" and flagged as a data mismatch.

FIRST: check whether `clients.session_duration` already exists and is simply unused — it may. Then add
what is genuinely missing: a per-client rate override, with the standard block price as the default, and
make sure session length is editable per client. Surface both on the client record, and use them wherever
package value is displayed. A migration IS expected here — additive and nullable only.

## FORBIDDEN
The block detail pages, the Outlook schedule pages, `components/hub/ClientBookingPanel.tsx`,
`lib/outlook-bookings.ts`, `lib/session-pot.ts`, `app/hub/m/` — other lanes own those.
Do NOT invent a price for anyone. Do NOT backfill any client's rate. No dev server, browser, or install.

## VERIFY
Name every file you changed and every column you added. `git diff --cached | grep -iE "postgresql://|password"` must be empty.

## COMMIT — DO NOT SKIP (four lanes today edited correctly then exited without committing)
`git add -A && git commit -m "CR-EF-133 + CR-EF-135: restore emergency contact, add per-client rate and session length"`
Do not push.
