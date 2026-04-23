/**
 * Tests — src/lib/analytics.ts
 * Coverage: captureAttribution, getAttribution
 */
import { describe, it, expect, beforeEach } from "vitest";
import { captureAttribution, getAttribution } from "@/lib/analytics";

describe("getAttribution", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("returns empty object when nothing stored", () => {
    expect(getAttribution()).toEqual({});
  });

  it("returns stored attribution data", () => {
    const data = { utm_source: "google", utm_medium: "cpc" };
    sessionStorage.setItem("ds_attribution", JSON.stringify(data));
    expect(getAttribution()).toEqual(data);
  });

  it("returns empty object for malformed JSON", () => {
    sessionStorage.setItem("ds_attribution", "not-json{{{");
    expect(getAttribution()).toEqual({});
  });
});

describe("captureAttribution", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("stores utm params from URL search string", () => {
    Object.defineProperty(window, "location", {
      value: {
        ...window.location,
        search: "?utm_source=facebook&utm_medium=social&utm_campaign=launch",
      },
      writable: true,
    });
    captureAttribution();
    const stored = getAttribution();
    expect(stored.utm_source).toBe("facebook");
    expect(stored.utm_medium).toBe("social");
    expect(stored.utm_campaign).toBe("launch");
  });

  it("does not overwrite existing attribution when no UTM params", () => {
    const prior = { utm_source: "email" };
    sessionStorage.setItem("ds_attribution", JSON.stringify(prior));
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "" },
      writable: true,
    });
    captureAttribution();
    // Should not clear existing if no new UTM found
    expect(getAttribution()).toEqual(prior);
  });

  it("ignores unknown query params", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?ref=share&foo=bar" },
      writable: true,
    });
    captureAttribution();
    const stored = getAttribution();
    expect(stored).toEqual({});
  });

  it("captures all 5 utm keys", () => {
    Object.defineProperty(window, "location", {
      value: {
        ...window.location,
        search: "?utm_source=s&utm_medium=m&utm_campaign=c&utm_term=t&utm_content=co",
      },
      writable: true,
    });
    captureAttribution();
    const stored = getAttribution();
    expect(Object.keys(stored)).toHaveLength(5);
    expect(stored).toMatchObject({
      utm_source: "s",
      utm_medium: "m",
      utm_campaign: "c",
      utm_term: "t",
      utm_content: "co",
    });
  });
});
