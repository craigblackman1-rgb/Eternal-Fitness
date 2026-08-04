"use client";

import { useState } from "react";
import { IconRefreshCw } from "@/components/icons";
import { cn } from "@/lib/utils";

interface Props {
  taxYear: string;
  className?: string;
}

export function RecalculateButton({ taxYear, className }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleRecalculate() {
    setLoading(true);
    try {
      const res = await fetch("/api/cashflow/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tax_year: taxYear }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to recalculate");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      window.location.reload();
    }
  }

  return (
    <button
      onClick={handleRecalculate}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-[var(--hub-border)] px-4 py-2 text-[13px] font-semibold",
        "bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)] transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
    >
      <IconRefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
      {loading ? "Recalculating…" : "Recalculate"}
    </button>
  );
}
