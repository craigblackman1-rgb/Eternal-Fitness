"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { IconChevronLeft, IconCopy, IconSave, IconMail, IconFileText, IconTrash2 } from "@/components/icons";
import { RichTextEditor } from "@/components/hub/RichTextEditor";
import { toast } from "sonner";
import type { ClientDocument, DocumentBody } from "@/lib/documents/types";

const readOnlyStatuses = ["signed", "superseded"];

export function DocumentDetailClient({
  clientNumber,
  doc,
  clientName,
  clientEmail,
  deliveryHistory,
}: {
  clientNumber: number;
  doc: ClientDocument;
  clientName: string | null;
  clientEmail: string | null;
  deliveryHistory?: ReactNode;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState<DocumentBody>(doc.body);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [trainerName, setTrainerName] = useState(doc.trainer_name ?? "Esther Fair");
  const [trainerSig, setTrainerSig] = useState(doc.trainer_signature ?? "");

  const locked = readOnlyStatuses.includes(doc.status);
  const signUrl = typeof window !== "undefined" ? `${window.location.origin}/documents/${doc.id}/sign` : "";
  const hasClientEmail = Boolean(clientEmail && clientEmail.trim());

  const setSection = (id: string, html: string) =>
    setBody((prev) => ({ ...prev, sections: prev.sections.map((s) => (s.id === id ? { ...s, html } : s)) }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      toast.success("Saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const act = async (label: string, run: () => Promise<Response>, done: (data: unknown) => void) => {
    setBusy(label);
    try {
      const res = await run();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      done(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const sendEmail = () =>
    act("send-email", () => fetch(`/api/documents/${doc.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send_email" }),
    }), (data) => {
      const dry = Boolean((data as { dryRun?: boolean }).dryRun);
      toast.success(dry ? "Email queued (dry run — no email backend configured)" : `Email sent to ${clientEmail}`);
      router.refresh();
    });

  const copyLink = () =>
    act("copy-link", async () => {
      try { await navigator.clipboard.writeText(signUrl); } catch { /* ignore */ }
      return new Response("{}", { status: 200 });
    }, () => {
      toast.success("Sign link copied to clipboard");
    });

  const signAsTrainer = () => {
    if (!trainerSig.trim()) { toast.error("Type your signature"); return; }
    act("trainer-sign", () => fetch(`/api/documents/${doc.id}/sign`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "trainer", name: trainerName, signature: trainerSig }),
    }), () => { toast.success("Signed as trainer"); router.refresh(); });
  };

  const newVersion = () =>
    act("version", () => fetch(`/api/documents/${doc.id}/version`, { method: "POST" }),
      (data) => router.push(`/hub/clients/${clientNumber}/documents/${(data as { id: string }).id}`));

  const deleteDoc = () => {
    if (!confirm(`Delete this ${doc.status} document? This can't be undone.`)) return;
    act("delete", () => fetch(`/api/documents/${doc.id}`, { method: "DELETE" }), () => {
      toast.success("Document deleted");
      router.push(`/hub/clients/${clientNumber}/documents`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/hub/clients/${clientNumber}/documents`} className="text-muted-foreground hover:text-foreground">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{doc.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="rounded-full text-xs capitalize">{doc.status}</Badge>
            <Badge variant="outline" className="rounded-full text-xs">v{doc.version}</Badge>
            {doc.status === "sent" && doc.emailed === false && (
              <Badge variant="outline" className="rounded-full text-xs border-amber-300 bg-amber-50 text-amber-800">Not actually delivered</Badge>
            )}
          </div>
        </div>
        {locked && (
          <Button variant="outline" onClick={newVersion} disabled={busy !== null} className="rounded-lg gap-1.5">
            <IconFileText className="h-4 w-4" />
            {busy === "version" ? "…" : "New version"}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={deleteDoc}
          disabled={busy !== null}
          className="rounded-lg gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <IconTrash2 className="h-4 w-4" />
          {busy === "delete" ? "…" : "Delete"}
        </Button>
      </div>

      {doc.status === "draft" && (
        <p className="text-sm text-muted-foreground rounded-lg bg-[var(--hub-canvas)] border border-[var(--hub-border)] px-3 py-2">
          This is a draft — nothing has been sent to the client yet.
        </p>
      )}

      {/* Edit */}
      <Card className="shadow-sm bg-[var(--hub-card)] rounded-2xl border border-[var(--hub-border)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{locked ? "Document" : "Edit document"}</CardTitle>
          {!locked && (
            <Button variant="outline" size="sm" onClick={save} disabled={saving} className="rounded-lg gap-1.5">
              <IconSave className="h-4 w-4" />{saving ? "Saving…" : "Save"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={locked} />
          </div>
          {body.intro && (
            <div
              className="text-sm text-muted-foreground rounded-lg bg-background border border-[var(--hub-border)] p-3 [&_strong]:text-foreground"
              dangerouslySetInnerHTML={{ __html: body.intro }}
            />
          )}
          {body.sections.map((s) => (
            <div key={s.id} className="space-y-2">
              <Label>{s.title}</Label>
              {locked ? (
                <div className="text-sm text-muted-foreground rounded-lg bg-background border border-[var(--hub-border)] p-3" dangerouslySetInnerHTML={{ __html: s.html }} />
              ) : (
                <RichTextEditor value={s.html} onChange={(html) => setSection(s.id, html)} />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Consent choices — the client's actual ticked/unticked answers per option,
          not just the overall document status. A box the client never touched
          has no key in consent_choices at all, so it's treated as not granted. */}
      {!!doc.body.consentGroups?.length && (
        <Card className="shadow-sm bg-[var(--hub-card)] rounded-2xl border border-[var(--hub-border)]">
          <CardHeader><CardTitle>Consent choices</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {doc.client_signature ? (
              doc.body.consentGroups.map((group) => (
                <div key={group.id} className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.legend}</p>
                  {group.options.map((opt) => {
                    const granted = !!doc.consent_choices?.[opt.key];
                    return (
                      <p key={opt.key} className="text-sm text-foreground">
                        {granted ? "✓" : "✗"} {opt.label}
                      </p>
                    );
                  })}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Awaiting client signature — consent choices aren&apos;t recorded until then.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Questionnaire responses — any kind built on the feedbackSections schema
          (feedback, parq) has no other place for Esther to read what the client
          answered, so this is generic on body shape, not hardcoded to one kind. */}
      {!!doc.body.feedbackSections?.length && doc.feedback_responses && (
        <Card className="shadow-sm bg-[var(--hub-card)] rounded-2xl border border-[var(--hub-border)]">
          <CardHeader><CardTitle>Responses</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {(doc.body.feedbackSections ?? []).map((s) => (
              <div key={s.id} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.title}</p>
                {s.questions.map((q) => {
                  const raw = (doc.feedback_responses?.answers as Record<string, string> | undefined)?.[q.id];
                  const answer = q.type === "choice" ? q.options?.find((o) => o.value === raw)?.label ?? raw : raw;
                  return (
                    <div key={q.id} className="rounded-lg border border-[var(--hub-border)] bg-background p-3">
                      <p className="text-xs text-muted-foreground mb-1">{q.label}</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{answer || <span className="text-muted-foreground italic">Not answered</span>}</p>
                    </div>
                  );
                })}
              </div>
            ))}
            {(doc.body.feedbackConsents ?? []).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</p>
                {(doc.body.feedbackConsents ?? []).map((c) => {
                  const checked = !!(doc.feedback_responses?.consents as Record<string, boolean> | undefined)?.[c.id];
                  return (
                    <p key={c.id} className="text-sm text-foreground">
                      {checked ? "✓" : "✗"} {c.label}
                    </p>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Signatures */}
      <Card className="shadow-sm bg-[var(--hub-card)] rounded-2xl border border-[var(--hub-border)]">
        <CardHeader><CardTitle>Signatures</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Client: </span>
            {doc.client_signature
              ? <span className="text-foreground font-medium">Signed by {doc.client_name} on {doc.client_signed_date}</span>
              : <span className="text-muted-foreground">Awaiting client signature</span>}
          </div>
          {doc.requires_trainer_signature && (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Trainer: </span>
                {doc.trainer_signature
                  ? <span className="text-foreground font-medium">Signed by {doc.trainer_name} on {doc.trainer_signed_date}</span>
                  : <span className="text-muted-foreground">Not yet signed</span>}
              </div>
              {!doc.trainer_signature && !locked && (
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Type your signature</Label>
                    <Input value={trainerSig} onChange={(e) => setTrainerSig(e.target.value)} placeholder={trainerName} className="w-64" />
                  </div>
                  <Button onClick={signAsTrainer} disabled={busy !== null} className="bg-teal hover:bg-teal/90 text-white rounded-lg">
                    {busy === "trainer-sign" ? "…" : "Sign as trainer"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send */}
      {!locked && (
        <Card className="shadow-sm bg-[var(--hub-card)] rounded-2xl border border-[var(--hub-border)]">
          <CardHeader><CardTitle>Send to client</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Email the client their signing link, or copy it to send manually (text, WhatsApp, etc.).
            </p>
            {doc.status === "sent" && doc.emailed === false && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                The last send didn&apos;t actually go out — no email backend is configured on this
                environment, so it was logged as sent without delivering. Use Copy link below until
                that&apos;s fixed.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {hasClientEmail ? (
                <Button
                  onClick={sendEmail}
                  disabled={busy !== null}
                  className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white shrink-0"
                >
                  {busy === "send-email" ? "…" : (
                    <>
                      <IconMail className="h-4 w-4" />
                      {doc.status === "draft" ? "Send email to client" : "Resend email"}
                    </>
                  )}
                </Button>
              ) : (
                <Button disabled className="rounded-lg gap-1.5 bg-rose/60 text-white shrink-0 cursor-not-allowed">
                  <IconMail className="h-4 w-4" />Send email to client
                </Button>
              )}
              <Button onClick={copyLink} disabled={busy !== null} variant="outline" className="rounded-lg gap-1.5 shrink-0">
                <IconCopy className="h-4 w-4" />Copy link
              </Button>
            </div>
            {!hasClientEmail && (
              <p className="text-xs text-muted-foreground">
                No email address on file for {clientName || "this client"} — add one on the client record to enable email sending. You can still copy the link manually below.
              </p>
            )}
            <div className="flex items-center gap-2">
              <Input readOnly value={signUrl} className="font-mono text-xs" />
            </div>
          </CardContent>
        </Card>
      )}

      {deliveryHistory && (
        <Card className="shadow-sm bg-[var(--hub-card)] rounded-2xl border border-[var(--hub-border)]">
          <CardHeader><CardTitle>Delivery history</CardTitle></CardHeader>
          <CardContent>{deliveryHistory}</CardContent>
        </Card>
      )}
    </div>
  );
}
