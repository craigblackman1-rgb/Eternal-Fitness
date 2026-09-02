import type { MedicationEntry } from "@/types";

const NEGATIVE_ANSWERS = new Set([
  "none",
  "none atm",
  "none at the moment",
  "none currently",
  "no",
  "nil",
  "n/a",
  "na",
  "nothing",
  "not applicable",
  "no medications",
  "no medication",
  "-",
]);

function isNegativeAnswer(token: string): boolean {
  const normalised = token.toLowerCase().replace(/[.!?]+$/, "").trim();
  return NEGATIVE_ANSWERS.has(normalised);
}

/**
 * Split a free-text medications string (from PAR-Q Section 5) into individual
 * MedicationEntry objects with `name` populated and all other fields blank.
 *
 * Separators: commas, semicolons, newlines, and the word " and " (case-insensitive).
 * Negative answers ("None", "N/A", etc.) are dropped.
 */
export function parseMedicationsText(text: string): MedicationEntry[] {
  if (!text?.trim()) return [];

  const tokens = text
    .split(/[,;\n]|\s+and\s+/i)
    .map((t) => t.trim())
    .filter((t) => t !== "" && !isNegativeAnswer(t));

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
