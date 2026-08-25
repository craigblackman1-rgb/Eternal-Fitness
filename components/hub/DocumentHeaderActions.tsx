"use client";

import { useState } from "react";
import { IconPlus, IconUpload } from "@/components/icons";
import { DocumentUploadForm } from "@/components/hub/DocumentUploadForm";
import Link from "next/link";

interface DocumentHeaderActionsProps {
  clientNumber: number;
}

export function DocumentHeaderActions({ clientNumber }: DocumentHeaderActionsProps) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {!showUpload && (
        <>
          <Link
            href={`/hub/clients/${clientNumber}/documents`}
            className="inline-flex items-center gap-1 rounded-lg bg-rose px-2.5 h-7 text-xs font-medium text-white hover:bg-rose/90"
          >
            <IconPlus className="h-3 w-3" />
            Create document
          </Link>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 h-7 text-xs font-medium text-foreground hover:bg-[var(--hub-hover)]"
          >
            <IconUpload className="h-3 w-3" />
            Upload existing document
          </button>
        </>
      )}
      {showUpload && (
        <DocumentUploadForm clientNumber={clientNumber} onDone={() => setShowUpload(false)} />
      )}
    </div>
  );
}
