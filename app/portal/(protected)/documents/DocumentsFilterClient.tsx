"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { PortalDocument } from "@/lib/portal-data";
import { StatusBadge } from "@/components/hub/StatusBadge";
import {
  IconFileText, IconCheckCircle, IconAlertTriangle, IconChevronRight,
  IconClock, IconPencil, IconSearch, IconDownload,
} from "@/components/icons";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const KIND_LABELS: Record<string, string> = {
  terms: "Training agreement & studio terms",
  risk_assessment: "Risk assessment",
  annual_review: "Annual review",
  parq: "Health questionnaire (PAR‑Q+)",
  consent: "Consent form",
  feedback: "Client feedback",
};

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function needsAction(doc: PortalDocument): boolean {
  return doc.requires_client_signature && doc.status !== "signed";
}

function docGroupLabel(doc: PortalDocument, isSigned: boolean): "action" | "signed" | "shared" {
  if (isSigned) return "signed";
  if (needsAction(doc)) return "action";
  return "shared";
}

/** parq and feedback are the two document kinds built from feedbackSections
 * (questions to fill in) rather than prose sections — both need the /edit
 * question flow, not the /sign read-and-sign flow. */
function isFillOutKind(kind: string): boolean {
  return kind === "parq" || kind === "feedback";
}

// One page handles every state (view, fill-in questions, and sign) — the
// same renderer used by the hub-generated email/copied link.
function docLinkHref(doc: PortalDocument): string {
  return `/portal/documents/${doc.id}`;
}

function docActionLabel(doc: PortalDocument, isSigned: boolean): string {
  if (isSigned) return "View signed copy";
  if (isFillOutKind(doc.kind)) return "Carry on";
  return "Read and sign";
}

function docActionVariant(doc: PortalDocument, isSigned: boolean): "primary" | "outline" {
  if (isSigned) return "outline";
  return "primary";
}

function docBadge(doc: PortalDocument, isSigned: boolean): { label: string; color: string } {
  if (isSigned) return { label: "Signed", color: "bg-teal/10 text-teal border-teal/30" };
  if (needsAction(doc)) {
    return { label: "Needs your signature", color: "bg-amber/10 text-amber border-amber/30" };
  }
  if (doc.kind === "parq") return { label: "Half completed", color: "bg-amber/10 text-amber border-amber/30" };
  return { label: "No action needed", color: "bg-teal/10 text-teal border-teal/30" };
}

type FilterCategory = "all" | "action" | "shared" | "signed";

const FILTER_LABELS: Record<FilterCategory, string> = {
  all: "All documents",
  action: "Needs you",
  shared: "Shared with you",
  signed: "Signed",
};

export function DocumentsFilterClient({
  documents,
  signedIds,
}: {
  documents: PortalDocument[];
  signedIds: Set<string>;
}) {
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const isSigned = signedIds.has(doc.id);
      const group = docGroupLabel(doc, isSigned);

      if (filter !== "all" && group !== filter) return false;

      if (q) {
        const haystack = `${kindLabel(doc.kind)} ${doc.title ?? ""} ${doc.kind}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [documents, signedIds, filter, query]);

  const filterCounts: Record<FilterCategory, number> = {
    all: documents.length,
    action: documents.filter((d) => docGroupLabel(d, signedIds.has(d.id)) === "action").length,
    shared: documents.filter((d) => docGroupLabel(d, signedIds.has(d.id)) === "shared").length,
    signed: documents.filter((d) => docGroupLabel(d, signedIds.has(d.id)) === "signed").length,
  };

  return (
    <div className="space-y-5">
      {/* Filter + search */}
      <div className="flex flex-wrap items-start gap-4" role="search" aria-label="Filter and search your documents">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as FilterCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              aria-pressed={filter === cat}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                filter === cat
                  ? "border-teal bg-teal text-white"
                  : "border-input bg-white hover:bg-accent"
              }`}
            >
              {FILTER_LABELS[cat]}
              <span className={`text-xs font-medium ${filter === cat ? "text-white/70" : "text-muted-foreground"}`}>
                {filterCounts[cat]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[14rem]">
          <label htmlFor="doc-search" className="block text-xs font-semibold text-foreground mb-1.5">Search by name</label>
          <input
            id="doc-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="For example: agreement"
            autoComplete="off"
            className="w-full min-h-[2.9rem] rounded-full border border-foreground/40 bg-white px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-foreground/60"
          />
        </div>
      </div>

      <p className="text-sm font-semibold text-foreground" role="status" aria-live="polite">
        {grouped.length === 0
          ? "No documents match. Try a shorter word or clear the search."
          : filter === "all" && !query
            ? `Showing all ${grouped.length} documents.`
            : `Showing ${grouped.length} of ${documents.length} documents${filter !== "all" ? ` — ${FILTER_LABELS[filter].toLowerCase()}` : ""}${query ? ` matching "${query}"` : ""}.`}
      </p>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-white p-10 text-center">
          <h3 className="text-base font-semibold text-foreground">No documents match that search</h3>
          <p className="text-sm text-muted-foreground mt-1">Try a shorter word, or clear the search to see all documents.</p>
          <button
            type="button"
            onClick={() => { setFilter("all"); setQuery(""); }}
            className="mt-4 inline-flex min-h-11 items-center rounded-full border border-input px-5 text-sm font-medium hover:bg-accent"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {grouped.map((doc) => {
            const isSigned = signedIds.has(doc.id);
            const group = docGroupLabel(doc, isSigned);
            const badge = docBadge(doc, isSigned);
            const href = docLinkHref(doc);

            return (
              <li key={doc.id} className="rounded-2xl border border-border/60 bg-white p-5 flex flex-wrap items-start gap-4 hover:border-border transition-colors">
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0 mt-0.5">
                  <IconFileText className="w-4 h-4" />
                </div>

                {/* Main */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">
                    <Link href={href} className="hover:text-teal hover:underline">
                      {doc.title || kindLabel(doc.kind)}
                    </Link>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {isSigned
                      ? "Signed and stored. You can view or download this document at any time."
                      : needsAction(doc)
                        ? "This document needs your signature. Read it and sign to complete."
                        : "Shared with you. No action needed — read or download whenever you like."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {doc.status === "signed" && doc.signed_at ? (
                      <span>Signed by you <b className="font-semibold text-foreground">{formatDate(doc.signed_at)}</b></span>
                    ) : doc.sent_at ? (
                      <span>Sent <b className="font-semibold text-foreground">{formatDate(doc.sent_at)}</b></span>
                    ) : null}
                    {isFillOutKind(doc.kind) && doc.status !== "signed" && (
                      <span><b className="font-semibold text-foreground">Partially complete</b></span>
                    )}
                    {doc.version > 1 && <span>Version {doc.version}</span>}
                  </p>
                </div>

                {/* Side */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.color}`}>
                    {badge.label}
                  </span>
                  <Link
                    href={href}
                    className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${
                      docActionVariant(doc, isSigned) === "primary"
                        ? "bg-teal text-white hover:bg-teal/90"
                        : "border border-input hover:bg-accent"
                    }`}
                  >
                    {docActionLabel(doc, isSigned)}
                    <IconChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
