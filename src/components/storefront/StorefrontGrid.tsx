import { useState } from "react";
import { ProductCard } from "./ProductCard";
import { WaitlistDialog } from "./WaitlistDialog";
import type { StorefrontProduct } from "@/types";

interface StorefrontGridProps {
  products: StorefrontProduct[];
  loading?: boolean;
}

export function StorefrontGrid({ products, loading = false }: StorefrontGridProps) {
  const [waitlistFor, setWaitlistFor] = useState<StorefrontProduct | null>(null);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: "var(--space-5)", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 380, borderRadius: "var(--r-lg)" }} />)}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <>
      <div
        style={{
          display: "grid", gap: "var(--space-5)",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
          alignItems: "stretch",
        }}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onNotify={setWaitlistFor}
            featured={product.slug === "sete-manhas"}
          />
        ))}
      </div>

      <WaitlistDialog product={waitlistFor} onClose={() => setWaitlistFor(null)} />
    </>
  );
}
