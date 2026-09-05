"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HubCard, HubCardHeader, HubPageHeader, StatusBadge } from "@/components/hub";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { IconChevronLeft, IconMail, IconTrash2, IconEdit3, IconFileText, IconEye } from "@/components/icons";
import { InvoicePreviewDialog } from "./InvoicePreviewDialog";
import { toast } from "sonner";
import type { DBInvoice, DBInvoiceLineItem } from "@/types";

const fmt = (n: number) => `£${n.toFixed(2)}`;

interface InvoiceDetailClientProps {
  invoice: DBInvoice & { clients?: { name: string; client_number: number } | null };
  lineItems: DBInvoiceLineItem[];
  deliveryHistory?: ReactNode;
}

export function InvoiceDetailClient({ invoice, lineItems, deliveryHistory }: InvoiceDetailClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isDraft = invoice.status === "draft";
  const client = invoice.clients;

  const act = async (label: string, run: () => Promise<Response>, onOk: (data: unknown) => void) => {
    setBusy(label);
    try {
      const res = await run();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      onOk(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const sendInvoice = () =>
    act("send", () => fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" }), (data) => {
      const dry = Boolean((data as { dryRun?: boolean }).dryRun);
      toast.success(dry ? "Invoice created (email skipped — no backend configured)" : "Invoice sent");
      router.refresh();
    });

  const deleteInvoice = () =>
    act("delete", () => fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" }), () => {
      toast.success("Invoice deleted");
      router.push("/hub/cashflow/invoices");
    });

  return (
    <div className="space-y-6">
      <HubPageHeader
        title={
          <Link href="/hub/cashflow/invoices" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <IconChevronLeft className="w-4 h-4" />
            Invoice {invoice.invoice_number}
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-lg gap-1.5"
              onClick={() => setPreviewOpen(true)}
              aria-label="Preview invoice"
            >
              <IconEye className="h-4 w-4" />
              Preview
            </Button>
            {isDraft ? (
              <>
                <Button
                  variant="outline"
                  className="rounded-lg gap-1.5"
                  disabled
                  title="Invoice editing is not yet available — use the API to update draft invoices"
                  aria-label="Edit invoice (not yet available)"
                >
                  <IconEdit3 className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="rounded-lg gap-1.5"
                  onClick={sendInvoice}
                  disabled={busy !== null}
                  aria-label="Send invoice"
                >
                  {busy === "send" ? "…" : (
                    <>
                      <IconMail className="h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-lg gap-1.5"
                      style={{
                        color: "var(--status-danger-solid)",
                        borderColor: "var(--status-danger-solid)",
                      }}
                      disabled={busy !== null}
                      aria-label="Delete invoice"
                    >
                      <IconTrash2 className="h-4 w-4" />
                      {busy === "delete" ? "…" : "Delete"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete invoice {invoice.invoice_number}. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteInvoice}
                        disabled={busy !== null}
                        style={{
                          backgroundColor: "var(--status-danger-solid)",
                          color: "var(--status-danger-solid-fg)",
                        }}
                      >
                        {busy === "delete" ? "Deleting…" : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : null}
          </div>
        }
      />

      {isDraft && (
        <p className="text-sm text-muted-foreground rounded-lg bg-[var(--hub-canvas)] border border-[var(--hub-border)] px-3 py-2">
          This is a draft — nothing has been sent to the client yet.
        </p>
      )}

      <HubCard>
        <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Details" color="navy" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Status</p>
            <StatusBadge status={invoice.status} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Client</p>
            {client ? (
              <Link
                href={`/hub/clients/${client.client_number}`}
                className="text-sm font-medium text-foreground hover:text-rose transition-colors"
              >
                {client.name}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Issue date</p>
            <p className="text-sm text-foreground">
              {new Date(invoice.issue_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Due date</p>
            <p className="text-sm text-foreground">
              {new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </HubCard>

      <HubCard padded={false}>
        <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Line items" color="teal" className="px-5 pt-5" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--hub-border)] text-left">
                <th className="px-5 py-2.5 font-medium text-muted-foreground text-xs">Description</th>
                <th className="px-2 py-2.5 font-medium text-muted-foreground text-xs w-20 text-right">Qty</th>
                <th className="px-2 py-2.5 font-medium text-muted-foreground text-xs w-28 text-right">Unit price</th>
                <th className="px-5 py-2.5 font-medium text-muted-foreground text-xs w-28 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <tr key={li.id} className="border-b border-[var(--hub-border)]">
                  <td className="px-5 py-2.5 text-foreground">{li.description}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{li.quantity}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{fmt(li.unit_price)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-medium">{fmt(li.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[var(--hub-hover)]">
                <td colSpan={3} className="px-5 py-2.5 text-right font-semibold text-sm">
                  Total
                </td>
                <td className="px-5 py-2.5 text-right font-bold text-base tabular-nums">
                  {fmt(invoice.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </HubCard>

      {invoice.notes && (
        <HubCard>
          <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Notes" color="amber" />
          <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p>
        </HubCard>
      )}

      {deliveryHistory}

      <InvoicePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        invoice={invoice}
      />
    </div>
  );
}
