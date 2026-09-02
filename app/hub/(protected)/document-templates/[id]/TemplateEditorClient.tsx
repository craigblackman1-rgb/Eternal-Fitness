"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconChevronLeft, IconSave, IconPlus, IconTrash2, IconEye } from "@/components/icons";
import { HubCard } from "@/components/hub/HubCard";
import { HubCardHeader } from "@/components/hub/HubCardHeader";
import { RichTextEditor } from "@/components/hub/RichTextEditor";
import { SendTemplateToClient } from "./SendTemplateToClient";
import { toast } from "sonner";
import type { DocumentTemplate, DocumentBody, DocumentSection, DocumentKind } from "@/lib/documents/types";

interface ClientOption { client_number: number; name: string }

export function TemplateEditorClient({ template, clients }: { template: DocumentTemplate; clients: ClientOption[] }) {
  const router = useRouter();
  const [name, setName] = useState(template.name);
  const [body, setBody] = useState<DocumentBody>(template.body ?? { sections: [] });
  const [reqClient, setReqClient] = useState(template.requires_client_signature);
  const [reqTrainer, setReqTrainer] = useState(template.requires_trainer_signature);
  const [saving, setSaving] = useState(false);

  const setSection = (id: string, patch: Partial<DocumentSection>) =>
    setBody((p) => ({ ...p, sections: p.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const addSection = () =>
    setBody((p) => ({ ...p, sections: [...p.sections, { id: `sec-${Date.now()}`, title: "New section", html: "<p></p>" }] }));
  const removeSection = (id: string) =>
    setBody((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== id) }));
  const move = (idx: number, dir: -1 | 1) =>
    setBody((p) => {
      const next = [...p.sections];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return p;
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...p, sections: next };
    });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body, requires_client_signature: reqClient, requires_trainer_signature: reqTrainer }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      toast.success("Template saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 justify-between">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <Link href="/hub/document-templates" className="text-muted-foreground hover:text-foreground shrink-0 mt-1">
            <IconChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">Edit template</h1>
            <p className="text-muted-foreground text-sm mt-1">Changes apply to documents created from now on. Already-signed documents keep the version they were signed against.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/hub/document-templates/${template.id}/preview`}
            target="_blank"
            title="Opens the last saved version — save first to preview unsaved changes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3.5 py-1.5 text-sm font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
          >
            <IconEye className="h-4 w-4" />Preview
          </Link>
          <Button onClick={save} disabled={saving} className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white px-3.5 py-1.5 h-auto text-sm font-semibold shrink-0">
            <IconSave className="h-4 w-4" />{saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <HubCard>
        <HubCardHeader title="Send to a client" />
        <div className="mt-5 border-t border-[var(--hub-border)] pt-5">
          <SendTemplateToClient kind={template.kind as DocumentKind} clients={clients} />
        </div>
      </HubCard>

      <HubCard>
        <HubCardHeader title="Settings" />
        <div className="mt-5 border-t border-[var(--hub-border)] pt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={reqClient} onChange={(e) => setReqClient(e.target.checked)} className="h-4 w-4 rounded accent-rose" />
              Requires client signature
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={reqTrainer} onChange={(e) => setReqTrainer(e.target.checked)} className="h-4 w-4 rounded accent-rose" />
              Requires trainer signature
            </label>
          </div>
        </div>
      </HubCard>

      <HubCard>
        <HubCardHeader title="Intro" />
        <div className="mt-5 border-t border-[var(--hub-border)] pt-5">
          <RichTextEditor value={body.intro ?? ""} onChange={(html) => setBody((p) => ({ ...p, intro: html }))} placeholder="Optional introduction…" />
        </div>
      </HubCard>

      <HubCard>
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--hub-border)]">
          <h3 className="text-base font-semibold text-foreground">Sections</h3>
          <Button onClick={addSection} className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white px-3.5 py-1.5 h-auto text-sm font-semibold shrink-0">
            <IconPlus className="h-4 w-4" />Add section
          </Button>
        </div>
        <div className="mt-5 space-y-6">
          {body.sections.map((s, idx) => (
            <div key={s.id} className="space-y-2 border-b border-[var(--hub-border)] pb-5 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Input value={s.title} onChange={(e) => setSection(s.id, { title: e.target.value })} className="font-medium min-w-0 flex-1" />
                <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0} className="px-2 rounded-lg h-auto text-xs">↑</Button>
                <Button variant="ghost" size="sm" onClick={() => move(idx, 1)} disabled={idx === body.sections.length - 1} className="px-2 rounded-lg h-auto text-xs">↓</Button>
                <Button variant="ghost" size="sm" onClick={() => removeSection(s.id)} className="px-2 rounded-lg h-auto text-xs text-red-500 hover:text-red-600">
                  <IconTrash2 className="h-4 w-4" />
                </Button>
              </div>
              <RichTextEditor value={s.html} onChange={(html) => setSection(s.id, { html })} />
            </div>
          ))}
          {body.sections.length === 0 && <p className="text-sm text-muted-foreground">No sections yet — add one above.</p>}
        </div>
      </HubCard>
    </div>
  );
}
