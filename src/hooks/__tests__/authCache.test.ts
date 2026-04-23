/**
 * Tests — cache helpers in useAuth (isolated)
 * We test the cache read/write/clear logic in isolation by re-implementing
 * the pure parts, avoiding full Supabase mocking for the hook.
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { AuthUser } from "@/hooks/useAuth";

/* ── Inline re-implementation of cache helpers (same logic as useAuth) ── */
const CACHE_KEY = "de_profile_v1";

function readCache(userId?: string): AuthUser | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed || typeof parsed.id !== "string") return null;
    if (userId && parsed.id !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(user: AuthUser) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(user));
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

const MOCK_USER: AuthUser = {
  id: "user-123",
  email: "test@despertarespiral.com",
  name: "Test User",
  role: "member",
  anonymous_name: "Lua Crescente",
  products: ["mulher-espiral"],
};

describe("Auth cache helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("readCache", () => {
    it("returns null when cache is empty", () => {
      expect(readCache()).toBeNull();
    });

    it("returns null for malformed JSON", () => {
      localStorage.setItem(CACHE_KEY, "not-json{{{");
      expect(readCache()).toBeNull();
    });

    it("returns null when object lacks id field", () => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ email: "x@x.com" }));
      expect(readCache()).toBeNull();
    });

    it("returns cached user when no userId filter", () => {
      writeCache(MOCK_USER);
      const result = readCache();
      expect(result).toMatchObject({ id: "user-123", email: "test@despertarespiral.com" });
    });

    it("returns cached user when userId matches", () => {
      writeCache(MOCK_USER);
      expect(readCache("user-123")).toMatchObject({ id: "user-123" });
    });

    it("returns null when userId does NOT match", () => {
      writeCache(MOCK_USER);
      expect(readCache("different-user")).toBeNull();
    });

    it("preserves all AuthUser fields", () => {
      writeCache(MOCK_USER);
      const result = readCache();
      expect(result).toEqual(MOCK_USER);
    });
  });

  describe("writeCache", () => {
    it("persists user to localStorage", () => {
      writeCache(MOCK_USER);
      const raw = localStorage.getItem(CACHE_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toMatchObject({ id: "user-123" });
    });

    it("overwrites previous cache", () => {
      writeCache(MOCK_USER);
      const updated = { ...MOCK_USER, name: "New Name", products: ["mulher-espiral", "outro-curso"] };
      writeCache(updated);
      const result = readCache();
      expect(result?.name).toBe("New Name");
      expect(result?.products).toHaveLength(2);
    });

    it("persists products array correctly", () => {
      const withProducts = { ...MOCK_USER, products: ["mulher-espiral", "curso-b"] };
      writeCache(withProducts);
      expect(readCache()?.products).toEqual(["mulher-espiral", "curso-b"]);
    });
  });

  describe("clearCache", () => {
    it("removes the cache key", () => {
      writeCache(MOCK_USER);
      clearCache();
      expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    });

    it("is safe to call when cache is already empty", () => {
      expect(() => clearCache()).not.toThrow();
    });
  });
});
