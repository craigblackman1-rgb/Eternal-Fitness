import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { WebAdminTable } from "./web-admin-table";
import { HubPageHeader } from "@/components/hub";

export default async function WebAdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  const { data: keywords } = await supabase
    .from("page_keywords")
    .select("*")
    .order("page_slug");

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Web Admin"
        subtitle="Every page on the marketing site — what's live, what's hidden, and what's still to be written"
      />
      <WebAdminTable keywords={keywords ?? []} />
    </div>
  );
}
