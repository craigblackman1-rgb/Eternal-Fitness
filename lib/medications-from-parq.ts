import type { MedicationEntry } from "@/types";

/**
 * Split a free-text medications string (from PAR-Q Section 5) into individual
 * MedicationEntry objects with `name` populated and all other fields blank.
 *
 * Separators: commas, semicolons, newlines, and the word " and " (case-insensitive).
 */
export function parseMedicationsText(text: string): MedicationEntry[] {
  if (!text?.trim()) return [];

  const tokens = text
    .split(/[,;\n]|\s+and\s+/i)
    .map((t) => t.trim())
    .filter(Boolean);

  return tokens.map((name) => ({
    id: crypto.randomUUID(),
    name,
    form: "",
    frequency: "",
    treats: "",
    start_date: null,
    end_date: null,
    side_effects: "",
  }));
}

/**
 * Merge incoming MedicationEntry[] into existing[], deduplicating by
 * case-insensitive name match. Existing entries are never overwritten.
 * Returns a new array (does not mutate either input).
 */
export function mergeMedications(
  existing: MedicationEntry[],
  incoming: MedicationEntry[],
): MedicationEntry[] {
  const existingNames = new Set(existing.map((m) => m.name.toLowerCase()));
  const newEntries = incoming.filter((m) => !existingNames.has(m.name.toLowerCase()));
  return [...existing, ...newEntries];
}
