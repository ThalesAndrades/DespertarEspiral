import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailGateProps {
  onConfirmar: (email: string) => void;
  enviando: boolean;
}

/** O email vem ANTES do resultado — o resultado é a moeda de troca (spec §3.1). */
export function EmailGate({ onConfirmar, enviando }: EmailGateProps) {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizado = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizado)) {
      setErro(true);
      return;
    }
    setErro(false);
    onConfirmar(normalizado);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "var(--space-4)", maxWidth: 420, margin: "0 auto" }}>
      <h2 className="font-display" style={{ fontSize: "var(--fs-xl)", fontWeight: 300, textAlign: "center", color: "var(--text-primary)" }}>
        Seu retrato está pronto.
      </h2>
      <p className="font-body" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)", textAlign: "center" }}>
        Deixe seu e-mail para receber o resultado — e guardá-lo para quando quiser voltar.
      </p>
      <label htmlFor="bussola-email" className="overline" style={{ color: "var(--text-muted)" }}>
        Seu e-mail
      </label>
      <input
        id="bussola-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="voce@exemplo.com"
        aria-invalid={erro}
        style={{
          background: "var(--input-bg)", border: `1px solid ${erro ? "var(--rose)" : "var(--input-border)"}`,
          borderRadius: "var(--r-sm)", padding: "var(--space-3) var(--space-4)",
          color: "var(--text-primary)", fontSize: "var(--fs-base)", minHeight: 52,
        }}
      />
      {erro && (
        <p className="font-body" role="alert" style={{ fontSize: "var(--fs-xs)", color: "var(--rose)" }}>
          Confere o e-mail? Ele não parece completo.
        </p>
      )}
      <button type="submit" className="btn-gold" disabled={enviando}>
        {enviando ? "Preparando..." : "Ver meu resultado"}
      </button>
    </form>
  );
}
