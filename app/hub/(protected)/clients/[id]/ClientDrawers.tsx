"use client";

import Link from "next/link";
import { DrawerShell, useDrawerManager } from "./DrawerManager";
import type { DBBlock, DBSession } from "@/types";
import type { ExerciseTrend } from "@/lib/progress";
import type { ComplianceFlags } from "@/lib/compliance";

/* ── ClientDrawers — real drawer content for the five reference doors plus
   the training content drawers. Each drawer receives data threaded from
   page.tsx → ClientRecordShell → here. */

interface ClientDrawersProps {
  client: any;
  blocks: DBBlock[];
  sessions: DBSession[];
  latestBlock: DBBlock | null;
  blockSessions: DBSession[];
  portalAccount: any;
  clientNotes: any[];
  clientReviews: any[];
  bandSetName: string | null;
  missingBandSet: boolean;
  allTaskRows: any[];
  clientDocuments: any[];
  legacyDocumentRows: any[];
  flags: ComplianceFlags;
  clientUpdates: any[];
  dueInfo: { nextDueDate: string | null; daysUntilDue: number | null; status: string | null };
  exerciseTrends: ExerciseTrend[];
  exerciseTrendSummary?: {
    totalExercisesLogged: number;
    personalBests: number;
    heaviestLift: string | null;
    belowBestCount: number;
    recentNotes: string | null;
  };
  trainerizeHistory: { blocks: any[]; notes: any[] };
  ruleTypesById: Map<string, any>;
  complianceLookup: any;
  gpClearance: any;
  sessionsRemaining: number | null;
  sessionsUsed: number | null;
  paymentStatus: string;
  packageType: string | null;
  medicalClearanceStatus: string;
  riskLevel: string;
  annualReviewDueDate: string | null;
  clearanceFrom: string | null;
  specialistName: string | null;
  exerciseModifications: string | null;
  clientStatus: string;
  referralSource: string | null;
  startDate: string | null;
  blockExpiryDate: string | null;
  blockSessionCountMismatch: boolean;
  unpaidBlocks: string[];
  countCompletedSessions: number;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtShortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE — identity only
   ═══════════════════════════════════════════════════════════════════════════ */

function ProfileDrawer({ client, portalAccount, clientNotes }: {
  client: any;
  portalAccount: any;
  clientNotes: any[];
}) {
  const p = client.profile;
  const emergency = p?.emergency_contact;
  const hasEmail = !!client.email;

  return (
    <DrawerShell id="dw-profile" title="Profile" subtitle="Who this client is" width="md">
      {/* Who she is */}
      <div className="fcard acc-rose">
        <div className="fcard-h">Who they are</div>
        <div className="fcard-b">
          <div className="frow">
            <span className="fk">Email</span>
            <span className="fv">
              {hasEmail ? "On file \u2014 documents are delivered to it" : <span className="miss">Not on file.</span>}
            </span>
          </div>
        </div>
        <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
          <p className="miss" style={{ margin: 0 }}>
            {(() => {
              const missing: string[] = [];
              if (!client.phone) missing.push("phone number");
              if (!p?.client?.date_of_birth) missing.push("date of birth");
              if (!client.gender) missing.push("gender");
              return missing.length > 0
                ? `No ${missing.join(", ")} on this record.`
                : "All identity fields filled.";
            })()}
          </p>
        </div>
      </div>

      {/* Emergency contact */}
      <div className="fcard acc-rose">
        <div className="fcard-h">Emergency contact</div>
        <div className="fcard-b pad">
          {emergency?.name ? (
            <div className="fgrid">
              <div className="frow"><span className="fk">Name</span><span className="fv">{emergency.name}</span></div>
              {emergency.relationship && <div className="frow"><span className="fk">Relationship</span><span className="fv">{emergency.relationship}</span></div>}
              {emergency.phone && <div className="frow"><span className="fk">Phone</span><span className="fv">{emergency.phone}</span></div>}
            </div>
          ) : (
            <p className="miss" style={{ margin: 0 }}>Nobody recorded.</p>
          )}
        </div>
      </div>

      {/* Portal */}
      <div className="fcard acc-teal">
        <div className="fcard-h">Portal</div>
        <div className="fcard-b">
          <div className="frow">
            <span className="fk">Account</span>
            <span className="fv">
              {portalAccount
                ? portalAccount.disabled_at
                  ? "Disabled"
                  : portalAccount.last_login_at
                    ? "Active \u2014 last login " + fmtShortDate(portalAccount.last_login_at)
                    : "Invited, not yet logged in"
                : <span className="miss">Not invited.</span>}
            </span>
          </div>
          {portalAccount && !portalAccount.disabled_at && (
            <div className="frow">
              <span className="fk">She can see</span>
              <span className="fv">
                {(() => {
                  const rv = client.resource_visibility;
                  if (!rv || Object.keys(rv).length === 0) return "Default visibility";
                  const allOn = Object.values(rv).every(Boolean);
                  return allOn ? "All resources are switched on" : "Custom visibility";
                })()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Your notes */}
      <div className="fcard acc-ink">
        <div className="fcard-h">Your notes</div>
        <div className="fcard-b pad">
          {(() => {
            const n = client.profile?.notes;
            const hasProfileNotes = n && (n.client_intro || n.esther_observations || n.motivation_notes || n.watch_for);
            const hasClientNotes = clientNotes.length > 0;
            if (!hasProfileNotes && !hasClientNotes) {
              return <p className="miss" style={{ margin: 0 }}>Nothing written down.</p>;
            }
            return (
              <div className="space-y-3">
                {hasProfileNotes && (
                  <div className="space-y-2">
                    {n.client_intro && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-ink)", opacity: 0.5 }}>Client intro</div>
                        <p className="text-[13px] text-[var(--color-ink)] m-0" style={{ whiteSpace: "pre-wrap" }}>{n.client_intro}</p>
                      </div>
                    )}
                    {n.esther_observations && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-ink)", opacity: 0.5 }}>Observations</div>
                        <p className="text-[13px] text-[var(--color-ink)] m-0" style={{ whiteSpace: "pre-wrap" }}>{n.esther_observations}</p>
                      </div>
                    )}
                    {n.motivation_notes && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-ink)", opacity: 0.5 }}>Motivation</div>
                        <p className="text-[13px] text-[var(--color-ink)] m-0" style={{ whiteSpace: "pre-wrap" }}>{n.motivation_notes}</p>
                      </div>
                    )}
                    {n.watch_for && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-ink)", opacity: 0.5 }}>Watch for</div>
                        <p className="text-[13px] text-[var(--color-ink)] m-0" style={{ whiteSpace: "pre-wrap" }}>{n.watch_for}</p>
                      </div>
                    )}
                  </div>
                )}
                {hasClientNotes && (
                  <div className={hasProfileNotes ? "pt-2" : undefined} style={hasProfileNotes ? { borderTop: "1px solid var(--hub-border)" } : undefined}>
                    {clientNotes.slice(0, 5).map((cn: any) => (
                      <p key={cn.id} className="text-[13px] text-[var(--color-ink)] m-0" style={{ whiteSpace: "pre-wrap" }}>{cn.note}</p>
                    ))}
                    {clientNotes.length > 5 && <p className="miss m-0">+{clientNotes.length - 5} more notes.</p>}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Record */}
      <div className="fcard acc-ink">
        <div className="fcard-h">Record</div>
        <div className="fcard-b">
          <div className="fgrid">
            <div className="frow"><span className="fk">Client number</span><span className="fv num">#{client.client_number ?? "\u2014"}</span></div>
            <div className="frow"><span className="fk">Client since</span><span className="fv num">{fmtDate(client.start_date ?? client.created_at)}</span></div>
            {client.referral_source && (
              <div className="frow"><span className="fk">How they found you</span><span className="fv">{client.referral_source}</span></div>
            )}
          </div>
        </div>
        {!client.referral_source && (
          <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
            <p className="miss" style={{ margin: 0 }}>Referral source not captured.</p>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HEALTH — conditions, medications, rules, clearance
   ═══════════════════════════════════════════════════════════════════════════ */

function HealthDrawer({ client, ruleTypesById, gpClearance, medicalClearanceStatus, riskLevel, annualReviewDueDate, clearanceFrom, specialistName, exerciseModifications }: {
  client: any;
  ruleTypesById: Map<string, any>;
  gpClearance: any;
  medicalClearanceStatus: string;
  riskLevel: string;
  annualReviewDueDate: string | null;
  clearanceFrom: string | null;
  specialistName: string | null;
  exerciseModifications: string | null;
}) {
  const p = client.profile;
  const health = p?.health;
  const conditions: string[] = health?.conditions ?? [];
  const medications: any[] = health?.medications ?? [];
  const painPoints: any[] = health?.pain_points ?? [];
  const contraindications: any[] = health?.contraindications ?? [];
  const rules: any[] = p?.programming_adaptations ?? [];

  // GP clearance conflict check: gp_letter_status says one thing, medical_clearance_status another
  const gpConflict = client.gp_letter_status === "not_required" && medicalClearanceStatus === "pending";

  return (
    <DrawerShell id="dw-health" title="Health" subtitle="Body and what it means for training" width="lg">
      {/* GP clearance conflict warning */}
      {gpConflict && (
        <div className="arow" style={{ marginBottom: 12, background: "var(--status-warning-bg)", borderColor: "var(--status-warning-border)" }}>
          <span className="arow-dot warn" />
          <span className="arow-txt">
            GP clearance says <b>Not received</b> and also <b>Not required</b>
            <span className="arow-sub">Two fields disagree. One should go.</span>
          </span>
        </div>
      )}

      {/* Conditions */}
      <div className="fcard acc-rose">
        <div className="fcard-h">Conditions</div>
        <div className="fcard-b pad">
          {conditions.length > 0 ? (
            <div className="tags">
              {conditions.map((c: string, i: number) => (
                <span key={i} className="tag">{c}</span>
              ))}
            </div>
          ) : (
            <p className="miss" style={{ margin: 0 }}>No conditions recorded.</p>
          )}
        </div>
      </div>

      {/* Medication */}
      <div className="fcard acc-rose">
        <div className="fcard-h">Medication</div>
        <div className="fcard-b pad">
          {medications.length > 0 ? (
            <>
              <table className="ptab">
                <thead>
                  <tr><th>Name</th><th>Treats</th><th>Form</th><th>How often</th><th>Since</th></tr>
                </thead>
                <tbody>
                  {medications.map((m: any, i: number) => (
                    <tr key={i}>
                      <td>{m.name}{m.generic_name ? <span className="w"> ({m.generic_name})</span> : null}</td>
                      <td>{m.treats || "\u2014"}</td>
                      <td className="w">{m.form || "Not recorded"}</td>
                      <td className="w">{m.frequency || "Not recorded"}</td>
                      <td className="w">{m.start_date ? fmtShortDate(m.start_date) : "Not recorded"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {medications.some((m: any) => !m.side_effects) && (
                <p className="miss" style={{ margin: "9px 0 0" }}>
                  Side effects have not been filled in for some medications.
                </p>
              )}
            </>
          ) : (
            <p className="miss" style={{ margin: 0 }}>No medications recorded.</p>
          )}
        </div>
      </div>

      {/* Injuries and pain */}
      <div className="fcard acc-rose">
        <div className="fcard-h">Injuries and pain</div>
        <div className="fcard-b pad">
          {painPoints.length > 0 || contraindications.length > 0 ? (
            <div className="tags">
              {painPoints.map((pp: any, i: number) => (
                <span key={`pp-${i}`} className="tag">{pp.body_area ? `${pp.body_area}: ` : ""}{pp.description || pp}</span>
              ))}
              {contraindications.map((c: any, i: number) => (
                <span key={`ci-${i}`} className="tag">{typeof c === "string" ? c : c.description || c}</span>
              ))}
            </div>
          ) : (
            <p className="miss" style={{ margin: 0 }}>No pain points or contraindications recorded.</p>
          )}
        </div>
      </div>

      {/* Training rules */}
      <div className="fcard acc-amber">
        <div className="fcard-h">What this means for training</div>
        <div className="fcard-b pad">
          {rules.length > 0 ? (
            <div className="tags">
              {rules.map((r: any) => {
                const ruleType = ruleTypesById.get(r.rule_type_id);
                return (
                  <span key={r.id} className="tag">
                    {ruleType?.label ? `${ruleType.label} \u2014 ` : ""}{r.detail}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="miss" style={{ margin: 0 }}>No training rules set.</p>
          )}
        </div>
      </div>

      {/* Cleared to train */}
      <div className="fcard acc-teal">
        <div className="fcard-h">Cleared to train</div>
        <div className="fcard-b">
          <div className="fgrid">
            <div className="frow"><span className="fk">Medical clearance</span><span className="fv">{medicalClearanceStatus === "cleared" ? "Cleared" : medicalClearanceStatus === "pending" ? "Pending" : medicalClearanceStatus === "not_required" ? "Not required" : "Not yet requested"}</span></div>
            <div className="frow"><span className="fk">Risk level</span><span className="fv">{riskLevel ? riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) : "\u2014"}</span></div>
            <div className="frow"><span className="fk">GP letter</span><span className="fv">{client.gp_letter_status === "received" ? "Received" : client.gp_letter_status === "requested" ? "Requested" : "Not required"}</span></div>
            <div className="frow"><span className="fk">Annual review</span><span className="fv num">{annualReviewDueDate ? "Due " + fmtDate(annualReviewDueDate) : "Not set"}</span></div>
          </div>
        </div>
        {(clearanceFrom || specialistName || exerciseModifications) && (
          <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
            {clearanceFrom && <div className="frow"><span className="fk">Cleared by</span><span className="fv">{clearanceFrom}{specialistName ? ` (${specialistName})` : ""}</span></div>}
            {exerciseModifications && <div className="frow"><span className="fk">Modifications</span><span className="fv">{exerciseModifications}</span></div>}
          </div>
        )}
        {!clearanceFrom && !specialistName && !exerciseModifications && (
          <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
            <p className="miss" style={{ margin: 0 }}>No GP or specialist named against the clearance.</p>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ARRANGEMENT — how they train, goals, package, kit
   ═══════════════════════════════════════════════════════════════════════════ */

function ArrangementDrawer({ client, latestBlock, bandSetName, missingBandSet, sessionsRemaining, sessionsUsed, paymentStatus, packageType, clientStatus, blockSessionCountMismatch, unpaidBlocks, countCompletedSessions, blockExpiryDate, clientReviews }: {
  client: any;
  latestBlock: DBBlock | null;
  bandSetName: string | null;
  missingBandSet: boolean;
  sessionsRemaining: number | null;
  sessionsUsed: number | null;
  paymentStatus: string;
  packageType: string | null;
  clientStatus: string;
  blockSessionCountMismatch: boolean;
  unpaidBlocks: string[];
  countCompletedSessions: number;
  blockExpiryDate: string | null;
  clientReviews: any[];
}) {
  const p = client.profile;
  const logistics = p?.logistics;
  const goals = p?.goals;
  const equipment: any[] = client.equipment ?? [];

  // "Things to sort" — reuse the same conditions NeedsYouQueue computes
  const thingsToSort: { headline: string; sub?: string }[] = [];

  if (unpaidBlocks.length > 0) {
    thingsToSort.push({ headline: `Unpaid \u2014 ${unpaidBlocks.join(", ")}` });
  }
  if (blockSessionCountMismatch) {
    thingsToSort.push({
      headline: "The two session counts disagree",
      sub: `Typed: ${sessionsUsed ?? 0} used. Counted from completed sessions: ${countCompletedSessions}.`,
    });
  }
  if (missingBandSet) {
    thingsToSort.push({ headline: "No band set chosen, and the current block is a band block" });
  }
  if (client.client_rate == null && latestBlock) {
    thingsToSort.push({ headline: "Rate not set on the record" });
  }

  return (
    <DrawerShell id="dw-arrangement" title="Arrangement" subtitle="What you have agreed" width="lg">
      {/* Things to sort */}
      {thingsToSort.length > 0 && (
        <div className="fcard acc-amber">
          <div className="fcard-h">{thingsToSort.length} thing{thingsToSort.length !== 1 ? "s" : ""} to sort</div>
          <div className="fcard-b">
            {thingsToSort.map((item, i) => (
              <div key={i} className="arow" style={{ padding: "10px 0", borderRadius: 0, border: 0, borderBottom: i < thingsToSort.length - 1 ? "1px solid var(--hub-border)" : undefined }}>
                <span className="arow-dot warn" />
                <span className="arow-txt">
                  {item.headline}
                  {item.sub && <span className="arow-sub">{item.sub}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How they train */}
      <div className="fcard acc-teal">
        <div className="fcard-h">How they train</div>
        <div className="fcard-b">
          <div className="fgrid">
            <div className="frow">
              <span className="fk">Format</span>
              <span className="fv">{client.delivery_mode === "studio_1to1" ? "Studio 1-to-1" : client.delivery_mode === "home_training" ? "Home training" : client.delivery_mode || "\u2014"}</span>
            </div>
            <div className="frow">
              <span className="fk">Where</span>
              <span className="fv">{logistics?.training_location === "studio" ? "The studio" : logistics?.training_location === "home" ? "Home" : logistics?.training_location || "\u2014"}</span>
            </div>
            <div className="frow">
              <span className="fk">How often</span>
              <span className="fv num">{logistics?.frequency?.per_unit ? `${logistics.frequency.per_unit} a ${logistics.frequency.unit}` : logistics?.sessions_per_week ? `${logistics.sessions_per_week} a week` : "\u2014"}</span>
            </div>
            <div className="frow">
              <span className="fk">Session length</span>
              <span className="fv num">{client.session_duration ? `${client.session_duration} min` : "\u2014"}</span>
            </div>
            <div className="frow">
              <span className="fk">Pace</span>
              <span className="fv">{client.pace_mode ? client.pace_mode.charAt(0).toUpperCase() + client.pace_mode.slice(1) : "\u2014"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="fcard acc-teal">
        <div className="fcard-h">Goals</div>
        <div className="fcard-b">
          {goals?.primary ? (
            <div className="frow"><span className="fk">Primary</span><span className="fv">{goals.primary}</span></div>
          ) : (
            <p className="miss" style={{ margin: 0 }}>No goals recorded.</p>
          )}
        </div>
      </div>

      {/* Package and payment */}
      <div className="fcard acc-teal">
        <div className="fcard-h">Package and payment</div>
        <div className="fcard-b">
          <div className="fgrid">
            <div className="frow"><span className="fk">Package</span><span className="fv">{packageType || "\u2014"}</span></div>
            <div className="frow"><span className="fk">Typed on the record</span><span className="fv num">{sessionsUsed ?? 0} used {"\u00b7"} {sessionsRemaining ?? "\u2014"} left</span></div>
            <div className="frow"><span className="fk">Counted from sessions</span><span className="fv num">{countCompletedSessions} completed {blockSessionCountMismatch ? <span className="bdg warn">Does not match</span> : null}</span></div>
            <div className="frow"><span className="fk">Payment</span><span className="fv">{paymentStatus ? paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1) : "\u2014"}</span></div>
            <div className="frow"><span className="fk">Client status</span><span className="fv">{clientStatus ? clientStatus.charAt(0).toUpperCase() + clientStatus.slice(1) : "\u2014"}</span></div>
          </div>
        </div>
        <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
          <p className="miss" style={{ margin: 0 }}>
            {!blockExpiryDate && !client.payment_method
              ? "No block expiry and no payment method set."
              : !blockExpiryDate
                ? "No block expiry set."
                : !client.payment_method
                  ? "No payment method set."
                  : ""}
          </p>
        </div>
      </div>

      {/* Kit and reviews */}
      <div className="fcard acc-ink">
        <div className="fcard-h">Kit and reviews</div>
        <div className="fcard-b">
          <div className="frow">
            <span className="fk">Band set</span>
            <span className="fv">
              {bandSetName
                ? bandSetName
                : <span className="miss" style={{ fontWeight: 400 }}>None chosen{missingBandSet ? ", and the current block is a band block" : ""}.</span>}
            </span>
          </div>
          <div className="frow">
            <span className="fk">Equipment</span>
            <span className="fv">
              {equipment.length > 0
                ? equipment.map((e: any) => typeof e === "string" ? e : e.name).join(", ")
                : <span className="miss" style={{ fontWeight: 400 }}>Nothing listed.</span>}
            </span>
          </div>
          <div className="frow">
            <span className="fk">Reviews</span>
            <span className="fv">
              {clientReviews.length > 0
                ? `${clientReviews.length} recorded`
                : <span className="miss" style={{ fontWeight: 400 }}>None recorded.</span>}
            </span>
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DOCUMENTS — one list of paper with compliance summary
   ═══════════════════════════════════════════════════════════════════════════ */

function DocumentsDrawer({ clientDocuments, legacyDocumentRows, flags, gpClearance, annualReviewDueDate, gpLetterStatus }: {
  clientDocuments: any[];
  legacyDocumentRows: any[];
  flags: ComplianceFlags;
  gpClearance: any;
  annualReviewDueDate: string | null;
  gpLetterStatus: string;
}) {
  const allDocs = [...clientDocuments, ...legacyDocumentRows];
  const signedDocs = allDocs.filter((d) => d.status === "signed");
  const isClear = flags.effectiveStatus === "clear";

  return (
    <DrawerShell id="dw-documents" title="Documents" subtitle={`${allDocs.length} on file \u00b7 ${signedDocs.length} signed`} width="md">
      {/* Cleared to train summary */}
      <div className="fcard acc-teal">
        <div className="fcard-h">Cleared to train</div>
        <div className="fcard-b pad">
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink)" }}>
            {isClear
              ? "All required documents are signed and in date."
              : flags.autoOutstanding.length > 0
                ? `${flags.autoOutstanding.length} thing${flags.autoOutstanding.length !== 1 ? "s" : ""} still needed.`
                : "Check the individual documents below for status."}
            {annualReviewDueDate && ` Her annual review is not due until ${fmtDate(annualReviewDueDate)}.`}
          </p>
          {gpClearance && gpLetterStatus === "not_required" && medicalClearanceIsPending(flags) && (
            <p className="miss" style={{ margin: "7px 0 0" }}>
              GP clearance reads both Not received and Not required.
            </p>
          )}
        </div>
      </div>

      {/* On file */}
      <p className="dw-h">On file</p>
      {allDocs.length > 0 ? (
        allDocs.map((doc: any) => (
          <div key={doc.id} className="drow">
            <span className="drow-m">
              {doc.title || doc.kind}
              <small>
                {doc.status === "signed" ? `Signed${doc.updated_at ? " " + fmtShortDate(doc.updated_at) : doc.created_at ? " " + fmtShortDate(doc.created_at) : ""}` : doc.status}
                {doc.legacy ? " \u00b7 legacy record" : ""}
              </small>
            </span>
            <span className={`bdg ${doc.status === "signed" ? "ok" : doc.status === "superseded" ? "mut" : "warn"}`}>
              {doc.status === "signed" ? "Signed" : doc.status === "superseded" ? "Superseded" : doc.status === "sent" ? "Sent" : "Draft"}
            </span>
          </div>
        ))
      ) : (
        <p className="miss">No documents on file.</p>
      )}
    </DrawerShell>
  );
}

function medicalClearanceIsPending(flags: ComplianceFlags): boolean {
  return flags.autoOutstanding.some((a) => /gp|clearance/i.test(a));
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMMS — updates, tasks, sent history
   ═══════════════════════════════════════════════════════════════════════════ */

function CommsDrawer({ dueInfo, allTaskRows, clientUpdates }: {
  dueInfo: { nextDueDate: string | null; daysUntilDue: number | null; status: string | null };
  allTaskRows: any[];
  clientUpdates: any[];
}) {
  const openTasks = allTaskRows.filter((t) => t.status !== "done");
  const doneTasks = allTaskRows.filter((t) => t.status === "done");
  const recentDone = doneTasks.slice(0, 3);
  const sentUpdates = clientUpdates.filter((u) => u.status === "sent" && u.sent_at);

  return (
    <DrawerShell id="dw-comms" title="Comms" subtitle="Updates and tasks" width="md">
      {/* Next update */}
      {dueInfo.nextDueDate && (
        <div className="fcard acc-amber">
          <div className="fcard-h">Next update</div>
          <div className="fcard-b">
            <div className="frow">
              <span className="fk">Due</span>
              <span className="fv num">
                {fmtDate(dueInfo.nextDueDate)}
                {dueInfo.daysUntilDue != null && dueInfo.daysUntilDue > 0 && (
                  <span className="bdg mut" style={{ marginLeft: 6 }}>in {dueInfo.daysUntilDue} days</span>
                )}
              </span>
            </div>
            <div className="frow">
              <span className="fk">Cadence</span>
              <span className="fv">{dueInfo.status === "overdue" ? "Overdue" : "Scheduled"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="fcard acc-teal">
        <div className="fcard-h">
          {`Tasks \u00b7 ${openTasks.length} open, ${doneTasks.length} done`}
        </div>
        <div className="fcard-b">
          {allTaskRows.length > 0 ? (
            <>
              {openTasks.slice(0, 5).map((t: any) => (
                <div key={t.id} className="frow">
                  <span className="fk num">{fmtShortDate(t.due_date || t.created_at)}</span>
                  <span className="fv">{t.title}</span>
                </div>
              ))}
              {recentDone.map((t: any) => (
                <div key={t.id} className="frow">
                  <span className="fk num">{fmtShortDate(t.due_date || t.created_at)}</span>
                  <span className="fv">{t.title} <span className="bdg ok">Done</span></span>
                </div>
              ))}
              {allTaskRows.length > 8 && (
                <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
                  <p className="miss" style={{ margin: 0 }}>
                    Showing {Math.min(openTasks.length, 5)} open and {recentDone.length} recent done.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="miss">No tasks.</p>
          )}
        </div>
      </div>

      {/* Sent */}
      <div className="fcard acc-ink">
        <div className="fcard-h">Sent</div>
        <div className="fcard-b">
          {sentUpdates.length > 0 ? (
            sentUpdates.slice(0, 5).map((u: any) => (
              <div key={u.id} className="frow">
                <span className="fk num">{fmtShortDate(u.sent_at)}</span>
                <span className="fv">
                  {u.subject || "Update"}
                  {u.opened_at && <span className="bdg ok" style={{ marginLeft: 6 }}>Opened</span>}
                </span>
              </div>
            ))
          ) : (
            <p className="miss">Nothing sent from the hub yet.</p>
          )}
        </div>
      </div>
    </DrawerShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WORKOUT — one session's exercises (opened from block map or block drawer)
   ═══════════════════════════════════════════════════════════════════════════ */

function WorkoutDrawer({ sessions, ruleTypesById }: { sessions: DBSession[]; ruleTypesById: Map<string, any> }) {
  const { selectedSessionId, parentId } = useDrawerManager();
  const session = sessions.find((s) => s.id === selectedSessionId);

  if (!session) {
    return (
      <DrawerShell id="dw-workout" title="Workout" subtitle="Session exercises" width="lg">
        <p className="miss">Select a session to view its exercises.</p>
      </DrawerShell>
    );
  }

  const data = session.data;
  const version = data?.versions?.studio ?? data?.versions?.home;
  const mainBlock: any[] = version?.main_block ?? [];
  const warmUp: any[] = version?.warm_up ?? [];
  const cooldown: any[] = version?.cooldown ?? [];
  const focusLabel = data?.focus_label ?? `Session ${session.session_number}`;
  const blockNumber = (session as any).blocks?.block_number;
  const sessionNumber = session.session_number;

  // Group exercises by group_label (supersets)
  const groupExercises = (exercises: any[]) => {
    const groups: { label: string; items: any[] }[] = [];
    let current: { label: string; items: any[] } | null = null;
    for (const ex of exercises) {
      if (ex.group_label) {
        if (!current || current.label !== ex.group_label) {
          current = { label: ex.group_label, items: [ex] };
          groups.push(current);
        } else {
          current.items.push(ex);
        }
      } else {
        current = null;
        groups.push({ label: "", items: [ex] });
      }
    }
    return groups;
  };

  const formatExercise = (ex: any) => {
    const parts: string[] = [];
    if (ex.sets) parts.push(`${ex.sets} \u00d7`);
    if (ex.reps) parts.push(ex.reps);
    if (ex.load) parts.push(`\u00b7 ${ex.load}`);
    if (ex.rest) parts.push(`\u00b7 ${ex.rest}`);
    return parts.join(" ");
  };

  // Find which training rules apply (simplified: show all rules)
  const rules: any[] = [];

  return (
    <DrawerShell
      id="dw-workout"
      title={focusLabel}
      subtitle={`Block ${blockNumber ?? "\u2014"} \u00b7 session ${sessionNumber ?? "\u2014"}`}
      width="lg"
    >
      {/* Supersets */}
      {mainBlock.length > 0 && groupExercises(mainBlock).map((group, gi) => (
        <div key={gi} className="ss">
          {group.label && (
            <div className="ss-hd">
              <span>{group.label}</span>
              {group.items[0]?.rest && <span className="rest">{group.items[0].rest}</span>}
            </div>
          )}
          {group.items.map((ex: any, ei: number) => (
            <div key={ei} className="ex">
              <span className="ex-l">{group.label ? `${group.label.charAt(0)}${ei + 1}` : `${ei + 1}`}</span>
              <span className="ex-n">{ex.exercise_name}</span>
              <span className="ex-p">{formatExercise(ex)}</span>
            </div>
          ))}
        </div>
      ))}

      {/* Warm-up */}
      {warmUp.length > 0 && (
        <>
          <p className="dw-h">Warm-up</p>
          {warmUp.map((ex: any, i: number) => (
            <div key={i} className="ex">
              <span className="ex-l">{i + 1}</span>
              <span className="ex-n">{ex.exercise_name}</span>
              <span className="ex-p">{formatExercise(ex)}</span>
            </div>
          ))}
        </>
      )}

      {/* Cooldown */}
      {cooldown.length > 0 && (
        <>
          <p className="dw-h">Cooldown</p>
          {cooldown.map((ex: any, i: number) => (
            <div key={i} className="ex">
              <span className="ex-l">{i + 1}</span>
              <span className="ex-n">{ex.exercise_name}</span>
              <span className="ex-p">{formatExercise(ex)}</span>
            </div>
          ))}
        </>
      )}

      {mainBlock.length === 0 && warmUp.length === 0 && cooldown.length === 0 && (
        <p className="miss">No exercises assigned to this session yet.</p>
      )}
    </DrawerShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOCK — every workout in the currently-open block
   ═══════════════════════════════════════════════════════════════════════════ */

function BlockDrawer({ latestBlock, blockSessions, clientNumber }: {
  latestBlock: DBBlock | null;
  blockSessions: DBSession[];
  clientNumber: number;
}) {
  const { openWorkoutDrawer } = useDrawerManager();

  if (!latestBlock) {
    return (
      <DrawerShell id="dw-block" title="Block" subtitle="Every workout in the block" width="md">
        <p className="miss">No active block.</p>
      </DrawerShell>
    );
  }

  // Group sessions by focus_label to show unique workouts
  const workoutMap = new Map<string, { label: string; sessions: DBSession[]; exerciseSummary: string }>();
  for (const s of blockSessions) {
    if ((s as any).parent_session_id) continue;
    const label = s.data?.focus_label ?? `Session ${s.session_number}`;
    const existing = workoutMap.get(label);
    if (existing) {
      existing.sessions.push(s);
    } else {
      // Build a short exercise summary from the first session's main_block
      const version = s.data?.versions?.studio ?? s.data?.versions?.home;
      const exNames = (version?.main_block ?? []).slice(0, 3).map((e: any) => e.exercise_name).join(", ");
      workoutMap.set(label, {
        label,
        sessions: [s],
        exerciseSummary: exNames ? exNames + "\u2026" : "",
      });
    }
  }

  const workouts = Array.from(workoutMap.values());

  return (
    <DrawerShell id="dw-block" title={`Block ${latestBlock.block_number}`} subtitle={`Every workout in the block`} width="md">
      {workouts.map((w, i) => (
        <button
          key={i}
          type="button"
          className="srow"
          onClick={(e) => openWorkoutDrawer(w.sessions[0].id, e.currentTarget)}
        >
          <span className="srow-d">
            {String.fromCharCode(65 + i)}
            <small>{w.sessions.length} session{w.sessions.length !== 1 ? "s" : ""}</small>
          </span>
          <span className="srow-w">
            {w.label}
            {w.exerciseSummary && <small>{w.exerciseSummary}</small>}
          </span>
          <span className="srow-a">
            <span className="btn-link">See exercises</span>
          </span>
        </button>
      ))}
      {workouts.length === 0 && <p className="miss">No sessions in this block yet.</p>}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-[var(--hub-border)]">
        <Link
          href={`/hub/clients/${clientNumber}/blocks/${latestBlock.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] font-[inherit] text-xs font-semibold cursor-pointer transition-colors"
        >
          Manage block →
        </Link>
      </div>
    </DrawerShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESS — per-exercise last/best table
   ═══════════════════════════════════════════════════════════════════════════ */

function ProgressDrawer({ exerciseTrends, exerciseTrendSummary }: {
  exerciseTrends: ExerciseTrend[];
  exerciseTrendSummary?: {
    totalExercisesLogged: number;
    personalBests: number;
    heaviestLift: string | null;
    belowBestCount: number;
    recentNotes: string | null;
  };
}) {
  // Build a table: exercise name, last performed, best
  const rows = exerciseTrends.map((trend) => {
    const pts = trend.points;
    if (!pts || pts.length === 0) return null;
    const last = pts[pts.length - 1];

    // Find best point by metric
    let best = last;
    for (const p of pts) {
      if (trend.metric === "weight" && (p.topWeightKg ?? 0) > (best.topWeightKg ?? 0)) best = p;
      else if (trend.metric === "reps" && (p.maxReps ?? 0) > (best.maxReps ?? 0)) best = p;
      else if (trend.metric === "duration" && (p.maxDurationSeconds ?? 0) > (best.maxDurationSeconds ?? 0)) best = p;
    }

    const formatValue = (pt: any) => {
      if (trend.metric === "weight" && pt.topWeightKg != null) {
        return `${pt.topWeightKg}kg \u00d7 ${pt.repsAtTopWeight ?? "?"}`;
      }
      if (trend.metric === "reps" && pt.maxReps != null) {
        return `${pt.maxReps} reps`;
      }
      if (trend.metric === "duration" && pt.maxDurationSeconds != null) {
        return `${Math.round(pt.maxDurationSeconds)}s`;
      }
      return "\u2014";
    };

    return {
      name: trend.exerciseName,
      lastValue: formatValue(last),
      lastDate: fmtShortDate(last.loggedAt),
      bestValue: formatValue(best),
      bestDate: fmtShortDate(best.loggedAt),
      isBest: last === best || (trend.metric === "weight" && last.topWeightKg === best.topWeightKg && last.repsAtTopWeight === best.repsAtTopWeight),
    };
  }).filter(Boolean);

  return (
    <DrawerShell id="dw-progress" title="Progress" subtitle={`${exerciseTrends.length} exercise${exerciseTrends.length !== 1 ? "s" : ""} logged \u00b7 ${exerciseTrendSummary?.personalBests ?? 0} personal bests`} width="lg">
      {rows.length > 0 ? (
        <table className="ptab">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Last</th>
              <th>When</th>
              <th>Personal best</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row!.name}</td>
                <td className="n">{row!.lastValue}</td>
                <td className="n w">{row!.lastDate}</td>
                <td className="n"><span className={row!.isBest ? "pb" : undefined}>{row!.bestValue}</span></td>
                <td className="n w">{row!.bestDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="miss">No exercise data to show yet.</p>
      )}

      {/* Bests this table cannot show */}
      <p className="dw-h">Bests this table cannot show</p>
      <div className="fcard acc-amber">
        <div className="fcard-h">Band and hand-recorded bests</div>
        <div className="fcard-b pad">
          <p className="miss" style={{ margin: 0 }}>
            No hand-recorded bests and no band bests yet. These sit alongside logged bests and keep your name and note against them.
          </p>
        </div>
      </div>
    </DrawerShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRE-APP — Trainerize import history (read-only)
   ═══════════════════════════════════════════════════════════════════════════ */

function PreAppDrawer({ trainerizeHistory }: { trainerizeHistory: { blocks: any[]; notes: any[] } }) {
  const tBlocks = trainerizeHistory.blocks ?? [];
  const totalSessions = tBlocks.reduce((sum: number, b: any) => sum + (b.workouts?.length ?? 0), 0);

  // Date range
  const allDates: string[] = [];
  for (const b of tBlocks) {
    if (b.start_date) allDates.push(b.start_date);
    if (b.end_date) allDates.push(b.end_date);
  }
  const sortedDates = allDates.sort();
  const periodStart = sortedDates.length > 0 ? sortedDates[0] : null;
  const periodEnd = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  return (
    <DrawerShell id="dw-preapp" title="Before the app" subtitle={`${totalSessions} sessions imported from Trainerize \u00b7 read-only`} width="md">
      {tBlocks.length > 0 ? (
        <>
          <div className="fcard acc-ink">
            <div className="fcard-h">Imported</div>
            <div className="fcard-b">
              <div className="fgrid">
                <div className="frow"><span className="fk">Period</span><span className="fv num">{periodStart && periodEnd ? `${fmtShortDate(periodStart)} \u2013 ${fmtShortDate(periodEnd)}` : "\u2014"}</span></div>
                <div className="frow"><span className="fk">Sessions</span><span className="fv num">{totalSessions}</span></div>
              </div>
            </div>
          </div>

          <p className="dw-h">Sessions</p>
          {tBlocks.map((b: any) => {
            const workoutCount = b.workouts?.length ?? 0;
            return (
              <div key={b.id} className="drow">
                <span className="drow-m">
                  {b.name || `Block`}
                  <small>
                    {b.start_date && b.end_date
                      ? `${fmtShortDate(b.start_date)} \u2013 ${fmtShortDate(b.end_date)}`
                      : b.start_date
                        ? `From ${fmtShortDate(b.start_date)}`
                        : ""}
                    {workoutCount > 0 ? ` \u00b7 ${workoutCount} session${workoutCount !== 1 ? "s" : ""}` : ""}
                  </small>
                </span>
              </div>
            );
          })}

          <p className="miss" style={{ margin: "14px 0 0" }}>
            Imported history cannot be edited and does not count toward the session pot.
          </p>
        </>
      ) : (
        <p className="miss">No Trainerize history imported.</p>
      )}
    </DrawerShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════════════════ */

export function ClientDrawers(props: ClientDrawersProps) {
  return (
    <>
      <ProfileDrawer
        client={props.client}
        portalAccount={props.portalAccount}
        clientNotes={props.clientNotes}
      />
      <HealthDrawer
        client={props.client}
        ruleTypesById={props.ruleTypesById}
        gpClearance={props.gpClearance}
        medicalClearanceStatus={props.medicalClearanceStatus}
        riskLevel={props.riskLevel}
        annualReviewDueDate={props.annualReviewDueDate}
        clearanceFrom={props.clearanceFrom}
        specialistName={props.specialistName}
        exerciseModifications={props.exerciseModifications}
      />
      <ArrangementDrawer
        client={props.client}
        latestBlock={props.latestBlock}
        bandSetName={props.bandSetName}
        missingBandSet={props.missingBandSet}
        sessionsRemaining={props.sessionsRemaining}
        sessionsUsed={props.sessionsUsed}
        paymentStatus={props.paymentStatus}
        packageType={props.packageType}
        clientStatus={props.clientStatus}
        blockSessionCountMismatch={props.blockSessionCountMismatch}
        unpaidBlocks={props.unpaidBlocks}
        countCompletedSessions={props.countCompletedSessions}
        blockExpiryDate={props.blockExpiryDate}
        clientReviews={props.clientReviews}
      />
      <DocumentsDrawer
        clientDocuments={props.clientDocuments}
        legacyDocumentRows={props.legacyDocumentRows}
        flags={props.flags}
        gpClearance={props.gpClearance}
        annualReviewDueDate={props.annualReviewDueDate}
        gpLetterStatus={props.client.gp_letter_status}
      />
      <CommsDrawer
        dueInfo={props.dueInfo}
        allTaskRows={props.allTaskRows}
        clientUpdates={props.clientUpdates}
      />
      <WorkoutDrawer
        sessions={props.sessions}
        ruleTypesById={props.ruleTypesById}
      />
      <BlockDrawer
        latestBlock={props.latestBlock}
        blockSessions={props.blockSessions}
        clientNumber={props.client.client_number}
      />
      <ProgressDrawer
        exerciseTrends={props.exerciseTrends}
        exerciseTrendSummary={props.exerciseTrendSummary}
      />
      <PreAppDrawer
        trainerizeHistory={props.trainerizeHistory}
      />
    </>
  );
}
