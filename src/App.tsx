import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import ProductsPage from "@/pages/ProductsPage";
import CourseViewPage from "@/pages/CourseViewPage";
import LessonPage from "@/pages/LessonPage";
import CommunityPage from "@/pages/CommunityPage";
import TopicPage from "@/pages/TopicPage";
import CheckoutPage from "@/pages/CheckoutPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminProductsPage from "@/pages/admin/AdminProductsPage";
import AdminProductContentPage from "@/pages/admin/AdminProductContentPage";
import AdminOrdersPage from "@/pages/admin/AdminOrdersPage";
import AdminCommunityPage from "@/pages/admin/AdminCommunityPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ThankYouPage from "@/pages/ThankYouPage";

/* ── Global loading splash ── */
function GlobalLoader() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-surface)",
      transition: "background 0.4s",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        {/* Spiral logo placeholder */}
        <svg width="48" height="48" viewBox="0 0 600 600" fill="none" aria-label="Carregando">
          <path
            d="M300 550C120 550 50 420 50 300C50 165 155 65 285 65C395 65 480 152 480 262C480 355 410 420 320 420C245 420 185 360 185 286C185 220 237 170 303 170C362 170 408 216 408 275C408 327 370 362 320 362C277 362 245 330 245 288C245 252 273 226 308 226C340 226 365 251 365 283C365 312 343 333 315 333"
            stroke="#c6a870" strokeWidth="18" strokeLinecap="round" fill="none"
            style={{ animation: "spin 2s linear infinite", transformOrigin: "300px 300px" }}
          />
        </svg>
        <p style={{
          fontFamily: "Montserrat, sans-serif", fontSize: "9px",
          letterSpacing: "0.28em", textTransform: "uppercase",
          color: "rgba(198,168,112,0.5)",
        }}>
          Despertar Espiral
        </p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <GlobalLoader />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <GlobalLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"                element={<LandingPage />} />
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/register"        element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/checkout/:slug"  element={<CheckoutPage />} />
      <Route path="/obrigado"        element={<ThankYouPage />} />

      {/* Member */}
      <Route path="/dashboard"                              element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/products"                               element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
      <Route path="/products/:slug"                         element={<PrivateRoute><CourseViewPage /></PrivateRoute>} />
      <Route path="/products/:slug/lesson/:lessonId"        element={<PrivateRoute><LessonPage /></PrivateRoute>} />
      <Route path="/community"                              element={<PrivateRoute><CommunityPage /></PrivateRoute>} />
      <Route path="/community/topic/:id"                    element={<PrivateRoute><TopicPage /></PrivateRoute>} />

      {/* Admin */}
      <Route path="/admin"                      element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/users"                element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/admin/products"             element={<AdminRoute><AdminProductsPage /></AdminRoute>} />
      <Route path="/admin/products/:id/content" element={<AdminRoute><AdminProductContentPage /></AdminRoute>} />
      <Route path="/admin/orders"               element={<AdminRoute><AdminOrdersPage /></AdminRoute>} />
      <Route path="/admin/community"            element={<AdminRoute><AdminCommunityPage /></AdminRoute>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
