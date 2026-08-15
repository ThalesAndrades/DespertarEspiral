// Edge Function: checkout-session
// Creates a pending order, integrates with gateway de pagamento e Sequenzy.
// PIX vai pra Woovi quando WOOVI_APP_ID estiver configurado; cartao e boleto
// continuam no Asaas ate terem substituto (ver docs/superpowers/plans/
// 2026-08-14-alinhar-ao-novo-formato.md).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors, isAllowedOrigin } from "../_shared/cors.ts";
import { createWooviCharge } from "../_shared/woovi.ts";
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
  const searchRes = await asaasRequest(apiKey, "GET", `/customers?email=${encodeURIComponent(email)}&limit=1`);
  if (searchRes.ok && searchRes.data) {
    const existing = (searchRes.data as Record<string, unknown>).data;
    if (Array.isArray(existing) && existing.length > 0) {
      return (existing[0] as Record<string, unknown>).id as string;
    }
  }

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
    fine:        { value: 1 },
    interest:    { value: 0.033 },
    postalService: false,
  };

  if (billingType === "CREDIT_CARD") {
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

  if (billingType === "PIX" && data.id) {
    const qrRes = await asaasRequest(apiKey, "GET", `/payments/${data.id}/pixQrCode`);
    if (qrRes.ok && qrRes.data) {
      const qrData = qrRes.data as Record<string, unknown>;
      result.pixQrCode = qrData.encodedImage as string | undefined;
      result.pixKey    = qrData.payload as string | undefined;
    }
  }

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

    const { productSlug, email, name, paymentMethod, cpfCnpj, bump } = await req.json();

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
    // Trava de negocio: produto em_breve NAO pode ser cobrado. Este filtro na
    // edge function e a trava REAL — o filtro do front e so apresentacao.
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, title, subtitle, price, slug")
      .eq("slug", productSlug)
      .eq("is_active", true)
      .eq("status", "disponivel")
      .single();

    if (productError || !product) {
      return jsonResponse(req, 404, { error: "Produto não encontrado ou inativo" });
    }

    // Ensure price is a valid number
    const productPrice = typeof product.price === "number"
      ? product.price
      : parseFloat(String(product.price));

    if (!isFinite(productPrice) || productPrice <= 0) {
      console.error("Invalid product price:", product.price);
      return jsonResponse(req, 500, { error: "Produto com preço inválido" });
    }

    // ── Bump de R$ 27 ──
    // A TRAVA REAL mora aqui: o cliente manda so um booleano; o preco e a
    // elegibilidade sao lidos do banco. `status = disponivel` repete a regra dura
    // do catalogo — produto em_breve nunca e cobrado, nem como bump.
    const BUMP_SLUG = "mapa-dos-sentimentos";
    let bumpProduct: { id: string; title: string; price: number } | null = null;

    if (bump === true && productSlug !== BUMP_SLUG) {
      const { data: bumpRow, error: bumpError } = await supabaseAdmin
        .from("products")
        .select("id, title, price, is_active, status")
        .eq("slug", BUMP_SLUG)
        .maybeSingle();

      if (bumpError) {
        // Falha de INFRA (timeout, conexao, permissao) — NAO e "produto indisponivel".
        // Degrada pra cobrar so o principal (nunca falha a venda por causa disso),
        // mas loga separado do catalogo pra nao mandar o on-call pro lugar errado.
        console.error(`Bump: falha de infra ao consultar produto — seguindo sem bump | email=${email} slug=${BUMP_SLUG} erro=${bumpError.message}`);
      } else if (!bumpRow) {
        console.warn(`Bump solicitado mas produto "${BUMP_SLUG}" nao encontrado — seguindo sem bump | email=${email}`);
      } else if (bumpRow.is_active !== true) {
        console.warn(`Bump solicitado mas produto inativo (is_active=${bumpRow.is_active}) — seguindo sem bump | email=${email}`);
      } else if (bumpRow.status !== "disponivel") {
        console.warn(`Bump solicitado mas produto com status "${bumpRow.status}" — seguindo sem bump | email=${email}`);
      } else {
        const bumpPrice = typeof bumpRow.price === "number" ? bumpRow.price : parseFloat(String(bumpRow.price));
        if (isFinite(bumpPrice) && bumpPrice > 0) {
          bumpProduct = { id: bumpRow.id, title: bumpRow.title, price: bumpPrice };
        } else {
          console.warn(`Bump solicitado mas produto com preco invalido (${bumpRow.price}) — seguindo sem bump | email=${email}`);
        }
      }
    }

    // Centavos para evitar 47.9 + 27.5 = 75.39999999999999
    const totalAmount = Math.round((productPrice + (bumpProduct?.price ?? 0)) * 100) / 100;

    // 2. Create pending order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: resolvedUserId ?? null,
        product_id: product.id,
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        amount: totalAmount,
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

    // 2b. Itens do pedido. Gravados ANTES de cobrar: se falhar com bump,
    // ninguem e cobrado por um item que nao seria liberado.
    const itens = [
      { order_id: order.id, product_id: product.id, unit_price: productPrice },
      ...(bumpProduct ? [{ order_id: order.id, product_id: bumpProduct.id, unit_price: bumpProduct.price }] : []),
    ];

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(itens);

    if (itemsError) {
      console.error(`order_items insert failed | order=${order.id}:`, itemsError);
      if (bumpProduct) {
        // Com bump, a falha e fatal: cobrar dois e liberar um e pior que nao vender.
        await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
        return jsonResponse(req, 500, { error: "Erro ao registrar os itens do pedido" });
      }
      // Sem bump, e recuperavel: a liberacao cai no fallback de orders.product_id.
      console.warn("Seguindo sem order_items — fallback por orders.product_id cobre este pedido");
    }

    // 3. Cobranca no gateway
    // paymentData e o formato NEUTRO que o resto da funcao (Sequenzy, resposta
    // ao front) consome — o contrato de resposta pro front nao muda (mapeamos
    // os campos da Woovi pros mesmos nomes que o Asaas ja usava).
    let paymentData: { invoiceUrl?: string; pixQrCode?: string; pixKey?: string; barCode?: string; billingType?: string; asaasId?: string } | null = null;
    let providerName: string | null = null;
    let providerChargeId: string | null = null;

    const wooviAppId = Deno.env.get("WOOVI_APP_ID");
    const useWoovi = paymentMethod === "pix" && !!wooviAppId;

    if (useWoovi) {
      // 3a. PIX via Woovi
      const amountCents = Math.round(totalAmount * 100);
      const wooviCharge = await createWooviCharge(wooviAppId!, {
        correlationID: order.id,
        valueInCents: amountCents,
        comment: bumpProduct
          ? `${product.title} + ${bumpProduct.title} — Despertar Espiral`
          : `${product.title} — Despertar Espiral`,
        customer: {
          name: name?.trim(),
          email: email.toLowerCase().trim(),
          taxID: cpfCnpj ? cpfCnpj.replace(/\D/g, "") : undefined,
        },
      });

      if (wooviCharge) {
        providerName     = "woovi";
        providerChargeId = wooviCharge.correlationID;

        paymentData = {
          billingType: "PIX",
          invoiceUrl:  wooviCharge.paymentLinkUrl,
          pixQrCode:   wooviCharge.qrCodeImage,
          pixKey:      wooviCharge.brCode,
        };

        await supabaseAdmin
          .from("orders")
          .update({
            provider:             providerName,
            provider_charge_id:   providerChargeId,
            provider_payment_url: wooviCharge.paymentLinkUrl ?? null,
          })
          .eq("id", order.id);
      } else {
        console.error(`Woovi charge failed | order=${order.id}`);
      }

      if (paymentData === null) {
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
      // 3b. Cartao/boleto (e PIX sem WOOVI_APP_ID configurado) seguem no Asaas
      const asaasApiKey = Deno.env.get("ASAAS_API_KEY");

      if (asaasApiKey) {
        const firstName  = (name?.split(" ")[0] || email.split("@")[0]).trim();
        const customerId = await upsertAsaasCustomer(asaasApiKey, email.toLowerCase().trim(), name?.trim() || firstName, cpfCnpj);

        if (customerId) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (paymentMethod === "boleto" ? 3 : paymentMethod === "credit" ? 0 : 1));
          const dueDateStr = dueDate.toISOString().slice(0, 10);

          paymentData = await createAsaasPayment(
            asaasApiKey,
            customerId,
            totalAmount,
            paymentMethod || "pix",
            bumpProduct
              ? `${product.title} + ${bumpProduct.title} — Despertar Espiral`
              : `${product.title} — Despertar Espiral`,
            order.id,
            dueDateStr
          );

          if (paymentData?.asaasId) {
            // Caminho Asaas inalterado: so a coluna antiga e escrita aqui.
            // As colunas neutras (provider/provider_charge_id/...) ainda nao
            // tem equivalente Asaas nesta leva — regra 2 da Ordem obrigatoria.
            await supabaseAdmin
              .from("orders")
              .update({ asaas_payment_id: paymentData.asaasId })
              .eq("id", order.id);
          }
        } else {
          console.warn("Could not create/find Asaas customer");
        }

        if (paymentData === null) {
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
    }

    // 4. Sequenzy — fire checkout events (non-blocking)
    const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
    if (sequenzyApiKey) {
      const firstName = (name?.split(" ")[0] || email.split("@")[0]).trim();
      const amountFmt = `R$ ${totalAmount.toFixed(2).replace(".", ",")}`;

      sequenzyBatch([
        sequenzyUpsertSubscriber(sequenzyApiKey, {
          email,
          firstName,
          customAttributes: {
            product_slug:   product.slug,
            product_title:  product.title,
            order_id:       order.id,
            amount:         totalAmount,
            checkout_at:    new Date().toISOString(),
            status:         "checkout_pendente",
          },
        }),
        sequenzyTags(sequenzyApiKey, email, [
          "checkout-iniciado",
          `produto-${product.slug}`,
          "lead-quente",
          "plataforma-despertar",
        ]),
        sequenzyEvent(sequenzyApiKey, email, "checkout_iniciado", {
          product_title:  product.title,
          product_slug:   product.slug,
          amount:         totalAmount,
          order_id:       order.id,
          payment_method: paymentMethod || "pix",
          started_at:     new Date().toISOString(),
        }),
        sequenzyEvent(sequenzyApiKey, email, "checkout.started", {
          product_title:  product.title,
          product_slug:   product.slug,
          amount:         totalAmount,
          order_id:       order.id,
          payment_method: paymentMethod || "pix",
        }),
        sequenzyTransactional(sequenzyApiKey, email, "checkout-confirmado", {
          firstName,
          productTitle:    product.title,
          productSubtitle: product.subtitle || "Método de Reconexão e Cura",
          orderId:         order.id.slice(0, 8).toUpperCase(),
          amount:          amountFmt,
          pixKey:          paymentData?.pixKey || "contato@despertarespiral.com",
          invoiceUrl:      paymentData?.invoiceUrl || `${SITE_URL}/obrigado`,
          supportEmail:    "contato@despertarespiral.com",
        }),
      ]);
    }

    // 5. Fire-and-forget: trigger overdue order recovery in the background
    // This piggybacks on new checkout traffic to process abandoned orders
    // without needing a cron job.
    {
      const recoveryUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/order-recovery`;
      const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      fetch(recoveryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({}),
      }).catch((e) => console.warn("[checkout-session] order-recovery dispatch error:", e));
    }

    return jsonResponse(req, 200, {
      success: true,
      orderId:  order.id,
      product: {
        title:    product.title,
        subtitle: product.subtitle,
        slug:     product.slug,
        price:    productPrice,
      },
      payment: paymentData ? {
        invoiceUrl:  paymentData.invoiceUrl,
        pixQrCode:   paymentData.pixQrCode,
        pixKey:      paymentData.pixKey,
        barCode:     paymentData.barCode,
        billingType: paymentData.billingType,
        asaasId:     paymentData.asaasId,
        provider:    providerName ?? undefined,
      } : null,
      message: "Pedido registrado. Instruções de pagamento enviadas por e-mail.",
    });

  } catch (err) {
    console.error("checkout-session unexpected error:", err);
    return jsonResponse(req, 500, { error: "Erro interno do servidor" });
  }
});
