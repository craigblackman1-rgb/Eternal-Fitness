export type UploadKind = "pdf" | "img" | "doc" | "other";

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic"]);
const DOC_EXTS = new Set(["doc", "docx"]);
const DOC_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function extFromName(name: string | null): string {
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function uploadKind(mime?: string | null, name?: string | null): UploadKind {
  const m = (mime || "").toLowerCase();
  const ext = extFromName(name);

  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.startsWith("image/") || IMAGE_EXTS.has(ext)) return "img";
  if (DOC_MIMES.has(m) || DOC_EXTS.has(ext)) return "doc";
  return "other";
}

export function uploadKindLabel(k: UploadKind): string {
  switch (k) {
    case "pdf": return "PDF";
    case "img": return "Image";
    case "doc": return "Word";
    case "other": return "File";
  }
}

export function formatBytes(n?: number | null): string {
  if (n == null || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
