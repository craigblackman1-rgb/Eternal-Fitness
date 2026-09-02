/**
 * BUG-EF-114 — session naming helpers.
 *
 * Sessions created by the Outlook sync carry placeholder labels like
 * "Outlook booking — <client>". When exercise content is later written
 * into one of these sessions, the placeholder name must be replaced with
 * the actual workout identity.
 */

/**
 * Returns true when the label indicates an unassigned Outlook placeholder
 * (empty, undefined, or starting with "Outlook booking", case-insensitive).
 */
export function isPlaceholderLabel(label?: string | null): boolean {
  if (!label || typeof label !== "string") return true;
  return label.trimStart().toLowerCase().startsWith("outlook booking");
}

interface Source {
  focus_label?: string | null;
  archetype?: string | null;
}

/**
 * Apply the copied workout's identity to a target session's data update
 * payload — but ONLY when the target currently carries a placeholder label.
 *
 * Mutates `dataUpdate` in place (sets `dataUpdate.focus_label`) and returns
 * the archetype value to store on the sessions row.
 */
export function applyCopiedWorkoutIdentity(
  targetData: Record<string, unknown>,
  source: Source,
): string | null {
  if (!isPlaceholderLabel(targetData.focus_label as string | null | undefined)) {
    return null;
  }
  const label = source.focus_label || source.archetype || null;
  if (label) {
    targetData.focus_label = label;
  }
  return source.archetype ?? null;
}
