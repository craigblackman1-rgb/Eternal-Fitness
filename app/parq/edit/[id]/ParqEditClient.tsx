"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { IconUser, IconHeart, IconBone, IconClipboardCheck, IconFileText, IconActivity, IconFileSignature, IconSave, IconCopy } from "@/components/icons";
import { HubCard, HubCardHeader, HubAlert } from "@/components/hub";
import {
  section2Questions, section3Questions, section4Questions, section6bQuestions,
} from "@/lib/parq-data";

interface ParqData {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  gp_name: string | null;
  gp_surgery: string | null;
  gp_phone: string | null;
  q1: string; q2: string; q3: string; q4: string; q5: string; q6: string; q7: string; q8: string; q9: string; q10: string; q11: string;
  q12: string; q13: string; q14: string; q15: string; q16: string; q17: string; q18: string;
  q19: string; q20: string; q21: string; q22: string; q23: string; q24: string; q25: string; q26: string;
  q27: string; q28: string; q29: string;
  conditions: string | null;
  medications: string | null;
  devices: string | null;
  exercise_restrictions: string | null;
  surgeries: string | null;
  other_info: string | null;
  current_exercise: string | null;
  training_goals: string | null;
  client_name_print: string | null;
  client_signature_date: string | null;
  client_signature_data: string | null;
  client_typed_signature: string | null;
}

interface ParqFormData {
  fullName: string;
  dateOfBirth: string;
  address: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  gpName: string;
  gpSurgery: string;
  gpPhone: string;
  q1: "yes" | "no" | "";
  q2: "yes" | "no" | "";
  q3: "yes" | "no" | "";
  q4: "yes" | "no" | "";
  q5: "yes" | "no" | "";
  q6: "yes" | "no" | "";
  q7: "yes" | "no" | "";
  q8: "yes" | "no" | "";
  q9: "yes" | "no" | "";
  q10: "yes" | "no" | "";
  q11: "yes" | "no" | "";
  q12: "yes" | "no" | "";
  q13: "yes" | "no" | "";
  q14: "yes" | "no" | "";
  q15: "yes" | "no" | "";
  q16: "yes" | "no" | "";
  q17: "yes" | "no" | "";
  q18: "yes" | "no" | "";
  q19: "yes" | "no" | "";
  q20: "yes" | "no" | "";
  q21: "yes" | "no" | "";
  q22: "yes" | "no" | "";
  q23: "yes" | "no" | "";
  q24: "yes" | "no" | "";
  q25: "yes" | "no" | "";
  q26: "yes" | "no" | "";
  conditions: string;
  medications: string;
  devices: string;
  exerciseRestrictions: string;
  surgeries: string;
  otherInfo: string;
  currentExercise: string;
  trainingGoals: string;
  q27: "yes" | "no" | "";
  q28: "yes" | "no" | "";
  q29: "yes" | "no" | "";
  clientNamePrint: string;
  clientSignatureDate: string;
  clientTypedSignature: string;
}

function toFormData(parq: ParqData): ParqFormData {
  return {
    fullName: parq.full_name || "",
    dateOfBirth: parq.date_of_birth || "",
    address: parq.address || "",
    email: parq.email || "",
    phone: parq.phone || "",
    emergencyContactName: parq.emergency_contact_name || "",
    emergencyContactPhone: parq.emergency_contact_phone || "",
    gpName: parq.gp_name || "",
    gpSurgery: parq.gp_surgery || "",
    gpPhone: parq.gp_phone || "",
    q1: (parq.q1 || "") as ParqFormData["q1"], q2: (parq.q2 || "") as ParqFormData["q2"], q3: (parq.q3 || "") as ParqFormData["q3"],
    q4: (parq.q4 || "") as ParqFormData["q4"], q5: (parq.q5 || "") as ParqFormData["q5"], q6: (parq.q6 || "") as ParqFormData["q6"],
    q7: (parq.q7 || "") as ParqFormData["q7"], q8: (parq.q8 || "") as ParqFormData["q8"], q9: (parq.q9 || "") as ParqFormData["q9"],
    q10: (parq.q10 || "") as ParqFormData["q10"], q11: (parq.q11 || "") as ParqFormData["q11"],
    q12: (parq.q12 || "") as ParqFormData["q12"], q13: (parq.q13 || "") as ParqFormData["q13"], q14: (parq.q14 || "") as ParqFormData["q14"],
    q15: (parq.q15 || "") as ParqFormData["q15"], q16: (parq.q16 || "") as ParqFormData["q16"], q17: (parq.q17 || "") as ParqFormData["q17"],
    q18: (parq.q18 || "") as ParqFormData["q18"],
    q19: (parq.q19 || "") as ParqFormData["q19"], q20: (parq.q20 || "") as ParqFormData["q20"], q21: (parq.q21 || "") as ParqFormData["q21"],
    q22: (parq.q22 || "") as ParqFormData["q22"], q23: (parq.q23 || "") as ParqFormData["q23"], q24: (parq.q24 || "") as ParqFormData["q24"],
    q25: (parq.q25 || "") as ParqFormData["q25"], q26: (parq.q26 || "") as ParqFormData["q26"],
    conditions: parq.conditions || "",
    medications: parq.medications || "",
    devices: parq.devices || "",
    exerciseRestrictions: parq.exercise_restrictions || "",
    surgeries: parq.surgeries || "",
    otherInfo: parq.other_info || "",
    currentExercise: parq.current_exercise || "",
    trainingGoals: parq.training_goals || "",
    q27: (parq.q27 || "") as ParqFormData["q27"], q28: (parq.q28 || "") as ParqFormData["q28"], q29: (parq.q29 || "") as ParqFormData["q29"],
    clientNamePrint: parq.client_name_print || "",
    clientSignatureDate: parq.client_signature_date || "",
    clientTypedSignature: parq.client_typed_signature || "",
  };
}

interface ValidationErrors {
  [key: string]: string;
}

const yesNoOptions: ("yes" | "no")[] = ["yes", "no"];

export default function ParqEditClient({
  parq,
  adminMode = false,
  clientNumber,
  linkExp,
  linkSig,
  hubMode = false,
}: {
  parq: ParqData;
  /** Esther editing in the hub — save without a signature, then hand the client a link to finish + sign. */
  adminMode?: boolean;
  clientNumber?: number;
  /** Signed 7-day link params (minted server-side) for the "copy client link" button.
   *  A bare /parq/edit/[id] with no exp/sig is always rejected — see lib/parq-link.ts. */
  linkExp?: number;
  linkSig?: string;
  /** When true, skip the standalone page wrapper and render sections in HubCard form. */
  hubMode?: boolean;
}) {
  const [formData, setFormData] = useState<ParqFormData>(toFormData(parq));
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const clientResumeUrl = linkExp && linkSig
    ? `${origin}/parq/edit/${parq.id}?exp=${linkExp}&sig=${linkSig}`
    : `${origin}/parq/edit/${parq.id}`;

  const copyClientLink = async () => {
    try {
      await navigator.clipboard.writeText(clientResumeUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setLinkCopied(false);
    }
  };
  const [confirmedAccurate, setConfirmedAccurate] = useState(true);
  const [confirmedClearance, setConfirmedClearance] = useState(true);
  const [consentGpContact, setConsentGpContact] = useState(true);
  const formRef = useRef<HTMLDivElement>(null);

  const handleChange = (field: keyof ParqFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const anyYesInSection2 = formData.q1 === "yes" || formData.q2 === "yes" || formData.q3 === "yes" || formData.q4 === "yes" || formData.q5 === "yes" || formData.q6 === "yes" || formData.q7 === "yes" || formData.q8 === "yes" || formData.q9 === "yes" || formData.q10 === "yes" || formData.q11 === "yes";
  const anyYesInSection3 = formData.q12 === "yes" || formData.q13 === "yes" || formData.q14 === "yes" || formData.q15 === "yes" || formData.q16 === "yes" || formData.q17 === "yes" || formData.q18 === "yes";
  const anyYesInSection4 = formData.q19 === "yes" || formData.q20 === "yes" || formData.q21 === "yes" || formData.q22 === "yes" || formData.q23 === "yes" || formData.q24 === "yes" || formData.q25 === "yes" || formData.q26 === "yes";
  const hasAnyYes = anyYesInSection2 || anyYesInSection3 || anyYesInSection4;

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Admin (Esther) saves are deliberately partial — she may be filling in a few
    // fields and leaving the rest for the client to complete and sign. Only the
    // email format is checked; nothing is mandatory.
    if (adminMode) {
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    const requiredFields: (keyof ParqFormData)[] = [
      "fullName", "dateOfBirth", "address", "email", "phone",
      "emergencyContactName", "emergencyContactPhone",
      "gpName", "gpSurgery",
    ];
    requiredFields.forEach((field) => {
      if (!formData[field]) newErrors[field] = "This field is required";
    });

    const questions: (keyof ParqFormData)[] = [
      "q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11",
      "q12","q13","q14","q15","q16","q17","q18",
      "q19","q20","q21","q22","q23","q24","q25","q26",
      "q27","q28","q29",
    ];
    questions.forEach((q) => {
      if (!formData[q]) newErrors[q] = "Required";
    });

    if (hasAnyYes) {
      const section5Fields: (keyof ParqFormData)[] = ["conditions", "medications"];
      section5Fields.forEach((field) => {
        if (!formData[field]) newErrors[field] = "Required when YES answers are given";
      });
    }

    const hasClientSignature = formData.clientTypedSignature;
    if (!hasClientSignature) newErrors.clientTypedSignature = "A signature is required";
    if (!formData.clientNamePrint) newErrors.clientNamePrint = "This field is required";
    if (!formData.clientSignatureDate) newErrors.clientSignatureDate = "This field is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Please enter a valid email address";
    if (!confirmedAccurate) newErrors.confirmedAccurate = "You must confirm this declaration";
    if (!confirmedClearance) newErrors.confirmedClearance = "You must confirm this declaration";
    if (!consentGpContact) newErrors.consentGpContact = "You must confirm this consent";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent, opts: { copyLink?: boolean } = {}) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) {
      document.querySelector("[data-error-first]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/parq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: parq.id,
          admin_save: adminMode || undefined,
          full_name: formData.fullName,
          date_of_birth: formData.dateOfBirth,
          address: formData.address,
          email: formData.email,
          phone: formData.phone,
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_phone: formData.emergencyContactPhone,
          gp_name: formData.gpName,
          gp_surgery: formData.gpSurgery,
          gp_phone: formData.gpPhone,
          q1: formData.q1, q2: formData.q2, q3: formData.q3, q4: formData.q4, q5: formData.q5,
          q6: formData.q6, q7: formData.q7, q8: formData.q8, q9: formData.q9, q10: formData.q10,
          q11: formData.q11, q12: formData.q12, q13: formData.q13, q14: formData.q14, q15: formData.q15,
          q16: formData.q16, q17: formData.q17, q18: formData.q18,
          q19: formData.q19, q20: formData.q20, q21: formData.q21, q22: formData.q22, q23: formData.q23,
          q24: formData.q24, q25: formData.q25, q26: formData.q26,
          q27: formData.q27, q28: formData.q28, q29: formData.q29,
          conditions: formData.conditions,
          medications: formData.medications,
          devices: formData.devices,
          exercise_restrictions: formData.exerciseRestrictions,
          surgeries: formData.surgeries,
          other_info: formData.otherInfo,
          current_exercise: formData.currentExercise,
          training_goals: formData.trainingGoals,
          client_name_print: formData.clientNamePrint,
          client_signature_date: formData.clientSignatureDate,
          client_typed_signature: formData.clientTypedSignature,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save");
      }
      if (opts.copyLink) await copyClientLink();
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    cn(
      "w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-2 text-[#1E1E1E] text-sm",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087E8B] focus-visible:ring-offset-2",
      errors[field] && "border-red-500 focus-visible:ring-red-500"
    );

  const textareaClass = (field: string) =>
    cn(
      "w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-2 text-[#1E1E1E] text-sm min-h-[80px]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087E8B] focus-visible:ring-offset-2",
      errors[field] && "border-red-500 focus-visible:ring-red-500"
    );

  const YesNoGroup = ({ field }: { field: keyof ParqFormData }) => (
    <div className="flex items-center gap-4">
      {yesNoOptions.map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name={field} value={opt} checked={formData[field] === opt} onChange={() => handleChange(field, opt)} className="h-4 w-4 text-[#087E8B] focus:ring-[#087E8B]" />
          {opt.toUpperCase()}
        </label>
      ))}
      {errors[field] && <span className="text-red-600 text-xs" role="alert">{errors[field]}</span>}
    </div>
  );

  if (isSubmitted) {
    if (adminMode) {
      return (
        <HubAlert severity="success" title="Changes saved">
          This PAR-Q is saved and still awaiting the client&apos;s signature. Send them the link below to finish and sign it.
          <div className="mt-3 text-left bg-[var(--hub-canvas)] rounded-md p-3">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Client link to finish &amp; sign</p>
            <code className="text-xs text-foreground break-all">{clientResumeUrl}</code>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Button type="button" onClick={copyClientLink} size="sm" className="rounded-lg bg-teal text-white hover:bg-teal/90">
              {linkCopied ? "Copied!" : "Copy client link"}
            </Button>
            {clientNumber != null && (
              <a href={`/hub/clients/${clientNumber}?tab=profile-compliance`} className="text-sm text-teal font-medium hover:underline">
                Back to client
              </a>
            )}
          </div>
        </HubAlert>
      );
    }
    return (
      <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-[#1E1E1E] mb-2">PAR-Q Updated</h2>
          <p className="text-[#525A61] text-sm">Your PAR-Q form has been updated successfully. Esther will review your changes before your next session.</p>
        </div>
      </div>
    );
  }

  // ── Hub admin-mode compact question row ──
  const HubYesNoRow = ({ q, text, note, field }: { q: string; text: string; note?: string | null; field: keyof ParqFormData }) => {
    const isYes = formData[field] === "yes";
    return (
      <div
        className={cn(
          "flex items-start justify-between gap-4 py-3 px-1 border-t border-[var(--hub-border)]",
          isYes && "border-l-[3px] border-l-[var(--status-warning)] bg-[var(--status-warning-bg)] rounded-r-lg pl-3.5 -mx-1 px-3.5",
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground leading-snug">
            <b className="font-semibold text-muted-foreground mr-1">{q}.</b>{text}
          </p>
          {note && <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{note}</p>}
        </div>
        <div className={cn("flex shrink-0 rounded-lg border p-0.5 gap-0.5", isYes ? "bg-white border-[var(--color-muted-text)]" : "bg-[var(--hub-canvas)] border-[var(--color-muted-text)]")}>
          {(["yes", "no"] as const).map((opt) => (
            <label key={opt} className="relative">
              <input
                type="radio"
                name={field}
                value={opt}
                checked={formData[field] === opt}
                onChange={() => handleChange(field, opt)}
                className="sr-only"
              />
              <span
                className={cn(
                  "grid place-items-center min-w-[44px] min-h-[26px] px-1 text-[11px] font-bold tracking-wider rounded-md cursor-pointer transition-colors",
                  formData[field] === opt
                    ? isYes && opt === "yes"
                      ? "bg-[var(--status-warning)] text-white"
                      : "bg-white text-foreground shadow-sm"
                    : "text-[var(--color-body)]",
                )}
              >
                {opt.toUpperCase()}
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  if (hubMode && adminMode) {
    // ── Hub-styled admin-mode PAR-Q editor ──
    return (
      <div className="space-y-5">
        <div ref={formRef} role="document" aria-label="PAR-Q Physical Activity Readiness Questionnaire">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {submitError && (
              <HubAlert severity="danger" title="Error saving form">{submitError}</HubAlert>
            )}
            {Object.keys(errors).length > 0 && (
              <HubAlert severity="danger" title="Please correct the following errors">
                <ul className="list-disc list-inside space-y-0.5 mt-1">
                  {Object.entries(errors).map(([field, message]) => (
                    <li key={field}><a href={`#field-${field}`} className="underline">{message}</a></li>
                  ))}
                </ul>
              </HubAlert>
            )}

            {/* Section 1 — Personal details */}
            <HubCard padded={false}>
              <HubCardHeader icon={<IconUser className="w-4 h-4" />} title="Section 1 — Personal details" subtitle="Who the client is, and who to contact if something happens in a session" color="navy" />
              <div className="px-5 pb-5 grid grid-cols-2 gap-x-5 gap-y-4">
                <div className="col-span-2" data-error-first>
                  <Label htmlFor="fullName" className="text-xs font-semibold text-foreground mb-1.5 block">Full name</Label>
                  <Input id="fullName" type="text" value={formData.fullName} onChange={(e) => handleChange("fullName", e.target.value)} className={inputClass("fullName")} autoComplete="name" />
                  {errors.fullName && <p className="text-red-600 text-xs mt-1" role="alert">{errors.fullName}</p>}
                </div>
                <div>
                  <Label htmlFor="dateOfBirth" className="text-xs font-semibold text-foreground mb-1.5 block">Date of birth</Label>
                  <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => handleChange("dateOfBirth", e.target.value)} className={inputClass("dateOfBirth")} autoComplete="bday" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs font-semibold text-foreground mb-1.5 block">Email address</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} className={inputClass("email")} autoComplete="email" />
                  {errors.email && <p className="text-red-600 text-xs mt-1" role="alert">{errors.email}</p>}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address" className="text-xs font-semibold text-foreground mb-1.5 block">Home address</Label>
                  <Input id="address" type="text" value={formData.address} onChange={(e) => handleChange("address", e.target.value)} className={inputClass("address")} autoComplete="street-address" />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs font-semibold text-foreground mb-1.5 block">Phone number</Label>
                  <Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} className={inputClass("phone")} autoComplete="tel" />
                </div>
                <div>
                  <Label htmlFor="emergencyContactName" className="text-xs font-semibold text-foreground mb-1.5 block">Emergency contact name</Label>
                  <Input id="emergencyContactName" type="text" value={formData.emergencyContactName} onChange={(e) => handleChange("emergencyContactName", e.target.value)} className={inputClass("emergencyContactName")} />
                </div>
                <div>
                  <Label htmlFor="emergencyContactPhone" className="text-xs font-semibold text-foreground mb-1.5 block">Emergency contact phone</Label>
                  <Input id="emergencyContactPhone" type="tel" value={formData.emergencyContactPhone} onChange={(e) => handleChange("emergencyContactPhone", e.target.value)} className={inputClass("emergencyContactPhone")} />
                </div>
                <div>
                  <Label htmlFor="gpName" className="text-xs font-semibold text-foreground mb-1.5 block">GP name</Label>
                  <Input id="gpName" type="text" value={formData.gpName} onChange={(e) => handleChange("gpName", e.target.value)} className={inputClass("gpName")} />
                </div>
                <div>
                  <Label htmlFor="gpSurgery" className="text-xs font-semibold text-foreground mb-1.5 block">GP surgery — name &amp; address</Label>
                  <Input id="gpSurgery" type="text" value={formData.gpSurgery} onChange={(e) => handleChange("gpSurgery", e.target.value)} className={inputClass("gpSurgery")} />
                </div>
                <div>
                  <Label htmlFor="gpPhone" className="text-xs font-semibold text-foreground mb-1.5 block">GP phone number <span className="font-medium text-muted-foreground">(optional)</span></Label>
                  <Input id="gpPhone" type="tel" value={formData.gpPhone} onChange={(e) => handleChange("gpPhone", e.target.value)} className={inputClass("gpPhone")} />
                </div>
              </div>
            </HubCard>

            {/* Section 2 — Cardiovascular */}
            <HubCard padded={false}>
              <HubCardHeader icon={<IconHeart className="w-4 h-4" />} title="Section 2 — Cardiovascular &amp; general health" subtitle="A YES here is discussed before the next block is planned, not treated as a block" color="rose" />
              <div className="px-5 pb-5">
                <div className="flex flex-col">
                  {section2Questions.map(({ q, text, note }) => (
                    <HubYesNoRow key={q} q={q.replace("q", "Q")} text={text} note={note} field={q as keyof ParqFormData} />
                  ))}
                </div>
              </div>
            </HubCard>

            {/* Section 3 — Musculoskeletal */}
            <HubCard padded={false}>
              <HubCardHeader icon={<IconBone className="w-4 h-4" />} title="Section 3 — Musculoskeletal, neurological &amp; surgical history" color="navy" />
              <div className="px-5 pb-5">
                <div className="flex flex-col">
                  {section3Questions.map(({ q, text, note }) => (
                    <HubYesNoRow key={q} q={q.replace("q", "Q")} text={text} note={note} field={q as keyof ParqFormData} />
                  ))}
                </div>
              </div>
            </HubCard>

            {/* Section 4 — Blood & Medications */}
            <HubCard padded={false}>
              <HubCardHeader icon={<IconClipboardCheck className="w-4 h-4" />} title="Section 4 — Blood, medications &amp; diagnosed conditions" subtitle="Critical for safety — disclose everything, even if it seems unrelated" color="amber" />
              <div className="px-5 pb-5">
                <div className="flex flex-col">
                  {section4Questions.map(({ q, text, note }) => (
                    <HubYesNoRow key={q} q={q.replace("q", "Q")} text={text} note={note} field={q as keyof ParqFormData} />
                  ))}
                </div>
              </div>
            </HubCard>

            {/* Section 5 — Full details */}
            <HubCard padded={false}>
              <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Section 5 — Full details" subtitle="Required for every YES answer above, referenced by question number" color="slate" />
              <div className="px-5 pb-5 grid gap-4">
                <div data-error-first>
                  <Label htmlFor="conditions" className="text-xs font-semibold text-foreground mb-1.5 block">Diagnosed medical conditions <span className="font-medium text-muted-foreground">(condition, date of diagnosis, treating doctor)</span></Label>
                  <Textarea id="conditions" value={formData.conditions} onChange={(e) => handleChange("conditions", e.target.value)} className={textareaClass("conditions")} placeholder="E.g. Type 2 Diabetes — diagnosed March 2023 — Dr. Smith, Worthing Hospital" />
                  {errors.conditions && <p className="text-red-600 text-xs mt-1" role="alert">{errors.conditions}</p>}
                </div>
                <div>
                  <Label htmlFor="medications" className="text-xs font-semibold text-foreground mb-1.5 block">Current prescription medications <span className="font-medium text-muted-foreground">(medication, dosage, what it's for)</span></Label>
                  <Textarea id="medications" value={formData.medications} onChange={(e) => handleChange("medications", e.target.value)} className={textareaClass("medications")} />
                  {errors.medications && <p className="text-red-600 text-xs mt-1" role="alert">{errors.medications}</p>}
                </div>
                <div>
                  <Label htmlFor="devices" className="text-xs font-semibold text-foreground mb-1.5 block">Implanted medical devices</Label>
                  <Textarea id="devices" value={formData.devices} onChange={(e) => handleChange("devices", e.target.value)} className={textareaClass("devices")} placeholder="E.g. None" />
                </div>
                <div>
                  <Label htmlFor="exerciseRestrictions" className="text-xs font-semibold text-foreground mb-1.5 block">Exercise restrictions <span className="font-medium text-muted-foreground">(who gave them)</span></Label>
                  <Textarea id="exerciseRestrictions" value={formData.exerciseRestrictions} onChange={(e) => handleChange("exerciseRestrictions", e.target.value)} className={textareaClass("exerciseRestrictions")} />
                </div>
                <div>
                  <Label htmlFor="surgeries" className="text-xs font-semibold text-foreground mb-1.5 block">Surgeries / hospital admissions in the last 5 years</Label>
                  <Textarea id="surgeries" value={formData.surgeries} onChange={(e) => handleChange("surgeries", e.target.value)} className={textareaClass("surgeries")} />
                </div>
                <div>
                  <Label htmlFor="otherInfo" className="text-xs font-semibold text-foreground mb-1.5 block">Any other information</Label>
                  <Textarea id="otherInfo" value={formData.otherInfo} onChange={(e) => handleChange("otherInfo", e.target.value)} className={textareaClass("otherInfo")} placeholder="E.g. None" />
                </div>
              </div>
            </HubCard>

            {/* Section 6 — Lifestyle */}
            <HubCard padded={false}>
              <HubCardHeader icon={<IconActivity className="w-4 h-4" />} title="Section 6 — Lifestyle &amp; physical activity" color="teal" />
              <div className="px-5 pb-5 grid gap-4">
                <div>
                  <Label htmlFor="currentExercise" className="text-xs font-semibold text-foreground mb-1.5 block">Current exercise or sport <span className="font-medium text-muted-foreground">(frequency &amp; duration)</span></Label>
                  <Textarea id="currentExercise" value={formData.currentExercise} onChange={(e) => handleChange("currentExercise", e.target.value)} className={textareaClass("currentExercise")} />
                </div>
                <div>
                  <Label htmlFor="trainingGoals" className="text-xs font-semibold text-foreground mb-1.5 block">Goals for working with a personal trainer</Label>
                  <Textarea id="trainingGoals" value={formData.trainingGoals} onChange={(e) => handleChange("trainingGoals", e.target.value)} className={textareaClass("trainingGoals")} />
                </div>
                <div className="flex flex-col mt-1">
                  {section6bQuestions.map(({ q, text, note }) => (
                    <HubYesNoRow key={q} q={q.replace("q", "Q")} text={text} note={note} field={q as keyof ParqFormData} />
                  ))}
                </div>
              </div>
            </HubCard>

            {/* Section 7 — Medical Clearance Record */}
            <HubCard padded={false}>
              <HubCardHeader icon={<IconFileSignature className="w-4 h-4" />} title="Section 7 — Medical clearance record" subtitle="Completed by the trainer, not the client" color="navy" />
              <div className="px-5 pb-5">
                <p className="text-xs text-[var(--color-body)] italic leading-relaxed mb-3">
                  Joan has YES answers in Sections 2, 3 and 4 — assess whether written GP or consultant clearance is required before her next block. No sessions should run until that clearance is on file, where it&apos;s needed.
                </p>
                <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px]">
                  <span className="text-muted-foreground">Medical clearance required?</span>
                  <span className="font-semibold text-foreground text-right">To be assessed by trainer</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px]">
                  <span className="text-muted-foreground">GP / consultant letter received?</span>
                  <span className="font-semibold text-foreground text-right">Not yet — none required to date</span>
                </div>
              </div>
            </HubCard>

            {/* Section 9 — Declaration (locked) */}
            <HubCard padded={false}>
              <HubCardHeader icon={<IconFileSignature className="w-4 h-4" />} title="Section 9 — Declaration &amp; signature" color="amber" />
              <div className="px-5 pb-5">
                <div className="flex gap-3.5 py-1.5">
                  <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--status-warning-bg)] text-[var(--status-warning)] flex items-center justify-center shrink-0">
                    <IconFileSignature className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground mb-1">Only the client can complete this section</p>
                    <p className="text-xs text-[var(--color-body)] leading-relaxed">The declaration and signature confirm the information above is accurate — that has to come from the client, not from an admin save. Once you&apos;ve saved your changes, use the link in the panel on the right to send them straight to this section.</p>
                  </div>
                </div>
              </div>
            </HubCard>

            {/* Save bar */}
            <div className="sticky bottom-0 z-15 flex items-center gap-3 mt-5 rounded-xl border border-[var(--hub-border)] bg-white/90 backdrop-blur px-5 py-3 shadow-[0_-1px_3px_rgba(16,24,40,0.05)]">
              <p className="m-0 text-xs text-muted-foreground"><b className="text-foreground font-semibold">Admin save — no signature required.</b></p>
              <div className="ml-auto flex gap-2">
                <Button type="submit" disabled={isSubmitting} variant="outline" className="rounded-lg border-teal text-teal hover:bg-teal/10">
                  {isSubmitting ? "Saving..." : "Save without signing"}
                </Button>
                <Button type="button" disabled={isSubmitting} onClick={(e) => handleSubmit(e, { copyLink: true })} className="rounded-lg gap-2 bg-teal text-white hover:bg-teal/90">
                  <IconSave className="w-4 h-4" />
                  {isSubmitting ? "Saving..." : "Save & copy client link"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Non-hub rendering (public mode or non-hub admin) — unchanged ──
  return (
    <div className="min-h-screen bg-[#F1F1F1]">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div ref={formRef} className="bg-white rounded-lg shadow-md print:shadow-none print:rounded-none" role="document" aria-label="PAR-Q Physical Activity Readiness Questionnaire">
          {/* Header */}
          <header className="border-b-4 border-[#087E8B] px-6 pt-8 pb-6 print:pb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E1E1E]">Eternal <span className="text-[#C1839F]">♥</span> Fitness</h1>
            <h2 className="text-xl sm:text-2xl font-bold text-[#087E8B] mt-2">PAR-Q · Physical Activity Readiness Questionnaire</h2>
            <p className="text-[#525A61] mt-2 text-sm italic" role="note">Medical Health Screening · Strictly Confidential</p>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mt-4">
              {adminMode ? (
                <>
                  <p className="text-sm text-amber-900 font-semibold">Editing as Esther</p>
                  <p className="text-sm text-amber-800 mt-1">Update any fields you like — nothing is mandatory here. Save without signing, then send the client the link to finish and add their signature.</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-amber-900 font-semibold">Update your PAR-Q</p>
                  <p className="text-sm text-amber-800 mt-1">Please review your answers and complete any missing information. All fields marked with * are required.</p>
                </>
              )}
            </div>
            <div className="bg-[#F1F1F1] rounded-md p-4 mt-4">
              <p className="text-sm text-[#1E1E1E] leading-relaxed">All information provided is treated as strictly confidential and held securely in accordance with UK data protection legislation (UK GDPR / Data Protection Act 2018). Information will not be shared with third parties without your written consent.</p>
            </div>
          </header>

          <form onSubmit={handleSubmit} noValidate className="px-6 py-6 space-y-8">
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4" role="alert">
                <p className="text-red-800 text-sm font-semibold">Error saving form</p>
                <p className="text-red-700 text-sm mt-1">{submitError}</p>
              </div>
            )}
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4" role="alert" aria-labelledby="error-summary-heading">
                <h3 id="error-summary-heading" className="text-red-800 font-semibold text-sm mb-2">Please correct the following errors:</h3>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {Object.entries(errors).map(([field, message]) => (
                    <li key={field}><a href={`#field-${field}`} className="underline hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded">{message}</a></li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section 1 */}
            <section aria-labelledby="personal-details-heading">
              <h2 id="personal-details-heading" className="text-lg font-bold text-[#1E1E1E] mb-4 pb-2 border-b border-[#D9D9D9]">Section 1 — Personal Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2" data-error-first>
                  <Label htmlFor="fullName" className="text-[#1E1E1E] font-medium">Full name <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="fullName" type="text" value={formData.fullName} onChange={(e) => handleChange("fullName", e.target.value)} className={inputClass("fullName")} required aria-required="true" aria-invalid={!!errors.fullName} />
                  {errors.fullName && <p className="text-red-600 text-xs mt-1" role="alert">{errors.fullName}</p>}
                </div>
                <div>
                  <Label htmlFor="dateOfBirth" className="text-[#1E1E1E] font-medium">Date of birth <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => handleChange("dateOfBirth", e.target.value)} className={inputClass("dateOfBirth")} required aria-required="true" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-[#1E1E1E] font-medium">Email address <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} className={inputClass("email")} required aria-required="true" aria-invalid={!!errors.email} />
                  {errors.email && <p className="text-red-600 text-xs mt-1" role="alert">{errors.email}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address" className="text-[#1E1E1E] font-medium">Address <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="address" type="text" value={formData.address} onChange={(e) => handleChange("address", e.target.value)} className={inputClass("address")} required aria-required="true" />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-[#1E1E1E] font-medium">Phone number <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} className={inputClass("phone")} required aria-required="true" />
                </div>
                <div>
                  <Label htmlFor="emergencyContactName" className="text-[#1E1E1E] font-medium">Emergency contact name <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="emergencyContactName" type="text" value={formData.emergencyContactName} onChange={(e) => handleChange("emergencyContactName", e.target.value)} className={inputClass("emergencyContactName")} required aria-required="true" />
                </div>
                <div>
                  <Label htmlFor="emergencyContactPhone" className="text-[#1E1E1E] font-medium">Emergency contact phone <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="emergencyContactPhone" type="tel" value={formData.emergencyContactPhone} onChange={(e) => handleChange("emergencyContactPhone", e.target.value)} className={inputClass("emergencyContactPhone")} required aria-required="true" />
                </div>
                <div>
                  <Label htmlFor="gpName" className="text-[#1E1E1E] font-medium">GP name <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="gpName" type="text" value={formData.gpName} onChange={(e) => handleChange("gpName", e.target.value)} className={inputClass("gpName")} required aria-required="true" />
                </div>
                <div>
                  <Label htmlFor="gpSurgery" className="text-[#1E1E1E] font-medium">GP surgery name and address <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="gpSurgery" type="text" value={formData.gpSurgery} onChange={(e) => handleChange("gpSurgery", e.target.value)} className={inputClass("gpSurgery")} required aria-required="true" />
                </div>
                <div>
                  <Label htmlFor="gpPhone" className="text-[#1E1E1E] font-medium">GP phone number</Label>
                  <Input id="gpPhone" type="tel" value={formData.gpPhone} onChange={(e) => handleChange("gpPhone", e.target.value)} className={inputClass("gpPhone")} />
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section aria-labelledby="cardio-heading">
              <h2 id="cardio-heading" className="text-lg font-bold text-[#1E1E1E] mb-4 pb-2 border-b border-[#D9D9D9]">Section 2 — Cardiovascular and General Health</h2>
              <p className="text-sm text-[#525A61] mb-4 italic">Circle YES or NO for every question. If you answer YES to any question, your trainer will discuss this with you before your programme begins.</p>
              <div className="space-y-4">
                {section2Questions.map(({ q, text, note }) => (
                  <div key={q} className="bg-[#F1F1F1] rounded-md p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-[#1E1E1E] font-medium">Q{q.replace("q", "")}. {text}</p>
                        {note && <p className="text-xs text-[#525A61] mt-1 italic">{note}</p>}
                      </div>
                      <YesNoGroup field={q as keyof ParqFormData} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3 */}
            <section aria-labelledby="musculo-heading">
              <h2 id="musculo-heading" className="text-lg font-bold text-[#1E1E1E] mb-4 pb-2 border-b border-[#D9D9D9]">Section 3 — Musculoskeletal, Neurological, and Surgical History</h2>
              <div className="space-y-4">
                {section3Questions.map(({ q, text, note }) => (
                  <div key={q} className="bg-[#F1F1F1] rounded-md p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-[#1E1E1E] font-medium">Q{q.replace("q", "")}. {text}</p>
                        {note && <p className="text-xs text-[#525A61] mt-1 italic">{note}</p>}
                      </div>
                      <YesNoGroup field={q as keyof ParqFormData} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 4 */}
            <section aria-labelledby="blood-heading">
              <h2 id="blood-heading" className="text-lg font-bold text-[#1E1E1E] mb-4 pb-2 border-b border-[#D9D9D9]">Section 4 — Blood Conditions, Medications, and Diagnosed Conditions</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                <p className="text-sm text-amber-900 font-semibold">This section is critical for your safety — please complete in full.</p>
                <p className="text-sm text-amber-800 mt-1">Some medications and blood conditions significantly affect how your body responds to exercise and your risk of injury. Please disclose ALL medications, supplements, and diagnosed conditions — even if you do not think they are relevant.</p>
              </div>
              <div className="space-y-4">
                {section4Questions.map(({ q, text, note }) => (
                  <div key={q} className="bg-[#F1F1F1] rounded-md p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-[#1E1E1E] font-medium">Q{q.replace("q", "")}. {text}</p>
                        {note && <p className="text-xs text-[#525A61] mt-1 italic">{note}</p>}
                      </div>
                      <YesNoGroup field={q as keyof ParqFormData} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 5 */}
            <section aria-labelledby="details-heading">
              <h2 id="details-heading" className="text-lg font-bold text-[#1E1E1E] mb-4 pb-2 border-b border-[#D9D9D9]">Section 5 — Full Details</h2>
              <p className="text-sm text-[#525A61] mb-4 italic">Complete this section for every YES answer — reference the question number. You must complete this section for every YES answer above.</p>
              <div className="space-y-6">
                <div data-error-first>
                  <Label htmlFor="conditions" className="text-[#1E1E1E] font-medium mb-2 block">Diagnosed medical conditions <span className="text-[#525A61] font-normal text-sm">(list each condition, date of diagnosis, and name of treating doctor or consultant)</span></Label>
                  <Textarea id="conditions" value={formData.conditions} onChange={(e) => handleChange("conditions", e.target.value)} className={textareaClass("conditions")} placeholder="E.g. Type 2 Diabetes — diagnosed March 2023 — Dr. Smith, Worthing Hospital" />
                  {errors.conditions && <p className="text-red-600 text-xs mt-1" role="alert">{errors.conditions}</p>}
                </div>
                <div>
                  <Label htmlFor="medications" className="text-[#1E1E1E] font-medium mb-2 block">All current prescription medications <span className="text-[#525A61] font-normal text-sm">(list each medication, dosage, and what it is prescribed for)</span></Label>
                  <Textarea id="medications" value={formData.medications} onChange={(e) => handleChange("medications", e.target.value)} className={textareaClass("medications")} placeholder="E.g. Metformin 500mg — twice daily — Type 2 Diabetes" />
                  {errors.medications && <p className="text-red-600 text-xs mt-1" role="alert">{errors.medications}</p>}
                </div>
                <div>
                  <Label htmlFor="devices" className="text-[#1E1E1E] font-medium mb-2 block">Implanted medical devices <span className="text-[#525A61] font-normal text-sm">(describe each device, when inserted, and any restrictions)</span></Label>
                  <Textarea id="devices" value={formData.devices} onChange={(e) => handleChange("devices", e.target.value)} className={textareaClass("devices")} placeholder="E.g. None" />
                </div>
                <div>
                  <Label htmlFor="exerciseRestrictions" className="text-[#1E1E1E] font-medium mb-2 block">Exercise restrictions <span className="text-[#525A61] font-normal text-sm">(list any specific restrictions given by a medical professional and who gave them)</span></Label>
                  <Textarea id="exerciseRestrictions" value={formData.exerciseRestrictions} onChange={(e) => handleChange("exerciseRestrictions", e.target.value)} className={textareaClass("exerciseRestrictions")} placeholder="E.g. Avoid heavy spinal loading — Mr. Jones, Orthopaedic Consultant" />
                </div>
                <div>
                  <Label htmlFor="surgeries" className="text-[#1E1E1E] font-medium mb-2 block">Surgeries or hospital admissions in the last 5 years <span className="text-[#525A61] font-normal text-sm">(list each with date, procedure, and hospital)</span></Label>
                  <Textarea id="surgeries" value={formData.surgeries} onChange={(e) => handleChange("surgeries", e.target.value)} className={textareaClass("surgeries")} placeholder="E.g. June 2024 — Knee arthroscopy — St. Richard's Hospital, Chichester" />
                </div>
                <div>
                  <Label htmlFor="otherInfo" className="text-[#1E1E1E] font-medium mb-2 block">Any other information <span className="text-[#525A61] font-normal text-sm">(anything you think your trainer should know)</span></Label>
                  <Textarea id="otherInfo" value={formData.otherInfo} onChange={(e) => handleChange("otherInfo", e.target.value)} className={textareaClass("otherInfo")} placeholder="E.g. None" />
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section aria-labelledby="lifestyle-heading">
              <h2 id="lifestyle-heading" className="text-lg font-bold text-[#1E1E1E] mb-4 pb-2 border-b border-[#D9D9D9]">Section 6 — Lifestyle and Physical Activity</h2>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="currentExercise" className="text-[#1E1E1E] font-medium mb-2 block">What types of exercise or sport do you currently do? <span className="text-[#525A61] font-normal text-sm">(include frequency and duration)</span></Label>
                  <Textarea id="currentExercise" value={formData.currentExercise} onChange={(e) => handleChange("currentExercise", e.target.value)} className={textareaClass("currentExercise")} placeholder="E.g. Walking 20 minutes daily, light stretching twice a week" />
                </div>
                <div>
                  <Label htmlFor="trainingGoals" className="text-[#1E1E1E] font-medium mb-2 block">What are your goals for working with a personal trainer?</Label>
                  <Textarea id="trainingGoals" value={formData.trainingGoals} onChange={(e) => handleChange("trainingGoals", e.target.value)} className={textareaClass("trainingGoals")} placeholder="E.g. Regain strength after cancer treatment, improve mobility and confidence" />
                </div>
                <div className="space-y-4">
                  {section6bQuestions.map(({ q, text, note }) => (
                    <div key={q} className="bg-[#F1F1F1] rounded-md p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm text-[#1E1E1E] font-medium">Q{q.replace("q", "")}. {text}</p>
                          {note && <p className="text-xs text-[#525A61] mt-1 italic">{note}</p>}
                        </div>
                        <YesNoGroup field={q as keyof ParqFormData} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section aria-labelledby="clearance-heading">
              <h2 id="clearance-heading" className="text-lg font-bold text-[#1E1E1E] mb-4 pb-2 border-b border-[#D9D9D9]">Section 7 — Medical Clearance Record</h2>
              <p className="text-sm text-[#525A61] mb-4 italic">To be completed by the trainer.</p>
              <div className="bg-[#F1F1F1] rounded-md p-4">
                <p className="text-sm text-[#1E1E1E] mb-3">If the client has answered YES to any question in Sections 2, 3, or 4, the trainer will assess whether medical clearance is required before commencing exercise. Where clearance is required, no sessions should be delivered until a signed letter from the GP or relevant consultant has been received and placed on file.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#1E1E1E] font-medium text-sm">Medical clearance required?</Label>
                    <p className="text-sm text-[#525A61] mt-1 italic">{hasAnyYes ? "To be assessed by trainer" : "Not required — no YES answers"}</p>
                  </div>
                  <div>
                    <Label className="text-[#1E1E1E] font-medium text-sm">GP / consultant letter received?</Label>
                    <p className="text-sm text-[#525A61] mt-1 italic">To be completed by trainer</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 9 */}
            <section aria-labelledby="declaration-heading">
              <h2 id="declaration-heading" className="text-lg font-bold text-[#1E1E1E] mb-4 pb-2 border-b border-[#D9D9D9]">Section 9 — Declaration and Signature</h2>
              <div className="bg-[#F1F1F1] rounded-md p-4 mb-6 space-y-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="confirmedAccurate" checked={confirmedAccurate} onChange={(e) => setConfirmedAccurate(e.target.checked)} className="mt-1 h-4 w-4 rounded border-[#D9D9D9] text-[#087E8B] focus:ring-[#087E8B] focus:ring-offset-0 cursor-pointer" aria-required="true" aria-invalid={!!errors.confirmedAccurate} />
                  <Label htmlFor="confirmedAccurate" className="text-sm text-[#1E1E1E] cursor-pointer">I confirm that the information I have provided in this form is accurate and complete to the best of my knowledge. I understand that withholding or providing inaccurate health information may put my safety at risk. <span className="text-red-600" aria-hidden="true">*</span></Label>
                </div>
                {errors.confirmedAccurate && <p className="text-red-600 text-xs mt-1 ml-7" role="alert">{errors.confirmedAccurate}</p>}
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="confirmedClearance" checked={confirmedClearance} onChange={(e) => setConfirmedClearance(e.target.checked)} className="mt-1 h-4 w-4 rounded border-[#D9D9D9] text-[#087E8B] focus:ring-[#087E8B] focus:ring-offset-0 cursor-pointer" aria-required="true" aria-invalid={!!errors.confirmedClearance} />
                  <Label htmlFor="confirmedClearance" className="text-sm text-[#1E1E1E] cursor-pointer">I understand that where my trainer determines medical clearance is required, no training sessions will commence until that clearance has been received in writing. I agree to cooperate with requests for medical clearance and to inform my trainer of any change to my health status before my next session. <span className="text-red-600" aria-hidden="true">*</span></Label>
                </div>
                {errors.confirmedClearance && <p className="text-red-600 text-xs mt-1 ml-7" role="alert">{errors.confirmedClearance}</p>}
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="consentGpContact" checked={consentGpContact} onChange={(e) => setConsentGpContact(e.target.checked)} className="mt-1 h-4 w-4 rounded border-[#D9D9D9] text-[#087E8B] focus:ring-[#087E8B] focus:ring-offset-0 cursor-pointer" aria-required="true" aria-invalid={!!errors.consentGpContact} />
                  <Label htmlFor="consentGpContact" className="text-sm text-[#1E1E1E] cursor-pointer">I consent to my trainer contacting my GP for the purpose of requesting medical clearance where this is deemed necessary for my safety, and I understand my trainer will inform me before doing so. <span className="text-red-600" aria-hidden="true">*</span></Label>
                </div>
                {errors.consentGpContact && <p className="text-red-600 text-xs mt-1 ml-7" role="alert">{errors.consentGpContact}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div>
                  <Label htmlFor="clientNamePrint" className="text-[#1E1E1E] font-medium mb-2 block">Client full name (print) <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="clientNamePrint" type="text" value={formData.clientNamePrint} onChange={(e) => handleChange("clientNamePrint", e.target.value)} className={inputClass("clientNamePrint")} required aria-required="true" />
                  {errors.clientNamePrint && <p className="text-red-600 text-xs mt-1" role="alert">{errors.clientNamePrint}</p>}
                </div>
                <div>
                  <Label htmlFor="clientSignatureDate" className="text-[#1E1E1E] font-medium mb-2 block">Date <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="clientSignatureDate" type="date" value={formData.clientSignatureDate} onChange={(e) => handleChange("clientSignatureDate", e.target.value)} className={inputClass("clientSignatureDate")} required aria-required="true" />
                  {errors.clientSignatureDate && <p className="text-red-600 text-xs mt-1" role="alert">{errors.clientSignatureDate}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="clientTypedSignature" className="text-[#1E1E1E] font-medium mb-2 block">Type your full name as signature <span className="text-red-600" aria-hidden="true">*</span></Label>
                  <Input id="clientTypedSignature" type="text" value={formData.clientTypedSignature} onChange={(e) => handleChange("clientTypedSignature", e.target.value)} className={inputClass("clientTypedSignature")} placeholder="Type your full name" required aria-required="true" />
                  {errors.clientTypedSignature && <p className="text-red-600 text-xs mt-1" role="alert">{errors.clientTypedSignature}</p>}
                </div>
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
              {adminMode ? (
                <>
                  <Button type="submit" disabled={isSubmitting} variant="outline" className="border-[#087E8B] text-[#087E8B] hover:bg-[#087E8B]/10 px-6">
                    {isSubmitting ? "Saving..." : "Save without signing"}
                  </Button>
                  <Button type="button" disabled={isSubmitting} onClick={(e) => handleSubmit(e, { copyLink: true })} className="bg-[#087E8B] text-white hover:bg-[#087E8B]/90 px-6">
                    {isSubmitting ? "Saving..." : "Save & copy client link"}
                  </Button>
                </>
              ) : (
                <Button type="submit" disabled={isSubmitting} className="bg-[#087E8B] text-white hover:bg-[#087E8B]/90 px-8">
                  {isSubmitting ? "Saving..." : "Update PAR-Q"}
                </Button>
              )}
            </div>

          </form>

          <footer className="border-t border-[#D9D9D9] px-6 py-4 text-center text-xs text-[#525A61] print:border-t-0">
            <p>Eternal <span className="text-[#C1839F]">♥</span> Fitness · PAR-Q / Medical Health Screening · Confidential — held securely on file</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
