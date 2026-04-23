/**
 * Vitest global test setup
 * Runs before every test file
 */
import "@testing-library/jest-dom";
import { vi, afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

/* ── Cleanup React trees after each test ── */
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ── jsdom stubs for browser APIs not present in Node ── */
// window.location — writable stub
Object.defineProperty(window, "location", {
  value: {
    origin: "https://localhost",
    href: "https://localhost/",
    pathname: "/",
    search: "",
    hash: "",
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
});

// sessionStorage
Object.defineProperty(window, "sessionStorage", {
  value: (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
    };
  })(),
  writable: true,
});

// localStorage
Object.defineProperty(window, "localStorage", {
  value: (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
    };
  })(),
  writable: true,
});

// DOMParser (available in jsdom — stub for environments that miss it)
if (!global.DOMParser) {
  // @ts-expect-error minimal stub
  global.DOMParser = class {
    parseFromString(str: string, _type: string) {
      const doc = document.implementation.createHTMLDocument();
      doc.body.innerHTML = str;
      return doc;
    }
  };
}

// Silence console.warn/error noise from React internals in tests
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

/* ── Mock import.meta.env ── */
vi.stubGlobal("import.meta", {
  env: {
    DEV: false,
    PROD: true,
    VITE_SUPABASE_URL: "https://test.supabase.co",
    VITE_SUPABASE_ANON_KEY: "test-anon-key",
  },
});
