/**
 * Woovi API Helper — Shared across Edge Functions
 * Cliente de cobranca PIX via Woovi. Contrato ja validado com dor no app
 * PHP irmao — NAO redescobrir:
 *  - POST https://api.woovi.com/api/v1/charge
 *  - header Authorization: <AppID> — SEM a palavra "Bearer"
 *  - valor em CENTAVOS (inteiro), nao em reais
 *  - resposta traz charge.brCode / charge.qrCodeImage / charge.paymentLinkUrl / charge.correlationID
 * Docs: https://developers.woovi.com
 */

const WOOVI_BASE = "https://api.woovi.com/api/v1";

export interface WooviCustomer {
  name?: string;
  email?: string;
  taxID?: string; // CPF/CNPJ, somente digitos
}

export interface WooviCharge {
  correlationID: string;
  brCode?: string;
  qrCodeImage?: string;
  paymentLinkUrl?: string;
}

interface CreateChargeParams {
  correlationID: string;
  valueInCents: number;
  comment: string;
  customer?: WooviCustomer;
}

/**
 * Cria uma cobranca PIX na Woovi.
 * Nunca lanca — erro de rede, timeout ou resposta nao-2xx voltam como
 * null, pro caller decidir o fallback (hoje: cair no Asaas).
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
    comment,
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

    return {
      correlationID: (charge.correlationID as string | undefined) ?? correlationID,
      brCode:         charge.brCode as string | undefined,
      qrCodeImage:    charge.qrCodeImage as string | undefined,
      paymentLinkUrl: charge.paymentLinkUrl as string | undefined,
    };
  } catch (err) {
    console.error("[Woovi] charge request error (non-blocking):", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
