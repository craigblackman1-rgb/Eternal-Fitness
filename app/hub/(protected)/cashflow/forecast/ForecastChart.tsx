"use client";

import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts";
import type { ProjectionMonth } from "@/lib/cashflow-forecast";

interface ForecastChartProps {
  projection: ProjectionMonth[];
}

export function ForecastChart({ projection }: ForecastChartProps) {
  const data = projection.map((m, i) => ({
    month: new Date(m.key + "-01").toLocaleString("en-GB", { month: "short" }),
    closing: m.closing,
    isNeg: m.closing < 0,
    index: i,
  }));

  const allPositive = data.every((d) => d.closing >= 0);
  const maxVal = Math.max(0, ...data.map((d) => d.closing));
  const minVal = Math.min(0, ...data.map((d) => d.closing));
  const yDomain: [number, number] = allPositive ? [0, maxVal * 1.15] : [minVal * 1.15, maxVal * 1.15];

  return (
    <div className="chart-card bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-sm p-5 mb-[18px]">
      <div className="flex items-baseline justify-between mb-2.5">
        <p className="text-[13px] font-bold text-[var(--color-ink)] m-0">Closing balance by month</p>
        <p className="text-xs text-[var(--color-muted-text)] m-0">
          {projection[0]?.label ?? ""} – {projection[projection.length - 1]?.label ?? ""}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted-text)", fontSize: 10.5, fontFamily: "var(--font-body)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={false}
            domain={yDomain}
            width={0}
          />
          <Bar dataKey="closing" radius={[3, 3, 0, 0]} maxBarSize={52}>
            {data.map((entry) => (
              <Cell
                key={entry.index}
                fill={entry.isNeg ? "var(--status-danger)" : "var(--color-teal)"}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
