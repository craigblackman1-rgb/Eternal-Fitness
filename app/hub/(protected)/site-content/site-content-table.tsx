"use client";

import { useMemo, useState } from "react";
import { HubTable, type HubColumn } from "@/components/hub/HubTable";
import { HubCard, HubCardHeader } from "@/components/hub";
import { StatusBadge, TokenPill } from "@/components/hub/StatusBadge";
import { KpiTile } from "@/components/hub/KpiTile";
import {
  IconFileText,
  IconCheckCircle,
  IconEdit3,
  IconRefreshCw,
  IconChevronDown,
} from "@/components/icons";

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

// Only these static pages are wired to the page_content_blocks editor —
// everything else (blog posts, condition pages, legal pages) is
// inventory-only for now, no per-page editor built yet.
const EDITABLE_SLUGS = new Set([
  "about", "cancer-rehabilitation", "contact", "exercise-for-health",
  "faqs", "home", "personal-training", "pricing",
]);

const STATUS_LABELS: Record<string, string> = {
  published: "Published",
  needs_writing: "Needs writing",
  needs_updating: "Needs updating",
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
    key: "keyword",
    header: "Target Keyword",
    render: (row) =>
      row.primary_keyword || <span className="text-muted-foreground">Not set</span>,
    sortable: true,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusBadge status={row.status} />,
    sortable: true,
  },
  {
    key: "action",
    header: "",
    render: (row) =>
      EDITABLE_SLUGS.has(row.page_slug) ? (
        <span className="text-rose text-sm font-medium">Edit copy →</span>
      ) : (
        <span className="text-xs text-muted-foreground">Inventory only</span>
      ),
    className: "text-right",
  },
];

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[190px]">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] pl-3 pr-8 text-sm text-foreground hover:border-[var(--hub-field-border-hover)] focus:outline-none focus:border-rose focus:ring-2 focus:ring-rose/30 appearance-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

export function SiteContentTable({ keywords }: { keywords: PageKeyword[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const counts = useMemo(() => {
    return {
      total: keywords.length,
      published: keywords.filter((k) => k.status === "published" || k.status === "reviewed").length,
      needsWriting: keywords.filter((k) => k.status === "needs_writing").length,
      needsUpdating: keywords.filter((k) => k.status === "needs_updating" || k.status === "needs_rewrite" || k.status === "pending").length,
    };
  }, [keywords]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { static: 0, condition: 0, blog: 0, legal: 0 };
    keywords.forEach((k) => { c[k.page_type] = (c[k.page_type] ?? 0) + 1; });
    return c;
  }, [keywords]);

  const statusOptions = [
    { value: "all", label: `All statuses (${counts.total})` },
    { value: "published", label: `Published (${counts.published})` },
    { value: "needs_writing", label: `Needs writing (${counts.needsWriting})` },
    { value: "needs_updating", label: `Needs updating (${counts.needsUpdating})` },
  ];

  const typeOptions = [
    { value: "all", label: `All types (${keywords.length})` },
    { value: "static", label: `Static (${typeCounts.static})` },
    { value: "condition", label: `Condition (${typeCounts.condition})` },
    { value: "blog", label: `Blog (${typeCounts.blog})` },
    { value: "legal", label: `Legal (${typeCounts.legal})` },
  ];

  const filtered = useMemo(() => {
    return keywords.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (typeFilter !== "all" && row.page_type !== typeFilter) return false;
      return true;
    });
  }, [keywords, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile icon={<IconFileText className="w-5 h-5" />} label="Total Pages" value={counts.total} statusToken="neutral" />
        <KpiTile icon={<IconCheckCircle className="w-5 h-5" />} label="Published" value={counts.published} statusToken="success" />
        <KpiTile icon={<IconEdit3 className="w-5 h-5" />} label="Needs Writing" value={counts.needsWriting} statusToken="warning" />
        <KpiTile icon={<IconRefreshCw className="w-5 h-5" />} label="Needs Updating" value={counts.needsUpdating} statusToken="primary" />
      </div>

      <HubCard padded={false}>
        <HubCardHeader icon={<IconCheckCircle className="w-4 h-4" />} color="teal" title="Page inventory" subtitle="Filter by status or type, then edit copy on any static page" />
        <div className="px-5 py-4 border-b border-[var(--hub-border)] flex flex-wrap gap-4">
          <SelectField label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
          <SelectField label="Type" value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
        </div>
        <HubTable
          data={filtered}
          columns={columns}
          getRowHref={(row) => (EDITABLE_SLUGS.has(row.page_slug) ? `/hub/site-content/${row.page_slug}` : "#")}
          searchPlaceholder="Search pages..."
          searchKeys={["page_title", "page_slug", "primary_keyword"]}
          pageSize={20}
        />
      </HubCard>
    </div>
  );
}
