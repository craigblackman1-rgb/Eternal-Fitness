"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubPageHeader, HubCard, EmptyState, Toolbar, toolbarSelectClasses } from "@/components/hub";
import { IconUpload, IconCheck, IconSearch, IconRefreshCw } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { ParsedTransaction } from "@/lib/bank-statement-parser";
import { TransactionTable, type BankTransaction } from "./[id]/transaction-table";

interface LastImport {
  id: string;
  uploaded_at: string;
  source_file_name: string;
  status: string;
  row_count: number;
  total: number;
  uncategorised: number;
  categorised: number;
  excluded: number;
}

interface ImportStatsResponse {
  imports: LastImport[];
  lastImport: LastImport | null;
}

interface ParseResult {
  fileName: string;
  rowCount: number;
  transactions: ParsedTransaction[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [lastImport, setLastImport] = useState<LastImport | null>(null);

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [filter, setFilter] = useState("All");

  const fetchData = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const [txnsRes, statsRes] = await Promise.all([
        fetch("/api/cashflow/transactions"),
        fetch("/api/cashflow/transactions/stats"),
      ]);
      setTransactions(txnsRes.ok ? await txnsRes.json() : []);
      if (statsRes.ok) {
        const stats: ImportStatsResponse = await statsRes.json();
        setLastImport(stats.lastImport);
      } else {
        setLastImport(null);
      }
    } catch {
      setTransactions([]);
      setLastImport(null);
    }
    setLoadingTransactions(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    setCommitError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/cashflow/transactions/parse", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setParseError(json.error ?? "Parse failed");
      } else {
        setParseResult(json);
      }
    } catch {
      setParseError("Failed to upload file for parsing");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  const handleCommit = async () => {
    if (!parseResult) return;
    setCommitting(true);
    setCommitError(null);

    try {
      const res = await fetch("/api/cashflow/transactions/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: parseResult.fileName,
          transactions: parseResult.transactions,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCommitError(json.error ?? "Commit failed");
      } else {
        setParseResult(null);
        fetchData();
      }
    } catch {
      setCommitError("Failed to commit import");
    } finally {
      setCommitting(false);
    }
  };

  const handleDiscard = () => {
    setParseResult(null);
    setParseError(null);
    setCommitError(null);
  };

  const isUncategorised = (t: BankTransaction) =>
    !t.is_excluded && !t.income_category && !t.expense_category;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(searchValue.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === "All") return true;
      if (filter === "Uncategorised") return isUncategorised(t);
      if (filter === "Categorised") return !t.is_excluded && (t.income_category || t.expense_category);
      if (filter === "Excluded") return t.is_excluded;
      return true;
    });
  }, [transactions, searchValue, filter]);

  const filterOptions = ["All", "Uncategorised", "Categorised", "Excluded"];

  const totalLines = transactions.length;
  const totalUncategorised = transactions.filter(isUncategorised).length;
  const countText = `${totalLines} ${totalLines === 1 ? "line" : "lines"} · ${totalUncategorised} uncategorised`;

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Bank transactions"
        subtitle="Statement lines from file upload — HSBC format. Categorise each line so it feeds the tax estimate and forecast correctly."
        actions={
          <label className="cursor-pointer">
            <Button asChild className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white">
              <span>
                <IconUpload className="w-4 h-4" />
                Import statement
              </span>
            </Button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={parsing || committing}
            />
          </label>
        }
      />

      {/* Last import summary */}
      {lastImport && (
        <HubCard className="flex items-center gap-3.5 p-4">
          <div className="w-[38px] h-[38px] rounded-nested bg-[var(--status-success-bg)] text-[var(--color-teal)] flex items-center justify-center shrink-0">
            <IconCheck className="w-[18px] h-[18px]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-bold text-foreground leading-tight">
              Last import — {formatDate(lastImport.uploaded_at)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lastImport.source_file_name} · {lastImport.total} {lastImport.total === 1 ? "line" : "lines"}{" "}
              · {lastImport.uncategorised} still need a category
            </p>
          </div>
        </HubCard>
      )}

      {/* Parse error */}
      {parseError && (
        <HubCard>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-pill bg-[var(--status-danger-bg)] text-[var(--status-danger)] flex items-center justify-center shrink-0 mt-0.5">
              <IconSearch className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--status-danger)]">Parse error</p>
              <p className="text-sm text-[var(--hub-muted)] mt-1">{parseError}</p>
            </div>
          </div>
        </HubCard>
      )}

      {/* Parsing */}
      {parsing && (
        <HubCard>
          <div className="flex items-center gap-3 py-4">
            <IconRefreshCw className="w-5 h-5 animate-spin text-[var(--hub-muted)]" />
            <p className="text-sm text-[var(--hub-muted)]">Parsing file…</p>
          </div>
        </HubCard>
      )}

      {/* Preview table */}
      {parseResult && (
        <HubCard padded={false}>
          <div className="px-5 py-4 border-b border-[var(--hub-border)] flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{parseResult.fileName}</p>
              <p className="text-xs text-[var(--hub-muted)] mt-0.5">
                {parseResult.rowCount} {parseResult.rowCount === 1 ? "transaction" : "transactions"} found
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDiscard}
                disabled={committing}
                className="rounded-lg text-xs"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleCommit}
                disabled={committing}
                className="rounded-lg text-xs bg-rose hover:bg-rose/90 text-white"
              >
                {committing ? "Committing…" : "Commit import"}
              </Button>
            </div>
          </div>
          {commitError && (
            <div className="px-5 py-3 bg-[var(--status-danger-bg)]/50">
              <p className="text-xs text-[var(--status-danger)]">{commitError}</p>
            </div>
          )}
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--hub-hover)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--hub-muted)]">
                  <th className="px-5 py-2.5 text-left">Date</th>
                  <th className="px-5 py-2.5 text-left">Description</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                  <th className="px-5 py-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {parseResult.transactions.map((txn, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--hub-border)] text-sm hover:bg-[var(--hub-hover)]/50 transition-colors"
                  >
                    <td className="px-5 py-2.5 whitespace-nowrap text-[var(--hub-muted)]">
                      {formatDate(txn.date)}
                    </td>
                    <td className="px-5 py-2.5">{txn.description}</td>
                    <td
                      className={`px-5 py-2.5 text-right tabular-nums font-medium ${
                        txn.amount < 0 ? "text-[var(--status-danger)]" : "text-[var(--status-success-text)]"
                      }`}
                    >
                      {(() => {
                        const abs = Math.abs(txn.amount);
                        const formatted = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(abs);
                        return txn.amount < 0 ? `-${formatted}` : `+${formatted}`;
                      })()}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-[var(--hub-muted)]">
                      {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(txn.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HubCard>
      )}

      {/* Transactions — one unified list across every import, matching hub-cashflow-transactions.html */}
      <Toolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search description…"
        count={countText}
      >
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={toolbarSelectClasses}
          aria-label="Filter by category status"
        >
          {filterOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </Toolbar>

      <HubCard padded={false}>
        {loadingTransactions ? (
          <div className="flex items-center gap-3 px-5 py-10">
            <IconRefreshCw className="w-5 h-5 animate-spin text-[var(--hub-muted)]" />
            <p className="text-sm text-[var(--hub-muted)]">Loading transactions…</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="px-5 py-12">
            <EmptyState
              icon={<IconUpload className="w-9 h-9" />}
              title={transactions.length === 0 ? "No transactions yet" : "No transactions match"}
              description={
                transactions.length === 0
                  ? "Upload a bank statement CSV to get started"
                  : "Try a different search or filter"
              }
            />
          </div>
        ) : (
          <TransactionTable
            transactions={filteredTransactions}
            onRowUpdated={(id, updates) =>
              setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
            }
          />
        )}
      </HubCard>
    </div>
  );
}
