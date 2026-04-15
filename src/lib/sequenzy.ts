/**
 * src/lib/sequenzy.ts
 * Client-side helper to fire Sequenzy events via the secure edge function proxy.
 * The SEQUENZY_API_KEY never leaves the server.
 *
 * Usage:
 *   import { fireEvent } from "@/lib/sequenzy";
 *   fireEvent("user.registered", { email, firstName });
 */
import { supabase } from "@/lib/supabase";

interface FireEventOptions {
  email: string;
  firstName?: string;
  properties?: Record<string, string | number | boolean | null>;
  customAttributes?: Record<string, string | number | boolean | null>;
}

/**
 * Fire a Sequenzy event via the secure server-side proxy.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function fireEvent(
  event: string,
  options: FireEventOptions
): Promise<void> {
  try {
    /* Attach session token for authenticated events */
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const { error } = await supabase.functions.invoke("sequenzy-event", {
      body: {
        event,
        email: options.email.trim().toLowerCase(),
        firstName: options.firstName ?? "",
        properties: options.properties ?? {},
        customAttributes: options.customAttributes ?? {},
      },
      headers,
    });

    if (error) {
      console.warn(`[Sequenzy] event "${event}" failed:`, error.message);
    }
  } catch (e) {
    console.warn(`[Sequenzy] event "${event}" error (non-blocking):`, e);
  }
}

/**
 * Convenience wrapper — fire event without awaiting (true fire-and-forget).
 * Use this when you don't want to delay navigation or UI updates.
 */
export function fireEventAsync(event: string, options: FireEventOptions): void {
  fireEvent(event, options).catch(() => {});
}
