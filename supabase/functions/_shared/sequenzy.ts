/**
 * Sequenzy API Helper — Shared across Edge Functions
 * All calls are fire-and-forget safe (wrapped in try/catch).
 * Docs: https://docs.sequenzy.com
 */

const BASE_URL = "https://api.sequenzy.com/api/v1";

type AttributeValue = string | number | boolean | null;

interface SequenzySubscriber {
  email: string;
  firstName?: string;
  lastName?: string;
  customAttributes?: Record<string, AttributeValue>;
}

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Upsert subscriber (create or update).
 * Use this to ensure a contact exists before sending events.
 */
export async function sequenzyUpsertSubscriber(
  apiKey: string,
  subscriber: SequenzySubscriber
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/subscribers`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify(subscriber),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Sequenzy] upsertSubscriber failed (${res.status}): ${text}`);
    }
  } catch (e) {
    console.warn("[Sequenzy] upsertSubscriber error (non-blocking):", e);
  }
}

/**
 * Fire a named event for a subscriber.
 * Triggers sequences associated with the event.
 */
export async function sequenzyEvent(
  apiKey: string,
  email: string,
  event: string,
  properties: Record<string, AttributeValue> = {}
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/subscribers/events`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ email, event, properties }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Sequenzy] event "${event}" failed (${res.status}): ${text}`);
    } else {
      console.log(`[Sequenzy] event "${event}" fired for ${email}`);
    }
  } catch (e) {
    console.warn(`[Sequenzy] event "${event}" error (non-blocking):`, e);
  }
}

/**
 * Add/remove tags for a subscriber.
 * tags: tags to add | removeTags: tags to remove
 */
export async function sequenzyTags(
  apiKey: string,
  email: string,
  tags: string[],
  removeTags: string[] = []
): Promise<void> {
  if (tags.length === 0 && removeTags.length === 0) return;
  try {
    const body: Record<string, unknown> = { email };
    if (tags.length > 0) body.tags = tags;
    if (removeTags.length > 0) body.removeTags = removeTags;

    const res = await fetch(`${BASE_URL}/subscribers/tags/bulk`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Sequenzy] tags failed (${res.status}): ${text}`);
    }
  } catch (e) {
    console.warn("[Sequenzy] tags error (non-blocking):", e);
  }
}

/**
 * Send a transactional email using a template slug.
 */
export async function sequenzyTransactional(
  apiKey: string,
  to: string,
  slug: string,
  variables: Record<string, string | number> = {}
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/transactional/send`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ to, slug, variables }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Sequenzy] transactional "${slug}" failed (${res.status}): ${text}`);
    } else {
      console.log(`[Sequenzy] transactional "${slug}" sent to ${to}`);
    }
  } catch (e) {
    console.warn(`[Sequenzy] transactional "${slug}" error (non-blocking):`, e);
  }
}

/**
 * Batch all Sequenzy calls in Promise.allSettled (non-blocking).
 * Use when you need to fire multiple calls at once and don't want one failure
 * to block the others or the main response.
 */
export async function sequenzyBatch(
  calls: Promise<void>[]
): Promise<void> {
  await Promise.allSettled(calls);
}
