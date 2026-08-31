"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  HubCard,
  HubCardHeader,
  HubPageHeader,
  KpiTile,
  Toolbar,
  toolbarSelectClasses,
  StatusBadge,
  EmptyState,
} from "@/components/hub";
import { getStatusClasses, type StatusToken } from "@/lib/hubStatus";
import {
  IconFileText,
  IconClipboardList,
  IconShieldCheck,
  IconRefreshCw,
  IconFileSignature,
  IconHeartHandshake,
  IconMessageCircle,
  IconUsers,
  IconArrowRight,
  IconSearch,
  IconExternalLink,
  IconEye,
  IconSend,
  IconCalendar,
} from "@/components/icons";
import { DOCUMENT_KIND_LABEL, type DocumentTemplate, type DocumentKind } from "@/lib/documents/types";
import { AssignTemplateDialog, type ClientOption } from "./AssignTemplateDialog";

type Category = "screening" | "agreement" | "feedback" | "other";
type Who = "Client" | "Trainer" | "Both";

const CATEGORY_BY_KIND: Record<DocumentKind, Category> = {
  parq: "screening",
  risk_assessment: "screening",
  annual_review: "screening",
  leg_pain_questionnaire: "screening",
  terms: "agreement",
  consent: "agreement",
  remote_coaching: "agreement",
  feedback: "feedback",
  intake_form: "feedback",
  fortnightly_checkin: "screening",
  invoice: "other",
  endurance_block: "other",
  note: "other",
};

const CATEGORY_META: Record<Category, { label: string; token: StatusToken }> = {
  screening: { label: "Screening & clinical", token: "success" },
  agreement: { label: "Agreements & consent", token: "primary" },
  feedback: { label: "Feedback", token: "neutral" },
  other: { label: "Other", token: "neutral" },
};

const ICON_BY_KIND: Record<DocumentKind, React.ComponentType<{ className?: string }>> = {
  parq: IconClipboardList,
  risk_assessment: IconShieldCheck,
  annual_review: IconRefreshCw,
  leg_pain_questionnaire: IconClipboardList,
  terms: IconFileSignature,
  consent: IconHeartHandshake,
  remote_coaching: IconFileSignature,
  feedback: IconMessageCircle,
  intake_form: IconMessageCircle,
  fortnightly_checkin: IconClipboardList,
  invoice: IconFileText,
  endurance_block: IconCalendar,
  note: IconFileText,
};

const DESC_BY_KIND: Record<DocumentKind, string> = {
  parq: "Screening questions across heart health, musculoskeletal history and medication, plus the detail section the trainer reads.",
  risk_assessment: "The trainer's record: risk factors identified, control measures applied, and the reasoning behind the decision to train.",
  annual_review: "The twelve-month re-screen — what has changed, what the year looked like, and what the next one should hold.",
  leg_pain_questionnaire: "Symptom-mapping questionnaire for lower-limb pain, completed by the client before a session plan is built.",
  terms: "The contract in plain English: commitments, responsibilities, payment, liability and data protection.",
  consent: "Permission for photos, video and quotes, with what the client is agreeing to and how to withdraw it.",
  remote_coaching: "The remote/online coaching contract: commitments, responsibilities, monthly retainer, liability and data protection for clients trained by call and programme rather than in person.",
  intake_form: "One-off onboarding form covering weekly availability, diet, and goals — completed once before the first training block is built.",
  fortnightly_checkin: "Recurring check-in sent alongside a Garmin export before each call — sessions changed, pain/soreness, sleep and energy, and what's coming up.",
  feedback: "End-of-programme feedback, including the would-you-recommend question used for testimonials.",
  invoice: "Billing document sent to a client for services rendered.",
  endurance_block: "Calendar-based training block for endurance and multi-discipline clients — edited per client in the document, not from this template.",
  note: "Ad-hoc note or uploaded document kept on the client's file — not generated from a template.",
};

function who(t: DocumentTemplate): Who {
  if (t.requires_client_signature && t.requires_trainer_signature) return "Both";
  if (t.requires_trainer_signature) return "Trainer";
  return "Client";
}

const WHO_LABEL: Record<Who, string> = {
  Client: "Completed by the client",
  Trainer: "Completed by the trainer",
  Both: "Client and trainer",
};

function sectionCount(t: DocumentTemplate): number {
  return t.body?.feedbackSections?.length ?? t.body?.sections?.length ?? 0;
}

export function TemplatesLibrary({ templates, clients }: { templates: DocumentTemplate[]; clients: ClientOption[] }) {
  const [assigning, setAssigning] = useState<DocumentTemplate | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [whoFilter, setWhoFilter] = useState<Who | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return templates.filter((t) => {
      const category = CATEGORY_BY_KIND[t.kind];
      if (term) {
        const label = DOCUMENT_KIND_LABEL[t.kind] ?? t.kind;
        const haystack = `${t.name} ${label} ${DESC_BY_KIND[t.kind] ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (categoryFilter !== "all" && category !== categoryFilter) return false;
      if (whoFilter !== "all" && who(t) !== whoFilter) return false;
      return true;
    });
  }, [templates, query, categoryFilter, whoFilter]);

  const counts = useMemo(() => {
    const screening = templates.filter((t) => CATEGORY_BY_KIND[t.kind] === "screening").length;
    const agreement = templates.filter((t) => CATEGORY_BY_KIND[t.kind] === "agreement").length;
    const clientOnly = templates.filter((t) => who(t) === "Client").length;
    return { total: templates.length, screening, agreement, clientOnly };
  }, [templates]);

  const resetFilters = () => {
    setQuery("");
    setCategoryFilter("all");
    setWhoFilter("all");
  };
  const filtersActive = query.trim() !== "" || categoryFilter !== "all" || whoFilter !== "all";

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Document templates"
        subtitle="Every blank template used to create client documents. Edit the wording here — changes apply to documents created from now on."
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiTile icon={<IconFileText className="w-5 h-5" />} label="Templates in the library" value={counts.total} statusToken="primary" />
        <KpiTile icon={<IconShieldCheck className="w-5 h-5" />} label="Screening & clinical" value={counts.screening} statusToken="success" />
        <KpiTile icon={<IconFileSignature className="w-5 h-5" />} label="Agreements & consent" value={counts.agreement} statusToken="warning" />
        <KpiTile icon={<IconUsers className="w-5 h-5" />} label="Filled in by the client" value={counts.clientOnly} statusToken="neutral" />
      </div>

      <HubCard padded={false}>
        <div className="px-5 pt-5">
          <Toolbar
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder="Search by name or category…"
            count={`${filtered.length} ${filtered.length === 1 ? "template" : "templates"}`}
          >
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as Category | "all")}
              className={toolbarSelectClasses}
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              <option value="screening">Screening &amp; clinical</option>
              <option value="agreement">Agreements &amp; consent</option>
              <option value="feedback">Feedback</option>
            </select>
            <select
              value={whoFilter}
              onChange={(e) => setWhoFilter(e.target.value as Who | "all")}
              className={toolbarSelectClasses}
              aria-label="Filter by who completes it"
            >
              <option value="all">Anyone completes</option>
              <option value="Client">Client completes</option>
              <option value="Trainer">Trainer completes</option>
              <option value="Both">Client and trainer</option>
            </select>
            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Reset
              </button>
            )}
            <div className="inline-flex bg-[var(--hub-hover)] border border-[var(--hub-border)] rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                aria-label="Grid view"
                title="Grid view"
                className={`w-8 h-8 rounded-md grid place-items-center transition-colors ${view === "grid" ? "bg-[var(--hub-card)] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                aria-label="List view"
                title="List view"
                className={`w-8 h-8 rounded-md grid place-items-center transition-colors ${view === "list" ? "bg-[var(--hub-card)] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                  <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
                </svg>
              </button>
            </div>
          </Toolbar>
        </div>

        <div className="px-5 pb-5 pt-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<IconSearch className="w-7 h-7" />}
              title="No templates match your filters."
              description="Try a different search, or reset the category and completed-by filters."
            />
          ) : view === "grid" ? (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((t) => {
                const category = CATEGORY_BY_KIND[t.kind];
                const meta = CATEGORY_META[category];
                const c = getStatusClasses(meta.token);
                const Icon = ICON_BY_KIND[t.kind];
                return (
                  <div
                    key={t.id}
                    className="flex flex-col rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-4 hover:border-[var(--hub-field-border-hover)] transition-colors"
                  >
                    <Link href={`/hub/templates/${t.id}`} className="contents">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span className={`w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className={`ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${c.bg} ${c.text} ${c.border}`}>
                          {meta.label.split(" & ")[0]}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground leading-tight mb-1">{t.name}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{DESC_BY_KIND[t.kind]}</p>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-body)] mb-3">
                        <IconUsers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {WHO_LABEL[who(t)]}
                        <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-foreground">
                          Open <IconArrowRight className="w-3 h-3" />
                        </span>
                      </p>
                    </Link>
                    <div className="mt-auto pt-2.5 border-t border-[var(--hub-border)] flex items-center gap-2 flex-wrap">
                      <StatusBadge status={t.is_active ? "active" : "draft"} />
                      <span className="text-[var(--hub-field-border)]">·</span>
                      <span className="text-xs text-muted-foreground">v{t.version}</span>
                      <span className="text-[var(--hub-field-border)]">·</span>
                      <span className="text-xs text-muted-foreground">{sectionCount(t)} {sectionCount(t) === 1 ? "section" : "sections"}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAssigning(t); }}
                        className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[var(--hub-field-border)] px-2 h-[26px] text-xs font-bold text-foreground hover:border-rose hover:text-rose transition-colors"
                      >
                        <IconSend className="w-3.5 h-3.5" />
                        Assign
                      </button>
                      <Link
                        href={`/hub/templates/${t.id}/preview`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-body)] hover:text-rose transition-colors"
                      >
                        <IconEye className="w-3.5 h-3.5" />
                        Preview
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] overflow-hidden overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)] text-left">
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 h-10">Template</th>
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 h-10">Category</th>
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 h-10">Completed by</th>
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 h-10">Version</th>
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 h-10">Status</th>
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 h-10 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const category = CATEGORY_BY_KIND[t.kind];
                    const meta = CATEGORY_META[category];
                    const c = getStatusClasses(meta.token);
                    const Icon = ICON_BY_KIND[t.kind];
                    return (
                      <tr key={t.id} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/hub/templates/${t.id}`} className="flex items-center gap-3 min-w-0 group">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block font-semibold text-foreground group-hover:text-rose transition-colors truncate">{t.name}</span>
                              <span className="block text-xs text-muted-foreground truncate">{DOCUMENT_KIND_LABEL[t.kind] ?? t.kind}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{meta.label}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{who(t)}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">v{t.version}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={t.is_active ? "active" : "draft"} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setAssigning(t)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--hub-field-border)] px-2 h-[26px] text-xs font-bold text-foreground hover:border-rose hover:text-rose transition-colors"
                            >
                              <IconSend className="w-3.5 h-3.5" />
                              Assign
                            </button>
                            <Link
                              href={`/hub/templates/${t.id}/preview`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-body)] hover:text-rose transition-colors"
                            >
                              <IconEye className="w-3.5 h-3.5" />
                              Preview
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </HubCard>

      <HubCard>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Where these live.</strong> Every template above is a row in the document engine,
          shared by every client document of that kind — editing the wording here changes it for every new document created
          going forward, not past ones already sent or signed.
        </p>
      </HubCard>

      <HubCard>
        <div className="flex items-start gap-4">
          <span className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0 bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]">
            <IconFileText className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground leading-tight mb-1">Invoice &amp; quote templates</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Cashflow templates live in the invoicing section, not the document engine. The Quote template pre-fills
              line items when you create a new invoice — send it as an estimate before a booking is confirmed.
            </p>
            <Link
              href="/hub/cashflow/invoices"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-body)] hover:text-rose transition-colors"
            >
              Open invoicing
              <IconExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </HubCard>
      {assigning && (
        <AssignTemplateDialog
          open={!!assigning}
          onOpenChange={(o) => { if (!o) setAssigning(null); }}
          kind={assigning.kind as DocumentKind}
          templateName={assigning.name}
          clients={clients}
        />
      )}
    </div>
  );
}
