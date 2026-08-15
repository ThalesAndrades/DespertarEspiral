// Edge Function: admin-orders
// Endpoint de admin para operações manuais sobre pedidos.
// Actions: confirm_payment | revoke_access
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors, isAllowedOrigin } from "../_shared/cors.ts";
import { produtosDoPedido } from "../_shared/orderItems.ts";

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

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (!isAllowedOrigin(req)) return jsonResponse(req, 403, { error: "Origem não permitida" });
  if (req.method !== "POST")  return jsonResponse(req, 405, { error: "Método não permitido" });

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse(req, 415, { error: "Content-Type deve ser application/json" });
    }

    const body = await req.json();
    const { action, orderId, paymentMethod } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // ── Admin guard: validate caller via JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, 401, { error: "Autenticação necessária" });
    }
    const callerToken = authHeader.replace("Bearer ", "").trim();

    const { data: { user: callerUser }, error: authErr } = await supabaseAdmin.auth.getUser(callerToken);
    if (authErr || !callerUser) {
      return jsonResponse(req, 401, { error: "Token inválido ou expirado" });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return jsonResponse(req, 403, { error: "Acesso negado. Requer papel de administrador." });
    }

    // ─────────────────────────────────────────────────
    // ACTION: confirm_payment
    // ─────────────────────────────────────────────────
    if (action === "confirm_payment" && orderId) {
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*, products(title, subtitle, slug)")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        return jsonResponse(req, 404, { error: "Pedido não encontrado" });
      }

      if (order.status === "paid") {
        return jsonResponse(req, 409, { error: "Pedido já confirmado" });
      }

      // Ler os itens do pedido ANTES de marcar como pago — mesmo motivo do
      // asaas-webhook: esta era a TERCEIRA rota que liberava acesso, e ela
      // so liberava order.product_id (o principal), nunca order_items. Um
      // pedido com bump confirmado por aqui liberava 1 de 2 produtos e, a
      // partir dai, o proprio asaas-webhook passava a responder
      // "already_paid" sem tentar de novo — perda permanente para pedido com
      // user_id. Ler antes de marcar pago preserva a saida: se a leitura
      // falhar, o pedido continua "pending" e o admin pode confirmar de novo.
      const itensResult = await produtosDoPedido(supabaseAdmin, order);
      if (!itensResult.ok) {
        console.error(`order_items ilegivel — pedido NAO confirmado, pode tentar de novo | order=${orderId}`);
        return jsonResponse(req, 500, { error: "Falha ao ler itens do pedido" });
      }
      const idsParaLiberar = itensResult.ids;

      // Transactional update — only moves pending → paid
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          payment_method: paymentMethod || "manual",
          paid_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "pending")   // guard: prevent double-confirm
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("Order update failed:", updateError);
        return jsonResponse(req, 500, { error: "Falha ao confirmar pagamento" });
      }
      if (!updated) {
        return jsonResponse(req, 409, { error: "Pedido já confirmado (ou não está pendente)" });
      }

      // Grant product access — um upsert por produto (idempotente); erro em
      // um item nao impede a liberacao do outro.
      if (order.user_id) {
        let grantedCount = 0;
        for (const productId of idsParaLiberar) {
          const { error: accessError } = await supabaseAdmin
            .from("user_products")
            .upsert(
              { user_id: order.user_id, product_id: productId },
              { onConflict: "user_id,product_id" }
            );
          if (accessError) {
            console.error(`Failed to grant access | order=${orderId} user=${order.user_id} product=${productId}:`, accessError);
          } else {
            grantedCount++;
          }
        }
        console.log(`Access granted: user=${order.user_id} | products=${grantedCount}/${idsParaLiberar.length} | order=${orderId}`);
      } else {
        console.warn(`Order ${orderId}: no user_id — guest purchase, access not auto-granted`);
      }

      // Aqui saíram QUATRO disparos do Sequenzy: atributos do assinante, tags,
      // o evento de CRM `compra_confirmada` e o e-mail "acesso liberado".
      // O Estágio 4 repõe SÓ o e-mail, via Resend — a perna de CRM não tem
      // equivalente conhecido no Resend e morre aqui, de propósito.
      console.warn(`Cliente NAO notificado automaticamente (Resend pendente) — order ${orderId}`);

      console.log(`Payment confirmed: order ${orderId} by admin ${callerUser.id}`);
      return jsonResponse(req, 200, {
        success: true,
        message: "Pagamento confirmado e acesso liberado.",
      });
    }

    // ─────────────────────────────────────────────────
    // ACTION: revoke_access
    // ─────────────────────────────────────────────────
    if (action === "revoke_access" && body.userId && body.productId) {
      const { error } = await supabaseAdmin
        .from("user_products")
        .delete()
        .eq("user_id", body.userId)
        .eq("product_id", body.productId);

      if (error) {
        console.error("Revoke access failed:", error);
        return jsonResponse(req, 500, { error: "Falha ao revogar acesso" });
      }

      // Mark associated paid orders as refunded
      await supabaseAdmin
        .from("orders")
        .update({ status: "refunded" })
        .eq("user_id", body.userId)
        .eq("product_id", body.productId)
        .eq("status", "paid");

      // Aqui saiu um evento de CRM do Sequenzy (`acesso_revogado`), NÃO um
      // e-mail — nunca houve notificação à cliente nesta ação. Não inventar
      // uma no Estágio 4 sem decidir antes se ela deve existir.

      console.log(`Access revoked: user ${body.userId} product ${body.productId} by admin ${callerUser.id}`);
      return jsonResponse(req, 200, { success: true, message: "Acesso revogado." });
    }

    return jsonResponse(req, 400, {
      error: "Ação não reconhecida. Use: confirm_payment | revoke_access",
    });

  } catch (err) {
    console.error("admin-orders unexpected error:", err);
    return jsonResponse(req, 500, { error: "Erro interno do servidor" });
  }
});
