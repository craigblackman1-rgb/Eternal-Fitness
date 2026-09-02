"use client";

import { useState } from "react";
import { IconEye } from "@/components/icons";
import { DocumentViewerDrawer } from "./DocumentViewerDrawer";

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
        {children}
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
