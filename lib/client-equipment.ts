import type { ClientEquipmentEntry } from "@/types";

/**
 * CR-EF-129/130 — normalise raw `clients.equipment` values from the DB.
 *
 * Legacy rows may be plain `string[]`. New rows are `ClientEquipmentEntry[]`.
 * NULL/undefined means "not set" (unconstrained).
 */
export function normaliseClientEquipment(value: unknown): ClientEquipmentEntry[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return null;

  if (value.length === 0) return [];

  const first = value[0];
  if (typeof first === "string") {
    return value
      .filter((v): v is string => typeof v === "string")
      .map((name) => ({ name: name.trim(), detail: "" }))
      .filter((e) => e.name.length > 0);
  }

  if (typeof first === "object" && first !== null) {
    return value
      .filter((v): v is { name?: unknown; detail?: unknown } => typeof v === "object" && v !== null)
      .map((e) => ({ name: String(e.name ?? "").trim(), detail: String(e.detail ?? "") }))
      .filter((e) => e.name.length > 0);
  }

  return null;
}

/** Extract just the names from a client's equipment entries. NULL stays NULL (unconstrained). */
export function clientEquipmentNames(value: unknown): string[] | null {
  const entries = normaliseClientEquipment(value);
  if (entries === null) return null;
  return entries.map((e) => e.name);
}

/** Human-readable list: "Dumbbells (2, 4, 6 kg pairs), Step" */
export function formatClientEquipment(entries: ClientEquipmentEntry[] | null): string {
  if (entries === null) return "Not specified";
  if (entries.length === 0) return "Bodyweight only";
  return entries
    .map((e) => (e.detail ? `${e.name} (${e.detail})` : e.name))
    .join(", ");
}
