import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HubPageHeader, HubCard } from "@/components/hub";

export const dynamic = "force-dynamic";

const settingsLinks = [
  { href: "/hub/settings/training-rules", label: "Training rules", description: "Rule types for structured programming rules on each client." },
  { href: "/hub/settings/studio-equipment", label: "Studio equipment", description: "Equipment the Plan Agent can programme from." },
  { href: "/hub/settings/plan-agent", label: "Plan agent rules", description: "Principles and safety rules the Plan Agent follows." },
  { href: "/hub/settings/integrations", label: "Integrations", description: "Connect the studio calendar for Outlook sync." },
  { href: "/hub/process-quality", label: "Process & Quality", description: "Studio processes, SOPs, and the improvement log." },
  { href: "/hub/web-admin", label: "Web admin", description: "Marketing site pages — what's live, hidden, or to write." },
];

export default async function SettingsIndexPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Settings"
        subtitle="Studio configuration — rules, equipment, the Plan Agent, integrations and admin tools."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href} className="contents">
            <HubCard className="hover:border-rose/40 transition-colors cursor-pointer">
              <h3 className="text-sm font-bold text-foreground">{link.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
            </HubCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
