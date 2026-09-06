"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  IconPlus,
  IconX,
  IconAlertTriangle,
  IconCheck,
  IconCheckCircle,
} from "@/components/icons";

interface SupplementaryRow {
  id: string;
  workout_template_id: string;
  template_name: string;
  added_at: string;
  added_by: string | null;
  attached_and_logged: number;
  attached_not_logged: number;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment: string[];
}

interface AddResult {
  applied: number;
  skipped_completed: number;
  failed: string[];
}

interface RemoveResult {
  detached: number;
  kept_logged: number;
  kept_delivered: number;
}

interface Props {
  clientNumber: number;
  clientName: string;
  sessionsRemaining: number | null;
}

export function SupplementaryWorkoutsCard({ clientNumber, clientName, sessionsRemaining }: Props) {
  const [rows, setRows] = useState<SupplementaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<AddResult | null>(null);

  // Remove dialog state
  const [removeRow, setRemoveRow] = useState<SupplementaryRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeResult, setRemoveResult] = useState<RemoveResult | null>(null);

  // Partial-apply retry
  const [retryIds, setRetryIds] = useState<string[]>([]);

  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientNumber}/supplementary-workouts`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRows(data.rows ?? []);
    } catch {
      toast.error("Could not load supplementary workouts");
    } finally {
      setLoading(false);
    }
  }, [clientNumber]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const openAddDialog = async () => {
    setAddOpen(true);
    setAddStep(1);
    setSelectedTemplate(null);
    setAddSearch("");
    setAddResult(null);
    setRetryIds([]);
    if (templates.length === 0) {
      setTemplatesLoading(true);
      try {
        const res = await fetch(`/api/clients/${clientNumber}/add-workout`);
        if (res.ok) {
          const data = await res.json();
          const all: WorkoutTemplate[] = [
            ...(data.matchedTemplates ?? []).map((m: Record<string, unknown>) => ({
              id: m.id as string,
              name: m.name as string,
              muscle_groups: (m.muscleGroups as string[]) ?? [],
              equipment: (m.equipment as string[]) ?? [],
            })),
            ...(data.excludedTemplates ?? []).map((e: Record<string, unknown>) => ({
              id: e.id as string,
              name: e.name as string,
              muscle_groups: [] as string[],
              equipment: [] as string[],
            })),
          ];
          setTemplates(all);
        }
      } catch { /* ignore */ }
      setTemplatesLoading(false);
    }
  };

  const handlePickTemplate = (tpl: WorkoutTemplate) => {
    setSelectedTemplate(tpl);
    setAddStep(2);
  };

  const handleConfirmAdd = async () => {
    if (!selectedTemplate || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/clients/${clientNumber}/supplementary-workouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout_template_id: selectedTemplate.id }),
      });
      if (res.status === 409) {
        toast.error("This workout is already on the list");
        setAddOpen(false);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add");
      }
      const result: AddResult = await res.json();
      setAddResult(result);
      setAddOpen(false);
      toast.success(`${selectedTemplate.name} added to every session`);
      fetchRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (row: SupplementaryRow) => {
    setRemoveRow(row);
    setRemoveResult(null);
  };

  const handleConfirmRemove = async () => {
    if (!removeRow || removing) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/clients/${clientNumber}/supplementary-workouts/${removeRow.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove");
      }
      const result: RemoveResult = await res.json();
      setRemoveResult(result);
      setRemoveRow(null);
      toast.success(`${removeRow.template_name} removed`);
      fetchRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemoving(false);
    }
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(addSearch.toLowerCase()),
  );

  const activeIds = new Set(rows.map((r) => r.workout_template_id));

  const totalAttached = rows.reduce((sum, r) => sum + r.attached_and_logged + r.attached_not_logged, 0);
  const totalLogged = rows.reduce((sum, r) => sum + r.attached_and_logged, 0);

  if (loading) {
    return (
      <div className="py-1 text-[12.5px] text-[var(--color-muted)]">Loading supplementary…</div>
    );
  }

  return (
    <>
      {rows.length > 0 ? (
        <div>
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={openAddDialog}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-[12px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
            >
              <IconPlus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-2.5">
            {rows.map((row) => (
              <div
                key={row.id}
                className="border border-[var(--hub-border)] rounded-[var(--r-nested)] bg-[var(--hub-card)] p-3.5 flex items-start gap-3.5 hover:bg-[var(--hub-hover)] transition-colors"
              >
                <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center bg-rose/10 text-rose shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={17} height={17}>
                    <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-foreground">{row.template_name}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="inline-flex items-center rounded-pill border border-rose/34 bg-rose/12 px-2.5 py-0.5 text-[11.5px] font-semibold text-rose">
                      In every session
                    </span>
                    <span className="inline-flex items-center rounded-pill border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-2.5 py-0.5 text-[11.5px] font-semibold text-[var(--status-success-text)]">
                      <IconCheck className="w-3 h-3 mr-1" /> Doesn&apos;t use a session
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[12px] text-[var(--color-body)]">
                    {row.attached_and_logged + row.attached_not_logged > 0 ? (
                      <>
                        <span>On <b className="text-foreground">{row.attached_and_logged + row.attached_not_logged}</b> scheduled sessions</span>
                        {row.attached_and_logged > 0 && (
                          <span>Logged in <b className="text-foreground">{row.attached_and_logged}</b> delivered sessions</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[var(--color-muted)] italic">Not run yet — first on her next session</span>
                    )}
                    <span>Added {new Date(row.added_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{row.added_by ? ` by ${row.added_by}` : ""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRemove(row)}
                    className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-body)] hover:bg-[var(--status-danger-bg)] hover:border-[var(--status-danger-border)] hover:text-[var(--status-danger)] transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Partial-apply error */}
          {addResult && addResult.failed.length > 0 && (
            <div className="mt-3 border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] rounded-[var(--r-nested)] p-3 flex gap-2.5 items-start" role="alert">
              <IconAlertTriangle className="w-4 h-4 text-[var(--status-warning-text)] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-foreground">{addResult.failed.length} scheduled session{addResult.failed.length === 1 ? "" : "s"} were not updated</div>
                <div className="text-[12.5px] text-[var(--color-body)] mt-0.5">
                  The workout is saved and will be attached to every session created from now on. These could not be updated and do not have it yet.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRetryIds(addResult.failed)}
                className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-[12px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors shrink-0"
              >
                Try again
              </button>
            </div>
          )}

          {/* Remove result */}
          {removeResult && (removeResult.detached > 0 || removeResult.kept_logged > 0 || removeResult.kept_delivered > 0) && (
            <div className="mt-3 border border-[var(--status-success-border)] bg-[var(--status-success-bg)] rounded-[var(--r-nested)] p-3 flex gap-2.5 items-start">
              <IconCheckCircle className="w-4 h-4 text-[var(--status-success-text)] shrink-0 mt-0.5" />
              <div className="text-[12.5px] text-[var(--color-body)]">
                {removeResult.detached > 0 && <span>Removed from <b className="text-foreground">{removeResult.detached}</b> session{removeResult.detached === 1 ? "" : "s"}.</span>}
                {removeResult.kept_logged > 0 && <span> Kept in <b className="text-foreground">{removeResult.kept_logged}</b> session{removeResult.kept_logged === 1 ? "" : "s"} with logged work.</span>}
                {removeResult.kept_delivered > 0 && <span> Kept in <b className="text-foreground">{removeResult.kept_delivered}</b> delivered session{removeResult.kept_delivered === 1 ? "" : "s"}.</span>}
              </div>
            </div>
          )}

          {/* Pot rule */}
          {sessionsRemaining != null && (
            <div className="mt-3 flex gap-2.5 items-start border border-[var(--status-success-border)] bg-[var(--status-success-bg)] rounded-[var(--r-nested)] p-3 text-[12.5px] text-[var(--color-body)]">
              <IconCheckCircle className="w-[15px] h-[15px] shrink-0 mt-0.5 text-[var(--status-success-text)]" />
              <div>
                Not counted, not numbered, not charged — {clientName} still has <b className="text-foreground">{sessionsRemaining} session{sessionsRemaining === 1 ? "" : "s"} remaining</b>.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between py-1">
          <span className="text-[12.5px] text-[var(--color-body)]">
            None for {clientName} yet — rehab or mobility work attached to every session, never using one.
          </span>
          <button
            type="button"
            onClick={openAddDialog}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-[12px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors shrink-0"
          >
            <IconPlus className="w-3 h-3" /> Add
          </button>
        </div>
      )}

      {/* ── ADD DIALOG ─────────────────────────────────────────────── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-6" style={{ background: "rgba(19,19,19,0.45)" }}>
          <div className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[var(--r-surface)] shadow-[0_24px_60px_rgba(19,19,19,0.22)] w-[min(580px,100%)] max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--hub-border)]">
              <h2 className="flex-1 text-[15px] font-bold text-foreground">Add a supplementary workout</h2>
              <button type="button" onClick={() => setAddOpen(false)} className="w-8 h-8 rounded-lg grid place-items-center text-[var(--color-muted)] hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors">
                <IconX className="w-4 h-4" />
              </button>
            </div>

            {addStep === 1 ? (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <p className="text-[13px] text-[var(--color-body)] leading-relaxed mb-3.5">
                  Pick the template that should run alongside every session for {clientName}. It will not use one of her sessions.
                </p>
                <div className="relative mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)] pointer-events-none">
                    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    type="text"
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="w-full h-[38px] pl-9 pr-3 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[13px] text-foreground font-[inherit] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
                  />
                </div>
                {templatesLoading ? (
                  <div className="space-y-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-11 rounded-lg bg-[var(--hub-hover)] animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                    {filteredTemplates.map((tpl) => {
                      const disabled = activeIds.has(tpl.id);
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => !disabled && handlePickTemplate(tpl)}
                          className={cn(
                            "flex items-center gap-3 w-full text-left px-2.5 py-2.5 rounded-lg transition-colors",
                            disabled
                              ? "opacity-60 cursor-default"
                              : "hover:bg-[var(--hub-hover)] cursor-pointer",
                          )}
                        >
                          <div className="w-8 h-8 rounded-nested grid place-items-center bg-[var(--color-teal)]/12 text-[var(--color-teal)] shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
                              <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-foreground">{tpl.name}</div>
                            {(tpl.muscle_groups.length > 0 || tpl.equipment.length > 0) && (
                              <div className="text-[11.5px] text-[var(--color-muted)] mt-0.5">
                                {tpl.muscle_groups.length > 0 ? tpl.muscle_groups.join(", ") : tpl.equipment.join(", ")}
                              </div>
                            )}
                          </div>
                          {disabled && (
                            <span className="text-[11px] font-bold uppercase tracking-wide text-rose">Already on</span>
                          )}
                        </button>
                      );
                    })}
                    {filteredTemplates.length === 0 && (
                      <div className="text-center py-4 text-[13px] text-[var(--color-muted)]">
                        No templates match that search.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Step 2 — consequence */
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {selectedTemplate && (
                  <>
                    <div className="flex items-center gap-2.5 border border-rose/34 bg-rose/8 rounded-[var(--r-nested)] p-3 mb-3.5">
                      <div className="w-8 h-8 rounded-nested grid place-items-center bg-rose/12 text-rose shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
                          <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-foreground">{selectedTemplate.name}</div>
                        <div className="text-[11.5px] text-[var(--color-body)]">{selectedTemplate.muscle_groups.length} exercises</div>
                      </div>
                    </div>
                    <div className="border border-[var(--hub-border)] rounded-[var(--r-nested)] bg-[var(--hub-hover)] p-3.5">
                      <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-muted)] mb-2.5">What this changes</p>
                      <ul className="space-y-2.5">
                        <li className="flex gap-2.5 items-start text-[13px] text-[var(--color-body)] leading-relaxed">
                          <IconCheck className="w-4 h-4 text-[var(--status-success-text)] shrink-0 mt-0.5" />
                          <span>It is attached to <b className="text-foreground">every session</b> for {clientName} from now on. You will not add it session by session.</span>
                        </li>
                        <li className="flex gap-2.5 items-start text-[13px] text-[var(--color-body)] leading-relaxed">
                          <IconCheck className="w-4 h-4 text-[var(--status-success-text)] shrink-0 mt-0.5" />
                          <span>It <b className="text-foreground">does not use one of her sessions.</b> She still has <b className="text-foreground">{sessionsRemaining ?? "—"}</b> remaining — supplementary work is never counted or charged.</span>
                        </li>
                        <li className="flex gap-2.5 items-start text-[13px] text-[var(--color-body)] leading-relaxed">
                          <IconCheck className="w-4 h-4 text-[var(--status-success-text)] shrink-0 mt-0.5" />
                          <span>It is added to sessions already booked that have not happened yet.</span>
                        </li>
                        <li className="flex gap-2.5 items-start text-[13px] text-[var(--color-body)] leading-relaxed">
                          <IconX className="w-4 h-4 text-[var(--color-muted)] shrink-0 mt-0.5" />
                          <span>Sessions {clientName} has <b className="text-foreground">already done are not changed.</b> Their record stays exactly as it is.</span>
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Footer */}
            {addStep === 1 ? (
              <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[var(--hub-border)] bg-[var(--hub-hover)]">
                <span className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Step 1 of 2 · Pick a template</span>
                <span className="flex-1" />
                <button type="button" onClick={() => setAddOpen(false)} className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3.5 py-1.5 text-[13px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[var(--hub-border)] bg-[var(--hub-hover)]">
                <button type="button" onClick={() => setAddStep(1)} className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3.5 py-1.5 text-[13px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors">
                  Back
                </button>
                <span className="flex-1" />
                <button type="button" onClick={() => setAddOpen(false)} className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3.5 py-1.5 text-[13px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  disabled={adding}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-rose/90 transition-colors disabled:opacity-50"
                >
                  {adding ? "Adding…" : "Add to every session"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REMOVE CONFIRM DIALOG ──────────────────────────────────── */}
      {removeRow && (
        <div className="fixed inset-0 z-50 grid place-items-center p-6" style={{ background: "rgba(19,19,19,0.45)" }}>
          <div className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[var(--r-surface)] shadow-[0_24px_60px_rgba(19,19,19,0.22)] w-[min(520px,100%)] max-h-[88vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--hub-border)]">
              <h2 className="flex-1 text-[15px] font-bold text-foreground">Stop attaching {removeRow.template_name}?</h2>
              <button type="button" onClick={() => setRemoveRow(null)} className="w-8 h-8 rounded-lg grid place-items-center text-[var(--color-muted)] hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors">
                <IconX className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-[13px] text-[var(--color-body)] leading-relaxed mb-3.5">
                It will stop being attached to {clientName}&apos;s sessions from now on. Nothing already logged is deleted.
              </p>
              <div className="border border-[var(--hub-border)] rounded-[var(--r-nested)] bg-[var(--hub-hover)] p-3.5">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-muted)] mb-2.5">What happens to the sessions it is on</p>
                <ul className="space-y-2.5">
                  <li className="flex gap-2.5 items-start text-[13px] text-[var(--color-body)] leading-relaxed">
                    <IconCheck className="w-4 h-4 text-[var(--status-success-text)] shrink-0 mt-0.5" />
                    <span>Sessions with <b className="text-foreground">no logged work</b> lose it — <b className="text-foreground">{removeRow.attached_not_logged}</b> session{removeRow.attached_not_logged === 1 ? "" : "s"}.</span>
                  </li>
                  <li className="flex gap-2.5 items-start text-[13px] text-[var(--color-body)] leading-relaxed">
                    <IconCheck className="w-4 h-4 text-[var(--status-success-text)] shrink-0 mt-0.5" />
                    <span>Sessions with <b className="text-foreground">logged work keep it</b> — their record stays exactly as it is ({removeRow.attached_and_logged} session{removeRow.attached_and_logged === 1 ? "" : "s"}).</span>
                  </li>
                  <li className="flex gap-2.5 items-start text-[13px] text-[var(--color-body)] leading-relaxed">
                    <IconX className="w-4 h-4 text-[var(--color-muted)] shrink-0 mt-0.5" />
                    <span>Delivered sessions are <b className="text-foreground">never changed.</b></span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex items-center gap-2 px-5 py-3.5 border-t border-[var(--hub-border)] bg-[var(--hub-hover)]">
              <span className="flex-1" />
              <button type="button" onClick={() => setRemoveRow(null)} className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3.5 py-1.5 text-[13px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={removing}
                className="inline-flex items-center rounded-lg border border-[var(--status-danger)] bg-[var(--hub-card)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)] transition-colors disabled:opacity-50"
              >
                {removing ? "Removing…" : "Remove from every session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
