"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  IconX,
  IconDownload,
  IconPlus,
  IconRefreshCw,
  IconFileText,
  IconAlertCircle,
  IconCheckCircle,
} from "@/components/icons";
import { uploadKind, uploadKindLabel, formatBytes } from "@/lib/documents/upload-kind";

interface DocumentViewerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  doc: {
    id: string;
    title: string;
    source_file_name?: string | null;
    source_file_mime?: string | null;
    source_file_size?: number | null;
    created_at: string;
  };
}

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200] as const;

function formatDate(v: string) {
  return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const TYPE_TAG_CLASSES: Record<string, string> = {
  pdf: "bg-rose/10 text-[var(--rose-text)] border border-rose/20",
  img: "bg-teal/10 text-teal border border-teal/20",
  doc: "bg-[var(--hub-hover)] text-foreground border border-[var(--hub-border)]",
  other: "bg-[var(--hub-hover)] text-muted-foreground border border-[var(--hub-border)]",
};

export function DocumentViewerDrawer({ open, onOpenChange, clientName, doc }: DocumentViewerDrawerProps) {
  const kind = uploadKind(doc.source_file_mime, doc.source_file_name);
  const src = `/api/documents/${doc.id}/file?inline=1`;

  const [zoom, setZoom] = useState(100);
  const [rot, setRot] = useState(0);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (open) {
      setZoom(100);
      setRot(0);
      setError(false);
      setNonce(0);
    }
  }, [open, doc.id]);

  const cacheBustSrc = `${src}${nonce ? `&r=${nonce}` : ""}`;

  useEffect(() => {
    if (!open) return;
    if (kind !== "pdf" && kind !== "img") return;
    let cancelled = false;
    fetch(cacheBustSrc, { method: "HEAD" })
      .then((r) => { if (!cancelled && !r.ok) setError(true); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [open, doc.id, kind, cacheBustSrc]);

  const handleRetry = useCallback(() => {
    setError(false);
    setNonce((n) => n + 1);
  }, []);

  const zoomIdx = ZOOM_STEPS.indexOf(zoom as (typeof ZOOM_STEPS)[number]);
  const canZoomOut = zoomIdx > 0;
  const canZoomIn = zoomIdx < ZOOM_STEPS.length - 1;
  const zoomOut = () => { if (canZoomOut) setZoom(ZOOM_STEPS[zoomIdx - 1]); };
  const zoomIn = () => { if (canZoomIn) setZoom(ZOOM_STEPS[zoomIdx + 1]); };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[760px] p-0 gap-0 flex flex-col bg-[var(--hub-canvas)] [&>button.absolute]:hidden"
      >
        <SheetTitle className="sr-only">{doc.title}</SheetTitle>
        <SheetDescription className="sr-only">
          Document viewer for {doc.title}
        </SheetDescription>

        {/* Header */}
        <div className="bg-[var(--hub-card)] border-b border-[var(--hub-border)] px-5 py-4 flex items-start gap-3">
          <div className="w-[38px] h-[38px] rounded-lg bg-[var(--hub-hover)] text-muted-foreground flex items-center justify-center shrink-0">
            <IconFileText className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-bold text-foreground leading-tight">{doc.title}</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${TYPE_TAG_CLASSES[kind]}`}>
                {uploadKindLabel(kind)}
              </span>
            </div>
            {doc.source_file_name && (
              <p className="font-mono text-[12.5px] text-muted-foreground truncate mt-0.5">
                {doc.source_file_name}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              Uploaded {formatDate(doc.created_at)}
              {doc.source_file_size != null && doc.source_file_size > 0 && (
                <> · {formatBytes(doc.source_file_size)}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <a
              href={`/api/documents/${doc.id}/file`}
              download
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-[var(--hub-border)] bg-[var(--hub-card)] hover:bg-[var(--hub-hover)] px-3 h-9"
            >
              <IconDownload className="h-4 w-4" />
              Download
            </a>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              autoFocus
              aria-label="Close viewer"
              className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-md border border-[var(--hub-border)] bg-[var(--hub-card)] hover:bg-[var(--hub-hover)] text-muted-foreground"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Toolbar — img only, no error */}
        {kind === "img" && !error && (
          <div className="bg-[var(--hub-card)] border-b border-[var(--hub-border)] px-5 py-2 flex items-center gap-2.5">
            <div className="inline-flex items-center border border-[var(--hub-border)] bg-[var(--hub-hover)] rounded-lg p-0.5">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={zoomOut}
                disabled={!canZoomOut}
                className="inline-flex items-center justify-center w-7 h-7 rounded text-sm font-medium disabled:opacity-40"
              >
                −
              </button>
              <span className="text-xs font-semibold tabular-nums min-w-[48px] text-center">
                {zoom}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={zoomIn}
                disabled={!canZoomIn}
                className="inline-flex items-center justify-center w-7 h-7 rounded disabled:opacity-40"
              >
                <IconPlus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                className="inline-flex items-center justify-center px-2 h-7 rounded text-xs font-medium"
              >
                Fit
              </button>
            </div>
            <button
              type="button"
              onClick={() => setRot((r) => (r + 90) % 360)}
              className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-[var(--hub-border)] bg-[var(--hub-card)] hover:bg-[var(--hub-hover)] text-xs font-medium"
            >
              <IconRefreshCw className="h-3.5 w-3.5" />
              Rotate
            </button>
            <div className="flex-1" />
            <kbd className="text-[11px] text-muted-foreground border border-[var(--hub-border)] rounded px-1.5 py-0.5 bg-[var(--hub-card)]">
              Esc
            </kbd>
            <span className="text-[11px] text-muted-foreground">closes</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
          {error ? (
            <div
              role="alert"
              className="w-full rounded-[10px] bg-rose/10 border border-rose/20 px-3.5 py-3 flex items-center gap-2.5 text-[13px]"
            >
              <IconAlertCircle className="h-4 w-4 text-[var(--rose-text)] shrink-0" />
              <span className="flex-1">
                This file couldn&apos;t be loaded — try again or download it.
              </span>
              <button
                type="button"
                onClick={handleRetry}
                className="text-xs font-medium hover:underline shrink-0"
              >
                Try again
              </button>
              <a
                href={`/api/documents/${doc.id}/file`}
                download
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium border border-[var(--hub-border)] bg-[var(--hub-card)] hover:bg-[var(--hub-hover)] px-2.5 py-1.5 shrink-0"
              >
                <IconDownload className="h-3 w-3" />
                Download
              </a>
            </div>
          ) : kind === "pdf" ? (
            <iframe
              src={cacheBustSrc}
              title={doc.source_file_name ?? doc.title}
              className="w-full min-h-[720px] h-full bg-white border border-[var(--hub-border)] rounded-sm shadow"
            />
          ) : kind === "img" ? (
            <div
              style={{
                transform: `scale(${zoom / 100}) rotate(${rot}deg)`,
                transformOrigin: "top center",
                transition: "transform 150ms",
              }}
            >
              <img
                src={cacheBustSrc}
                alt={doc.title}
                className="max-w-full bg-white border border-[var(--hub-border)] shadow-lg"
                onError={() => setError(true)}
              />
            </div>
          ) : (
            <div className="max-w-[420px] text-center mx-auto py-12">
              <div className="w-16 h-16 rounded-full border border-[var(--hub-border)] bg-[var(--hub-card)] flex items-center justify-center mx-auto mb-4">
                <IconFileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-2">
                We can&apos;t preview this type yet — download to open.
              </p>
              <p className="text-[12.5px] text-muted-foreground mb-4">
                {kind === "doc"
                  ? <>Word files open in Word or Pages on your machine. The file stays on {clientName}&apos;s record either way.</>
                  : <>This file opens in its own app on your machine. The file stays on {clientName}&apos;s record either way.</>
                }
              </p>
              <a
                href={`/api/documents/${doc.id}/file`}
                download
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium border border-[var(--hub-border)] bg-[var(--hub-card)] hover:bg-[var(--hub-hover)] px-3 h-9"
              >
                <IconDownload className="h-4 w-4" />
                Download {doc.source_file_name}
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[var(--hub-card)] border-t border-[var(--hub-border)] px-5 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
          <IconCheckCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Stored against <strong>{clientName}</strong> · only staff can open this file
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
