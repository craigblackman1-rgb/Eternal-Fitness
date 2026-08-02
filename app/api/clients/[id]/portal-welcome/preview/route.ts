import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { buildPortalWelcomeEmailHtml } from "@/lib/portal-auth";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("client_number", parseInt(params.id))
    .single();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const html = buildPortalWelcomeEmailHtml({
    clientName: client.name,
    resetLink: "https://eternalfitness.co.uk/portal/reset-password?token=preview-placeholder",
    loginUrl: "https://eternalfitness.co.uk/portal/login",
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
