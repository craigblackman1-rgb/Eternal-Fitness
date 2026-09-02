"use client";

import { useState } from "react";
import { IconEye } from "@/components/icons";
import { DocumentViewerDrawer } from "./DocumentViewerDrawer";
import { TokenPill } from "@/components/hub/StatusBadge";
import { uploadKind, uploadKindLabel } from "@/lib/documents/upload-kind";

const UPLOAD_KIND_TOKEN: Record<string, "danger" | "success" | "neutral"> = {
  pdf: "danger",
  img: "success",
  doc: "neutral",
  other: "neutral",
};

interface OpenUploadButtonProps {
  doc: {
    id: string;
    title: string;
    source_file_name?: string | null;
    source_file_mime?: string | null;
    source_file_size?: number | null;
    created_at: string;
  };
  clientName: string;
  variant: "link" | "row";
  children?: React.ReactNode;
}

export function OpenUploadButton({ doc, clientName, variant, children }: OpenUploadButtonProps) {
  const [open, setOpen] = useState(false);
  const kind = uploadKind(doc.source_file_mime, doc.source_file_name);

  if (variant === "link") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"
          aria-haspopup="dialog"
        >
          <IconEye className="h-3 w-3" />
          Open
        </button>
        <DocumentViewerDrawer
          open={open}
          onOpenChange={setOpen}
          clientName={clientName}
          doc={doc}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="w-full text-left"
      >
        {open ? (
          <div className="border border-rose bg-rose/10 rounded-[16px]">
            {children}
          </div>
        ) : (
          children
        )}
      </button>
      <DocumentViewerDrawer
        open={open}
        onOpenChange={setOpen}
        clientName={clientName}
        doc={doc}
      />
    </>
  );
}
