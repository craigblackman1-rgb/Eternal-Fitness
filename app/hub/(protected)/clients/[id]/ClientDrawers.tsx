"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DrawerShell, useDrawerManager } from "./DrawerManager";
import { blockDisplayName } from "@/lib/block-name";
import { sessionWorkoutName } from "@/lib/session-display";
import { UpdateIntervalControl } from "./UpdateIntervalControl";
import { ClientTasksPanel } from "./ClientTasksPanel";
import { PortalAccountCard } from "./PortalAccountCard";
import { MergedNotesPanel } from "./MergedNotesPanel";
// components/hub/ClinicalComplianceCard.tsx is deliberately NOT wired in here —
// every field it edits (medical_clearance_status, risk_level,
// exercise_modifications) is already covered by ClearedToTrainCard below;
// adding it too would give those fields a second, out-of-sync editor.
import { GpLetterCard } from "@/components/hub/GpLetterCard";
import { PackagePaymentsCard } from "@/components/hub/PackagePaymentsCard";
import { GracePeriodExtension } from "@/components/hub/GracePeriodExtension";
import type { DBBlock, DBSession, SessionNoteData, PinnedNoteRef } from "@/types";
import type { ExerciseTrend } from "@/lib/progress";
import type { ComplianceFlags } from "@/lib/compliance";
import type { UpdateInterval, UpdateDueInfo } from "@/lib/updates-due";
import type { AggregatedExerciseNote } from "@/lib/exercise-notes";
import type {
  TrainerizeHistoryData,
  TrainerizePerformedWorkoutSummary,
  TrainerizePerformedExerciseDetail,
} from "@/components/hub";

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
  dueInfo: UpdateDueInfo;
  clientId: string;
  updateInterval: UpdateInterval | null;
  updateIntervalWeeks: number | null;
  updateIntervalNextDate: string | null;
  lastSentAt: string | null;
  currentUserName: string | null;
  exerciseTrends: ExerciseTrend[];
  exerciseTrendSummary?: {
    totalExercisesLogged: number;
    personalBests: number;
    heaviestLift: string | null;
    belowBestCount: number;
    recentNotes: string | null;
  };
  trainerizeHistory: TrainerizeHistoryData;
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
  /* Profile drawer merged notes panel (CR-EF-098) */
  sessionNotes: SessionNoteData[];
  exerciseNotes: AggregatedExerciseNote[];
  pinnedNoteRefs: PinnedNoteRef[];
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

function ProfileDrawer({ client, portalAccount, clientNotes, sessionNotes, exerciseNotes, pinnedNoteRefs }: {
  client: any;
  portalAccount: any;
  clientNotes: any[];
  sessionNotes: SessionNoteData[];
  exerciseNotes: AggregatedExerciseNote[];
  pinnedNoteRefs: PinnedNoteRef[];
}) {
  const p = client.profile;
  const emergency = p?.emergency_contact;

  return (
    <DrawerShell id="dw-profile" title="Profile" subtitle="Who this client is" width="md">
      {/* Who she is */}
      <IdentityCard
        clientNumber={client.client_number}
        name={client.name}
        email={client.email}
        phone={client.phone}
        dateOfBirth={p?.client?.date_of_birth ?? null}
        gender={client.gender}
      />

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

      {/* Portal \u2014 live control (reconnect, 5 Sep 2026). Supersedes the old
          read-only "Account / Not invited" fcard: per the project's
          CLAUDE.md, portal accounts can ONLY be created through this
          button, so the dead text used to mean no client could be invited
          at all from anywhere in the app. */}
      <div className="rounded-surface border border-[var(--hub-border)] bg-[var(--hub-card)] px-5 py-4">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-sm font-semibold text-foreground">Portal</span>
          {portalAccount && !portalAccount.disabled_at && (
            <span className="text-xs text-muted-foreground">
              {(() => {
                const rv = client.resource_visibility;
                if (!rv || Object.keys(rv).length === 0) return "Default visibility";
                const allOn = Object.values(rv).every(Boolean);
                return allOn ? "All resources are switched on" : "Custom visibility";
              })()}
            </span>
          )}
        </div>
        <PortalAccountCard clientNumber={client.client_number} hasEmail={!!client.email} />
      </div>

      {/* Your notes \u2014 profile.notes (client_intro / observations / motivation /
          watch_for) is a structured block edited from the full record editor
          (clients/[id]/edit), not by this drawer, so it stays a read-only
          summary here. The freeform quick-capture list below it is now the
          live MergedNotesPanel (CR-EF-098) instead of a static top-5 slice of
          client_notes with no way to add, delete, or see session/exercise
          notes alongside it. */}
      {(() => {
        const n = client.profile?.notes;
        const hasProfileNotes = n && (n.client_intro || n.esther_observations || n.motivation_notes || n.watch_for);
        if (!hasProfileNotes) return null;
        return (
          <div className="fcard acc-ink">
            <div className="fcard-h">From the profile</div>
            <div className="fcard-b pad">
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
            </div>
          </div>
        );
      })()}

      <MergedNotesPanel
        clientId={client.id}
        clientName={client.name}
        sessionNotes={sessionNotes}
        exerciseNotes={exerciseNotes}
        pinnedNoteRefs={pinnedNoteRefs}
      />

      {/* Record */}
      <RecordCard
        clientNumber={client.client_number}
        clientSince={client.start_date ?? client.created_at}
        referralSource={client.referral_source}
      />
    </DrawerShell>
  );
}

/* \u2500\u2500 Editable identity card (Profile drawer) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

function IdentityCard({ clientNumber, name, email, phone, dateOfBirth, gender }: {
  clientNumber: number;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fName, setFName] = useState(name ?? "");
  const [fEmail, setFEmail] = useState(email ?? "");
  const [fPhone, setFPhone] = useState(phone ?? "");
  const [fDob, setFDob] = useState(dateOfBirth ? String(dateOfBirth).slice(0, 10) : "");

  const cancel = () => {
    setFName(name ?? "");
    setFEmail(email ?? "");
    setFPhone(phone ?? "");
    setFDob(dateOfBirth ? String(dateOfBirth).slice(0, 10) : "");
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    if (fName.trim() === "") {
      setError("Name cannot be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fName.trim(),
          email: fEmail.trim() === "" ? null : fEmail.trim(),
          phone: fPhone.trim() === "" ? null : fPhone.trim(),
          date_of_birth: fDob.trim() === "" ? null : fDob,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not save. Nothing has been changed.");
        setSaving(false);
        return;
      }
      setEditing(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Could not save \u2014 check your connection.");
      setSaving(false);
    }
  };

  return (
    <div className="fcard acc-rose">
      <div className="fcard-h">
        Who they are
        {!editing && (
          <button className="btn-link" type="button" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>
      {editing ? (
        <>
          <div className="fcard-b">
            <div className="frow">
              <span className="fk">Name</span>
              <span className="fv"><input className="fld" value={fName} onChange={(e) => setFName(e.target.value)} /></span>
            </div>
            <div className="frow">
              <span className="fk">Email</span>
              <span className="fv"><input className="fld" type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="Not set" /></span>
            </div>
            <div className="frow">
              <span className="fk">Phone</span>
              <span className="fv"><input className="fld" value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="Not set" /></span>
            </div>
            <div className="frow">
              <span className="fk">Date of birth</span>
              <span className="fv"><input className="fld" type="date" value={fDob} onChange={(e) => setFDob(e.target.value)} /></span>
            </div>
          </div>
          {error && (
            <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
              <p className="miss" style={{ margin: 0, color: "var(--status-danger)" }}>{error}</p>
            </div>
          )}
          <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)", display: "flex", gap: 8 }}>
            <button type="button" onClick={cancel} disabled={saving}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] bg-white px-2.5 py-1 min-h-[30px] text-xs font-semibold hover:bg-[var(--hub-hover)] disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-rose text-white px-2.5 py-1 min-h-[30px] text-xs font-semibold hover:bg-rose/90 disabled:opacity-50">
              {saving ? "Saving\u2026" : "Save"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="fcard-b">
            <div className="fgrid">
              <div className="frow"><span className="fk">Name</span><span className="fv">{name}</span></div>
              <div className="frow"><span className="fk">Email</span><span className="fv">{email || <span className="miss" style={{ fontWeight: 400 }}>Not set.</span>}</span></div>
              <div className="frow"><span className="fk">Phone</span><span className="fv">{phone || <span className="miss" style={{ fontWeight: 400 }}>Not set.</span>}</span></div>
              <div className="frow"><span className="fk">Date of birth</span><span className="fv num">{dateOfBirth ? fmtDate(String(dateOfBirth)) : <span className="miss" style={{ fontWeight: 400 }}>Not set.</span>}</span></div>
            </div>
          </div>
          <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
            <p className="miss" style={{ margin: 0 }}>
              {!gender ? "No gender on this record." : "Gender on file."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* \u2500\u2500 Editable record card (Profile drawer \u2014 referral source only; client
   number and client-since are derived/assigned, never editable) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

function RecordCard({ clientNumber, clientSince, referralSource }: {
  clientNumber: number;
  clientSince: string | null;
  referralSource: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fReferral, setFReferral] = useState(referralSource ?? "");

  const cancel = () => {
    setFReferral(referralSource ?? "");
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referral_source: fReferral.trim() === "" ? null : fReferral.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not save. Nothing has been changed.");
        setSaving(false);
        return;
      }
      setEditing(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Could not save \u2014 check your connection.");
      setSaving(false);
    }
  };

  return (
    <div className="fcard acc-ink">
      <div className="fcard-h">
        Record
        {!editing && (
          <button className="btn-link" type="button" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>
      <div className="fcard-b">
        <div className="fgrid">
          <div className="frow"><span className="fk">Client number</span><span className="fv num">#{clientNumber ?? "\u2014"}</span></div>
          <div className="frow"><span className="fk">Client since</span><span className="fv num">{fmtDate(clientSince)}</span></div>
          <div className="frow">
            <span className="fk">How they found you</span>
            <span className="fv">
              {editing ? (
                <input className="fld" value={fReferral} onChange={(e) => setFReferral(e.target.value)} placeholder="Not captured" />
              ) : (
                referralSource || <span className="miss" style={{ fontWeight: 400 }}>Not captured.</span>
              )}
            </span>
          </div>
        </div>
      </div>
      {editing && (
        <>
          {error && (
            <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
              <p className="miss" style={{ margin: 0, color: "var(--status-danger)" }}>{error}</p>
            </div>
          )}
          <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)", display: "flex", gap: 8 }}>
            <button type="button" onClick={cancel} disabled={saving}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] bg-white px-2.5 py-1 min-h-[30px] text-xs font-semibold hover:bg-[var(--hub-hover)] disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-rose text-white px-2.5 py-1 min-h-[30px] text-xs font-semibold hover:bg-rose/90 disabled:opacity-50">
              {saving ? "Saving\u2026" : "Save"}
            </button>
          </div>
        </>
      )}
    </div>
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
      <ClearedToTrainCard
        clientNumber={client.client_number}
        medicalClearanceStatus={medicalClearanceStatus}
        riskLevel={riskLevel}
        gpLetterStatus={client.gp_letter_status}
        annualReviewDueDate={annualReviewDueDate}
        clearanceFrom={clearanceFrom}
        specialistName={specialistName}
        exerciseModifications={exerciseModifications}
      />

      {/* GP letter dates — live control (reconnect, 5 Sep 2026). The status
          field above is edited by ClearedToTrainCard; this card only adds
          the requested/received dates, which had no editor anywhere in the
          app until now (the two columns were deliberately excluded from the
          PATCH allow-list until a UI actually wrote them — see route.ts). */}
      <div className="fcard acc-teal">
        <div className="fcard-h">GP letter dates</div>
        <div className="fcard-b pad">
          <GpLetterCard
            clientId={client.id}
            gpLetterStatus={client.gp_letter_status}
            requestedDate={client.gp_letter_requested_date ?? null}
            receivedDate={client.gp_letter_received_date ?? null}
          />
        </div>
      </div>
    </DrawerShell>
  );
}

/* \u2500\u2500 Editable "cleared to train" card (Health drawer) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

const MEDICAL_CLEARANCE_OPTIONS = [
  { value: "not_yet_requested", label: "Not yet requested" },
  { value: "pending", label: "Pending" },
  { value: "cleared", label: "Cleared" },
  { value: "not_required", label: "Not required" },
];
const RISK_LEVEL_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const GP_LETTER_OPTIONS = [
  { value: "not_required", label: "Not required" },
  { value: "requested", label: "Requested" },
  { value: "received", label: "Received" },
];

function ClearedToTrainCard({
  clientNumber,
  medicalClearanceStatus,
  riskLevel,
  gpLetterStatus,
  annualReviewDueDate,
  clearanceFrom,
  specialistName,
  exerciseModifications,
}: {
  clientNumber: number;
  medicalClearanceStatus: string;
  riskLevel: string;
  gpLetterStatus: string;
  annualReviewDueDate: string | null;
  clearanceFrom: string | null;
  specialistName: string | null;
  exerciseModifications: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fMedical, setFMedical] = useState(medicalClearanceStatus || "not_yet_requested");
  const [fRisk, setFRisk] = useState(riskLevel || "low");
  const [fGp, setFGp] = useState(gpLetterStatus || "not_required");
  const [fAnnual, setFAnnual] = useState(annualReviewDueDate ? String(annualReviewDueDate).slice(0, 10) : "");
  const [fClearanceFrom, setFClearanceFrom] = useState(clearanceFrom ?? "");
  const [fSpecialist, setFSpecialist] = useState(specialistName ?? "");
  const [fMods, setFMods] = useState(exerciseModifications ?? "");

  const cancel = () => {
    setFMedical(medicalClearanceStatus || "not_yet_requested");
    setFRisk(riskLevel || "low");
    setFGp(gpLetterStatus || "not_required");
    setFAnnual(annualReviewDueDate ? String(annualReviewDueDate).slice(0, 10) : "");
    setFClearanceFrom(clearanceFrom ?? "");
    setFSpecialist(specialistName ?? "");
    setFMods(exerciseModifications ?? "");
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medical_clearance_status: fMedical,
          risk_level: fRisk,
          gp_letter_status: fGp,
          annual_review_due_date: fAnnual.trim() === "" ? null : fAnnual,
          clearance_from: fClearanceFrom.trim() === "" ? null : fClearanceFrom.trim(),
          specialist_name: fSpecialist.trim() === "" ? null : fSpecialist.trim(),
          exercise_modifications: fMods.trim() === "" ? null : fMods.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not save. Nothing has been changed.");
        setSaving(false);
        return;
      }
      setEditing(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Could not save \u2014 check your connection.");
      setSaving(false);
    }
  };

  return (
    <div className="fcard acc-teal">
      <div className="fcard-h">
        Cleared to train
        {!editing && (
          <button className="btn-link" type="button" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>

      {editing ? (
        <>
          <div className="fcard-b">
            <div className="frow">
              <span className="fk">Medical clearance</span>
              <span className="fv">
                <select className="fld" value={fMedical} onChange={(e) => setFMedical(e.target.value)}>
                  {MEDICAL_CLEARANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </span>
            </div>
            <div className="frow">
              <span className="fk">Risk level</span>
              <span className="fv">
                <select className="fld" value={fRisk} onChange={(e) => setFRisk(e.target.value)}>
                  {RISK_LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </span>
            </div>
            <div className="frow">
              <span className="fk">GP letter</span>
              <span className="fv">
                <select className="fld" value={fGp} onChange={(e) => setFGp(e.target.value)}>
                  {GP_LETTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </span>
            </div>
            <div className="frow">
              <span className="fk">Annual review</span>
              <span className="fv"><input className="fld" type="date" value={fAnnual} onChange={(e) => setFAnnual(e.target.value)} /></span>
            </div>
            <div className="frow">
              <span className="fk">Cleared by</span>
              <span className="fv"><input className="fld" value={fClearanceFrom} onChange={(e) => setFClearanceFrom(e.target.value)} placeholder="e.g. GP" /></span>
            </div>
            <div className="frow">
              <span className="fk">Specialist</span>
              <span className="fv"><input className="fld" value={fSpecialist} onChange={(e) => setFSpecialist(e.target.value)} placeholder="Not set" /></span>
            </div>
            <div className="frow">
              <span className="fk">Modifications</span>
              <span className="fv"><input className="fld" value={fMods} onChange={(e) => setFMods(e.target.value)} placeholder="Not set" /></span>
            </div>
          </div>
          {error && (
            <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
              <p className="miss" style={{ margin: 0, color: "var(--status-danger)" }}>{error}</p>
            </div>
          )}
          <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)", display: "flex", gap: 8 }}>
            <button type="button" onClick={cancel} disabled={saving}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] bg-white px-2.5 py-1 min-h-[30px] text-xs font-semibold hover:bg-[var(--hub-hover)] disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-rose text-white px-2.5 py-1 min-h-[30px] text-xs font-semibold hover:bg-rose/90 disabled:opacity-50">
              {saving ? "Saving\u2026" : "Save"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="fcard-b">
            <div className="fgrid">
              <div className="frow"><span className="fk">Medical clearance</span><span className="fv">{medicalClearanceStatus === "cleared" ? "Cleared" : medicalClearanceStatus === "pending" ? "Pending" : medicalClearanceStatus === "not_required" ? "Not required" : "Not yet requested"}</span></div>
              <div className="frow"><span className="fk">Risk level</span><span className="fv">{riskLevel ? riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) : "\u2014"}</span></div>
              <div className="frow"><span className="fk">GP letter</span><span className="fv">{gpLetterStatus === "received" ? "Received" : gpLetterStatus === "requested" ? "Requested" : "Not required"}</span></div>
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
        </>
      )}
    </div>
  );
}

/* ── Editable "how they train" card (Arrangement drawer) — format, session
   length and pace are plain columns and become fields; where/how-often live
   in the nested `profile.logistics` blob (not extended by this lane) and
   stay read-only. ────────────────────────────────────────────────────────── */

const DELIVERY_MODE_OPTIONS = [
  { value: "studio_1to1", label: "Studio 1-to-1" },
  { value: "home_training", label: "Home training" },
];
const PACE_MODE_OPTIONS = [
  { value: "fast", label: "Fast" },
  { value: "medium", label: "Medium" },
  { value: "slow", label: "Slow" },
];

function HowTheyTrainCard({
  clientNumber,
  deliveryMode,
  trainingLocation,
  frequencyLabel,
  sessionDuration,
  paceMode,
}: {
  clientNumber: number;
  deliveryMode: string;
  trainingLocation: string | null;
  frequencyLabel: string | null;
  sessionDuration: number | null;
  paceMode: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fDelivery, setFDelivery] = useState(deliveryMode || "studio_1to1");
  const [fDuration, setFDuration] = useState(sessionDuration == null ? "" : String(sessionDuration));
  const [fPace, setFPace] = useState(paceMode || "medium");

  const cancel = () => {
    setFDelivery(deliveryMode || "studio_1to1");
    setFDuration(sessionDuration == null ? "" : String(sessionDuration));
    setFPace(paceMode || "medium");
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    if (fDuration.trim() !== "" && (Number.isNaN(Number(fDuration)) || Number(fDuration) <= 0)) {
      setError("Session length must be a number of minutes.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_mode: fDelivery,
          session_duration: fDuration.trim() === "" ? null : Number(fDuration),
          pace_mode: fPace,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not save. Nothing has been changed.");
        setSaving(false);
        return;
      }
      setEditing(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Could not save — check your connection.");
      setSaving(false);
    }
  };

  return (
    <div className="fcard acc-teal">
      <div className="fcard-h">
        How they train
        {!editing && (
          <button className="btn-link" type="button" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>
      <div className="fcard-b">
        <div className="fgrid">
          <div className="frow">
            <span className="fk">Format</span>
            <span className="fv">
              {editing ? (
                <select className="fld" value={fDelivery} onChange={(e) => setFDelivery(e.target.value)}>
                  {DELIVERY_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                deliveryMode === "studio_1to1" ? "Studio 1-to-1" : deliveryMode === "home_training" ? "Home training" : deliveryMode || "—"
              )}
            </span>
          </div>
          <div className="frow">
            <span className="fk">Where</span>
            <span className="fv">{trainingLocation === "studio" ? "The studio" : trainingLocation === "home" ? "Home" : trainingLocation || "—"}</span>
          </div>
          <div className="frow">
            <span className="fk">How often</span>
            <span className="fv num">{frequencyLabel || "—"}</span>
          </div>
          <div className="frow">
            <span className="fk">Session length</span>
            <span className="fv num">
              {editing ? (
                <input className="fld" value={fDuration} onChange={(e) => setFDuration(e.target.value)} inputMode="numeric" placeholder="Minutes" />
              ) : (
                sessionDuration ? `${sessionDuration} min` : "—"
              )}
            </span>
          </div>
          <div className="frow">
            <span className="fk">Pace</span>
            <span className="fv">
              {editing ? (
                <select className="fld" value={fPace} onChange={(e) => setFPace(e.target.value)}>
                  {PACE_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                paceMode ? paceMode.charAt(0).toUpperCase() + paceMode.slice(1) : "—"
              )}
            </span>
          </div>
        </div>
      </div>
      {editing && (
        <>
          {error && (
            <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
              <p className="miss" style={{ margin: 0, color: "var(--status-danger)" }}>{error}</p>
            </div>
          )}
          <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)", display: "flex", gap: 8 }}>
            <button type="button" onClick={cancel} disabled={saving}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] bg-white px-2.5 py-1 min-h-[30px] text-xs font-semibold hover:bg-[var(--hub-hover)] disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-rose text-white px-2.5 py-1 min-h-[30px] text-xs font-semibold hover:bg-rose/90 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Editable goals card (Arrangement drawer) — `goals.primary` lives nested
   inside `profile`; the PATCH route was extended (see route.ts) to merge a
   `goals_primary` key into that blob without touching the rest of it. ───── */

function GoalsCard({ clientNumber, primary }: { clientNumber: number; primary: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fPrimary, setFPrimary] = useState(primary ?? "");

  const cancel = () => {
    setFPrimary(primary ?? "");
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals_primary: fPrimary.trim() === "" ? null : fPrimary.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Could not save. Nothing has been changed.");
        setSaving(false);
        return;
      }
      setEditing(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Could not save — check your connection.");
      setSaving(false);
    }
  };

  return (
    <div className="fcard acc-teal">
      <div className="fcard-h">
        Goals
        {!editing && (
          <button className="btn-link" type="button" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>
      <div className="fcard-b">
        {editing ? (
          <div className="frow">
            <span className="fk">Primary</span>
            <span className="fv"><input className="fld" value={fPrimary} onChange={(e) => setFPrimary(e.target.value)} placeholder="Not set" /></span>
          </div>
        ) : primary ? (
          <div className="frow"><span className="fk">Primary</span><span className="fv">{primary}</span></div>
        ) : (
          <p className="miss" style={{ margin: 0 }}>No goals recorded.</p>
        )}
      </div>
      {editing && (
        <>
          {error && (
            <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)" }}>
              <p className="miss" style={{ margin: 0, color: "var(--status-danger)" }}>{error}</p>
            </div>
          )}
          <div className="fcard-b pad" style={{ borderTop: "1px solid var(--hub-border)", display: "flex", gap: 8 }}>
            <button type="button" onClick={cancel} disabled={saving}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--hub-border)] bg-white px-2.5 py-1 min-h-[30px] text-xs font-semibold hover:bg-[var(--hub-hover)] disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-rose text-white px-2.5 py-1 min-h-[30px] text-xs font-semibold hover:bg-rose/90 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}
    </div>
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
      <HowTheyTrainCard
        clientNumber={client.client_number}
        deliveryMode={client.delivery_mode}
        trainingLocation={logistics?.training_location ?? null}
        frequencyLabel={logistics?.frequency?.per_unit ? `${logistics.frequency.per_unit} a ${logistics.frequency.unit}` : logistics?.sessions_per_week ? `${logistics.sessions_per_week} a week` : null}
        sessionDuration={client.session_duration ?? null}
        paceMode={client.pace_mode}
      />

      {/* Goals */}
      <GoalsCard clientNumber={client.client_number} primary={goals?.primary ?? null} />

      {/* Package & payments — live control (reconnect, 5 Sep 2026). Replaces
          the inline PackageCard added earlier the same day: that card only
          covered package/rate/expiry/sessions-remaining, where this one is a
          superset (sessions purchased/used, payment method/status, client
          status, referral source too) and was the more complete of the two,
          so it's kept and PackageCard is deleted rather than run alongside
          it. Block expiry is excluded from its edit form on purpose — see
          GracePeriodExtension immediately below, which is the sole editor
          for that field so it stays audited. */}
      <PackagePaymentsCard
        clientId={client.id}
        initial={{
          package_type: packageType,
          sessions_purchased: client.sessions_purchased ?? null,
          sessions_used: sessionsUsed,
          sessions_remaining: sessionsRemaining,
          session_duration: client.session_duration ?? null,
          client_rate: client.client_rate ?? null,
          payment_method: client.payment_method ?? null,
          payment_status: paymentStatus as import("@/types").PaymentStatus,
          client_status: clientStatus as import("@/types").ClientStatus,
          block_expiry_date: blockExpiryDate,
        }}
      />

      {/* Block expiry — the sole editor for block_expiry_date, so grace-period
          extensions stay audited (from/to/reason/when) rather than a plain
          date field anyone could silently overwrite. */}
      <GracePeriodExtension
        clientId={client.id}
        currentExpiry={blockExpiryDate}
        extensions={client.block_expiry_extensions ?? []}
      />

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
              {equipment.length > 0 ? (
                /* Chips, not a comma list: what she can reach is a set of
                   discrete constraints on what may be prescribed, and it
                   matters most for a home client with no studio rack. */
                <span className="tags">
                  {equipment.map((e: any, i: number) => {
                    const name = typeof e === "string" ? e : e?.name;
                    const detail = typeof e === "string" ? null : e?.detail;
                    if (!name) return null;
                    return (
                      <span key={`${name}-${i}`} className="tag">
                        {name}
                        {detail ? ` · ${detail}` : ""}
                      </span>
                    );
                  })}
                </span>
              ) : (
                <span className="miss" style={{ fontWeight: 400 }}>
                  Nothing listed, so plans are not constrained by what they can reach.
                </span>
              )}
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

function DocumentsDrawer({ clientNumber, clientDocuments, legacyDocumentRows, flags, gpClearance, annualReviewDueDate, gpLetterStatus }: {
  clientNumber: number;
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
      {/* The drawer listed documents but carried no action at all, and the full
          per-client documents page was unreachable from anywhere in the app.
          Found in the post-update route audit, 5 Sep 2026. */}
      <div className="flex items-center gap-2 flex-wrap pb-3">
        <Link
          href={`/hub/clients/${clientNumber}/documents`}
          className="inline-flex items-center justify-center rounded-control border border-[var(--hub-field-border)] bg-white px-2.5 py-1 min-h-[30px] text-xs font-semibold text-foreground no-underline hover:bg-[var(--hub-hover)] transition-colors"
        >
          Send or manage documents
        </Link>
      </div>
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
          <Link
            key={doc.id}
            href={`/hub/clients/${clientNumber}/documents/${doc.id}`}
            className="drow no-underline hover:bg-[var(--hub-hover)] transition-colors rounded-nested"
          >
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
          </Link>
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

function CommsDrawer({
  clientId,
  clientNumber,
  dueInfo,
  allTaskRows,
  clientUpdates,
  updateInterval,
  updateIntervalWeeks,
  updateIntervalNextDate,
  lastSentAt,
  currentUserName,
}: {
  clientId: string;
  clientNumber: number;
  dueInfo: UpdateDueInfo;
  allTaskRows: any[];
  clientUpdates: any[];
  updateInterval: UpdateInterval | null;
  updateIntervalWeeks: number | null;
  updateIntervalNextDate: string | null;
  lastSentAt: string | null;
  currentUserName: string | null;
}) {
  const sentUpdates = clientUpdates.filter((u) => u.status === "sent" && u.sent_at);

  return (
    <DrawerShell id="dw-comms" title="Comms" subtitle="Updates and tasks" width="md">
      {/* The V3 client record shipped with no way to send an update at all: the
          only "Write an update" action lived in the Needs You queue, gated to
          home-training clients who had gone quiet, so it never appeared for a
          studio client. Raised by Craig, 5 Sep 2026. */}
      <div className="flex items-center gap-2 flex-wrap pb-3">
        <Link
          href={`/hub/clients/${clientNumber}/updates/new`}
          className="inline-flex items-center justify-center rounded-control border border-[var(--hub-field-border)] bg-white px-2.5 py-1 min-h-[30px] text-xs font-semibold text-foreground no-underline hover:bg-[var(--hub-hover)] transition-colors"
        >
          Write an update
        </Link>
        <Link
          href={`/hub/clients/${clientNumber}/updates`}
          className="text-xs font-semibold text-[var(--color-rose)] no-underline hover:underline underline-offset-2"
        >
          See every update sent
        </Link>
      </div>
      {/* Next update \u2014 live control (CR-EF-073), supersedes the old read-only
          Due/Cadence fcard: setting the cadence belongs beside the updates
          it schedules. */}
      <div className="rounded-surface border border-[var(--hub-border)] bg-[var(--hub-card)] px-5 py-4">
        <UpdateIntervalControl
          clientNumber={clientNumber}
          updateInterval={updateInterval}
          updateIntervalWeeks={updateIntervalWeeks}
          updateIntervalNextDate={updateIntervalNextDate}
          dueInfo={dueInfo}
        />
      </div>

      {/* Tasks \u2014 live add/complete control, supersedes the old read-only
          task fcard. */}
      <ClientTasksPanel
        clientId={clientId}
        clientNumber={clientNumber}
        updateInterval={updateInterval}
        dueInfo={dueInfo}
        lastSentAt={lastSentAt}
        currentUserName={currentUserName}
      />

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
  const focusLabel = sessionWorkoutName(session, `Session ${session.session_number}`);
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

  // Group sessions by resolved workout name (CR-EF-115's sessionWorkoutName \u2014
  // the same helper the block map on this screen already uses) so Outlook
  // placeholder sessions collapse into "No workout assigned yet" here too,
  // instead of a raw "Outlook booking \u2014 <name>" label masquerading as a real
  // workout (BUG raised by Craig, 5 Sep 2026: the drawer contradicted the map).
  const NO_WORKOUT_LABEL = "No workout assigned yet";
  const workoutMap = new Map<string, { label: string; sessions: DBSession[]; exerciseSummary: string }>();
  for (const s of blockSessions) {
    if ((s as any).parent_session_id) continue;
    const label = sessionWorkoutName(s, `Session ${s.session_number}`);
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

  // Real workouts keep their existing order and get A/B/C letters; the
  // unassigned group (if any) is listed last, ungrouped from the lettering,
  // so Esther still sees how many sessions still need a workout without it
  // reading as one more real workout.
  const allWorkouts = Array.from(workoutMap.values());
  const workouts = allWorkouts.filter((w) => w.label !== NO_WORKOUT_LABEL);
  const unassigned = allWorkouts.find((w) => w.label === NO_WORKOUT_LABEL) ?? null;

  return (
    <DrawerShell
      id="dw-block"
      title={blockDisplayName(latestBlock, blockSessions, blockSessions.filter((s) => !(s as any).parent_session_id).length)}
      subtitle={`Every workout in the block`}
      width="md"
    >
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

      {unassigned && (
        <button
          type="button"
          className="srow"
          onClick={(e) => openWorkoutDrawer(unassigned.sessions[0].id, e.currentTarget)}
        >
          <span className="srow-d">
            <small>{unassigned.sessions.length} session{unassigned.sessions.length !== 1 ? "s" : ""}</small>
          </span>
          <span className="srow-w">
            {NO_WORKOUT_LABEL}
          </span>
          <span className="srow-a">
            <span className="btn-link">See sessions</span>
          </span>
        </button>
      )}

      {workouts.length === 0 && !unassigned && <p className="miss">No sessions in this block yet.</p>}

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

function sourceLabel(source: string): string {
  switch (source) {
    case "message": return "Message";
    case "attention": return "Attention flag";
    case "program_instruction": return "Block note";
    case "workout_instruction": return "Workout note";
    default: return source;
  }
}

/** One logged workout row inside an expanded block (or the "Outside any
 * block" bucket) \u2014 collapsed to a summary line until clicked, at which point
 * it lazy-fetches the real per-set detail so the drawer never has to hold
 * (or render) every set for every workout at once. */
function PerformedWorkoutRow({
  workout,
  clientNumber,
  isOpen,
  onToggle,
  detail,
}: {
  workout: TrainerizePerformedWorkoutSummary;
  clientNumber: number;
  isOpen: boolean;
  onToggle: () => void;
  detail: TrainerizePerformedExerciseDetail[] | "loading" | "error" | undefined;
}) {
  const exerciseCount = workout.exercises.length;
  return (
    <div>
      <button type="button" className="srow" style={{ paddingLeft: 30 }} onClick={onToggle}>
        <span className="srow-d" style={{ width: 18, fontSize: 12 }}>{isOpen ? "\u25be" : "\u25b8"}</span>
        <span className="srow-w">
          {workout.workoutName || "Workout"}
          <small>
            {fmtShortDate(workout.performedDate)} \u00b7 {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} \u00b7 {workout.setCount} set{workout.setCount !== 1 ? "s" : ""}
          </small>
        </span>
      </button>
      {isOpen && (
        <div className="fcard-b pad rounded-control-sm" style={{ background: "var(--hub-hover)", borderBottom: "1px solid var(--hub-border)", marginLeft: 18 }}>
          {detail === "loading" && <p className="miss" style={{ margin: 0 }}>Loading sets\u2026</p>}
          {detail === "error" && <p className="miss" style={{ margin: 0 }}>Couldn&rsquo;t load this workout&rsquo;s sets.</p>}
          {Array.isArray(detail) && detail.length === 0 && (
            <p className="miss" style={{ margin: 0 }}>No sets recorded for this workout.</p>
          )}
          {Array.isArray(detail) && detail.map((ex, i) => (
            <div key={i} style={{ marginBottom: i < detail.length - 1 ? 10 : 0 }}>
              <p className="fk" style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--color-ink)" }}>{ex.name}</p>
              <table className="ptab">
                <thead>
                  <tr><th>Set</th><th>Reps</th><th>Weight</th><th>RPE</th></tr>
                </thead>
                <tbody>
                  {ex.sets.map((s, si) => (
                    <tr key={si}>
                      <td className="n">{s.setNumber}</td>
                      <td className="n">{s.reps ?? "\u2014"}</td>
                      <td className="n">{s.weightKg != null ? `${s.weightKg}kg` : "\u2014"}</td>
                      <td className="n">{s.rpe ?? "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PreAppDrawer({ trainerizeHistory, clientNumber }: { trainerizeHistory: TrainerizeHistoryData; clientNumber: number }) {
  const tBlocks = trainerizeHistory.blocks ?? [];
  const unmatched = trainerizeHistory.unmatchedPerformedWorkouts ?? [];
  const notes = trainerizeHistory.notes ?? [];

  // "Sessions" is the count of workouts Esther's clients actually logged
  // (trainerize_workout_results), not the number of prescribed workout
  // templates in the program \u2014 the two can differ, and the real count is
  // what matters for "has this client got a history to review".
  const totalSessions = tBlocks.reduce((sum, b) => sum + (b.performedWorkouts?.length ?? 0), 0) + unmatched.length;
  const hasHistory = tBlocks.length > 0 || unmatched.length > 0 || notes.length > 0;

  const allDates: string[] = [];
  for (const b of tBlocks) {
    if (b.start_date) allDates.push(b.start_date);
    if (b.end_date) allDates.push(b.end_date);
  }
  for (const w of unmatched) if (w.performedDate) allDates.push(w.performedDate);
  const sortedDates = allDates.sort();
  const periodStart = sortedDates.length > 0 ? sortedDates[0] : null;
  const periodEnd = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [detailCache, setDetailCache] = useState<Record<string, TrainerizePerformedExerciseDetail[] | "loading" | "error">>({});

  const toggleWorkout = (workoutId: string) => {
    if (expandedWorkoutId === workoutId) {
      setExpandedWorkoutId(null);
      return;
    }
    setExpandedWorkoutId(workoutId);
    if (detailCache[workoutId]) return;
    setDetailCache((c) => ({ ...c, [workoutId]: "loading" }));
    fetch(`/api/clients/${clientNumber}/trainerize-workout/${workoutId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then((json) => setDetailCache((c) => ({ ...c, [workoutId]: json.exercises ?? [] })))
      .catch(() => setDetailCache((c) => ({ ...c, [workoutId]: "error" })));
  };

  const renderPerformedList = (workouts: TrainerizePerformedWorkoutSummary[]) =>
    workouts.map((w) => (
      <PerformedWorkoutRow
        key={w.id}
        workout={w}
        clientNumber={clientNumber}
        isOpen={expandedWorkoutId === w.id}
        onToggle={() => toggleWorkout(w.id)}
        detail={detailCache[w.id]}
      />
    ));

  return (
    <DrawerShell id="dw-preapp" title="Before the app" subtitle={`${totalSessions} session${totalSessions !== 1 ? "s" : ""} imported from Trainerize \u00b7 read-only`} width="md">
      {hasHistory ? (
        <>
          <div className="fcard acc-ink">
            <div className="fcard-h">Imported</div>
            <div className="fcard-b">
              <div className="fgrid">
                <div className="frow"><span className="fk">Period</span><span className="fv num">{periodStart && periodEnd ? `${fmtShortDate(periodStart)} \u2013 ${fmtShortDate(periodEnd)}` : "\u2014"}</span></div>
                <div className="frow"><span className="fk">Blocks</span><span className="fv num">{tBlocks.length}</span></div>
                <div className="frow"><span className="fk">Sessions</span><span className="fv num">{totalSessions}</span></div>
                <div className="frow"><span className="fk">Notes</span><span className="fv num">{notes.length}</span></div>
              </div>
            </div>
          </div>

          {tBlocks.length > 0 && (
            <>
              <p className="dw-h">Training blocks \u2014 tap to see sessions</p>
              {tBlocks.map((b) => {
                const isOpen = expandedBlockId === b.id;
                const performed = b.performedWorkouts ?? [];
                return (
                  <div key={b.id}>
                    <button
                      type="button"
                      className="srow"
                      onClick={() => setExpandedBlockId(isOpen ? null : b.id)}
                    >
                      <span className="srow-d" style={{ width: 18, fontSize: 13 }}>{isOpen ? "\u25be" : "\u25b8"}</span>
                      <span className="srow-w">
                        {b.phase_name || "Block"}
                        <small>
                          {b.start_date && b.end_date
                            ? `${fmtShortDate(b.start_date)} \u2013 ${fmtShortDate(b.end_date)}`
                            : b.start_date
                              ? `From ${fmtShortDate(b.start_date)}`
                              : "Not dated"}
                          {" \u00b7 "}
                          {performed.length > 0 ? `${performed.length} session${performed.length !== 1 ? "s" : ""} performed` : "no sessions logged"}
                        </small>
                      </span>
                    </button>
                    {isOpen && (
                      performed.length > 0
                        ? renderPerformedList(performed)
                        : <p className="miss" style={{ padding: "10px 0 10px 30px", margin: 0 }}>No logged sessions fell inside this block&rsquo;s dates.</p>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {unmatched.length > 0 && (
            <>
              <p className="dw-h">Outside any block</p>
              <p className="miss" style={{ margin: "0 0 8px" }}>
                {unmatched.length} logged session{unmatched.length !== 1 ? "s" : ""} from before this client&rsquo;s first imported block.
              </p>
              {renderPerformedList(unmatched)}
            </>
          )}

          <button
            type="button"
            className="dw-h"
            style={{ background: "none", border: 0, padding: 0, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, font: "inherit" }}
            onClick={() => setNotesOpen((v) => !v)}
          >
            <span style={{ fontSize: 11 }}>{notesOpen ? "\u25be" : "\u25b8"}</span>
            Notes ({notes.length})
          </button>
          {notesOpen && (
            notes.length > 0 ? (
              notes.map((n) => (
                <div key={n.id} className="drow">
                  <span className="drow-m">
                    {sourceLabel(n.source)}{n.sender_name ? ` \u00b7 ${n.sender_name}` : ""}
                    <small style={{ whiteSpace: "pre-wrap" }}>{n.content}</small>
                  </span>
                  <span className="fk num" style={{ minWidth: 0, flexShrink: 0 }}>{fmtShortDate(n.source_date)}</span>
                </div>
              ))
            ) : (
              <p className="miss">No notes or messages imported.</p>
            )
          )}

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
        sessionNotes={props.sessionNotes}
        exerciseNotes={props.exerciseNotes}
        pinnedNoteRefs={props.pinnedNoteRefs}
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
        clientNumber={props.client.client_number}
        clientDocuments={props.clientDocuments}
        legacyDocumentRows={props.legacyDocumentRows}
        flags={props.flags}
        gpClearance={props.gpClearance}
        annualReviewDueDate={props.annualReviewDueDate}
        gpLetterStatus={props.client.gp_letter_status}
      />
      <CommsDrawer
        clientId={props.clientId}
        clientNumber={props.client.client_number}
        dueInfo={props.dueInfo}
        allTaskRows={props.allTaskRows}
        clientUpdates={props.clientUpdates}
        updateInterval={props.updateInterval}
        updateIntervalWeeks={props.updateIntervalWeeks}
        updateIntervalNextDate={props.updateIntervalNextDate}
        lastSentAt={props.lastSentAt}
        currentUserName={props.currentUserName}
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
        clientNumber={props.client.client_number}
      />
    </>
  );
}
