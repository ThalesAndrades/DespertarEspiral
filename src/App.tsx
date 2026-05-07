
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/lib/ErrorBoundary";
import LandingPage from "@/pages/LandingPage"; // static — first page, no lazy delay

/* ── Prefetch helpers ── */
const prefetchLogin    = () => import("@/pages/LoginPage");
const prefetchRegister = () => import("@/pages/RegisterPage");
const prefetchDashboard = () => import("@/pages/DashboardPage");
const prefetchProducts  = () => import("@/pages/ProductsPage");
const prefetchCommunity = () => import("@/pages/CommunityPage");

/* ── Lazy-loaded pages (route-based code splitting) ── */
const LoginPage             = React.lazy(prefetchLogin);
const RegisterPage          = React.lazy(prefetchRegister);
const ForgotPasswordPage    = React.lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage     = React.lazy(() => import("@/pages/ResetPasswordPage"));
const DashboardPage         = React.lazy(prefetchDashboard);
const ProductsPage          = React.lazy(prefetchProducts);
const CourseViewPage        = React.lazy(() => import("@/pages/CourseViewPage"));
const LessonPage            = React.lazy(() => import("@/pages/LessonPage"));
const CommunityPage         = React.lazy(prefetchCommunity);
const TopicPage             = React.lazy(() => import("@/pages/TopicPage"));
const CheckoutPage          = React.lazy(() => import("@/pages/CheckoutPage"));
const ThankYouPage          = React.lazy(() => import("@/pages/ThankYouPage"));
const PrivacyPolicyPage     = React.lazy(() => import("@/pages/PrivacyPolicyPage"));
const TermsOfUsePage        = React.lazy(() => import("@/pages/TermsOfUsePage"));
const NotFoundPage          = React.lazy(() => import("@/pages/NotFoundPage"));
const AdminDashboardPage    = React.lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminUsersPage        = React.lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminProductsPage     = React.lazy(() => import("@/pages/admin/AdminProductsPage"));
const AdminProductContentPage = React.lazy(() => import("@/pages/admin/AdminProductContentPage"));
const AdminOrdersPage       = React.lazy(() => import("@/pages/admin/AdminOrdersPage"));
const AdminCommunityPage    = React.lazy(() => import("@/pages/admin/AdminCommunityPage"));
const AdminSocialPage       = React.lazy(() => import("@/pages/admin/AdminSocialPage"));
const AdminCRMPage          = React.lazy(() => import("@/pages/admin/AdminCRMPage"));
const AdminMediaPage        = React.lazy(() => import("@/pages/admin/AdminMediaPage"));
const AdminTrafficPage      = React.lazy(() => import("@/pages/admin/AdminTrafficPage"));
const CertificatePage       = React.lazy(() => import("@/pages/CertificatePage"));
const ProfilePage           = React.lazy(() => import("@/pages/ProfilePage"));

/* ── Global loader — branded spiral spinner ── */
function GlobalLoader() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-surface)",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
        <svg
          width="44" height="44" viewBox="0 0 600 600" fill="none"
          aria-label="Carregando" role="img"
          style={{ animation: "loaderSpin 2s linear infinite", transformOrigin: "300px 300px" }}
        >
          <path
            d="M300 550C120 550 50 420 50 300C50 165 155 65 285 65C395 65 480 152 480 262C480 355 410 420 320 420C245 420 185 360 185 286C185 220 237 170 303 170C362 170 408 216 408 275C408 327 370 362 320 362C277 362 245 330 245 288C245 252 273 226 308 226C340 226 365 251 365 283C365 312 343 333 315 333"
            stroke="var(--gold)" strokeWidth="16" strokeLinecap="round" fill="none"
            opacity="0.8"
          />
        </svg>
        <p style={{
          fontFamily: "Montserrat, sans-serif", fontSize: "8px",
          letterSpacing: "0.30em", textTransform: "uppercase",
          color: "rgba(198,168,112,0.45)",
        }}>
          Despertar Espiral
        </p>
      </div>
      <style>{`
        @keyframes loaderSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ── Route guards ── */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <GlobalLoader />;
  if (!user) {
    const full = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(full)}`} replace />;
  }

  /* Prefetch member pages on first authenticated render */
  React.useEffect(() => {
    const timer = setTimeout(() => {
      prefetchDashboard();
      prefetchProducts();
      prefetchCommunity();
    }, 1200);
    return () => clearTimeout(timer);
  // The error message "Definition for rule 'react-hooks/exhaustive-deps' was not found"
  // indicates an issue with ESLint configuration, not a TypeScript syntax error.
  // Removing the ESLint comment will stop ESLint from trying to apply a rule it can't find.
  // If the intent was to disable the rule, it should be done in the ESLint config or with a valid comment.
  }, []); // Empty dependency array means this effect runs once on mount

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <GlobalLoader />;
  if (!user)               return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/**
 * PublicOnlyRoute — renders immediately; redirects only once auth resolves.
 * This prevents blank-screen on /login while getSession() is pending.
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  /* Prefetch auth pages eagerly on mount */
  React.useEffect(() => {
    prefetchLogin();
    prefetchRegister();
  }, []);

  if (!loading && user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/* ── Suspense + ErrorBoundary wrapper ── */
function Suspense({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<GlobalLoader />}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <Suspense>
      <Routes>
        {/* Public — LandingPage is static for instant load */}
        <Route path="/"                element={<LandingPage />} />
        <Route path="/login"           element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register"        element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/checkout/:slug"  element={<CheckoutPage />} />
        <Route path="/obrigado"        element={<ThankYouPage />} />
        <Route path="/privacidade"     element={<PrivacyPolicyPage />} />
        <Route path="/termos"          element={<TermsOfUsePage />} />
        {/* Redirects */}
        <Route path="/politica-de-privacidade" element={<Navigate to="/privacidade" replace />} />
        <Route path="/termos-de-uso"           element={<Navigate to="/termos" replace />} />
        <Route path="/privacy"                element={<Navigate to="/privacidade" replace />} />
        <Route path="/terms"                  element={<Navigate to="/termos" replace />} />

        {/* Member */}
        <Route path="/dashboard"                           element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/products"                            element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
        <Route path="/products/:slug"                      element={<PrivateRoute><CourseViewPage /></PrivateRoute>} />
        <Route path="/products/:slug/lesson/:lessonId"     element={<PrivateRoute><LessonPage /></PrivateRoute>} />
        <Route path="/products/:slug/certificado"          element={<PrivateRoute><CertificatePage /></PrivateRoute>} />
        <Route path="/community"                           element={<PrivateRoute><CommunityPage /></PrivateRoute>} />
        <Route path="/community/topic/:id"                 element={<PrivateRoute><TopicPage /></PrivateRoute>} />
        <Route path="/perfil"                              element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin"                      element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/admin/users"                element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="/admin/products"             element={<AdminRoute><AdminProductsPage /></AdminRoute>} />
        <Route path="/admin/products/:id/content" element={<AdminRoute><AdminProductContentPage /></AdminRoute>} />
        <Route path="/admin/orders"               element={<AdminRoute><AdminOrdersPage /></AdminRoute>} />
        <Route path="/admin/community"            element={<AdminRoute><AdminCommunityPage /></AdminRoute>} />
        <Route path="/admin/social"               element={<AdminRoute><AdminSocialPage /></AdminRoute>} />
        <Route path="/admin/crm"                  element={<AdminRoute><AdminCRMPage /></AdminRoute>} />
        <Route path="/admin/media"                element={<AdminRoute><AdminMediaPage /></AdminRoute>} />
        <Route path="/admin/traffic"              element={<AdminRoute><AdminTrafficPage /></AdminRoute>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
