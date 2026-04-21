// Edge Function: checkout-session
// Creates a pending order, integrates with Asaas (PIX/cartão/boleto) and Sequenzy
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors, isAllowedOrigin } from "../_shared/cors.ts";
import {
  sequenzyUpsertSubscriber,
  sequenzyEvent,
  sequenzyTags,
  sequenzyTransactional,
  sequenzyBatch,
} from "../_shared/sequenzy.ts";

const ASAAS_BASE = "https://api.asaas.com/v3"; // use https://sandbox.asaas.com/api/v3 for sandbox
const SITE_URL   = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://despertarespiral.com").replace(/\/+$/, "");

function jsonResponse(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

/* ── CPF validation ── */
function isValidCpf(cpf: string): boolean {
  const s = cpf.replace(/\D/g, "");
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(s[i]) * (10 - i);
  let r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(s[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(s[i]) * (11 - i);
  r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0;
  return r === parseInt(s[10]);
}

/* ── Asaas helper with timeout + retry ── */
async function asaasRequest(
  apiKey: string,
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
  attempt = 0
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${ASAAS_BASE}${endpoint}`, {
      method,
      signal: controller.signal,
      headers: {
        "access_token": apiKey,
        "Content-Type": "application/json",
        "User-Agent": "DespertarEspiral/1.0",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try { json = JSON.parse(text); } catch { json = null; }
    if (!res.ok) {
      console.warn(`Asaas [${method}] ${endpoint} → ${res.status}: ${text.slice(0, 300)}`);
      // Retry once on 5xx transient errors
      if (res.status >= 500 && attempt < 1) {
        await new Promise(r => setTimeout(r, 1000));
        return asaasRequest(apiKey, method, endpoint, body, attempt + 1);
      }
    }
    return { ok: res.ok, status: res.status, data: json };
  } catch (err) {
    console.error("Asaas request error:", err);
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

/* ── Ensure/create Asaas customer ── */
async function upsertAsaasCustomer(
  apiKey: string,
  email: string,
  name: string,
  cpfCnpj?: string
): Promise<string | null> {
  // Check if customer already exists by email
  const searchRes = await asaasRequest(apiKey, "GET", `/customers?email=${encodeURIComponent(email)}&limit=1`);
  if (searchRes.ok && searchRes.data) {
    const existing = (searchRes.data as Record<string, unknown>).data;
    if (Array.isArray(existing) && existing.length > 0) {
      return (existing[0] as Record<string, unknown>).id as string;
    }
  }

  // Create new customer
  const createBody: Record<string, unknown> = {
    name: name || email.split("@")[0],
    email,
    notificationDisabled: false,
  };
  if (cpfCnpj) createBody.cpfCnpj = cpfCnpj;

  const createRes = await asaasRequest(apiKey, "POST", "/customers", createBody);
  if (createRes.ok && createRes.data) {
    return (createRes.data as Record<string, unknown>).id as string | null;
  }
  console.error("Failed to create Asaas customer");
  return null;
}

/* ── Create Asaas payment ── */
async function createAsaasPayment(
  apiKey: string,
  customerId: string,
  amount: number,
  paymentMethod: string,
  description: string,
  orderId: string,
  dueDate: string
): Promise<{ invoiceUrl?: string; pixQrCode?: string; pixKey?: string; barCode?: string; billingType: string; asaasId?: string } | null> {

  const billingType = paymentMethod === "credit" ? "CREDIT_CARD"
    : paymentMethod === "boleto"  ? "BOLETO"
    : "PIX";

  const body: Record<string, unknown> = {
    customer:    customerId,
    billingType,
    value:       amount,
    dueDate,
    description,
    externalReference: orderId,
    fine:        { value: 1 },   // 1% mora
    interest:    { value: 0.033 }, // 1% ao mês (0.033% ao dia)
    postalService: false,
  };

  if (billingType === "CREDIT_CARD") {
    // For credit card, Asaas needs installments config or redirect to hosted checkout
    body.installmentCount = 12;
    body.installmentValue = parseFloat((amount / 12).toFixed(2));
  }

  const res = await asaasRequest(apiKey, "POST", "/payments", body);
  if (!res.ok || !res.data) return null;

  const data = res.data as Record<string, unknown>;
  const result: { invoiceUrl?: string; pixQrCode?: string; pixKey?: string; barCode?: string; billingType: string; asaasId?: string } = {
    billingType,
    asaasId: data.id as string,
    invoiceUrl: data.invoiceUrl as string | undefined,
  };

  // For PIX: fetch QR code
  if (billingType === "PIX" && data.id) {
    const qrRes = await asaasRequest(apiKey, "GET", `/payments/${data.id}/pixQrCode`);
    if (qrRes.ok && qrRes.data) {
      const qrData = qrRes.data as Record<string, unknown>;
      result.pixQrCode = qrData.encodedImage as string | undefined;
      result.pixKey    = qrData.payload as string | undefined;
    }
  }

  // For BOLETO: fetch barcode
  if (billingType === "BOLETO" && data.id) {
    const lineRes = await asaasRequest(apiKey, "GET", `/payments/${data.id}/identificationField`);
    if (lineRes.ok && lineRes.data) {
      result.barCode = ((lineRes.data as Record<string, unknown>).identificationField as string | undefined);
    }
    result.invoiceUrl = data.bankSlipUrl as string | undefined ?? data.invoiceUrl as string | undefined;
  }

  return result;
}

/* ── Main handler ── */
Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (!isAllowedOrigin(req)) return jsonResponse(req, 403, { error: "Origem não permitida" });
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "Método não permitido" });

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse(req, 415, { error: "Content-Type deve ser application/json" });
    }

    const { productSlug, email, name, paymentMethod, cpfCnpj } = await req.json();

    // Input validation
    if (!productSlug || !email) {
      return jsonResponse(req, 400, { error: "productSlug e email são obrigatórios" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse(req, 400, { error: "Formato de e-mail inválido" });
    }
    const validMethods = ["pix", "credit", "boleto", null, undefined];
    if (!validMethods.includes(paymentMethod)) {
      return jsonResponse(req, 400, { error: "Método de pagamento inválido" });
    }
    if (cpfCnpj) {
      const digits = cpfCnpj.replace(/\D/g, "");
      if (digits.length !== 14 && !isValidCpf(cpfCnpj)) {
        return jsonResponse(req, 400, { error: "CPF inválido" });
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Derive userId from JWT if present
    let resolvedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      resolvedUserId = user?.id ?? null;
    }

    // 1. Fetch product
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, title, subtitle, price, slug")
      .eq("slug", productSlug)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      return jsonResponse(req, 404, { error: "Produto não encontrado ou inativo" });
    }

    // 2. Create pending order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: resolvedUserId ?? null,
        product_id: product.id,
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        amount: product.price,
        status: "pending",
        payment_method: paymentMethod || "pix",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order creation failed:", orderError);
      return jsonResponse(req, 500, { error: "Erro ao registrar pedido" });
    }

    console.log(`Order created: ${order.id} | product: ${product.slug} | method: ${paymentMethod ?? "pix"}`);

    // 3. Asaas integration
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    let asaasData: { invoiceUrl?: string; pixQrCode?: string; pixKey?: string; barCode?: string; billingType?: string; asaasId?: string } | null = null;

    if (asaasApiKey) {
      const firstName  = (name?.split(" ")[0] || email.split("@")[0]).trim();
      const customerId = await upsertAsaasCustomer(asaasApiKey, email.toLowerCase().trim(), name?.trim() || firstName, cpfCnpj);

      if (customerId) {
        // Due date: today + 3 days for boleto/PIX, today for credit
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (paymentMethod === "boleto" ? 3 : paymentMethod === "credit" ? 0 : 1));
        const dueDateStr = dueDate.toISOString().slice(0, 10);

        asaasData = await createAsaasPayment(
          asaasApiKey,
          customerId,
          parseFloat(product.price),
          paymentMethod || "pix",
          `${product.title} — Despertar Espiral`,
          order.id,
          dueDateStr
        );

        if (asaasData?.asaasId) {
          await supabaseAdmin
            .from("orders")
            .update({
              asaas_payment_id: asaasData.asaasId,
              sequenzy_session_id: asaasData.invoiceUrl ?? null,
            })
            .eq("id", order.id);
        }
      } else {
        console.warn("Could not create/find Asaas customer");
      }

      // If Asaas is configured but payment creation failed, mark order failed and surface the error
      if (asaasData === null) {
        await supabaseAdmin
          .from("orders")
          .update({ status: "failed" })
          .eq("id", order.id);
        return jsonResponse(req, 502, {
          error: "Não foi possível gerar as instruções de pagamento. Tente novamente em instantes.",
          orderId: order.id,
        });
      }
    } else {
      console.warn("ASAAS_API_KEY not configured — payment gateway skipped");
    }

    // 4. Sequenzy — fire checkout.started and checkout_iniciado (non-blocking)
    const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
    if (sequenzyApiKey) {
      const firstName = (name?.split(" ")[0] || email.split("@")[0]).trim();
      const amountFmt = `R$ ${parseFloat(product.price).toFixed(2).replace(".", ",")}`;

      sequenzyBatch([
        /* Upsert subscriber */
        sequenzyUpsertSubscriber(sequenzyApiKey, {
          email,
          firstName,
          customAttributes: {
            product_slug:   product.slug,
            product_title:  product.title,
            order_id:       order.id,
            amount:         product.price,
            checkout_at:    new Date().toISOString(),
            status:         "checkout_pendente",
          },
        }),
        /* Tags */
        sequenzyTags(sequenzyApiKey, email, [
          "checkout-iniciado",
          `produto-${product.slug}`,
          "lead-quente",
          "plataforma-despertar",
        ]),
        /* checkout_iniciado — triggers "Recuperação de Checkout" sequence */
        sequenzyEvent(sequenzyApiKey, email, "checkout_iniciado", {
          product_title:  product.title,
          product_slug:   product.slug,
          amount:         product.price,
          order_id:       order.id,
          payment_method: paymentMethod || "pix",
          started_at:     new Date().toISOString(),
        }),
        /* checkout.started — custom dashboard event */
        sequenzyEvent(sequenzyApiKey, email, "checkout.started", {
          product_title:  product.title,
          product_slug:   product.slug,
          amount:         product.price,
          order_id:       order.id,
          payment_method: paymentMethod || "pix",
        }),
        /* Transactional email — checkout confirmation */
        sequenzyTransactional(sequenzyApiKey, email, "checkout-confirmado", {
          firstName,
          productTitle:    product.title,
          productSubtitle: product.subtitle || "Método de Reconexão e Cura",
          orderId:         order.id.slice(0, 8).toUpperCase(),
          amount:          amountFmt,
          pixKey:          asaasData?.pixKey || "contato@despertarespiral.com",
          invoiceUrl:      asaasData?.invoiceUrl || `${SITE_URL}/obrigado`,
          supportEmail:    "contato@despertarespiral.com",
        }),
      ]);
    }

    return jsonResponse(req, 200, {
      success: true,
      orderId:  order.id,
      product: {
        title:    product.title,
        subtitle: product.subtitle,
        slug:     product.slug,
        price:    product.price,
      },
      // Pass payment details to frontend for ThankYouPage
      payment: asaasData ? {
        invoiceUrl: asaasData.invoiceUrl,
        pixQrCode:  asaasData.pixQrCode,
        pixKey:     asaasData.pixKey,
        barCode:    asaasData.barCode,
        billingType: asaasData.billingType,
        asaasId:    asaasData.asaasId,
      } : null,
      message: "Pedido registrado. Instruções de pagamento enviadas por e-mail.",
    });

  } catch (err) {
    console.error("checkout-session unexpected error:", err);
    return jsonResponse(req, 500, { error: "Erro interno do servidor" });
  }
});
