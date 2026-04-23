/**
 * src/lib/email.ts
 * Client-side helper to send transactional emails via the secure edge function proxy.
 * The SEQUENZY_API_KEY never leaves the server.
 *
 * Available templates:
 *   - welcome              → on user registration
 *   - acesso-liberado      → on product access granted
 *   - checkout-confirmado  → on checkout initiated (server-side — do not call from client)
 *   - quiz-aprovado        → on quiz passed
 *   - reset-senha          → on password reset (companion email)
 *   - curso-concluido      → on 100% course completion
 *   - recovery-lembrete    → on abandoned checkout recovery
 */
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

/* ── Template variable types ── */
export interface WelcomeVars {
  firstName: string;
  loginUrl?: string;
}

export interface AcessoLiberadoVars {
  firstName: string;
  productTitle: string;
  loginUrl?: string;
  orderId?: string;
  amount?: string;
}

export interface QuizAprovadoVars {
  firstName: string;
  moduleTitle: string;
  score: number;
  passingScore: number;
  productTitle: string;
}

export interface ResetSenhaVars {
  firstName: string;
}

export interface CursoConcluídoVars {
  firstName: string;
  productTitle: string;
  certificateUrl?: string;
}

export type EmailTemplate =
  | { slug: "welcome";          variables: WelcomeVars }
  | { slug: "acesso-liberado";  variables: AcessoLiberadoVars }
  | { slug: "quiz-aprovado";    variables: QuizAprovadoVars }
  | { slug: "reset-senha";      variables: ResetSenhaVars }
  | { slug: "curso-concluido";  variables: CursoConcluídoVars };

export interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Send a transactional email via the secure edge function proxy.
 * Always awaitable — resolves with `{ ok: true }` or `{ ok: false, error }`.
 *
 * For fire-and-forget use, wrap with: sendEmailAsync(...)
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  try {
    /* Attach session token if authenticated */
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: options.to.trim().toLowerCase(),
        slug: options.template.slug,
        variables: options.template.variables,
        metadata: options.metadata ?? {},
      },
      headers,
    });

    if (error) {
      let errorMessage = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const statusCode = error.context?.status ?? 500;
          const textContent = await error.context?.text();
          errorMessage = `[Code: ${statusCode}] ${textContent || error.message || "Unknown error"}`;
        } catch {
          errorMessage = error.message || "Failed to read response";
        }
      }

      if (import.meta.env.DEV) {
        console.warn(`[Email] Failed to send '${options.template.slug}' to ${options.to}:`, errorMessage);
      }
      return { ok: false, error: errorMessage };
    }

    if (import.meta.env.DEV) {
      console.log(`[Email] '${options.template.slug}' sent to ${options.to}`, data);
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (import.meta.env.DEV) {
      console.warn(`[Email] Unexpected error sending '${options.template.slug}':`, e);
    }
    return { ok: false, error: msg };
  }
}

/**
 * Fire-and-forget email sender. Errors are silently logged.
 * Use this when you don't want to delay navigation or UI updates.
 */
export function sendEmailAsync(options: SendEmailOptions): void {
  sendEmail(options).catch(() => {});
}
