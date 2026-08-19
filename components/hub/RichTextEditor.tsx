"use client";

import { useEffect, useRef, useCallback } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

type ToolbarAction =
  | { kind: "command"; command: string; label: string; title: string; style?: React.CSSProperties }
  | { kind: "link"; label: string; title: string }
  | { kind: "unlink"; label: string; title: string };

const TOOLBAR: ToolbarAction[] = [
  { kind: "command", command: "bold", label: "B", title: "Bold", style: { fontWeight: 700 } },
  { kind: "command", command: "italic", label: "I", title: "Italic", style: { fontStyle: "italic" } },
  { kind: "command", command: "insertUnorderedList", label: "•", title: "Bullet list" },
  { kind: "link", label: "Link", title: "Add link" },
  { kind: "unlink", label: "Unlink", title: "Remove link" },
];

/**
 * Zero-dependency WYSIWYG editor for people who don't write HTML. Wraps a
 * contentEditable region with a minimal formatting toolbar (execCommand — still
 * universally supported and the pragmatic choice here). Emits sanitised-ish
 * innerHTML on every change; content is Esther's own copy going into her own
 * emails, so we keep only inline formatting and strip nothing structural.
 */
export function RichTextEditor({ value, onChange, placeholder, minHeight = 96 }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync incoming value only when it diverges from the DOM (e.g. AI regenerate),
  // never on every keystroke — that would reset the caret to the start.
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  const exec = useCallback(
    (command: string) => {
      ref.current?.focus();
      document.execCommand(command, false);
      emit();
    },
    [emit],
  );

  const addLink = useCallback(() => {
    ref.current?.focus();
    const url = window.prompt("Link URL (include https://)");
    if (url) {
      document.execCommand("createLink", false, url);
      emit();
    }
  }, [emit]);

  return (
    <div className="rounded-[12px] border border-[var(--hub-border)] bg-background overflow-hidden focus-within:ring-2 focus-within:ring-rose/40 focus-within:border-rose/60 transition">
      <div className="flex items-center gap-1 border-b border-[var(--hub-border)] bg-[var(--hub-card)] px-2 py-1.5">
        {TOOLBAR.map((action) => (
          <button
            key={action.label}
            type="button"
            title={action.title}
            aria-label={action.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (action.kind === "command") exec(action.command);
              else if (action.kind === "link") addLink();
              else exec("unlink");
            }}
            className="min-w-8 h-8 px-2 rounded-md text-sm text-muted-foreground hover:bg-rose/10 hover:text-rose transition flex items-center justify-center"
            style={action.kind === "command" ? action.style : undefined}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        className="ef-rte px-4 py-3 text-sm leading-relaxed text-foreground outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-rose [&_a]:underline"
        style={{ minHeight }}
      />
      <style>{`
        .ef-rte:empty:before { content: attr(data-placeholder); color: var(--muted-foreground, #9ca3af); pointer-events: none; }
        .ef-rte p { margin: 0 0 8px; }
        .ef-rte p:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}
