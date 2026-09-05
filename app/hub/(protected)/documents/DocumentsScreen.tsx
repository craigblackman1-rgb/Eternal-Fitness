"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { StatusBadge, TokenPill } from "@/components/hub/StatusBadge";
import { DocumentRowActions } from "@/components/hub/DocumentRowActions";
import { OpenUploadButton } from "@/components/hub/OpenUploadButton";
import { IconPlus, IconFileText } from "@/components/icons";
import { DOCUMENT_KIND_LABEL, type DocumentKind } from "@/lib/documents/types";
import { AVAILABLE_KINDS } from "../clients/[id]/documents/NewDocumentButton";

/* ── S7 Documents screen (design-systems v3/10-documents.html) ────────────
   Two sections, one drawer standard, matching the shipped V3 idiom
   (ClientsScreen.tsx, schedule/triage/page.tsx): queue chrome in Tailwind
   utilities, drawer content in the project's literal .fcard/.frow/.bdg
   classes (globals.css), same split ClientDrawers.tsx already uses.

   HARD RULE follow-through, logged here since it's a deliberate departure
   from the mockup's own Q3 reasoning: the mockup drops the signed/sent
   date-range filters, arguing the queue above does that chasing instead.
   This build keeps both — dropping a filter nobody asked to lose is exactly
   the kind of silent regression the brief said never to make. They're kept
   as two extra selects rather than three, not removed. */

export interface DocumentRow {
  id: string;
  clientName: string;
  clientNumber: number | null;
  hasEmail: boolean;
  kind: string;
  title: string;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string | null;
  emailed: boolean | null;
  signedAt: string | null;
  sentAt: string | null;
  sourceType: "generated" | "scan";
  sourceFileName: string | null;
  sourceFileMime: string | null;
  sourceFileSize: number | null;
  consentChoices: Record<string, boolean> | null;
  supersededByVersion: number | null;
  requiresClientSignature: boolean;
  requiresTrainerSignature: boolean;
  clientSigned: boolean;
  trainerSigned: boolean;
}

export interface QueueItem {
  id: string;
  tone: "danger" | "warn" | "neutral";
  headline: string;
  subline: string;
  docId: string;
  status: string;
  hasEmail: boolean;
  clientName: string;
}

export interface ClientOption {
  clientNumber: number;
  name: string;
}

const DOT: Record<QueueItem["tone"], string> = {
  danger: "bg-[var(--status-danger)]",
  warn: "bg-[var(--status-warning)]",
  neutral: "bg-[var(--color-muted)]",
};

function fmt(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysAgo(iso: string | null): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

function withinPreset(iso: string | null, preset: string): boolean {
  if (preset === "any") return true;
  if (preset === "none") return !iso;
  return iso != null && daysAgo(iso) <= Number(preset);
}

function InitialsCircle({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
  return (
    <div className="w-8 h-8 rounded-pill bg-rose/15 text-rose flex items-center justify-center text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

/* ── Drawer dismiss/focus behaviour — matches DrawerManager.tsx (client
   record drawers): Esc dismisses, focus moves to the heading on open, and
   returns to the opener on close. These are plain inline drawers (not run
   through DrawerManager), so the same behaviour is reproduced locally. */
function useDrawerA11y(onClose: () => void, headingRef: RefObject<HTMLElement | null>) {
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    headingRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);

    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
      openerRef.current?.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

const statusFilters = [
  { value: "all", label: "All statuses" },
  { value: "attention", label: "Needs attention" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "signed", label: "Signed" },
  { value: "superseded", label: "Superseded" },
] as const;

const dateRangeFilters = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "none", label: "None" },
] as const;

export function DocumentsScreen({
  rows,
  queue,
  clientOptions,
  totalCount,
}: {
  rows: DocumentRow[];
  queue: QueueItem[];
  clientOptions: ClientOption[];
  totalCount: number;
}) {
  const [drawerDocId, setDrawerDocId] = useState<string | null>(null);
  const [newDocOpen, setNewDocOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]["value"]>("all");
  const [signedFilter, setSignedFilter] = useState("any");
  const [sentFilter, setSentFilter] = useState("any");

  const kindOptions = useMemo(() => {
    const present = Array.from(new Set(rows.map((r) => r.kind)));
    return present
      .map((k) => ({ value: k, label: DOCUMENT_KIND_LABEL[k as DocumentKind] ?? k }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filtersActive =
    search.trim() !== "" ||
    kindFilter !== "all" ||
    statusFilter !== "all" ||
    signedFilter !== "any" ||
    sentFilter !== "any";

  const resetFilters = () => {
    setSearch("");
    setKindFilter("all");
    setStatusFilter("all");
    setSignedFilter("any");
    setSentFilter("any");
  };

  const filtered = useMemo(() => {
    let result = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.clientName.toLowerCase().includes(q) ||
          (DOCUMENT_KIND_LABEL[r.kind as DocumentKind] ?? r.title).toLowerCase().includes(q),
      );
    }
    if (kindFilter !== "all") result = result.filter((r) => r.kind === kindFilter);
    if (statusFilter === "attention") {
      result = result.filter((r) => r.status !== "signed" && r.status !== "superseded");
    } else if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (signedFilter !== "any") result = result.filter((r) => withinPreset(r.signedAt, signedFilter));
    if (sentFilter !== "any") result = result.filter((r) => withinPreset(r.sentAt, sentFilter));
    return result;
  }, [rows, search, kindFilter, statusFilter, signedFilter, sentFilter]);

  const drawerDoc = rows.find((r) => r.id === drawerDocId) ?? null;
  const settledCount = totalCount - queue.length;

  return (
    <div className="max-w-[940px] mx-auto">
      <div className="flex items-baseline gap-2.5 flex-wrap mb-3.5">
        <h1 className="m-0 text-[25px] font-bold tracking-tight text-[var(--color-ink)]">Documents</h1>
        <span className="text-[13px] text-[var(--color-body)]">
          Every document sent and signed, across every client
        </span>
      </div>

      {/* ── Needs you ── */}
      <div className="bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden mb-3.5">
        <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
          <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">Needs you</h2>
          <span className="text-xs text-[var(--color-muted)]">
            {queue.length > 0 ? `${queue.length} thing${queue.length === 1 ? "" : "s"} · in the order you'd work them` : "All clear"}
          </span>
          <button
            type="button"
            onClick={() => setNewDocOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-control border border-transparent bg-transparent hover:bg-[var(--hub-hover)] text-[var(--color-body)] hover:text-foreground px-2.5 py-1 min-h-[30px] text-xs font-semibold transition-colors"
          >
            <IconPlus className="w-3.5 h-3.5" /> New document
          </button>
        </div>
        <div className="px-4 pb-3">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2 px-3 rounded-nested border border-transparent transition-colors duration-100 hover:bg-[var(--hub-hover)] hover:border-[var(--hub-border)]"
            >
              <span className={`w-[7px] h-[7px] rounded-pill shrink-0 mt-0.5 self-start ${DOT[item.tone]}`} />
              <span className="min-w-0 flex-1 text-[13.5px] text-[var(--color-ink)]">
                <b className="font-semibold">{item.headline}</b>
                {item.subline && (
                  <span className="block text-xs text-[var(--color-muted)] mt-px">{item.subline}</span>
                )}
              </span>
              <span className="shrink-0">
                <DocumentRowActions docId={item.docId} status={item.status} hasEmail={item.hasEmail} clientName={item.clientName} />
              </span>
            </div>
          ))}

          {queue.length > 0 && (
            <>
              <hr className="h-px bg-[var(--hub-border)] border-0 my-3" />
              <div className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-[var(--color-muted)]">
                <span className="w-[7px] h-[7px] rounded-pill bg-[var(--status-success)] shrink-0" />
                <span>Nothing else outstanding — {settledCount} other document{settledCount === 1 ? "" : "s"} need{settledCount === 1 ? "s" : ""} nothing from you right now.</span>
              </div>
            </>
          )}

          {queue.length === 0 && (
            <div className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-[var(--color-muted)]">
              <span className="w-[7px] h-[7px] rounded-pill bg-[var(--status-success)] shrink-0" />
              <span>Nothing needs you today.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── All documents ── */}
      <div className="bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden">
        <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
          <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">All documents</h2>
          <span className="text-xs text-[var(--color-muted)]">{filtered.length} of {totalCount} shown</span>
        </div>

        <div className="flex items-center gap-2 py-2.5 px-4 border-b border-[var(--hub-border)] flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
            placeholder="Client or document…"
            aria-label="Filter by client or document"
            className="h-8 w-[200px] rounded-control border border-[var(--hub-field-border)] px-2.5 text-[13px] bg-white"
          />
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            aria-label="Filter by document type"
            className="h-8 rounded-control border border-[var(--hub-field-border)] px-2 text-[13px] bg-white"
          >
            <option value="all">All document types</option>
            {kindOptions.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Filter by status"
            className="h-8 rounded-control border border-[var(--hub-field-border)] px-2 text-[13px] bg-white"
          >
            {statusFilters.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={signedFilter}
            onChange={(e) => setSignedFilter(e.target.value)}
            aria-label="Filter by date signed"
            className="h-8 rounded-control border border-[var(--hub-field-border)] px-2 text-[13px] bg-white"
          >
            <option value="any">Signed — any time</option>
            {dateRangeFilters.map((f) => (
              <option key={f.value} value={f.value}>{f.value === "none" ? "Not yet signed" : `Signed in last ${f.label}`}</option>
            ))}
          </select>
          <select
            value={sentFilter}
            onChange={(e) => setSentFilter(e.target.value)}
            aria-label="Filter by last sent"
            className="h-8 rounded-control border border-[var(--hub-field-border)] px-2 text-[13px] bg-white"
          >
            <option value="any">Sent — any time</option>
            {dateRangeFilters.map((f) => (
              <option key={f.value} value={f.value}>{f.value === "none" ? "Never sent" : `Sent in last ${f.label}`}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!filtersActive}
            className="ml-auto text-xs font-semibold text-[var(--color-muted)] underline underline-offset-2 hover:text-foreground disabled:opacity-40 disabled:no-underline disabled:cursor-default"
          >
            Reset filters
          </button>
        </div>

        <div>
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setDrawerDocId(r.id)}
              className="flex items-center gap-3 w-full text-left py-2 px-4 border-t border-[var(--hub-border)] first:border-t-0 hover:bg-[var(--hub-hover)] transition-colors"
            >
              <InitialsCircle name={r.clientName} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-[var(--color-ink)] truncate">{r.clientName}</span>
                <span className="block text-xs text-[var(--color-muted)] truncate">
                  {DOCUMENT_KIND_LABEL[r.kind as DocumentKind] ?? r.title}
                  {" · "}
                  {r.status === "signed" || r.status === "superseded"
                    ? `signed ${fmt(r.signedAt)} · v${r.version}${r.status === "superseded" ? (r.supersededByVersion ? `, superseded by v${r.supersededByVersion}` : " (superseded)") : ""}`
                    : `created ${fmt(r.createdAt)}`}
                </span>
              </span>
              <span className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end max-w-[230px]">
                <StatusBadge status={r.status} />
                {r.status === "sent" && r.emailed === false && <TokenPill token="danger" label="Not delivered" />}
                {r.status === "signed" && r.emailed === false && <TokenPill token="neutral" label="Not delivered by email" />}
                {r.sourceType === "scan" && <TokenPill token="neutral" label="Scanned original" />}
              </span>
              <span className="shrink-0 text-xs font-semibold text-[var(--rose-text)]">View ›</span>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 py-10 px-4 text-center">
              <IconFileText className="w-7 h-7 text-[var(--color-muted)]" />
              <p className="m-0 text-[13px] font-semibold text-[var(--color-ink)]">No documents match your filters.</p>
              <p className="m-0 text-xs text-[var(--color-muted)]">Try a different search, or reset the filters above.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Scrim ── */}
      <div
        className={`fixed inset-0 bg-[var(--color-ink)]/40 transition-opacity duration-200 z-40 ${
          drawerDoc || newDocOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => {
          setDrawerDocId(null);
          setNewDocOpen(false);
        }}
      />

      {drawerDoc && (
        <DocumentDrawer doc={drawerDoc} onClose={() => setDrawerDocId(null)} />
      )}

      {newDocOpen && (
        <NewDocumentDrawer clientOptions={clientOptions} onClose={() => setNewDocOpen(false)} />
      )}
    </div>
  );
}

/* ── Document drawer — the honesty callout is the first thing under the
   header, per the brief's first-class requirement, not a fact buried among
   a dozen .frow rows. */
function DocumentDrawer({ doc, onClose }: { doc: DocumentRow; onClose: () => void }) {
  const label = DOCUMENT_KIND_LABEL[doc.kind as DocumentKind] ?? doc.title;
  const isDangerUndelivered = doc.status === "sent" && doc.emailed === false;
  const isQuietUndelivered = doc.status !== "sent" && doc.emailed === false;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useDrawerA11y(onClose, headingRef);

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-doc-h"
      className="fixed top-0 right-0 h-full w-[420px] max-w-[96vw] bg-white shadow-[-8px_0_32px_rgba(16,24,40,.10),_-2px_0_8px_rgba(16,24,40,.06)] flex flex-col z-50"
    >
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-[var(--hub-border)] shrink-0">
        <div className="min-w-0 flex-1">
          <h3 ref={headingRef} id="dw-doc-h" tabIndex={-1} className="m-0 text-[15.5px] font-bold text-[var(--color-ink)] tracking-tight outline-none">
            {label}
          </h3>
          <span className="block text-xs text-[var(--color-muted)] mt-0.5">
            {doc.clientName}
            {doc.clientNumber != null ? ` · #${doc.clientNumber}` : ""} · v{doc.version}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-control border-0 bg-transparent text-[var(--color-muted)] cursor-pointer grid place-items-center text-lg leading-none shrink-0 hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)]"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isDangerUndelivered && (
          <div className="honesty danger">
            <span aria-hidden>⚠</span>
            <span>
              <b>Status says Sent, but emailed is No.</b> No email backend was configured, or the send
              attempt failed silently — {doc.clientName} has not received this. <code>emailed</code> is
              the definitive signal a real email left, not status. Resend now, or copy the sign link and
              share it another way.
            </span>
          </div>
        )}
        {isQuietUndelivered && (
          <div className="honesty ok">
            <span aria-hidden>✓</span>
            <span>
              This was never delivered by email (<code>emailed</code> is No), but it&rsquo;s {doc.status} anyway —
              the client likely received it another way.
            </span>
          </div>
        )}
        {doc.status === "sent" && doc.emailed !== false && daysAgo(doc.sentAt) > 14 && (
          <div className="honesty warn">
            <span aria-hidden>⏱</span>
            <span>
              Delivered {fmt(doc.sentAt)}, {Math.floor(daysAgo(doc.sentAt))} days ago — still unsigned, no reminder sent since.
            </span>
          </div>
        )}

        <div className="fcard acc-ink">
          <div className="fcard-h">Document</div>
          <div className="fcard-b">
            <div className="frow"><span className="fk">Kind</span><span className="fv">{label}</span></div>
            <div className="frow"><span className="fk">Status</span><span className="fv"><StatusBadge status={doc.status} /></span></div>
            <div className="frow"><span className="fk">Version</span><span className="fv">v{doc.version}{doc.status === "superseded" && doc.supersededByVersion ? ` (superseded by v${doc.supersededByVersion})` : ""}</span></div>
            <div className="frow"><span className="fk">Created</span><span className="fv">{fmt(doc.createdAt)}</span></div>
            <div className="frow"><span className="fk">Last sent</span><span className="fv">{doc.sentAt ? fmt(doc.sentAt) : "Not yet sent"}</span></div>
            <div className="frow"><span className="fk">Signed</span><span className="fv">{doc.signedAt ? fmt(doc.signedAt) : "Not yet"}</span></div>
            {doc.sourceType === "scan" && (
              <div className="frow">
                <span className="fk">Original</span>
                <span className="fv">
                  <OpenUploadButton
                    variant="link"
                    clientName={doc.clientName}
                    doc={{
                      id: doc.id,
                      title: doc.title,
                      source_file_name: doc.sourceFileName,
                      source_file_mime: doc.sourceFileMime,
                      source_file_size: doc.sourceFileSize,
                      created_at: doc.createdAt,
                    }}
                  />
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="fcard acc-teal">
          <div className="fcard-h">Client</div>
          <div className="fcard-b">
            <div className="frow">
              <span className="fk">Client</span>
              <span className="fv">
                {doc.clientNumber != null ? (
                  <Link href={`/hub/clients/${doc.clientNumber}`} className="text-teal font-medium hover:underline">
                    {doc.clientName} · #{doc.clientNumber}
                  </Link>
                ) : (
                  doc.clientName
                )}
              </span>
            </div>
            <div className="frow">
              <span className="fk">Email on file</span>
              <span className="fv">{doc.hasEmail ? "Yes" : <span className="miss">No email on file — Send is disabled until one is added.</span>}</span>
            </div>
            {(doc.requiresClientSignature || doc.requiresTrainerSignature) && (
              <div className="frow">
                <span className="fk">Signatures</span>
                <span className="fv">
                  {doc.requiresClientSignature && (
                    <span className={`bdg ${doc.clientSigned ? "ok" : "mut"}`} style={{ marginRight: 6 }}>
                      Client {doc.clientSigned ? "signed" : "not signed"}
                    </span>
                  )}
                  {doc.requiresTrainerSignature && (
                    <span className={`bdg ${doc.trainerSigned ? "ok" : "mut"}`}>
                      Trainer {doc.trainerSigned ? "signed" : "not signed"}
                    </span>
                  )}
                </span>
              </div>
            )}
            {doc.consentChoices && Object.keys(doc.consentChoices).length > 0 && (
              <div className="frow">
                <span className="fk">Consents</span>
                <span className="fv">
                  {Object.values(doc.consentChoices).filter(Boolean).length}/{Object.keys(doc.consentChoices).length} granted
                </span>
              </div>
            )}
          </div>
        </div>

        {doc.clientNumber != null && doc.sourceType === "generated" && (
          <Link
            href={`/hub/clients/${doc.clientNumber}/documents/${doc.id}`}
            className="text-xs font-semibold text-[var(--rose-text)] hover:underline underline-offset-2"
          >
            Open full document →
          </Link>
        )}
      </div>

      <div className="p-3 border-t border-[var(--hub-border)] flex items-center gap-2 bg-[var(--field-fill,var(--hub-hover))]">
        <DocumentRowActions docId={doc.id} status={doc.status} hasEmail={doc.hasEmail} clientName={doc.clientName} />
      </div>
    </aside>
  );
}

/* ── New document drawer — Q2's two-field picker. Small on purpose: it does
   not attempt the per-kind template editor itself (real per-kind content,
   out of scope for a picker) — it hands off to POST /api/documents, same
   endpoint NewDocumentButton.tsx already uses from the client record, then
   opens the created draft on its full editor page. */
function NewDocumentDrawer({ clientOptions, onClose }: { clientOptions: ClientOption[]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ClientOption | null>(null);
  const [kind, setKind] = useState<DocumentKind>(AVAILABLE_KINDS[0]);
  const [creating, setCreating] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useDrawerA11y(onClose, headingRef);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return clientOptions.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [clientOptions, query]);

  const create = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientNumber: selected.clientNumber, kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create document");
      router.push(`/hub/clients/${selected.clientNumber}/documents/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  };

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-new-h"
      className="fixed top-0 right-0 h-full w-[420px] max-w-[96vw] bg-white shadow-[-8px_0_32px_rgba(16,24,40,.10),_-2px_0_8px_rgba(16,24,40,.06)] flex flex-col z-50"
    >
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-[var(--hub-border)] shrink-0">
        <h3 ref={headingRef} id="dw-new-h" tabIndex={-1} className="m-0 text-[15.5px] font-bold text-[var(--color-ink)] tracking-tight flex-1 outline-none">New document</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-control border-0 bg-transparent text-[var(--color-muted)] cursor-pointer grid place-items-center text-lg leading-none shrink-0 hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)]"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="dw-h">Client</p>
        {selected ? (
          <div className="flex items-center justify-between gap-2 mb-3.5 rounded-control border border-[var(--hub-field-border)] px-2.5 py-2 text-[13px]">
            <span className="font-semibold text-[var(--color-ink)]">{selected.name}</span>
            <button type="button" onClick={() => setSelected(null)} className="text-xs text-[var(--rose-text)] font-semibold hover:underline">Change</button>
          </div>
        ) : (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Search clients…"
              aria-label="Search clients"
              className="fld"
              style={{ marginBottom: matches.length ? 4 : 14 }}
            />
            {matches.map((c) => (
              <button
                key={c.clientNumber}
                type="button"
                onClick={() => { setSelected(c); setQuery(""); }}
                className="hrow"
                style={{ width: "100%" }}
              >
                <span className="hrow-m">{c.name}</span>
              </button>
            ))}
          </>
        )}

        <p className="dw-h">Document kind</p>
        <select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)} className="fld">
          {AVAILABLE_KINDS.map((k) => (
            <option key={k} value={k}>{DOCUMENT_KIND_LABEL[k]}</option>
          ))}
        </select>
      </div>
      <div className="p-3 border-t border-[var(--hub-border)] flex items-center gap-2">
        <button
          type="button"
          onClick={create}
          disabled={!selected || creating}
          className="btn btn-primary btn-sm"
        >
          {creating ? "Creating…" : "Create draft"}
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
      </div>
    </aside>
  );
}
