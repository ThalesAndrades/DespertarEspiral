import { createClient } from "@supabase/supabase-js";

if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_SUPABASE_URL)
    throw new Error("[Config] VITE_SUPABASE_URL is not defined. Check your .env file.");
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY)
    throw new Error("[Config] VITE_SUPABASE_ANON_KEY is not defined. Check your .env file.");
}

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
