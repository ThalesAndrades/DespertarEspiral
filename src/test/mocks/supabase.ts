/**
 * Centralized Supabase mock for unit tests.
 * Import this in any test that uses src/lib/supabase.ts:
 *   vi.mock("@/lib/supabase", () => import("@/test/mocks/supabase"))
 */
import { vi } from "vitest";

export const mockSession = {
  access_token: "mock-access-token",
  user: {
    id: "user-123",
    email: "test@example.com",
    user_metadata: { full_name: "Test User" },
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  },
};

export const mockProfile = {
  role: "member",
  anonymous_name: "Lua Crescente",
  full_name: "Test User",
  username: "testuser",
};

export const mockUserProducts = [
  { products: { slug: "mulher-espiral" } },
];

/* Individual Supabase API stubs (override per-test as needed) */
export const mockAuthGetSession  = vi.fn().mockResolvedValue({ data: { session: mockSession } });
export const mockAuthGetUser     = vi.fn().mockResolvedValue({ data: { user: mockSession.user } });
export const mockAuthSignInOtp   = vi.fn().mockResolvedValue({ error: null });
export const mockAuthVerifyOtp   = vi.fn().mockResolvedValue({ data: { user: mockSession.user }, error: null });
export const mockAuthUpdateUser  = vi.fn().mockResolvedValue({ data: { user: mockSession.user }, error: null });
export const mockAuthSignInPass  = vi.fn().mockResolvedValue({ data: { user: mockSession.user, session: mockSession }, error: null });
export const mockAuthSignOut     = vi.fn().mockResolvedValue({ error: null });
export const mockAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

const mockSelect = vi.fn();
const mockEq     = vi.fn();
const mockSingle = vi.fn();
const mockIn     = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockFrom   = vi.fn();
const mockInvoke = vi.fn().mockResolvedValue({ data: null, error: null });

// Default chain behavior
mockFrom.mockReturnValue({
  select: mockSelect.mockReturnThis(),
  eq:     mockEq.mockReturnThis(),
  single: mockSingle.mockResolvedValue({ data: mockProfile, error: null }),
  in:     mockIn.mockReturnThis(),
  update: mockUpdate.mockReturnThis(),
  insert: mockInsert.mockReturnThis(),
});

export const supabase = {
  auth: {
    getSession:        mockAuthGetSession,
    getUser:           mockAuthGetUser,
    signInWithOtp:     mockAuthSignInOtp,
    verifyOtp:         mockAuthVerifyOtp,
    updateUser:        mockAuthUpdateUser,
    signInWithPassword: mockAuthSignInPass,
    signInWithOAuth:   vi.fn().mockResolvedValue({ error: null }),
    signOut:           mockAuthSignOut,
    onAuthStateChange: mockAuthStateChange,
  },
  from: mockFrom,
  functions: { invoke: mockInvoke },
};

export { mockFrom, mockSelect, mockEq, mockSingle, mockIn, mockUpdate, mockInsert, mockInvoke };
