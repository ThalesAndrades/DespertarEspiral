# 🏗️ COURSE PLATFORM — COMPLETE ARCHITECTURE BLUEPRINT

> **Purpose:** Complete memory file documenting every architectural decision, pattern, data model, and implementation detail needed to recreate this full-stack course platform from scratch on Supabase (React + Vite + TypeScript + Tailwind + Supabase/Supabase).
>
> **No brand personalization.** All names, colors, copy, and slugs are replaced with generic placeholders.

---

## TABLE OF CONTENTS

1. [Tech Stack](#1-tech-stack)
2. [Project Directory Structure](#2-project-directory-structure)
3. [Database Schema](#3-database-schema)
4. [Row Level Security (RLS)](#4-row-level-security-rls)
5. [Storage Buckets](#5-storage-buckets)
6. [Edge Functions](#6-edge-functions)
7. [Authentication System](#7-authentication-system)
8. [State Management & Caching](#8-state-management--caching)
9. [Routing Architecture](#9-routing-architecture)
10. [Pages — Public](#10-pages--public)
11. [Pages — Member Area](#11-pages--member-area)
12. [Pages — Admin Panel](#12-pages--admin-panel)
13. [Component Library Patterns](#13-component-library-patterns)
14. [Data Fetching Patterns](#14-data-fetching-patterns)
15. [Payment Integration (Asaas + Sequenzy)](#15-payment-integration-asaas--sequenzy)
16. [Video Upload System](#16-video-upload-system)
17. [Certificate Generation (Canvas)](#17-certificate-generation-canvas)
18. [Community Forum System](#18-community-forum-system)
19. [Admin Panel — Full Feature Map](#19-admin-panel--full-feature-map)
20. [Performance Optimizations](#20-performance-optimizations)
21. [Testing Strategy](#21-testing-strategy)
22. [Security Checklist](#22-security-checklist)
23. [CSS Design System](#23-css-design-system)
24. [Database Functions & Triggers](#24-database-functions--triggers)
25. [Deployment Checklist](#25-deployment-checklist)

---

## 1. TECH STACK

| Layer | Technology |
|---|---|
| Framework | React 18.3+ + Vite 5.4+ |
| Language | TypeScript 5.5+ |
| Styling | Tailwind CSS 3.4 + custom CSS variables |
| Component Library | shadcn/ui (read-only, never modify) |
| Backend | Supabase (Supabase-compatible) |
| Auth | Supabase Auth (OTP + Password + Google OAuth) |
| Database | PostgreSQL (via Supabase) |
| Storage | Supabase Storage (video bucket) |
| Edge Functions | Deno-based serverless (Supabase Edge Functions) |
| State — Server | React Query v5 OR manual useState + useEffect |
| State — Local | useState / useContext |
| Forms | react-hook-form + zod |
| Routing | React Router DOM v6 |
| Icons | lucide-react |
| Toasts | sonner |
| Helmet | react-helmet-async |
| Testing | Vitest + @testing-library/react + @testing-library/user-event |
| Payments | Asaas (PIX / credit card / boleto) + Sequenzy (CRM events) |

---

## 2. PROJECT DIRECTORY STRUCTURE

```
src/
├── App.tsx                    # Router root — all routes defined here
├── main.tsx                   # React root + HelmetProvider
├── index.css                  # Global CSS variables + utility classes
│
├── assets/                    # Static images imported in components
│   ├── course-thumb-1.jpg
│   ├── course-thumb-2.jpg
│   ├── hero-image.jpg
│   └── logo-mark.svg
│
├── components/
│   ├── ui/                    # shadcn/ui — READ ONLY, never modify
│   │   ├── SkeletonShimmer.tsx   # Custom skeleton wrapper
│   │   └── ThemeToggle.tsx
│   ├── layout/
│   │   ├── AdminLayout.tsx        # Sidebar + topbar for admin pages
│   │   ├── DashboardLayout.tsx    # Sidebar + mobile nav for members
│   │   ├── LandingNav.tsx         # Public nav (logo + CTAs)
│   │   ├── LazyDecorative.tsx     # Lazy-loaded decorative elements
│   │   └── IPhoneMockup.tsx       # Marketing mockup components
│   └── features/
│       └── QuizSection.tsx        # Feature-specific composite components
│
├── constants/
│   ├── landingContent.ts          # All landing page copy in one place
│   └── mockData.ts                # Dev seed data
│
├── hooks/
│   ├── useAuth.tsx                # Global auth context + provider
│   └── useTheme.ts                # Dark/light theme toggle
│
├── lib/
│   ├── supabase.ts                # Supabase client (auto-reads VITE_SUPABASE_*)
│   ├── authErrors.ts              # mapAuthError(error) → pt-BR strings
│   ├── contentSafety.ts           # sanitizeHtml, safeEmbedUrl, safeExternalUrl
│   ├── analytics.ts               # UTM capture + attribution helpers
│   ├── dateUtils.ts               # timeAgo, greeting, formatBRL, progressPct...
│   ├── sequenzy.ts                # fireEvent / fireEventAsync CRM helpers
│   ├── utils.ts                   # cn() + general utilities
│   └── ErrorBoundary.tsx          # React error boundary wrapper
│
├── pages/
│   ├── LandingPage.tsx            # Public homepage (imported statically)
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── CheckoutPage.tsx           # Payment flow (works anon + logged in)
│   ├── ThankYouPage.tsx           # Post-payment redirect
│   ├── DashboardPage.tsx          # Member home
│   ├── ProductsPage.tsx           # Course library
│   ├── CourseViewPage.tsx         # Course overview + module accordion
│   ├── LessonPage.tsx             # Lesson player (video/text/pdf/audio)
│   ├── CommunityPage.tsx          # Forum list + new post
│   ├── TopicPage.tsx              # Single thread + comments
│   ├── ProfilePage.tsx            # Edit name, avatar, password
│   ├── CertificatePage.tsx        # Full certificate page (canvas)
│   ├── PrivacyPolicyPage.tsx
│   ├── TermsOfUsePage.tsx
│   ├── NotFoundPage.tsx           # catch-all 404
│   └── admin/
│       ├── AdminDashboardPage.tsx  # Metrics overview
│       ├── AdminUsersPage.tsx      # User list + role management
│       ├── AdminProductsPage.tsx   # Course CRUD
│       ├── AdminProductContentPage.tsx  # Module/lesson editor
│       ├── AdminOrdersPage.tsx     # Payment history
│       ├── AdminCommunityPage.tsx  # Forum moderation
│       ├── AdminCRMPage.tsx        # CRM / email analytics
│       ├── AdminSocialPage.tsx     # Social media metrics
│       ├── AdminTrafficPage.tsx    # Ads / traffic analytics
│       └── AdminMediaPage.tsx      # Trello + media organizer
│
├── types/
│   └── index.ts                   # All shared TypeScript interfaces
│
└── test/
    ├── setup.ts                   # jest-dom + browser API stubs
    ├── README.md                  # Test documentation
    └── mocks/
        └── supabase.ts            # Reusable Supabase mock

supabase/
├── functions/
│   ├── _shared/
│   │   ├── cors.ts                # CORS headers (reused by all functions)
│   │   └── sequenzy.ts            # Sequenzy client helper
│   ├── checkout-session/          # Create Asaas payment + order row
│   ├── asaas-webhook/             # Handle Asaas payment confirmation
│   ├── sequenzy-webhook/          # Handle Sequenzy CRM events
│   ├── sequenzy-event/            # Fire individual CRM events
│   ├── grant-pending-access/      # Batch-grant access to paid orders
│   ├── order-recovery/            # Re-send purchase recovery emails
│   ├── ads-stats/                 # Meta Ads + Google Ads aggregation
│   ├── social-stats/              # Instagram + LinkedIn metrics
│   ├── crm-stats/                 # CRM dashboard data
│   └── trello-boards/             # Trello board integration
└── migrations/
    └── 20260414_000001_production_rls.sql
```

---

## 3. DATABASE SCHEMA

### Table: `user_profiles`
```sql
create table public.user_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  username      text,
  full_name     text,
  anonymous_name text,          -- shown in community (pseudonym)
  role          text not null default 'member'  -- 'member' | 'admin'
);
-- Indexes
create index idx_user_profiles_email on public.user_profiles(email);
```

**Key trigger:** `on_auth_user_created` → calls `handle_new_user()` to auto-insert `user_profiles` row.
**Key trigger:** `on_auth_user_updated` → calls `sync_user_metadata()` to sync name changes.

---

### Table: `products`
```sql
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  subtitle        text,
  description     text,
  price           numeric(10,2) not null default 0,
  original_price  numeric(10,2),
  is_active       boolean default true,
  thumbnail_url   text,
  sort_order      integer default 0,
  certificate_config jsonb default '{}',  -- CertConfig JSON (see §17)
  created_at      timestamptz default now()
);
```

---

### Table: `modules`
```sql
create table public.modules (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  title       text not null,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);
create index idx_modules_product_id on public.modules(product_id);
```

---

### Table: `lessons`
```sql
create table public.lessons (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.modules(id) on delete cascade,
  title        text not null,
  type         text not null,        -- 'video' | 'text' | 'pdf' | 'audio'
  content      text,                 -- embed URL / HTML / PDF URL / audio URL
  duration_min integer default 0,
  sort_order   integer default 0,
  is_free      boolean default false, -- free preview without purchase
  created_at   timestamptz default now()
);
create index idx_lessons_module_id on public.lessons(module_id);
```

---

### Table: `user_products` (access control)
```sql
create table public.user_products (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  granted_at timestamptz default now(),
  unique(user_id, product_id)
);
create index idx_user_products_user_id    on public.user_products(user_id);
create index idx_user_products_product_id on public.user_products(product_id);
```

---

### Table: `lesson_progress`
```sql
create table public.lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.user_profiles(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  completed    boolean default false,
  completed_at timestamptz,
  unique(user_id, lesson_id)
);
create index idx_lesson_progress_user_id on public.lesson_progress(user_id);
```

---

### Table: `orders`
```sql
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.user_profiles(id) on delete set null,
  product_id          uuid not null references public.products(id) on delete cascade,
  email               text not null,
  name                text,
  amount              numeric(10,2) not null,
  status              text not null default 'pending',  -- 'pending'|'paid'|'failed'|'refunded'
  payment_method      text,   -- 'pix' | 'credit_card' | 'boleto'
  asaas_payment_id    text,
  sequenzy_session_id text,
  sequenzy_payment_id text,
  paid_at             timestamptz,
  recovery_sent_at    timestamptz,
  created_at          timestamptz default now()
);
create index idx_orders_status             on public.orders(status);
create index idx_orders_email              on public.orders(email);
create index idx_orders_user_id            on public.orders(user_id);
create index idx_orders_asaas_payment_id   on public.orders(asaas_payment_id);
create index idx_orders_recovery           on public.orders(recovery_sent_at) where status = 'pending';
```

---

### Table: `community_posts`
```sql
create table public.community_posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.user_profiles(id) on delete cascade,
  category       text not null,   -- 'geral'|'desabafo'|'duvidas'|'conquistas'|'dicas'
  title          text not null,
  body           text not null,
  is_pinned      boolean default false,
  is_visible     boolean default true,
  likes_count    integer default 0,
  comments_count integer default 0,
  created_at     timestamptz default now()
);
create index idx_community_posts_created_at on public.community_posts(created_at);
```

---

### Table: `community_comments`
```sql
create table public.community_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  body       text not null,
  is_visible boolean default true,
  created_at timestamptz default now()
);
create index idx_community_comments_post_id on public.community_comments(post_id);
```

---

### Table: `community_likes`
```sql
create table public.community_likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  post_id    uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  created_at timestamptz default now()
);
-- Triggers update likes_count / comments_count on posts/comments automatically.
```

---

## 4. ROW LEVEL SECURITY (RLS)

> **Rule:** Every table MUST have RLS enabled. Separate policy per operation AND per role.

### Pattern for user-owned data:
```sql
alter table public.lesson_progress enable row level security;

create policy "authenticated_select_own_progress"
  on public.lesson_progress for select to authenticated
  using (user_id = auth.uid());

create policy "authenticated_insert_own_progress"
  on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid());

create policy "authenticated_update_own_progress"
  on public.lesson_progress for update to authenticated
  using (user_id = auth.uid());
```

### Pattern for public read data:
```sql
alter table public.products enable row level security;

create policy "anon_select_active_products"
  on public.products for select to anon
  using (is_active = true);

create policy "authenticated_select_products"
  on public.products for select to authenticated
  using (true);

create policy "authenticated_manage_products"
  on public.products for all to authenticated
  using (exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin'
  ))
  with check (exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin'
  ));
```

### Pattern for admin-only operations:
```sql
-- Admin can do everything; members can only select own data
create policy "admin_manage_orders"
  on public.orders for all to authenticated
  using (exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin'
  ));
```

### RLS for community (anonymous display):
```sql
-- Anyone authenticated can see visible posts
create policy "authenticated_select_visible_posts"
  on public.community_posts for select to authenticated
  using (is_visible = true);

-- Users can only insert their own posts
create policy "authenticated_insert_own_posts"
  on public.community_posts for insert to authenticated
  with check (user_id = auth.uid());

-- Users can update their own posts
create policy "authenticated_update_own_posts"
  on public.community_posts for update to authenticated
  using (user_id = auth.uid());
```

---

## 5. STORAGE BUCKETS

### Video Content Bucket
```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'video-content',
  'video-content',
  true,
  524288000,  -- 500 MB max per file
  array['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo']
) on conflict (id) do update set
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = array['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];

-- Storage RLS
create policy "admin_upload_video"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'video-content'
    and exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
  );

create policy "anon_read_video"
  on storage.objects for select to anon
  using (bucket_id = 'video-content');

create policy "authenticated_read_video"
  on storage.objects for select to authenticated
  using (bucket_id = 'video-content');

create policy "admin_delete_video"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'video-content'
    and exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
  );
```

**Upload path pattern:** `products/{product_id}/{timestamp}-{sanitized_filename}.mp4`

---

## 6. EDGE FUNCTIONS

### Shared CORS (supabase/functions/_shared/cors.ts)
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
```

### checkout-session (creates Asaas payment + order row)
```typescript
// Input: { productId, name, email, paymentMethod, userId? }
// 1. Validate product exists and is_active
// 2. POST to Asaas /payments (PIX/credit/boleto)
// 3. Insert order row with asaas_payment_id + status='pending'
// 4. Return { orderId, paymentMethod, pixKey?, invoiceUrl?, barCode? }
```

### asaas-webhook (confirms payment)
```typescript
// Validates header: asaas-access-token via hash_equals
// On PAYMENT_CONFIRMED:
//   1. Update orders.status = 'paid', orders.paid_at = now()
//   2. Link orders.user_id if email matches a user_profile
//   3. Upsert user_products (grant access)
//   4. Fire Sequenzy 'purchase.completed' event
```

### grant-pending-access (batch reconciliation)
```typescript
// Queries all paid orders where user_id is null
// For each: find user_profile by email, insert user_products
// Useful for guest checkouts who later registered
```

### sequenzy-event (CRM event proxy)
```typescript
// Receives { event, email, firstName, properties }
// POSTs to Sequenzy API with auth header
// Used for: lesson.completed, course.completed, purchase.completed
```

### ads-stats / social-stats / crm-stats / trello-boards
```typescript
// Each function accepts POST with params in body
// Aggregates third-party API data (Meta Ads, Google Ads, Instagram, LinkedIn, Trello)
// Returns structured JSON for admin dashboard cards
// All require admin auth check (user_profiles.role = 'admin')
```

---

## 7. AUTHENTICATION SYSTEM

### Auth Flow: OTP + Password

**Registration steps:**
1. User enters name + email + password + confirm-password → Step 1
2. `sendOtp(email)` → Supabase sends 4-digit OTP to email
3. User enters OTP → Step 2
4. `verifyOtpAndRegister(email, otp)` → confirms session
5. `updateUser({ password, data: { username, full_name } })` → sets credentials
6. `mapSupabaseUser(user)` → `login(authUser)` → `navigate('/dashboard')`

**Login steps:**
1. `signInWithPassword(email, password)`
2. `mapSupabaseUser(user)` → `login(authUser)` → `navigate('/dashboard')`

**Google OAuth:**
- Only if explicitly enabled in Supabase Auth Settings
- `flowType: 'pkce'` required
- `redirectTo: window.location.origin`
- Never set loading state before redirect

### useAuth Hook (src/hooks/useAuth.tsx)

```typescript
interface AuthUser {
  id: string;
  email: string;
  name: string;            // from user_metadata.full_name or email prefix
  role: 'member' | 'admin';
  anonymous_name: string | null;
  products: string[];      // array of product slugs user has access to
}

// Context shape
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtpAndRegister: (email: string, otp: string, password: string, name: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (redirectTo?: string) => Promise<void>;
}
```

**Auth state initialization (double-safety pattern):**
```typescript
useEffect(() => {
  let mounted = true;

  // Safety #1: Check existing session (page refresh)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (mounted && session?.user) {
      const cached = readCache();
      if (cached) {
        login(cached);  // optimistic from localStorage
        setLoading(false);
        fetchProfile(session.user.id, session.user.email!); // background refresh
      } else {
        fetchProfile(session.user.id, session.user.email!);
      }
    } else if (mounted) {
      setLoading(false);
    }
  });

  // Safety #2: Listen to auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (!mounted) return;
    if (event === 'SIGNED_IN' && session?.user && !alreadyHydrated) {
      fetchProfile(session.user.id, session.user.email!);
    } else if (event === 'SIGNED_OUT') {
      clearCache();
      logout();
      setLoading(false);
    }
  });

  return () => { mounted = false; subscription.unsubscribe(); };
}, []);
```

**fetchProfile (parallel queries):**
```typescript
const fetchProfile = async (userId: string, email: string) => {
  const [profileResult, productsResult] = await Promise.all([
    supabase.from('user_profiles').select('role, anonymous_name, full_name').eq('id', userId).single(),
    supabase.from('user_products').select('products(slug)').eq('user_id', userId),
  ]);

  const authUser: AuthUser = {
    id: userId,
    email,
    name: profileResult.data?.full_name || email.split('@')[0],
    role: profileResult.data?.role ?? 'member',
    anonymous_name: profileResult.data?.anonymous_name ?? null,
    products: (productsResult.data ?? []).map(r => r.products?.slug).filter(Boolean),
  };
  login(authUser);
  writeCache(authUser);
  setLoading(false);
};
```

### Auth Cache (localStorage)

```typescript
const CACHE_KEY = 'platform_profile_v1';

export const readCache = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const writeCache = (user: AuthUser): void => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(user)); } catch {}
};

export const clearCache = (): void => {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
};
```

---

## 8. STATE MANAGEMENT & CACHING

| Data Type | Where |
|---|---|
| Auth user, role, products | useAuth context + localStorage cache |
| Page-level data | useState + useEffect (manual Supabase calls) |
| Background updates | Promise.all parallel queries |
| URL-based state | React Router useParams, useSearchParams |
| Form state | useState or react-hook-form |
| Toast notifications | sonner `toast.success / toast.error` |

**Never use:** Redux, Zustand (not needed at this scale), Context for non-auth data.

---

## 9. ROUTING ARCHITECTURE

```typescript
// src/App.tsx
<BrowserRouter>
  <LandingNav />       {/* outside Routes, shared public nav */}
  <Routes>
    {/* Public */}
    <Route path="/"                    element={<LandingPage />} />
    <Route path="/login"               element={<LoginPage />} />
    <Route path="/register"            element={<RegisterPage />} />
    <Route path="/forgot-password"     element={<ForgotPasswordPage />} />
    <Route path="/reset-password"      element={<ResetPasswordPage />} />
    <Route path="/checkout/:slug"      element={<CheckoutPage />} />
    <Route path="/obrigado"            element={<ThankYouPage />} />
    <Route path="/privacidade"         element={<PrivacyPolicyPage />} />
    <Route path="/termos"              element={<TermsOfUsePage />} />

    {/* Protected (redirect to /login if !user) */}
    <Route path="/dashboard"                           element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    <Route path="/products"                            element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
    <Route path="/products/:slug"                      element={<ProtectedRoute><CourseViewPage /></ProtectedRoute>} />
    <Route path="/products/:slug/lesson/:lessonId"     element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />
    <Route path="/products/:slug/certificado"          element={<ProtectedRoute><CertificatePage /></ProtectedRoute>} />
    <Route path="/community"                           element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
    <Route path="/community/topic/:id"                 element={<ProtectedRoute><TopicPage /></ProtectedRoute>} />
    <Route path="/profile"                             element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

    {/* Admin (redirect to /dashboard if role !== 'admin') */}
    <Route path="/admin"                               element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
    <Route path="/admin/users"                         element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
    <Route path="/admin/products"                      element={<AdminRoute><AdminProductsPage /></AdminRoute>} />
    <Route path="/admin/products/:id/content"          element={<AdminRoute><AdminProductContentPage /></AdminRoute>} />
    <Route path="/admin/orders"                        element={<AdminRoute><AdminOrdersPage /></AdminRoute>} />
    <Route path="/admin/community"                     element={<AdminRoute><AdminCommunityPage /></AdminRoute>} />
    <Route path="/admin/crm"                           element={<AdminRoute><AdminCRMPage /></AdminRoute>} />
    <Route path="/admin/social"                        element={<AdminRoute><AdminSocialPage /></AdminRoute>} />
    <Route path="/admin/traffic"                       element={<AdminRoute><AdminTrafficPage /></AdminRoute>} />
    <Route path="/admin/media"                         element={<AdminRoute><AdminMediaPage /></AdminRoute>} />

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
</BrowserRouter>
```

**ProtectedRoute:** If `loading` → render spinner; if `!user` → `navigate('/login?next=' + pathname)`.
**AdminRoute:** Same as ProtectedRoute but also checks `user.role === 'admin'`.

---

## 10. PAGES — PUBLIC

### LandingPage

**Import:** Static (not lazy) — eliminates chunk delay on first load.
**Sections:**
1. Hero — headline + sub-headline + primary CTA + secondary CTA
2. Social proof ticker — animated horizontal scroll of stats
3. Product showcase — course cards with features list
4. Instructor section — photo + bio + credentials
5. Testimonials carousel
6. Community preview
7. FAQ accordion
8. Final CTA
9. Footer

**Prefetch on hover:** `onMouseEnter` on CTA buttons triggers `import('./LoginPage')` and `import('./CheckoutPage')` fire-and-forget to pre-cache chunks.

**Landing copy:** Extract ALL strings to `src/constants/landingContent.ts` — headline, subheadline, features, testimonials, FAQs. Never hardcode in JSX.

### CheckoutPage

**Works for:** anonymous users (guest) AND logged-in users.
**URL:** `/checkout/:slug` — reads product by slug.
**Flow:**
1. Load product by slug → show price, title, description
2. If user logged in → auto-fill name/email (disabled inputs)
3. Select payment method: PIX (default) / Credit Card / Boleto
4. Submit → call edge function `checkout-session`
5. On success:
   - PIX → show PIX key + copy button + QR code
   - Credit Card → `navigate('/obrigado', { state: { invoiceUrl, slug, method: 'credit' } })`
   - Boleto → show barcode + link

**Price display:** Always use `Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })`.

---

## 11. PAGES — MEMBER AREA

### DashboardPage

**Data fetched:**
1. `user_products` + nested `products(modules(lessons))` → calculate progress per course
2. `lesson_progress` (all completed lessons in one query)
3. `community_posts` (recent 4, visible, with user_profiles)

**Sections:**
1. Greeting hero (time-based: Bom dia/Boa tarde/Boa noite + first name)
2. Anonymous badge (community pseudonym)
3. Overall progress bar + stats (completed/total lessons, course count)
4. Flow tip card (step 01 — next action)
5. Featured course card (first product) with thumbnail + progress + play button
6. Additional courses (compact row cards for products.slice(1))
7. Empty state upsell (if no products: headline + CTA to checkout)
8. Community pulse (recent 4 posts with category dot, anonymous_name, timeAgo, likes, comments)

**Skeleton screens:** Two components — `DashboardCourseSkeleton` (for course section) + `CommunitySkeletonList` (4 skeleton post rows with shimmer animation).

### ProductsPage

**Data fetched:**
1. `products` (all active, with nested modules → lessons)
2. `user_products` (owned product IDs)
3. `lesson_progress` (all completed for this user, batch with `.in()`)

**Calculations per product:**
```typescript
const lessonIds = mods.flatMap(m => m.lessons.map(l => l.id));
const totalLessons = lessonIds.length;
const completedLessons = lessonIds.filter(id => completedSet.has(id)).length;
const progress_pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
const has_access = ownedIds.has(product.id);
```

**Card states:**
- Has access + 0% → "Começar" CTA → `/products/:slug`
- Has access + 1-99% → "Continuar" CTA → `/products/:slug`
- Has access + 100% → "Concluído" badge + "Continuar" CTA
- No access → Price in BRL + "Adquirir" CTA → `/checkout/:slug` + Lock overlay

### CourseViewPage

**URL:** `/products/:slug`
**Access check:** `user?.products?.includes(slug)` — if false → show paywall UI (not redirect).

**Data fetched:**
```typescript
supabase.from('products')
  .select(`id, slug, title, subtitle, description, thumbnail_url,
    modules(id, title, sort_order,
      lessons(id, title, type, duration_min, is_free, sort_order)
    )`)
  .eq('slug', slug).single()
```
+ `lesson_progress` for user's completed lesson IDs.

**Module accordion:** First module open by default. State: `Record<moduleId, boolean>`.

**Progress calculation:**
```typescript
const allLessons = modules.flatMap(m => m.lessons);
const totalLessons = allLessons.length;
const completedCount = allLessons.filter(l => completed.has(l.id)).length;
const progress = Math.round((completedCount / totalLessons) * 100);
```

**CTA logic:**
- 0% → "Começar" → first lesson
- 1-99% → "Continuar" → `allLessons.find(l => !completed.has(l.id))` (first uncompleted)
- 100% → "Ver certificado" + banner "Parabéns!"

**Paywall state (no access):** Shows product title + "Liberar acesso agora" CTA + free preview lessons (those with `is_free: true`).

### LessonPage

**URL:** `/products/:slug/lesson/:lessonId`
**Three Supabase queries (parallel where possible):**
1. Product + modules + lessons (for sidebar navigation)
2. User's `lesson_progress` (all completed)
3. Specific `lessons` row (for content: `content` field)

**Layout:**
- Desktop: Fixed 256px sidebar + scrollable content
- Mobile: Full-width content + sticky top bar (shows "Módulos" button) + sticky bottom action bar + slide-up drawer for module list

**Lesson type rendering:**
| Type | Render |
|---|---|
| `video` | `<iframe>` with `safeEmbedUrl(content)` — YouTube/Vimeo only; invalid URL → fallback message |
| `text` | `<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}>` |
| `pdf` | Card with "Abrir PDF" link using `safeExternalUrl(content)` |
| `audio` | `<audio controls src={safeExternalUrl(content)}>` |

**markComplete function:**
```typescript
const markComplete = async () => {
  const id = lesson.id;
  setCompleted(prev => new Set(prev).add(id));  // optimistic update

  const { error } = await supabase.from('lesson_progress').upsert(
    { user_id: user.id, lesson_id: id, completed: true, completed_at: new Date().toISOString() },
    { onConflict: 'user_id,lesson_id' }
  );

  if (error) {
    setCompleted(prev => { const s = new Set(prev); s.delete(id); return s; });  // revert
    toast.error('Não foi possível salvar o progresso.');
    return;
  }

  toast.success('Aula concluída. ✦');
  fireEventAsync('lesson.completed', { email, properties: { lesson_id, course_progress, ... } });

  if (newProgress === 100) {
    fireEventAsync('course.completed', { ... });
    setTimeout(() => setShowCertModal(true), 700);  // show certificate modal
    return;
  }

  // Auto-advance to next lesson
  if (nextLesson?.id) setTimeout(() => navigate(`/products/${slug}/lesson/${nextLesson.id}`), 800);
};
```

**Content safety utilities (src/lib/contentSafety.ts):**
```typescript
// Allow only YouTube and Vimeo embeds
export const safeEmbedUrl = (url: unknown): string | null => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('https://www.youtube.com/embed/')) return url;
  if (url.startsWith('https://player.vimeo.com/')) return url;
  // For Storage videos (mp4), return as-is for <video> tag handling
  if (url.includes('video-content') && url.includes('.mp4')) return url;
  return null;
};

// Allow any HTTPS URL for external links (PDF, audio)
export const safeExternalUrl = (url: unknown): string | null => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('https://')) return url;
  return null;
};

// Strip dangerous HTML tags (allow basic formatting)
export const sanitizeHtml = (html: unknown): string => {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/javascript:/gi, '');
};
```

---

## 12. PAGES — ADMIN PANEL

### AdminLayout

- Sidebar with nav links to all admin sections
- Responsive: collapses to top bar on mobile
- Auth check: redirects non-admin users

### AdminDashboardPage

Metrics displayed:
- Total users / new this month
- Total revenue / this month
- Active courses / enrollments
- Community activity (posts/comments)
- Recent orders table (last 10)
- Revenue chart (recharts BarChart)

### AdminProductsPage (course CRUD)

- Table: id, title, slug, price, original_price, is_active, sort_order
- Create: form modal with all fields + thumbnail upload
- Edit: same form pre-filled
- Delete: confirm dialog
- Link to `/admin/products/:id/content` for module/lesson editor

### AdminProductContentPage (content editor)

**Data:** Product info + all modules + all lessons per module.

**Module accordion:**
- `GripVertical` handle (visual, not functional drag yet)
- Toggle open/close
- Lesson count badge
- Delete module button (with `window.confirm`)

**Lesson row (default):**
- `GripVertical` + type badge + title + duration + is_free badge
- Pencil button → opens inline edit form (disabled if another lesson is editing)
- Trash button → `window.confirm` → delete

**Inline lesson edit form:**
- Type selector (`<select>`) + title input
- Content field: URL input for pdf/audio; URL + video upload zone for video; no field for text (edit content separately)
- Duration (number input) + is_free checkbox
- "Salvar alterações" → `supabase.from('lessons').update(payload).eq('id', lessonId)`
- "Cancelar edição" → closes form
- Only ONE lesson can be in edit mode at a time (other pencil buttons disabled)

**Add module form:**
- Text input + "Criar módulo" button + X cancel
- `supabase.from('modules').insert({ product_id, title, sort_order: modules.length + 1 }).select().single()`

**Add lesson form:**
- Type select + title + content URL + video upload zone + duration + is_free
- `supabase.from('lessons').insert({ module_id, title, type, content, duration_min, is_free, sort_order }).select().single()`

**Video upload (for lesson form):**
- File input + drag-drop label zone
- Progress bar (0-100%)
- After upload: show public URL in content field
- Upload path: `products/{productId}/{timestamp}-{sanitized_name}`

**Certificate configuration panel:**
- Collapsible (closed by default)
- Fields: courseName, courseTagline, instructorName, instructorTitle, institutionLabel, issueDate, certDescription, footerNote
- Canvas preview (1200×848) — real-time rendering
- "Salvar configuração" → `supabase.from('products').update({ certificate_config: certConfig }).eq('id', productId)`
- "Visualizar certificado" toggle
- "Baixar PNG" → canvas.toDataURL + anchor click

### AdminOrdersPage

- Table: order id, email, name, product, amount (BRL), method (PIX/Crédito/Boleto), status, created_at
- Status badges: pending (yellow) / paid (green) / failed (red) / refunded (gray)
- Filter by status and date range
- Export CSV

### AdminUsersPage

- Table: email, name, role, joined date, courses count
- Change role (member ↔ admin)
- Grant/revoke course access (insert/delete user_products)
- View user's orders

### AdminCommunityPage

- Table: all posts (visible + hidden)
- Toggle is_visible (soft delete)
- Toggle is_pinned
- View comments thread inline

### Admin Marketing Pages

Each uses edge function data via `supabase.functions.invoke(functionName, { body: {} })`:

| Page | Edge Function | Data Shown |
|---|---|---|
| AdminCRMPage | `crm-stats` | Leads, conversions, email stats (tabs) |
| AdminSocialPage | `social-stats` | Instagram + LinkedIn metrics |
| AdminTrafficPage | `ads-stats` | Meta Ads + Google Ads spend/clicks/conversions |
| AdminMediaPage | `trello-boards` | Trello boards + cards list |

---

## 13. COMPONENT LIBRARY PATTERNS

### Skeleton Shimmer

```typescript
// Generic skeleton placeholder
function Sk({ w = '100%', h = '14px', r = '8px', style }: {
  w?: string; h?: string; r?: string; style?: React.CSSProperties;
}) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}
// CSS: .skeleton { background: linear-gradient(90deg, ...); animation: shimmer 1.5s infinite; }
```

Use skeletons instead of spinners for page-level data loading. Match skeleton shape exactly to real content.

### Toast Notifications

```typescript
import { toast } from 'sonner';
toast.success('Operação realizada. ✦');
toast.error('Erro ao processar. Tente novamente.');
```

Never use `alert()`. Always use sonner toasts. Never fail silently.

### Progress Bar

```html
<div class="progress-bar">
  <div class="progress-bar-fill" style={{ width: `${pct}%` }} />
</div>
```

### Badge Variants

```
.badge-rose    → warm/emotional content
.badge-sage    → success/completed
.badge-gold    → featured/pinned
.overline      → section label (uppercase tracking)
.font-label    → Montserrat uppercase micro label
.font-display  → heading font (serif/elegant)
```

### Card Variants

```
.card-dark      → default surface card
.flow-card      → highlighted tip/info card
.step-chip      → numbered step indicator (e.g. "01")
.reading-note   → small descriptive text inside cards
```

---

## 14. DATA FETCHING PATTERNS

### Pattern: Single query with nested data
```typescript
// Fetch product + modules + lessons in ONE round trip
const { data } = await supabase
  .from('products')
  .select(`id, slug, title,
    modules(id, title, sort_order,
      lessons(id, title, type, duration_min, is_free, sort_order)
    )`)
  .eq('slug', slug)
  .single();
```

### Pattern: Parallel queries (Promise.all)
```typescript
const [profileResult, productsResult] = await Promise.all([
  supabase.from('user_profiles').select('role, anonymous_name').eq('id', userId).single(),
  supabase.from('user_products').select('products(slug)').eq('user_id', userId),
]);
```

### Pattern: Batch lesson_progress query
```typescript
// Collect ALL lesson IDs from all products, then single query
const allLessonIds = products.flatMap(p => p.modules.flatMap(m => m.lessons.map(l => l.id)));
const { data: progress } = await supabase
  .from('lesson_progress')
  .select('lesson_id')
  .eq('user_id', user.id)
  .eq('completed', true)
  .in('lesson_id', allLessonIds);
const completedSet = new Set(progress.map(r => r.lesson_id));
```

### Pattern: Edge function with error handling
```typescript
const { data, error } = await supabase.functions.invoke('checkout-session', { body: payload });
if (error) {
  let errorMessage = error.message;
  if (error instanceof FunctionsHttpError) {
    try {
      const textContent = await error.context?.text();
      errorMessage = textContent || error.message;
    } catch {}
  }
  toast.error(errorMessage);
  return;
}
```

---

## 15. PAYMENT INTEGRATION (Asaas + Sequenzy)

### Asaas (Brazilian payment gateway)

**Supported methods:** PIX, credit card (up to 12x), boleto bancário.
**Sandbox vs Production:** Controlled by `ASAAS_API_KEY` env var (sandbox key starts with `$aact_`).

**checkout-session edge function input:**
```typescript
{
  productId: string;
  name: string;
  email: string;
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  userId?: string;         // if logged in
  installments?: number;   // for credit card
}
```

**Output per method:**
- PIX → `{ orderId, paymentMethod: 'pix', pixKey: '...' }`
- Credit → `{ orderId, paymentMethod: 'credit', invoiceUrl: '...' }`
- Boleto → `{ orderId, paymentMethod: 'boleto', barCode: '...' }`

**Webhook security:** Compare `req.headers.get('asaas-access-token')` with `ASAAS_WEBHOOK_TOKEN` using `timingSafeEqual` (or `hash_equals` equivalent).

### Sequenzy (CRM event bus)

**Events fired:**
| Event | When |
|---|---|
| `lesson.completed` | After `lesson_progress.upsert` succeeds |
| `course.completed` | When `newProgress === 100` |
| `purchase.completed` | After `asaas-webhook` confirms payment |
| `checkout.started` | When `checkout-session` edge function is called |

**Helper (src/lib/sequenzy.ts):**
```typescript
export const fireEventAsync = async (
  event: string,
  payload: { email: string; firstName?: string; properties?: Record<string, unknown> }
): Promise<void> => {
  supabase.functions.invoke('sequenzy-event', { body: { event, ...payload } })
    .catch(err => console.warn('[Sequenzy] event failed:', event, err));
};
```

Always fire as fire-and-forget. Never block UI on CRM events.

---

## 16. VIDEO UPLOAD SYSTEM

### Constants
```typescript
const VIDEO_BUCKET = 'video-content';
const MAX_VIDEO_MB = 500;
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
```

### Upload function
```typescript
const uploadVideo = async (
  file: File,
  productId: string,
  onProgress?: (pct: number) => void
): Promise<string | null> => {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) { toast.error('Tipo não suportado.'); return null; }
  if (file.size > MAX_VIDEO_BYTES) { toast.error('Arquivo muito grande.'); return null; }

  const ext = file.name.split('.').pop() ?? 'mp4';
  const ts = Date.now();
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `products/${productId}/${ts}-${sanitized}`;

  onProgress?.(5);

  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

  if (error) { toast.error(`Erro no upload: ${error.message}`); return null; }

  onProgress?.(100);

  const { data: { publicUrl } } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(data.path);
  return publicUrl;
};
```

### UI Pattern (Upload Zone)
```
┌─────────────────────────────────────────┐
│  [Upload icon]  Upload de vídeo         │
│  MP4, WebM, OGG · máx. 500MB           │
│  <input type="file" hidden>             │
└─────────────────────────────────────────┘

While uploading:
┌─────────────────────────────────────────┐
│  [Spinner]  Enviando vídeo…        45%  │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░   │
└─────────────────────────────────────────┘

After upload (success):
┌─────────────────────────────────────────┐
│  [Video icon]  Upload concluído ✓       │
│  https://storage.example.com/...        │
│                                   [×]   │
└─────────────────────────────────────────┘
```

The uploaded URL is stored in `lessons.content`. In LessonPage, detect Storage URLs vs embed URLs to choose `<video>` vs `<iframe>`.

---

## 17. CERTIFICATE GENERATION (Canvas)

### CertConfig interface
```typescript
interface CertConfig {
  courseName?: string;         // e.g. "Course Name"
  courseTagline?: string;      // e.g. "Subtitle — Optional"
  instructorName?: string;     // e.g. "Jane Smith"
  instructorTitle?: string;    // e.g. "Founder & Lead Instructor"
  institutionLabel?: string;   // e.g. "Platform Name"
  issueDate?: string;          // ISO date string (if null → today)
  certDescription?: string;    // custom completion text (if null → auto-generated)
  footerNote?: string;         // bottom disclaimer text
}
```

### Canvas dimensions and structure
- **Admin preview:** 1200×848 px
- **Modal preview (LessonPage):** 900×636 px (smaller for modal fit)
- Export as PNG via `canvas.toDataURL('image/png')`

### Drawing order
1. Background fill (cream/off-white)
2. Texture lines (subtle horizontal stripes)
3. Outer border rectangle (gold)
4. Inner border rectangle (gold, lighter opacity)
5. Corner ornaments (L-shapes + rotated squares at each corner)
6. Top gradient bar (gold, fades at edges)
7. Institution name (uppercase, Montserrat)
8. Diamond dividers
9. "Certificado" + "de Conclusão" heading
10. "Certificamos que" sub-label
11. Student name (italic serif, large) + underline gradient
12. Description text (word-wrapped)
13. Date
14. Horizontal divider + center diamond
15. Signature block (instructor name + signature line + title)
16. Footer note
17. Bottom gradient bar

### Student name source
```typescript
// In LessonPage modal — uses real authenticated user name
const studentName = user?.name || user?.email?.split('@')[0] || 'Aluna';
```

### Trigger: show modal after 100% completion
```typescript
// In markComplete() function:
if (newProgress === 100 && totalCount > 0) {
  fireEventAsync('course.completed', { ... });
  setTimeout(() => setShowCertModal(true), 700);
  return; // don't auto-advance
}
```

### CertificatePage (full page)
- Same canvas rendering logic
- Loads product + certConfig from Supabase
- Download button + share options
- Protected route (requires product access)

---

## 18. COMMUNITY FORUM SYSTEM

### Categories
```typescript
const CATEGORIES = ['geral', 'desabafo', 'duvidas', 'conquistas', 'dicas'];
```

### Key design decisions:
1. **Anonymous display:** Users have `anonymous_name` in their profile. All community content shows `anonymous_name`, never real name/email.
2. **Soft delete:** Posts/comments have `is_visible` boolean. Admins toggle it, never hard delete.
3. **Pinning:** `is_pinned` boolean on posts — shown with Flame icon, sorted to top.
4. **Counter triggers:** DB triggers on `community_likes` and `community_comments` auto-update `likes_count` / `comments_count` on parent rows.

### CommunityPage layout:
- Category filter tabs (horizontal scroll)
- "New post" button → modal with title + category + body
- Post list sorted by `created_at` DESC
- Each post: category dot (color-coded) + anonymous_name + timeAgo + title (2-line clamp) + likes + comments count

### TopicPage layout:
- Post header: title + category badge + anonymous_name + timeAgo
- Post body (full text)
- Like button (toggle)
- Comments list (chronological)
- "Add comment" form at bottom

### Likes (toggle pattern):
```typescript
const toggleLike = async (postId: string) => {
  const alreadyLiked = userLikes.has(postId);
  if (alreadyLiked) {
    await supabase.from('community_likes').delete()
      .eq('user_id', user.id).eq('post_id', postId);
    setUserLikes(prev => { const s = new Set(prev); s.delete(postId); return s; });
  } else {
    await supabase.from('community_likes').insert({ user_id: user.id, post_id: postId });
    setUserLikes(prev => new Set(prev).add(postId));
  }
};
```

---

## 19. ADMIN PANEL — FULL FEATURE MAP

```
/admin                → Dashboard: revenue, users, enrollments, activity
/admin/users          → Table + role toggle + access grant/revoke
/admin/products       → Course CRUD table
/admin/products/:id/content → Module accordion + lesson editor + cert config
/admin/orders         → Orders table with filters + status badges
/admin/community      → Moderation: toggle visible/pinned
/admin/crm            → CRM tabs: leads / conversions / email metrics
/admin/social         → Instagram + LinkedIn metrics cards
/admin/traffic        → Meta Ads + Google Ads stats + charts
/admin/media          → Trello boards + project media organizer
```

**AdminLayout sidebar items:**
- Painel (dashboard icon)
- Usuários
- Produtos
- Pedidos
- Comunidade
- CRM
- Redes Sociais
- Tráfego
- Mídia

---

## 20. PERFORMANCE OPTIMIZATIONS

### 1. Static import for LandingPage
```typescript
// In App.tsx — NOT lazy
import LandingPage from '@/pages/LandingPage';
// All other pages → React.lazy(() => import(...))
```

### 2. Prefetch on hover (CTAs)
```typescript
const prefetchLogin = () => import('@/pages/LoginPage');
const prefetchCheckout = () => import('@/pages/CheckoutPage');

<button onMouseEnter={prefetchLogin}>Entrar</button>
<button onMouseEnter={prefetchCheckout}>Começar</button>
```

### 3. Parallel data fetching (Promise.all)
```typescript
// Always run independent queries in parallel
const [profileResult, productsResult] = await Promise.all([query1, query2]);
```

### 4. Single batch query for lesson progress
```typescript
// One .in() query for all lessons instead of N queries per product
await supabase.from('lesson_progress').select('lesson_id')
  .eq('user_id', user.id).eq('completed', true).in('lesson_id', allLessonIds);
```

### 5. Optimistic UI updates
```typescript
// Mark as complete: update state immediately, revert on error
setCompleted(prev => new Set(prev).add(id));
const { error } = await supabase.from('lesson_progress').upsert(...);
if (error) setCompleted(prev => { const s = new Set(prev); s.delete(id); return s; });
```

### 6. localStorage profile cache
- Write after every fetchProfile
- Read on page load → immediate render without spinner
- Refresh in background
- Clear on logout

### 7. Skeleton screens (not spinners) for main content areas

---

## 21. TESTING STRATEGY

### Stack
```
Vitest + @testing-library/react + @testing-library/user-event + jsdom
```

### vitest.config.ts
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      include: ['src/lib/**', 'src/hooks/**', 'src/pages/**'],
      exclude: ['src/lib/supabase.ts', 'src/test/**', 'src/pages/admin/**', 'src/pages/LandingPage.tsx'],
      thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

### Setup file (src/test/setup.ts)
```typescript
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);

// Stub browser APIs not in jsdom
vi.stubGlobal('HTMLCanvasElement', class {
  getContext = () => null;
  toDataURL = () => 'data:image/png;base64,mock';
  width = 1200;
  height = 848;
});

Object.defineProperty(window, 'localStorage', { value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() } });
```

### Supabase mock pattern (src/test/mocks/supabase.ts)
```typescript
export const mockFrom = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args) => mockFrom(...args) }
}));

// Per-test setup:
mockFrom.mockImplementation((table: string) => {
  if (table === 'products') {
    const single = vi.fn().mockResolvedValue({ data: MOCK_PRODUCT, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    return { select };
  }
  // ...
});
```

### Integration test pattern
```typescript
describe('PageName — section', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: MOCK_USER, loading: false });
    setupSupabaseMocks();
    if (!Page) Page = (await import('@/pages/PageName')).default;
  });

  it('renders expected content', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Expected Content')).toBeInTheDocument();
    });
  });
});
```

### Test coverage map
| File | Tests | Key scenarios |
|---|---|---|
| `LoginPage.test.tsx` | 17 | Form validation, success, error, Google OAuth, ?next= redirect |
| `RegisterPage.test.tsx` | 22 | Step 1→2, OTP auto-submit, success, error, resend cooldown |
| `CheckoutPage.test.tsx` | 35 | Loading, PIX/Card/Boleto, validation, edge function payload, BRL format |
| `DashboardPage.test.tsx` | 39 | Greeting, skeleton, courses, community, empty state, upsell |
| `LessonPage.test.tsx` | 40+ | Video/text/pdf/audio, markComplete, modal, confetti, nav |
| `CourseViewPage.test.tsx` | 72 | Loading, no-access, progress %, accordion, lesson links, stats |
| `ProductsPage.test.tsx` | 62 | Skeleton, empty, with/without access, progress, BRL price |
| `AdminProductContentPage.test.tsx` | 90+ | Accordion, inline edit, add/delete module/lesson, cert panel |

---

## 22. SECURITY CHECKLIST

- [x] All SQL via Supabase client (parameterized, never string interpolation)
- [x] RLS enabled on ALL tables
- [x] Separate RLS policy per operation AND per role
- [x] `user_profiles` foreign key → `auth.users` (never raw UUID)
- [x] `user_products` foreign key → `user_profiles` (not auth.users directly)
- [x] XSS: `sanitizeHtml()` on all HTML content rendered in DOM
- [x] Embed URLs: `safeEmbedUrl()` whitelist (YouTube + Vimeo only)
- [x] External URLs: `safeExternalUrl()` — HTTPS only
- [x] Webhook auth: `hash_equals(stored_token, received_token)` — timing-safe
- [x] Video uploads: MIME type check + file size limit
- [x] Storage RLS: only admin can upload, everyone can read (public bucket)
- [x] CORS: all edge functions handle OPTIONS preflight with corsHeaders
- [x] `SECURITY.md` in repo root documenting responsible disclosure
- [x] `robots.txt` with `Disallow: /dashboard`, `/admin`, `/products`
- [x] `sitemap.xml` with only public pages
- [x] No API keys in client code (all in edge function secrets)
- [x] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — only anon key in client

---

## 23. CSS DESIGN SYSTEM

### Root CSS Variables Pattern
```css
:root {
  /* Brand colors */
  --gold:          hsl(40 46% 60%);    /* primary accent */
  --sage:          hsl(145 17% 60%);   /* success/completed */
  --rose:          hsl(345 28% 58%);   /* emotional/warning */
  --lavender:      hsl(256 30% 72%);   /* community/secondary */

  /* Backgrounds */
  --bg-base:       hsl(226 42% 7%);    /* page background */
  --bg-surface-1:  hsl(226 35% 9%);    /* elevated surface */
  --bg-surface-2:  hsl(226 28% 11%);   /* sidebar/panel */
  --sidebar-bg:    hsl(226 42% 8%);

  /* Text */
  --text-primary:   hsl(40 30% 94%);
  --text-secondary: hsl(40 15% 74%);
  --text-muted:     hsl(40 8% 56%);
  --text-faint:     hsl(40 5% 40%);

  /* Borders */
  --border-subtle:  rgba(255,255,255,0.05);
  --border-soft:    rgba(255,255,255,0.08);
  --border-mid:     rgba(255,255,255,0.12);

  /* Typography */
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-body:    'DM Sans', system-ui, sans-serif;
  --font-label:   'Montserrat', sans-serif;
}
```

### Key Utility Classes
```css
/* Cards */
.card-dark       { background: var(--bg-surface-1); border: 1px solid var(--border-subtle); border-radius: 20px; }
.flow-card       { background: rgba(198,168,112,0.05); border: 1px solid rgba(198,168,112,0.15); border-radius: 16px; }

/* Typography */
.font-display    { font-family: var(--font-display); }
.font-label      { font-family: var(--font-label); }
.overline        { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; font-family: var(--font-label); }
.reading-note    { font-size: 13px; color: var(--text-secondary); line-height: 1.75; }

/* Buttons */
.btn-gold        { background: var(--gold); color: #0b0d1c; border: none; border-radius: 14px; padding: 12px 24px; font-family: var(--font-label); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-weight: 600; }
.btn-ghost       { background: transparent; color: var(--text-muted); border: 1px solid var(--border-soft); /* same shape as btn-gold */ }
.btn-outline-gold { background: transparent; color: var(--gold); border: 1px solid rgba(198,168,112,0.4); }

/* Badges */
.badge-rose      { background: rgba(172,128,142,0.12); color: var(--rose); border: 1px solid rgba(172,128,142,0.2); border-radius: 100px; padding: 3px 10px; font-size: 9px; }
.badge-sage      { background: rgba(140,170,150,0.12); color: var(--sage); border: 1px solid rgba(140,170,150,0.2); /* ... */ }

/* Progress bar */
.progress-bar      { height: 4px; background: var(--border-subtle); border-radius: 100px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--gold), hsl(50 60% 70%)); border-radius: 100px; transition: width 0.6s cubic-bezier(.16,1,.3,1); }

/* Input */
.input-dark { background: var(--bg-surface-2); border: 1px solid var(--border-soft); border-radius: 12px; color: var(--text-primary); padding: 12px 16px; font-family: var(--font-body); width: 100%; outline: none; }
.input-dark:focus { border-color: rgba(198,168,112,0.4); }

/* Skeleton */
.skeleton { background: linear-gradient(90deg, var(--border-subtle) 25%, var(--border-soft) 50%, var(--border-subtle) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Misc */
.step-chip { background: rgba(198,168,112,0.10); color: var(--gold); border: 1px solid rgba(198,168,112,0.22); border-radius: 6px; padding: 3px 8px; font-family: var(--font-label); font-size: 10px; font-weight: 600; }
```

---

## 24. DATABASE FUNCTIONS & TRIGGERS

### handle_new_user() — auto-create profile on signup
```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  anon_names text[] := array['...list of anonymous names...'];
  random_anon text;
begin
  random_anon := anon_names[floor(random() * array_length(anon_names, 1) + 1)];

  insert into public.user_profiles (id, email, username, full_name, anonymous_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    random_anon,
    'member'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### on_user_profile_created — grant paid orders to new Google OAuth users
```sql
create or replace function public.grant_paid_orders_on_signup()
returns trigger language plpgsql security definer as $$
begin
  -- Find any paid orders for this email and grant product access
  insert into public.user_products (user_id, product_id)
  select new.id, o.product_id
  from public.orders o
  where o.email = new.email
    and o.status = 'paid'
    and not exists (
      select 1 from public.user_products up
      where up.user_id = new.id and up.product_id = o.product_id
    )
  on conflict (user_id, product_id) do nothing;

  -- Also link the user_id on those orders
  update public.orders
  set user_id = new.id
  where email = new.email and status = 'paid' and user_id is null;

  return new;
end;
$$;

create trigger on_user_profile_created
  after insert on public.user_profiles
  for each row execute function public.grant_paid_orders_on_signup();
```

### handle_community_like_change() — update likes_count
```sql
create or replace function public.handle_community_like_change()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    if new.post_id is not null then
      update community_posts set likes_count = likes_count + 1 where id = new.post_id;
    end if;
    if new.comment_id is not null then
      update community_comments set likes_count = likes_count + 1 where id = new.comment_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.post_id is not null then
      update community_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger on_community_like_insert after insert on public.community_likes for each row execute function public.handle_community_like_change();
create trigger on_community_like_delete after delete on public.community_likes for each row execute function public.handle_community_like_change();
```

### handle_community_comment_change() — update comments_count
```sql
-- Same pattern as likes trigger but updates community_posts.comments_count
```

---

## 25. DEPLOYMENT CHECKLIST

### Environment Variables (Supabase Secrets)
```
ASAAS_API_KEY          → Asaas API key (sandbox: $aact_... / prod: $aact_prod_...)
ASAAS_WEBHOOK_TOKEN    → Pre-shared token for webhook validation
SEQUENZY_API_KEY       → Sequenzy CRM API key
META_ADS_TOKEN         → Meta Ads API token (for traffic page)
GOOGLE_ADS_TOKEN       → Google Ads API token
INSTAGRAM_TOKEN        → Instagram Graph API token
LINKEDIN_TOKEN         → LinkedIn API token
TRELLO_KEY             → Trello API key
TRELLO_TOKEN           → Trello API token
SUPABASE_URL           → (auto-configured)
SUPABASE_ANON_KEY      → (auto-configured)
SUPABASE_SERVICE_ROLE_KEY → (auto-configured)
```

### Pre-launch checklist
- [ ] RLS enabled on all tables — verified via `select tablename, rowsecurity from pg_tables where schemaname = 'public'`
- [ ] `on_auth_user_created` trigger verified (create test user → check user_profiles)
- [ ] `on_user_profile_created` trigger verified (paid order + new signup → check user_products)
- [ ] Asaas webhook URL registered in Asaas dashboard
- [ ] Sequenzy webhook URL registered
- [ ] Default admin user created (email + set role='admin' in user_profiles)
- [ ] Video bucket public URL accessible
- [ ] `robots.txt` blocks `/dashboard`, `/admin`, `/products`
- [ ] `sitemap.xml` includes only public pages
- [ ] All edge functions deployed and tested with curl
- [ ] `SECURITY.md` in place
- [ ] Performance: LCP < 2.5s on mobile (test with Lighthouse)
- [ ] `?next=` open-redirect guard: only allow relative paths (no `//evil.com`)

### Default admin setup
```sql
-- After first admin user registers via the UI, run:
update public.user_profiles
set role = 'admin'
where email = 'admin@yourdomain.com';
```

### Content seeding order
1. Create products (title, slug, price, thumbnail)
2. Create modules per product (title, sort_order)
3. Create lessons per module (title, type, content, duration_min, sort_order, is_free)
4. Configure certificate_config per product
5. Test full checkout → payment confirmed → user_products granted flow

---

## QUICK REFERENCE: Key Patterns

### Progress percentage calculation
```typescript
const pct = total > 0 ? Math.round((done / total) * 100) : 0;
```

### Anonymous name display (community)
```typescript
post.user_profiles?.anonymous_name ?? 'Anônima'
```

### Time ago helper (src/lib/dateUtils.ts)
```typescript
export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

export const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

export const formatBRL = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const progressPct = (done: number, total: number): number =>
  total > 0 ? Math.round((done / total) * 100) : 0;
```

### Lesson type constants
```typescript
const LESSON_TYPES = ['video', 'text', 'pdf', 'audio'] as const;
type LessonType = typeof LESSON_TYPES[number];
```

### Community categories
```typescript
const COMMUNITY_CATEGORIES = ['geral', 'desabafo', 'duvidas', 'conquistas', 'dicas'] as const;
```

### Admin check in edge function
```typescript
const { data: profile } = await supabaseAdmin
  .from('user_profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'admin') {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

---

*This blueprint covers 100% of the platform's architecture. Use it as the single source of truth when recreating or extending this type of course platform on Supabase.*
