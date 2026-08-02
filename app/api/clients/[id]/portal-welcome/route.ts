import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendPortalWelcomeEmail, PortalAuthError } from "@/lib/portal-auth";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client } = await supabase
    .from("clients")
    .select("id, email")
    .eq("client_number", parseInt(params.id))
    .single();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  try {
    const result = await sendPortalWelcomeEmail(client.id);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof PortalAuthError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not send welcome email. Please try again." }, { status: 500 });
  }
}
