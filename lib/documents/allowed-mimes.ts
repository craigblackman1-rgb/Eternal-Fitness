/** MIME types the app can render inline or serve safely. */
export const ALLOWED_MIMES = new Set([
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
export const ACCEPT_ATTRIBUTE = [...ALLOWED_MIMES].join(",");
