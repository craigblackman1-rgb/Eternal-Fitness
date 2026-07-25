"use client";

/**
 * Lane C — per-exercise progress panel, shared by the hub (any client) and
 * the portal (own data only). Receives pre-aggregated, serialisable trend
 * data from a server component — no data fetching here.
 *
 * Built on the existing recharts wrapper (components/ui/chart.tsx) — no new
 * charting dependency. No colour-only signalling: the two lines differ by
 * dash pattern as well as colour, and the change-since-first summary pairs
 * colour with a direction icon and a signed number.
 */

import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/hub/EmptyState";
import { IconBarChart3, IconChevronDown, IconChevronUp, IconDot } from "@/components/icons";
import type { ExerciseTrend, TrendMetric } from "@/lib/progress";

const chartConfig = {
  weight: { label: "Top set (kg)", color: "var(--color-rose)" },
  reps: { label: "Reps", color: "var(--color-teal)" },
  duration: { label: "Duration (s)", color: "var(--color-teal)" },
} satisfies ChartConfig;

const METRIC_UNIT: Record<TrendMetric, string> = {
  weight: "kg",
  reps: "reps",
  duration: "s",
};

const METRIC_DESCRIPTION: Record<TrendMetric, string> = {
  weight: "Heaviest completed set per session (with reps at that weight)",
  reps: "Best completed reps per session",
  duration: "Longest completed duration per session",
};

function primaryValue(trend: ExerciseTrend, pointIndex: number): number | null {
  const p = trend.points[pointIndex];
  if (!p) return null;
  if (trend.metric === "weight") return p.topWeightKg;
  if (trend.metric === "duration") return p.maxDurationSeconds;
  return p.maxReps;
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Change since first logged session — icon + signed text, never colour alone. */
function ChangeSummary({ trend }: { trend: ExerciseTrend }) {
  const values: number[] = [];
  for (let i = 0; i < trend.points.length; i++) {
    const v = primaryValue(trend, i);
    if (v !== null) values.push(v);
  }
  if (values.length < 2) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconDot className="w-3.5 h-3.5" aria-hidden="true" />
        Not enough logged sessions yet to show a change
      </span>
    );
  }
  const delta = values[values.length - 1] - values[0];
  const unit = METRIC_UNIT[trend.metric];
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <IconDot className="w-3.5 h-3.5" aria-hidden="true" />
        No change since first logged session
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
        up ? "text-[var(--status-success-text)]" : "text-[var(--status-warning-text)]"
      }`}
    >
      {up ? (
        <IconChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
      ) : (
        <IconChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      {up ? "Up" : "Down"} {formatNumber(Math.abs(delta))} {unit} since first logged session
    </span>
  );
}

interface ExerciseTrendsPanelProps {
  trends: ExerciseTrend[];
  /** Copy for the empty state — differs between hub and portal voice. */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Unique id prefix so two panels on one page keep distinct label/select ids. */
  idPrefix?: string;
}

export function ExerciseTrendsPanel({
  trends,
  emptyTitle = "No logged sessions yet",
  emptyDescription = "Once sets are logged against a session plan, per-exercise progress will appear here.",
  idPrefix = "exercise-trends",
}: ExerciseTrendsPanelProps) {
  const [selectedName, setSelectedName] = useState<string>(trends[0]?.exerciseName ?? "");

  if (trends.length === 0) {
    return (
      <EmptyState
        icon={<IconBarChart3 className="w-7 h-7" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const trend = trends.find((t) => t.exerciseName === selectedName) ?? trends[0];
  const selectId = `${idPrefix}-select`;

  const data = trend.points.map((p) => ({
    label: p.label,
    dateLabel: p.dateLabel,
    weight: p.topWeightKg,
    reps: trend.metric === "weight" ? p.repsAtTopWeight : p.maxReps,
    duration: p.maxDurationSeconds,
    sets: `${p.completedSets}/${p.totalSets}`,
  }));

  const primaryKey = trend.metric === "weight" ? "weight" : trend.metric === "duration" ? "duration" : "reps";
  const sessionsLogged = trend.points.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Exercise
          </label>
          <select
            id={selectId}
            value={trend.exerciseName}
            onChange={(e) => setSelectedName(e.target.value)}
            className="h-9 max-w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-rose/40"
          >
            {trends.map((t) => (
              <option key={t.exerciseName} value={t.exerciseName}>
                {t.exerciseName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <span className="text-xs text-muted-foreground">
            {sessionsLogged} logged session{sessionsLogged === 1 ? "" : "s"}
          </span>
          <ChangeSummary trend={trend} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{METRIC_DESCRIPTION[trend.metric]}</p>

      <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
          <YAxis
            yAxisId="primary"
            tickLine={false}
            axisLine={false}
            width={36}
            fontSize={12}
            domain={["auto", "auto"]}
          />
          {trend.metric === "weight" && (
            <YAxis
              yAxisId="secondary"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={30}
              fontSize={12}
              domain={["auto", "auto"]}
            />
          )}
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload;
                  if (!row) return null;
                  return `${row.label} · ${row.dateLabel} · ${row.sets} sets completed`;
                }}
              />
            }
          />
          <Line
            yAxisId="primary"
            dataKey={primaryKey}
            type="monotone"
            stroke={`var(--color-${primaryKey})`}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          {trend.metric === "weight" && (
            <Line
              yAxisId="secondary"
              dataKey="reps"
              type="monotone"
              stroke="var(--color-reps)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3 }}
              connectNulls
            />
          )}
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
