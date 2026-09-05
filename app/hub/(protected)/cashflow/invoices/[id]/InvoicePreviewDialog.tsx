"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DocumentView } from "@/components/documents/DocumentView";
import { IconEye, IconMail, IconFileText } from "@/components/icons";
import type { ClientDocument, DocumentBody } from "@/lib/documents/types";
import type { DBInvoice } from "@/types";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: DBInvoice & { clients?: { name: string; client_number: number } | null };
}

export function InvoicePreviewDialog({ open, onOpenChange, invoice }: InvoicePreviewDialogProps) {
  const [tab, setTab] = useState<"document" | "email">("document");
  const [body, setBody] = useState<DocumentBody | null>(null);
  const [emailHtml, setEmailHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab("document");
    setBody(null);
    setEmailHtml(null);
    setError(null);
    setLoading(true);

    fetch(`/api/invoices/${invoice.id}/preview`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load preview");
        return r.json();
      })
      .then((data) => {
        setBody(data.body);
        setEmailHtml(data.emailHtml);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }, [open, invoice.id]);

  const previewDoc: ClientDocument | null = body
    ? {
        id: `preview-${invoice.id}`,
        client_id: invoice.client_id,
        kind: "invoice",
        title: `Invoice ${invoice.invoice_number}`,
        template_id: null,
        template_version: null,
        body,
        requires_client_signature: false,
        requires_trainer_signature: false,
        status: "draft",
        version: 1,
        supersedes_id: null,
        client_name: invoice.clients?.name || null,
        client_signature: null,
        client_signed_date: null,
        trainer_name: null,
        trainer_signature: null,
        trainer_signed_date: null,
        sent_at: null,
        signed_at: null,
        source_type: "generated",
        emailed: null,
        consent_choices: null,
        feedback_responses: null,
        created_at: invoice.created_at,
        updated_at: invoice.updated_at,
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[var(--hub-border)]">
          <DialogTitle className="flex items-center gap-2">
            <IconEye className="h-5 w-5 text-muted-foreground" />
            Preview — Invoice {invoice.invoice_number}
          </DialogTitle>
          <DialogDescription>
            This is exactly what the client will see. Nothing here is saved or sent.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 px-6 pt-4">
          <button
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === "document"
                ? "bg-[var(--color-rose)] text-white"
                : "bg-[var(--hub-hover)] text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("document")}
          >
            <IconFileText className="h-3.5 w-3.5" />
            Document
          </button>
          <button
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === "email"
                ? "bg-[var(--color-rose)] text-white"
                : "bg-[var(--hub-hover)] text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("email")}
          >
            <IconMail className="h-3.5 w-3.5" />
            Email
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading preview…
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-12 text-sm text-[var(--status-danger)]">
              {error}
            </div>
          )}

          {!loading && !error && tab === "document" && previewDoc && (
            <div className="rounded-lg border border-[var(--hub-border)] overflow-hidden">
              <DocumentView doc={previewDoc} showToolbar={false} />
            </div>
          )}

          {!loading && !error && tab === "email" && emailHtml && (
            <div className="rounded-lg border border-[var(--hub-border)] overflow-hidden bg-white">
              <div className="px-3 py-2 bg-[var(--hub-hover)] border-b border-[var(--hub-border)] text-xs text-muted-foreground font-medium">
                Email preview
              </div>
              <iframe
                srcDoc={emailHtml}
                title="Email preview"
                sandbox="allow-same-origin"
                className="w-full border-0"
                style={{ minHeight: "500px" }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
