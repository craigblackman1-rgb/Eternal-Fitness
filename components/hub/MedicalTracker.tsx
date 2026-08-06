"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getComplianceStatus } from "@/lib/hubStatus";
import { HubCard, HubPageHeader, StatusBadge, EmptyState } from "@/components/hub";
import { IconSearch, IconX, IconClock, IconAlertTriangle, IconShieldCheck } from "@/components/icons";

/* ─── types ─────────────────────────────────────────────────── */

export type DocState = "ok" | "due" | "exp" | "out" | "pend" | "dec" | "na";

export interface DocInfo {
  signedDate: string | null;
  expiryDate: string | null;
  note: string | null;
  state: DocState;
}

export interface TrackerClient {
  id: string;
  clientNumber: number | null;
  name: string;
  conditions: string[];
  complianceStatus: "do_not_train" | "pending_medical" | "action_needed" | "clear";
  hold: boolean;
  nextReview: string | null;
  documents: {
    parq: DocInfo | null;
    gp: DocInfo | null;
    agreement: DocInfo | null;
    risk: DocInfo | null;
    consent: DocInfo | null;
  };
}

export interface RegisterRow {
  clientId: string;
  clientNumber: number | null;
  clientName: string;
  complianceStatus: TrackerClient["complianceStatus"];
  docKey: string;
  docLabel: string;
  state: DocState;
  signedDate: string | null;
  expiryDate: string | null;
  note: string | null;
}

interface MedicalTrackerProps {
  clients: TrackerClient[];
}

/* ─── constants ─────────────────────────────────────────────── */

const DOC_KINDS: { key: keyof TrackerClient["documents"]; label: string; full: string }[] = [
  { key: "parq", label: "PAR-Q", full: "PAR-Q health screening" },
  { key: "gp", label: "GP clearance", full: "GP / specialist clearance" },
  { key: "agreement", label: "Agreement", full: "Training agreement" },
  { key: "risk", label: "Risk", full: "Exercise risk assessment" },
  { key: "consent", label: "Consent", full: "Data & photo consent" },
];

const ST_ORDER: Record<DocState, number> = { exp: 0, out: 1, pend: 2, due: 3, ok: 4, dec: 5, na: 6 };
const ST_LABEL: Record<DocState, string> = { exp: "Expired", out: "Outstanding", pend: "Requested", due: "Due", ok: "Valid", dec: "Declined", na: "N/A" };

const STATUS_ORDER: Record<TrackerClient["complianceStatus"], number> = { do_not_train: 0, pending_medical: 1, action_needed: 2, clear: 3 };

const STATUS_DOT: Record<TrackerClient["complianceStatus"] | "attention", string> = {
  do_not_train: "var(--status-danger)",
  pending_medical: "var(--status-warning)",
  action_needed: "var(--status-warning)",
  clear: "var(--status-success)",
  attention: "var(--status-primary)",
};

const DUE_WINDOW = 45;

/* ─── helpers ───────────────────────────────────────────────── */

function fmtShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  const m = d.toLocaleDateString("en-GB", { month: "short" }).replace(".", "").slice(0, 3);
  return d.getDate() + " " + m + " " + String(d.getFullYear()).slice(2);
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysFrom(iso: string | null, from: Date): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso + "T00:00:00").getTime() - from.getTime()) / 86400000);
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function isIssue(st: DocState): boolean {
  return st === "exp" || st === "out" || st === "pend" || st === "due";
}

/* ─── KPI icons ──────────────────────────────────────────────── */

function IconCircleSlash({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}

function IconCalendarClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M12 14v4" />
    </svg>
  );
}

function IconDocClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M12 18v-6M9 15h6" />
    </svg>
  );
}

function IconCheckSquare({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

/* ─── component ─────────────────────────────────────────────── */

export function MedicalTracker({ clients }: MedicalTrackerProps) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);

  /* ── state ─────────────────────────────────────────── */
  const [view, setView] = useState<"matrix" | "register">("matrix");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [docFilter, setDocFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("status");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  /* ── derived: flatten register view ─────────────────── */
  const register = useMemo<RegisterRow[]>(() => {
    const rows: RegisterRow[] = [];
    for (const c of clients) {
      for (const dk of DOC_KINDS) {
        const doc = c.documents[dk.key];
        if (!doc || doc.state === "na") continue;
        rows.push({
          clientId: c.id,
          clientNumber: c.clientNumber,
          clientName: c.name,
          complianceStatus: c.complianceStatus,
          docKey: dk.key,
          docLabel: dk.full,
          state: doc.state,
          signedDate: doc.signedDate,
          expiryDate: doc.expiryDate,
          note: doc.note,
        });
      }
    }
    return rows;
  }, [clients]);

  /* ── helpers ────────────────────────────────────────── */
  function matchStatus(s: TrackerClient["complianceStatus"]) {
    if (statusFilter === "all") return true;
    if (statusFilter === "attention") return s !== "clear";
    return s === statusFilter;
  }
  function matchDocState(st: DocState) {
    if (stateFilter === "all") return true;
    if (stateFilter === "issue") return isIssue(st);
    if (stateFilter === "out") return st === "out" || st === "exp";
    return st === stateFilter;
  }
  function matchReview(reviewDate: string | null) {
    if (reviewFilter === "all") return true;
    const d = daysFrom(reviewDate, today);
    if (d === null) return false;
    if (reviewFilter === "overdue") return d < 0;
    return d >= 0 && d <= parseInt(reviewFilter, 10);
  }

  /* ── filtered/sorted matrix ─────────────────────────── */
  const matrixRows = useMemo(() => {
    const term = search.toLowerCase();
    let out = clients.filter((c) => {
      if (term) {
        const hay = [c.name, ...c.conditions, ...DOC_KINDS.map((dk) => `${dk.full} ${c.documents[dk.key]?.note ?? ""}`)].join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (!matchStatus(c.complianceStatus)) return false;
      if (!matchReview(c.nextReview)) return false;
      if (docFilter === "all") {
        if (stateFilter !== "all" && !DOC_KINDS.some((dk) => {
          const d = c.documents[dk.key];
          return d && matchDocState(d.state);
        })) return false;
      } else {
        const dk = DOC_KINDS.find((d) => d.key === docFilter);
        if (dk) {
          const d = c.documents[dk.key];
          if (!d || !matchDocState(d.state)) return false;
        }
      }
      return true;
    });
    const dir = sortDir;
    out.sort((a, b) => {
      let x: number | string, y: number | string;
      if (sortKey === "name") { x = a.name.toLowerCase(); y = b.name.toLowerCase(); }
      else if (sortKey === "status") { x = STATUS_ORDER[a.complianceStatus]; y = STATUS_ORDER[b.complianceStatus]; }
      else if (sortKey === "review") { x = a.nextReview ?? "9999"; y = b.nextReview ?? "9999"; }
      else if (sortKey === "cond") { x = a.conditions.length; y = b.conditions.length; }
      else {
        const dk = sortKey as keyof TrackerClient["documents"];
        const da = a.documents[dk]; const db = b.documents[dk];
        x = da ? ST_ORDER[da.state] : 99; y = db ? ST_ORDER[db.state] : 99;
      }
      if (x < y) return -dir;
      if (x > y) return dir;
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [clients, search, statusFilter, docFilter, stateFilter, reviewFilter, sortKey, sortDir, today]);

  /* ── filtered/sorted register ───────────────────────── */
  const registerRows = useMemo(() => {
    const term = search.toLowerCase();
    let out = register.filter((r) => {
      if (term) {
        const hay = [r.clientName, r.docLabel, r.note ?? ""].join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (!matchStatus(r.complianceStatus)) return false;
      if (docFilter !== "all" && r.docKey !== docFilter) return false;
      if (!matchDocState(r.state)) return false;
      const c = clients.find((cc) => cc.id === r.clientId);
      if (c && !matchReview(c.nextReview)) return false;
      return true;
    });
    const dir = sortDir;
    out.sort((a, b) => {
      let x: number | string, y: number | string;
      if (sortKey === "st") { x = ST_ORDER[a.state]; y = ST_ORDER[b.state]; }
      else if (sortKey === "client") { x = a.clientName.toLowerCase(); y = b.clientName.toLowerCase(); }
      else if (sortKey === "doc") { x = a.docLabel.toLowerCase(); y = b.docLabel.toLowerCase(); }
      else if (sortKey === "signed") { x = a.signedDate ?? "9999"; y = b.signedDate ?? "9999"; }
      else { x = a.expiryDate ?? "9999"; y = b.expiryDate ?? "9999"; }
      if (x < y) return -dir;
      if (x > y) return dir;
      return a.clientName.localeCompare(b.clientName);
    });
    return out;
  }, [register, search, statusFilter, docFilter, stateFilter, reviewFilter, sortKey, sortDir, clients, today]);

  const currentRows = view === "matrix" ? matrixRows : registerRows;
  const pageCount = Math.max(1, Math.ceil(currentRows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const paged = currentRows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  /* ── KPIs ───────────────────────────────────────────── */
  const kpis = useMemo(() => {
    let dnt = 0, pend = 0, over = 0, soon = 0, clr = 0;
    for (const c of clients) {
      if (c.complianceStatus === "do_not_train") dnt++;
      if (c.complianceStatus === "pending_medical") pend++;
      if (c.complianceStatus === "clear") clr++;
      const rd = daysFrom(c.nextReview, today);
      if (rd !== null && rd < 0) over++;
      const hasSoon = DOC_KINDS.some((dk) => {
        const doc = c.documents[dk.key];
        if (!doc || !doc.expiryDate) return false;
        const d = daysFrom(doc.expiryDate, today);
        return d !== null && d >= 0 && d <= 30;
      });
      if (hasSoon && c.complianceStatus !== "do_not_train") soon++;
    }
    return { dnt, pend, over, soon, clr };
  }, [clients, today]);

  const dntClients = useMemo(() => clients.filter((c) => c.complianceStatus === "do_not_train"), [clients]);

  /* ── status chip counts ─────────────────────────────── */
  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = { all: clients.length, attention: 0 };
    for (const c of clients) {
      counts[c.complianceStatus] = (counts[c.complianceStatus] ?? 0) + 1;
      if (c.complianceStatus !== "clear") counts.attention++;
    }
    return counts;
  }, [clients]);

  /* ── handlers ────────────────────────────────────────── */
  const anyFilter = search !== "" || statusFilter !== "all" || docFilter !== "all" || stateFilter !== "all" || reviewFilter !== "all";

  const resetAll = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setDocFilter("all");
    setStateFilter("all");
    setReviewFilter("all");
    setPage(0);
  }, []);

  const handleKpiClick = useCallback((kpi: string) => {
    if (kpi === "__overdue" || kpi === "__soon") {
      const want = kpi === "__overdue" ? "overdue" : "30";
      setReviewFilter((prev) => prev === want ? "all" : want);
    } else {
      setStatusFilter((prev) => prev === kpi ? "all" : kpi);
    }
    setPage(0);
  }, []);

  const isKpiActive = useCallback((kpi: string) => {
    if (kpi === "__overdue") return reviewFilter === "overdue";
    if (kpi === "__soon") return reviewFilter === "30";
    return statusFilter === kpi;
  }, [statusFilter, reviewFilter]);

  /* ── document state cell ────────────────────────────── */
  function docStateCell(doc: DocInfo | null, key: string) {
    if (!doc) return <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-[12.5px] tabular-nums text-muted-foreground"><i className="w-2 h-2 rounded-full shrink-0 bg-[var(--hub-field-border)]" />—</span>;
    const st = doc.state;
    let txt: string;
    if (st === "ok") txt = fmtShort(doc.expiryDate ?? doc.signedDate);
    else if (st === "due") txt = "Due " + fmtShort(doc.expiryDate);
    else if (st === "exp") txt = "Expired " + fmtShort(doc.expiryDate);
    else if (st === "out") txt = "Outstanding";
    else if (st === "pend") txt = "Requested";
    else if (st === "dec") txt = "Declined";
    else txt = "N/A";

    const colorMap: Record<string, string> = {
      ok: "bg-[var(--status-success)]",
      due: "bg-[var(--status-warning)]",
      exp: "bg-[var(--status-danger)]",
      out: "bg-[var(--status-danger)]",
      pend: "bg-[var(--status-warning)]",
      dec: "bg-[var(--hub-field-border)]",
      na: "bg-[var(--hub-field-border)]",
    };
    const textMap: Record<string, string> = {
      ok: "text-[var(--color-body)]",
      due: "text-[var(--status-warning)] font-semibold",
      pend: "text-[var(--status-warning)] font-semibold",
      exp: "text-[var(--status-danger)] font-semibold",
      out: "text-[var(--status-danger)] font-semibold",
      dec: "text-muted-foreground",
      na: "text-muted-foreground",
    };
    const title = doc.note ?? (doc.signedDate ? "Signed " + fmt(doc.signedDate) : ST_LABEL[st]);
    return (
      <span className={cn("inline-flex items-center gap-[7px] whitespace-nowrap text-[12.5px] tabular-nums", textMap[st] ?? "")} title={title}>
        <i className={cn("w-2 h-2 rounded-full shrink-0", colorMap[st] ?? "")} />
        {txt}
      </span>
    );
  }

  /* ───────────────────────────────────────────────────── */
  const matrixSORT_OPTS = [
    { k: "name", label: "Client name" }, { k: "status", label: "Compliance status" },
    { k: "review", label: "Next review" }, { k: "cond", label: "Condition count" },
    ...DOC_KINDS.map((dk) => ({ k: dk.key, label: dk.label + " state" })),
  ];
  const registerSORT_OPTS = [
    { k: "st", label: "Urgency" }, { k: "client", label: "Client name" },
    { k: "doc", label: "Document" }, { k: "signed", label: "Date signed" },
    { k: "expires", label: "Expiry date" },
  ];
  const sortOpts = view === "matrix" ? matrixSORT_OPTS : registerSORT_OPTS;

  return (
    <div className="space-y-[18px]">
      {/* ── Page header ─────────────────────────────── */}
      <HubPageHeader
        title="Medical &amp; Compliance Tracker"
        subtitle="Every mandatory record across the roster, with what has lapsed and what falls due next"
        actions={
          <>
            <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] bg-white px-3.5 py-[7px] text-[13px] font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors focus:outline-none focus:ring-[3px] focus:ring-[rgba(193,131,159,.35)]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>
              Export
            </button>
            <Link href="/hub/clients" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-rose)] px-3.5 py-[7px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity focus:outline-none focus:ring-[3px] focus:ring-[rgba(193,131,159,.35)]">
              <IconShieldCheck className="w-[15px] h-[15px]" />
              Record clearance
            </Link>
          </>
        }
      />

      {/* ── DNT alert ───────────────────────────────── */}
      {dntClients.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl p-3.5 bg-[var(--status-danger-solid)] text-white" role="alert">
          <IconAlertTriangle className="w-[18px] h-[18px] shrink-0 mt-px" />
          <div>
            <p className="text-[13.5px] font-bold">Do Not Train — {dntClients.length} {dntClients.length === 1 ? "client" : "clients"}</p>
            <p className="text-[13px] text-white/80 mt-0.5">{dntClients.map((c) => c.name).join(", ")} {dntClients.length === 1 ? "has" : "have"} no valid clearance on file. Sessions stay suspended until written clearance is received and recorded here.</p>
          </div>
          <button type="button" className="ml-auto shrink-0 self-center rounded-lg border border-white/40 px-3 py-1.5 text-[12.5px] font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors" onClick={() => setStatusFilter("do_not_train")}>
            Show only these
          </button>
        </div>
      )}

      {/* ── KPI band ─────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3.5 max-[1100px]:grid-cols-2 max-[620px]:grid-cols-1" role="group" aria-label="Compliance summary — select a tile to filter">
        <button type="button" className={cn("bg-white border rounded-2xl shadow-sm p-4 flex items-center gap-3.5 text-left font-[inherit] cursor-pointer transition-colors hover:bg-[var(--hub-hover)] hover:border-[var(--hub-field-border)]", isKpiActive("do_not_train") ? "border-[var(--color-rose)] shadow-[0_0_0_3px_rgba(193,131,159,.15)]" : "border-[var(--hub-border)]")} onClick={() => handleKpiClick("do_not_train")}>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
            <IconCircleSlash className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-muted-foreground">Do Not Train</span>
            <span className="block text-2xl font-bold tabular-nums text-foreground leading-tight">{kpis.dnt}</span>
          </span>
        </button>
        <button type="button" className={cn("bg-white border rounded-2xl shadow-sm p-4 flex items-center gap-3.5 text-left font-[inherit] cursor-pointer transition-colors hover:bg-[var(--hub-hover)] hover:border-[var(--hub-field-border)]", isKpiActive("pending_medical") ? "border-[var(--color-rose)] shadow-[0_0_0_3px_rgba(193,131,159,.15)]" : "border-[var(--hub-border)]")} onClick={() => handleKpiClick("pending_medical")}>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[var(--status-warning-bg)] text-[var(--status-warning)]">
            <IconClock className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-muted-foreground">Pending clearance</span>
            <span className="block text-2xl font-bold tabular-nums text-foreground leading-tight">{kpis.pend}</span>
          </span>
        </button>
        <button type="button" className={cn("bg-white border rounded-2xl shadow-sm p-4 flex items-center gap-3.5 text-left font-[inherit] cursor-pointer transition-colors hover:bg-[var(--hub-hover)] hover:border-[var(--hub-field-border)]", isKpiActive("__overdue") ? "border-[var(--color-rose)] shadow-[0_0_0_3px_rgba(193,131,159,.15)]" : "border-[var(--hub-border)]")} onClick={() => handleKpiClick("__overdue")}>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
            <IconCalendarClock className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-muted-foreground">Reviews overdue</span>
            <span className="block text-2xl font-bold tabular-nums text-foreground leading-tight">{kpis.over}</span>
          </span>
        </button>
        <button type="button" className={cn("bg-white border rounded-2xl shadow-sm p-4 flex items-center gap-3.5 text-left font-[inherit] cursor-pointer transition-colors hover:bg-[var(--hub-hover)] hover:border-[var(--hub-field-border)]", isKpiActive("__soon") ? "border-[var(--color-rose)] shadow-[0_0_0_3px_rgba(193,131,159,.15)]" : "border-[var(--hub-border)]")} onClick={() => handleKpiClick("__soon")}>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[var(--status-warning-bg)] text-[var(--status-warning)]">
            <IconDocClock className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-muted-foreground">Expiring ≤ 30 days</span>
            <span className="block text-2xl font-bold tabular-nums text-foreground leading-tight">{kpis.soon}</span>
          </span>
        </button>
        <button type="button" className={cn("bg-white border rounded-2xl shadow-sm p-4 flex items-center gap-3.5 text-left font-[inherit] cursor-pointer transition-colors hover:bg-[var(--hub-hover)] hover:border-[var(--hub-field-border)]", isKpiActive("clear") ? "border-[var(--color-rose)] shadow-[0_0_0_3px_rgba(193,131,159,.15)]" : "border-[var(--hub-border)]")} onClick={() => handleKpiClick("clear")}>
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[var(--status-success-bg)] text-[var(--status-success)]">
            <IconCheckSquare className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-muted-foreground">Fully compliant</span>
            <span className="block text-2xl font-bold tabular-nums text-foreground leading-tight">{kpis.clr}</span>
          </span>
        </button>
      </div>

      {/* ── Card ──────────────────────────────────────── */}
      <HubCard padded={false}>
        {/* Card header + seg toggle */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--hub-border)] flex-wrap">
          <div>
            <div className="text-[13.5px] font-bold text-foreground">Compliance register</div>
            <div className="text-[12.5px] text-muted-foreground">Derived from document dates — never set by hand</div>
          </div>
          <div className="inline-flex ml-auto bg-[var(--hub-canvas)] border border-[var(--hub-border)] rounded-[10px] p-[3px] gap-0.5" role="tablist" aria-label="Tracker view">
            <button type="button" role="tab" aria-selected={view === "matrix"} className={cn("border-0 rounded-[7px] bg-transparent font-[inherit] text-[12.5px] font-semibold px-3.5 py-1.5 cursor-pointer transition-colors", view === "matrix" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} onClick={() => { setView("matrix"); setSortKey("status"); setSortDir(1); setPage(0); }}>
              By client
            </button>
            <button type="button" role="tab" aria-selected={view === "register"} className={cn("border-0 rounded-[7px] bg-transparent font-[inherit] text-[12.5px] font-semibold px-3.5 py-1.5 cursor-pointer transition-colors", view === "register" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} onClick={() => { setView("register"); setSortKey("st"); setSortDir(1); setPage(0); }}>
              By document
            </button>
          </div>
        </div>

        {/* Search toolbar */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--hub-border)] flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search by client, condition or document…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full h-10 rounded-lg border border-[var(--hub-field-border)] bg-white pl-[34px] pr-[34px] text-[13px] text-foreground placeholder:text-muted-foreground font-[inherit] outline-none hover:border-[var(--hub-field-border-hover)] focus:border-[var(--color-rose)] focus:ring-[3px] focus:ring-[rgba(193,131,159,.3)]"
            />
            {search && (
              <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-md border-0 bg-transparent text-muted-foreground cursor-pointer grid place-items-center hover:bg-[var(--hub-hover)] hover:text-foreground" onClick={() => { setSearch(""); setPage(0); }} aria-label="Clear search">
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-[12.5px] text-muted-foreground whitespace-nowrap tabular-nums" aria-live="polite">
            {view === "matrix" ? `${currentRows.length} ${currentRows.length === 1 ? "client" : "clients"}` : `${currentRows.length} ${currentRows.length === 1 ? "record" : "records"}`}
          </span>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-[var(--hub-border)]" role="group" aria-label="Filter by compliance status">
          {[
            { v: "all", label: "All clients", dot: null },
            { v: "attention", label: "Needs attention", dot: STATUS_DOT.attention },
            { v: "do_not_train", label: "Do Not Train", dot: STATUS_DOT.do_not_train },
            { v: "pending_medical", label: "Pending Clearance", dot: STATUS_DOT.pending_medical },
            { v: "action_needed", label: "Action Needed", dot: STATUS_DOT.action_needed },
            { v: "clear", label: "Clear", dot: STATUS_DOT.clear },
          ].map((chip) => (
            <button
              key={chip.v}
              type="button"
              className={cn(
                "inline-flex items-center gap-[7px] rounded-full border px-3 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors",
                statusFilter === chip.v
                  ? "bg-[var(--hub-sidebar-active)] border-[var(--status-primary-border)] text-foreground font-semibold"
                  : "bg-white border-[var(--hub-border)] text-muted-foreground hover:text-foreground hover:border-[var(--hub-field-border)]",
              )}
              onClick={() => { setStatusFilter(chip.v); setPage(0); }}
              aria-pressed={statusFilter === chip.v}
            >
              {chip.dot && <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: chip.dot }} />}
              {chip.label}
              <span className={cn("min-w-[18px] rounded-full border px-[5px] text-[11px] font-bold tabular-nums text-center", statusFilter === chip.v ? "bg-[var(--status-primary-bg)] border-[var(--status-primary-border)] text-[var(--status-primary)]" : "bg-[var(--hub-canvas)] border-[var(--hub-border)]")}>
                {chipCounts[chip.v] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-end gap-3.5 flex-wrap px-4 py-3 border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
          <div className="inline-flex items-center gap-[7px]">
            <label htmlFor="docSel" className="text-xs font-medium text-muted-foreground shrink-0">Document</label>
            <select id="docSel" className="h-[34px] rounded-lg border border-[var(--hub-field-border)] bg-white px-2.5 text-[13px] text-foreground font-[inherit] cursor-pointer outline-none hover:border-[var(--hub-field-border-hover)] focus:border-[var(--color-rose)] focus:ring-[3px] focus:ring-[rgba(193,131,159,.3)]" value={docFilter} onChange={(e) => { setDocFilter(e.target.value); setPage(0); }}>
              <option value="all">All documents</option>
              {DOC_KINDS.map((dk) => (
                <option key={dk.key} value={dk.key}>{dk.full}</option>
              ))}
            </select>
          </div>
          <div className="inline-flex items-center gap-[7px]">
            <label htmlFor="stateSel" className="text-xs font-medium text-muted-foreground shrink-0">State</label>
            <select id="stateSel" className="h-[34px] rounded-lg border border-[var(--hub-field-border)] bg-white px-2.5 text-[13px] text-foreground font-[inherit] cursor-pointer outline-none hover:border-[var(--hub-field-border-hover)] focus:border-[var(--color-rose)] focus:ring-[3px] focus:ring-[rgba(193,131,159,.3)]" value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(0); }}>
              <option value="all">Any state</option>
              <option value="issue">Anything outstanding</option>
              <option value="out">Outstanding / expired</option>
              <option value="due">Due soon</option>
              <option value="pend">Requested — awaiting</option>
              <option value="ok">Valid</option>
            </select>
          </div>
          <div className="inline-flex items-center gap-[7px]">
            <label htmlFor="reviewSel" className="text-xs font-medium text-muted-foreground shrink-0">Review</label>
            <select id="reviewSel" className="h-[34px] rounded-lg border border-[var(--hub-field-border)] bg-white px-2.5 text-[13px] text-foreground font-[inherit] cursor-pointer outline-none hover:border-[var(--hub-field-border-hover)] focus:border-[var(--color-rose)] focus:ring-[3px] focus:ring-[rgba(193,131,159,.3)]" value={reviewFilter} onChange={(e) => { setReviewFilter(e.target.value); setPage(0); }}>
              <option value="all">Any date</option>
              <option value="overdue">Overdue</option>
              <option value="30">Next 30 days</option>
              <option value="90">Next 90 days</option>
            </select>
          </div>
          <div className="inline-flex items-center gap-[7px]">
            <label htmlFor="sortSel" className="text-xs font-medium text-muted-foreground shrink-0">Sort</label>
            <select id="sortSel" className="h-[34px] rounded-lg border border-[var(--hub-field-border)] bg-white px-2.5 text-[13px] text-foreground font-[inherit] cursor-pointer outline-none hover:border-[var(--hub-field-border-hover)] focus:border-[var(--color-rose)] focus:ring-[3px] focus:ring-[rgba(193,131,159,.3)]" value={sortKey} onChange={(e) => { setSortKey(e.target.value); setPage(0); }}>
              {sortOpts.map((o) => (
                <option key={o.k} value={o.k}>{o.label}</option>
              ))}
            </select>
            <button type="button" className="w-[34px] h-[34px] shrink-0 rounded-lg border border-[var(--hub-field-border)] bg-white text-muted-foreground grid place-items-center cursor-pointer text-sm hover:text-foreground hover:border-[var(--hub-field-border-hover)]" onClick={() => setSortDir((d) => (d === 1 ? -1 : 1))} aria-label="Toggle sort direction" title={sortDir === 1 ? "Ascending" : "Descending"}>
              {sortDir === 1 ? "↑" : "↓"}
            </button>
          </div>
          <button type="button" className={cn("ml-auto border-0 bg-transparent py-1.5 px-0.5 text-[12.5px] font-semibold text-muted-foreground cursor-pointer underline underline-offset-[3px] hover:text-foreground", anyFilter ? "visible" : "invisible")} onClick={resetAll}>
            Clear all filters
          </button>
        </div>

        {/* ── Table ─────────────────────────────────── */}
        {currentRows.length === 0 ? (
          <EmptyState
            icon={<IconShieldCheck className="w-6 h-6" />}
            title="Nothing matches these filters."
            description="Widen the search, or clear the status and document filters to see the full roster."
            cta={{ label: "Clear all filters", onClick: resetAll }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              {view === "matrix" ? (
                <>
                  <thead>
                    <tr>
                      {[
                        { k: "name", label: "Client" },
                        { k: "status", label: "Status" },
                        { k: "review", label: "Next review" },
                        { k: "parq", label: "PAR-Q" },
                        { k: "gp", label: "GP clearance" },
                        { k: "agreement", label: "Agreement", cls: "max-[1000px]:hidden" },
                        { k: "risk", label: "Risk", cls: "max-[1240px]:hidden" },
                        { k: "consent", label: "Consent", cls: "max-[1240px]:hidden" },
                      ].map((h) => (
                        <th key={h.k} className={cn("text-left text-[11px] font-semibold uppercase tracking-[.05em] text-muted-foreground bg-[var(--hub-hover)] px-3 h-10 border-b border-[var(--hub-border)] whitespace-nowrap cursor-pointer select-none hover:text-foreground", h.cls)} onClick={() => { if (sortKey === h.k) setSortDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(h.k); setSortDir(1); } }}>
                          <span className="inline-flex items-center gap-1">
                            {h.label}
                            {sortKey === h.k && <span className="text-[var(--color-rose)]">{sortDir === 1 ? "↑" : "↓"}</span>}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((c) => {
                      const s = getComplianceStatus(c.complianceStatus);
                      let reviewCell: React.ReactNode;
                      const rd = daysFrom(c.nextReview, today);
                      if (rd !== null && rd < 0) {
                        reviewCell = <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-[12.5px] tabular-nums text-[var(--status-danger)] font-semibold"><i className="w-2 h-2 rounded-full shrink-0 bg-[var(--status-danger)]" />{fmtShort(c.nextReview)} · {Math.abs(rd)}d late</span>;
                      } else if (rd !== null && rd <= DUE_WINDOW) {
                        reviewCell = <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-[12.5px] tabular-nums text-[var(--status-warning)] font-semibold"><i className="w-2 h-2 rounded-full shrink-0 bg-[var(--status-warning)]" />{fmtShort(c.nextReview)} · in {rd}d</span>;
                      } else {
                        reviewCell = <span className="whitespace-nowrap text-muted-foreground">{fmtShort(c.nextReview)}</span>;
                      }
                      const more = c.conditions.length > 1 ? " +" + (c.conditions.length - 1) : "";
                      return (
                        <tr key={c.id} className="cursor-pointer transition-colors hover:bg-[var(--hub-hover)] border-b border-[var(--hub-border)] last:border-b-0" tabIndex={0} onClick={() => router.push(`/hub/clients/${c.clientNumber}`)} onKeyDown={(e) => { if (e.key === "Enter") router.push(`/hub/clients/${c.clientNumber}`); }}>
                          <td className="py-2.5 px-3 min-w-[230px]">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-[34px] h-[34px] rounded-full bg-[rgba(193,131,159,.15)] text-[var(--color-rose)] grid place-items-center text-[12.5px] font-bold shrink-0">{initials(c.name)}</div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground">{c.name}</div>
                                <div className="text-[11.5px] text-muted-foreground leading-[1.3] max-w-[210px] truncate" title={c.conditions.join(", ")}>#{c.clientNumber} · {c.conditions[0] ?? "—"}{more}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3"><StatusBadge status={c.complianceStatus} /></td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{reviewCell}</td>
                          <td className="py-2.5 px-3">{docStateCell(c.documents.parq, "parq")}</td>
                          <td className="py-2.5 px-3">{docStateCell(c.documents.gp, "gp")}</td>
                          <td className="py-2.5 px-3 max-[1000px]:hidden">{docStateCell(c.documents.agreement, "agreement")}</td>
                          <td className="py-2.5 px-3 max-[1240px]:hidden">{docStateCell(c.documents.risk, "risk")}</td>
                          <td className="py-2.5 px-3 max-[1240px]:hidden">{docStateCell(c.documents.consent, "consent")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              ) : (
                <>
                  <thead>
                    <tr>
                      {[
                        { k: "client", label: "Client" },
                        { k: "doc", label: "Document" },
                        { k: "st", label: "State" },
                        { k: "signed", label: "Signed", cls: "max-[1000px]:hidden" },
                        { k: "expires", label: "Expires / due", cls: "max-[1240px]:hidden" },
                        { k: "note", label: "Detail", cls: "max-[1240px]:hidden" },
                        { k: "action", label: "" },
                      ].map((h) => (
                        <th key={h.k} className={cn("text-left text-[11px] font-semibold uppercase tracking-[.05em] text-muted-foreground bg-[var(--hub-hover)] px-3 h-10 border-b border-[var(--hub-border)] whitespace-nowrap cursor-pointer select-none hover:text-foreground", h.cls, !h.k && "w-0")} onClick={() => { if (h.k) { if (sortKey === h.k) setSortDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(h.k); setSortDir(1); } } }}>
                          {h.label && (
                            <span className="inline-flex items-center gap-1">
                              {h.label}
                              {sortKey === h.k && <span className="text-[var(--color-rose)]">{sortDir === 1 ? "↑" : "↓"}</span>}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((r, i) => {
                      const isOutstanding = r.state === "out" || r.state === "exp";
                      const isPending = r.state === "pend";
                      const isDue = r.state === "due";
                      const action = isOutstanding ? "Chase" : isPending ? "Follow up" : isDue ? "Send" : "View";
                      const dueIn = daysFrom(r.expiryDate, today);
                      const colorMap: Record<string, string> = {
                        ok: "bg-[var(--status-success)] text-[var(--color-body)]",
                        due: "bg-[var(--status-warning)] text-[var(--status-warning)] font-semibold",
                        exp: "bg-[var(--status-danger)] text-[var(--status-danger)] font-semibold",
                        out: "bg-[var(--status-danger)] text-[var(--status-danger)] font-semibold",
                        pend: "bg-[var(--status-warning)] text-[var(--status-warning)] font-semibold",
                        dec: "bg-[var(--hub-field-border)] text-muted-foreground",
                        na: "bg-[var(--hub-field-border)] text-muted-foreground",
                      };
                      return (
                        <tr key={`${r.clientId}-${r.docKey}`} className="cursor-pointer transition-colors hover:bg-[var(--hub-hover)] border-b border-[var(--hub-border)] last:border-b-0" tabIndex={0} onClick={() => router.push(`/hub/clients/${r.clientNumber}`)} onKeyDown={(e) => { if (e.key === "Enter") router.push(`/hub/clients/${r.clientNumber}`); }}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-[34px] h-[34px] rounded-full bg-[rgba(193,131,159,.15)] text-[var(--color-rose)] grid place-items-center text-[12.5px] font-bold shrink-0">{initials(r.clientName)}</div>
                              <span className="font-semibold text-foreground">{r.clientName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3"><span className="font-medium text-foreground">{r.docLabel}</span></td>
                          <td className="py-2.5 px-3">
                            <span className={cn("inline-flex items-center gap-[7px] whitespace-nowrap text-[12.5px] tabular-nums", colorMap[r.state]?.split(" ").slice(1).join(" ") ?? "")}>
                              <i className={cn("w-2 h-2 rounded-full shrink-0", colorMap[r.state]?.split(" ")[0] ?? "")} />
                              {ST_LABEL[r.state]}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap max-[1000px]:hidden">{fmtShort(r.signedDate)}</td>
                          <td className={cn("py-2.5 px-3 whitespace-nowrap max-[1240px]:hidden", dueIn !== null && dueIn < 0 ? "text-[var(--status-danger)] font-semibold" : "text-muted-foreground")}>
                            {r.expiryDate ? fmtShort(r.expiryDate) + (dueIn !== null ? (dueIn < 0 ? " · " + Math.abs(dueIn) + "d late" : " · in " + dueIn + "d") : "") : "—"}
                          </td>
                          <td className="py-2.5 px-3 max-[1240px]:hidden"><span className="text-[12.5px] text-muted-foreground">{r.note || "—"}</span></td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Link href={`/hub/clients/${r.clientNumber}`} className="text-foreground font-semibold no-underline border-b border-[var(--hub-field-border)] hover:border-[var(--color-rose)]" onClick={(e) => e.stopPropagation()}>{action}</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}

        {/* Legend */}
        {currentRows.length > 0 && (
          <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-[var(--hub-border)] bg-[var(--hub-hover)] text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-xs"><i className="w-2 h-2 rounded-full shrink-0 bg-[var(--status-success)]" />Valid</span>
            <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-xs text-[var(--status-warning)] font-semibold"><i className="w-2 h-2 rounded-full shrink-0 bg-[var(--status-warning)]" />Due within 45 days</span>
            <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-xs text-[var(--status-warning)] font-semibold"><i className="w-2 h-2 rounded-full shrink-0 bg-[var(--status-warning)]" />Requested — awaiting</span>
            <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-xs text-[var(--status-danger)] font-semibold"><i className="w-2 h-2 rounded-full shrink-0 bg-[var(--status-danger)]" />Outstanding or expired</span>
            <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-xs text-muted-foreground"><i className="w-2 h-2 rounded-full shrink-0 bg-[var(--hub-field-border)]" />Not applicable / declined</span>
          </div>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center gap-2.5 px-4 py-3 border-t border-[var(--hub-border)]">
            <span className="text-[12.5px] text-muted-foreground tabular-nums">
              Showing {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, currentRows.length)} of {currentRows.length} {view === "matrix" ? "clients" : "document records"}
            </span>
            <div className="ml-auto flex gap-1.5">
              <button type="button" className="w-8 h-8 rounded-lg border border-[var(--hub-border)] bg-white text-[var(--color-body)] cursor-pointer grid place-items-center hover:bg-[var(--hub-hover)] disabled:opacity-40 disabled:cursor-default" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous page">‹</button>
              <button type="button" className="w-8 h-8 rounded-lg border border-[var(--hub-border)] bg-white text-[var(--color-body)] cursor-pointer grid place-items-center hover:bg-[var(--hub-hover)] disabled:opacity-40 disabled:cursor-default" disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} aria-label="Next page">›</button>
            </div>
          </div>
        )}
      </HubCard>
    </div>
  );
}
