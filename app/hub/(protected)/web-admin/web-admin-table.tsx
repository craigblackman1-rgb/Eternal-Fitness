"use client";

import { useMemo, useState } from "react";
import { HubTable, type HubColumn } from "@/components/hub/HubTable";
import { HubCard, HubCardHeader } from "@/components/hub";
import { toolbarSelectClasses } from "@/components/hub/Toolbar";
import { StatusBadge, TokenPill } from "@/components/hub/StatusBadge";
import { KpiTile } from "@/components/hub/KpiTile";
import {
  IconFileText,
  IconCheckCircle,
  IconEyeOff,
  IconTriangleAlert,
  IconExternalLink,
} from "@/components/icons";

// Matches app/layout.tsx's SITE_URL — kept local since no shared site-config
// constant exists yet.
const SITE_URL = "https://eternal-fitness.co.uk";

interface PageKeyword {
  id: string;
  page_slug: string;
  page_title: string;
  url_path: string;
  page_type: "static" | "condition" | "legal" | "blog";
  primary_keyword: string | null;
  keyword_cluster: string[] | null;
  status: string;
  notes: string | null;
  updated_at: string;
}

type Visibility = "live" | "disabled" | "not_built";

// Mirrors next.config.js's temporary (permanent: false) redirects — pages that
// are built but bounced to "/". The 2026-07-27 launch-scope block was lifted on
// 2026-08-10 (blog and the specialist pages are live again), so this is empty.
// Update this alongside next.config.js if anything is disabled again.
const DISABLED_SLUGS = new Set<string>([]);

// Slugs seeded into page_keywords for planning purposes but with no page.tsx in
// the repo — see 20260721_site_content_full_inventory.sql. The first five were
// never built; the last three were retired in the 2026-08-10 restructure that
// narrowed the site to three specialisms (they 301 to /specialist-training).
const NOT_BUILT_SLUGS = new Set([
  "type-2-diabetes",
  "copd",
  "heart-conditions",
  "chronic-pain",
  "adaptive-training",
  "exercise-for-health",
  "high-blood-pressure",
  "bone-health",
]);

function getVisibility(row: PageKeyword): Visibility {
  if (NOT_BUILT_SLUGS.has(row.page_slug)) return "not_built";
  if (DISABLED_SLUGS.has(row.page_slug)) return "disabled";
  return "live";
}

const VISIBILITY_META: Record<Visibility, { label: string; token: "success" | "danger" | "neutral" }> = {
  live: { label: "Live", token: "success" },
  disabled: { label: "Hidden / Disabled", token: "danger" },
  not_built: { label: "Not built", token: "neutral" },
};

const TYPE_LABELS: Record<PageKeyword["page_type"], string> = {
  static: "Static",
  condition: "Condition",
  blog: "Blog",
  legal: "Legal",
};

const columns: HubColumn<PageKeyword>[] = [
  {
    key: "page",
    header: "Page",
    render: (row) => <span className="font-medium">{row.page_title}</span>,
    sortable: true,
    sortValue: (row) => row.page_title,
  },
  {
    key: "url",
    header: "URL",
    render: (row) => (
      <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{row.url_path}</span>
    ),
    sortable: true,
    sortValue: (row) => row.url_path,
  },
  {
    key: "type",
    header: "Type",
    render: (row) => <TokenPill token="neutral" label={TYPE_LABELS[row.page_type]} />,
    sortable: true,
    sortValue: (row) => row.page_type,
  },
  {
    key: "keywords",
    header: "Keywords Optimised For",
    render: (row) =>
      row.primary_keyword ? (
        <div className="space-y-0.5">
          <p className="font-medium">{row.primary_keyword}</p>
          {row.keyword_cluster && row.keyword_cluster.length > 0 && (
            <p className="text-xs text-muted-foreground">{row.keyword_cluster.join(", ")}</p>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">Not set</span>
      ),
  },
  {
    key: "visibility",
    header: "Visibility",
    render: (row) => {
      const v = VISIBILITY_META[getVisibility(row)];
      return <TokenPill token={v.token} label={v.label} />;
    },
    sortable: true,
    sortValue: (row) => getVisibility(row),
  },
  {
    key: "status",
    header: "Content Status",
    render: (row) => <StatusBadge status={row.status} />,
    sortable: true,
  },
  {
    key: "view",
    header: "",
    render: (row) => {
      const visibility = getVisibility(row);
      if (visibility === "not_built") {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return (
        <a
          href={`${SITE_URL}${row.url_path}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={visibility === "disabled" ? "Currently redirects to the homepage" : "View live page"}
          className="inline-flex items-center gap-1 text-sm font-medium text-rose hover:underline"
        >
          View <IconExternalLink className="h-3.5 w-3.5" />
        </a>
      );
    },
    className: "text-right",
  },
];

function ToolbarSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={toolbarSelectClasses}
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function WebAdminTable({ keywords }: { keywords: PageKeyword[] }) {
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const counts = useMemo(() => {
    const withVisibility = keywords.map((k) => getVisibility(k));
    return {
      total: keywords.length,
      live: withVisibility.filter((v) => v === "live").length,
      disabled: withVisibility.filter((v) => v === "disabled").length,
      notBuilt: withVisibility.filter((v) => v === "not_built").length,
      needsWork: keywords.filter((k) => k.status === "needs_writing" || k.status === "needs_updating").length,
    };
  }, [keywords]);

  const visibilityOptions = [
    { value: "all", label: `All pages (${counts.total})` },
    { value: "live", label: `Live (${counts.live})` },
    { value: "disabled", label: `Hidden / Disabled (${counts.disabled})` },
    { value: "not_built", label: `Not built (${counts.notBuilt})` },
  ];

  const statusOptions = [
    { value: "all", label: "All content statuses" },
    { value: "published", label: "Published" },
    { value: "needs_writing", label: "Needs writing" },
    { value: "needs_updating", label: "Needs updating" },
  ];

  const filtered = useMemo(() => {
    return keywords.filter((row) => {
      if (visibilityFilter !== "all" && getVisibility(row) !== visibilityFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    });
  }, [keywords, visibilityFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile icon={<IconFileText className="w-5 h-5" />} label="Total Pages" value={counts.total} statusToken="neutral" />
        <KpiTile icon={<IconCheckCircle className="w-5 h-5" />} label="Live" value={counts.live} statusToken="success" />
        <KpiTile icon={<IconEyeOff className="w-5 h-5" />} label="Hidden / Disabled" value={counts.disabled} statusToken="danger" />
        <KpiTile icon={<IconTriangleAlert className="w-5 h-5" />} label="Content To Do" value={counts.needsWork} statusToken="warning" />
      </div>

      <HubCard padded={false}>
        <HubCardHeader
          icon={<IconFileText className="w-4 h-4" />}
          color="teal"
          title="Page inventory"
          subtitle="Every marketing page, its target keywords, and what's left before it can go live"
          divider
          className="px-5 pt-5 pb-3.5"
        />
        <div className="px-5 pt-5 pb-5">
          <HubTable
            data={filtered}
            columns={columns}
            getRowHref={() => "#"}
            searchPlaceholder="Search pages..."
            searchKeys={["page_title", "page_slug", "primary_keyword"]}
            pageSize={20}
            countLabel="page"
            toolbar={
              <>
                <ToolbarSelect ariaLabel="Filter by visibility" value={visibilityFilter} onChange={setVisibilityFilter} options={visibilityOptions} />
                <ToolbarSelect ariaLabel="Filter by content status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
              </>
            }
          />
        </div>
      </HubCard>
    </div>
  );
}
