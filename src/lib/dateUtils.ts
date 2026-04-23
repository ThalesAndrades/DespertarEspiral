/**
 * src/lib/dateUtils.ts
 * Shared date/time utilities — extracted from DashboardPage, CommunityPage, TopicPage
 * to eliminate code duplication and allow centralized testing.
 */

/**
 * Returns a human-readable "time ago" string in pt-BR.
 * @example timeAgo("2025-04-23T10:00:00Z") → "3h"
 */
export function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "agora";
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 2) return "ontem";
  return `${Math.floor(diff / 86400)}d`;
}

/**
 * Returns a greeting based on current hour in pt-BR.
 * @example greeting() → "Bom dia" (if hour < 12)
 */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Formats a BRL price number as a human-readable currency string.
 * @example formatBRL(997) → "R$ 997,00"
 */
export function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Calculates progress percentage (0–100), rounded.
 * Returns 0 if total is 0 to avoid division by zero.
 */
export function progressPct(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(completed, total) / total) * 100);
}

/**
 * Clamps a value between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Truncates a string to maxLength, appending "…" if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str ?? "";
  return str.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Returns initials from a full name (up to 2 characters).
 * @example initials("Sunyan Nunes") → "SN"
 * @example initials("Ana") → "A"
 */
export function initials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
