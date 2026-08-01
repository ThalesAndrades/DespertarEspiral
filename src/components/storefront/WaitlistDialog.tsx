import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { joinWaitlist } from "@/lib/waitlist";
import type { StorefrontProduct } from "@/types";

interface WaitlistDialogProps {
  product: StorefrontProduct | null;
  onClose: () => void;
}

export function WaitlistDialog({ product, onClose }: WaitlistDialogProps) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product || enviando) return;

    setEnviando(true);
    const { ok, duplicate } = await joinWaitlist(email, product.id);
    setEnviando(false);

    if (!ok) {
      toast.error("E-mail inválido. Confere e tenta de novo?");
      return;
    }

    toast.success(duplicate ? "Você já está na lista." : "Pronto — avisamos você.");
    setEmail("");
    onClose();
  }

  return (
    <Dialog open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display" style={{ fontWeight: 300 }}>
            {product ? `Avisar quando "${product.title}" abrir` : ""}
          </DialogTitle>
          <DialogDescription>
            Você recebe um e-mail assim que as inscrições abrirem. Nada além disso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "var(--space-4)" }}>
          <label htmlFor="waitlist-email" className="overline" style={{ color: "var(--text-muted)" }}>
            Seu e-mail
          </label>
          <input
            id="waitlist-email" type="email" required autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            style={{
              background: "var(--input-bg)", border: "1px solid var(--input-border)",
              borderRadius: "var(--r-sm)", padding: "var(--space-3) var(--space-4)",
              color: "var(--text-primary)", fontSize: "var(--fs-base)", minHeight: 52,
            }}
          />
          <button type="submit" className="btn-gold" disabled={enviando}>
            {enviando ? "Enviando..." : "Quero ser avisada"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
