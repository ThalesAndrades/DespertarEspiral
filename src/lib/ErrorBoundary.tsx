import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          minHeight: "100dvh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "var(--bg-surface, #0b0d1c)", gap: "20px", padding: "24px",
        }}>
          <svg width="48" height="48" viewBox="0 0 600 600" fill="none" aria-hidden="true">
            <path
              d="M300 550C120 550 50 420 50 300C50 165 155 65 285 65C395 65 480 152 480 262C480 355 410 420 320 420C245 420 185 360 185 286C185 220 237 170 303 170C362 170 408 216 408 275C408 327 370 362 320 362C277 362 245 330 245 288C245 252 273 226 308 226C340 226 365 251 365 283C365 312 343 333 315 333"
              stroke="#c6a870" strokeWidth="18" strokeLinecap="round" fill="none" opacity="0.6"
            />
          </svg>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <p style={{
              fontFamily: "Montserrat, sans-serif", fontSize: "9px",
              letterSpacing: "0.28em", textTransform: "uppercase",
              color: "rgba(198,168,112,0.6)", marginBottom: "12px",
            }}>
              Despertar Espiral
            </p>
            <h2 style={{
              fontFamily: "Cormorant Garamond, serif", fontSize: "26px",
              fontWeight: 300, color: "rgba(255,255,255,0.85)", marginBottom: "12px",
            }}>
              Algo deu errado
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: "24px" }}>
              Ocorreu um erro inesperado. Por favor, recarregue a página.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 28px", borderRadius: "12px",
              background: "rgba(198,168,112,0.14)", border: "1px solid rgba(198,168,112,0.35)",
              color: "#c6a870", fontFamily: "Montserrat, sans-serif",
              fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase",
              cursor: "pointer", transition: "background 0.2s",
            }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
