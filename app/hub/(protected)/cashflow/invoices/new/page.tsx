"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { HubPageHeader, HubCard, HubCardHeader, EmptyState } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconChevronLeft, IconPlus, IconTrash2, IconFileText, IconSave } from "@/components/icons";
import type { DBInvoiceTemplate, InvoiceTemplateLineItem } from "@/types";

interface LineItem {
  key: string;
  description: string;
  quantity: number;
  unit_price: number;
}

let _id = 0;
function nextKey() {
  return `li-${++_id}`;
}

function fmt(n: number) {
  return `£${n.toFixed(2)}`;
}

export default function NewInvoicePage() {
  const router = useRouter();

  const [clients, setClients] = useState<{ id: string; name: string; client_number: number; display_code: string | null }[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; client_number: number } | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [templates, setTemplates] = useState<DBInvoiceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/invoices/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {});
  }, []);

  const searchClients = useCallback(async (q: string) => {
    if (q.length < 1) {
      setClients([]);
      return;
    }
    const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}&limit=8`);
    const data = await res.json();
    setClients(Array.isArray(data) ? data : data?.data ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchClients(clientQuery), 200);
    return () => clearTimeout(t);
  }, [clientQuery, searchClients]);

  const applyTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (t && Array.isArray(t.line_items)) {
      setLineItems(
        (t.line_items as InvoiceTemplateLineItem[]).map((li) => ({
          key: nextKey(),
          description: li.description,
          quantity: li.quantity || 1,
          unit_price: li.unit_price || 0,
        })),
      );
    }
  };

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);
  const total = subtotal;

  const addLine = () => {
    setLineItems([...lineItems, { key: nextKey(), description: "", quantity: 1, unit_price: 0 }]);
  };

  const removeLine = (key: string) => {
    setLineItems(lineItems.filter((li) => li.key !== key));
  };

  const updateLine = (key: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((li) => (li.key === key ? { ...li, [field]: value } : li)),
    );
  };

  const buildPayload = () => ({
    client_id: selectedClient?.id,
    issue_date: issueDate,
    due_date: dueDate,
    notes,
    line_items: lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
    })),
  });

  const saveDraft = async () => {
    if (!selectedClient) return toast.error("Select a client first");
    if (!dueDate) return toast.error("Enter a due date");
    if (lineItems.length === 0 || lineItems.every((li) => !li.description.trim())) {
      return toast.error("Add at least one line item with a description");
    }

    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Invoice saved as draft");
      router.push("/hub/cashflow/invoices");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const sendInvoice = async () => {
    if (!selectedClient) return toast.error("Select a client first");
    if (!dueDate) return toast.error("Enter a due date");
    if (lineItems.length === 0 || lineItems.every((li) => !li.description.trim())) {
      return toast.error("Add at least one line item with a description");
    }

    setSending(true);
    try {
      // First save the invoice
      const saveRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save");

      // Then send it
      const sendRes = await fetch(`/api/invoices/${saveData.id}/send`, { method: "POST" });
      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(sendData.error || "Failed to send");

      toast.success(sendData.dryRun ? "Invoice created (email skipped — no backend configured)" : "Invoice sent");
      router.push("/hub/cashflow/invoices");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <HubPageHeader
        title={
          <Link href="/hub/cashflow/invoices" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <IconChevronLeft className="w-4 h-4" />
            New invoice
          </Link>
        }
      />

      {/* Client picker */}
      <HubCard>
        <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Client" color="navy" />
        <div className="relative">
          {selectedClient ? (
            <div className="flex items-center justify-between p-3 bg-[var(--hub-hover)] rounded-lg">
              <div>
                <p className="font-medium text-sm">{selectedClient.name}</p>
                <p className="text-xs text-muted-foreground">Client #{selectedClient.client_number}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setClientQuery("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <Input
                placeholder="Search clients by name..."
                value={clientQuery}
                onChange={(e) => {
                  setClientQuery(e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
              />
              {showClientDropdown && clients.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--hub-hover)] transition-colors"
                      onMouseDown={() => {
                        setSelectedClient({ id: c.id, name: c.name, client_number: c.client_number });
                        setClientQuery("");
                        setShowClientDropdown(false);
                      }}
                    >
                      {c.name} <span className="text-muted-foreground">#{c.client_number}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </HubCard>

      {/* Template picker */}
      <HubCard>
        <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Template" color="slate" />
        <select
          className="w-full rounded-lg border border-[var(--hub-field-border)] px-3 py-2 text-sm bg-[var(--hub-card)] focus:outline-none focus:border-[var(--color-rose)] focus:ring-1 focus:ring-[var(--color-rose)]"
          value={selectedTemplateId}
          onChange={(e) => applyTemplate(e.target.value)}
        >
          <option value="">Start blank</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {selectedTemplateId && templates.find((t) => t.id === selectedTemplateId)?.description && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {templates.find((t) => t.id === selectedTemplateId)?.description}
          </p>
        )}
      </HubCard>

      {/* Line items */}
      <HubCard padded={false}>
        <HubCardHeader
          icon={<IconFileText className="w-4 h-4" />}
          title="Line items"
          color="teal"
          className="px-5 pt-5"
          action={
            <button onClick={addLine} className="text-xs text-rose hover:text-rose/80 font-medium flex items-center gap-1">
              <IconPlus className="w-3.5 h-3.5" />
              Add line
            </button>
          }
        />
        {lineItems.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={<IconFileText className="w-8 h-8" />}
              title="No line items"
              description="Add a line item or pick a template above"
              cta={{ label: "Add line item", onClick: addLine }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--hub-border)] text-left">
                  <th className="px-5 py-2.5 font-medium text-muted-foreground text-xs">Description</th>
                  <th className="px-2 py-2.5 font-medium text-muted-foreground text-xs w-20 text-right">Qty</th>
                  <th className="px-2 py-2.5 font-medium text-muted-foreground text-xs w-28 text-right">Unit price</th>
                  <th className="px-5 py-2.5 font-medium text-muted-foreground text-xs w-28 text-right">Total</th>
                  <th className="px-5 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li) => (
                  <tr key={li.key} className="border-b border-[var(--hub-border)] hover:bg-[var(--hub-hover)] transition-colors">
                    <td className="px-5 py-2">
                      <Input
                        className="w-full border-0 bg-transparent focus:bg-white focus:border-[var(--hub-field-border)] px-0 h-8 text-sm"
                        placeholder="Description"
                        value={li.description}
                        onChange={(e) => updateLine(li.key, "description", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        className="w-full text-right border-0 bg-transparent focus:bg-white focus:border-[var(--hub-field-border)] h-8 text-sm tabular-nums"
                        value={li.quantity}
                        onChange={(e) => updateLine(li.key, "quantity", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full text-right border-0 bg-transparent focus:bg-white focus:border-[var(--hub-field-border)] h-8 text-sm tabular-nums"
                        value={li.unit_price}
                        onChange={(e) => updateLine(li.key, "unit_price", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums font-medium">
                      {fmt(li.quantity * li.unit_price)}
                    </td>
                    <td className="px-5 py-2">
                      <button
                        onClick={() => removeLine(li.key)}
                        className="text-muted-foreground hover:text-danger p-1"
                        title="Remove line"
                      >
                        <IconTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--hub-hover)]">
                  <td colSpan={3} className="px-5 py-2.5 text-right font-semibold text-sm">
                    Total
                  </td>
                  <td className="px-5 py-2.5 text-right font-bold text-base tabular-nums">
                    {fmt(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </HubCard>

      {/* Details */}
      <HubCard>
        <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Details" color="amber" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Issue date</label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Due date <span className="text-rose">*</span>
            </label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
          <Input
            placeholder="Optional — payment instructions, reference, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </HubCard>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link href="/hub/cashflow/invoices">
          <Button variant="outline" className="rounded-lg">Cancel</Button>
        </Link>
        <Button
          variant="outline"
          className="rounded-lg gap-1.5"
          onClick={saveDraft}
          disabled={saving || sending}
        >
          <IconSave className="w-4 h-4" />
          {saving ? "Saving..." : "Save draft"}
        </Button>
        <Button
          className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white"
          onClick={sendInvoice}
          disabled={saving || sending}
        >
          {sending ? "Sending..." : "Save & send"}
        </Button>
      </div>
    </div>
  );
}
