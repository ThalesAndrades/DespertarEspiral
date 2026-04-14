// Edge Function: checkout-session
// Creates a pending order and registers the buyer in Sequenzy for email marketing automation
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SEQUENZY_BASE = "https://api.sequenzy.com/api/v1";

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
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    console.log(`Sequenzy [${method}] ${endpoint} → ${res.status}:`, JSON.stringify(json).slice(0, 300));
    return { ok: res.ok, status: res.status, data: json };
  } catch (err) {
    console.error(`Sequenzy [${method}] ${endpoint} error:`, err);
    return { ok: false, status: 0, data: null };
  }
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { productSlug, email, name, userId, paymentMethod } = await req.json();

    // Input validation
    if (!productSlug || !email) {
      return new Response(
        JSON.stringify({ error: "productSlug e email são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Formato de e-mail inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedPaymentMethods = ["pix", "credit", "boleto", null, undefined];
    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return new Response(
        JSON.stringify({ error: "Método de pagamento inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch product
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, title, subtitle, price, slug")
      .eq("slug", productSlug)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      console.error("Product not found:", productError);
      return new Response(
        JSON.stringify({ error: "Produto não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create pending order in DB
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId || null,
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
      return new Response(
        JSON.stringify({ error: "Erro ao registrar pedido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Order created: ${order.id} | product: ${product.slug} | buyer: ${email}`);

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
          checkout_url:     `${req.headers.get("origin") || "https://despertarespiral.com"}/checkout/${product.slug}`,
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
        console.warn("Transactional email failed (template may not exist yet):", emailRes.status, JSON.stringify(emailRes.data));
      }

      console.log("Sequenzy automation complete for:", email);
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("checkout-session unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
