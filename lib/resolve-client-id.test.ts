import { describe, it, expect, vi } from "vitest";
import { resolveClientId } from "@/lib/resolve-client-id";
import type { PgClient } from "@/lib/pg-client";

/** Minimal supabase stub whose query chain resolves to the provided result. */
function makeSupabase(result: { data: { id: string } | null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { supabase: { from } as unknown as PgClient, from, select, eq, maybeSingle };
}

describe("resolveClientId", () => {
  it("returns null without querying for falsy client numbers", async () => {
    const { supabase, from } = makeSupabase({ data: null });
    expect(await resolveClientId(supabase, undefined)).toBeNull();
    expect(await resolveClientId(supabase, null)).toBeNull();
    expect(await resolveClientId(supabase, "")).toBeNull();
    expect(await resolveClientId(supabase, 0)).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns null without querying for a non-numeric value", async () => {
    const { supabase, from } = makeSupabase({ data: null });
    expect(await resolveClientId(supabase, "abc")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("looks up the client by numeric client_number and returns its id", async () => {
    const { supabase, from, select, eq } = makeSupabase({ data: { id: "uuid-123" } });
    const result = await resolveClientId(supabase, "42");
    expect(result).toBe("uuid-123");
    expect(from).toHaveBeenCalledWith("clients");
    expect(select).toHaveBeenCalledWith("id");
    expect(eq).toHaveBeenCalledWith("client_number", 42);
  });

  it("returns null when no matching client row exists", async () => {
    const { supabase } = makeSupabase({ data: null });
    expect(await resolveClientId(supabase, "999")).toBeNull();
  });
});
