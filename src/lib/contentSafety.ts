const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "h2",
  "h3",
  "hr",
  "a",
]);

function isSafeHref(href: string): boolean {
  try {
    const u = new URL(href, window.location.origin);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return !u.href.toLowerCase().startsWith("javascript:");
  } catch {
    return false;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeHtml(input: unknown): string {
  if (typeof input !== "string" || !input) return "";
  try {
    const doc = new DOMParser().parseFromString(input, "text/html");

    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) {
          const text = doc.createTextNode(el.textContent ?? "");
          el.replaceWith(text);
          return;
        }

        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (tag === "a" && name === "href") continue;
          el.removeAttribute(attr.name);
        }

        if (tag === "a") {
          const href = el.getAttribute("href") ?? "";
          if (!href || !isSafeHref(href)) {
            const text = doc.createTextNode(el.textContent ?? "");
            el.replaceWith(text);
            return;
          }
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noreferrer noopener");
        }
      }

      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }
    };

    walk(doc.body);
    return doc.body.innerHTML;
  } catch {
    // Fallback: escape entire content if DOMParser fails
    return `<p>${escapeHtml(input)}</p>`;
  }
}

export function safeExternalUrl(input: unknown): string | null {
  if (typeof input !== "string" || !input) return null;
  try {
    const u = new URL(input);
    if (u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function safeEmbedUrl(input: unknown): string | null {
  if (typeof input !== "string" || !input) return null;
  try {
    const u = new URL(input);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const allow = new Set(["youtube.com", "youtu.be", "player.vimeo.com", "vimeo.com"]);
    if (!allow.has(host)) return null;

    // Convert YouTube watch URLs → embed URLs so the iframe actually plays
    if (host === "youtube.com" && u.pathname === "/watch") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${encodeURIComponent(v)}`;
    }
    if (host === "youtu.be") {
      const v = u.pathname.replace(/^\//, "");
      if (v) return `https://www.youtube.com/embed/${encodeURIComponent(v)}`;
    }
    if (host === "vimeo.com") {
      const v = u.pathname.replace(/^\//, "");
      if (/^\d+$/.test(v)) return `https://player.vimeo.com/video/${v}`;
    }
    return u.toString();
  } catch {
    return null;
  }
}

