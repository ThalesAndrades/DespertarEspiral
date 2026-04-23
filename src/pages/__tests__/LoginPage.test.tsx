/**
 * Integration Tests — LoginPage
 *
 * Covers:
 *  - Form rendering (email, password, submit button, google button)
 *  - Validation: empty fields show toast error, no API call made
 *  - Successful login: loginWithPassword called → navigate to /dashboard
 *  - Successful login with ?next= param: redirects to safe next path
 *  - Failed login: error toast displayed, loading state resets
 *  - Open redirect guard: ?next=//evil.com falls back to /dashboard
 *  - Password toggle (eye icon)
 *  - Google OAuth button calls loginWithGoogle
 *  - Links to /register and /forgot-password present
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";

/* ── Mocks ── */

// Mock react-helmet-async so <Helmet> doesn't crash in jsdom
vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock decorative lazy components (Three.js etc.) to avoid WebGL errors
vi.mock("@/components/layout/LazyDecorative", () => ({
  LazyAuthSpiral3D: () => null,
}));

// Mock SpiralLogo
vi.mock("@/components/layout/SpiralLogo", () => ({
  default: () => <div data-testid="spiral-logo" />,
}));

// Mock sonner toast
const mockToastError   = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error:   (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

// Core: mock useAuth
const mockLoginWithPassword = vi.fn();
const mockLoginWithGoogle   = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user:               null,
    loading:            false,
    loginWithPassword:  mockLoginWithPassword,
    loginWithGoogle:    mockLoginWithGoogle,
    sendOtp:            vi.fn(),
    verifyOtpAndRegister: vi.fn(),
    logout:             vi.fn(),
    refreshUser:        vi.fn(),
  }),
}));

/* ── Helpers ── */

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

function renderLogin(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/login${search}`]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>
  );
}

/* ── Test Suite ── */

describe("LoginPage — rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password inputs", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("seu@email.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  it("renders the submit button with correct label", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /entrar com e-mail/i })).toBeInTheDocument();
  });

  it("renders Google OAuth button", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /continuar com google/i })).toBeInTheDocument();
  });

  it("renders link to /register", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /criar conta gratuita/i })).toBeInTheDocument();
  });

  it("renders link to /forgot-password", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /esqueci a senha/i })).toBeInTheDocument();
  });

  it("renders link back to /", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /voltar ao início/i })).toBeInTheDocument();
  });
});

describe("LoginPage — password toggle", () => {
  it("toggles password visibility when eye icon is clicked", async () => {
    const user = userEvent.setup();
    renderLogin();
    const passwordInput = screen.getByPlaceholderText("••••••••");
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByRole("button", { name: /mostrar senha/i });
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /ocultar senha/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});

describe("LoginPage — validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows toast error and does NOT call API when email is empty", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByPlaceholderText("••••••••"), "senha123");
    await user.click(screen.getByRole("button", { name: /entrar com e-mail/i }));

    expect(mockToastError).toHaveBeenCalledWith("Preencha todos os campos.");
    expect(mockLoginWithPassword).not.toHaveBeenCalled();
  });

  it("shows toast error and does NOT call API when password is empty", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByPlaceholderText("seu@email.com"), "test@test.com");
    await user.click(screen.getByRole("button", { name: /entrar com e-mail/i }));

    expect(mockToastError).toHaveBeenCalledWith("Preencha todos os campos.");
    expect(mockLoginWithPassword).not.toHaveBeenCalled();
  });
});

describe("LoginPage — successful login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls loginWithPassword with correct credentials", async () => {
    mockLoginWithPassword.mockResolvedValue({});
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("seu@email.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "senha123");
    await user.click(screen.getByRole("button", { name: /entrar com e-mail/i }));

    await waitFor(() => {
      expect(mockLoginWithPassword).toHaveBeenCalledWith("user@example.com", "senha123");
    });
  });

  it("shows success toast and navigates to /dashboard by default", async () => {
    mockLoginWithPassword.mockResolvedValue({});
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("seu@email.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "senha123");
    await user.click(screen.getByRole("button", { name: /entrar com e-mail/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Bem-vinda de volta. ✦");
      expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  it("redirects to valid ?next= path after login", async () => {
    mockLoginWithPassword.mockResolvedValue({});
    const user = userEvent.setup();
    renderLogin("?next=/products");

    await user.type(screen.getByPlaceholderText("seu@email.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "senha123");
    await user.click(screen.getByRole("button", { name: /entrar com e-mail/i }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/products", { replace: true });
    });
  });

  it("falls back to /dashboard for open-redirect attempt (?next=//evil.com)", async () => {
    mockLoginWithPassword.mockResolvedValue({});
    const user = userEvent.setup();
    renderLogin("?next=//evil.com/steal");

    await user.type(screen.getByPlaceholderText("seu@email.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "senha123");
    await user.click(screen.getByRole("button", { name: /entrar com e-mail/i }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });
});

describe("LoginPage — failed login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows error toast when loginWithPassword returns error", async () => {
    mockLoginWithPassword.mockResolvedValue({ error: "E-mail ou senha incorretos." });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("seu@email.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /entrar com e-mail/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("E-mail ou senha incorretos.");
    });
  });

  it("does NOT navigate on failed login", async () => {
    mockLoginWithPassword.mockResolvedValue({ error: "E-mail ou senha incorretos." });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("seu@email.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /entrar com e-mail/i }));

    await waitFor(() => {
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it("re-enables submit button (loading = false) after failed login", async () => {
    mockLoginWithPassword.mockResolvedValue({ error: "Erro." });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("seu@email.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /entrar com e-mail/i }));

    await waitFor(() => {
      // Button should show "Entrar com e-mail" again (not "Entrando…")
      expect(screen.queryByText(/entrando…/i)).not.toBeInTheDocument();
    });
  });
});

describe("LoginPage — Google OAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls loginWithGoogle when Google button is clicked", async () => {
    mockLoginWithGoogle.mockResolvedValue({});
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: /continuar com google/i }));
    expect(mockLoginWithGoogle).toHaveBeenCalled();
  });

  it("shows error toast if Google login fails", async () => {
    mockLoginWithGoogle.mockResolvedValue({ error: "Popup bloqueado." });
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: /continuar com google/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Popup bloqueado.");
    });
  });
});
