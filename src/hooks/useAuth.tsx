import { useState, useEffect, createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/* ─────────────────────────────────────────── */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "member" | "admin";
  anonymous_name: string;
  products: string[]; // product slugs
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  sendOtp: (email: string) => Promise<{ error?: string }>;
  verifyOtpAndRegister: (
    email: string,
    otp: string,
    password: string,
    name: string
  ) => Promise<{ error?: string }>;
  loginWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error?: string }>;
  loginWithGoogle: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/* ─────────────────────────────────────────── */
function mapSupabaseUser(
  user: User,
  profile?: { role?: string; anonymous_name?: string; full_name?: string; username?: string },
  slugs?: string[]
): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.username ||
      user.email!.split("@")[0],
    role: (profile?.role as "member" | "admin") ?? "member",
    anonymous_name:
      profile?.anonymous_name || user.user_metadata?.anonymous_name || "Convidada",
    products: slugs ?? [],
  };
}

async function fetchProfile(userId: string) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, anonymous_name, full_name, username")
    .eq("id", userId)
    .single();

  const { data: userProducts } = await supabase
    .from("user_products")
    .select("products(slug)")
    .eq("user_id", userId);

  const slugs =
    userProducts
      ?.map((up: Record<string, unknown>) => {
        const p = up.products as { slug?: string } | null;
        return p?.slug ?? null;
      })
      .filter(Boolean) as string[] ?? [];

  return { profile, slugs };
}

/* ─────────────────────────────────────────── */
const AuthContext = createContext<AuthContextType | null>(null);
const fallbackAuth: AuthContextType = {
  user: null,
  loading: false,
  sendOtp: async () => ({ error: "AuthProvider não inicializado" }),
  verifyOtpAndRegister: async () => ({ error: "AuthProvider não inicializado" }),
  loginWithPassword: async () => ({ error: "AuthProvider não inicializado" }),
  loginWithGoogle: async () => ({ error: "AuthProvider não inicializado" }),
  logout: async () => {},
  refreshUser: async () => {},
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── hydrate from session on mount ── */
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted && session?.user) {
        const { profile, slugs } = await fetchProfile(session.user.id);
        if (mounted) setUser(mapSupabaseUser(session.user, profile ?? undefined, slugs));
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          const { profile, slugs } = await fetchProfile(session.user.id);
          setUser(mapSupabaseUser(session.user, profile ?? undefined, slugs));
          setLoading(false);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setLoading(false);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          const { profile, slugs } = await fetchProfile(session.user.id);
          setUser(mapSupabaseUser(session.user, profile ?? undefined, slugs));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ── send OTP ── */
  const sendOtp = async (email: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) return { error: error.message };
    return {};
  };

  /* ── verify OTP + set password + update profile ── */
  const verifyOtpAndRegister = async (
    email: string,
    otp: string,
    password: string,
    name: string
  ): Promise<{ error?: string }> => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    if (error || !data.user) return { error: error?.message ?? "Código inválido" };

    const { data: updateData, error: updateErr } = await supabase.auth.updateUser({
      password,
      data: { full_name: name },
    });
    if (updateErr || !updateData.user) return { error: updateErr?.message ?? "Erro ao definir senha" };

    // Update user_profiles
    await supabase
      .from("user_profiles")
      .update({ full_name: name })
      .eq("id", updateData.user.id);

    const { profile, slugs } = await fetchProfile(updateData.user.id);
    setUser(mapSupabaseUser(updateData.user, profile ?? undefined, slugs));
    return {};
  };

  /* ── login with email + password ── */
  const loginWithPassword = async (
    email: string,
    password: string
  ): Promise<{ error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: error?.message ?? "Credenciais inválidas" };

    const { profile, slugs } = await fetchProfile(data.user.id);
    setUser(mapSupabaseUser(data.user, profile ?? undefined, slugs));
    return {};
  };

  /* ── Google OAuth ── */
  const loginWithGoogle = async (): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: "offline", prompt: "consent" },
        skipBrowserRedirect: false,
      },
    });
    if (error) return { error: error.message };
    return {};
  };

  /* ── logout ── */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  /* ── refresh user data ── */
  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { profile, slugs } = await fetchProfile(session.user.id);
    setUser(mapSupabaseUser(session.user, profile ?? undefined, slugs));
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      sendOtp, verifyOtpAndRegister, loginWithPassword, loginWithGoogle, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;
  if (import.meta.env.DEV) throw new Error("useAuth must be used within AuthProvider");
  return fallbackAuth;
}
