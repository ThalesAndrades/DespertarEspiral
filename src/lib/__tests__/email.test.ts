/**
 * Tests — src/lib/email.ts
 * Coverage: sendEmail (invoke payload, auth header, error handling),
 *           sendEmailAsync (fire-and-forget), template type safety
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

/* ── Mock supabase BEFORE importing email ── */
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token-xyz" } },
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { ok: true, slug: "welcome", to: "user@test.com" }, error: null }),
    },
  },
}));

/* supabase-js FunctionsHttpError mock */
vi.mock("@supabase/supabase-js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@supabase/supabase-js")>();
  class FunctionsHttpError extends Error {
    context: { status: number; text: () => Promise<string> };
    constructor(status: number, message: string) {
      super(message);
      this.name = "FunctionsHttpError";
      this.context = {
        status,
        text: async () => message,
      };
    }
  }
  return { ...actual, FunctionsHttpError };
});

import { sendEmail, sendEmailAsync } from "@/lib/email";
import { supabase } from "@/lib/supabase";

const mockInvoke     = supabase.functions.invoke as ReturnType<typeof vi.fn>;
const mockGetSession = supabase.auth.getSession  as ReturnType<typeof vi.fn>;

describe("sendEmail", () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "mock-token-xyz" } } });
  });

  it("invokes send-email edge function with correct body for 'welcome'", async () => {
    await sendEmail({
      to: "ANA@example.com",
      template: { slug: "welcome", variables: { firstName: "Ana" } },
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      "send-email",
      expect.objectContaining({
        body: expect.objectContaining({
          to:        "ana@example.com",   // lowercased + trimmed
          slug:      "welcome",
          variables: expect.objectContaining({ firstName: "Ana" }),
        }),
      })
    );
  });

  it("lowercases and trims the 'to' email", async () => {
    await sendEmail({
      to: "  USER@Domain.COM  ",
      template: { slug: "quiz-aprovado", variables: { firstName: "Maria", moduleTitle: "Módulo 1", score: 85, passingScore: 70, productTitle: "Curso X" } },
    });
    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.body.to).toBe("user@domain.com");
  });

  it("attaches Authorization header when session exists", async () => {
    await sendEmail({
      to: "x@x.com",
      template: { slug: "welcome", variables: { firstName: "X" } },
    });
    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.headers?.Authorization).toBe("Bearer mock-token-xyz");
  });

  it("sends no Authorization header when no session", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    await sendEmail({
      to: "anon@x.com",
      template: { slug: "welcome", variables: { firstName: "Anon" } },
    });
    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.headers).not.toHaveProperty("Authorization");
  });

  it("returns ok:true on success", async () => {
    const result = await sendEmail({
      to: "ok@test.com",
      template: { slug: "welcome", variables: { firstName: "Ok" } },
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns ok:false with error string on invoke error", async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: { message: "Function failed" } });
    const result = await sendEmail({
      to: "fail@test.com",
      template: { slug: "welcome", variables: { firstName: "Fail" } },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns ok:false without throwing when invoke rejects", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Network error"));
    const result = await sendEmail({
      to: "net@test.com",
      template: { slug: "welcome", variables: { firstName: "Net" } },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Network error");
  });

  it("sends metadata in body", async () => {
    await sendEmail({
      to: "meta@test.com",
      template: { slug: "welcome", variables: { firstName: "Meta" } },
      metadata: { source: "otp", score: 95 },
    });
    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.body.metadata).toEqual({ source: "otp", score: 95 });
  });

  it("sends empty metadata when not provided", async () => {
    await sendEmail({
      to: "no-meta@test.com",
      template: { slug: "welcome", variables: { firstName: "NoMeta" } },
    });
    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.body.metadata).toEqual({});
  });
});

/* ── Template payload contracts ── */
describe("email template payloads", () => {
  beforeEach(() => mockInvoke.mockResolvedValue({ data: { ok: true }, error: null }));

  it("quiz-aprovado sends correct variables", async () => {
    await sendEmail({
      to: "aluna@test.com",
      template: {
        slug: "quiz-aprovado",
        variables: {
          firstName: "Carla",
          moduleTitle: "Autoconhecimento",
          score: 92,
          passingScore: 70,
          productTitle: "Mulher Espiral",
        },
      },
    });
    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.body.variables).toMatchObject({
      firstName: "Carla",
      moduleTitle: "Autoconhecimento",
      score: 92,
      passingScore: 70,
      productTitle: "Mulher Espiral",
    });
  });

  it("acesso-liberado sends required variables", async () => {
    await sendEmail({
      to: "acesso@test.com",
      template: {
        slug: "acesso-liberado",
        variables: {
          firstName: "Beatriz",
          productTitle: "Mulher Espiral",
          orderId: "abc123",
          amount: "R$ 997,00",
        },
      },
    });
    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.body.slug).toBe("acesso-liberado");
    expect(opts.body.variables.firstName).toBe("Beatriz");
  });

  it("curso-concluido sends certificateUrl", async () => {
    await sendEmail({
      to: "conc@test.com",
      template: {
        slug: "curso-concluido",
        variables: {
          firstName: "Fernanda",
          productTitle: "Mulher Espiral",
          certificateUrl: "https://despertarespiral.com/products/mulher-espiral/certificado",
        },
      },
    });
    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.body.variables.certificateUrl).toContain("certificado");
  });

  it("reset-senha sends firstName only", async () => {
    await sendEmail({
      to: "reset@test.com",
      template: { slug: "reset-senha", variables: { firstName: "Laura" } },
    });
    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.body.slug).toBe("reset-senha");
    expect(opts.body.variables.firstName).toBe("Laura");
  });
});

/* ── sendEmailAsync ── */
describe("sendEmailAsync", () => {
  it("is fire-and-forget (returns void)", () => {
    const result = sendEmailAsync({
      to: "void@test.com",
      template: { slug: "welcome", variables: { firstName: "Void" } },
    });
    expect(result).toBeUndefined();
  });

  it("does not throw for any valid template", () => {
    expect(() =>
      sendEmailAsync({
        to: "safe@test.com",
        template: { slug: "quiz-aprovado", variables: { firstName: "Safe", moduleTitle: "M1", score: 80, passingScore: 70, productTitle: "Curso" } },
      })
    ).not.toThrow();
  });
});

/* ── Edge function contract tests (template allowlist / security) ── */
describe("send-email edge function contract", () => {
  it("should call 'send-email' (not 'sequenzy-event') function name", async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    await sendEmail({ to: "fn@test.com", template: { slug: "welcome", variables: { firstName: "Fn" } } });
    const [fnName] = mockInvoke.mock.calls[0];
    expect(fnName).toBe("send-email");
  });

  it("body must contain 'to', 'slug', and 'variables'", async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    await sendEmail({ to: "struct@test.com", template: { slug: "welcome", variables: { firstName: "S" } } });
    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.body).toHaveProperty("to");
    expect(opts.body).toHaveProperty("slug");
    expect(opts.body).toHaveProperty("variables");
  });
});
