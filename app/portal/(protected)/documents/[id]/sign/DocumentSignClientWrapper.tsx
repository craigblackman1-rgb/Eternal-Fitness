"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ClientDocument } from "@/lib/documents/types";
import { HubCard, HubCardHeader } from "@/components/hub";
import { IconCheckCircle, IconAlertCircle } from "@/components/icons";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Portal-wrapped sign flow. Shares the same `/api/documents/[id]/sign` endpoint
 * as the standalone magic-link sign route (`app/documents/[id]/sign/page.tsx`),
 * so a document's signed state is identical regardless of which path was used.
 */
export function DocumentSignClientWrapper({ doc }: { doc: ClientDocument }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  // Step 1: confirmation
  const [confirmedRead, setConfirmedRead] = useState(false);
  const [readError, setReadError] = useState(false);
  // Step 2: signature
  const [sigMethod, setSigMethod] = useState<"type" | "draw">("type");
  const [typedName, setTypedName] = useState(doc.client_name ?? "");
  const [typedError, setTypedError] = useState(false);
  const [drawError, setDrawError] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  // Canvas — useRef so we always have the current DOM element
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  // Step 3: final agree
  const [confirmedAgree, setConfirmedAgree] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Canvas sizing (device-pixel-ratio) ──────────────────────────────────
  const sizeCanvas = useCallback(() => {
    const canvas = canvasElRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    // Preserve existing drawing across resize
    const data = hasDrawing ? canvas.toDataURL() : null;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#131313";
    if (data) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, rect.width, rect.height); };
      img.src = data;
    }
  }, [hasDrawing]);

  // Initial size + resize listener
  useEffect(() => {
    if (sigMethod !== "draw") return;
    // Defer so the DOM has laid out after the pane becomes visible
    const t = setTimeout(sizeCanvas, 0);
    const onResize = () => { if (sigMethod === "draw") sizeCanvas(); };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [sigMethod, sizeCanvas]);

  // ── Pointer event helpers ───────────────────────────────────────────────
  const pos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasElRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasElRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.preventDefault();
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasElRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!hasDrawing) { setHasDrawing(true); setDrawError(false); }
    e.preventDefault();
  }, [pos, hasDrawing]);

  const stopDrawing = useCallback(() => { drawingRef.current = false; }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasElRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────
  const submitSignature = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const signatureValue =
        sigMethod === "draw" && canvasElRef.current
          ? canvasElRef.current.toDataURL()
          : typedName.trim() || doc.client_name || "";
      const res = await fetch(`/api/documents/${doc.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "client",
          name: typedName.trim() || doc.client_name || "",
          signature: signatureValue,
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sign");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [doc.id, typedName, doc.client_name, sigMethod]);

  const goToStep = (n: number) => {
    if (step === 1 && n > 1) {
      if (!confirmedRead) { setReadError(true); return; }
      setReadError(false);
    }
    if (step === 2 && n > 2) {
      if (sigMethod === "type") {
        if (!typedName.trim()) { setTypedError(true); return; }
        setTypedError(false);
      } else {
        if (!hasDrawing) { setDrawError(true); return; }
        setDrawError(false);
      }
    }
    setStep(n);
  };

  const handleSubmit = () => {
    if (!confirmedAgree) { setAgreeError(true); return; }
    setAgreeError(false);
    submitSignature();
  };

  if (done) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-teal/40 bg-teal/5 p-6">
          <div className="flex gap-3">
            <div className="w-[38px] h-[38px] rounded-xl bg-teal/20 text-teal flex items-center justify-center shrink-0">
              <IconCheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Signed. That is everything.</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Signed at {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} on{" "}
                {formatDate(new Date().toISOString())}. A copy is on its way to your email.
              </p>
            </div>
          </div>
        </div>

        <HubCard>
          <h3 className="text-base font-semibold text-foreground mb-4">What happens now</h3>
          <ul className="space-y-3 mb-6">
            {[
              "The signed copy is in your documents, marked Signed. It stays there permanently.",
              "Esther has been notified. You do not need to do anything else.",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <IconCheckCircle className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.replace("/portal/documents")}
              className="inline-flex min-h-10 items-center rounded-full bg-teal text-white px-5 text-sm font-semibold hover:bg-teal/90"
            >
              Back to documents
            </button>
            <button
              type="button"
              onClick={() => router.replace(`/portal/documents/${doc.id}`)}
              className="inline-flex min-h-10 items-center rounded-full border border-input px-5 text-sm font-medium hover:bg-accent"
            >
              View signed copy
            </button>
          </div>
        </HubCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4" role="alert">
          <div className="flex gap-2.5">
            <IconAlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Steps indicator */}
      <ol className="flex items-center gap-2" aria-label="Signing progress">
        {[
          { n: 1, label: "Check" },
          { n: 2, label: "Sign" },
          { n: 3, label: "Confirm" },
        ].map((s) => {
          const isCurrent = s.n === step;
          const isDone = s.n < step;
          return (
            <li key={s.n} className="flex items-center gap-2">
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  isCurrent
                    ? "border-teal bg-teal/10 text-teal"
                    : isDone
                      ? "border-teal/30 bg-teal/5 text-teal"
                      : "border-border/60 text-muted-foreground"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-teal/20 flex items-center justify-center text-[10px] font-bold">
                  {isDone ? <IconCheckCircle className="w-3 h-3 text-teal" /> : s.n}
                </span>
                {s.label}
              </span>
              {s.n < 3 && <span className="w-6 h-px bg-border/60" />}
            </li>
          );
        })}
      </ol>

      {/* Step 1: What you're signing */}
      {step === 1 && (
        <HubCard>
          <HubCardHeader title="What you are about to sign" color="teal" />
          <p className="text-sm text-muted-foreground mb-6">
            {doc.kind === "feedback"
              ? "Your feedback will be recorded and shared with Esther."
              : `Version ${doc.version} of the ${doc.title || "document"}, sent to you${doc.sent_at ? ` on ${formatDate(doc.sent_at)}` : ""}.`}
          </p>

          {doc.body.intro && (
            <p className="text-sm text-muted-foreground mb-5">{doc.body.intro}</p>
          )}

          <ul className="space-y-3 mb-6">
            {doc.body.sections.slice(0, 4).map((section) => (
              <li key={section.id} className="flex items-start gap-3 text-sm">
                <IconCheckCircle className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                <span className="text-foreground">{section.title}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-teal/30 bg-teal/5 p-4 mb-5">
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0">
                <IconAlertCircle className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">This summary is not the full document</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  It is here to help, but the full wording is what you are signing.{" "}
                  <a href={`/portal/documents/${doc.id}`} className="text-teal font-medium hover:underline">Read the full document</a> before you continue.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-off-white p-4 mb-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedRead}
                onChange={(e) => { setConfirmedRead(e.target.checked); if (e.target.checked) setReadError(false); }}
                className="mt-0.5 h-4 w-4 text-teal shrink-0"
              />
              <span className="text-sm text-foreground">
                I have read the document, or had it read to me
                <span className="block text-xs text-muted-foreground mt-0.5">
                  If you would rather Esther went through it with you first, close this and call 07517 658 128.
                </span>
              </span>
            </label>
            {readError && (
              <p className="text-xs text-red-600 mt-3 flex items-center gap-1.5">
                <IconAlertCircle className="w-3.5 h-3.5" />
                Please tick the box to confirm you have read it.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => goToStep(2)} className="inline-flex min-h-10 items-center rounded-full bg-teal text-white px-5 text-sm font-semibold hover:bg-teal/90">
              Continue to signing
            </button>
            <button type="button" onClick={() => router.replace("/portal/documents")} className="inline-flex min-h-10 items-center rounded-full border border-input px-5 text-sm font-medium hover:bg-accent">
              Not now
            </button>
          </div>
        </HubCard>
      )}

      {/* Step 2: Sign */}
      {step === 2 && (
        <HubCard>
          <HubCardHeader title="Add your signature" color="teal" />
          <p className="text-sm text-muted-foreground mb-6">
            Both ways below are equally valid in law. Typing is usually easier, and it is the only one that works with a keyboard alone or a screen reader.
          </p>

          <fieldset className="mb-6">
            <legend className="text-sm font-semibold text-foreground mb-3">How would you like to sign?</legend>
            <div className="flex flex-wrap gap-3">
              <label className={`flex items-start gap-2.5 rounded-xl border p-4 cursor-pointer ${sigMethod === "type" ? "border-teal bg-teal/5" : "border-border/60 hover:bg-off-white"}`}>
                <input type="radio" name="sigmethod" value="type" checked={sigMethod === "type"} onChange={() => setSigMethod("type")} className="mt-0.5 h-4 w-4 text-teal shrink-0" />
                <span className="text-sm">
                  <span className="font-medium text-foreground">Type my name</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">Recommended — works with any device</span>
                </span>
              </label>
              <label className={`flex items-start gap-2.5 rounded-xl border p-4 cursor-pointer ${sigMethod === "draw" ? "border-teal bg-teal/5" : "border-border/60 hover:bg-off-white"}`}>
                <input type="radio" name="sigmethod" value="draw" checked={sigMethod === "draw"} onChange={() => setSigMethod("draw")} className="mt-0.5 h-4 w-4 text-teal shrink-0" />
                <span className="text-sm">
                  <span className="font-medium text-foreground">Draw my signature</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">Needs a mouse, finger or stylus</span>
                </span>
              </label>
            </div>
          </fieldset>

          {/* ── Typed signature pane ─────────────────────────────────────── */}
          {sigMethod === "type" && (
            <div>
              <div className="mb-5">
                <label htmlFor="typed-name" className="block text-sm font-semibold text-foreground mb-1">Type your full name</label>
                <p className="text-xs text-muted-foreground mb-2">Type it as it appears on your records.</p>
                <input
                  id="typed-name"
                  type="text"
                  autoComplete="name"
                  value={typedName}
                  onChange={(e) => { setTypedName(e.target.value); if (e.target.value.trim()) setTypedError(false); }}
                  placeholder="Type your full name"
                  className="w-full rounded-lg border border-input bg-white px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal"
                />
                {typedError && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
                    <IconAlertCircle className="w-3.5 h-3.5" />
                    Type your full name to sign.
                  </p>
                )}
              </div>

              {typedName.trim() && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Your signature will look like this</p>
                  <div className="rounded-lg border border-border/60 bg-white p-5 min-h-[4rem] flex items-center justify-center">
                    <span className="font-serif italic text-2xl text-foreground">{typedName.trim()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Drawn signature pane ─────────────────────────────────────── */}
          {sigMethod === "draw" && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Draw your signature in the box</p>
              <p className="text-xs text-muted-foreground mb-4">
                Use a finger on a phone or tablet, or hold the mouse button down. If it goes wrong, clear it and start again — as many times as you like.
              </p>
              <div className="border-2 border-dashed rounded-lg bg-cream p-4 mb-3">
                <canvas
                  ref={canvasElRef}
                  className="w-full h-44 block bg-white rounded border border-border touch-none cursor-crosshair"
                  aria-label="Draw your signature in the box"
                  role="img"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                  onPointerLeave={stopDrawing}
                />
              </div>
              <button
                type="button"
                onClick={clearCanvas}
                className="inline-flex min-h-9 items-center rounded-full border border-input px-4 text-xs font-medium hover:bg-accent"
              >
                Clear and start again
              </button>
              <p className="text-xs text-muted-foreground mt-4">
                Drawing needs a pointing device. If that is difficult,{" "}
                <button
                  type="button"
                  onClick={() => setSigMethod("type")}
                  className="text-teal font-medium hover:underline"
                >
                  switch to typing your name instead
                </button>
                .
              </p>
              {drawError && (
                <p className="text-xs text-red-600 mt-3 flex items-center gap-1.5">
                  <IconAlertCircle className="w-3.5 h-3.5" />
                  The box is empty. Draw your signature, or switch to typing.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            <button type="button" onClick={() => goToStep(3)} className="inline-flex min-h-10 items-center rounded-full bg-teal text-white px-5 text-sm font-semibold hover:bg-teal/90">
              Continue
            </button>
            <button type="button" onClick={() => setStep(1)} className="inline-flex min-h-10 items-center rounded-full border border-input px-5 text-sm font-medium hover:bg-accent">
              Back
            </button>
          </div>
        </HubCard>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <HubCard>
          <HubCardHeader title="Check and confirm" color="teal" />
          <p className="text-sm text-muted-foreground mb-6">Last look. Nothing has been sent yet.</p>

          <div className="rounded-xl border border-border/60 divide-y divide-border/60 mb-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 px-4">
              <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Document</span>
              <span className="text-sm font-semibold text-foreground">{doc.title || "—"}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 px-4">
              <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Signed by</span>
              <span className="text-sm font-semibold text-foreground">{typedName.trim() || doc.client_name || "—"}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 px-4">
              <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Date</span>
              <span className="text-sm font-semibold text-foreground">{formatDate(new Date().toISOString())}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 px-4">
              <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Your signature</span>
              <span className="text-sm font-semibold text-foreground">
                {sigMethod === "draw" ? (
                  hasDrawing && canvasElRef.current ? (
                    <img
                      src={canvasElRef.current.toDataURL()}
                      alt="Your drawn signature"
                      className="max-h-20"
                    />
                  ) : (
                    "—"
                  )
                ) : (
                  <span className="font-serif italic text-lg">{typedName.trim() || "—"}</span>
                )}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-off-white p-4 mb-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedAgree}
                onChange={(e) => { setConfirmedAgree(e.target.checked); if (e.target.checked) setAgreeError(false); }}
                className="mt-0.5 h-4 w-4 text-teal shrink-0"
              />
              <span className="text-sm text-foreground">
                I agree to the document and its terms
                <span className="block text-xs text-muted-foreground mt-0.5">
                  A signed PDF copy is emailed to you and kept in your documents.
                </span>
              </span>
            </label>
            {agreeError && (
              <p className="text-xs text-red-600 mt-3 flex items-center gap-1.5">
                <IconAlertCircle className="w-3.5 h-3.5" />
                Please tick the box to agree.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleSubmit} disabled={submitting} className="inline-flex min-h-10 items-center rounded-full bg-teal text-white px-5 text-sm font-semibold hover:bg-teal/90 disabled:opacity-50">
              {submitting ? "Signing…" : "Sign and send"}
            </button>
            <button type="button" onClick={() => setStep(2)} className="inline-flex min-h-10 items-center rounded-full border border-input px-5 text-sm font-medium hover:bg-accent">
              Back to my signature
            </button>
          </div>
        </HubCard>
      )}
    </div>
  );
}
