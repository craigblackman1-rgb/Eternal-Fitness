"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DocumentView } from "@/components/documents/DocumentView";
import { IconEye, IconFileText } from "@/components/icons";
import { buildInvoiceBody } from "@/lib/documents/invoice-body";
import type { ClientDocument, DocumentBody } from "@/lib/documents/types";
import type { InvoiceTemplateLineItem } from "@/types";

interface TemplateInvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  lineItems: InvoiceTemplateLineItem[];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function TemplateInvoicePreviewDialog({
  open,
  onOpenChange,
  templateName,
  lineItems,
}: TemplateInvoicePreviewDialogProps) {
  const subtotal = lineItems.reduce((sum, li) => sum + (li.quantity || 0) * (li.unit_price || 0), 0);

  const body: DocumentBody = buildInvoiceBody({
    invoice_number: "PREVIEW",
    issue_date: fmtDate(todayStr()),
    due_date: fmtDate(todayStr()),
    currency: "GBP",
    subtotal,
    vat_total: 0,
    total: subtotal,
    notes: null,
    line_items: lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity || 1,
      unit_price: li.unit_price || 0,
      line_total: (li.quantity || 1) * (li.unit_price || 0),
    })),
  });

  const previewDoc: ClientDocument = {
    id: "preview-template",
    client_id: "",
    kind: "invoice",
    title: templateName || "Invoice preview",
    template_id: null,
    template_version: null,
    body,
    requires_client_signature: false,
    requires_trainer_signature: false,
    status: "draft",
    version: 1,
    supersedes_id: null,
    client_name: "Sample Client",
    client_signature: null,
    client_signed_date: null,
    trainer_name: "Esther Fair",
    trainer_signature: null,
    trainer_signed_date: null,
    sent_at: null,
    signed_at: null,
    source_type: "generated",
    emailed: null,
    consent_choices: null,
    feedback_responses: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[var(--hub-border)]">
          <DialogTitle className="flex items-center gap-2">
            <IconEye className="h-5 w-5 text-muted-foreground" />
            Template preview — {templateName || "Untitled"}
          </DialogTitle>
          <DialogDescription>
            Sample data only. This is how the invoice will look with the template&apos;s line items.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="rounded-lg border border-[var(--hub-border)] overflow-hidden">
            <DocumentView doc={previewDoc} showToolbar={false} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
