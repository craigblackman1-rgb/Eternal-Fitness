"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IconTrash2, IconMessageCircle } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { EnduranceBlockData, EnduranceCalendarRow, EnduranceDisciplineTarget } from "@/lib/documents/types";

let uidCounter = 0;
function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `eb-${Date.now()}-${uidCounter++}`;
}

function newDayRow(): EnduranceCalendarRow {
  return { id: uid(), type: "day", date: "", dayLabel: "", run: "", bike: "", swim: "", notes: "", highlight: null };
}
function newSummaryRow(): EnduranceCalendarRow {
  return { id: uid(), type: "week_summary", weekLabel: "", run: "", bike: "", swim: "", notes: "" };
}

/**
 * Dedicated editor for the "endurance_block" document kind. A manually-editable,
 * calendar-based training block for endurance/multi-discipline clients — no AI
 * generation, no session logging, no signature requirement. Everything edits in
 * place (spreadsheet-style cells), because that is Esther's explicit requirement
 * ("everything needs to be editable... by me... not by an AI agent... time is
 * money"). All edits flow up through `onChange` and are saved by the parent's
 * existing PATCH flow under `body.enduranceBlock`.
 */
export function EnduranceBlockEditor({
  data,
  locked,
  onChange,
}: {
  data: EnduranceBlockData;
  locked: boolean;
  onChange: (next: EnduranceBlockData) => void;
}) {
  const update = (patch: Partial<EnduranceBlockData>) => onChange({ ...data, ...patch });

  // Discipline targets
  const updateTarget = (id: string, patch: Partial<EnduranceDisciplineTarget>) =>
    update({ disciplineTargets: data.disciplineTargets.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const addTarget = () =>
    update({ disciplineTargets: [...data.disciplineTargets, { id: uid(), discipline: "", detail: "" }] });
  const removeTarget = (id: string) =>
    update({ disciplineTargets: data.disciplineTargets.filter((t) => t.id !== id) });

  // Calendar rows
  const updateRow = (id: string, patch: Partial<EnduranceCalendarRow>) =>
    update({ rows: data.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const addRow = (type: "day" | "week_summary") =>
    update({ rows: [...data.rows, type === "day" ? newDayRow() : newSummaryRow()] });
  const removeRow = (id: string) => update({ rows: data.rows.filter((r) => r.id !== id) });

  const targets = data.disciplineTargets ?? [];

  return (
    <div className="space-y-8">
      {/* Header meta fields — target event + date range */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Target event</Label>
          <Input
            value={data.targetEvent ?? ""}
            onChange={(e) => update({ targetEvent: e.target.value })}
            placeholder="e.g. Cross Triathlon Vorden, 1/8th distance"
            disabled={locked}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Start date</Label>
          <Input type="date" value={data.startDate ?? ""} onChange={(e) => update({ startDate: e.target.value })} disabled={locked} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">End date</Label>
          <Input type="date" value={data.endDate ?? ""} onChange={(e) => update({ endDate: e.target.value })} disabled={locked} />
        </div>
      </div>

      {/* Direction */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--rose-text)]">Direction</h4>
          {!locked && <span className="text-xs text-muted-foreground">Tap any text to edit it</span>}
        </div>
        <Textarea
          value={data.directionIntro ?? ""}
          onChange={(e) => update({ directionIntro: e.target.value })}
          placeholder="Write the framing paragraph for this block…"
          disabled={locked}
          className="min-h-[96px] resize-y mb-2"
        />
        <ul className="eb-bullets">
          {targets.map((t) => (
            <li key={t.id} className="eb-bullet-edit">
              <div className="flex items-start gap-2">
                <input
                  className="eb-cell font-semibold"
                  style={{ width: "9.5rem", flex: "none" }}
                  value={t.discipline}
                  onChange={(e) => updateTarget(t.id, { discipline: e.target.value })}
                  placeholder="Swim"
                  disabled={locked}
                />
                <input
                  className="eb-cell"
                  value={t.detail}
                  onChange={(e) => updateTarget(t.id, { detail: e.target.value })}
                  placeholder="~1–1.5 hrs/week, open water"
                  disabled={locked}
                />
              </div>
              {!locked && (
                <button type="button" className="eb-bullet-rm" title="Remove target" onClick={() => removeTarget(t.id)}>
                  <IconTrash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {!locked && (
          <button type="button" className="eb-add" onClick={addTarget}>
            <span className="text-base leading-none">+</span> Add weekly target
          </button>
        )}

        {/* Coaching note callout */}
        <div className="eb-callout">
          <div className="eb-callout-top">
            <span className="eb-callout-ic"><IconMessageCircle className="h-3.5 w-3.5" /></span>
            <span className="eb-callout-title">Coaching note</span>
            {!locked && data.coachingNotes ? (
              <button type="button" className="eb-callout-x" title="Clear note" onClick={() => update({ coachingNotes: "" })}>
                <IconTrash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Textarea
            value={data.coachingNotes ?? ""}
            onChange={(e) => update({ coachingNotes: e.target.value })}
            placeholder="Write the coaching note…"
            disabled={locked}
            className="min-h-[72px] resize-y bg-transparent border-0 p-0 shadow-none text-sm leading-relaxed"
          />
        </div>
      </section>

      {/* Calendar */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--rose-text)]">Calendar</h4>
          {!locked && <span className="text-xs text-muted-foreground">Every cell is editable — type straight into it</span>}
        </div>
        <div className="eb-table-wrap rounded-lg border border-[var(--color-border-warm)] bg-white">
          <table className="eb-table">
            <thead>
              <tr>
                <th>Date</th><th>Day</th><th>Run</th><th>Bike</th><th>Swim</th><th>Notes</th>
                {!locked && <th className="w-px" aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={locked ? 6 : 7} className="text-sm text-muted-foreground py-8 text-center">
                    No sessions yet — add a day or a week summary below.
                  </td>
                </tr>
              )}
              {data.rows.map((r) =>
                r.type === "week_summary" ? (
                  <tr key={r.id} className="eb-sum">
                    <td colSpan={2}>
                      <input
                        className="eb-cell"
                        value={r.weekLabel ?? ""}
                        onChange={(e) => updateRow(r.id, { weekLabel: e.target.value })}
                        placeholder="Week 1 (19–23 Aug, partial)"
                        disabled={locked}
                      />
                    </td>
                    <td><input className="eb-cell" value={r.run ?? ""} onChange={(e) => updateRow(r.id, { run: e.target.value })} placeholder="—" disabled={locked} /></td>
                    <td><input className="eb-cell" value={r.bike ?? ""} onChange={(e) => updateRow(r.id, { bike: e.target.value })} placeholder="—" disabled={locked} /></td>
                    <td><input className="eb-cell" value={r.swim ?? ""} onChange={(e) => updateRow(r.id, { swim: e.target.value })} placeholder="—" disabled={locked} /></td>
                    <td className="eb-sum-notes">
                      <input className="eb-cell" value={r.notes ?? ""} onChange={(e) => updateRow(r.id, { notes: e.target.value })} placeholder="Week total" disabled={locked} />
                    </td>
                    {!locked && (
                      <td className="text-right align-top">
                        <button type="button" className="eb-row-del" title="Remove week summary" onClick={() => removeRow(r.id)}>
                          <IconTrash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ) : (
                  <tr key={r.id} className={cn(r.highlight === "brick" && "eb-brick", r.highlight === "race" && "eb-race")}>
                    <td className="eb-date-cell">
                      <input className="eb-cell" value={r.date ?? ""} onChange={(e) => updateRow(r.id, { date: e.target.value })} placeholder="—" disabled={locked} />
                    </td>
                    <td className="eb-day-cell">
                      <input className="eb-cell" value={r.dayLabel ?? ""} onChange={(e) => updateRow(r.id, { dayLabel: e.target.value })} placeholder="—" disabled={locked} />
                    </td>
                    <td><input className="eb-cell" value={r.run ?? ""} onChange={(e) => updateRow(r.id, { run: e.target.value })} placeholder="—" disabled={locked} /></td>
                    <td><input className="eb-cell" value={r.bike ?? ""} onChange={(e) => updateRow(r.id, { bike: e.target.value })} placeholder="—" disabled={locked} /></td>
                    <td><input className="eb-cell" value={r.swim ?? ""} onChange={(e) => updateRow(r.id, { swim: e.target.value })} placeholder="—" disabled={locked} /></td>
                    <td className="eb-notes-cell">
                      {r.highlight && (
                        <span className={cn("eb-tag", r.highlight === "race" && "eb-tag--race")}>
                          {r.highlight === "race" ? "Race day" : "Brick"}
                        </span>
                      )}
                      <textarea
                        className="eb-cell"
                        rows={1}
                        value={r.notes ?? ""}
                        onChange={(e) => updateRow(r.id, { notes: e.target.value })}
                        placeholder="Notes"
                        disabled={locked}
                      />
                    </td>
                    {!locked && (
                      <td className="text-right align-top whitespace-nowrap">
                        <select
                          className="eb-hl"
                          value={r.highlight ?? ""}
                          onChange={(e) => updateRow(r.id, { highlight: (e.target.value || null) as EnduranceCalendarRow["highlight"] })}
                          aria-label="Row highlight"
                        >
                          <option value="">—</option>
                          <option value="brick">Brick</option>
                          <option value="race">Race</option>
                        </select>
                        <button type="button" className="eb-row-del" title="Delete row" onClick={() => removeRow(r.id)}>
                          <IconTrash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        {!locked && (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <button type="button" className="eb-add" onClick={() => addRow("day")}>
              <span className="text-base leading-none">+</span> Add day
            </button>
            <button type="button" className="eb-add" onClick={() => addRow("week_summary")}>
              <span className="text-base leading-none">+</span> Add week summary
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
