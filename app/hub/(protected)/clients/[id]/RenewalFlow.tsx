"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PACKAGE_SIZES, getPackageSize, defaultExpiryDate } from "@/lib/packages";
import type { PackageSizeId } from "@/lib/packages";
import type { DBClient } from "@/types";

/* ── RenewalFlow — multi-step wizard for starting a new package.
 *  Matches the mockup renewal-flow.html step-by-step layout.
 *  Steps: Package → Invoice → Programme → Confirm. */

interface RenewalFlowProps {
  client: DBClient;
  sessionsRemaining: number | null;
  sessionsPurchased: number | null;
  onClose: () => void;
}

const STEPS = [
  { id: 1, label: "Package" },
  { id: 2, label: "Invoice" },
  { id: 3, label: "Programme" },
  { id: 4, label: "Confirm" },
] as const;

const STEP_LABELS: Record<number, string> = {
  1: "Next: Invoice",
  2: "Next: Programme",
  3: "Next: Confirm",
  4: "Start package",
};

const EXTENSION_REASONS = [
  "Standard renewal",
  "Holiday adjustment",
  "Injury adjustment",
  "Other",
] as const;

export function RenewalFlow({ client, sessionsRemaining, sessionsPurchased, onClose }: RenewalFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedPkg, setSelectedPkg] = useState<PackageSizeId>("24");
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate());
  const [extensionReason, setExtensionReason] = useState<string>(EXTENSION_REASONS[0]);
  const [raiseInvoice, setRaiseInvoice] = useState(true);
  const [invoiceDueDate, setInvoiceDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [keepProgramme, setKeepProgramme] = useState(true);
  const [saving, setSaving] = useState(false);

  const pkg = getPackageSize(selectedPkg);
  const firstName = client.name.split(" ")[0];
  const isOngoing = selectedPkg === "ongoing";

  const currentRemaining = sessionsRemaining ?? 0;
  const currentPurchased = sessionsPurchased ?? 0;
  const newRemaining = isOngoing ? 0 : (pkg?.sessions ?? 0);
  const newPurchased = isOngoing ? client.sessions_purchased : (pkg?.sessions ?? 0);

  const goNext = () => { if (step < 4) setStep(step + 1); };
  const goBack = () => { if (step > 1) setStep(step - 1); };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${client.client_number}/renew-package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_number: client.client_number,
          package_size: selectedPkg,
          expiry_date: expiryDate,
          raise_invoice: raiseInvoice,
          invoice_due_date: invoiceDueDate,
          keep_programme: keepProgramme,
          mode: "fresh",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to renew package");
      }
      toast.success(`${firstName}'s new package is live`);
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to renew package");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm" onClick={() => !saving && onClose()} />

      {/* Dialog — lg width per mockup */}
      <div className="relative w-full max-w-[720px] mx-4 bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_20px_60px_rgba(16,24,40,.18)] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--hub-border)] shrink-0">
          <h3 className="m-0 text-[15.5px] font-bold text-[var(--color-ink)] tracking-tight">
            Start next package
          </h3>
          <p className="m-0 mt-0.5 text-xs text-[var(--color-muted)]">
            {client.name} — current block has {currentRemaining} of {currentPurchased} sessions remaining
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-[var(--hub-border)]">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 flex-1 px-3.5 py-2.5 text-[12.5px] font-semibold border-b-2 ${
                step === s.id
                  ? "text-[var(--color-ink)] border-[var(--color-rose)]"
                  : step > s.id
                    ? "text-[var(--color-teal)] border-[var(--status-success)]"
                    : "text-[var(--color-muted)] border-[var(--hub-border)]"
              }`}
            >
              <span className={`w-[22px] h-[22px] rounded-pill grid place-items-center text-[11px] font-bold shrink-0 ${
                step === s.id
                  ? "bg-[var(--status-primary-bg)] text-[var(--status-primary-text)]"
                  : step > s.id
                    ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                    : "bg-neutral-100 text-[var(--color-muted)]"
              }`}>
                {step > s.id ? "✓" : s.id}
              </span>
              {s.label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Step 1: Package size */}
          {step === 1 && (
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[var(--color-muted)] mb-2.5">
                Choose package size
              </p>
              <div className="grid grid-cols-5 gap-2.5">
                {PACKAGE_SIZES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPkg(p.id)}
                    className={`border rounded-nested bg-white p-3.5 text-center font-[inherit] cursor-pointer transition-[border-color,box-shadow] duration-[120ms] ${
                      selectedPkg === p.id
                        ? "border-[var(--color-rose)] shadow-[inset_0_0_0_1px_var(--color-rose)] bg-[var(--status-primary-bg)]"
                        : "border-[var(--hub-border)] hover:border-[var(--color-rose)]"
                    }`}
                  >
                    <div className={`text-[28px] font-extrabold leading-none ${selectedPkg === p.id ? "text-[var(--status-primary-text)]" : "text-[var(--color-ink)]"}`}>
                      {p.id === "ongoing" ? "∞" : p.sessions}
                    </div>
                    <div className="text-xs text-[var(--color-muted)] mt-1">
                      {p.id === "ongoing" ? "monthly rolling" : "sessions"}
                    </div>
                    <div className={`text-[13.5px] font-bold mt-1.5 ${selectedPkg === p.id ? "text-[var(--status-primary-text)]" : "text-[var(--color-ink)]"}`}>
                      {p.priceDisplay}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[var(--color-muted)] mb-1.5">
                  Expiry date
                </p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full h-[34px] border border-[var(--hub-field-border)] rounded-control-sm px-2.5 font-[inherit] text-[13px] text-[var(--color-ink)] bg-[var(--field-fill)]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--color-muted)] mb-1.5">
                      Extension reason
                    </label>
                    <select
                      value={extensionReason}
                      onChange={(e) => setExtensionReason(e.target.value)}
                      className="w-full h-[34px] border border-[var(--hub-field-border)] rounded-control-sm px-2.5 font-[inherit] text-[13px] text-[var(--color-ink)] bg-[var(--field-fill)] appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%237E8088%22%20d%3D%22M2.5%204.5l3.5%203.5%203.5-3.5%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_10px_center] pr-7"
                    >
                      {EXTENSION_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Invoice */}
          {step === 2 && (
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[var(--color-muted)] mb-2.5">
                Raise the invoice
              </p>
              <div className="border border-[var(--hub-border)] rounded-nested overflow-hidden mb-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border-t-[3px] border-[var(--color-muted)] border-b border-[var(--hub-border)] text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--color-ink)]">
                  Invoice details
                </div>
                <div className="p-3">
                  <div className="flex items-baseline gap-3.5 py-2 text-[13px]">
                    <span className="flex-0-0 w-[160px] text-[var(--color-muted)] text-[12.5px]">Client</span>
                    <span className="flex-1 text-[var(--color-ink)] font-medium">{client.name}</span>
                  </div>
                  <div className="flex items-baseline gap-3.5 py-2 text-[13px] border-t border-[var(--hub-border)]">
                    <span className="flex-0-0 w-[160px] text-[var(--color-muted)] text-[12.5px]">Package</span>
                    <span className="flex-1 text-[var(--color-ink)] font-medium">{pkg?.label}</span>
                  </div>
                  <div className="flex items-baseline gap-3.5 py-2 text-[13px] border-t border-[var(--hub-border)]">
                    <span className="flex-0-0 w-[160px] text-[var(--color-muted)] text-[12.5px]">Amount</span>
                    <span className="flex-1 text-[var(--color-ink)] font-medium">
                      <span className="text-[18px] font-extrabold">{pkg?.priceDisplay}</span>
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3.5 py-2 text-[13px] border-t border-[var(--hub-border)]">
                    <span className="flex-0-0 w-[160px] text-[var(--color-muted)] text-[12.5px]">Due date</span>
                    <span className="flex-1 text-[var(--color-ink)] font-medium">On booking first session</span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={raiseInvoice}
                  onChange={(e) => setRaiseInvoice(e.target.checked)}
                  className="w-4 h-4 accent-[var(--color-rose)]"
                />
                Raise the invoice with it — create a draft invoice when the package starts
              </label>
              <p className="mt-2 mb-0 text-[12.5px] text-[var(--color-muted)]">
                The invoice is a draft until you send it. {firstName} can&apos;t book sessions while unpaid.
              </p>
            </div>
          )}

          {/* Step 3: Programme */}
          {step === 3 && (
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[var(--color-muted)] mb-2.5">
                What programme does {firstName} train on?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setKeepProgramme(true)}
                  className={`border rounded-nested p-4 text-left font-[inherit] cursor-pointer transition-[border-color,box-shadow] duration-[120ms] ${
                    keepProgramme
                      ? "border-[var(--color-rose)] shadow-[inset_0_0_0_1px_var(--color-rose)] bg-[var(--status-primary-bg)]"
                      : "border-[var(--hub-border)] bg-white hover:border-[var(--color-rose)]"
                  }`}
                >
                  <p className={`text-[10.5px] font-bold uppercase tracking-[.08em] mb-1.5 ${keepProgramme ? "text-[var(--status-primary-text)]" : "text-[var(--color-muted)]"}`}>
                    Keep current programme
                  </p>
                  <p className="text-[13.5px] font-semibold text-[var(--color-ink)]">
                    Current programme
                  </p>
                  <p className="text-[12.5px] text-[var(--color-body)] mt-1 mb-0">
                    Continues from where {firstName} left off. The queue picks up at session 1 of the new pot.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setKeepProgramme(false)}
                  className={`border rounded-nested p-4 text-left font-[inherit] cursor-pointer transition-[border-color,box-shadow] duration-[120ms] ${
                    !keepProgramme
                      ? "border-[var(--color-rose)] shadow-[inset_0_0_0_1px_var(--color-rose)] bg-[var(--status-primary-bg)]"
                      : "border-[var(--hub-border)] bg-white hover:border-[var(--color-rose)]"
                  }`}
                >
                  <p className={`text-[10.5px] font-bold uppercase tracking-[.08em] mb-1.5 ${!keepProgramme ? "text-[var(--status-primary-text)]" : "text-[var(--color-muted)]"}`}>
                    Choose a new programme
                  </p>
                  <p className="text-[13.5px] font-semibold text-[var(--color-muted)]">
                    Open the workout builder
                  </p>
                  <p className="text-[12.5px] text-[var(--color-body)] mt-1 mb-0">
                    Start fresh with a new programme. Assign it after the package is created.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[var(--color-muted)] mb-2.5">
                Before → after
              </p>

              {/* Pot summary */}
              <div className="border border-[var(--status-success-border)] rounded-nested overflow-hidden mb-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--status-success-bg)] border-t-[3px] border-[var(--color-teal)] border-b border-[var(--status-success-border)] text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--color-teal-text)]">
                  Pot summary
                </div>
                <div className="p-3">
                  <div className="flex items-baseline gap-3.5 py-2 text-[13px]">
                    <span className="flex-0-0 w-[160px] text-[var(--color-muted)] text-[12.5px]">Before</span>
                    <span className="flex-1 text-[var(--color-ink)] font-medium">
                      <span className="text-[18px] font-extrabold text-[var(--status-danger)]">{currentRemaining}</span>
                      {" "}of {currentPurchased} remaining
                      {client.block_expiry_date && ` · Expires ${new Date(client.block_expiry_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3.5 py-2 text-[13px] border-t border-[var(--hub-border)]">
                    <span className="flex-0-0 w-[160px] text-[var(--color-muted)] text-[12.5px]">After</span>
                    <span className="flex-1 text-[var(--color-ink)] font-medium">
                      <span className="text-[18px] font-extrabold text-[var(--color-teal)]">{newRemaining || "∞"}</span>
                      {isOngoing ? " sessions (ongoing)" : ` of ${newPurchased} remaining · Expires ${new Date(expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Queue */}
              <div className="border border-[var(--status-success-border)] rounded-nested overflow-hidden mb-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--status-success-bg)] border-t-[3px] border-[var(--color-teal)] border-b border-[var(--status-success-border)] text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--color-teal-text)]">
                  Queue
                </div>
                <div className="p-3">
                  <div className="flex items-baseline gap-3.5 py-2 text-[13px]">
                    <span className="flex-0-0 w-[160px] text-[var(--color-muted)] text-[12.5px]">Programme</span>
                    <span className="flex-1 text-[var(--color-ink)] font-medium">
                      {keepProgramme ? "Current programme — continues from session 1" : "New programme — assign after creation"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3.5 py-2 text-[13px] border-t border-[var(--hub-border)]">
                    <span className="flex-0-0 w-[160px] text-[var(--color-muted)] text-[12.5px]">First session</span>
                    <span className="flex-1 text-[var(--color-ink)] font-medium">Next available booking slot</span>
                  </div>
                </div>
              </div>

              {/* Invoice */}
              {raiseInvoice && (
                <div className="border border-[var(--hub-border)] rounded-nested overflow-hidden mb-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border-t-[3px] border-[var(--color-muted)] border-b border-[var(--hub-border)] text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--color-ink)]">
                    Invoice
                  </div>
                  <div className="p-3">
                    <div className="flex items-baseline gap-3.5 py-2 text-[13px]">
                      <span className="flex-0-0 w-[160px] text-[var(--color-muted)] text-[12.5px]">Draft invoice</span>
                      <span className="flex-1 text-[var(--color-ink)] font-medium">
                        {pkg?.sessions ?? "∞"} × {pkg?.priceDisplay} = <b>{pkg?.priceDisplay}</b>
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3.5 py-2 text-[13px] border-t border-[var(--hub-border)]">
                      <span className="flex-0-0 w-[160px] text-[var(--color-muted)] text-[12.5px]">Status</span>
                      <span className="flex-1 text-[var(--color-ink)] font-medium">Draft — will be sent when you confirm</span>
                    </div>
                  </div>
                </div>
              )}

              {/* What happens next */}
              <div className="border border-[var(--status-success-border)] rounded-nested bg-[var(--status-success-bg)] p-3.5 mt-3.5">
                <h4 className="m-0 mb-1.5 text-[13px] font-bold text-[var(--color-teal-text)]">What happens next</h4>
                <p className="m-0 text-[13px] text-[var(--color-teal-text)]">
                  {firstName}&apos;s pot resets{isOngoing ? " to ongoing" : ` to ${newPurchased} sessions`}.
                  {" "}{keepProgramme ? "The programme continues from session 1." : "You can assign a new programme after."}
                  {" "}{raiseInvoice && `A draft invoice for ${pkg?.priceDisplay} is created — send it when ready.`}
                  {" "}{firstName} can book once{raiseInvoice ? " the invoice is paid" : " the package is live"}.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[var(--hub-border)] bg-[var(--field-fill)] shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="text-[var(--color-muted)]"
          >
            Cancel
          </Button>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={goBack}
              disabled={saving}
              className="text-[var(--color-muted)]"
            >
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button
            onClick={step === 4 ? handleConfirm : goNext}
            disabled={saving}
            className="bg-rose hover:bg-rose/90 text-white rounded-lg px-5 py-1.5 h-auto text-[13px] font-semibold"
          >
            {saving ? "Starting…" : STEP_LABELS[step]}
          </Button>
        </div>
      </div>
    </div>
  );
}
