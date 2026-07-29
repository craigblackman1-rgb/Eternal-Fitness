# Lane A handoff — Calorie Calculator (public + portal)

**Commit:** `5decb98` on branch `task/calorie-calculator-2026-07-29`  
**Work Order:** `workorder-template-deployment-audit-2026-07-29.md`

## What was built

### 1. Public calorie calculator — `app/calorie-calculator/`
- **Route:** `/calorie-calculator`
- **Files:** `page.tsx` (server, metadata), `CalorieCalculatorPageClient.tsx` (client, full page), `calorie-calculator.css` (page-specific styles)
- Reproduces the exact copy, formula, and structure from `D:\apps\design-systems\brand-staging-2662e9\calorie-calculator.html`
- Includes: hero with trust sidebar, four-input personal-info form (sex/age/weight/height) with kg↔st/lb toggle, five detailed activity-level radio cards, results panel (maintenance TDEE + four target paces + low-intake floor warning), adjustable macro split with visual bar and presets, "Reading the number" section, "Honest limits" section, movement-note section, CTA band, mobile running-total bar, print support

### 2. Portal calorie guide — `app/portal/(protected)/calorie-guide/`
- **Route:** `/portal/calorie-guide` (inside the signed-in portal layout)
- **Files:** `page.tsx` (server, fetches client data via `createPortalDataClient`), `CalorieGuideClient.tsx` (client), `calorie-guide.css`
- Reproduces the exact copy and structure from `portal-calorie-calculator.html`
- Card-based stepped layout (4 steps: About you → Activity → Targets → Macro split)
- Includes: privacy alert, ink maintenance-figure display, target radio cards with kcal on the right, macro split with bar/swatches/presets, protein-per-kg display, caveats card, "What next" section, sticky total bar with print/reset
- Uses portal defaults (age: 52, weight: 72kg, height: 165cm, female) — **no weight/height columns exist in the clients table yet**, so falls back to manual entry as designed

### 3. Shared logic — `lib/calorie-calculator.ts`
- Mifflin-St Jeor BMR formula (10w + 6.25h − 5a + sex offset)
- TDEE calculation (BMR × activity multiplier)
- Target calorie calculations (Gentle: -250, Steadier: -500, Maintain: 0, Build: +300)
- Macro split (protein/carb/fat grams from percentage + total calories)
- Floor threshold (1200 female, 1500 male)
- kg↔st/lb and cm↔ft/in unit converters
- Shared constants: ACTIVITY_LEVELS, TARGETS, MACRO_PRESETS, DEFAULT_INPUTS, PORTAL_DEFAULTS

### 4. Navigation links
- **Navbar:** Added "Calorie Calculator" link between FAQs and Contact
- **Footer:** Added "Calorie Calculator" link in the Training section, after FAQs
- **Navbar breadcrumb schema:** Added `/calorie-calculator` entry
- **Portal dashboard:** Added "Quick tools" card linking to `/portal/calorie-guide`

## Verification
- `tsc --noEmit` — **passes clean** (no errors)
- `next build` — **passes clean** (both new routes appear in output)
- No new dependencies added, no DB migrations, no schema changes
- Weight/height pre-fill is not implemented (columns don't exist in `clients` table — see FALLBACK note above)

## Not pushed
Per the brief's hard rule: commits are local on `task/calorie-calculator-2026-07-29` only. No `git push`.

## Fallback note
`createPortalDataClient.getClient()` returns `{ id, name, email, delivery_mode }` — no weight/height/age/gender fields. Adding those would require a DB migration and extending `PortalClient`, both of which are prohibited by this brief. The portal page uses the same manual-entry defaults as the mockup (`PORTAL_DEFAULTS`). Once weight/height columns are added to the `clients` table, two small changes would enable pre-fill: (a) extend `getClient()` to select `weight_kg, height_cm`, (b) pass them as props into `CalorieGuideClient`.
