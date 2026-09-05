import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ProgramImportClient } from "./ProgramImportClient";

export default async function ProgramImportPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  return <ProgramImportClient />;
}
