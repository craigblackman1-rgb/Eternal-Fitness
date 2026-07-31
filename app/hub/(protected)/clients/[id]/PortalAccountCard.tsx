"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconCopy, IconRefreshCw, IconMail } from "@/components/icons";
import { TokenPill } from "@/components/hub/StatusBadge";

interface PortalStatus {
  exists: boolean;
  email: string | null;
  disabled: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PortalAccountCard({
  clientNumber,
  hasEmail,
}: {
  clientNumber: number;
  hasEmail: boolean;
}) {
  const [status, setStatus] = useState<PortalStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clients/${clientNumber}/portal-invite`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStatus(data);
      })
      .finally(() => {
        if (!cancelled) setLoadingStatus(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientNumber]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/clients/${clientNumber}/portal-invite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not generate portal credentials.");
        return;
      }
      setCredentials({ email: data.email, password: data.password });
      setStatus((prev) => ({
        exists: true,
        email: data.email,
        disabled: false,
        lastLoginAt: prev?.lastLoginAt ?? null,
        createdAt: prev?.createdAt ?? new Date().toISOString(),
      }));
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  };

  const copyBoth = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(`Username: ${credentials.email}\nPassword: ${credentials.password}`);
    toast.success("Login details copied — paste them into a text or email to send.");
  };

  return (
    <div className="pb-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {!hasEmail
            ? "No email address on file — add one before creating portal login details."
            : loadingStatus
              ? "Checking portal account status…"
              : status?.exists
                ? "This client has portal login details. Regenerating creates a new password and invalidates the old one."
                : "No portal account yet. Generate login details to give this client access to the portal."}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generating || !hasEmail || loadingStatus}
          title={hasEmail ? undefined : "No email address on file for this client"}
          className="gap-1.5 shrink-0"
        >
          {status?.exists ? <IconRefreshCw className="h-4 w-4" /> : <IconMail className="h-4 w-4" />}
          {generating ? "Generating..." : status?.exists ? "Regenerate password" : "Generate login details"}
        </Button>
      </div>

      {!loadingStatus && status?.exists && !credentials && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Username: <span className="font-medium text-foreground">{status.email}</span>
          </span>
          {status.disabled && <TokenPill token="danger" label="Disabled" />}
          {status.lastLoginAt ? (
            <span>Last login: {formatDate(status.lastLoginAt)}</span>
          ) : (
            <span>Never logged in</span>
          )}
        </div>
      )}

      {credentials && (
        <div className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            New login details — copy and send to the client now. The password won&apos;t be shown again.
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--hub-border)] bg-background px-3 py-2">
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Username</div>
                <div className="text-sm font-mono">{credentials.email}</div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard("Username", credentials.email)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Copy username"
              >
                <IconCopy className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--hub-border)] bg-background px-3 py-2">
              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Password</div>
                <div className="text-sm font-mono">{credentials.password}</div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard("Password", credentials.password)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Copy password"
              >
                <IconCopy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyBoth} className="gap-1.5">
            <IconCopy className="h-4 w-4" />
            Copy both
          </Button>
        </div>
      )}
    </div>
  );
}
