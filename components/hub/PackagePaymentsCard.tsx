"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HubCardHeader } from "@/components/hub/HubCardHeader";
import { IconCheckCircle, IconClipboardList, IconPencil, IconX } from "@/components/icons";
import { toast } from "sonner";
import type { ClientStatus, DBClient, Package, PaymentStatus } from "@/types";

type Fields = Pick<
  DBClient,
  | "package_type"
  | "sessions_purchased"
  | "sessions_used"
  | "sessions_remaining"
  | "session_duration"
  | "client_rate"
  | "payment_method"
  | "payment_status"
  | "client_status"
>;

interface PackagePaymentsCardProps {
  clientId: string;
  /* block_expiry_date is read here but never edited by this card — the
     Arrangement drawer's GracePeriodExtension is the sole editor (it logs an
     extension history, which this card has no way to do), so this card would
     otherwise be a second, unaudited way to change the same field. */
  initial: Fields & { block_expiry_date: string | null };
}

const paymentTone: Record<PaymentStatus, string> = {
  paid: "text-[var(--status-success-text)]",
  deposit: "text-[var(--status-primary-text)]",
  pending: "text-[var(--status-warning-text)]",
  overdue: "text-[var(--status-danger)]",
  suspended: "text-[var(--status-danger)]",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function titleCase(value: string | null) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function PackagePaymentsCard({ clientId, initial }: PackagePaymentsCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Fields>(initial);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Auto-derive sessions remaining when both known
  const derivedRemaining =
    form.sessions_purchased != null && form.sessions_used != null
      ? Math.max(form.sessions_purchased - form.sessions_used, 0)
      : form.sessions_remaining;

  const save = async () => {
    setSaving(true);
    // `form` was seeded from `initial`, which carries block_expiry_date at
    // runtime even though the Fields type no longer declares it (see the
    // props comment) — strip it explicitly so a stale value from whenever
    // this card mounted can never overwrite what GracePeriodExtension wrote.
    const { block_expiry_date: _omit, ...formWithoutExpiry } = form as Fields & { block_expiry_date?: string | null };
    const payload: Fields = { ...formWithoutExpiry, sessions_remaining: derivedRemaining ?? null };
    const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to save" }));
      toast.error(`Failed to save: ${err.error}`);
      return;
    }
    toast.success("Package & payments updated");
    setEditing(false);
    router.refresh();
  };

  const cancel = () => {
    setForm(initial);
    setEditing(false);
  };

  return (
    <Card className="bg-[var(--hub-card)] rounded-surface border border-[var(--hub-border)] shadow-sm">
      <div className="flex items-center justify-between pr-4">
        <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title="Package & Payments" color="amber" />
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-7 gap-1.5 text-xs text-muted-foreground">
            <IconPencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>
      <CardContent className="pt-4 pb-5 px-5">
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Package">
                <Select value={form.package_type ?? ""} onValueChange={(v: Package) => set("package_type", v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4-week">4-week</SelectItem>
                    <SelectItem value="6-week">6-week</SelectItem>
                    <SelectItem value="12-week">12-week</SelectItem>
                    <SelectItem value="24-week">24-week</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Session duration (min)">
                <Input type="number" value={form.session_duration ?? ""} onChange={(e) => set("session_duration", e.target.value ? parseInt(e.target.value) : null)} className="h-9" />
              </Field>
              <Field label="Client rate (£)">
                <Input type="number" step="0.01" value={form.client_rate ?? ""} onChange={(e) => set("client_rate", e.target.value ? parseFloat(e.target.value) : null)} placeholder="Standard" className="h-9" />
              </Field>
              {/* Block expiry is edited only via GracePeriodExtension below,
                  which keeps an audited extension history — not duplicated
                  here as a second, unaudited way to change the same date. */}
              <Field label="Sessions purchased">
                <Input type="number" value={form.sessions_purchased ?? ""} onChange={(e) => set("sessions_purchased", e.target.value ? parseInt(e.target.value) : null)} className="h-9" />
              </Field>
              <Field label="Sessions used">
                <Input type="number" value={form.sessions_used ?? ""} onChange={(e) => set("sessions_used", e.target.value ? parseInt(e.target.value) : 0)} className="h-9" />
              </Field>
              <Field label="Sessions remaining">
                <Input value={derivedRemaining ?? ""} readOnly disabled className="h-9 bg-[var(--hub-canvas)]" />
              </Field>
              <Field label="Payment method">
                <Input value={form.payment_method ?? ""} onChange={(e) => set("payment_method", e.target.value || null)} placeholder="e.g. Bank transfer" className="h-9" />
              </Field>
              <Field label="Payment status">
                <Select value={form.payment_status} onValueChange={(v: PaymentStatus) => set("payment_status", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Client status">
                <Select value={form.client_status} onValueChange={(v: ClientStatus) => set("client_status", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={cancel} disabled={saving} className="rounded-lg gap-1.5 border-border/60">
                <IconX className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={saving} className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white">
                <IconCheckCircle className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <ReadField label="Package" value={initial.package_type ?? "—"} />
            <ReadField label="Sessions" value={initial.sessions_purchased != null ? `${initial.sessions_used ?? 0} used · ${initial.sessions_remaining ?? initial.sessions_purchased} left of ${initial.sessions_purchased}` : "—"} />
            {initial.sessions_purchased != null && (
              <span className="text-[10px] text-muted-foreground col-span-full -mt-2">
                Values shown are manual overrides. The block page shows the derived pot counter from actual session outcomes.
              </span>
            )}
            <ReadField label="Session length" value={initial.session_duration ? `${initial.session_duration} min` : "—"} />
            <ReadField label="Client rate" value={initial.client_rate != null ? `£${initial.client_rate.toFixed(2)}` : "Standard"} />
            <ReadField label="Block expiry" value={formatDate(initial.block_expiry_date)} />
            <ReadField label="Payment method" value={initial.payment_method ?? "—"} />
            <div>
              <span className="text-xs text-muted-foreground block mb-0.5">Payment status</span>
              <span className={`font-semibold ${paymentTone[initial.payment_status] ?? "text-foreground"}`}>{titleCase(initial.payment_status)}</span>
            </div>
            <ReadField label="Client status" value={titleCase(initial.client_status)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground block mb-0.5">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
