"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconSearch, IconEye, IconEdit3, IconTrash2, IconMail, IconSend } from "@/components/icons";
import { HubCard, HubCardHeader, HubAlert } from "@/components/hub";
import { TokenPill } from "@/components/hub/StatusBadge";
import { updateStatusMeta, formatUpdateTime } from "@/lib/updates/status";
import { getTemplateKind } from "@/lib/email-templates/registry";
import type { UpdateWithClient, UpdateStatus } from "@/types";

const FILTERS: { id: "all" | UpdateStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scheduled", label: "Scheduled" },
  { id: "draft", label: "Drafts" },
  { id: "sent", label: "Sent" },
  { id: "failed", label: "Failed" },
];

function formatProgrammeLabel(raw: string | null | undefined): string {
  if (!raw) return "—";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function UpdatesReport({ updates }: { updates: UpdateWithClient[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | UpdateStatus>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<UpdateWithClient | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  const handleDelete = async (u: UpdateWithClient) => {
    if (!confirm(`Delete this ${u.status} update for ${u.client?.name ?? "this client"}? This can't be undone.`)) return;
    setDeleting(u.id);
    try {
      const res = await fetch(`/api/updates/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete");
      toast.success("Update deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkSend = async () => {
    if (selectedIds.size === 0) return;
    const sendableIds = [...selectedIds].filter((id) => {
      const u = updates.find((x) => x.id === id);
      return u && (u.status === "draft" || u.status === "scheduled" || u.status === "failed" || u.status === "sent");
    });
    if (sendableIds.length === 0) {
      toast.error("None of the selected updates can be sent. Only drafts, scheduled, failed, or previously-sent updates are sendable.");
      return;
    }
    if (!confirm(`Send ${sendableIds.length} selected update${sendableIds.length === 1 ? "" : "s"} to ${sendableIds.length === 1 ? "the client" : "their clients"} now?`)) return;
    setBulkSending(true);
    let sent = 0;
    let failed = 0;
    for (const id of sendableIds) {
      try {
        const res = await fetch(`/api/updates/${id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = await res.json();
        if (res.ok && data.success) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    setBulkSending(false);
    setSelectedIds(new Set());
    if (failed === 0) {
      toast.success(`${sent} update${sent === 1 ? "" : "s"} sent`);
    } else {
      toast.warning(`${sent} sent, ${failed} failed`);
    }
    router.refresh();
  };

  const sendableStatuses = new Set(["draft", "scheduled", "failed", "sent"]);

  const programmeOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: string[] = ["all"];
    for (const u of updates) {
      const raw = u.client?.package_type;
      if (raw && !seen.has(raw)) {
        seen.add(raw);
        opts.push(raw);
      }
    }
    return opts.sort((a, b) => (a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b)));
  }, [updates]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: updates.length };
    for (const u of updates) c[u.status] = (c[u.status] ?? 0) + 1;
    return c;
  }, [updates]);

  const pendingDrafts = useMemo(() => {
    const drafts = updates.filter((u) => u.status === "draft");
    if (drafts.length === 0) return null;
    const names = drafts
      .map((u) => u.client?.name ?? "")
      .filter(Boolean)
      .slice(0, 3);
    const remainder = drafts.length - names.length;
    const nameList =
      names.length === 0
        ? "Some clients"
        : names.length === 1
          ? names[0]
          : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
    const extra = remainder > 0 ? ` and ${remainder} more` : "";
    return { count: drafts.length, nameList, extra };
  }, [updates]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return updates.filter((u) => {
      if (filter !== "all" && u.status !== filter) return false;
      if (programmeFilter !== "all" && u.client?.package_type !== programmeFilter) return false;
      if (!q) return true;
      return (
        u.subject.toLowerCase().includes(q) ||
        (u.client?.name ?? "").toLowerCase().includes(q) ||
        (u.client_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [updates, filter, query, programmeFilter]);

  const allVisibleSelected = rows.length > 0 && rows.every((u) => selectedIds.has(u.id));
  const someVisibleSelected = rows.some((u) => selectedIds.has(u.id));

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked === true) {
        for (const r of rows) next.add(r.id);
      } else {
        for (const r of rows) next.delete(r.id);
      }
      return next;
    });
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = useMemo(() => {
    let c = 0;
    for (const r of rows) if (selectedIds.has(r.id)) c++;
    return c;
  }, [rows, selectedIds]);

  const editable = (s: string) => s === "draft" || s === "scheduled" || s === "failed";

  return (
    <div className="space-y-5">
      {/* Filter tabs + programme filter + bulk action */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-lg p-1 gap-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.id
                  ? "bg-[var(--status-primary-bg)] text-[var(--status-primary)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-xs font-medium opacity-70">{counts[f.id] ?? 0}</span>
            </button>
          ))}
        </div>

        <select
          value={programmeFilter}
          onChange={(e) => setProgrammeFilter(e.target.value)}
          className="h-9 border border-[var(--hub-field-border)] hover:border-[var(--hub-field-border-hover)] focus:border-rose focus:ring-2 focus:ring-rose/20 rounded-lg px-3 text-sm font-medium bg-[var(--hub-card)] text-foreground outline-none transition-colors"
          aria-label="Filter by programme"
        >
          <option value="all">All programmes</option>
          {programmeOptions.filter((o) => o !== "all").map((opt) => (
            <option key={opt} value={opt}>{formatProgrammeLabel(opt)}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg gap-1.5"
            disabled={selectedCount === 0 || bulkSending}
            onClick={handleBulkSend}
          >
            <IconSend className="h-3.5 w-3.5" />
            {bulkSending ? "Sending…" : `Send selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search client, subject, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {pendingDrafts && (
        <HubAlert
          severity="success"
          title={`${pendingDrafts.count} draft${pendingDrafts.count === 1 ? "" : "s"} awaiting review`}
        >
          {pendingDrafts.nameList}
          {pendingDrafts.extra} {pendingDrafts.count === 1 ? "has" : "have"} an update due.
        </HubAlert>
      )}

      <HubCard padded={false}>
        <HubCardHeader
          icon={<IconMail className="w-4 h-4" />}
          title="Updates"
          subtitle="Click a row to preview the email"
          color="teal"
          noBottomPadding
          divider
          className="px-5 pt-4"
        />
        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-muted-foreground text-sm">No updates match this view.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                  <th className="w-10 px-3 h-10">
                    <Checkbox
                      checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="text-left font-semibold text-muted-foreground text-[11px] uppercase tracking-wide px-5 h-10">Client</th>
                  <th className="text-left font-semibold text-muted-foreground text-[11px] uppercase tracking-wide px-5 h-10">Programme</th>
                  <th className="text-left font-semibold text-muted-foreground text-[11px] uppercase tracking-wide px-5 h-10">Subject</th>
                  <th className="text-left font-semibold text-muted-foreground text-[11px] uppercase tracking-wide px-5 h-10">When</th>
                  <th className="text-left font-semibold text-muted-foreground text-[11px] uppercase tracking-wide px-5 h-10">Status</th>
                  <th className="px-5 h-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const meta = updateStatusMeta(u.status);
                  const isScheduled = u.status === "scheduled";
                  const timeLabel = isScheduled
                    ? `Sends ${formatUpdateTime(u.scheduled_for)}`
                    : u.status === "draft"
                      ? `Saved ${formatUpdateTime(u.created_at)}`
                      : formatUpdateTime(u.sent_at || u.created_at);
                  const initials = (u.client?.name ?? "?")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const isSelected = selectedIds.has(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] cursor-pointer ${isSelected ? "bg-[var(--status-primary-bg)]/40" : ""}`}
                    >
                      <td className="py-3 pl-3 pr-1" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleRow(u.id)}
                          aria-label={`Select ${u.client?.name ?? "update"}`}
                        />
                      </td>
                      <td className="py-3 px-2" onClick={() => setPreview(u)}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-7 h-7 rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] flex items-center justify-center text-[11px] font-bold shrink-0">
                            {initials}
                          </span>
                          {u.client ? (
                            <Link
                              href={`/hub/clients/${u.client.client_number}/updates`}
                              className="font-semibold text-foreground hover:text-rose truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {u.client.name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-muted-foreground">Unknown client</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground" onClick={() => setPreview(u)}>
                        {formatProgrammeLabel(u.client?.package_type)}
                      </td>
                      <td className="py-3 px-2 text-foreground max-w-[240px] truncate" onClick={() => setPreview(u)}>{u.subject}</td>
                      <td className="py-3 px-2 text-muted-foreground whitespace-nowrap" onClick={() => setPreview(u)}>
                        {timeLabel}
                        {u.status === "sent" && !u.emailed && (
                          <Badge variant="secondary" className="rounded-full text-xs ml-2">Logged only</Badge>
                        )}
                        {u.status === "sent" && u.opened_at && (
                          <span className="flex items-center gap-1 text-teal mt-0.5" title={`Opened ${formatUpdateTime(u.opened_at)}`}>
                            <IconEye className="h-3 w-3" />
                            Opened
                            {u.open_count > 1 && <span className="text-muted-foreground">({u.open_count})</span>}
                          </span>
                        )}
                        {u.status === "failed" && u.send_error && (
                          <span className="block text-destructive truncate max-w-[200px] mt-0.5" title={u.send_error}>{u.send_error}</span>
                        )}
                      </td>
                      <td className="py-3 px-2" onClick={() => setPreview(u)}>
                        <TokenPill token={meta.token} label={meta.label} />
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" className="rounded-lg gap-1.5 h-8" onClick={() => setPreview(u)}>
                            <IconEye className="h-3.5 w-3.5" />
                            Preview
                          </Button>
                          {editable(u.status) && u.client && (
                            <Link href={`/hub/clients/${u.client.client_number}/updates/${u.id}/edit`}>
                              <Button variant="ghost" size="sm" className="rounded-lg h-8 w-8 p-0" title="Edit">
                                <IconEdit3 className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            title="Delete"
                            onClick={() => handleDelete(u)}
                            disabled={deleting === u.id}
                          >
                            <IconTrash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </HubCard>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="w-9 h-9 rounded-lg bg-[var(--status-primary-bg)] text-[var(--status-primary)] flex items-center justify-center shrink-0">
                <IconMail className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate">{preview?.subject}</span>
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground pb-3 border-b border-[var(--hub-border)]">
                <span><span className="font-semibold uppercase tracking-wide text-muted-foreground text-[10px]">Client</span> <span className="text-foreground font-medium">{preview.client?.name ?? "—"}</span></span>
                {preview.client_email && <span><span className="font-semibold uppercase tracking-wide text-muted-foreground text-[10px]">To</span> <span className="text-foreground">{preview.client_email}</span></span>}
                <span><span className="font-semibold uppercase tracking-wide text-muted-foreground text-[10px]">Template</span> <span className="text-foreground">{getTemplateKind(preview.template_kind).label}</span></span>
                <span className="ml-auto">
                  <TokenPill token={updateStatusMeta(preview.status).token} label={updateStatusMeta(preview.status).label} />
                </span>
              </div>
              <div className="border border-[var(--hub-border)] rounded-xl overflow-hidden bg-[var(--hub-card)]">
                <iframe srcDoc={preview.body_html} title="Email preview" className="w-full" style={{ height: "520px", border: "none" }} />
              </div>
              {editable(preview.status) && preview.client && (
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/hub/clients/${preview.client.client_number}/updates/${preview.id}/edit`}>
                    <Button variant="outline" size="sm" className="rounded-lg gap-1.5">
                      <IconEdit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/hub/clients/${preview.client.client_number}/updates/${preview.id}/edit`}>
                    <Button size="sm" className="rounded-lg gap-1.5">
                      <IconSend className="h-3.5 w-3.5" />
                      Send now
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
