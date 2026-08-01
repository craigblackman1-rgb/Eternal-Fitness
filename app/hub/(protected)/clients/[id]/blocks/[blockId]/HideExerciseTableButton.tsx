"use client";

export function HideExerciseTableButton() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5 px-2 rounded-lg hover:bg-[var(--hub-hover)] transition-colors mb-1.5"
      onClick={(e) => {
        const details = e.currentTarget.closest("details");
        if (details) details.open = false;
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
      Hide exercise table
    </button>
  );
}
