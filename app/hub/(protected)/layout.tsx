import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { HubShell } from "./HubShell";
import { MobileRedirect } from "@/components/hub/MobileRedirect";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/hub/login");
  }

  return (
    <HubShell>
      <MobileRedirect />
      {children}
    </HubShell>
  );
}
