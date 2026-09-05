import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { parseProgram } from "@/lib/programs/parse";

/**
 * POST /api/programs/parse — parse pasted programme text into structured slots.
 * Auth: hub session (same pattern as workout-templates/structure).
 *
 * Streams keep-alive newlines every ~5s while parsing, then emits the final
 * JSON result. Content-Type: text/plain (ndjson-style). The client reads
 * the stream, ignores keep-alive lines, and JSON.parses the last non-empty line.
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

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let aliveTimer: ReturnType<typeof setInterval> | null = null;

      try {
        // Start keep-alive heartbeat immediately so the proxy never 524s
        aliveTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode("\n"));
          } catch {
            // stream closed
          }
        }, 5000);

        // Kick off the parse (runs concurrently with keep-alive)
        const result = await parseProgram(text);

        if (aliveTimer) clearInterval(aliveTimer);

        if (!result) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                error: "AI is not configured — add ANTHROPIC_API_KEY or OPENROUTER_API_KEY.",
              }) + "\n",
            ),
          );
        } else {
          controller.enqueue(encoder.encode(JSON.stringify(result) + "\n"));
        }
      } catch (err) {
        if (aliveTimer) clearInterval(aliveTimer);
        const message = err instanceof Error ? err.message : "unknown error";
        controller.enqueue(
          encoder.encode(JSON.stringify({ error: `Parse failed: ${message}` }) + "\n"),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
