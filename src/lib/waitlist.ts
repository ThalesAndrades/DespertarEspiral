import { supabase } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Entra na lista de espera de um produto ainda nao lancado.
 * Email repetido no mesmo produto NAO e erro: o indice unico do banco barra,
 * e para a visitante o resultado e o mesmo — ela esta na lista.
 */
export async function joinWaitlist(
  email: string,
  productId: string
): Promise<{ ok: boolean; duplicate: boolean }> {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) return { ok: false, duplicate: false };

  // name/source vao preenchidos porque a tabela ja e usada pelo MapaDoPoder
  // com esse formato (name, email, phone, source) — omitir `name` arriscaria
  // violar um NOT NULL que nao da para inspecionar pela API publica.
  const { error } = await supabase
    .from("launch_waitlist")
    .insert({
      name: "Lista de espera",
      email: normalized,
      source: "vitrine",
      product_id: productId,
    });

  if (error) {
    if (error.code === "23505") return { ok: true, duplicate: true };
    console.error("[waitlist] falha ao inserir", error.message);
    return { ok: false, duplicate: false };
  }

  return { ok: true, duplicate: false };
}
