import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { HubPageHeader } from "@/components/hub";
import { ProcessQualityManager } from "./ProcessQualityManager";
import type { ProcessEntry, Sop, ImprovementEntry } from "@/types";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ProcessQualityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  const [{ data: processEntries }, { data: sops }, { data: improvementLog }] = await Promise.all([
    supabase.from("process_entries").select("*").order("ref", { ascending: true }),
    supabase.from("sops").select("*").order("ref", { ascending: true }),
    supabase.from("improvement_log").select("*").order("ref", { ascending: true }),
  ]);

  return (
    <div>
      <HubPageHeader
        title="Process & Quality"
        subtitle="Plain English. One page per process. Built so Esther can edit it without a deploy."
        className="mb-6"
      />
      <ProcessQualityManager
        initialProcessEntries={(processEntries ?? []) as ProcessEntry[]}
        initialSops={(sops ?? []) as Sop[]}
        initialImprovementLog={(improvementLog ?? []) as ImprovementEntry[]}
      />
    </div>
  );
}
