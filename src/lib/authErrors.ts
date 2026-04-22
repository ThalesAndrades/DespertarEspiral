
/**
 * authErrors.ts — Mapeia códigos e mensagens de erro do Supabase para pt-BR
 * Uso: mapAuthError(error.message) → string legível para o usuário
 */

const ERROR_MAP: Array<[RegExp | string, string]> = [
  // ── Credenciais ──────────────────────────────────────────────────────────
  ["invalid_credentials",
    "E-mail ou senha incorretos. Verifique seus dados e tente novamente."],
  ["Invalid login credentials",
    "E-mail ou senha incorretos. Verifique seus dados e tente novamente."],
  ["invalid login credentials",
    "E-mail ou senha incorretos. Verifique seus dados e tente novamente."],
  ["Email not confirmed",
    "E-mail ainda não verificado. Confirme sua caixa de entrada antes de entrar."],
  ["email_not_confirmed",
    "E-mail ainda não verificado. Confirme sua caixa de entrada antes de entrar."],

  // ── Cadastro / usuário já existente ─────────────────────────────────────
  ["user_already_exists",
    "Já existe uma conta com este e-mail. Faça login ou recupere sua senha."],
  ["User already registered",
    "Já existe uma conta com este e-mail. Faça login ou recupere sua senha."],
  ["already registered",
    "Já existe uma conta com este e-mail. Faça login ou recupere sua senha."],

  // ── OTP / token ──────────────────────────────────────────────────────────
  ["Token has expired",
    "Código expirado. Solicite um novo e tente novamente."],
  ["token has expired",
    "Código expirado. Solicite um novo e tente novamente."],
  ["Token is invalid",
    "Código inválido. Verifique os dígitos e tente novamente."],
  ["token is invalid",
    "Código inválido. Verifique os dígitos e tente novamente."],
  ["Otp expired",
    "Código expirado. Clique em 'Reenviar código' e tente novamente."],
  ["otp_expired",
    "Código expirado. Clique em 'Reenviar código' e tente novamente."],
  ["Email link is invalid or has expired",
    "Link inválido ou expirado. Solicite um novo link de recuperação."],

  // ── Rate limit ───────────────────────────────────────────────────────────
  ["over_email_send_rate_limit",
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."],
  ["Email rate limit exceeded",
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."],
  ["email rate limit",
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."],
  ["rate limit",
    "Muitas requisições. Aguarde um momento e tente novamente."],

  // ── Senha ────────────────────────────────────────────────────────────────
  ["Password should be at least",
    "A senha deve ter no mínimo 6 caracteres."],
  ["Password is too short",
    "A senha é muito curta. Use no mínimo 6 caracteres."],
  ["Passwords do not match",
    "As senhas não coincidem. Verifique e tente novamente."],
  ["same password",
    "A nova senha deve ser diferente da senha atual."],
  ["New password should be different",
    "A nova senha deve ser diferente da senha atual."],

  // ── Rede / servidor ──────────────────────────────────────────────────────
  ["Failed to fetch",
    "Sem conexão com o servidor. Verifique sua internet e tente novamente."],
  ["NetworkError",
    "Erro de rede. Verifique sua conexão e tente novamente."],
  ["network error",
    "Erro de rede. Verifique sua conexão e tente novamente."],

  // ── Sessão ───────────────────────────────────────────────────────────────
  ["Refresh Token Not Found",
    "Sua sessão expirou. Faça login novamente."],
  ["refresh_token_not_found",
    "Sua sessão expirou. Faça login novamente."],
  ["session_not_found",
    "Sessão não encontrada. Faça login novamente."],
];

/**
 * Retorna uma mensagem de erro em pt-BR legível para o usuário.
 * Faz correspondência parcial (includes) nos pares da tabela acima.
 * Se nenhum padrão for encontrado, retorna a mensagem original.
 */
export function mapAuthError(raw: string | undefined | null): string {
  if (!raw) return "Ocorreu um erro inesperado. Tente novamente.";

  for (const [pattern, message] of ERROR_MAP) {
    if (typeof pattern === "string") {
      if (raw.toLowerCase().includes(pattern.toLowerCase())) return message;
    } else {
      if (pattern.test(raw)) return message;
    }
  }

  // Fallback: retorna a mensagem original sem expor stack traces
  // Remove prefixos técnicos comuns
  return raw
    .replace(/^(AuthApiError|AuthError|Error):\s*/i, "")
    .replace(/\s*\(.*?\)\s*/g, "")
    .trim() || "Ocorreu um erro inesperado. Tente novamente.";
}
