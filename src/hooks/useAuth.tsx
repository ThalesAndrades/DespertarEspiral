import { useState, useEffect, useRef, createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { fireEventAsync } from "@/lib/sequenzy";
import { mapAuthError } from "@/lib/authErrors";

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
  loginWithGoogle: (nextPath?: string) => Promise<{ error?: string }>;
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
  // Track the currently-hydrated user id across renders so onAuthStateChange
  // can dedupe redundant profile fetches without a stale closure.
  const hydratedUserIdRef = useRef<string | null>(null);

  /* ── hydrate from session on mount ── */
  useEffect(() => {
    let mounted = true;
    let initialSessionResolved = false;

    // Surface OAuth provider errors returned in the callback URL.
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const search = new URLSearchParams(window.location.search);
      const errDesc = hash.get("error_description") ?? search.get("error_description");
      if (errDesc) {
        import("sonner").then(({ toast }) => toast.error(decodeURIComponent(errDesc))).catch(() => {});
        // Scrub the URL so the error doesn't re-trigger on reload
        const clean = window.location.pathname + (search.toString() ? `?${search.toString()}` : "");
        window.history.replaceState({}, "", clean);
      }
    } catch { /* non-browser or malformed URL — ignore */ }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted && session?.user) {
        const { profile, slugs } = await fetchProfile(session.user.id);
        if (mounted) {
          setUser(mapSupabaseUser(session.user, profile ?? undefined, slugs));
          hydratedUserIdRef.current = session.user.id;
        }
      }
      if (mounted) {
        initialSessionResolved = true;
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          const alreadyHydrated =
            initialSessionResolved && hydratedUserIdRef.current === session.user.id;

          if (!alreadyHydrated) {
            const { profile, slugs } = await fetchProfile(session.user.id);
            if (!mounted) return;
            setUser(mapSupabaseUser(session.user, profile ?? undefined, slugs));
            hydratedUserIdRef.current = session.user.id;
            setLoading(false);
          }

          // Post-OAuth redirect only — consumed once from sessionStorage.
          // We only redirect here for Google OAuth (which lands on "/").
          // Email+password login uses navigate() directly in the page component.
          const savedNext = sessionStorage.getItem("auth_next");
          const isOAuthCallback = /[#&?]access_token|code=/.test(
            window.location.hash + window.location.search
          );
          if (savedNext && isOAuthCallback) {
            sessionStorage.removeItem("auth_next");
            const safePath = savedNext.startsWith("/") && !savedNext.startsWith("//")
              ? savedNext
              : "/dashboard";
            window.location.replace(safePath);
          }
        } else if (event === "SIGNED_OUT") {
          sessionStorage.removeItem("auth_next");
          hydratedUserIdRef.current = null;
          setUser(null);
          setLoading(false);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Silently refresh profile slugs (e.g. new product access granted)
          const { profile, slugs } = await fetchProfile(session.user.id);
          if (mounted) setUser(mapSupabaseUser(session.user, profile ?? undefined, slugs));
        } else if (event === "USER_UPDATED" && session?.user) {
          const { profile, slugs } = await fetchProfile(session.user.id);
          if (mounted) {
            setUser(mapSupabaseUser(session.user, profile ?? undefined, slugs));
            setLoading(false);
          }
        } else if (event === "PASSWORD_RECOVERY") {
          // When Supabase sends a recovery link, ensure loading clears
          if (mounted) setLoading(false);
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
    if (error) return { error: mapAuthError(error.message) };
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
    if (error || !data.user) return { error: mapAuthError(error?.message ?? "Código inválido") };

    const { data: updateData, error: updateErr } = await supabase.auth.updateUser({
      password,
      data: { full_name: name },
    });
    if (updateErr || !updateData.user) {
      // OTP already consumed — sign out to avoid orphan authenticated state
      await supabase.auth.signOut().catch(() => {});
      return {
        error: mapAuthError(updateErr?.message) +
          (updateErr ? " Use \"Esqueci a senha\" para definir uma nova." : ""),
      };
    }

    // Update user_profiles — log error but don't block
    const { error: profileErr } = await supabase
      .from("user_profiles")
      .update({ full_name: name })
      .eq("id", updateData.user.id);
    if (profileErr) console.warn("[useAuth] profile update failed:", profileErr.message);

    const { profile, slugs } = await fetchProfile(updateData.user.id);
    setUser(mapSupabaseUser(updateData.user, profile ?? undefined, slugs));

    // Sequenzy: user registered → triggers Onboarding sequence
    fireEventAsync("user.registered", {
      email,
      firstName: name.split(" ")[0],
      properties: { source: "email_otp", platform: "web" },
    });

    return {};
  };

  /* ── login with email + password ── */
  const loginWithPassword = async (
    email: string,
    password: string
  ): Promise<{ error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: mapAuthError(error?.message ?? "Credenciais inválidas") };

    const { profile, slugs } = await fetchProfile(data.user.id);
    setUser(mapSupabaseUser(data.user, profile ?? undefined, slugs));
    // Prevent the onAuthStateChange SIGNED_IN handler from duplicating the fetch
    hydratedUserIdRef.current = data.user.id;
    return {};
  };

  /* ── Google OAuth ── */
  const loginWithGoogle = async (nextPath?: string): Promise<{ error?: string }> => {
    // Sanitize redirect destination (same-origin absolute path only)
    const raw = nextPath ?? "/dashboard";
    const dest = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
    // Store destination so the SIGNED_IN handler can redirect after OAuth callback
    sessionStorage.setItem("auth_next", dest);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Always land on the app root; the SIGNED_IN handler will consume auth_next
        redirectTo: `${window.location.origin}/`,
        queryParams: { access_type: "offline", prompt: "consent" },
        skipBrowserRedirect: false,
      },
    });
    if (error) {
      sessionStorage.removeItem("auth_next");
      return { error: mapAuthError(error.message) };
    }
    return {};
  };

  /* ── logout ── */
  const logout = async () => {
    setUser(null); // clear immediately so UI responds instantly
    await supabase.auth.signOut();
  };

  /* ── refresh user data ── */
  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { profile, slugs } = await fetchProfile(session.user.id);
    setUser(mapSupabaseUser(session.user, profile ?? undefined, slugs));
    hydratedUserIdRef.current = session.user.id;
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
