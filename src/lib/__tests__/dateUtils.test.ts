/**
 * Tests — src/lib/dateUtils.ts
 * Coverage: timeAgo, greeting, formatBRL, progressPct, clamp, truncate, capitalize, initials
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { timeAgo, greeting, formatBRL, progressPct, clamp, truncate, capitalize, initials } from "@/lib/dateUtils";

describe("timeAgo", () => {
  const now = new Date("2025-04-23T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'agora' for timestamps within 59 seconds", () => {
    const ts = new Date(now.getTime() - 30_000).toISOString();
    expect(timeAgo(ts)).toBe("agora");
  });

  it("returns minutes for timestamps 1–59 min ago", () => {
    const ts = new Date(now.getTime() - 5 * 60_000).toISOString();
    expect(timeAgo(ts)).toBe("5min");
  });

  it("returns '1min' for exactly 60 seconds", () => {
    const ts = new Date(now.getTime() - 60_000).toISOString();
    expect(timeAgo(ts)).toBe("1min");
  });

  it("returns hours for timestamps 1–23h ago", () => {
    const ts = new Date(now.getTime() - 3 * 3600_000).toISOString();
    expect(timeAgo(ts)).toBe("3h");
  });

  it("returns '1h' for exactly 3600 seconds", () => {
    const ts = new Date(now.getTime() - 3600_000).toISOString();
    expect(timeAgo(ts)).toBe("1h");
  });

  it("returns 'ontem' for ~1 day ago", () => {
    const ts = new Date(now.getTime() - 25 * 3600_000).toISOString();
    expect(timeAgo(ts)).toBe("ontem");
  });

  it("returns days for timestamps > 2 days ago", () => {
    const ts = new Date(now.getTime() - 3 * 86400_000).toISOString();
    expect(timeAgo(ts)).toBe("3d");
  });
});

describe("greeting", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("returns 'Bom dia' before noon", () => {
    vi.setSystemTime(new Date("2025-04-23T08:30:00"));
    expect(greeting()).toBe("Bom dia");
  });

  it("returns 'Boa tarde' from 12h to 17:59", () => {
    vi.setSystemTime(new Date("2025-04-23T15:00:00"));
    expect(greeting()).toBe("Boa tarde");
  });

  it("returns 'Boa noite' from 18h onward", () => {
    vi.setSystemTime(new Date("2025-04-23T20:00:00"));
    expect(greeting()).toBe("Boa noite");
  });

  it("returns 'Bom dia' at exactly midnight (0h)", () => {
    vi.setSystemTime(new Date("2025-04-23T00:00:00"));
    expect(greeting()).toBe("Bom dia");
  });

  it("returns 'Boa tarde' at exactly 12h", () => {
    vi.setSystemTime(new Date("2025-04-23T12:00:00"));
    expect(greeting()).toBe("Boa tarde");
  });

  it("returns 'Boa noite' at exactly 18h", () => {
    vi.setSystemTime(new Date("2025-04-23T18:00:00"));
    expect(greeting()).toBe("Boa noite");
  });
});

describe("formatBRL", () => {
  it("formats integer values with 2 decimals", () => {
    expect(formatBRL(997)).toBe("R$ 997,00");
  });

  it("formats values with cents", () => {
    expect(formatBRL(97.10)).toBe("R$ 97,10");
  });

  it("formats thousands with period separator", () => {
    expect(formatBRL(1997)).toBe("R$ 1.997,00");
  });

  it("formats zero", () => {
    expect(formatBRL(0)).toBe("R$ 0,00");
  });

  it("formats large values", () => {
    const result = formatBRL(10000);
    expect(result).toContain("10");
    expect(result).toContain("R$");
  });
});

describe("progressPct", () => {
  it("returns 0 when total is 0", () => {
    expect(progressPct(0, 0)).toBe(0);
    expect(progressPct(5, 0)).toBe(0);
  });

  it("returns 0 when nothing completed", () => {
    expect(progressPct(0, 10)).toBe(0);
  });

  it("returns 100 when fully completed", () => {
    expect(progressPct(10, 10)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(progressPct(1, 3)).toBe(33); // 33.33...
    expect(progressPct(2, 3)).toBe(67); // 66.66...
  });

  it("clamps to 100 if completed > total", () => {
    expect(progressPct(15, 10)).toBe(100);
  });

  it("handles partial progress", () => {
    expect(progressPct(5, 10)).toBe(50);
    expect(progressPct(7, 10)).toBe(70);
  });
});

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("returns min when value is below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("returns max when value is above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("returns value when equal to min", () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it("returns value when equal to max", () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("truncate", () => {
  it("returns string unchanged if within maxLength", () => {
    expect(truncate("Hello", 10)).toBe("Hello");
  });

  it("returns string unchanged if equal to maxLength", () => {
    expect(truncate("Hello", 5)).toBe("Hello");
  });

  it("truncates and appends ellipsis when too long", () => {
    expect(truncate("Hello world", 5)).toBe("Hello…");
  });

  it("returns empty string for null/undefined", () => {
    expect(truncate(null as unknown as string, 10)).toBe("");
    expect(truncate(undefined as unknown as string, 10)).toBe("");
  });

  it("handles empty string", () => {
    expect(truncate("", 10)).toBe("");
  });
});

describe("capitalize", () => {
  it("capitalizes first letter", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("preserves already-capitalized strings", () => {
    expect(capitalize("Hello")).toBe("Hello");
  });

  it("capitalizes single character", () => {
    expect(capitalize("a")).toBe("A");
  });

  it("handles empty string", () => {
    expect(capitalize("")).toBe("");
  });

  it("does not capitalize subsequent words", () => {
    expect(capitalize("hello world")).toBe("Hello world");
  });
});

describe("initials", () => {
  it("returns first and last name initials", () => {
    expect(initials("Sunyan Nunes")).toBe("SN");
  });

  it("returns single initial for one-word name", () => {
    expect(initials("Ana")).toBe("A");
  });

  it("uses first and last parts for multi-word names", () => {
    expect(initials("Maria da Silva")).toBe("MS");
  });

  it("returns empty string for empty input", () => {
    expect(initials("")).toBe("");
  });

  it("handles extra whitespace", () => {
    expect(initials("  Lua  Crescente  ")).toBe("LC");
  });

  it("is uppercase", () => {
    expect(initials("ana paula")).toBe("AP");
  });
});
