"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IconPrinter, IconX } from "@/components/icons";
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

interface ParqData {
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
  client_typed_signature: string | null;
}

const formatDate = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export default function AgreementPrintView({ agreement, onClose }: { agreement: AgreementData; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [parqData, setParqData] = useState<ParqData | null>(null);

  useEffect(() => {
    fetch(`/api/parq?client_name=${encodeURIComponent(agreement.client_name)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setParqData(d); })
      .catch(() => {});
  }, [agreement.client_name]);

  const handlePrint = () => {
    window.print();
  };

  const yn = (v: string) => v === "yes" ? "YES" : v === "no" ? "NO" : "—";
  const ynClass = (v: string) => v === "yes" ? "text-red-600 font-bold" : v === "no" ? "text-green-600" : "text-gray-400";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-auto print:bg-none print:fixed print:inset-0 print:z-auto">
      {/* Toolbar - hidden on print */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between gap-4 print:hidden">
        <h2 className="text-lg font-semibold">Print Agreement</h2>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="gap-2 bg-[#087E8B] hover:bg-[#087E8B]/90">
            <IconPrinter className="w-4 h-4" />
            Print
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <IconX className="w-4 h-4" />
            Close
          </Button>
        </div>
      </div>

      {/* Print content */}
      <div ref={printRef} className="max-w-4xl mx-auto bg-white print:max-w-none print:mx-0">
        <div className="px-8 py-8 print:px-6 print:py-4">
          {/* Header */}
          <header className="border-b-4 border-[#087E8B] pb-4 mb-6 print:mb-4">
            <h1 className="text-2xl font-bold text-[#1E1E1E]">
              Eternal <span className="text-[#C1839F]">♥</span> Fitness
            </h1>
            <h2 className="text-xl font-bold text-[#087E8B] mt-2">
              Personal Training Agreement — Signed Copy
            </h2>
            <p className="text-[#525A61] mt-2 text-sm italic">
              Signed by {agreement.client_name} on {formatDate(agreement.client_signature_date)}
            </p>
          </header>

          {/* Section A: Parties */}
          <section className="mb-6">
            <h3 className="text-lg font-bold text-[#1E1E1E] mb-3 pb-2 border-b border-[#D9D9D9]">
              A. Parties to this agreement
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-[#525A61] uppercase">Client full name</p><p className="font-medium">{agreement.client_name}</p></div>
              <div><p className="text-xs text-[#525A61] uppercase">Date of birth</p><p>{formatDate(agreement.client_dob)}</p></div>
              <div><p className="text-xs text-[#525A61] uppercase">Agreement start date</p><p>{formatDate(agreement.start_date)}</p></div>
              <div><p className="text-xs text-[#525A61] uppercase">Email</p><p>{agreement.client_email}</p></div>
              <div className="col-span-2"><p className="text-xs text-[#525A61] uppercase">Address</p><p>{agreement.client_address}</p></div>
              <div><p className="text-xs text-[#525A61] uppercase">Phone</p><p>{agreement.client_phone}</p></div>
              <div><p className="text-xs text-[#525A61] uppercase">Trainer</p><p>{agreement.trainer_name}</p></div>
              <div><p className="text-xs text-[#525A61] uppercase">Business</p><p>{agreement.business_name}</p></div>
            </div>
          </section>

          {/* Sections 1-7: Terms */}
          <section className="mb-6">
            <h3 className="text-lg font-bold text-[#1E1E1E] mb-3 pb-2 border-b border-[#D9D9D9]">
              1–7. Agreement Terms
            </h3>
            <div className="space-y-4 text-sm text-[#1E1E1E]">
              <div>
                <h4 className="font-semibold text-[#087E8B]">1. The trainer&apos;s commitments to you</h4>
                <p className="mt-1">The trainer will deliver all sessions professionally, in accordance with their qualifications, current industry guidelines, and within their scope of practice. The trainer will maintain current, valid professional liability insurance throughout the duration of this agreement. The trainer will design a programme based on the client&apos;s stated goals, health screening information, and assessment results, reviewed and updated regularly. All personal, medical, and training information will be held in strict confidence and stored securely in accordance with UK data protection legislation (UK GDPR / Data Protection Act 2018).</p>
              </div>
              <div>
                <h4 className="font-semibold text-[#087E8B]">2. The client&apos;s responsibilities</h4>
                <p className="mt-1">The client agrees to disclose all relevant health information on the PAR-Q before their first session, including all medical conditions, diagnosed conditions, injuries, implanted medical devices, and all prescription medications. The client agrees to update the trainer immediately if any change occurs. Where medical clearance is required, no sessions will commence until that clearance has been received in writing. Sessions must be cancelled or rescheduled with at least 24 hours notice.</p>
              </div>
              <div>
                <h4 className="font-semibold text-[#087E8B]">3. Medical clearance requirements</h4>
                <p className="mt-1">Conditions requiring written GP or specialist clearance before sessions begin include: any implanted medical device, anticoagulant medication, blood disorders, significant cardiac conditions, uncontrolled hypertension, neurological conditions, recent surgery within 12 weeks, active cancer treatment, Type 1 diabetes, epilepsy not fully controlled, and any condition where a medical professional has given specific exercise restrictions.</p>
              </div>
              <div>
                <h4 className="font-semibold text-[#087E8B]">4. Payment terms</h4>
                <p className="mt-1">A block of 12 sessions is valid for 120 days from purchase. A block of 24 sessions is valid for 240 days. Sessions not used within the validity period are forfeited without refund. Full payment is required before the block commences. A non-refundable deposit of £100 is required to secure time slots. Rolling contracts are subject to a minimum initial term of 3 months. No refunds will be issued for unused sessions for any reason.</p>
              </div>
              <div>
                <h4 className="font-semibold text-[#087E8B]">5. Risk, liability, and safety</h4>
                <p className="mt-1">The client acknowledges that physical exercise carries inherent risks. The trainer&apos;s liability is limited to direct loss caused by the trainer&apos;s negligence. The trainer accepts no liability for injury resulting from the client&apos;s failure to disclose relevant health information, injury during independent training, loss of earnings, or pre-existing conditions aggravated by exercise where the trainer was not informed.</p>
              </div>
              <div>
                <h4 className="font-semibold text-[#087E8B]">6. Data protection and privacy</h4>
                <p className="mt-1">The trainer holds: name, contact details, date of birth, health screening information, medical clearance letters, session records, and payment records. This information is used solely for the purpose of delivering personal training services safely. Client records will be retained for a minimum of 7 years following the end of the training relationship, then securely destroyed. The client has the right to request access to their personal data at any time.</p>
              </div>
              <div>
                <h4 className="font-semibold text-[#087E8B]">7. General terms</h4>
                <p className="mt-1">This agreement, together with the completed PAR-Q, constitutes the entire agreement between the trainer and the client. Any changes must be agreed and signed in writing by both parties. This agreement is governed by the laws of England and Wales.</p>
              </div>
            </div>
          </section>

          {/* Section 8: Signatures */}
          <section className="mb-6">
            <h3 className="text-lg font-bold text-[#1E1E1E] mb-3 pb-2 border-b border-[#D9D9D9]">
              8. Agreement and signatures
            </h3>

            <div className="bg-[#F1F1F1] rounded-nested p-4 mb-6 text-sm">
              <p className="mb-3">
                By signing below, both parties confirm that they have read and understood this agreement in full. The client confirms that they have completed the PAR-Q honestly and accept all terms set out in this agreement.
              </p>
              <p className="font-semibold mb-2">The client confirms specifically that:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>They have disclosed all relevant medical conditions, medications, and health information on the PAR-Q</li>
                <li>They understand that medical clearance may be required before sessions begin</li>
                <li>They will inform the trainer immediately of any change to their health, medication, or medical advice</li>
                <li>They understand the risks of exercise as described in Section 5</li>
                <li>They have not been told by any medical professional that they must not exercise — or if they have, they have disclosed this</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Client signature */}
              <div className="p-4 border rounded">
                <p className="font-semibold mb-3">Client</p>
                <div className="text-sm space-y-2">
                  <div><p className="text-xs text-[#525A61] uppercase">Name (print)</p><p className="font-medium">{agreement.client_name_print}</p></div>
                  <div><p className="text-xs text-[#525A61] uppercase">Date</p><p>{formatDate(agreement.client_signature_date)}</p></div>
                  <div>
                    <p className="text-xs text-[#525A61] uppercase mb-1">Signature</p>
                    {agreement.client_signature_data ? (
                      <img src={agreement.client_signature_data} alt="Client signature" className="h-12 border-b" />
                    ) : agreement.client_typed_signature ? (
                      <p className="italic font-serif text-lg">{agreement.client_typed_signature}</p>
                    ) : (
                      <p className="italic text-[#525A61]">Signed</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Trainer signature */}
              <div className="p-4 border rounded bg-[#F1F1F1]">
                <p className="font-semibold mb-3">Trainer (auto-signed)</p>
                <div className="text-sm space-y-2">
                  <div><p className="text-xs text-[#525A61] uppercase">Name (print)</p><p className="font-medium">{agreement.trainer_name_print}</p></div>
                  <div><p className="text-xs text-[#525A61] uppercase">Date</p><p>{formatDate(agreement.trainer_signature_date)}</p></div>
                  <div>
                    <p className="text-xs text-[#525A61] uppercase mb-1">Signature</p>
                    {agreement.trainer_signature_data ? (
                      <img src={agreement.trainer_signature_data} alt="Trainer signature" className="h-12 border-b" />
                    ) : (
                      <p className="italic font-serif text-lg">{agreement.trainer_typed_signature}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PAR-Q Full Answers */}
          {parqData && (
            <section className="mb-6 print:break-inside-avoid">
              <h3 className="text-lg font-bold text-[#1E1E1E] mb-3 pb-2 border-b border-[#D9D9D9]">
                PAR-Q — Physical Activity Readiness Questionnaire
              </h3>

              {/* Personal Details */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-[#087E8B] mb-2">Personal Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm bg-[#F1F1F1] rounded-nested p-3">
                  <div><p className="text-xs text-[#525A61] uppercase">Name</p><p className="font-medium">{parqData.full_name}</p></div>
                  <div><p className="text-xs text-[#525A61] uppercase">Date of birth</p><p>{formatDate(parqData.date_of_birth)}</p></div>
                  <div className="col-span-2"><p className="text-xs text-[#525A61] uppercase">Address</p><p>{parqData.address || "—"}</p></div>
                  <div><p className="text-xs text-[#525A61] uppercase">Phone</p><p>{parqData.phone || "—"}</p></div>
                  <div><p className="text-xs text-[#525A61] uppercase">Email</p><p>{parqData.email || "—"}</p></div>
                  <div><p className="text-xs text-[#525A61] uppercase">Emergency contact</p><p>{parqData.emergency_contact_name || "—"} ({parqData.emergency_contact_phone || "—"})</p></div>
                  <div><p className="text-xs text-[#525A61] uppercase">GP</p><p>{parqData.gp_name || "—"} — {parqData.gp_surgery || "—"}</p></div>
                </div>
              </div>

              {/* Questions */}
              {parqSections.map((section) => (
                <div key={section.label} className="mb-4">
                  <h4 className="text-sm font-semibold text-[#087E8B] mb-2">{section.label}</h4>
                  <div className="space-y-1">
                    {section.questions.map(({ q, text }) => (
                      <div key={q} className="flex items-center justify-between text-sm bg-[#F1F1F1] rounded px-3 py-1.5">
                        <span className="text-[#1E1E1E]">{text}</span>
                        <span className={`ml-4 font-bold text-xs ${ynClass(parqData[q as keyof ParqData] as string)}`}>{yn(parqData[q as keyof ParqData] as string)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Full Details */}
              {(parqData.conditions || parqData.medications || parqData.devices || parqData.exercise_restrictions || parqData.surgeries || parqData.other_info) && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-[#087E8B] mb-2">Full Details</h4>
                  <div className="space-y-2 text-sm">
                    {parqData.conditions && <div className="bg-[#F1F1F1] rounded p-2"><p className="text-xs text-[#525A61] uppercase">Medical conditions</p><p className="whitespace-pre-wrap">{parqData.conditions}</p></div>}
                    {parqData.medications && <div className="bg-[#F1F1F1] rounded p-2"><p className="text-xs text-[#525A61] uppercase">Medications</p><p className="whitespace-pre-wrap">{parqData.medications}</p></div>}
                    {parqData.devices && <div className="bg-[#F1F1F1] rounded p-2"><p className="text-xs text-[#525A61] uppercase">Implanted devices</p><p className="whitespace-pre-wrap">{parqData.devices}</p></div>}
                    {parqData.exercise_restrictions && <div className="bg-[#F1F1F1] rounded p-2"><p className="text-xs text-[#525A61] uppercase">Exercise restrictions</p><p className="whitespace-pre-wrap">{parqData.exercise_restrictions}</p></div>}
                    {parqData.surgeries && <div className="bg-[#F1F1F1] rounded p-2"><p className="text-xs text-[#525A61] uppercase">Surgeries</p><p className="whitespace-pre-wrap">{parqData.surgeries}</p></div>}
                    {parqData.other_info && <div className="bg-[#F1F1F1] rounded p-2"><p className="text-xs text-[#525A61] uppercase">Other information</p><p className="whitespace-pre-wrap">{parqData.other_info}</p></div>}
                  </div>
                </div>
              )}

              {/* Lifestyle */}
              {(parqData.current_exercise || parqData.training_goals) && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-[#087E8B] mb-2">Lifestyle and Physical Activity</h4>
                  <div className="space-y-2 text-sm">
                    {parqData.current_exercise && <div className="bg-[#F1F1F1] rounded p-2"><p className="text-xs text-[#525A61] uppercase">Current exercise</p><p className="whitespace-pre-wrap">{parqData.current_exercise}</p></div>}
                    {parqData.training_goals && <div className="bg-[#F1F1F1] rounded p-2"><p className="text-xs text-[#525A61] uppercase">Training goals</p><p className="whitespace-pre-wrap">{parqData.training_goals}</p></div>}
                  </div>
                </div>
              )}

              {/* Signature */}
              <div className="bg-[#F1F1F1] rounded-nested p-3 text-sm">
                <div className="grid grid-cols-3 gap-4">
                  <div><p className="text-xs text-[#525A61] uppercase">Client name (print)</p><p className="font-medium">{parqData.client_name_print || "—"}</p></div>
                  <div><p className="text-xs text-[#525A61] uppercase">Date</p><p>{formatDate(parqData.client_signature_date)}</p></div>
                  <div><p className="text-xs text-[#525A61] uppercase">Signature</p><p className="italic font-serif">{parqData.client_typed_signature || "—"}</p></div>
                </div>
              </div>
            </section>
          )}

          {/* PAR-Q and Medical clearance filing */}
          <section className="mb-6">
            <div className="bg-[#F1F1F1] rounded-nested p-4">
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                <div><p className="text-xs text-[#525A61] uppercase">PAR-Q completed</p><p className="font-medium uppercase">{agreement.parq_completed || "—"}</p></div>
                <div><p className="text-xs text-[#525A61] uppercase">Date</p><p>{formatDate(agreement.parq_date)}</p></div>
                <div><p className="text-xs text-[#525A61] uppercase">Filed by</p><p>{agreement.parq_filed_by || "—"}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-xs text-[#525A61] uppercase">Medical clearance</p><p className="font-medium uppercase">{agreement.medical_clearance || "—"}</p></div>
                <div><p className="text-xs text-[#525A61] uppercase">Date</p><p>{formatDate(agreement.medical_clearance_date)}</p></div>
                <div><p className="text-xs text-[#525A61] uppercase">From</p><p>{agreement.medical_clearance_from || "—"}</p></div>
              </div>
            </div>
          </section>

          {/* Trainer Information (if any) */}
          {(agreement.trainer_notes || agreement.trainer_observations || agreement.exercise_modifications || agreement.watch_for || agreement.package_type || agreement.risk_level) && (
            <section className="mb-6">
              <h3 className="text-lg font-bold text-[#1E1E1E] mb-3 pb-2 border-b border-[#D9D9D9]">
                Trainer Information
              </h3>
              <div className="space-y-4 text-sm">
                {agreement.package_type && (
                  <div className="grid grid-cols-3 gap-4">
                    <div><p className="text-xs text-[#525A61] uppercase">Package</p><p className="font-medium">{agreement.package_type}</p></div>
                    {agreement.sessions_purchased && <div><p className="text-xs text-[#525A61] uppercase">Sessions</p><p>{agreement.sessions_purchased} × {agreement.session_duration || 60}min</p></div>}
                    {agreement.payment_status && <div><p className="text-xs text-[#525A61] uppercase">Payment</p><p className="font-medium uppercase">{agreement.payment_status}</p></div>}
                  </div>
                )}
                {agreement.sessions_used !== null && agreement.sessions_used !== undefined && (
                  <div><p className="text-xs text-[#525A61] uppercase">Sessions used / remaining</p><p>{agreement.sessions_used} / {agreement.sessions_remaining ?? "?"}</p></div>
                )}
                {agreement.block_expiry_date && (
                  <div><p className="text-xs text-[#525A61] uppercase">Block expiry</p><p>{formatDate(agreement.block_expiry_date)}</p></div>
                )}
                {agreement.medical_clearance_status && agreement.medical_clearance_status !== "not_required" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div><p className="text-xs text-[#525A61] uppercase">Clearance status</p><p className="font-medium uppercase">{agreement.medical_clearance_status.replace(/_/g, " ")}</p></div>
                    {agreement.gp_letter_requested_date && <div><p className="text-xs text-[#525A61] uppercase">GP letter requested</p><p>{formatDate(agreement.gp_letter_requested_date)}</p></div>}
                    {agreement.gp_letter_received_date && <div><p className="text-xs text-[#525A61] uppercase">GP letter received</p><p>{formatDate(agreement.gp_letter_received_date)}</p></div>}
                  </div>
                )}
                {agreement.risk_level && (
                  <div className="grid grid-cols-3 gap-4">
                    <div><p className="text-xs text-[#525A61] uppercase">Risk level</p><p className="font-medium uppercase">{agreement.risk_level}</p></div>
                    {agreement.client_status && <div><p className="text-xs text-[#525A61] uppercase">Client status</p><p className="font-medium uppercase">{agreement.client_status}</p></div>}
                    {agreement.annual_review_due_date && <div><p className="text-xs text-[#525A61] uppercase">Annual review due</p><p>{formatDate(agreement.annual_review_due_date)}</p></div>}
                  </div>
                )}
                {agreement.exercise_modifications && (
                  <div><p className="text-xs text-[#525A61] uppercase">Exercise modifications</p><p className="whitespace-pre-wrap mt-1">{agreement.exercise_modifications}</p></div>
                )}
                {agreement.watch_for && (
                  <div><p className="text-xs text-[#525A61] uppercase">Watch for</p><p className="whitespace-pre-wrap mt-1 text-rose bg-rose/5 p-2 rounded">{agreement.watch_for}</p></div>
                )}
                {agreement.trainer_observations && (
                  <div><p className="text-xs text-[#525A61] uppercase">Trainer observations</p><p className="whitespace-pre-wrap mt-1">{agreement.trainer_observations}</p></div>
                )}
                {agreement.trainer_notes && (
                  <div><p className="text-xs text-[#525A61] uppercase">Trainer notes</p><p className="whitespace-pre-wrap mt-1">{agreement.trainer_notes}</p></div>
                )}
              </div>
            </section>
          )}

          {/* Agreement acceptance */}
          <section className="mb-6">
            <div className="flex items-center gap-2 text-sm">
              {agreement.agreed_to_terms ? (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              )}
              <p>Terms accepted: <span className="font-semibold">{agreement.agreed_to_terms ? "Yes" : "No"}</span></p>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-[#D9D9D9] pt-4 text-center text-xs text-[#525A61]">
            <p>
              Eternal <span className="text-[#C1839F]">♥</span> Fitness · Personal Training Agreement · Signed copy · Confidential — held securely on file
            </p>
            <p className="mt-1">
              Record ID: {agreement.id} · Signed: {formatDate(agreement.signed_at)}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
