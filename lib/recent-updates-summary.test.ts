import { describe, it, expect } from "vitest";
import { buildRecentUpdatesSection } from "@/lib/recent-updates-summary";
import type { SentUpdate } from "@/types";

type UpdateInput = Pick<SentUpdate, "subject" | "body_html" | "sent_at">;

describe("buildRecentUpdatesSection", () => {
  it("returns the empty-state message when there are no updates", () => {
    expect(buildRecentUpdatesSection([])).toBe(
      "No previous updates sent to this client yet.",
    );
  });

  it("formats a single update with sent date, subject, and stripped body", () => {
    const updates: UpdateInput[] = [
      { sent_at: "2026-02-01", subject: "Week 1", body_html: "<p>Great <b>work</b></p>" },
    ];
    expect(buildRecentUpdatesSection(updates)).toBe(
      'Sent 2026-02-01 — "Week 1"\nGreat work',
    );
  });

  it("joins multiple updates with a separator", () => {
    const updates: UpdateInput[] = [
      { sent_at: "2026-02-01", subject: "A", body_html: "<p>one</p>" },
      { sent_at: "2026-02-08", subject: "B", body_html: "<p>two</p>" },
    ];
    const result = buildRecentUpdatesSection(updates);
    expect(result).toContain('Sent 2026-02-01 — "A"\none');
    expect(result).toContain('Sent 2026-02-08 — "B"\ntwo');
    expect(result).toContain("\n\n---\n\n");
  });

  it("strips HTML markup from the body", () => {
    const updates: UpdateInput[] = [
      { sent_at: "2026-03-01", subject: "S", body_html: "<style>.x{}</style><p>Body&nbsp;text</p>" },
    ];
    expect(buildRecentUpdatesSection(updates)).toBe('Sent 2026-03-01 — "S"\nBody text');
  });
});
