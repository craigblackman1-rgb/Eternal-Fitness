/**
 * Turns a fully pre-written update (plain text, pasted verbatim) into section
 * data — no AI rewriting. Detects the greeting line, strips a trailing
 * sign-off, and splits the body into sections at standalone heading lines
 * (a short line with no trailing sentence punctuation).
 *
 * Pasted text from Word/Docs/Gmail commonly has ONE paragraph per line break
 * with no blank line between paragraphs (a "hard return" per paragraph, not
 * per visual line) — so heading detection must not require a preceding blank
 * line. Every non-empty line is treated as its own paragraph/heading
 * candidate on that basis.
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

const BULLET_RE = /^[*\-•]\s+/;

/** Renders a block's paragraph lines to HTML, grouping consecutive
 *  "* "/"- "/"• "-prefixed lines into a real bullet list. */
function linesToHtml(lines: string[]): string {
  const trimmed = lines.map((l) => l.trim()).filter(Boolean);
  const parts: string[] = [];
  let i = 0;
  while (i < trimmed.length) {
    if (BULLET_RE.test(trimmed[i])) {
      const items: string[] = [];
      while (i < trimmed.length && BULLET_RE.test(trimmed[i])) {
        items.push(trimmed[i].replace(BULLET_RE, ""));
        i++;
      }
      parts.push(
        `<ul style="margin:0 0 12px;padding-left:20px;">${items
          .map((it) => `<li style="margin:0 0 6px;">${escapeHtml(it)}</li>`)
          .join("")}</ul>`,
      );
    } else {
      parts.push(`<p style="margin:0 0 12px;">${escapeHtml(trimmed[i])}</p>`);
      i++;
    }
  }
  return parts.join("");
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

  const isHeading = (line: string): boolean => {
    const t = line.trim();
    if (!t) return false;
    if (t.length > 70) return false;
    if (BULLET_RE.test(t)) return false;
    if (/[.!?:;,]$/.test(t)) return false;
    return true;
  };

  type Block = { heading: string | null; lines: string[] };
  const blocks: Block[] = [];
  let current: Block = { heading: null, lines: [] };

  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (isHeading(lines[i])) {
      if (current.heading || current.lines.length) blocks.push(current);
      current = { heading: t, lines: [] };
    } else {
      current.lines.push(lines[i]);
    }
  }
  if (current.heading || current.lines.length) blocks.push(current);

  let introText: string | null = null;
  let sections: ParsedSection[];

  if (blocks.length && !blocks[0].heading) {
    introText = linesToHtml(blocks[0].lines) || null;
    sections = blocks.slice(1).map((b) => ({ heading: b.heading ?? "", html: linesToHtml(b.lines) }));
  } else {
    sections = blocks.map((b) => ({ heading: b.heading ?? "", html: linesToHtml(b.lines) }));
  }

  return { greetingName, introText, sections };
}

const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "BLOCKQUOTE"]);
const NESTED_BLOCK_SELECTOR = "p,div,h1,h2,h3,h4,h5,h6,ul,ol,blockquote";

/** Word/Docs/Gmail clipboard HTML often wraps every paragraph in one outer
 *  container (Google Docs: a single top-level `<b id="docs-internal-guid-…">`;
 *  Word: `<div class="WordSection1">`). Recurses through such wrappers so the
 *  real paragraph/heading/list elements are found regardless of nesting. */
function collectBlocks(root: Element, out: HTMLElement[]): void {
  Array.from(root.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent?.trim()) {
        const p = document.createElement("p");
        p.textContent = child.textContent;
        out.push(p);
      }
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    if (el.tagName === "LI") return; // consumed by its parent UL/OL as a leaf block

    if (el.tagName === "UL" || el.tagName === "OL") {
      out.push(el);
      return;
    }

    const hasNestedBlock = el.querySelector(NESTED_BLOCK_SELECTOR) !== null;
    if (BLOCK_TAGS.has(el.tagName) && !hasNestedBlock) {
      out.push(el);
    } else if (hasNestedBlock) {
      collectBlocks(el, out); // structural wrapper — descend instead of treating as one block
    } else if (el.textContent?.trim()) {
      out.push(el); // lone inline wrapper (e.g. a bare <b>Heading</b>) — treat as its own block
    }
  });
}

/** Parse a pasted **rich-text (HTML)** update — from a contentEditable box that
 *  received a native clipboard paste — into a greeting, intro, and ordered
 *  sections, keeping inline formatting (bold/italic/links/lists) intact.
 *  Falls back to the plain-text line parser if the paste carried no real
 *  block structure (e.g. the clipboard had no HTML, just raw text). */
export function parsePastedHtmlUpdate(html: string): ParsedUpdate {
  if (typeof document === "undefined") return { greetingName: null, introText: null, sections: [] };

  const container = document.createElement("div");
  container.innerHTML = html;

  const blocks: HTMLElement[] = [];
  collectBlocks(container, blocks);

  if (blocks.length <= 1) {
    // No real paragraph/heading structure came through — fall back to the
    // plain-text heuristic against the rendered text (line breaks intact).
    return parsePastedUpdate(container.innerText || container.textContent || "");
  }

  const textOf = (el: HTMLElement) => (el.textContent || "").trim();

  while (blocks.length) {
    const last = textOf(blocks[blocks.length - 1]);
    if (SIGNATURE_NAME_RE.test(last) || SIGNOFF_RE.test(last)) blocks.pop();
    else break;
  }

  let idx = 0;
  let greetingName: string | null = null;
  if (blocks.length) {
    const greetMatch = textOf(blocks[0]).match(/^hi\s+([a-z][a-z'-]*)\s*,?\s*$/i);
    if (greetMatch) {
      greetingName = greetMatch[1];
      idx = 1;
    }
  }

  const isHeadingBlock = (el: HTMLElement): boolean => {
    if (/^H[1-6]$/.test(el.tagName)) return true;
    if (el.tagName === "UL" || el.tagName === "OL") return false;
    const t = textOf(el);
    if (!t || t.length > 70) return false;
    if (/[.!?:;,]$/.test(t)) return false;
    return true;
  };

  type Block = { heading: string | null; html: string[] };
  const grouped: Block[] = [];
  let current: Block = { heading: null, html: [] };

  for (; idx < blocks.length; idx++) {
    const el = blocks[idx];
    if (isHeadingBlock(el)) {
      if (current.heading || current.html.length) grouped.push(current);
      current = { heading: textOf(el), html: [] };
    } else if (textOf(el)) {
      current.html.push(el.outerHTML);
    }
  }
  if (current.heading || current.html.length) grouped.push(current);

  let introText: string | null = null;
  let sections: ParsedSection[];

  if (grouped.length && !grouped[0].heading) {
    introText = grouped[0].html.join("") || null;
    sections = grouped.slice(1).map((b) => ({ heading: b.heading ?? "", html: b.html.join("") }));
  } else {
    sections = grouped.map((b) => ({ heading: b.heading ?? "", html: b.html.join("") }));
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
