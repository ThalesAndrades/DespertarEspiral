import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/* Lazy-loaded pages for optimal bundle splitting */
const LandingPage           = React.lazy(() => import("@/pages/LandingPage"));
const LoginPage             = React.lazy(() => import("@/pages/LoginPage"));
const RegisterPage          = React.lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage    = React.lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage     = React.lazy(() => import("@/pages/ResetPasswordPage"));
const DashboardPage         = React.lazy(() => import("@/pages/DashboardPage"));
const ProductsPage          = React.lazy(() => import("@/pages/ProductsPage"));
const CourseViewPage        = React.lazy(() => import("@/pages/CourseViewPage"));
const LessonPage            = React.lazy(() => import("@/pages/LessonPage"));
const CommunityPage         = React.lazy(() => import("@/pages/CommunityPage"));
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

/* ── Global loader ── */
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
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <GlobalLoader />;
  if (!user)               return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/* ── Suspense wrapper ── */
function Suspense({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<GlobalLoader />}>
      {children}
    </React.Suspense>
  );
}

export default function App() {
  return (
    <Suspense>
      <Routes>
        {/* Public */}
        <Route path="/"                element={<LandingPage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/checkout/:slug"  element={<CheckoutPage />} />
        <Route path="/obrigado"        element={<ThankYouPage />} />
        <Route path="/privacidade" element={<PrivacyPolicyPage />} />
        <Route path="/termos"      element={<TermsOfUsePage />} />
        <Route path="/politica-de-privacidade" element={<Navigate to="/privacidade" replace />} />
        <Route path="/termos-de-uso"           element={<Navigate to="/termos" replace />} />
        <Route path="/privacy"                element={<Navigate to="/privacidade" replace />} />
        <Route path="/terms"                  element={<Navigate to="/termos" replace />} />

        {/* Member */}
        <Route path="/dashboard"                           element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/products"                            element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
        <Route path="/products/:slug"                      element={<PrivateRoute><CourseViewPage /></PrivateRoute>} />
        <Route path="/products/:slug/lesson/:lessonId"     element={<PrivateRoute><LessonPage /></PrivateRoute>} />
        <Route path="/community"                           element={<PrivateRoute><CommunityPage /></PrivateRoute>} />
        <Route path="/community/topic/:id"                 element={<PrivateRoute><TopicPage /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin"                      element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/admin/users"                element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="/admin/products"             element={<AdminRoute><AdminProductsPage /></AdminRoute>} />
        <Route path="/admin/products/:id/content" element={<AdminRoute><AdminProductContentPage /></AdminRoute>} />
        <Route path="/admin/orders"               element={<AdminRoute><AdminOrdersPage /></AdminRoute>} />
        <Route path="/admin/community"            element={<AdminRoute><AdminCommunityPage /></AdminRoute>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
