/**
 * Edge Function: trello-boards
 * Fetches Trello boards, lists, and cards for the project media organization.
 *
 * Required secrets:
 *   TRELLO_API_KEY   – Trello API key (from https://trello.com/app-key)
 *   TRELLO_TOKEN     – Trello user OAuth token
 *   TRELLO_BOARD_ID  – Default board ID (optional — if set, fetches this board by default)
 *
 * GET  /trello-boards?action=boards|board&boardId=xxx
 * POST /trello-boards – body: { action: "createCard", listId, name, desc, due? }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, handleCors } from "../_shared/cors.ts";

const TRELLO_BASE = "https://api.trello.com/1";

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function trelloRequest(
  method: string,
  path: string,
  apiKey: string,
  token: string,
  body?: Record<string, unknown>
) {
  const url = new URL(`${TRELLO_BASE}${path}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("token", token);

  const res = await fetch(url.toString(), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[trello-boards] ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
    return { error: `Trello API ${res.status}: ${text.slice(0, 100)}` };
  }
  return res.json().catch(() => ({}));
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", "").trim());
  if (!user) return null;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("role").eq("id", user.id).single();

  return profile?.role === "admin" ? user : null;
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);
  const preflight = handleCors(req);
  if (preflight) return preflight;

  const adminUser = await requireAdmin(req);
  if (!adminUser) return json(401, { error: "Admin access required" }, cors);

  const apiKey = Deno.env.get("TRELLO_API_KEY");
  const token  = Deno.env.get("TRELLO_TOKEN");

  if (!apiKey || !token) {
    return json(200, {
      error: "not_configured",
      message: "TRELLO_API_KEY ou TRELLO_TOKEN não configurados",
    }, cors);
  }

  const url = new URL(req.url);

  if (req.method === "GET") {
    const action  = url.searchParams.get("action") ?? "boards";
    const boardId = url.searchParams.get("boardId") ?? Deno.env.get("TRELLO_BOARD_ID");

    if (action === "boards") {
      // List all boards for the authenticated member
      const member = await trelloRequest("GET", "/members/me/boards?fields=id,name,desc,url,closed,prefs,dateLastActivity", apiKey, token);
      return json(200, member, cors);
    }

    if (action === "board" && boardId) {
      // Fetch board with all lists and cards
      const [board, lists, cards, members] = await Promise.all([
        trelloRequest("GET", `/boards/${boardId}?fields=id,name,desc,url,prefs,dateLastActivity`, apiKey, token),
        trelloRequest("GET", `/boards/${boardId}/lists?cards=open&card_fields=id,name,desc,due,dueComplete,labels,url,dateLastActivity,idMembers,cover,badges`, apiKey, token),
        trelloRequest("GET", `/boards/${boardId}/cards?fields=id,name,desc,due,dueComplete,labels,url,dateLastActivity,idList,idMembers,cover,badges&limit=100`, apiKey, token),
        trelloRequest("GET", `/boards/${boardId}/members?fields=id,username,fullName,avatarUrl`, apiKey, token),
      ]);

      return json(200, { board, lists, cards, members }, cors);
    }

    if (action === "card" && url.searchParams.get("cardId")) {
      const cardId = url.searchParams.get("cardId")!;
      const [card, actions] = await Promise.all([
        trelloRequest("GET", `/cards/${cardId}?fields=all`, apiKey, token),
        trelloRequest("GET", `/cards/${cardId}/actions?filter=commentCard,updateCard&limit=20`, apiKey, token),
      ]);
      return json(200, { card, actions }, cors);
    }

    return json(400, { error: "Invalid action" }, cors);
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = body.action as string;

    if (action === "createCard") {
      const { listId, name, desc, due, labels } = body as {
        listId: string; name: string; desc?: string; due?: string; labels?: string;
      };
      if (!listId || !name) return json(400, { error: "listId e name são obrigatórios" }, cors);

      const card = await trelloRequest("POST", "/cards", apiKey, token, {
        idList: listId, name, desc: desc ?? "", due: due ?? null, idLabels: labels ?? "",
      });
      return json(200, card, cors);
    }

    if (action === "moveCard") {
      const { cardId, listId } = body as { cardId: string; listId: string };
      if (!cardId || !listId) return json(400, { error: "cardId e listId são obrigatórios" }, cors);
      const card = await trelloRequest("PUT", `/cards/${cardId}`, apiKey, token, { idList: listId });
      return json(200, card, cors);
    }

    if (action === "updateCard") {
      const { cardId, ...updates } = body as { cardId: string } & Record<string, unknown>;
      if (!cardId) return json(400, { error: "cardId é obrigatório" }, cors);
      const card = await trelloRequest("PUT", `/cards/${cardId}`, apiKey, token, updates);
      return json(200, card, cors);
    }

    if (action === "archiveCard") {
      const { cardId } = body as { cardId: string };
      if (!cardId) return json(400, { error: "cardId é obrigatório" }, cors);
      const card = await trelloRequest("PUT", `/cards/${cardId}`, apiKey, token, { closed: true });
      return json(200, card, cors);
    }

    return json(400, { error: "Invalid action" }, cors);
  }

  return json(405, { error: "Method not allowed" }, cors);
});
