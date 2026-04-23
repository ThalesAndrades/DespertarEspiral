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
 * POST /subscribers — auto-creates if new, updates if existing.
 * Ref: https://docs.sequenzy.com — auto-creation behaviour.
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
 * Update subscriber custom attributes.
 * PATCH /subscribers/:email — updates only provided fields.
 * Ref: https://docs.sequenzy.com#patch-subscribers-email
 */
export async function sequenzyUpdateSubscriber(
  apiKey: string,
  email: string,
  fields: Partial<SequenzySubscriber>
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/subscribers/${encodeURIComponent(email.toLowerCase().trim())}`, {
      method: "PATCH",
      headers: headers(apiKey),
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Sequenzy] updateSubscriber failed (${res.status}): ${text}`);
    }
  } catch (e) {
    console.warn("[Sequenzy] updateSubscriber error (non-blocking):", e);
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
 * Add tags to a subscriber in bulk.
 * POST /subscribers/tags/bulk — adds one or more tags at once.
 * Ref: https://docs.sequenzy.com#post-subscribers-tags-bulk
 *
 * Note: The Sequenzy API does not document a `removeTags` field on the bulk
 * endpoint. Tag removal is handled by the Sequenzy dashboard or via individual
 * DELETE calls (not yet in public API). The `removeTags` parameter is kept for
 * interface compatibility but is intentionally excluded from the request body.
 */
export async function sequenzyTags(
  apiKey: string,
  email: string,
  tags: string[],
  _removeTags: string[] = []   // kept for interface compat; removal not supported by API
): Promise<void> {
  if (tags.length === 0) return;
  try {
    const res = await fetch(`${BASE_URL}/subscribers/tags/bulk`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ email, tags }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Sequenzy] tags/bulk failed (${res.status}): ${text}`);
    }
  } catch (e) {
    console.warn("[Sequenzy] tags error (non-blocking):", e);
  }
}

/**
 * Add a single tag to a subscriber.
 * POST /subscribers/tags — simplest tag operation.
 * Ref: https://docs.sequenzy.com#post-subscribers-tags
 */
export async function sequenzySingleTag(
  apiKey: string,
  email: string,
  tag: string
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/subscribers/tags`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ email, tag }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Sequenzy] single tag failed (${res.status}): ${text}`);
    }
  } catch (e) {
    console.warn("[Sequenzy] single tag error (non-blocking):", e);
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
 * Fire all Sequenzy calls in parallel without blocking the caller.
 * Returns void — intentionally not awaitable.
 */
export function sequenzyBatch(calls: Promise<void>[]): void {
  Promise.allSettled(calls).catch(() => {});
}
