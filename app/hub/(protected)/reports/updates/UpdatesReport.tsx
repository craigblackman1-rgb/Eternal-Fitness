"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconSearch, IconEye, IconEdit3, IconTrash2, IconMail, IconExternalLink, IconSend } from "@/components/icons";
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

export function UpdatesReport({ updates }: { updates: UpdateWithClient[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | UpdateStatus>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<UpdateWithClient | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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
      if (!q) return true;
      return (
        u.subject.toLowerCase().includes(q) ||
        (u.client?.name ?? "").toLowerCase().includes(q) ||
        (u.client_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [updates, filter, query]);

  const editable = (s: string) => s === "draft" || s === "scheduled" || s === "failed";

  return (
    <div className="space-y-5">
      {/* Filter tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
                  <th className="text-left font-semibold text-muted-foreground text-[11px] uppercase tracking-wide px-5 h-10">Client</th>
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
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setPreview(u)}
                      className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] cursor-pointer"
                    >
                      <td className="py-3 px-5">
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
                      <td className="py-3 px-5 text-foreground max-w-[320px] truncate">{u.subject}</td>
                      <td className="py-3 px-5 text-muted-foreground whitespace-nowrap">
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
                      <td className="py-3 px-5">
                        <TokenPill token={meta.token} label={meta.label} />
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" className="rounded-full gap-1.5 h-8" onClick={() => setPreview(u)}>
                            <IconEye className="h-3.5 w-3.5" />
                            Preview
                          </Button>
                          {editable(u.status) && u.client && (
                            <Link href={`/hub/clients/${u.client.client_number}/updates/${u.id}/edit`}>
                              <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0" title="Edit">
                                <IconEdit3 className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
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
                    <Button variant="outline" size="sm" className="rounded-full gap-1.5">
                      <IconEdit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/hub/clients/${preview.client.client_number}/updates/${preview.id}/edit`}>
                    <Button size="sm" className="rounded-full gap-1.5">
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
