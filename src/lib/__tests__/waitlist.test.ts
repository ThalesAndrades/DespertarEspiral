import { describe, it, expect, vi, beforeEach } from "vitest";

const insert = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from: () => ({ insert }) },
}));

import { joinWaitlist } from "@/lib/waitlist";

beforeEach(() => insert.mockReset());

describe("joinWaitlist", () => {
  it("grava email normalizado em minusculas", async () => {
    insert.mockResolvedValue({ error: null });
    await joinWaitlist("  Maria@Exemplo.COM ", "prod-1");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "maria@exemplo.com",
        product_id: "prod-1",
        source: "vitrine",
      })
    );
  });

  it("trata violacao de unicidade como sucesso, nao como erro", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    const r = await joinWaitlist("maria@exemplo.com", "prod-1");
    expect(r).toEqual({ ok: true, duplicate: true });
  });

  it("recusa email invalido sem chamar o banco", async () => {
    const r = await joinWaitlist("nao-e-email", "prod-1");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("invalid");
    expect(insert).not.toHaveBeenCalled();
  });

  it("marca reason 'error' quando o banco falha por motivo que nao e duplicidade", async () => {
    insert.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    const r = await joinWaitlist("maria@exemplo.com", "prod-1");
    expect(r).toEqual({ ok: false, duplicate: false, reason: "error" });
  });
});
