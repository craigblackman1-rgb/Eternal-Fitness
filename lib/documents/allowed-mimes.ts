/**
 * MIME types the app accepts for upload and storage.
 *
 * INLINE_TYPES is a strict subset of this list — the two must never be conflated.
 * Adding a type here does NOT make it inline-servable; add to INLINE_TYPES separately
 * only when the type can be rendered safely in a browser without a download prompt.
 */
export const ALLOWED_UPLOAD_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * MIME types the file-serving route may deliver inline in the browser.
 * This is a strict subset of ALLOWED_UPLOAD_MIMES — HEIC/HEIF are deliberately
 * excluded because browsers cannot render them inline; they fall through to the
 * attachment/download path.
 */
export const INLINE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

/** Extension → MIME mapping for cross-checking the declared content-type. */
export const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

/** File extension derived from a filename (lower-case, no dot). */
export function extFromFilename(name: string | null): string {
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/** The MIME type the browser would infer for a given extension, or null if unknown. */
export function mimeFromExtension(name: string | null): string | null {
  return EXT_TO_MIME[extFromFilename(name)] ?? null;
}

/** Comma-separated list usable in an HTML accept= attribute. */
export const ACCEPT_ATTRIBUTE = [...ALLOWED_UPLOAD_MIMES].join(",");
