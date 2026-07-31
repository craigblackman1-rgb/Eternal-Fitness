"use client";

import Link from "next/link";
import { IconChevronLeft } from "@/components/icons";
import type { ClientDocument } from "@/lib/documents/types";
import { DocumentSignClient } from "@/app/documents/[id]/sign/DocumentSignClient";

/**
 * The portal's single document page — deliberately the exact same renderer
 * (DocumentSignClient/DocumentView) used by the hub-generated email/copied
 * link, so a client sees an identical document whichever way they reach it.
 * Only the "back to your documents" link is portal-specific.
 */
export function PortalDocumentClient({ doc }: { doc: ClientDocument }) {
  return (
    <div>
      <Link
        href="/portal/documents"
        className="no-print inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <IconChevronLeft className="w-4 h-4" />
        All documents
      </Link>
      <DocumentSignClient doc={doc} />
    </div>
  );
}
