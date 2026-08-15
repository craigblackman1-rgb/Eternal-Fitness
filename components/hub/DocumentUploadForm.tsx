"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconUpload, IconX } from "@/components/icons";
import { DOCUMENT_KIND_LABEL, type DocumentKind } from "@/lib/documents/types";
import { toast } from "sonner";

interface DocumentUploadFormProps {
  clientNumber: number;
  onDone: () => void;
}

export function DocumentUploadForm({ clientNumber, onDone }: DocumentUploadFormProps) {
  const router = useRouter();
  const [kind, setKind] = useState<DocumentKind>("terms");
  const [title, setTitle] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("client_id", String(clientNumber));
      form.append("kind", kind);
      form.append("title", title);
      form.append("client_signed_date", signedDate);
      form.append("file", file);

      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast.success("Document uploaded");
      router.refresh();
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-canvas)]">
      <div className="flex flex-col gap-0.5">
        <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Document type</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as DocumentKind)}
          className="h-8 rounded-md border border-[var(--hub-border)] bg-[var(--hub-card)] px-2 text-xs"
        >
          {(Object.entries(DOCUMENT_KIND_LABEL) as [DocumentKind, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={DOCUMENT_KIND_LABEL[kind]}
          className="h-8 rounded-md border border-[var(--hub-border)] bg-[var(--hub-card)] px-2 text-xs"
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Signed date</label>
        <input
          type="date"
          value={signedDate}
          onChange={(e) => setSignedDate(e.target.value)}
          className="h-8 rounded-md border border-[var(--hub-border)] bg-[var(--hub-card)] px-2 text-xs"
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">File (any type, max 10 MB)</label>
        <input
          ref={inputRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="h-8 rounded-md border border-[var(--hub-border)] bg-[var(--hub-card)] px-2 text-xs file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-medium"
        />
      </div>
      <Button type="submit" size="sm" disabled={busy} className="h-8 rounded-lg gap-1.5 text-xs">
        <IconUpload className="h-3 w-3" />
        {busy ? "Uploading…" : "Upload"}
      </Button>
      <button type="button" onClick={onDone} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--hub-hover)]">
        <IconX className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
