import { createClient } from "@/lib/supabase-server";
import { DOCUMENT_KIND_LABEL, type DocumentKind } from "@/lib/documents/types";
import { DocumentsScreen, type DocumentRow, type QueueItem, type ClientOption } from "./DocumentsScreen";

/* ── S7 Documents (design-systems v3/10-documents.html) ────────────────────
   The document engine's own screen, across every client — distinct from the
   per-client Documents drawer (DocumentRegister.tsx) which answers "what has
   THIS client signed?". This answers "who is waiting on me right now, across
   everyone?".

   Verified against this worktree on 2026-09-05 (see the build report for the
   real row counts queried from prod): client_documents has 62 rows — 53
   signed, 4 sent (all currently unsigned), 3 superseded, 2 draft. No row
   currently has emailed = false — the "fake send" danger state is real
   plumbing kept for when it recurs, not a fabricated example.

   KPI tiles (Total/Signed/Awaiting/Drafts) are deliberately not rendered —
   CR-EF-142 already ruled out "four cards to show four numbers" on the
   client record; the same figures are recoverable from the queue count and
   the register below.

   This page only ever queries client_documents, same as before — it does
   NOT join signed_parq/signed_agreements. Those legacy pre-engine rows (17 +
   6 in prod) are real and do appear on the per-client drawer via
   DocumentRegister.tsx's `legacy` prop, but not here. That is an existing
   product gap carried forward unchanged, not something this build fixes or
   hides — see the build report. */

export const dynamic = "force-dynamic";

type ClientJoin = {
  client_number: number;
  name: string;
  email: string | null;
} | null;

interface RawDoc {
  id: string;
  kind: string;
  title: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string | null;
  emailed: boolean | null;
  signed_at: string | null;
  sent_at: string | null;
  source_type: "generated" | "scan" | null;
  source_file_name: string | null;
  source_file_mime: string | null;
  source_file_size: number | null;
  consent_choices: Record<string, boolean> | null;
  supersedes_id: string | null;
  requires_client_signature: boolean;
  requires_trainer_signature: boolean;
  client_signature: string | null;
  trainer_signature: string | null;
  clients: ClientJoin;
}

const STALE_SENT_DAYS = 14;
const STALE_DRAFT_DAYS = 7;
const MS_PER_DAY = 86_400_000;

function daysAgo(iso: string | null): number {
  if (!iso) return -1;
  return (Date.now() - new Date(iso).getTime()) / MS_PER_DAY;
}

export default async function AllDocumentsPage() {
  const supabase = createClient();

  const [{ data: docs }, { data: clientsRaw }] = await Promise.all([
    supabase
      .from("client_documents")
      .select(
        "id, kind, title, status, version, created_at, updated_at, emailed, signed_at, sent_at, " +
          "source_type, source_file_name, source_file_mime, source_file_size, consent_choices, supersedes_id, " +
          "requires_client_signature, requires_trainer_signature, client_signature, trainer_signature, " +
          "clients(client_number, name, email)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("client_number, name, client_status")
      .order("name", { ascending: true }),
  ]);

  const raw = (docs ?? []) as unknown as RawDoc[];

  // A superseded row's OWN supersedes_id points BACKWARD (what it replaced),
  // not forward. To say "superseded by vN" honestly we need the successor —
  // the row (if any) whose supersedes_id points AT this one. Verified in
  // prod: only 1 of the 3 superseded rows actually has a successor on file;
  // the other 2 get a plain "Superseded" badge, never a fabricated version.
  const successorVersionById = new Map<string, number>();
  for (const d of raw) {
    if (d.supersedes_id) successorVersionById.set(d.supersedes_id, d.version);
  }

  const rows: DocumentRow[] = raw.map((d) => ({
    id: d.id,
    clientName: d.clients?.name ?? "Unknown client",
    clientNumber: d.clients?.client_number ?? null,
    hasEmail: Boolean(d.clients?.email && d.clients.email.trim()),
    kind: d.kind,
    title: d.title,
    status: d.status,
    version: d.version,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    emailed: d.emailed,
    signedAt: d.signed_at,
    sentAt: d.sent_at,
    sourceType: d.source_type === "scan" ? "scan" : "generated",
    sourceFileName: d.source_file_name,
    sourceFileMime: d.source_file_mime,
    sourceFileSize: d.source_file_size,
    consentChoices: d.consent_choices,
    supersededByVersion: successorVersionById.get(d.id) ?? null,
    requiresClientSignature: d.requires_client_signature,
    requiresTrainerSignature: d.requires_trainer_signature,
    clientSigned: Boolean(d.client_signature),
    trainerSigned: Boolean(d.trainer_signature),
  }));

  // ── Needs you — Q1's four real states, in the order they'd cost her the
  //    most left unresolved. See 10-documents.html's §S7 comment for why
  //    each threshold is what it is. Nothing here is a fifth invented state:
  //    "no email on file" is NOT a queue row — DocumentRowActions already
  //    disables Send with a tooltip for that case, on every row it applies
  //    to, queue or register.
  const dangerRows = rows.filter((r) => r.status === "sent" && r.emailed === false);
  const staleSentRows = rows
    .filter((r) => r.status === "sent" && r.emailed !== false && daysAgo(r.sentAt) > STALE_SENT_DAYS)
    .sort((a, b) => daysAgo(b.sentAt) - daysAgo(a.sentAt));
  const staleDraftRows = rows
    .filter((r) => r.status === "draft" && daysAgo(r.createdAt) > STALE_DRAFT_DAYS)
    .sort((a, b) => daysAgo(b.createdAt) - daysAgo(a.createdAt));

  const queue: QueueItem[] = [
    ...dangerRows
      .sort((a, b) => daysAgo(b.sentAt) - daysAgo(a.sentAt))
      .map((r) => ({
        id: r.id,
        tone: "danger" as const,
        headline: `${r.clientName}'s ${kindLabel(r.kind, r.title)} shows Sent, but no email ever left`,
        subline: `Sent ${fmtDate(r.sentAt)} — status alone can't tell you this; they haven't seen it.`,
        docId: r.id,
        status: r.status,
        hasEmail: r.hasEmail,
        clientName: r.clientName,
      })),
    ...staleSentRows.map((r) => ({
      id: r.id,
      tone: "warn" as const,
      headline: `${r.clientName} hasn't signed their ${kindLabel(r.kind, r.title)}`,
      subline: `Sent ${fmtDate(r.sentAt)}, ${Math.floor(daysAgo(r.sentAt))} days ago, no reminder sent since.`,
      docId: r.id,
      status: r.status,
      hasEmail: r.hasEmail,
      clientName: r.clientName,
    })),
    ...staleDraftRows.map((r) => ({
      id: r.id,
      tone: "neutral" as const,
      headline: `${r.clientName}'s ${kindLabel(r.kind, r.title)} has sat as a draft for ${Math.floor(daysAgo(r.createdAt))} days, never sent`,
      subline: "",
      docId: r.id,
      status: r.status,
      hasEmail: r.hasEmail,
      clientName: r.clientName,
    })),
  ];

  const clientOptions: ClientOption[] = ((clientsRaw ?? []) as { client_number: number; name: string; client_status: string | null }[])
    .filter((c) => c.client_status !== "archived")
    .map((c) => ({ clientNumber: c.client_number, name: c.name }));

  return (
    <DocumentsScreen
      rows={rows}
      queue={queue}
      clientOptions={clientOptions}
      totalCount={rows.length}
    />
  );
}

function kindLabel(kind: string, title: string): string {
  return DOCUMENT_KIND_LABEL[kind as DocumentKind] ?? title;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "an unknown date";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
