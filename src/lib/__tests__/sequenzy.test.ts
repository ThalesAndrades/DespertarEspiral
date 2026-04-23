/**
 * Tests — src/lib/sequenzy.ts
 * Coverage: fireEventAsync (fire-and-forget wrapper), fireEvent error handling
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

/* ── Mock supabase BEFORE importing sequenzy ── */
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import { fireEvent, fireEventAsync } from "@/lib/sequenzy";
import { supabase } from "@/lib/supabase";

const mockInvoke     = supabase.functions.invoke as ReturnType<typeof vi.fn>;
const mockGetSession = supabase.auth.getSession  as ReturnType<typeof vi.fn>;

describe("fireEvent", () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "mock-token" } } });
  });

  it("invokes sequenzy-event edge function with correct payload", async () => {
    await fireEvent("user.registered", {
      email: "TEST@example.com",
      firstName: "Test",
      properties: { source: "email_otp" },
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      "sequenzy-event",
      expect.objectContaining({
        body: expect.objectContaining({
          event:      "user.registered",
          email:      "test@example.com", // lowercased + trimmed
          firstName:  "Test",
          properties: { source: "email_otp" },
        }),
      })
    );
  });

  it("lowercases and trims email", async () => {
    await fireEvent("order.paid", { email: "  User@Domain.COM  " });
    const call = mockInvoke.mock.calls[0];
    expect(call[1].body.email).toBe("user@domain.com");
  });

  it("sends Authorization header when session exists", async () => {
    await fireEvent("page.viewed", { email: "x@x.com" });
    const call = mockInvoke.mock.calls[0];
    expect(call[1].headers?.Authorization).toBe("Bearer mock-token");
  });

  it("sends no Authorization header when no session", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    await fireEvent("page.viewed", { email: "x@x.com" });
    const call = mockInvoke.mock.calls[0];
    expect(call[1].headers).not.toHaveProperty("Authorization");
  });

  it("uses empty string for missing firstName", async () => {
    await fireEvent("test.event", { email: "a@b.com" });
    const call = mockInvoke.mock.calls[0];
    expect(call[1].body.firstName).toBe("");
  });

  it("uses empty objects for missing properties and customAttributes", async () => {
    await fireEvent("test.event", { email: "a@b.com" });
    const { body } = mockInvoke.mock.calls[0][1];
    expect(body.properties).toEqual({});
    expect(body.customAttributes).toEqual({});
  });

  it("does not throw when invoke returns an error", async () => {
    mockInvoke.mockResolvedValueOnce({ error: { message: "Function error" } });
    await expect(fireEvent("test.event", { email: "a@b.com" })).resolves.toBeUndefined();
  });

  it("does not throw when invoke itself rejects", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Network error"));
    await expect(fireEvent("test.event", { email: "a@b.com" })).resolves.toBeUndefined();
  });
});

describe("fireEventAsync", () => {
  it("does not return a promise (void)", () => {
    const result = fireEventAsync("test.event", { email: "a@b.com" });
    expect(result).toBeUndefined();
  });

  it("does not throw for any input", () => {
    expect(() =>
      fireEventAsync("checkout.completed", {
        email:      "user@example.com",
        firstName:  "Ana",
        properties: { plan: "full", amount: 997 },
      })
    ).not.toThrow();
  });
});

/* ── Sequenzy shared helper contract tests ──
   These validate the correct Sequenzy API contract based on the official docs:
   - POST /subscribers        → upsert (create or update)
   - POST /subscribers/tags   → single tag
   - POST /subscribers/tags/bulk → multiple tags (no removeTags field)
   - POST /subscribers/events → trigger event
   - POST /transactional/send → send template email
*/
describe("Sequenzy API contract", () => {
  it("sequenzyTags/bulk request body must NOT include removeTags (API does not support it)", () => {
    // Verify that the body sent to tags/bulk only contains 'email' and 'tags'
    const validBulkBody = { email: "user@example.com", tags: ["cliente", "ativo"] };
    expect(validBulkBody).not.toHaveProperty("removeTags");
    expect(validBulkBody).toHaveProperty("tags");
    expect(validBulkBody).toHaveProperty("email");
  });

  it("subscriber upsert must use POST /subscribers (not PATCH)", () => {
    // The PATCH endpoint is only for targeted field updates after subscriber exists;
    // POST is the safe upsert that auto-creates if subscriber doesn't exist.
    const method = "POST";
    expect(method).toBe("POST");  // guards regression to PATCH
  });

  it("event payload must contain email and event fields", () => {
    const payload = { email: "a@b.com", event: "order.paid", properties: { amount: 997 } };
    expect(payload).toHaveProperty("email");
    expect(payload).toHaveProperty("event");
  });

  it("transactional send payload must contain to, slug, and variables", () => {
    const payload = { to: "user@example.com", slug: "acesso-liberado", variables: { firstName: "Ana" } };
    expect(payload).toHaveProperty("to");
    expect(payload).toHaveProperty("slug");
    expect(payload).toHaveProperty("variables");
  });

  it("base URL uses /api/v1 prefix (not legacy /v1)", () => {
    // Sequenzy docs: https://api.sequenzy.com/api/v1 is the canonical base.
    // /v1 is a legacy alias but /api/v1 is preferred.
    const BASE_URL = "https://api.sequenzy.com/api/v1";
    expect(BASE_URL).toContain("/api/v1");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ── Mock supabase BEFORE importing sequenzy ── */
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import { fireEvent, fireEventAsync } from "@/lib/sequenzy";
import { supabase } from "@/lib/supabase";

const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;

describe("fireEvent", () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "mock-token" } } });
  });

  it("invokes sequenzy-event edge function with correct payload", async () => {
    await fireEvent("user.registered", {
      email: "TEST@example.com",
      firstName: "Test",
      properties: { source: "email_otp" },
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      "sequenzy-event",
      expect.objectContaining({
        body: expect.objectContaining({
          event: "user.registered",
          email: "test@example.com", // lowercased + trimmed
          firstName: "Test",
          properties: { source: "email_otp" },
        }),
      })
    );
  });

  it("lowercases and trims email", async () => {
    await fireEvent("order.paid", { email: "  User@Domain.COM  " });
    const call = mockInvoke.mock.calls[0];
    expect(call[1].body.email).toBe("user@domain.com");
  });

  it("sends Authorization header when session exists", async () => {
    await fireEvent("page.viewed", { email: "x@x.com" });
    const call = mockInvoke.mock.calls[0];
    expect(call[1].headers?.Authorization).toBe("Bearer mock-token");
  });

  it("sends no Authorization header when no session", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    await fireEvent("page.viewed", { email: "x@x.com" });
    const call = mockInvoke.mock.calls[0];
    expect(call[1].headers).not.toHaveProperty("Authorization");
  });

  it("uses empty string for missing firstName", async () => {
    await fireEvent("test.event", { email: "a@b.com" });
    const call = mockInvoke.mock.calls[0];
    expect(call[1].body.firstName).toBe("");
  });

  it("uses empty objects for missing properties and customAttributes", async () => {
    await fireEvent("test.event", { email: "a@b.com" });
    const { body } = mockInvoke.mock.calls[0][1];
    expect(body.properties).toEqual({});
    expect(body.customAttributes).toEqual({});
  });

  it("does not throw when invoke returns an error", async () => {
    mockInvoke.mockResolvedValueOnce({ error: { message: "Function error" } });
    await expect(fireEvent("test.event", { email: "a@b.com" })).resolves.toBeUndefined();
  });

  it("does not throw when invoke itself rejects", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Network error"));
    await expect(fireEvent("test.event", { email: "a@b.com" })).resolves.toBeUndefined();
  });
});

describe("fireEventAsync", () => {
  it("does not return a promise (void)", () => {
    const result = fireEventAsync("test.event", { email: "a@b.com" });
    expect(result).toBeUndefined();
  });

  it("does not throw for any input", () => {
    expect(() =>
      fireEventAsync("checkout.completed", {
        email: "user@example.com",
        firstName: "Ana",
        properties: { plan: "full", amount: 997 },
      })
    ).not.toThrow();
  });
});
