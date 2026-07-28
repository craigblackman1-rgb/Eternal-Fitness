/**
 * Turns a fully pre-written update (plain text, pasted verbatim) into section
 * data — no AI rewriting. Detects the greeting line, strips a trailing
 * sign-off, and splits the body into sections at standalone heading lines
 * (a short line with no trailing sentence punctuation, on its own paragraph).
 */

export interface ParsedSection {
  heading: string;
  html: string;
}

export interface ParsedUpdate {
  greetingName: string | null;
  introText: string | null;
  sections: ParsedSection[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

const SIGNOFF_RE = /^(speak soon|see you soon|talk soon|speak to you soon|best|regards|thanks|thank you|cheers|take care|warmly|love)[,!.\s]*$/i;
const SIGNATURE_NAME_RE = /^esther\b/i;

/** Parse a pasted plain-text update into a greeting, intro paragraph, and ordered sections. */
export function parsePastedUpdate(raw: string): ParsedUpdate {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  // Strip a trailing "Speak soon, / Esther x"-style sign-off, if present —
  // the branded template already renders its own.
  for (let stripped = 0; stripped < 4 && lines.length; stripped++) {
    const last = lines[lines.length - 1].trim();
    if (SIGNATURE_NAME_RE.test(last) || SIGNOFF_RE.test(last)) {
      lines.pop();
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    } else {
      break;
    }
  }

  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;

  let greetingName: string | null = null;
  if (i < lines.length) {
    const greetMatch = lines[i].trim().match(/^hi\s+([a-z][a-z'-]*)\s*,?\s*$/i);
    if (greetMatch) {
      greetingName = greetMatch[1];
      i++;
    }
  }

  const isHeading = (line: string, prevBlank: boolean): boolean => {
    const t = line.trim();
    if (!t || !prevBlank) return false;
    if (t.length > 70) return false;
    if (/[.!?:;,]$/.test(t)) return false;
    return true;
  };

  type Block = { heading: string | null; lines: string[] };
  const blocks: Block[] = [];
  let current: Block = { heading: null, lines: [] };
  let prevBlank = true;

  for (; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      prevBlank = true;
      continue;
    }
    if (isHeading(line, prevBlank)) {
      if (current.heading || current.lines.length) blocks.push(current);
      current = { heading: t, lines: [] };
    } else {
      current.lines.push(line);
    }
    prevBlank = false;
  }
  if (current.heading || current.lines.length) blocks.push(current);

  let introText: string | null = null;
  let sections: ParsedSection[];

  if (blocks.length && !blocks[0].heading) {
    introText = blocks[0].lines.join(" ").trim() || null;
    sections = blocks.slice(1).map((b) => ({ heading: b.heading ?? "", html: paragraphsToHtml(b.lines.join("\n")) }));
  } else {
    sections = blocks.map((b) => ({ heading: b.heading ?? "", html: paragraphsToHtml(b.lines.join("\n")) }));
  }

  return { greetingName, introText, sections };
}

function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Maps parsed sections onto a fixed-key template's registry sections by
 * matching normalized headings. Unmatched blocks (headings the template has
 * no slot for) are appended, heading included, to the nearest preceding
 * matched section so nothing pasted is silently dropped.
 */
export function mapParsedToKindSections(
  parsed: ParsedSection[],
  kindSections: { key: string; label: string }[],
): Record<string, string> {
  const sections: Record<string, string> = {};
  const usedKeys = new Set<string>();
  let lastKey: string | null = null;

  for (const block of parsed) {
    const normBlock = normalizeLabel(block.heading);
    let bestKey: string | null = null;
    let bestScore = 0;

    for (const s of kindSections) {
      if (usedKeys.has(s.key)) continue;
      const normLabel = normalizeLabel(s.label);
      let score = 0;
      if (normBlock && normBlock === normLabel) {
        score = 100;
      } else if (normBlock && normLabel && (normLabel.includes(normBlock) || normBlock.includes(normLabel))) {
        score = 50;
      } else if (normBlock) {
        const blockWords = new Set(normBlock.split(" ").filter(Boolean));
        score = normLabel.split(" ").filter((w) => blockWords.has(w)).length;
      }
      if (score > bestScore) {
        bestScore = score;
        bestKey = s.key;
      }
    }

    if (bestKey && bestScore >= 1) {
      usedKeys.add(bestKey);
      sections[bestKey] = block.html;
      lastKey = bestKey;
    } else {
      const fallbackKey = lastKey ?? kindSections[0]?.key ?? null;
      if (fallbackKey) {
        const headingHtml = block.heading
          ? `<p style="margin:0 0 4px;"><strong>${escapeHtml(block.heading)}</strong></p>`
          : "";
        sections[fallbackKey] = (sections[fallbackKey] ?? "") + headingHtml + block.html;
        lastKey = fallbackKey;
      }
    }
  }

  return sections;
}
