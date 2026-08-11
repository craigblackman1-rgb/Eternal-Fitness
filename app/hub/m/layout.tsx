import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { MobileShell } from "@/components/hub/MobileShell";
import "./mobile.css";

export default async function MobileHubLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/hub/login");
  return <MobileShell>{children}</MobileShell>;
}
