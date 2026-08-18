/**
 * Woovi API Helper — Shared across Edge Functions
 * Cliente de cobranca PIX via Woovi. Contrato ja validado com dor no app
 * PHP irmao — NAO redescobrir:
 *  - POST https://api.woovi.com/api/v1/charge
 *  - header Authorization: <AppID> — SEM a palavra "Bearer"
 *  - valor em CENTAVOS (inteiro), nao em reais
 *  - resposta traz charge.brCode / charge.qrCodeImage / charge.paymentLinkUrl /
 *    charge.correlationID / charge.identifier
 * Docs: https://developers.woovi.com
 *
 * Duas pegadinhas do fornecedor, achadas testando de verdade (14-15/08) e
 * resolvidas AQUI DENTRO — o caller nao precisa saber delas:
 *  1. charge.qrCodeImage e uma URL de imagem, nao base64 (o Asaas devolvia
 *     base64 pronto). Baixamos e convertemos, porque o front monta
 *     `data:image/png;base64,${pixQrCode}` — mandar URL crua quebra o <img>.
 *  2. O campo "comment" rejeita com 400 "Emoji nao e permitido no
 *     comentario" pra travessao (—) e, possivelmente, outros caracteres fora
 *     do ASCII (a doc nao lista a regra exata). Sanitiza de forma generica.
 */

const WOOVI_BASE = "https://api.woovi.com/api/v1";
// Limite documentado do campo comment (mesmo da rota de reembolso; padrao
// PIX pro campo de "informacao adicional" no BR Code).
const COMMENT_MAX_LENGTH = 140;

export interface WooviCustomer {
  name?: string;
  email?: string;
  taxID?: string; // CPF/CNPJ, somente digitos
}

export interface WooviCharge {
  correlationID: string;
  /** Id real da cobranca na Woovi (painel/estorno/conciliacao) — NAO e o correlationID. */
  identifier?: string;
  brCode?: string;
  /** Base64 puro (sem prefixo data:) da imagem do QR — ja baixado e convertido. */
  qrCodeImagePngBase64?: string;
  paymentLinkUrl?: string;
}

interface CreateChargeParams {
  correlationID: string;
  valueInCents: number;
  comment: string;
  customer?: WooviCustomer;
}

export type WooviChargeLookup =
  | { ok: true; status: string; correlationID?: string; identifier?: string }
  | { ok: false; notFound: boolean };

/**
 * Consulta uma cobranca existente (por identifier OU correlationID).
 * Distingue "nao existe" (404 — payload forjado/lixo, nao adianta retry) de
 * falha transitoria (rede/5xx — o caller deve devolver 500 pra Woovi
 * re-tentar). E a fonte da verdade do woovi-webhook: pago e o que a API
 * da Woovi diz que esta COMPLETED, nunca o que o payload do webhook afirma.
 */
export async function getWooviCharge(
  appId: string,
  chargeId: string
): Promise<WooviChargeLookup> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${WOOVI_BASE}/charge/${encodeURIComponent(chargeId)}`, {
      signal: controller.signal,
      headers: {
        "Authorization": appId,
        "User-Agent": "DespertarEspiral/1.0",
      },
    });
    // Medido 18/08: id inexistente volta 400 (nao 404). Ambos sao permanentes
    // — sem isso, payload forjado viraria retry infinito da Woovi. 401/403 e
    // credencial NOSSA quebrada: transitorio (500), retry apos consertar.
    if (res.status === 400 || res.status === 404) return { ok: false, notFound: true };
    if (!res.ok) {
      console.warn(`[Woovi] consulta de charge falhou (${res.status})${res.status === 401 || res.status === 403 ? " — WOOVI_APP_ID invalido?" : ""}`);
      return { ok: false, notFound: false };
    }
    const json = await res.json().catch(() => null) as Record<string, unknown> | null;
    const charge = json?.charge as Record<string, unknown> | undefined;
    if (!charge?.status) {
      console.warn("[Woovi] consulta 2xx sem charge.status — tratando como transitorio");
      return { ok: false, notFound: false };
    }
    return {
      ok: true,
      status:        charge.status as string,
      correlationID: charge.correlationID as string | undefined,
      identifier:    charge.identifier as string | undefined,
    };
  } catch (err) {
    console.error("[Woovi] erro consultando charge:", err);
    return { ok: false, notFound: false };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Normaliza o "comment" pro que a Woovi aceita. A regra exata nao e
 * documentada (a doc so cita o limite de 140 caracteres) — defesa generica:
 * remove acento, troca pontuacao "esperta" por ASCII equivalente e descarta
 * o que sobrar fora do intervalo imprimivel (ASCII 0x20-0x7E).
 */
function sanitizeWooviComment(raw: string): string {
  // Acentos somem decompondo em NFD e removendo as marcas diacriticas
  // (\p{Diacritic}, propriedade unicode padrao — sem precisar listar faixa).
  const semAcento = raw.normalize("NFD").replace(/\p{Diacritic}/gu, "");

  // Pontuacao "esperta" (travessao, aspas curvas) construida por codepoint
  // via String.fromCharCode — de proposito, pra nao depender de colar o
  // simbolo unicode direto no fonte (dificil de revisar em diff).
  const EN_DASH            = String.fromCharCode(8211);
  const EM_DASH            = String.fromCharCode(8212);
  const HORIZONTAL_BAR     = String.fromCharCode(8213);
  const LEFT_SINGLE_QUOTE  = String.fromCharCode(8216);
  const RIGHT_SINGLE_QUOTE = String.fromCharCode(8217);
  const LEFT_DOUBLE_QUOTE  = String.fromCharCode(8220);
  const RIGHT_DOUBLE_QUOTE = String.fromCharCode(8221);

  let pontuacaoAscii = semAcento;
  for (const dash of [EN_DASH, EM_DASH, HORIZONTAL_BAR]) {
    pontuacaoAscii = pontuacaoAscii.split(dash).join("-");
  }
  for (const q of [LEFT_SINGLE_QUOTE, RIGHT_SINGLE_QUOTE]) {
    pontuacaoAscii = pontuacaoAscii.split(q).join("'");
  }
  for (const q of [LEFT_DOUBLE_QUOTE, RIGHT_DOUBLE_QUOTE]) {
    pontuacaoAscii = pontuacaoAscii.split(q).join('"');
  }

  // Defesa "grossa": qualquer coisa fora do ASCII imprimivel (emoji,
  // simbolo, o que for) cai fora — garante que a Woovi nunca mais rejeita
  // o comment por charset, mesmo que a regra deles seja mais ampla do que
  // o que testamos.
  const somenteAscii = pontuacaoAscii.replace(/[^\x20-\x7E]/g, "");
  return somenteAscii.replace(/\s+/g, " ").trim().slice(0, COMMENT_MAX_LENGTH);
}

/**
 * Baixa a imagem do QR (URL, nao base64 — diferente do Asaas) e converte pra
 * base64 puro. Falha de rede/timeout/status nao-2xx volta undefined — quem
 * chama tem o brCode (copia-e-cola) como fallback, nunca quebra a cobranca.
 */
async function fetchQrCodeAsBase64(url: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      console.warn(`[Woovi] download do QR falhou (${res.status}): ${url}`);
      return undefined;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch (err) {
    console.warn("[Woovi] erro baixando/convertendo QR (non-blocking):", err);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cria uma cobranca PIX na Woovi.
 * Nunca lanca — erro de rede, timeout, resposta nao-2xx OU resposta 2xx sem
 * brCode (carga incompleta — nao da pra confiar que a cobranca e usavel)
 * voltam como null, pro caller cair no fluxo de falha (pedido marcado
 * "failed", 502 pro cliente).
 */
export async function createWooviCharge(
  appId: string,
  params: CreateChargeParams
): Promise<WooviCharge | null> {
  const { correlationID, valueInCents, comment, customer } = params;

  if (!Number.isInteger(valueInCents) || valueInCents <= 0) {
    console.error("[Woovi] valueInCents invalido:", valueInCents);
    return null;
  }

  const body: Record<string, unknown> = {
    correlationID,
    value: valueInCents,
    comment: sanitizeWooviComment(comment),
  };

  if (customer?.email) {
    body.customer = {
      name: customer.name || customer.email.split("@")[0],
      email: customer.email,
      ...(customer.taxID ? { taxID: customer.taxID } : {}),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${WOOVI_BASE}/charge`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": appId,
        "Content-Type": "application/json",
        "User-Agent": "DespertarEspiral/1.0",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try { json = JSON.parse(text); } catch { json = null; }

    if (!res.ok || !json) {
      console.warn(`[Woovi] charge falhou (${res.status}): ${text.slice(0, 300)}`);
      return null;
    }

    const charge = json.charge as Record<string, unknown> | undefined;
    if (!charge) {
      console.warn("[Woovi] resposta sem campo charge:", text.slice(0, 300));
      return null;
    }

    const brCode = charge.brCode as string | undefined;
    if (!brCode) {
      // 2xx com carga incompleta NAO pode passar como sucesso: sem brCode
      // nao ha copia-e-cola nem QR, o front cairia no ramo de PIX manual
      // com uma cobranca real ja aberta pro mesmo pedido — risco de
      // pagamento em duplicidade.
      console.error("[Woovi] resposta 2xx sem brCode — tratando como falha:", text.slice(0, 300));
      return null;
    }

    const qrCodeImageUrl = charge.qrCodeImage as string | undefined;
    const qrCodeImagePngBase64 = qrCodeImageUrl
      ? await fetchQrCodeAsBase64(qrCodeImageUrl)
      : undefined;

    return {
      correlationID: (charge.correlationID as string | undefined) ?? correlationID,
      identifier:    charge.identifier as string | undefined,
      brCode,
      qrCodeImagePngBase64,
      paymentLinkUrl: charge.paymentLinkUrl as string | undefined,
    };
  } catch (err) {
    console.error("[Woovi] charge request error (non-blocking):", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
