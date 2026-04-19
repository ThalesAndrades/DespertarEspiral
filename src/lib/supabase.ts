import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnon) {
  const msg = "[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas. Defina-as no .env.";
  if (import.meta.env.DEV) throw new Error(msg);
  else console.error(msg);
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnon ?? "", {
  auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
