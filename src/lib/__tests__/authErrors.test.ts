/**
 * Tests — src/lib/authErrors.ts
 * Coverage: mapAuthError — all branches, edge cases, pt-BR messages
 */
import { describe, it, expect } from "vitest";
import { mapAuthError } from "@/lib/authErrors";

describe("mapAuthError", () => {
  // ── Null / undefined / empty ────────────────────────────────────────
  it("returns generic message for null input", () => {
    expect(mapAuthError(null)).toBe("Ocorreu um erro inesperado. Tente novamente.");
  });

  it("returns generic message for undefined input", () => {
    expect(mapAuthError(undefined)).toBe("Ocorreu um erro inesperado. Tente novamente.");
  });

  it("returns generic message for empty string", () => {
    expect(mapAuthError("")).toBe("Ocorreu um erro inesperado. Tente novamente.");
  });

  // ── Credenciais ─────────────────────────────────────────────────────
  it("maps 'invalid_credentials' to pt-BR", () => {
    const msg = mapAuthError("invalid_credentials");
    expect(msg).toContain("E-mail ou senha incorretos");
  });

  it("maps 'Invalid login credentials' (case-insensitive) to pt-BR", () => {
    const msg = mapAuthError("Invalid login credentials");
    expect(msg).toContain("E-mail ou senha incorretos");
  });

  it("maps 'invalid login credentials' lowercase to pt-BR", () => {
    const msg = mapAuthError("invalid login credentials");
    expect(msg).toContain("E-mail ou senha incorretos");
  });

  // ── E-mail não verificado ────────────────────────────────────────────
  it("maps 'Email not confirmed'", () => {
    expect(mapAuthError("Email not confirmed")).toContain("não verificado");
  });

  it("maps 'email_not_confirmed'", () => {
    expect(mapAuthError("email_not_confirmed")).toContain("não verificado");
  });

  // ── Usuário existente ────────────────────────────────────────────────
  it("maps 'user_already_exists'", () => {
    expect(mapAuthError("user_already_exists")).toContain("Já existe uma conta");
  });

  it("maps 'User already registered'", () => {
    expect(mapAuthError("User already registered")).toContain("Já existe uma conta");
  });

  it("maps partial match 'already registered'", () => {
    expect(mapAuthError("already registered with this email")).toContain("Já existe uma conta");
  });

  // ── OTP / token ──────────────────────────────────────────────────────
  it("maps 'Token has expired'", () => {
    expect(mapAuthError("Token has expired")).toContain("Código expirado");
  });

  it("maps 'token has expired' lowercase", () => {
    expect(mapAuthError("token has expired")).toContain("Código expirado");
  });

  it("maps 'Token is invalid'", () => {
    expect(mapAuthError("Token is invalid")).toContain("Código inválido");
  });

  it("maps 'Otp expired'", () => {
    expect(mapAuthError("Otp expired")).toContain("Reenviar código");
  });

  it("maps 'otp_expired'", () => {
    expect(mapAuthError("otp_expired")).toContain("Reenviar código");
  });

  it("maps 'Email link is invalid or has expired'", () => {
    expect(mapAuthError("Email link is invalid or has expired")).toContain("Link inválido");
  });

  // ── Rate limit ───────────────────────────────────────────────────────
  it("maps 'over_email_send_rate_limit'", () => {
    expect(mapAuthError("over_email_send_rate_limit")).toContain("Muitas tentativas");
  });

  it("maps 'Email rate limit exceeded'", () => {
    expect(mapAuthError("Email rate limit exceeded")).toContain("Muitas tentativas");
  });

  it("maps generic 'rate limit'", () => {
    expect(mapAuthError("rate limit exceeded")).toContain("Muitas requisições");
  });

  // ── Senha ────────────────────────────────────────────────────────────
  it("maps 'Password should be at least'", () => {
    expect(mapAuthError("Password should be at least 6 characters")).toContain("mínimo 6 caracteres");
  });

  it("maps 'New password should be different'", () => {
    expect(mapAuthError("New password should be different")).toContain("diferente da senha atual");
  });

  // ── Rede ─────────────────────────────────────────────────────────────
  it("maps 'Failed to fetch'", () => {
    expect(mapAuthError("Failed to fetch")).toContain("conexão com o servidor");
  });

  it("maps 'NetworkError'", () => {
    expect(mapAuthError("NetworkError when attempting to fetch resource")).toContain("Erro de rede");
  });

  // ── Sessão ───────────────────────────────────────────────────────────
  it("maps 'Refresh Token Not Found'", () => {
    expect(mapAuthError("Refresh Token Not Found")).toContain("sessão expirou");
  });

  it("maps 'session_not_found'", () => {
    expect(mapAuthError("session_not_found")).toContain("Sessão não encontrada");
  });

  // ── Fallback ─────────────────────────────────────────────────────────
  it("strips 'AuthApiError: ' prefix on unknown errors", () => {
    const result = mapAuthError("AuthApiError: Something unexpected");
    expect(result).toBe("Something unexpected");
    expect(result).not.toContain("AuthApiError");
  });

  it("strips 'AuthError: ' prefix on unknown errors", () => {
    const result = mapAuthError("AuthError: Unknown problem");
    expect(result).not.toContain("AuthError:");
  });

  it("returns original message when no pattern matches", () => {
    const weird = "Some completely unknown error string xyz";
    const result = mapAuthError(weird);
    expect(result).toBe(weird.trim());
  });

  it("is case-insensitive for all patterns", () => {
    expect(mapAuthError("INVALID_CREDENTIALS")).toContain("E-mail ou senha incorretos");
    expect(mapAuthError("TOKEN HAS EXPIRED")).toContain("Código expirado");
  });
});
