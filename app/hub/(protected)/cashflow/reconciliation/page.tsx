"use client";

import { useCallback, useEffect, useState } from "react";
import { HubPageHeader, HubCard, EmptyState, StatusBadge } from "@/components/hub";
import { IconCheckCircle, IconRefreshCw, IconSearch, IconX } from "@/components/icons";
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

export default function ReconciliationPage() {
  const [suggestions, setSuggestions] = useState<SuggestedPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/cashflow/reconciliation/suggestions");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load suggestions");
      } else {
        setSuggestions(json);
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

  const totalSuggestions = suggestions.reduce((sum, s) => sum + s.matches.length, 0);

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Reconciliation"
        subtitle="Match bank transactions to outstanding invoices"
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
        <HubCard>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger)] flex items-center justify-center shrink-0 mt-0.5">
              <IconSearch className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--status-danger)]">Error</p>
              <p className="text-sm text-[var(--hub-muted)] mt-1">{error}</p>
            </div>
          </div>
        </HubCard>
      )}

      {loading ? (
        <HubCard>
          <div className="flex items-center gap-3 py-4">
            <IconRefreshCw className="w-5 h-5 animate-spin text-[var(--hub-muted)]" />
            <p className="text-sm text-[var(--hub-muted)]">Loading suggestions…</p>
          </div>
        </HubCard>
      ) : suggestions.length === 0 ? (
        <HubCard>
          <div className="px-5 py-12">
            <EmptyState
              icon={<IconCheckCircle className="w-9 h-9" />}
              title="All clear"
              description="No outstanding transactions need matching. Upload a new statement to see suggestions here."
              cta={{ label: "Go to transactions", href: "/hub/cashflow/transactions" }}
            />
          </div>
        </HubCard>
      ) : (
        <>
          <p className="text-sm text-[var(--hub-muted)]">
            {totalSuggestions} {totalSuggestions === 1 ? "suggestion" : "suggestions"} across{" "}
            {suggestions.length} {suggestions.length === 1 ? "transaction" : "transactions"}
          </p>

          {suggestions.map((pair) => (
            <HubCard key={pair.transaction.id} padded={false}>
              <div className="px-5 py-4 border-b border-[var(--hub-border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{pair.transaction.description}</p>
                    <p className="text-xs text-[var(--hub-muted)] mt-0.5 tabular-nums">
                      {formatDate(pair.transaction.txn_date)} · {formatAmount(pair.transaction.amount)}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--hub-muted)] tabular-nums">
                    {pair.matches.length} {pair.matches.length === 1 ? "match" : "matches"}
                  </span>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[var(--hub-hover)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--hub-muted)]">
                      <th className="px-5 py-2.5 text-left">Invoice</th>
                      <th className="px-5 py-2.5 text-left">Client</th>
                      <th className="px-5 py-2.5 text-right">Total</th>
                      <th className="px-5 py-2.5 text-left">Status</th>
                      <th className="px-5 py-2.5 text-left">Dates</th>
                      <th className="px-5 py-2.5 text-left">Match</th>
                      <th className="px-5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pair.matches.map((match) => {
                      const key = `${pair.transaction.id}::${match.invoice.id}`;
                      const isActing = confirmingId === key;

                      return (
                        <tr
                          key={match.invoice.id}
                          className="border-b border-[var(--hub-border)] text-sm hover:bg-[var(--hub-hover)]/50 transition-colors"
                        >
                          <td className="px-5 py-2.5">
                            <span className="font-medium tabular-nums">{match.invoice.invoice_number}</span>
                          </td>
                          <td className="px-5 py-2.5">
                            <span className="text-[var(--hub-muted)]">
                              {match.invoice.clients?.name ?? "—"}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums font-medium">
                            {formatAmount(match.invoice.total)}
                          </td>
                          <td className="px-5 py-2.5">
                            <StatusBadge status={match.invoice.status} />
                          </td>
                          <td className="px-5 py-2.5 text-[var(--hub-muted)] whitespace-nowrap">
                            <span className="text-xs">
                              Issued {formatDate(match.invoice.issue_date)} · Due{" "}
                              {formatDate(match.invoice.due_date)}
                            </span>
                          </td>
                          <td className="px-5 py-2.5">
                            {match.matchType === "likely" ? (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold border-[var(--status-success-text)]/25 bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
                                Likely match
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold border-amber/25 bg-amber/10 text-amber">
                                Possible match
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleConfirm(pair.transaction.id, match.invoice.id)}
                                disabled={isActing}
                                className="rounded-lg text-xs h-7 bg-[var(--status-success-text)] hover:bg-[var(--status-success-text)]/90 text-white"
                              >
                                {isActing ? "…" : "Confirm"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDismiss(pair.transaction.id, match.invoice.id)}
                                disabled={isActing}
                                className="rounded-lg text-xs h-7"
                              >
                                Dismiss
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </HubCard>
          ))}
        </>
      )}
    </div>
  );
}
