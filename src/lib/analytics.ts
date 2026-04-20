/**
 * Analytics helpers — UTM attribution tracking
 * Reads UTM params from URL on page load and stores them in sessionStorage.
 * getAttribution() returns the stored values for use in Sequenzy events.
 */

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
type UtmKey = (typeof UTM_KEYS)[number];
type Attribution = Partial<Record<UtmKey, string>>;

/** Call once on app mount to capture UTM params from the landing URL. */
export function captureAttribution(): void {
  const params = new URLSearchParams(window.location.search);
  const found: Attribution = {};
  for (const key of UTM_KEYS) {
    const val = params.get(key);
    if (val) found[key] = val;
  }
  if (Object.keys(found).length > 0) {
    sessionStorage.setItem("ds_attribution", JSON.stringify(found));
  }
}

/** Returns the attribution object captured at landing (or empty object). */
export function getAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem("ds_attribution");
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}
