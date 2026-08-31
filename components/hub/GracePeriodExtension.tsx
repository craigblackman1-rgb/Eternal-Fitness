"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HubCard, HubCardHeader } from "@/components/hub";
import { IconCalendar, IconCheckCircle, IconX } from "@/components/icons";

interface ExtensionHistory {
  from: string;
  to: string;
  at: string;
  reason?: string;
}

interface GracePeriodExtensionProps {
  clientId: string;
  currentExpiry: string | null;
  extensions: ExtensionHistory[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * CR-EF-099 — Grace-period extension for block expiry.
 * Extending moves block_expiry_date and must NEVER touch the session count.
 * Shows the extension history.
 */
export function GracePeriodExtension({ clientId, currentExpiry, extensions }: GracePeriodExtensionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [newDate, setNewDate] = useState(currentExpiry ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!newDate) {
      toast.error("Set a new expiry date");
      return;
    }
    if (currentExpiry && newDate <= currentExpiry) {
      toast.error("New date must be after the current expiry");
      return;
    }
    setSaving(true);
    try {
      const newExtension: ExtensionHistory = {
        from: currentExpiry ?? "",
        to: newDate,
        at: new Date().toISOString(),
        reason: reason.trim() || undefined,
      };
      const updatedExtensions = [...extensions, newExtension];
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block_expiry_date: newDate,
          block_expiry_extensions: updatedExtensions,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to extend" }));
        toast.error(err.error || "Failed to extend expiry");
        return;
      }
      toast.success(`Block expiry extended to ${formatDate(newDate)}`);
      setEditing(false);
      setReason("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <HubCard>
      <HubCardHeader
        icon={<IconCalendar className="h-4 w-4" />}
        title="Block expiry"
        color="amber"
        action={
          !editing && currentExpiry ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewDate(currentExpiry);
                setEditing(true);
              }}
              className="h-7 gap-1.5 text-xs text-muted-foreground"
            >
              Extend
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-3">
        {editing ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">New expiry date</p>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-44 rounded-lg h-9"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Reason (optional)</p>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. holiday extension, injury recovery"
                  className="rounded-lg h-9"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Extending the expiry does not change the session count. {currentExpiry && `Current expiry: ${formatDate(currentExpiry)}.`}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving} className="rounded-lg gap-1.5 border-border/60">
                <IconX className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white">
                <IconCheckCircle className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Extend expiry"}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-foreground">
              {currentExpiry ? formatDate(currentExpiry) : "No expiry set"}
            </p>
            {extensions.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Extension history</p>
                {extensions.map((ext, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0 mt-0.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={12} height={12}>
                        <path d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2" />
                        <path d="M18 3v4h-4M6 21v-4h4" />
                      </svg>
                    </span>
                    <span>
                      Extended {formatDate(ext.from)} → <span className="font-semibold text-foreground">{formatDate(ext.to)}</span>
                      {" "}on {formatDate(ext.at)}
                      {ext.reason && <span className="text-muted-foreground"> — {ext.reason}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </HubCard>
  );
}
