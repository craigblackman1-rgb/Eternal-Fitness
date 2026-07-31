import { readFileSync } from "fs";
import path from "path";

/**
 * Serves client-tools/calorie-calculator.html verbatim as raw HTML — not run
 * through the React tree — so the inline <script> in the source file executes
 * exactly as it does when opened directly. Deliberately unlinked from nav/
 * footer per Esther's "hidden for now" request; reachable only via direct URL.
 */
export async function GET() {
  const source = readFileSync(path.join(process.cwd(), "app/calorie-calculator/calculator-source.html"), "utf8");
  const html = `<!DOCTYPE html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${source}`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
