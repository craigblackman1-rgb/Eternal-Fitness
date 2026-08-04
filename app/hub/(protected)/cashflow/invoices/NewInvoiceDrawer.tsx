"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IconX, IconPlus, IconTrash2, IconSearch } from "@/components/icons";
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

interface NewInvoiceDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const FOCUS_RING =
  "focus:outline-none focus:border-[var(--color-rose)] focus:ring-[3px] focus:ring-[rgba(193,131,159,0.3)]";

export function NewInvoiceDrawer({ open, onClose, onCreated }: NewInvoiceDrawerProps) {
  const [clients, setClients] = useState<
    { id: string; name: string; client_number: number; display_code: string | null }[]
  >([]);
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<{
    id: string;
    name: string;
    client_number: number;
  } | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [templates, setTemplates] = useState<DBInvoiceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const reset = useCallback(() => {
    setClients([]);
    setClientQuery("");
    setSelectedClient(null);
    setShowClientDropdown(false);
    setSelectedTemplateId("");
    setLineItems([]);
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setNotes("");
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      fetch("/api/invoices/templates")
        .then((r) => r.json())
        .then(setTemplates)
        .catch(() => {});
    }
  }, [open, reset]);

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
    const t = templates.find((tp) => tp.id === id);
    if (t && Array.isArray(t.line_items)) {
      setLineItems(
        (t.line_items as InvoiceTemplateLineItem[]).map((li) => ({
          key: nextKey(),
          description: li.description,
          quantity: li.quantity || 1,
          unit_price: li.unit_price || 0,
        }))
      );
    }
  };

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);

  const addLine = () => {
    setLineItems([
      ...lineItems,
      { key: nextKey(), description: "", quantity: 1, unit_price: 0 },
    ]);
  };

  const removeLine = (key: string) => {
    setLineItems(lineItems.filter((li) => li.key !== key));
  };

  const updateLine = (key: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((li) => (li.key === key ? { ...li, [field]: value } : li))
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

  const validate = () => {
    if (!selectedClient) {
      toast.error("Select a client first");
      return false;
    }
    if (!dueDate) {
      toast.error("Enter a due date");
      return false;
    }
    if (lineItems.length === 0 || lineItems.every((li) => !li.description.trim())) {
      toast.error("Add at least one line item with a description");
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    if (!validate()) return;
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
      onClose();
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const sendInvoice = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      const saveRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Failed to save");

      const sendRes = await fetch(`/api/invoices/${saveData.id}/send`, {
        method: "POST",
      });
      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(sendData.error || "Failed to send");

      toast.success(
        sendData.dryRun
          ? "Invoice created (email skipped — no backend configured)"
          : "Invoice sent"
      );
      onClose();
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-[rgba(19,19,19,0.4)] z-40",
          "transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 w-[520px] max-w-[92vw] bg-[var(--hub-card)] z-50",
          "shadow-[-20px_0_60px_rgba(0,0,0,0.18)]",
          "transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          "flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-[22px] py-[18px] border-b border-[var(--hub-border)] shrink-0">
          <h2 className="text-base font-bold text-foreground m-0">New invoice</h2>
          <button
            className="ml-auto w-8 h-8 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground grid place-items-center cursor-pointer hover:bg-[var(--hub-hover)]"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 px-[22px] py-[14px] border-b border-[var(--hub-border)] shrink-0">
          <div className="flex-1 h-1 rounded-full bg-[var(--color-rose)]" />
          <div className="flex-1 h-1 rounded-full bg-[var(--color-rose)]" />
          <div className="flex-1 h-1 rounded-full bg-[var(--hub-border)]" />
          <div className="flex-1 h-1 rounded-full bg-[var(--hub-border)]" />
        </div>

        <div className="flex-1 overflow-y-auto p-[22px]">
          <div className="mb-[18px]">
            <label className="block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1.5">
              Client
            </label>
            {selectedClient ? (
              <div className="flex items-center justify-between p-3 bg-[var(--hub-hover)] rounded-lg">
                <div>
                  <p className="font-medium text-[13.5px] text-foreground">
                    {selectedClient.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Client #{selectedClient.client_number}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedClient(null);
                    setClientQuery("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground pointer-events-none" />
                  <input
                    className={cn(
                      "w-full h-10 rounded-lg border border-[var(--hub-field-border)]",
                      "bg-[var(--hub-card)] pl-[34px] pr-3 text-[13.5px]",
                      "text-foreground placeholder:text-muted-foreground",
                      "font-[inherit] outline-none",
                      "hover:border-[var(--hub-field-border-hover)]",
                      FOCUS_RING
                    )}
                    placeholder="Search clients by name..."
                    value={clientQuery}
                    onChange={(e) => {
                      setClientQuery(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  />
                </div>
                {showClientDropdown && clients.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--hub-hover)] transition-colors"
                        onMouseDown={() => {
                          setSelectedClient({
                            id: c.id,
                            name: c.name,
                            client_number: c.client_number,
                          });
                          setClientQuery("");
                          setShowClientDropdown(false);
                        }}
                      >
                        {c.name}{" "}
                        <span className="text-muted-foreground">#{c.client_number}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-[18px]">
            <label className="block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1.5">
              Template
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "border-[1.5px] rounded-xl p-[14px] cursor-pointer transition-colors",
                    selectedTemplateId === t.id
                      ? "border-[var(--color-rose)] bg-[var(--status-primary-bg)]"
                      : "border-[var(--hub-border)] hover:border-[var(--hub-field-border-hover)]"
                  )}
                  onClick={() => applyTemplate(t.id)}
                >
                  <p className="text-[13px] font-bold text-foreground m-0 mb-[3px]">
                    {t.name}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground m-0">
                    {t.description}
                  </p>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="col-span-2 text-[12.5px] text-muted-foreground py-2">
                  No templates available
                </p>
              )}
            </div>
          </div>

          <div className="mb-[18px]">
            <label className="block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1.5">
              Line items
            </label>
            <table className="w-full text-[12.5px] mb-2.5">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-bold uppercase text-muted-foreground px-2 pb-1.5 w-[46%]">
                    Description
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase text-muted-foreground px-2 pb-1.5 w-[14%]">
                    Qty
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase text-muted-foreground px-2 pb-1.5 w-[22%]">
                    Unit price
                  </th>
                  <th className="w-[10%]" />
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li) => (
                  <tr key={li.key}>
                    <td className="p-1">
                      <input
                        className="w-full h-[34px] rounded-md border border-[var(--hub-field-border)] px-2 text-[12.5px] font-[inherit] bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-[var(--color-rose)]"
                        placeholder="Description"
                        value={li.description}
                        onChange={(e) => updateLine(li.key, "description", e.target.value)}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="w-full h-[34px] rounded-md border border-[var(--hub-field-border)] px-2 text-[12.5px] font-[inherit] bg-[var(--hub-card)] text-foreground text-right focus:outline-none focus:border-[var(--color-rose)]"
                        value={li.quantity}
                        onChange={(e) =>
                          updateLine(li.key, "quantity", parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full h-[34px] rounded-md border border-[var(--hub-field-border)] px-2 text-[12.5px] font-[inherit] bg-[var(--hub-card)] text-foreground text-right focus:outline-none focus:border-[var(--color-rose)]"
                        value={li.unit_price}
                        onChange={(e) =>
                          updateLine(li.key, "unit_price", parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-1">
                      <button
                        className="w-7 h-7 rounded-md border border-[var(--hub-border)] bg-[var(--hub-card)] text-[var(--status-danger)] grid place-items-center cursor-pointer hover:bg-[var(--hub-hover)]"
                        onClick={() => removeLine(li.key)}
                        aria-label="Remove line"
                      >
                        <IconTrash2 className="w-[13px] h-[13px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-rose)] bg-transparent border-0 cursor-pointer p-0 hover:underline"
              onClick={addLine}
            >
              <IconPlus className="w-[14px] h-[14px]" />
              Add line
            </button>
            <div className="flex justify-between pt-3 mt-3 border-t border-[var(--hub-border)] text-sm font-bold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{fmt(subtotal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-[18px]">
            <div>
              <label className="block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1.5">
                Issue date
              </label>
              <input
                type="date"
                className={cn(
                  "w-full h-10 rounded-lg border border-[var(--hub-field-border)]",
                  "bg-[var(--hub-card)] px-3 text-[13.5px]",
                  "font-[inherit] text-foreground outline-none",
                  FOCUS_RING
                )}
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1.5">
                Due date <span className="text-[var(--status-danger-text)]">*</span>
              </label>
              <input
                type="date"
                className={cn(
                  "w-full h-10 rounded-lg border border-[var(--hub-field-border)]",
                  "bg-[var(--hub-card)] px-3 text-[13.5px]",
                  "font-[inherit] text-foreground outline-none",
                  FOCUS_RING
                )}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-[18px]">
            <label className="block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1.5">
              Notes
            </label>
            <input
              className={cn(
                "w-full h-10 rounded-lg border border-[var(--hub-field-border)]",
                "bg-[var(--hub-card)] px-3 text-[13.5px]",
                "font-[inherit] text-foreground placeholder:text-muted-foreground outline-none",
                FOCUS_RING
              )}
              placeholder="Optional — payment instructions, reference, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2.5 p-4 border-t border-[var(--hub-border)] shrink-0">
          <button
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-[var(--hub-card)] border border-[var(--hub-border)] text-foreground font-[inherit] text-[13px] font-semibold cursor-pointer hover:bg-[var(--hub-hover)] disabled:opacity-50"
            onClick={saveDraft}
            disabled={saving || sending}
          >
            {saving ? "Saving..." : "Save draft"}
          </button>
          <button
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-[var(--color-rose)] text-white border-0 font-[inherit] text-[13px] font-semibold cursor-pointer hover:bg-[var(--color-rose)]/90 disabled:opacity-50"
            onClick={sendInvoice}
            disabled={saving || sending}
          >
            {sending ? "Sending..." : "Send invoice"}
          </button>
        </div>
      </aside>
    </>
  );
}
