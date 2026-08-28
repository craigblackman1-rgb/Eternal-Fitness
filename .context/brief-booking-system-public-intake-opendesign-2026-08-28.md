# Open Design brief — Public discovery-call intake + booking (CR-EF-097, unit u1b)

## Context
Esther currently uses a Microsoft Bookings form for discovery calls with new leads. It captures nothing useful before the call — she goes in blind on goals, health conditions, or what the person actually wants. CR-EF-097 replaces this with a native public page: no login required (unlike the portal booking flow, which is for existing clients only), reached via one standing public link (shareable from the site, social, etc.) — it does not need to be linked from primary site nav, but should read as genuinely part of the Eternal Fitness brand, not a bolted-on form.

## What to design
A single public page (or short 2-step flow — designer's call) that:
1. Captures the information Esther needs before a discovery call. Propose a sensible field set (not yet confirmed with Esther — flag as provisional): name, phone, email, what they want to achieve, relevant health conditions/injuries she should know about before proposing exercises, current activity level, preferred contact method, and a note field. Keep it short — this is a lead-capture form, not a full PAR-Q (that happens later, through the existing document engine, once they're a client).
2. Lets them pick a discovery-call slot from Esther's genuinely free time — same live-availability requirement as the portal flow: must reflect her real Outlook calendar, not just this app's own data, so it can never double-book against something she's already got on (client session, personal appointment, anything).
3. Confirms the booking clearly (what/when, what happens next) and should feel reassuring/low-pressure — this is often someone's first contact with Eternal Fitness, potentially someone anxious about starting exercise (cancer rehab, mobility issues, visual impairment — the practice's actual client base). Tone matters here more than on an internal tool.
4. No account/login of any kind — one-shot public form.

## Design constraints
- Match the marketing site's design system (`brand-staging-2662e9` / `app/design-system.css`, `.ds-*` classes, brand tokens) — this is public-facing and must look like the rest of eternal-fitness.co.uk, not the hub or portal.
- Mobile-first.
- States needed: form, availability loading, slot picker, slot taken (race condition — someone else grabbed it, need reselect), confirmed, error/retry.
- No condition roll-calls in the visible copy (project-wide brand rule) — the health-conditions field is a private data-capture field for Esther, not marketing copy, so this rule is about the surrounding page text, not the form field itself.

## Out of scope for this brief
- The portal booking flow for existing clients (separate brief, `ef-client-portal` project).
- Confirming the exact intake field list with Esther — that's a separate gated item (WO unit u2); this brief should propose a reasonable default set and flag it as provisional in the design notes.
