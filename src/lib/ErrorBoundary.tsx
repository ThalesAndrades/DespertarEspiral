import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) console.error("[ErrorBoundary]", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          textAlign: "center",
          background: "var(--bg-surface, #0b0d1c)",
          color: "var(--text-primary, #f4f0e6)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ maxWidth: "420px" }}>
          <p
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontSize: "9px",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "var(--gold, #c6a870)",
              marginBottom: "14px",
            }}
          >
            Algo inesperado aconteceu
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(28px,5vw,44px)",
              fontWeight: 300,
              fontStyle: "italic",
              lineHeight: 1.15,
              marginBottom: "14px",
            }}
          >
            Vamos respirar<br />e tentar novamente.
          </h1>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.8,
              color: "var(--text-secondary, #b9b3a1)",
              marginBottom: "28px",
            }}
          >
            Ocorreu um erro ao carregar esta tela. Você pode voltar ao início com segurança — seus dados estão preservados.
          </p>
          <button
            onClick={this.handleReload}
            className="btn-gold"
            style={{
              minWidth: "220px",
              justifyContent: "center",
              margin: "0 auto",
              padding: "14px 28px",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              borderRadius: "14px",
              border: "1px solid var(--gold, #c6a870)",
              background: "var(--gold, #c6a870)",
              color: "var(--bg-surface, #0b0d1c)",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }
}
