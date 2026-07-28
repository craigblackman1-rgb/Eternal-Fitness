import { notFound } from "next/navigation";
import Link from "next/link";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import { HubCard, HubCardHeader } from "@/components/hub";
import { IconChevronLeft, IconMail } from "@/components/icons";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PortalUpdateDetailPage({ params }: { params: { id: string } }) {
  const session = await getPortalSessionFromCookies();
  if (!session) return null; // layout already redirects; guard for types.

  const data = createPortalDataClient(session.clientId);
  const update = await data.getUpdateById(params.id);
  if (!update) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal" className="text-muted-foreground hover:text-foreground">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{update.subject}</h1>
          <p className="text-muted-foreground">
            {update.block_number > 0 ? `Block ${update.block_number} · ` : ""}Sent {formatDate(update.sent_at)}
          </p>
        </div>
      </div>

      <HubCard>
        <HubCardHeader icon={<IconMail className="w-5 h-5" aria-hidden="true" />} title="Email content" color="teal" />
        <div className="border border-border/60 rounded-xl overflow-hidden bg-[#F5F5F5]">
          <iframe srcDoc={update.body_html || "<p>No content</p>"} title={update.subject} className="w-full" style={{ height: "70vh", border: "none" }} />
        </div>
      </HubCard>
    </div>
  );
}
