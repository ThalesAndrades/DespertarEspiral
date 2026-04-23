/**
 * Tests — src/lib/contentSafety.ts
 * Coverage: sanitizeHtml, safeExternalUrl, safeEmbedUrl
 */
import { describe, it, expect, beforeAll } from "vitest";
import { sanitizeHtml, safeExternalUrl, safeEmbedUrl, isStorageVideoUrl } from "@/lib/contentSafety";

describe("sanitizeHtml", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("returns empty string for falsy inputs", () => {
    expect(sanitizeHtml(null as unknown as string)).toBe("");
    expect(sanitizeHtml(undefined as unknown as string)).toBe("");
  });

  it("preserves allowed tags: p, strong, em, b, i", () => {
    const input = "<p>Hello <strong>world</strong> <em>italic</em></p>";
    const out = sanitizeHtml(input);
    expect(out).toContain("<p>");
    expect(out).toContain("<strong>");
    expect(out).toContain("<em>");
  });

  it("strips disallowed tags (script)", () => {
    const input = '<script>alert("xss")</script><p>Safe</p>';
    const out = sanitizeHtml(input);
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(");
    expect(out).toContain("Safe");
  });

  it("strips disallowed tags (div, span, img)", () => {
    const input = '<div class="bad"><span>text</span><img src="x" onerror="alert(1)" /></div>';
    const out = sanitizeHtml(input);
    expect(out).not.toContain("<div");
    expect(out).not.toContain("<span");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("onerror");
  });

  it("removes event handler attributes from allowed tags", () => {
    const input = '<p onclick="alert(1)">Text</p>';
    const out = sanitizeHtml(input);
    expect(out).not.toContain("onclick");
    expect(out).toContain("Text");
  });

  it("allows <a> with valid https href", () => {
    const input = '<a href="https://example.com">Link</a>';
    const out = sanitizeHtml(input);
    expect(out).toContain('<a');
    expect(out).toContain("https://example.com");
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noreferrer noopener"');
  });

  it("removes <a> with javascript: href", () => {
    const input = '<a href="javascript:alert(1)">Bad</a>';
    const out = sanitizeHtml(input);
    expect(out).not.toContain("<a");
    expect(out).not.toContain("javascript:");
    expect(out).toContain("Bad");
  });

  it("removes <a> with data: href", () => {
    const input = '<a href="data:text/html,<script>alert(1)</script>">Bad</a>';
    const out = sanitizeHtml(input);
    expect(out).not.toContain("data:text");
  });

  it("removes <a> with empty href", () => {
    const input = '<a href="">Empty</a>';
    const out = sanitizeHtml(input);
    expect(out).not.toContain("<a");
    expect(out).toContain("Empty");
  });

  it("preserves block elements: ul, ol, li, blockquote, code, pre", () => {
    const input = "<ul><li>Item</li></ul><blockquote>Quote</blockquote><pre><code>code</code></pre>";
    const out = sanitizeHtml(input);
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>");
    expect(out).toContain("<blockquote>");
    expect(out).toContain("<pre>");
    expect(out).toContain("<code>");
  });

  it("handles nested disallowed tags by extracting text", () => {
    const input = "<div><p>Keep this text</p></div>";
    const out = sanitizeHtml(input);
    expect(out).toContain("Keep this text");
    expect(out).not.toContain("<div");
  });

  it("strips style attribute from allowed tags", () => {
    const input = '<p style="color:red">Red text</p>';
    const out = sanitizeHtml(input);
    expect(out).not.toContain("style=");
    expect(out).toContain("Red text");
  });
});

describe("safeExternalUrl", () => {
  it("returns null for empty input", () => {
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl(null as unknown as string)).toBeNull();
  });

  it("returns the URL for valid https links", () => {
    const url = "https://example.com/page?q=1";
    expect(safeExternalUrl(url)).toBe(url);
  });

  it("returns null for http (non-https)", () => {
    expect(safeExternalUrl("http://example.com")).toBeNull();
  });

  it("returns null for javascript: URLs", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    expect(safeExternalUrl("not a url")).toBeNull();
  });

  it("returns null for ftp: protocol", () => {
    expect(safeExternalUrl("ftp://files.example.com")).toBeNull();
  });
});

describe("safeEmbedUrl", () => {
  it("returns null for empty input", () => {
    expect(safeEmbedUrl("")).toBeNull();
  });

  it("allows youtube.com embed", () => {
    const url = "https://youtube.com/embed/abc123";
    expect(safeEmbedUrl(url)).toBe(url);
  });

  it("allows youtu.be links", () => {
    const url = "https://youtu.be/abc123";
    expect(safeEmbedUrl(url)).toBe(url);
  });

  it("allows player.vimeo.com embed", () => {
    const url = "https://player.vimeo.com/video/123456";
    expect(safeEmbedUrl(url)).toBe(url);
  });

  it("allows www.youtube.com (strips www)", () => {
    const url = "https://www.youtube.com/embed/xyz";
    expect(safeEmbedUrl(url)).toBe(url);
  });

  it("blocks non-whitelisted domains", () => {
    expect(safeEmbedUrl("https://evil.com/embed/video")).toBeNull();
    expect(safeEmbedUrl("https://vimeo.com/video/123")).toBeNull(); // vimeo.com NOT player.vimeo.com
  });

  it("blocks http (non-https) even for allowed hosts", () => {
    expect(safeEmbedUrl("http://youtube.com/embed/abc")).toBeNull();
  });

  it("blocks invalid URLs", () => {
    expect(safeEmbedUrl("not-a-url")).toBeNull();
  });
});

describe("isStorageVideoUrl", () => {
  it("returns false for null / undefined / empty", () => {
    expect(isStorageVideoUrl(null)).toBe(false);
    expect(isStorageVideoUrl(undefined)).toBe(false);
    expect(isStorageVideoUrl("")).toBe(false);
  });

  it("returns true for Supabase Storage public URL containing 'video-content'", () => {
    const url = "https://ejbdpbkyirqmlgtiejbd.backend.onspace.ai/storage/v1/object/public/video-content/products/prod-001/1718000000000-aula.mp4";
    expect(isStorageVideoUrl(url)).toBe(true);
  });

  it("returns true for any https URL ending with .mp4", () => {
    expect(isStorageVideoUrl("https://cdn.example.com/course/intro.mp4")).toBe(true);
  });

  it("returns true for .webm extension", () => {
    expect(isStorageVideoUrl("https://cdn.example.com/video.webm")).toBe(true);
  });

  it("returns true for .ogg extension", () => {
    expect(isStorageVideoUrl("https://storage.example.com/video.ogg")).toBe(true);
  });

  it("returns true for .mov extension", () => {
    expect(isStorageVideoUrl("https://storage.example.com/video.mov")).toBe(true);
  });

  it("returns false for YouTube embed URL (not a Storage URL)", () => {
    expect(isStorageVideoUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(false);
  });

  it("returns false for Vimeo embed URL", () => {
    expect(isStorageVideoUrl("https://player.vimeo.com/video/123456")).toBe(false);
  });

  it("returns false for a generic https URL without video extension", () => {
    expect(isStorageVideoUrl("https://example.com/page")).toBe(false);
  });

  it("returns false for http (non-https) Storage URL", () => {
    expect(isStorageVideoUrl("http://storage.example.com/video-content/aula.mp4")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isStorageVideoUrl(42)).toBe(false);
    expect(isStorageVideoUrl({})).toBe(false);
  });

  it("returns false for plain text / relative paths", () => {
    expect(isStorageVideoUrl("/videos/aula.mp4")).toBe(false);
    expect(isStorageVideoUrl("aula.mp4")).toBe(false);
  });
});
