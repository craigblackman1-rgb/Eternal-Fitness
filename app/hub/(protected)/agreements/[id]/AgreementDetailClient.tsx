"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconAlertCircle, IconArrowLeft, IconCalendar, IconCheckCircle, IconCopy, IconEdit3, IconFileText, IconMail, IconMapPin, IconPhone, IconPrinter, IconSave, IconSend, IconX } from "@/components/icons";
import { HubCard } from "@/components/hub/HubCard";
import { HubCardHeader } from "@/components/hub/HubCardHeader";
import { TokenPill } from "@/components/hub/StatusBadge";
import AgreementPrintView from "./AgreementPrintView";
import { parqSections } from "@/lib/parq-data";

interface AgreementData {
  id: string;
  client_name: string;
  client_dob: string | null;
  client_address: string | null;
  client_email: string | null;
  client_phone: string | null;
  trainer_name: string;
  business_name: string;
  start_date: string | null;
  client_name_print: string | null;
  client_signature_date: string | null;
  client_signature_data: string | null;
  client_typed_signature: string | null;
  trainer_name_print: string | null;
  trainer_signature_date: string | null;
  trainer_signature_data: string | null;
  trainer_typed_signature: string | null;
  parq_completed: string;
  parq_date: string | null;
  parq_filed_by: string | null;
  medical_clearance: string;
  medical_clearance_date: string | null;
  medical_clearance_from: string | null;
  agreed_to_terms: boolean;
  signed_at: string;
  created_at: string;
  trainer_notes: string | null;
  package_type: string | null;
  sessions_purchased: number | null;
  session_duration: number | null;
  payment_method: string | null;
  payment_status: string | null;
  sessions_used: number | null;
  sessions_remaining: number | null;
  block_expiry_date: string | null;
  medical_clearance_status: string | null;
  gp_letter_requested_date: string | null;
  gp_letter_received_date: string | null;
  annual_review_due_date: string | null;
  trainer_observations: string | null;
  risk_level: string | null;
  exercise_modifications: string | null;
  watch_for: string | null;
  referral_source: string | null;
  client_status: string | null;
}

export default function AgreementDetailClient({ agreement, clientNumber }: { agreement: AgreementData; clientNumber: number | null }) {
  const [data, setData] = useState<AgreementData>(agreement);
  const [emailing, setEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailDryRun, setEmailDryRun] = useState(false);
  const [everEmailed, setEverEmailed] = useState(false);
  const [printView, setPrintView] = useState(false);

  // PAR-Q editing state
  const [editingParq, setEditingParq] = useState(false);
  const [parqSaving, setParqSaving] = useState(false);
  const [parqSaveSuccess, setParqSaveSuccess] = useState(false);
  const [parqSaveError, setParqSaveError] = useState<string | null>(null);
  const [parqId, setParqId] = useState<string | null>(null);
  const [parqForm, setParqForm] = useState<Record<string, string>>({});
  const [parqLoaded, setParqLoaded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const formatDate = (date: string | null) => {
    if (!date) return "Not provided";
    return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };

  const formatDateShort = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const handlePrint = () => {
    setPrintView(true);
  };

  const handleEmail = async () => {
    if (!data.client_email) return;
    setEmailing(true);
    setEmailStatus("idle");
    setEmailError(null);

    try {
      const response = await fetch(`/api/agreements/${data.id}/email`, {
        method: "POST",
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to send email");
      }

      setEmailDryRun(Boolean(result.dryRun));
      setEverEmailed(true);
      setEmailStatus("success");
      setTimeout(() => setEmailStatus("idle"), 5000);
    } catch (err) {
      setEmailStatus("error");
      setEmailError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setEmailing(false);
    }
  };

  const handleCopyEmail = () => {
    if (!data.client_email) return;
    navigator.clipboard.writeText(data.client_email);
  };

  const handleCopyParqEditLink = async () => {
    // Always mint a fresh signed link rather than reusing a cached id — a bare
    // /parq/edit/[id] with no exp/sig is rejected outright (lib/parq-link.ts),
    // and a stale signature from an earlier fetch could already be expired.
    try {
      const res = await fetch(`/api/parq?client_name=${encodeURIComponent(data.client_name)}`);
      if (!res.ok) return;
      const parqData = await res.json();
      if (!parqData?.id || !parqData?.link_exp || !parqData?.link_sig) return;
      setParqId(parqData.id);
      const url = `${window.location.origin}/parq/edit/${parqData.id}?exp=${parqData.link_exp}&sig=${parqData.link_sig}`;
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      console.error("Error copying link:", err);
    }
  };

  useEffect(() => {
    if (editingParq && !parqLoaded) {
      loadParqData();
    }
  }, [editingParq]);

  const loadParqData = async () => {
    try {
      const res = await fetch(`/api/parq?client_name=${encodeURIComponent(data.client_name)}`);
      if (res.ok) {
        const parqData = await res.json();
        if (parqData) {
          setParqId(parqData.id);
          const form: Record<string, string> = {};
          for (let i = 1; i <= 29; i++) form[`q${i}`] = parqData[`q${i}`] || "";
          form.full_name = parqData.full_name || "";
          form.date_of_birth = parqData.date_of_birth || "";
          form.address = parqData.address || "";
          form.email = parqData.email || "";
          form.phone = parqData.phone || "";
          form.emergency_contact_name = parqData.emergency_contact_name || "";
          form.emergency_contact_phone = parqData.emergency_contact_phone || "";
          form.gp_name = parqData.gp_name || "";
          form.gp_surgery = parqData.gp_surgery || "";
          form.gp_phone = parqData.gp_phone || "";
          form.conditions = parqData.conditions || "";
          form.medications = parqData.medications || "";
          form.devices = parqData.devices || "";
          form.exercise_restrictions = parqData.exercise_restrictions || "";
          form.surgeries = parqData.surgeries || "";
          form.other_info = parqData.other_info || "";
          form.current_exercise = parqData.current_exercise || "";
          form.training_goals = parqData.training_goals || "";
          form.client_name_print = parqData.client_name_print || "";
          form.client_signature_date = parqData.client_signature_date || "";
          form.client_typed_signature = parqData.client_typed_signature || "";
          setParqForm(form);
          setParqLoaded(true);
        }
      }
    } catch (err) {
      console.error("Error loading PAR-Q:", err);
    }
  };

  const handleParqChange = (field: string, value: string) => {
    setParqForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveParq = async () => {
    setParqSaving(true);
    setParqSaveError(null);
    setParqSaveSuccess(false);

    try {
      const body = {
        id: parqId,
        client_name: data.client_name,
        ...parqForm,
      };
      const res = await fetch("/api/parq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save PAR-Q");
      }

      setParqSaveSuccess(true);
      setTimeout(() => setParqSaveSuccess(false), 3000);
      setEditingParq(false);
    } catch (err) {
      setParqSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setParqSaving(false);
    }
  };

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value || <span className="text-muted-foreground italic">Not provided</span>}</p>
    </div>
  );

  if (printView) {
    return <AgreementPrintView agreement={data} onClose={() => setPrintView(false)} />;
  }

  return (
    <div className="space-y-6 w-full max-w-[1680px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Link href="/hub/agreements">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg">
              <IconArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{data.client_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Signed {formatDate(data.signed_at)}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={handlePrint}>
             <IconPrinter className="w-4 h-4" />
             Print
           </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={handleEmail}
            disabled={!data.client_email || emailing}
          >
            {emailing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <IconSend className="w-4 h-4" />
                {everEmailed ? "Resend email" : "Email PDF"}
              </>
            )}
          </Button>
          {clientNumber != null && (
            <Link href={`/hub/clients/${clientNumber}`}>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg">
                <IconArrowLeft className="w-4 h-4" />
                Open client profile
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        {data.parq_completed === "yes" ? (
          <TokenPill token="success" label="PAR-Q filed" />
        ) : (
          <TokenPill token="warning" label="PAR-Q missing" />
        )}
        {data.medical_clearance_status && data.medical_clearance_status !== "not_required" ? (
          <TokenPill
            token={
              data.medical_clearance_status === "cleared"
                ? "success"
                : data.medical_clearance_status === "pending"
                  ? "warning"
                  : "neutral"
            }
            label={`Clearance: ${data.medical_clearance_status.replace("_", " ")}`}
          />
        ) : data.medical_clearance === "yes" ? (
          <TokenPill token="success" label="Medical clearance filed" />
        ) : data.medical_clearance === "na" ? (
          <TokenPill token="neutral" label="No medical clearance needed" />
        ) : null}
        {data.client_status && (
          <TokenPill
            token={data.client_status === "active" ? "success" : "neutral"}
            label={data.client_status}
          />
        )}
      </div>

      {/* Email feedback */}
      {emailStatus === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-nested p-3 flex items-center gap-2">
          <IconCheckCircle className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-800">
            {emailDryRun
              ? "Email queued (dry run — no email backend configured)"
              : `Agreement emailed to ${data.client_email} with PDF attachment`}
          </p>
        </div>
      )}
      {emailStatus === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-nested p-3 flex items-center gap-2">
          <IconAlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-800">{emailError}</p>
        </div>
      )}

      {/* Client details */}
      <HubCard>
        <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Client Details" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Full name" value={data.client_name} />
          <Field label="Date of birth" value={formatDate(data.client_dob)} />
          <Field label="Email" value={data.client_email ? (
            <span className="flex items-center gap-1">
              <a href={`mailto:${data.client_email}`} className="text-primary hover:underline">{data.client_email}</a>
              <button onClick={handleCopyEmail} className="text-muted-foreground hover:text-foreground" title="Copy email">
                <IconCopy className="w-3 h-3" />
              </button>
            </span>
          ) : null} />
          <Field label="Phone" value={data.client_phone ? (
            <a href={`tel:${data.client_phone}`} className="text-primary hover:underline">{data.client_phone}</a>
          ) : null} />
          <Field label="Address" value={data.client_address} />
          <Field label="Start date" value={formatDate(data.start_date)} />
        </div>
      </HubCard>

      {/* Signatures */}
      <HubCard>
        <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Signatures" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3 p-4 rounded-lg border border-border/60">
            <p className="text-sm font-semibold text-foreground">Client</p>
            <Field label="Name (print)" value={data.client_name_print} />
            <Field label="Date" value={formatDate(data.client_signature_date)} />
            {data.client_typed_signature && (
              <div>
                <p className="text-xs text-muted-foreground">Typed signature</p>
                <p className="text-sm font-serif italic text-lg text-foreground mt-0.5">{data.client_typed_signature}</p>
              </div>
            )}
            {data.client_signature_data && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Drawn signature</p>
                <div className="border border-border/60 rounded bg-white p-2 inline-block">
                  <img src={data.client_signature_data} alt="Client signature" className="h-12 w-auto" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/30">
            <p className="text-sm font-semibold text-foreground">Trainer (auto-signed)</p>
            <Field label="Name (print)" value={data.trainer_name_print} />
            <Field label="Date" value={formatDate(data.trainer_signature_date)} />
            {data.trainer_typed_signature && (
              <div>
                <p className="text-xs text-muted-foreground">Typed signature</p>
                <p className="text-sm font-serif italic text-lg text-foreground mt-0.5">{data.trainer_typed_signature}</p>
              </div>
            )}
            {data.trainer_signature_data && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Drawn signature</p>
                <div className="border border-border/60 rounded bg-white p-2 inline-block">
                  <img src={data.trainer_signature_data} alt="Trainer signature" className="h-12 w-auto" />
                </div>
              </div>
            )}
          </div>
        </div>
      </HubCard>

      {/* PAR-Q and Medical Clearance */}
      <HubCard>
        <HubCardHeader
          icon={<IconFileText className="w-4 h-4" />}
          title="PAR-Q & Medical Clearance"
          action={
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={handleCopyParqEditLink}
              >
                <IconCopy className="w-4 h-4" />
                {linkCopied ? "Link copied!" : "Send edit link"}
              </Button>
              <Button
                variant={editingParq ? "default" : "outline"}
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={() => {
                  if (editingParq) {
                    setEditingParq(false);
                    setParqSaveError(null);
                  } else {
                    setEditingParq(true);
                    setParqLoaded(false);
                  }
                }}
              >
                <IconEdit3 className="w-4 h-4" />
                {editingParq ? "Cancel" : "Edit PAR-Q"}
              </Button>
            </div>
          }
        />
        {!editingParq ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3 p-4 rounded-lg border border-border/60">
              <p className="text-sm font-semibold text-foreground">PAR-Q</p>
              <Field label="Completed" value={data.parq_completed === "yes" ? "Yes" : data.parq_completed === "no" ? "No" : "Not specified"} />
              <Field label="Date" value={formatDate(data.parq_date)} />
              <Field label="Filed by" value={data.parq_filed_by} />
            </div>

            <div className="space-y-3 p-4 rounded-lg border border-border/60">
              <p className="text-sm font-semibold text-foreground">Medical Clearance</p>
              <Field label="Required" value={data.medical_clearance === "yes" ? "Yes" : data.medical_clearance === "na" ? "N/A" : "Not specified"} />
              <Field label="Date" value={formatDate(data.medical_clearance_date)} />
              <Field label="From" value={data.medical_clearance_from} />
            </div>
          </div>
        ) : (
            <div className="space-y-6">
              {parqSaveSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-nested p-3 flex items-center gap-2">
                  <IconCheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-800">PAR-Q saved successfully</p>
                </div>
              )}
              {parqSaveError && (
                <div className="bg-red-50 border border-red-200 rounded-nested p-3 flex items-center gap-2">
                  <IconAlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-800">{parqSaveError}</p>
                </div>
              )}

              {/* Section 1 */}
              <div>
                <h4 className="text-sm font-semibold mb-3 pb-2 border-b">Section 1 — Personal Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2"><Label>Full name</Label><Input value={parqForm.full_name || ""} onChange={(e) => handleParqChange("full_name", e.target.value)} className="mt-1" /></div>
                  <div><Label>Date of birth</Label><Input type="date" value={parqForm.date_of_birth || ""} onChange={(e) => handleParqChange("date_of_birth", e.target.value)} className="mt-1" /></div>
                  <div><Label>Email</Label><Input value={parqForm.email || ""} onChange={(e) => handleParqChange("email", e.target.value)} className="mt-1" /></div>
                  <div className="col-span-2"><Label>Address</Label><Input value={parqForm.address || ""} onChange={(e) => handleParqChange("address", e.target.value)} className="mt-1" /></div>
                  <div><Label>Phone</Label><Input value={parqForm.phone || ""} onChange={(e) => handleParqChange("phone", e.target.value)} className="mt-1" /></div>
                  <div><Label>Emergency contact</Label><Input value={parqForm.emergency_contact_name || ""} onChange={(e) => handleParqChange("emergency_contact_name", e.target.value)} className="mt-1" /></div>
                  <div><Label>Emergency phone</Label><Input value={parqForm.emergency_contact_phone || ""} onChange={(e) => handleParqChange("emergency_contact_phone", e.target.value)} className="mt-1" /></div>
                  <div><Label>GP name</Label><Input value={parqForm.gp_name || ""} onChange={(e) => handleParqChange("gp_name", e.target.value)} className="mt-1" /></div>
                  <div><Label>GP surgery</Label><Input value={parqForm.gp_surgery || ""} onChange={(e) => handleParqChange("gp_surgery", e.target.value)} className="mt-1" /></div>
                  <div><Label>GP phone</Label><Input value={parqForm.gp_phone || ""} onChange={(e) => handleParqChange("gp_phone", e.target.value)} className="mt-1" /></div>
                </div>
              </div>

              {/* Sections 2-4, 6: Yes/No questions */}
              {parqSections.map((section) => (
                <div key={section.label}>
                  <h4 className="text-sm font-semibold mb-3 pb-2 border-b">{section.label}</h4>
                  <div className="space-y-2">
                    {section.questions.map(({ q, text, note }) => (
                      <div key={q} className="bg-muted/30 rounded-nested p-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <span className="text-sm font-medium">Q{q.replace("q", "")}. </span><span className="text-sm">{text}</span>
                            {note && <p className="text-xs text-muted-foreground italic mt-0.5">{note}</p>}
                          </div>
                          <Select value={parqForm[q] || "unanswered"} onValueChange={(v) => handleParqChange(q, v === "unanswered" ? "" : v)}>
                            <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unanswered">—</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Section 5 */}
              <div>
                <h4 className="text-sm font-semibold mb-3 pb-2 border-b">Section 5 — Full Details</h4>
                <div className="space-y-3">
                  <div><Label>Diagnosed medical conditions</Label><Textarea value={parqForm.conditions || ""} onChange={(e) => handleParqChange("conditions", e.target.value)} className="mt-1" rows={2} /></div>
                  <div><Label>Prescription medications</Label><Textarea value={parqForm.medications || ""} onChange={(e) => handleParqChange("medications", e.target.value)} className="mt-1" rows={3} /></div>
                  <div><Label>Implanted devices</Label><Textarea value={parqForm.devices || ""} onChange={(e) => handleParqChange("devices", e.target.value)} className="mt-1" rows={2} /></div>
                  <div><Label>Exercise restrictions</Label><Textarea value={parqForm.exercise_restrictions || ""} onChange={(e) => handleParqChange("exercise_restrictions", e.target.value)} className="mt-1" rows={2} /></div>
                  <div><Label>Surgeries (last 5 years)</Label><Textarea value={parqForm.surgeries || ""} onChange={(e) => handleParqChange("surgeries", e.target.value)} className="mt-1" rows={2} /></div>
                  <div><Label>Other information</Label><Textarea value={parqForm.other_info || ""} onChange={(e) => handleParqChange("other_info", e.target.value)} className="mt-1" rows={2} /></div>
                </div>
              </div>

              {/* Section 6b */}
              <div>
                <h4 className="text-sm font-semibold mb-3 pb-2 border-b">Section 6 — Lifestyle</h4>
                <div className="space-y-3">
                  <div><Label>Current exercise</Label><Textarea value={parqForm.current_exercise || ""} onChange={(e) => handleParqChange("current_exercise", e.target.value)} className="mt-1" rows={2} /></div>
                  <div><Label>Training goals</Label><Textarea value={parqForm.training_goals || ""} onChange={(e) => handleParqChange("training_goals", e.target.value)} className="mt-1" rows={2} /></div>
                </div>
              </div>

              {/* Signature */}
              <div>
                <h4 className="text-sm font-semibold mb-3 pb-2 border-b">Section 9 — Declaration</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label>Client name (print)</Label><Input value={parqForm.client_name_print || ""} onChange={(e) => handleParqChange("client_name_print", e.target.value)} className="mt-1" /></div>
                  <div><Label>Signature date</Label><Input type="date" value={parqForm.client_signature_date || ""} onChange={(e) => handleParqChange("client_signature_date", e.target.value)} className="mt-1" /></div>
                  <div><Label>Typed signature</Label><Input value={parqForm.client_typed_signature || ""} onChange={(e) => handleParqChange("client_typed_signature", e.target.value)} className="mt-1" /></div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSaveParq} disabled={parqSaving} className="gap-1.5 bg-rose hover:bg-rose/90 text-white rounded-lg">
                  {parqSaving ? "Saving..." : <><IconSave className="w-4 h-4" /> Save PAR-Q</>}
                </Button>
                <Button variant="outline" onClick={() => { setEditingParq(false); setParqSaveError(null); }} className="gap-1.5 rounded-lg">
                  <IconX className="w-4 h-4" /> Cancel
                </Button>
              </div>
            </div>
          )}
      </HubCard>

      {/* Client management — now managed on the client profile */}
      <HubCard>
        <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Client Management" />
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-canvas)] p-3">
            <IconAlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="text-foreground font-medium">Package, payments and compliance are managed on the client profile.</p>
              <p className="text-muted-foreground mt-0.5">
                This agreement is a signed record. The figures below are a snapshot from when it was last saved
                {clientNumber != null ? " — edit the live values on the profile." : "."}
              </p>
              {clientNumber != null && (
                <Link href={`/hub/clients/${clientNumber}`} className="inline-flex items-center gap-1.5 text-rose font-medium hover:underline mt-2">
                  Open client profile
                  <IconArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Package" value={data.package_type} />
            <Field label="Sessions" value={data.sessions_purchased ? `${data.sessions_purchased} × ${data.session_duration || 60}min` : null} />
            <Field label="Payment" value={data.payment_status ? data.payment_status.charAt(0).toUpperCase() + data.payment_status.slice(1) : null} />
            <Field label="Sessions used / remaining" value={data.sessions_used !== null && data.sessions_used !== undefined ? `${data.sessions_used} / ${data.sessions_remaining ?? "?"}` : null} />
            <Field label="Block expiry" value={formatDate(data.block_expiry_date)} />
            <Field label="Risk level" value={data.risk_level ? data.risk_level.charAt(0).toUpperCase() + data.risk_level.slice(1) : null} />
            <Field label="Client status" value={data.client_status ? data.client_status.charAt(0).toUpperCase() + data.client_status.slice(1) : null} />
            <Field label="Referral source" value={data.referral_source} />
            <Field label="Annual review due" value={formatDate(data.annual_review_due_date)} />
          </div>
          {data.exercise_modifications && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Exercise modifications</p>
              <p className="text-sm text-foreground">{data.exercise_modifications}</p>
            </div>
          )}
          {data.watch_for && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Watch for</p>
              <p className="text-sm text-foreground">{data.watch_for}</p>
            </div>
          )}
          {data.trainer_observations && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Trainer observations</p>
              <p className="text-sm text-foreground">{data.trainer_observations}</p>
            </div>
          )}
          {data.trainer_notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Trainer notes</p>
              <p className="text-sm text-foreground">{data.trainer_notes}</p>
            </div>
          )}
        </div>
      </HubCard>

      {/* Agreement terms */}
      <HubCard>
        <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Agreement" />
        <div className="flex items-center gap-2">
          {data.agreed_to_terms ? (
            <IconCheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <IconAlertCircle className="w-4 h-4 text-red-600" />
          )}
          <p className="text-sm text-foreground">
            Terms accepted: <span className="font-semibold">{data.agreed_to_terms ? "Yes" : "No"}</span>
          </p>
        </div>
      </HubCard>

      {/* Record metadata */}
      <div className="text-xs text-muted-foreground flex items-center gap-4 pt-2">
        <span>Record ID: {data.id}</span>
        <span>Trainer: {data.trainer_name}</span>
        <span>Business: {data.business_name}</span>
      </div>
    </div>
  );
}
