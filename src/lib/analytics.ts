/**
 * Analytics + UTM persistence
 * Captures UTM params on landing and persists them in localStorage
 * so they can be attached to checkout events (attribution).
 *
 * LGPD: activates only after user consent (see CookieBanner).
 */

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;

const STORAGE_KEY = "de_attribution";
const CONSENT_KEY = "de_cookie_consent";

export type Attribution = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  landing_page?: string;
  captured_at?: string;
};

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  try {
    const params = new URLSearchParams(window.location.search);
    const attrs: Attribution = {};
    let has = false;
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) {
        attrs[k] = v.slice(0, 200);
        has = true;
      }
    }
    if (!has) return;
    attrs.landing_page = window.location.pathname.slice(0, 200);
    attrs.captured_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attrs));
  } catch {
    /* localStorage disabled — safely ignore */
  }
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function setAnalyticsConsent(accepted: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, accepted ? "accepted" : "rejected");
  } catch {
    /* ignore */
  }
}
