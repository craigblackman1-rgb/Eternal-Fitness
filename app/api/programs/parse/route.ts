import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { parseProgram } from "@/lib/programs/parse";

/**
 * POST /api/programs/parse — parse pasted programme text into structured slots.
 * Auth: hub session (same pattern as workout-templates/structure).
 */

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const text = (body.text ?? "").toString().trim();
  if (!text) return NextResponse.json({ error: "No text to parse" }, { status: 400 });

  try {
    const result = await parseProgram(text);
    if (!result) {
      return NextResponse.json(
        { error: "AI is not configured — add ANTHROPIC_API_KEY or OPENROUTER_API_KEY." },
        { status: 503 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: `Parse failed: ${message}` }, { status: 502 });
  }
}
