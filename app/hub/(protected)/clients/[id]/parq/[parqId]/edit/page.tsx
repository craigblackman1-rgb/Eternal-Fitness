import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { IconChevronLeft, IconFileText, IconFileSignature, IconClipboardCheck, IconAlertCircle, IconCopy } from "@/components/icons";
import { HubCard, HubCardHeader, HubAlert } from "@/components/hub";
import ParqEditClient from "@/app/parq/edit/[id]/ParqEditClient";
import { mintParqLinkParams } from "@/lib/parq-link";

// Esther-facing PAR-Q editor. Reuses the client edit form in admin mode so she
// can update fields and save without a signature, then hand the client a link to
// finish and sign the same record.
export default async function HubParqEditPage({ params }: { params: { id: string; parqId: string } }) {
  const supabase = createClient();

  const { data: client } = await supabase.from("clients").select("id, name, client_number").eq("client_number", parseInt(params.id)).single();
  if (!client) notFound();

  const { data: parq } = await supabase
    .from("signed_parq")
    .select("*")
    .eq("id", params.parqId)
    .single();

  if (!parq) notFound();

  // The "copy client link" button hands Esther a link she can text/WhatsApp — it
  // must carry the same signed exp/sig pair the public /parq/edit/[id] page
  // requires, or it's rejected outright as invalid (see lib/parq-link.ts).
  const { exp: linkExp, sig: linkSig } = mintParqLinkParams(parq.id);

  const parqLinkUrl = linkExp && linkSig
    ? `/parq/edit/${parq.id}?exp=${linkExp}&sig=${linkSig}`
    : `/parq/edit/${parq.id}`;

  const needsResign = !parq.client_signature_data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Link
          href={`/hub/clients/${client.client_number}/parq`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md px-2 py-1 -ml-2 mb-3 transition-colors"
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
          Back to PAR-Q
        </Link>
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-full bg-teal/12 text-teal flex items-center justify-center shrink-0">
            <IconFileText className="w-[22px] h-[22px]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[22px] font-bold tracking-tight text-foreground">Edit PAR-Q</h1>
              {needsResign && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]">
                  Re-sign needed
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{client.name} · Health screening questionnaire · PAR-Q v3.0</p>
          </div>
        </div>
      </div>

      {/* Admin-mode alert */}
      <HubAlert severity="warning" title="Editing as Esther — nothing here is mandatory">
        Update whatever fields have changed, then save without signing. Once you&apos;re done, send {client.name} the link on the right to review and re-sign before their next block.
      </HubAlert>

      {/* Two-column layout */}
      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-5 items-start max-[1100px]:grid-cols-1">
        <div className="min-w-0">
          <ParqEditClient parq={parq} adminMode clientNumber={parseInt(params.id)} linkExp={linkExp} linkSig={linkSig} hubMode />
        </div>

        {/* Rail */}
        <aside className="flex flex-col gap-5 sticky top-[82px] max-[1100px]:static">
          {/* Signature status */}
          <HubCard>
            <HubCardHeader
              icon={<IconFileSignature className="w-4 h-4" />}
              title="Signature status"
              color="amber"
            />
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${needsResign ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]" : "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {needsResign ? `Awaiting ${client.name}'s signature` : "Signed"}
            </span>
            <p className="text-xs text-muted-foreground mt-2.5">
              Save your changes first, then copy this link and send it to {client.name} so they can review and sign.
            </p>
            {linkExp && linkSig && (
              <>
                <div className="flex items-center gap-2 bg-[var(--hub-canvas)] border border-[var(--hub-border)] rounded-lg p-2 pl-3 mt-3">
                  <code className="flex-1 min-w-0 font-mono text-[11px] text-[var(--color-body)] overflow-hidden text-ellipsis whitespace-nowrap">
                    eternal-fitness.co.uk{parqLinkUrl}
                  </code>
                  <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1.5 text-[11px] font-semibold text-teal hover:bg-[var(--hub-hover)]">
                    <IconCopy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Link expires in 7 days · single use</p>
              </>
            )}
          </HubCard>

          {/* Record */}
          <HubCard>
            <HubCardHeader
              icon={<IconFileText className="w-4 h-4" />}
              title="Record"
              color="slate"
            />
            <div className="space-y-0">
              <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px] first:border-t-0 first:pt-0">
                <span className="text-muted-foreground">Document</span>
                <span className="font-semibold text-foreground text-right">PAR-Q v3.0</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px]">
                <span className="text-muted-foreground">Completed by</span>
                <span className="font-semibold text-foreground text-right">The client</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px]">
                <span className="text-muted-foreground">Review due</span>
                <span className="font-semibold text-foreground text-right">Every 12 months</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px]">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-semibold text-foreground text-right">EF-PARQ-2026</span>
              </div>
              {parq.client_signature_date && (
                <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px]">
                  <span className="text-muted-foreground">Last signed</span>
                  <span className="font-semibold text-foreground text-right">
                    {new Date(parq.client_signature_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              )}
            </div>
          </HubCard>

          {/* Why updating */}
          <HubCard>
            <HubCardHeader
              icon={<IconAlertCircle className="w-4 h-4" />}
              title="Why this needs updating"
              color="navy"
            />
            <p className="text-xs text-[var(--color-body)] leading-relaxed">
              Flagged from {client.name}&apos;s record: check Sections 3–6 match current status before saving. Once updated, get it re-signed before planning the next block.
            </p>
          </HubCard>
        </aside>
      </div>
    </div>
  );
}
