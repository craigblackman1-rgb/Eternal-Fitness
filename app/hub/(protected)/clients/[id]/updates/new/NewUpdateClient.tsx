"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IconChevronLeft, IconSend, IconAlertTriangle, IconEye, IconEyeOff, IconSave, IconMail, IconClock, IconSparkles } from "@/components/icons";
import Link from "next/link";
import { toast } from "sonner";
import { UpdateChatPanel } from "./UpdateChatPanel";
import { RichTextEditor } from "@/components/hub/RichTextEditor";
import { UPDATE_TEMPLATE_KINDS, getTemplateKind } from "@/lib/email-templates/registry";
import { buildSixWeekUpdateHtml, DEFAULT_INTRO } from "@/lib/email-templates/six-week-update";
import type { SixWeekUpdateData } from "@/lib/email-templates/six-week-update";
import { buildFourWeekUpdateHtml } from "@/lib/email-templates/four-week-update";
import type { FourWeekUpdateData } from "@/lib/email-templates/four-week-update";
import { buildFlexibleUpdateHtml } from "@/lib/email-templates/flexible-update";
import type { FlexibleSection } from "@/lib/email-templates/flexible-update";
import { parsePastedHtmlUpdate, mapParsedToKindSections } from "@/lib/email-templates/parse-pasted-update";

const TEST_RECIPIENTS = [
  { label: "Craig (Decoded Ops)", email: "craig@decodedops.co.uk" },
  { label: "Esther", email: "esther.fair@eternal-fitness.co.uk" },
];

type SectionValues = Record<string, string>;

/** Existing draft/scheduled record being edited (null = compose new). Loosely typed
 *  because the flexible template stores a nested `flexSections` array, and every
 *  kind carries a `sectionLabels` map, alongside the flat greetingName/introText
 *  strings every kind also carries. */
type SavedSections = Record<string, string | FlexibleSection[] | SectionValues | undefined>;

/** Existing draft/scheduled record being edited (null = compose new). */
export interface EditableUpdate {
  id: string;
  status: "draft" | "scheduled";
  subject: string;
  sections: SavedSections;
  templateKind: string;
  blockNumber: number;
  clientEmail: string | null;
  scheduledFor: string | null;
}

interface NewUpdateClientProps {
  clientNumber: number;
  clientName: string;
  defaultEmail?: string;
  defaultEmailSource?: string;
  /** When present, the component edits this saved update instead of composing new. */
  existing?: EditableUpdate;
}

/** Rebuild the branded email HTML from the edited section values, per kind.
 *  greetingName/introText win over anything carried in `sections`. */
function buildHtmlForKind(
  kind: string,
  clientName: string,
  greetingName: string,
  introText: string,
  sections: SectionValues,
  flexSections: FlexibleSection[],
  sectionLabels: SectionValues,
): string {
  if (kind === "flexible_update") {
    return buildFlexibleUpdateHtml({ clientName, greetingName, introText, sections: flexSections });
  }
  if (kind === "four_week_update") {
    return buildFourWeekUpdateHtml({ clientName, ...sections, greetingName, introText, sectionLabels } as unknown as FourWeekUpdateData);
  }
  return buildSixWeekUpdateHtml({ clientName, ...sections, greetingName, introText, sectionLabels } as unknown as SixWeekUpdateData);
}

/** An empty trailing row, so the editor always offers one more slot to fill in. */
const EMPTY_FLEX_SECTION: FlexibleSection = { heading: "", html: "" };

/** First word of a name, for the default "Hi …," greeting. */
function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || name;
}

/** ISO -> value for <input type="datetime-local"> in the viewer's local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewUpdateClient({ clientNumber, clientName, defaultEmail = "", defaultEmailSource, existing }: NewUpdateClientProps) {
  const router = useRouter();
  const isEdit = !!existing;

  const [templateKind, setTemplateKind] = useState(existing?.templateKind ?? UPDATE_TEMPLATE_KINDS[0].id);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // which action is running
  const [testingTo, setTestingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(isEdit);
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [greetingName, setGreetingName] = useState((existing?.sections?.greetingName as string) || firstName(clientName));
  const [introText, setIntroText] = useState((existing?.sections?.introText as string) || DEFAULT_INTRO);
  const [sections, setSections] = useState<SectionValues>(
    Object.fromEntries(
      Object.entries(existing?.sections ?? {}).filter((e): e is [string, string] => typeof e[1] === "string"),
    ),
  );
  /** Per-section header text — editable per send, defaults to the template's own labels. */
  const [sectionLabels, setSectionLabels] = useState<SectionValues>(
    (existing?.sections?.sectionLabels as unknown as SectionValues | undefined) ?? {},
  );
  const [flexSections, setFlexSections] = useState<FlexibleSection[]>(
    (existing?.sections?.flexSections as FlexibleSection[] | undefined) ?? [{ ...EMPTY_FLEX_SECTION }],
  );
  const [blockNumber, setBlockNumber] = useState(existing?.blockNumber ?? 0);
  const [clientEmail, setClientEmail] = useState(existing?.clientEmail ?? defaultEmail);
  const [scheduledFor, setScheduledFor] = useState(toLocalInput(existing?.scheduledFor ?? null));
  const [showRaw, setShowRaw] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteHtml, setPasteHtml] = useState("");
  const [placeholderError, setPlaceholderError] = useState<string | null>(null);

  const kind = getTemplateKind(templateKind);

  const html = useMemo(() => {
    if (!hasDraft) return "";
    return buildHtmlForKind(templateKind, clientName, greetingName, introText, sections, flexSections, sectionLabels);
  }, [hasDraft, templateKind, clientName, greetingName, introText, sections, flexSections, sectionLabels]);

  // Clear the placeholder warning whenever the draft HTML changes (trainer
  // may have edited a section to remove a placeholder). Re-checked on send.
  useEffect(() => {
    setPlaceholderError(null);
  }, [html]);

  /** Section values plus the greeting/intro, for persisting to the DB. */
  const sectionsForSave = (): SavedSections =>
    kind.flexible ? { greetingName, introText, flexSections } : { ...sections, greetingName, introText, sectionLabels };

  /** Scan the rendered html (and individual sections) for [CLIENT placeholders
   *  the AI left unfilled. Returns null if clean, or a human-readable message
   *  listing the affected sections. */
  const checkForPlaceholders = (): string | null => {
    if (!html.includes("[CLIENT")) return null;
    const affected: string[] = [];
    if (kind.flexible) {
      flexSections.forEach((s, i) => {
        if (s.html.includes("[CLIENT")) {
          affected.push(s.heading || `Section ${i + 1}`);
        }
      });
    } else {
      for (const s of kind.sections) {
        if ((sections[s.key] ?? "").includes("[CLIENT")) {
          affected.push(sectionLabels[s.key] || s.label);
        }
      }
    }
    if (affected.length === 0) return null;
    return `This draft still has unfilled [CLIENT] placeholders in: ${affected.join(", ")}. Fill those sections before sending to a real client.`;
  };

  const handleCreateDraft = async (conversationSummary: string) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientNumber}/six-week-update/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKind, conversationSummary: conversationSummary || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate update");
      }
      const draft = await res.json();
      if (kind.flexible) {
        const draftSections = Array.isArray(draft.data?.sections) ? (draft.data.sections as FlexibleSection[]) : [];
        setFlexSections(draftSections.length > 0 ? draftSections : [{ ...EMPTY_FLEX_SECTION }]);
        if (draft.data?.greetingName) setGreetingName(draft.data.greetingName as string);
        if (draft.data?.introText) setIntroText(draft.data.introText as string);
      } else {
        const nextSections: SectionValues = {};
        const nextLabels: SectionValues = {};
        for (const s of kind.sections) {
          nextSections[s.key] = draft.data?.[s.key] ?? "";
          nextLabels[s.key] = s.label;
        }
        setSections(nextSections);
        setSectionLabels(nextLabels);
      }
      setSubject(draft.subject ?? kind.defaultSubject);
      setBlockNumber(draft.blockNumber ?? 0);
      setHasDraft(true);
      toast.success("Draft created — edit any section below");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  /** Load a fully pre-written draft straight from pasted rich text — no AI
   *  call, no rewriting. Bold/italic/links/lists carry over from the native
   *  clipboard paste; headings (real heading styles, or a short standalone
   *  line) are matched to the template's section labels; anything unmatched
   *  is folded into the nearest section above it, heading included, so
   *  nothing pasted goes missing. */
  const handleUsePastedDraft = () => {
    if (!pasteHtml.trim()) return;
    const parsed = parsePastedHtmlUpdate(pasteHtml);

    if (kind.flexible) {
      setFlexSections(parsed.sections.length > 0 ? parsed.sections : [{ ...EMPTY_FLEX_SECTION }]);
    } else {
      const mapped = mapParsedToKindSections(parsed.sections, kind.sections);
      const nextSections: SectionValues = {};
      const nextLabels: SectionValues = {};
      for (const s of kind.sections) {
        nextSections[s.key] = mapped[s.key] ?? "";
        nextLabels[s.key] = s.label;
      }
      setSections(nextSections);
      setSectionLabels(nextLabels);
    }

    if (parsed.greetingName) setGreetingName(parsed.greetingName);
    if (parsed.introText) setIntroText(parsed.introText);
    setSubject(kind.defaultSubject);
    setHasDraft(true);
    toast.success("Draft loaded from your pasted text — edit any section below");
  };

  /** POST an action to the create endpoint (compose mode). */
  const postCreate = async (action: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch(`/api/clients/${clientNumber}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, subject, html, sections: sectionsForSave(), blockNumber, templateKind, ...extra }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Request failed");
    return data;
  };

  const handleTestSend = async (email: string) => {
    setTestingTo(email);
    setError(null);
    try {
      const data = await postCreate("test", { testRecipient: email });
      toast.success(data.emailed ? `Test sent to ${email}` : "Email sending isn't configured — test not sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setTestingTo(null);
    }
  };

  const goBack = () => router.push(`/hub/clients/${clientNumber}/updates`);

  // --- Compose-mode actions -------------------------------------------------

  const handleSendNow = async () => {
    if (!clientEmail.trim()) return toast.error("Enter the client's email address");
    const ph = checkForPlaceholders();
    if (ph) {
      setPlaceholderError(ph);
      return;
    }
    setPlaceholderError(null);
    setBusy("send");
    setError(null);
    try {
      if (isEdit) {
        // Persist the current editor content first — the send route emails the
        // saved html — then dispatch it now.
        await patchExisting({ clientEmail: clientEmail.trim() });
        const res = await fetch(`/api/updates/${existing!.id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientEmail: clientEmail.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Request failed");
        toast.success(data.emailed ? "Update sent!" : "Email sending isn't configured — logged without sending");
      } else {
        const data = await postCreate("send", { clientEmail: clientEmail.trim() });
        toast.success(data.emailed ? "Update sent!" : "Email sending isn't configured — logged without sending");
      }
      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(null);
    }
  };

  const handleLog = async () => {
    setBusy("log");
    setError(null);
    try {
      await postCreate("log", { clientEmail: clientEmail.trim() || undefined });
      toast.success("Update logged");
      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(null);
    }
  };

  const handleSaveDraft = async () => {
    setBusy("draft");
    setError(null);
    try {
      if (isEdit) {
        await patchExisting({ status: "draft", scheduledFor: null });
        toast.success("Draft saved");
      } else {
        await postCreate("draft", { clientEmail: clientEmail.trim() || undefined });
        toast.success("Draft saved");
      }
      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(null);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledFor) return toast.error("Pick a date and time to send");
    if (!clientEmail.trim()) return toast.error("Enter the client's email address");
    const ph = checkForPlaceholders();
    if (ph) {
      setPlaceholderError(ph);
      return;
    }
    setPlaceholderError(null);
    const iso = new Date(scheduledFor).toISOString();
    setBusy("schedule");
    setError(null);
    try {
      if (isEdit) {
        await patchExisting({ status: "scheduled", scheduledFor: iso });
        toast.success("Update rescheduled");
      } else {
        await postCreate("schedule", { clientEmail: clientEmail.trim(), scheduledFor: iso });
        toast.success("Update scheduled");
      }
      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(null);
    }
  };

  /** PATCH the saved record with the current editor content + status/schedule. */
  const patchExisting = async (extra: Record<string, unknown>) => {
    const res = await fetch(`/api/updates/${existing!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        html,
        sections: sectionsForSave(),
        blockNumber,
        clientEmail: clientEmail.trim() || null,
        ...extra,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Request failed");
    return data;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/hub/clients/${clientNumber}/updates`} className="text-muted-foreground hover:text-foreground">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{isEdit ? "Edit Update" : "New Update"}</h1>
          <p className="text-muted-foreground">
            {isEdit ? "Make your changes, then reschedule, save, or send" : "Chat through what to include, then edit and send"}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <IconAlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!hasDraft && (
        <>
          {UPDATE_TEMPLATE_KINDS.length > 1 && (
            <div className="space-y-2 max-w-xs">
              <Label>Template</Label>
              <Select value={templateKind} onValueChange={setTemplateKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UPDATE_TEMPLATE_KINDS.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <HubCard>
            <div className="space-y-4">
              <UpdateChatPanel
                clientNumber={clientNumber}
                clientName={clientName}
                templateKind={templateKind}
                starterPrompts={kind.starterPrompts}
                generating={generating}
                onCreateDraft={handleCreateDraft}
              />
              {kind.flexible && (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-[var(--hub-border)] p-4">
                  <p className="text-sm text-muted-foreground">
                    Or skip the chat and build the sections yourself below.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSubject(kind.defaultSubject);
                      setHasDraft(true);
                    }}
                  >
                    Start a blank draft
                  </Button>
                </div>
              )}
            </div>
          </HubCard>

          <HubCard>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Already have the final text?</p>
                  <p className="text-xs text-muted-foreground">
                    Paste it below and it goes straight into the draft as written — no AI rewriting.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPaste((v) => !v)}>
                  {showPaste ? "Hide" : "Paste a draft"}
                </Button>
              </div>
              {showPaste && (
                <div className="space-y-3">
                  <RichTextEditor
                    value={pasteHtml}
                    onChange={setPasteHtml}
                    placeholder={`Hi ${firstName(clientName)},\n\nI'd like to take a moment to look back over your last block of training...`}
                    minHeight={280}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste directly from Word/Docs/Gmail — bold, headings and bullet lists carry over as-is.
                    Section headings (short standalone lines, or actual heading styles) are matched to the
                    template&apos;s sections automatically. A &ldquo;Hi [name],&rdquo; opening and a trailing
                    sign-off are recognised and stripped — the branded template adds its own.
                  </p>
                  <Button type="button" onClick={handleUsePastedDraft} disabled={!pasteHtml.trim()} className="gap-2">
                    <IconSparkles className="h-4 w-4" />
                    Use this text as the draft
                  </Button>
                </div>
              )}
            </div>
          </HubCard>
        </>
      )}

      {hasDraft && (
        <>
          {/* Editable content — per-section WYSIWYG */}
          <HubCard>
            <HubCardHeader
              title="Edit the email"
              subtitle="Use the toolbar to format — no HTML needed. Changes update the preview live."
              divider
              className="pt-0"
            />
            <CardContent className="p-0 pt-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject line</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting name</Label>
                  <Input
                    id="greeting"
                    value={greetingName}
                    onChange={(e) => setGreetingName(e.target.value)}
                    placeholder="First name"
                  />
                  <p className="text-xs text-muted-foreground">Shown as &ldquo;Hi {greetingName || "…"},&rdquo;</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intro">Opening line</Label>
                  <RichTextEditor
                    value={introText}
                    onChange={setIntroText}
                    placeholder="I'd like to take a moment to look back over your last 6 weeks of training."
                    minHeight={60}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to use the standard opener.</p>
                </div>
              </div>

              {kind.flexible
                ? flexSections.map((s, i) => (
                    <div key={i} className="space-y-2 rounded-xl border border-[var(--hub-border)] p-4">
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`flex-heading-${i}`}>Section heading</Label>
                          <Input
                            id={`flex-heading-${i}`}
                            value={s.heading}
                            onChange={(e) =>
                              setFlexSections((prev) => prev.map((row, j) => (j === i ? { ...row, heading: e.target.value } : row)))
                            }
                            placeholder="e.g. Attendance & Consistency"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFlexSections((prev) => prev.filter((_, j) => j !== i))}
                          disabled={flexSections.length <= 1}
                        >
                          Remove
                        </Button>
                      </div>
                      <RichTextEditor
                        value={s.html}
                        onChange={(v) => setFlexSections((prev) => prev.map((row, j) => (j === i ? { ...row, html: v } : row)))}
                        placeholder="Write this section — leave both fields blank to skip it"
                      />
                    </div>
                  ))
                : kind.sections.map((s) => (
                    <div key={s.key} className="space-y-2">
                      <Label htmlFor={`label-${s.key}`}>Section header</Label>
                      <Input
                        id={`label-${s.key}`}
                        value={sectionLabels[s.key] ?? s.label}
                        onChange={(e) => setSectionLabels((prev) => ({ ...prev, [s.key]: e.target.value }))}
                        placeholder={s.label}
                      />
                      <RichTextEditor
                        value={sections[s.key] ?? ""}
                        onChange={(v) => setSections((prev) => ({ ...prev, [s.key]: v }))}
                        placeholder={`Write the ${s.label.toLowerCase()} section…`}
                      />
                    </div>
                  ))}

              {kind.flexible && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFlexSections((prev) => [...prev, { ...EMPTY_FLEX_SECTION }])}
                >
                  Add another section
                </Button>
              )}
            </CardContent>
          </HubCard>

          {/* Preview */}
          <HubCard>
            <HubCardHeader
              title="Preview"
              subtitle="This is what the client receives"
              divider
              className="pt-0"
              action={
                <Button variant="outline" size="sm" onClick={() => setShowRaw(!showRaw)} className="rounded-lg gap-1.5">
                  {showRaw ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                  {showRaw ? "Hide HTML" : "View HTML"}
                </Button>
              }
            />
            <CardContent className="p-0 pt-4 space-y-4">
              <div className="border border-border/60 rounded-xl overflow-hidden bg-[#F5F5F5]">
                <iframe srcDoc={html} title="Email preview" className="w-full" style={{ height: "640px", border: "none" }} />
              </div>
              {showRaw && <Textarea value={html} readOnly rows={16} className="font-mono text-xs" />}
            </CardContent>
          </HubCard>

          {/* Send / schedule */}
          <HubCard>
            <HubCardHeader title="Send or schedule" divider className="pt-0" />
            <CardContent className="p-0 pt-4 space-y-5">
              {placeholderError && (
                <Alert variant="destructive">
                  <IconAlertTriangle className="h-4 w-4" />
                  <AlertDescription>{placeholderError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Client email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="client@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
                {defaultEmail && clientEmail === defaultEmail && (
                  <p className="text-xs text-muted-foreground">
                    Prefilled from {defaultEmailSource || "the client record"}. Edit if it&apos;s changed.
                  </p>
                )}
              </div>

              {/* Schedule */}
              <div className="rounded-xl border border-[var(--hub-border)] bg-background p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <IconClock className="h-4 w-4 text-teal" />
                  Schedule for later
                </div>
                <p className="text-xs text-muted-foreground">
                  Pick a date and time and it&apos;ll send automatically. Leave blank to send now or save as a draft.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="scheduledFor" className="text-xs">Send at</Label>
                    <Input
                      id="scheduledFor"
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSchedule}
                    disabled={busy !== null || !scheduledFor}
                  className="gap-2 rounded-lg"
                    >
                      <IconClock className="h-4 w-4" />
                      {busy === "schedule" ? "Scheduling…" : isEdit && existing?.status === "scheduled" ? "Reschedule" : "Schedule send"}
                  </Button>
                </div>
              </div>

              {/* Test send */}
              <div className="rounded-xl border border-[var(--hub-border)] bg-background p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <IconMail className="h-4 w-4 text-teal" />
                  Send a test first
                </div>
                <p className="text-xs text-muted-foreground">Check how it lands in a real inbox before it goes to the client.</p>
                <div className="flex flex-wrap gap-2">
                  {TEST_RECIPIENTS.map((t) => (
                    <Button
                      key={t.email}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestSend(t.email)}
                      disabled={testingTo !== null || busy !== null}
                      className="gap-1.5"
                    >
                      <IconSend className="h-3.5 w-3.5" />
                      {testingTo === t.email ? "Sending…" : `Test to ${t.label}`}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-3 pt-1">
                <Button variant="outline" onClick={goBack} disabled={busy !== null}>
                  Cancel
                </Button>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={handleSaveDraft} disabled={busy !== null} className="gap-2">
                    <IconSave className="h-4 w-4" />
                    {busy === "draft" ? "Saving…" : "Save draft"}
                  </Button>
                  <Button variant="outline" onClick={handleLog} disabled={busy !== null} className="gap-2">
                    <IconSave className="h-4 w-4" />
                    {busy === "log" ? "Logging…" : "Log without sending"}
                  </Button>
                  <Button
                    onClick={handleSendNow}
                    disabled={busy !== null || !clientEmail.trim()}
                    className="gap-2 bg-rose hover:bg-rose/90 text-white"
                  >
                    <IconSend className="h-4 w-4" />
                    {busy === "send" ? "Sending…" : "Send now"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </HubCard>
        </>
      )}
    </div>
  );
}
