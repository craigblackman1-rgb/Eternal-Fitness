import type { ClientProfile } from "@/types";

/**
 * Mobile Clients tab — flag source of truth.
 *
 * The mockup (`hub-m-clients.html`) shows "medical flag" cards, but its `CLIENTS`
 * array is placeholder prose. The real, structured source in this app is the
 * client's `profile.health` block (conditions, contraindications, relevant
 * medications, pain points) plus `notes.watch_for` and `exercise_modifications` —
 * not free-text PAR-Q answers. These are the fields the desktop client detail
 * already surfaces, so the mobile screen reads the same data rather than
 * inventing a new one.
 */

export type FlagTone = "danger" | "warning" | "ok";

export interface ClientFlag {
  tone: FlagTone;
  title: string;
  detail: string;
}

/**
 * Clinical flags that matter before a session. Derives danger/warning cards from
 * the structured profile only — compliance (PAR-Q / agreement / GP letter) is
 * handled separately via `lib/compliance.ts` `computeComplianceFlags`, exactly as
 * the desktop detail page does.
 *
 * Mapping:
 *   - contraindications  → danger (an explicit "don't do this" restriction)
 *   - conditions         → warning (a diagnosis to be aware of; no per-condition
 *                          severity exists in the data, so warning is the honest
 *                          default rather than guessing danger)
 *   - medications        → warning
 *   - pain points        → warning
 *   - notes.watch_for    → warning (Esther's own "watch for" note)
 *   - exercise_modifications → warning
 */
export function buildMedicalFlags(client: {
  profile: ClientProfile | null;
  exercise_modifications: string | null;
}): ClientFlag[] {
  const p = client.profile;
  const flags: ClientFlag[] = [];

  for (const c of p?.health?.contraindications ?? []) {
    flags.push({ tone: "danger", title: "Contraindication", detail: c });
  }
  for (const c of p?.health?.conditions ?? []) {
    flags.push({ tone: "warning", title: "Condition", detail: c });
  }
  // Read both the legacy free-text field and the current structured array.
  // Deduplicate by medication name so a client with entries in both fields
  // does not see duplicate flags.
  const seenMeds = new Set<string>();
  for (const m of p?.health?.medications_relevant ?? []) {
    const key = m.toLowerCase().trim();
    if (key && !seenMeds.has(key)) {
      seenMeds.add(key);
      flags.push({ tone: "warning", title: "Medication", detail: m });
    }
  }
  for (const m of p?.health?.medications ?? []) {
    const key = m.name.toLowerCase().trim();
    if (key && !seenMeds.has(key)) {
      seenMeds.add(key);
      flags.push({ tone: "warning", title: "Medication", detail: m.name });
    }
  }
  for (const pp of p?.health?.pain_points ?? []) {
    flags.push({ tone: "warning", title: "Pain point", detail: pp });
  }
  if (p?.notes?.watch_for) {
    flags.push({ tone: "warning", title: "Watch for", detail: p.notes.watch_for });
  }
  if (client.exercise_modifications) {
    flags.push({ tone: "warning", title: "Exercise modifications", detail: client.exercise_modifications });
  }

  return flags;
}
