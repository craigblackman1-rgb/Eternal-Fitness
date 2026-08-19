"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { HubPageHeader, EmptyState, Toolbar, toolbarSelectClasses } from "@/components/hub";
import { IconCheckCircle, IconRefreshCw, IconX } from "@/components/icons";
import { Button } from "@/components/ui/button";

interface DBTransaction {
  id: string;
  import_id: string;
  txn_date: string;
  description: string;
  amount: number;
  balance: number | null;
  currency: string;
  raw_type: string | null;
  raw: Record<string, unknown> | null;
  matched_invoice_id: string | null;
  created_at: string;
}

interface CandidateInvoice {
  id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  currency: string;
  subtotal: number;
  vat_total: number;
  total: number;
  notes: string | null;
  clients: { name: string; client_number: number; display_code: string } | null;
}

interface CandidateMatch {
  invoice: CandidateInvoice;
  matchType: "likely" | "possible";
}

interface SuggestedPair {
  transaction: DBTransaction;
  matches: CandidateMatch[];
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getConfidence(matchType: "likely" | "possible"): {
  label: string;
  pct: number;
  color: string;
  bg: string;
  iconColor: string;
} {
  if (matchType === "likely") return {
    label: "High", pct: 92,
    color: "var(--status-success)",
    bg: "var(--status-success-bg)",
    iconColor: "var(--status-success)",
  };
  return {
    label: "Medium", pct: 61,
    color: "var(--status-warning)",
    bg: "var(--status-warning-bg)",
    iconColor: "var(--status-warning)",
  };
}

function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </svg>
  );
}

export default function ReconciliationPage() {
  const [suggestions, setSuggestions] = useState<SuggestedPair[]>([]);
  const [unmatched, setUnmatched] = useState<DBTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchFilter, setMatchFilter] = useState("suggested");

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cashflow/reconciliation/suggestions");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load suggestions");
      } else {
        setSuggestions(json.suggestions ?? []);
        setUnmatched(json.unmatched ?? []);
      }
    } catch {
      setError("Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleConfirm = async (transactionId: string, invoiceId: string) => {
    const key = `${transactionId}::${invoiceId}`;
    setConfirmingId(key);
    try {
      const res = await fetch("/api/cashflow/reconciliation/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: transactionId, invoice_id: invoiceId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to confirm match");
      } else {
        setSuggestions((prev) =>
          prev
            .map((s) => {
              if (s.transaction.id !== transactionId) return s;
              const remaining = s.matches.filter((m) => m.invoice.id !== invoiceId);
              return remaining.length > 0 ? { ...s, matches: remaining } : null;
            })
            .filter(Boolean) as SuggestedPair[]
        );
      }
    } catch {
      setError("Failed to confirm match");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDismiss = async (transactionId: string, invoiceId: string) => {
    const key = `${transactionId}::${invoiceId}`;
    setConfirmingId(key);
    try {
      const res = await fetch("/api/cashflow/reconciliation/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: transactionId, invoice_id: invoiceId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to dismiss suggestion");
      } else {
        setSuggestions((prev) =>
          prev
            .map((s) => {
              if (s.transaction.id !== transactionId) return s;
              const remaining = s.matches.filter((m) => m.invoice.id !== invoiceId);
              return remaining.length > 0 ? { ...s, matches: remaining } : null;
            })
            .filter(Boolean) as SuggestedPair[]
        );
      }
    } catch {
      setError("Failed to dismiss suggestion");
    } finally {
      setConfirmingId(null);
    }
  };

  const totalMatchCount = useMemo(
    () => suggestions.reduce((sum, s) => sum + s.matches.length, 0),
    [suggestions],
  );

  const filteredSuggestions = useMemo(() => {
    const q = searchQuery.toLowerCase();

    return suggestions
      .map((pair) => {
        const filtered = pair.matches.filter((m) => {
          if (matchFilter === "confirmed" || matchFilter === "dismissed") return false;

          if (q) {
            const inTxn = pair.transaction.description.toLowerCase().includes(q);
            const inInv = m.invoice.invoice_number.toLowerCase().includes(q);
            const inClient = (m.invoice.clients?.name ?? "").toLowerCase().includes(q);
            if (!inTxn && !inInv && !inClient) return false;
          }

          return true;
        });
        return filtered.length > 0 ? { ...pair, matches: filtered } : null;
      })
      .filter(Boolean) as SuggestedPair[];
  }, [suggestions, searchQuery, matchFilter]);

  const filteredUnmatched = useMemo(() => {
    if (!searchQuery) return unmatched;
    const q = searchQuery.toLowerCase();
    return unmatched.filter((t) => t.description.toLowerCase().includes(q));
  }, [unmatched, searchQuery]);

  const countText = `${totalMatchCount} suggested · ${unmatched.length} unmatched`;
  const showSuggested = matchFilter === "all" || matchFilter === "suggested";
  const hasData = (showSuggested && filteredSuggestions.length > 0) || filteredUnmatched.length > 0;

  return (
    <div>
      <HubPageHeader
        title="Reconciliation"
        subtitle="Imported bank lines matched against open invoices. Confirm a suggestion to mark the invoice paid, or dismiss it if the match is wrong."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={fetchSuggestions}
            disabled={loading}
            className="rounded-lg gap-1.5"
          >
            <IconRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mt-6 bg-[var(--hub-card)] border border-[var(--status-danger)]/20 rounded-[16px] shadow-sm p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger)] flex items-center justify-center shrink-0 mt-0.5">
              <IconX className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--status-danger)]">Error</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-6 bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-sm p-8">
          <div className="flex items-center gap-3">
            <IconRefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading suggestions…</p>
          </div>
        </div>
      ) : !hasData ? (
        <div className="mt-6 bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-sm">
          <div className="px-5 py-12">
            <EmptyState
              icon={<IconCheckCircle className="w-9 h-9" />}
              title="All clear"
              description="No outstanding transactions need matching. Upload a new statement to see suggestions here."
              cta={{ label: "Go to transactions", href: "/hub/cashflow/transactions" }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <Toolbar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by client or reference…"
              count={countText}
            >
              <select
                className={toolbarSelectClasses}
                value={matchFilter}
                onChange={(e) => setMatchFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="suggested">Suggested matches</option>
                <option value="confirmed">Confirmed</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </Toolbar>
          </div>

          {showSuggested && filteredSuggestions.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground mt-7 mb-3">
                Suggested matches
              </p>

              <div className="flex flex-col gap-3">
                {filteredSuggestions.map((pair) =>
                  pair.matches.map((match) => {
                    const key = `${pair.transaction.id}::${match.invoice.id}`;
                    const isActing = confirmingId === key;
                    const conf = getConfidence(match.matchType);

                    return (
                      <div
                        key={key}
                        className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-sm p-[18px_20px] flex items-center gap-[18px] flex-wrap"
                      >
                        <div
                          className="shrink-0 w-[30px] h-[30px] rounded-full grid place-items-center"
                          style={{ background: conf.bg, color: conf.iconColor }}
                        >
                          <LinkIcon />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground mb-1">
                            Bank line
                          </p>
                          <p className="text-[13.5px] font-semibold text-foreground">
                            {formatAmount(pair.transaction.amount)} · {formatDate(pair.transaction.txn_date)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pair.transaction.description}
                          </p>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground mb-1">
                            Suggested invoice
                          </p>
                          <p className="text-[13.5px] font-semibold text-foreground">
                            {match.invoice.invoice_number} · {match.invoice.clients?.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Sent {formatDate(match.invoice.issue_date)} · {formatAmount(match.invoice.total)} due
                          </p>
                        </div>

                        <div className="shrink-0 text-center w-[84px]">
                          <div className="w-full h-[6px] rounded-full bg-[var(--hub-border)] overflow-hidden mb-[5px]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${conf.pct}%`, background: conf.color }}
                            />
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: conf.color }}>
                            {conf.label} · {conf.pct}%
                          </span>
                        </div>

                        <div className="shrink-0 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismiss(pair.transaction.id, match.invoice.id)}
                            disabled={isActing}
                            className="rounded-lg text-xs h-[34px]"
                          >
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(pair.transaction.id, match.invoice.id)}
                            disabled={isActing}
                            className="rounded-lg text-xs h-[34px] bg-[var(--status-success)] hover:bg-[var(--status-success-text)] text-white"
                          >
                            {isActing ? "…" : "Confirm"}
                          </Button>
                        </div>
                      </div>
                    );
                  }),
                )}
              </div>
            </>
          )}

          {filteredUnmatched.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground mt-7 mb-3">
                Unmatched bank lines
              </p>

              <div className="flex flex-col gap-2.5">
                {filteredUnmatched.map((txn) => (
                  <div
                    key={txn.id}
                    className="bg-[var(--hub-card)] border border-dashed border-[var(--hub-border)] rounded-[16px] p-[14px_20px] flex items-center gap-[14px] flex-wrap"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-foreground">
                        {formatAmount(txn.amount)} · {formatDate(txn.txn_date)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {txn.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] border-[var(--status-neutral-border)] shrink-0">
                      No invoice match
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs h-[34px] shrink-0"
                      asChild
                    >
                      <Link href="/hub/cashflow/transactions">Categorise instead →</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
