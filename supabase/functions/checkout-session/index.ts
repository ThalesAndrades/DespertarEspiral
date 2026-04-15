// Edge Function: checkout-session
// Creates a pending order and registers the buyer in Sequenzy for email marketing automation
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors, isAllowedOrigin } from "../_shared/cors.ts";

const SEQUENZY_BASE = "https://api.sequenzy.com/api/v1";
const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://despertarespiral.com").replace(/\/+$/, "");

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

async function sequenzyRequest(
  apiKey: string,
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
) {
  try {
    const res = await fetch(`${SEQUENZY_BASE}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = null; }
    if (!res.ok) {
      console.warn(`Sequenzy [${method}] ${endpoint} → ${res.status}`);
    }
    return { ok: res.ok, status: res.status, data: json };
  } catch (err) {
    console.error(`Sequenzy [${method}] ${endpoint} error:`, err);
    return { ok: false, status: 0, data: null };
  }
}

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

    const { productSlug, email, name, userId, paymentMethod } = await req.json();

    // Input validation
    if (!productSlug || !email) {
      return jsonResponse(req, 400, { error: "productSlug e email são obrigatórios" });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse(req, 400, { error: "Formato de e-mail inválido" });
    }

    const allowedPaymentMethods = ["pix", "credit", "boleto", null, undefined];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return jsonResponse(req, 400, { error: "Método de pagamento inválido" });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Do not trust client-supplied userId; if a valid JWT is present, derive it from the token.
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
      console.error("Product not found:", productError);
      return jsonResponse(req, 404, { error: "Produto não encontrado" });
    }

    // 2. Create pending order in DB
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

    // Avoid logging PII (email/name) in plain text logs.
    console.log(`Order created: ${order.id} | product: ${product.slug}`);

    // 3. Sequenzy email marketing automation (non-blocking — don't await all)
    const sequenzyApiKey = Deno.env.get("SEQUENZY_API_KEY");
    if (sequenzyApiKey) {
      const firstName = (name?.split(" ")[0] || email.split("@")[0]).trim();
      const lastName  = name?.split(" ").slice(1).join(" ").trim() || "";

      // 3a. Create/update subscriber with custom attributes
      await sequenzyRequest(sequenzyApiKey, "POST", "/subscribers", {
        email,
        firstName,
        lastName,
        customAttributes: {
          product_slug:  product.slug,
          product_title: product.title,
          order_id:      order.id,
          amount:        product.price,
          checkout_at:   new Date().toISOString(),
          status:        "checkout_pendente",
        },
      });

      // 3b. Add segmentation tags
      await sequenzyRequest(sequenzyApiKey, "POST", "/subscribers/tags/bulk", {
        email,
        tags: ["checkout-iniciado", `produto-${product.slug}`, "lead-quente", "plataforma-despertar"],
      });

      // 3c. Trigger automation event
      await sequenzyRequest(sequenzyApiKey, "POST", "/subscribers/events", {
        email,
        event: "checkout_iniciado",
        properties: {
          product_title:    product.title,
          product_slug:     product.slug,
          amount:           product.price,
          order_id:         order.id,
          payment_method:   paymentMethod || "pix",
          checkout_url:     `${SITE_URL}/checkout/${product.slug}`,
        },
      });

      // 3d. Send transactional email via Sequenzy template "checkout-confirmado"
      // (configure this template in Sequenzy dashboard)
      const emailRes = await sequenzyRequest(sequenzyApiKey, "POST", "/transactional/send", {
        to: email,
        slug: "checkout-confirmado",
        variables: {
          firstName,
          productTitle:    product.title,
          productSubtitle: product.subtitle || "Método de Reconexão e Cura",
          orderId:         order.id.slice(0, 8).toUpperCase(),
          amount:          `R$ ${parseFloat(product.price).toFixed(2).replace(".", ",")}`,
          pixKey:          "contato@despertarespiral.com",
          supportEmail:    "contato@despertarespiral.com",
        },
      });

      if (!emailRes.ok) {
        console.warn("Transactional email failed (template may not exist yet):", emailRes.status);
      }
    } else {
      console.warn("SEQUENZY_API_KEY not set — email automation skipped");
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId:  order.id,
        product: {
          title:    product.title,
          subtitle: product.subtitle,
          slug:     product.slug,
          price:    product.price,
        },
        message: "Pedido registrado. Instruções de pagamento enviadas por e-mail.",
      }),
      { status: 200, headers: { ...corsHeadersFor(req), "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } }
    );
  } catch (err) {
    console.error("checkout-session unexpected error:", err);
    return jsonResponse(req, 500, { error: "Erro interno do servidor" });
  }
});
