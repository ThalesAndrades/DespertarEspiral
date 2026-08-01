# Catálogo, Vitrine e Home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a home numa porta de entrada com vitrine de produtos lado a lado, alimentada por um catálogo que reflete a esteira — com produtos ainda sem conteúdo aparecendo como "em breve" e capturando lista de espera.

**Architecture:** Três camadas. (1) Banco: colunas novas em `products` para a vitrine e `product_id` em `launch_waitlist`. (2) Componentes: `ProductCard` e `StorefrontGrid` isolados em `src/components/storefront/`, consumidos tanto pela home quanto pela `ProductsPage`. (3) Home: hero com CTA único acima da dobra, vitrine abaixo. Nenhuma lógica de vitrine vive dentro de `LandingPage.tsx`.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind, shadcn/ui, Supabase (postgres + RLS), vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-31-fase-0-esteira-design.md`

## Global Constraints

- **Design system é lei.** `DESIGN_SYSTEM.md`: nenhum hex solto, nenhum `cubic-bezier` inline. Usar tokens (`var(--gold)`, `var(--text-primary)`, `var(--bg-surface-2)`, `--r-lg`, `--space-*`) e classes existentes (`.card-dark`, `.font-display`, `.overline`, `.btn-gold`, `.interactive`).
- **Tom:** *premium-calm*, "quiet over loud". Proibido: contador regressivo, tarja vermelha de desconto, "restam N vagas" sem estoque real, preço-âncora que nunca existiu.
- **Honestidade de dado:** nenhum número de alunas, nota ou depoimento entra na página sem origem verificável no banco.
- **`status` default é `em_breve`.** Produto novo nunca nasce comprável.
- **RLS habilitada em toda tabela tocada**, no padrão de `supabase/migrations/20260414_000001_production_rls.sql`.
- **Branch:** `feat/fase-0-esteira`. **Nunca commitar em `main`** — `main` tem auto-deploy para produção.
- **Idioma:** toda copy visível em pt-BR.

---

### Task 0: Tornar a suíte de testes executável

O projeto tem `vitest.config.ts` e testes escritos, mas **não há script `test`** em `package.json`. Sem isso não há ciclo de TDD — esta task vem primeiro.

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: nada
- Produces: comandos `npm test` (uma passada) e `npm run test:watch`, usados por todas as tasks seguintes.

- [ ] **Step 1: Confirmar que a suíte roda hoje**

```bash
npx vitest run
```

Expected: a suíte executa e os testes existentes (`src/pages/__tests__/CheckoutPage.test.tsx`, `src/types/__tests__/types.test.ts`) passam. Se algum falhar, **pare e reporte** — não construa em cima de suíte vermelha.

- [ ] **Step 2: Adicionar os scripts**

Em `package.json`, dentro de `"scripts"`, adicionar:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 3: Verificar**

```bash
npm test
```

Expected: mesma saída do Step 1, agora pelo comando padrão.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore(test): expor vitest via npm test

A suite existia e ninguem a rodava por comando padrao."
```

---

### Task 1: Migração do catálogo

**Files:**
- Create: `supabase/migrations/20260731_000001_storefront.sql`

**Interfaces:**
- Consumes: tabelas existentes `products`, `launch_waitlist`
- Produces: colunas `products.status` (`'disponivel' | 'em_breve'`), `products.promise` (text), `products.highlights` (jsonb), `products.sort_order` (int), `launch_waitlist.product_id` (uuid, nullable)

- [ ] **Step 1: Escrever a migração**

```sql
-- Vitrine: campos de apresentacao e disponibilidade do produto.
-- status nasce 'em_breve' de proposito: produto criado no admin nao pode
-- ficar compravel por acidente antes de ter conteudo dentro.

alter table public.products
  add column if not exists status text not null default 'em_breve',
  add column if not exists promise text,
  add column if not exists highlights jsonb not null default '[]'::jsonb,
  add column if not exists sort_order int not null default 100;

alter table public.products
  drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check
  check (status in ('disponivel', 'em_breve'));

-- O unico produto que ja vendia continua vendendo.
update public.products
   set status = 'disponivel'
 where is_active = true
   and status = 'em_breve';

create index if not exists idx_products_storefront
  on public.products (status, sort_order);

-- Lista de espera passa a saber DE QUAL produto.
-- Nullable: as linhas antigas (captura do MapaDoPoder) continuam validas.
alter table public.launch_waitlist
  add column if not exists product_id uuid references public.products(id) on delete set null;

create unique index if not exists uniq_waitlist_email_product
  on public.launch_waitlist (lower(email), product_id)
  where product_id is not null;
```

- [ ] **Step 2: Aplicar e conferir**

```bash
npx supabase db push
```

Se a CLI não estiver logada, aplicar o SQL pelo SQL Editor do painel do Supabase.

Verificação (deve retornar 1 linha, `Mulher Espiral`, `status = disponivel`):

```sql
select title, status, sort_order from public.products;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260731_000001_storefront.sql
git commit -m "feat(db): campos de vitrine em products e product_id na waitlist"
```

---

### Task 2: Tipos e camada de dados

O tipo `Product` em `src/types/index.ts` declara `is_published`, mas a coluna real do banco é `is_active` — divergência confirmada em 31/07 consultando a API. Esta task alinha os dois.

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/storefront.ts`
- Test: `src/lib/__tests__/storefront.test.ts`

**Interfaces:**
- Consumes: `supabase` de `@/lib/supabase`
- Produces:
  - `type ProductStatus = "disponivel" | "em_breve"`
  - `interface StorefrontProduct { id, slug, title, subtitle, promise, price, thumbnail, status, highlights: string[], sort_order }`
  - `sortStorefront(products: StorefrontProduct[]): StorefrontProduct[]`
  - `fetchStorefront(): Promise<StorefrontProduct[]>`

- [ ] **Step 1: Escrever o teste da ordenação**

`src/lib/__tests__/storefront.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sortStorefront } from "@/lib/storefront";
import type { StorefrontProduct } from "@/types";

const p = (over: Partial<StorefrontProduct>): StorefrontProduct => ({
  id: "x", slug: "s", title: "T", subtitle: "", promise: "", price: 0,
  thumbnail: "", status: "disponivel", highlights: [], sort_order: 100, ...over,
});

describe("sortStorefront", () => {
  it("ordena por sort_order crescente", () => {
    const out = sortStorefront([p({ id: "b", sort_order: 20 }), p({ id: "a", sort_order: 10 })]);
    expect(out.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("coloca disponivel antes de em_breve quando o sort_order empata", () => {
    const out = sortStorefront([
      p({ id: "breve", status: "em_breve", sort_order: 10 }),
      p({ id: "pronto", status: "disponivel", sort_order: 10 }),
    ]);
    expect(out.map((x) => x.id)).toEqual(["pronto", "breve"]);
  });

  it("nao muta o array recebido", () => {
    const input = [p({ id: "b", sort_order: 20 }), p({ id: "a", sort_order: 10 })];
    sortStorefront(input);
    expect(input.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/lib/__tests__/storefront.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/storefront"`.

- [ ] **Step 3: Adicionar os tipos**

Em `src/types/index.ts`, adicionar ao final:

```ts
export type ProductStatus = "disponivel" | "em_breve";

/** Produto como a vitrine precisa dele — recorte de leitura, sem modulos. */
export interface StorefrontProduct {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  /** Promessa de uma linha exibida no card. */
  promise: string;
  price: number;
  thumbnail: string;
  status: ProductStatus;
  /** Os 3 itens curtos de "o que ela leva". */
  highlights: string[];
  sort_order: number;
}
```

E, na `interface Product`, corrigir a divergência com o banco:

```ts
  /** Coluna real no banco e `is_active`. `is_published` nunca existiu. */
  is_active: boolean;
```

(removendo a linha `is_published: boolean;`)

- [ ] **Step 4: Implementar `src/lib/storefront.ts`**

```ts
import { supabase } from "@/lib/supabase";
import type { StorefrontProduct } from "@/types";

const STATUS_RANK: Record<string, number> = { disponivel: 0, em_breve: 1 };

/**
 * Ordena a vitrine: sort_order manda; no empate, o que da pra comprar vem antes.
 * Retorna um array novo — o de entrada nao e mutado.
 */
export function sortStorefront(products: StorefrontProduct[]): StorefrontProduct[] {
  return [...products].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
  });
}

export async function fetchStorefront(): Promise<StorefrontProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, title, subtitle, promise, price, thumbnail, status, highlights, sort_order")
    .eq("is_active", true);

  if (error) {
    console.error("[storefront] falha ao carregar produtos", error.message);
    return [];
  }

  const rows = (data ?? []).map((r) => ({
    ...r,
    promise: r.promise ?? "",
    subtitle: r.subtitle ?? "",
    highlights: Array.isArray(r.highlights) ? (r.highlights as string[]) : [],
  })) as StorefrontProduct[];

  return sortStorefront(rows);
}
```

- [ ] **Step 5: Rodar e ver passar**

```bash
npx vitest run src/lib/__tests__/storefront.test.ts
```

Expected: PASS, 3 testes.

- [ ] **Step 6: Conferir que nada quebrou com a mudança do tipo**

```bash
npm test && npx tsc --noEmit
```

Expected: suíte verde e zero erro de tipo. Se algum arquivo usava `is_published`, corrigir para `is_active` agora.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/lib/storefront.ts src/lib/__tests__/storefront.test.ts
git commit -m "feat(storefront): tipos e leitura do catalogo

Corrige tambem is_published -> is_active no tipo Product: a coluna
is_published nunca existiu no banco."
```

---

### Task 3: ProductCard

**Files:**
- Create: `src/components/storefront/ProductCard.tsx`
- Test: `src/components/storefront/__tests__/ProductCard.test.tsx`

**Interfaces:**
- Consumes: `StorefrontProduct` de `@/types`; `formatBRL` de `@/lib/dateUtils`
- Produces: `<ProductCard product={p} onNotify={(p) => void} />`

- [ ] **Step 1: Escrever o teste**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { StorefrontProduct } from "@/types";

const base: StorefrontProduct = {
  id: "1", slug: "sete-manhas", title: "Sete Manhãs", subtitle: "Front-end",
  promise: "Sete dias para sair do piloto automático.", price: 47,
  thumbnail: "", status: "disponivel", highlights: ["7 áudios", "Journaling", "Comunidade"],
  sort_order: 10,
};

const renderCard = (p: StorefrontProduct, onNotify = vi.fn()) =>
  render(<MemoryRouter><ProductCard product={p} onNotify={onNotify} /></MemoryRouter>);

describe("ProductCard", () => {
  it("mostra preço e botão de compra quando disponivel", () => {
    renderCard(base);
    expect(screen.getByText("R$ 47,00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /quero começar/i })).toBeInTheDocument();
  });

  it("NAO mostra botão de compra quando em_breve", () => {
    renderCard({ ...base, status: "em_breve" });
    expect(screen.queryByRole("link", { name: /quero começar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /avise-me/i })).toBeInTheDocument();
  });

  it("chama onNotify com o produto ao clicar em avise-me", async () => {
    const onNotify = vi.fn();
    renderCard({ ...base, status: "em_breve" }, onNotify);
    await userEvent.click(screen.getByRole("button", { name: /avise-me/i }));
    expect(onNotify).toHaveBeenCalledWith(expect.objectContaining({ slug: "sete-manhas" }));
  });

  it("exibe no maximo 3 destaques", () => {
    renderCard({ ...base, highlights: ["a", "b", "c", "d", "e"] });
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/components/storefront/__tests__/ProductCard.test.tsx
```

Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

```tsx
import { Link } from "react-router-dom";
import type { StorefrontProduct } from "@/types";
import { formatBRL } from "@/lib/dateUtils";

interface ProductCardProps {
  product: StorefrontProduct;
  onNotify: (product: StorefrontProduct) => void;
}

/**
 * Card da vitrine. Densidade comercial dentro do DNA premium-calm:
 * preco sempre visivel, promessa em uma linha, tres destaques, um CTA.
 * Sem contador, sem tarja de desconto, sem escassez inventada.
 */
export function ProductCard({ product, onNotify }: ProductCardProps) {
  const isAvailable = product.status === "disponivel";

  return (
    <article
      className="card-dark card-lift"
      style={{
        display: "flex", flexDirection: "column", height: "100%",
        borderRadius: "var(--r-lg)", overflow: "hidden",
        opacity: isAvailable ? 1 : 0.86,
      }}
    >
      {product.thumbnail ? (
        <img
          src={product.thumbnail} alt="" aria-hidden="true"
          style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }}
          loading="lazy"
        />
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-5)", flex: 1 }}>
        {!isAvailable && (
          <span className="overline" style={{ color: "var(--text-muted)" }}>Em breve</span>
        )}

        <h3 className="font-display" style={{ fontSize: "var(--fs-lg)", fontWeight: 300, color: "var(--text-primary)" }}>
          {product.title}
        </h3>

        {product.promise && (
          <p className="font-body" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
            {product.promise}
          </p>
        )}

        {product.highlights.length > 0 && (
          <ul style={{ display: "grid", gap: "var(--space-1)", listStyle: "none", padding: 0, margin: 0 }}>
            {product.highlights.slice(0, 3).map((item) => (
              <li key={item} className="font-body" style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                {item}
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: "auto", display: "grid", gap: "var(--space-3)" }}>
          {isAvailable ? (
            <>
              <p className="font-display" style={{ fontSize: "var(--fs-xl)", color: "var(--gold)", fontWeight: 300 }}>
                {formatBRL(product.price)}
              </p>
              <Link to={`/checkout/${product.slug}`} className="btn-gold" style={{ textAlign: "center" }}>
                Quero começar
              </Link>
            </>
          ) : (
            <button type="button" className="btn-outline-gold interactive" onClick={() => onNotify(product)}>
              Avise-me quando abrir
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run src/components/storefront/__tests__/ProductCard.test.tsx
```

Expected: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/storefront/ProductCard.tsx src/components/storefront/__tests__/ProductCard.test.tsx
git commit -m "feat(storefront): ProductCard com preco visivel e em_breve sem compra"
```

---

### Task 4: StorefrontGrid + lista de espera

**Files:**
- Create: `src/components/storefront/StorefrontGrid.tsx`
- Create: `src/lib/waitlist.ts`
- Test: `src/components/storefront/__tests__/StorefrontGrid.test.tsx`
- Test: `src/lib/__tests__/waitlist.test.ts`

**Interfaces:**
- Consumes: `ProductCard`, `fetchStorefront`, `sortStorefront`
- Produces:
  - `<StorefrontGrid products={StorefrontProduct[]} loading?: boolean />`
  - `joinWaitlist(email: string, productId: string): Promise<{ ok: boolean; duplicate: boolean }>`

- [ ] **Step 1: Teste da grade**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StorefrontGrid } from "@/components/storefront/StorefrontGrid";
import type { StorefrontProduct } from "@/types";

const p = (over: Partial<StorefrontProduct>): StorefrontProduct => ({
  id: Math.random().toString(), slug: "s", title: "T", subtitle: "", promise: "",
  price: 10, thumbnail: "", status: "disponivel", highlights: [], sort_order: 100, ...over,
});

const renderGrid = (products: StorefrontProduct[]) =>
  render(<MemoryRouter><StorefrontGrid products={products} /></MemoryRouter>);

describe("StorefrontGrid", () => {
  it("renderiza um card por produto", () => {
    renderGrid([p({ title: "A" }), p({ title: "B" }), p({ title: "C" })]);
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("nao quebra com um unico produto", () => {
    renderGrid([p({ title: "Solo" })]);
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("nao quebra com lista vazia e nao mostra grade fantasma", () => {
    renderGrid([]);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("respeita a ordem recebida", () => {
    renderGrid([p({ title: "Primeiro", sort_order: 1 }), p({ title: "Segundo", sort_order: 2 })]);
    const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titulos).toEqual(["Primeiro", "Segundo"]);
  });
});
```

- [ ] **Step 2: Teste da lista de espera**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const insert = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from: () => ({ insert }) },
}));

import { joinWaitlist } from "@/lib/waitlist";

beforeEach(() => insert.mockReset());

describe("joinWaitlist", () => {
  it("grava email normalizado em minusculas", async () => {
    insert.mockResolvedValue({ error: null });
    await joinWaitlist("  Maria@Exemplo.COM ", "prod-1");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: "maria@exemplo.com", product_id: "prod-1" })
    );
  });

  it("trata violacao de unicidade como sucesso, nao como erro", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    const r = await joinWaitlist("maria@exemplo.com", "prod-1");
    expect(r).toEqual({ ok: true, duplicate: true });
  });

  it("recusa email invalido sem chamar o banco", async () => {
    const r = await joinWaitlist("nao-e-email", "prod-1");
    expect(r.ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npx vitest run src/components/storefront src/lib/__tests__/waitlist.test.ts
```

Expected: FAIL — módulos não encontrados.

- [ ] **Step 4: Implementar `src/lib/waitlist.ts`**

```ts
import { supabase } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Entra na lista de espera de um produto ainda nao lancado.
 * Email repetido no mesmo produto NAO e erro: o indice unico do banco barra,
 * e para a visitante o resultado e o mesmo — ela esta na lista.
 */
export async function joinWaitlist(
  email: string,
  productId: string
): Promise<{ ok: boolean; duplicate: boolean }> {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) return { ok: false, duplicate: false };

  const { error } = await supabase
    .from("launch_waitlist")
    .insert({ email: normalized, product_id: productId });

  if (error) {
    if (error.code === "23505") return { ok: true, duplicate: true };
    console.error("[waitlist] falha ao inserir", error.message);
    return { ok: false, duplicate: false };
  }

  return { ok: true, duplicate: false };
}
```

- [ ] **Step 5: Implementar `src/components/storefront/WaitlistDialog.tsx`**

Modal no padrão da marca — `window.prompt` foi descartado por contradizer
"design system é lei" nas Global Constraints.

```tsx
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
```

- [ ] **Step 5b: Implementar `src/components/storefront/StorefrontGrid.tsx`**

```tsx
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
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          alignItems: "stretch",
        }}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onNotify={setWaitlistFor} />
        ))}
      </div>

      <WaitlistDialog product={waitlistFor} onClose={() => setWaitlistFor(null)} />
    </>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

```bash
npx vitest run src/components/storefront src/lib/__tests__/waitlist.test.ts
```

Expected: PASS, 7 testes.

- [ ] **Step 7: Commit**

```bash
git add src/components/storefront src/lib/waitlist.ts src/lib/__tests__/waitlist.test.ts
git commit -m "feat(storefront): grade responsiva e lista de espera por produto"
```

---

### Task 5: Home com hero de CTA único e vitrine

**Files:**
- Modify: `src/pages/LandingPage.tsx`
- Test: `src/pages/__tests__/LandingPage.storefront.test.tsx`

**Interfaces:**
- Consumes: `StorefrontGrid`, `fetchStorefront`
- Produces: nada consumido por tasks seguintes

- [ ] **Step 1: Escrever o teste**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/storefront", () => ({
  fetchStorefront: vi.fn().mockResolvedValue([
    { id: "1", slug: "sete-manhas", title: "Sete Manhãs", subtitle: "", promise: "",
      price: 47, thumbnail: "", status: "disponivel", highlights: [], sort_order: 10 },
  ]),
}));

import LandingPage from "@/pages/LandingPage";

describe("LandingPage — vitrine", () => {
  it("tem exatamente um CTA primário acima da dobra", async () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const primarios = await screen.findAllByTestId("cta-primario");
    expect(primarios).toHaveLength(1);
  });

  it("o CTA primário leva à Bússola", async () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const cta = await screen.findByTestId("cta-primario");
    expect(cta).toHaveAttribute("href", "/bussola");
  });

  it("renderiza a vitrine com os produtos do catálogo", async () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Sete Manhãs")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/pages/__tests__/LandingPage.storefront.test.tsx
```

Expected: FAIL — não existe `cta-primario`.

- [ ] **Step 3: Marcar o CTA primário e remover os concorrentes**

Em `src/pages/LandingPage.tsx`, no hero (`section-0`): manter **um** link e marcá-lo:

```tsx
<Link to="/bussola" className="btn-gold" data-testid="cta-primario">
  Descobrir minha volta da espiral
</Link>
```

Remover do hero os CTAs "Entrar na lista" e "Reservar minha vaga" (eles competem com o primário). Se um deles precisar sobreviver, vai para o rodapé — nunca acima da dobra.

- [ ] **Step 4: Inserir a vitrine**

Ainda em `LandingPage.tsx`, adicionar o estado e a seção:

```tsx
const [produtos, setProdutos] = useState<StorefrontProduct[]>([]);
const [carregando, setCarregando] = useState(true);

useEffect(() => {
  let vivo = true;
  fetchStorefront()
    .then((p) => { if (vivo) setProdutos(p); })
    .finally(() => { if (vivo) setCarregando(false); });
  return () => { vivo = false; };
}, []);
```

E, abaixo do hero:

```tsx
<section id="vitrine" style={{ padding: "var(--space-20) var(--space-5)" }}>
  <div style={{ maxWidth: 1180, margin: "0 auto" }}>
    <p className="overline" style={{ color: "var(--gold)" }}>As jornadas</p>
    <h2 className="font-display" style={{ fontSize: "var(--fs-2xl)", fontWeight: 300, marginBottom: "var(--space-10)" }}>
      Escolha por onde começar
    </h2>
    <StorefrontGrid products={produtos} loading={carregando} />
  </div>
</section>
```

- [ ] **Step 5: Rodar e ver passar**

```bash
npx vitest run src/pages/__tests__/LandingPage.storefront.test.tsx && npm test
```

Expected: os 3 novos passam e a suíte inteira segue verde.

- [ ] **Step 6: Conferir no navegador**

```bash
npm run dev
```

Verificar em 375px, 768px e 1280px: a grade vai de 1 → 2 → 3 colunas, os cards têm a mesma altura, e nenhum texto escapa do card.

- [ ] **Step 7: Commit**

```bash
git add src/pages/LandingPage.tsx src/pages/__tests__/LandingPage.storefront.test.tsx
git commit -m "feat(home): CTA unico para a Bussola e vitrine de produtos"
```

---

### Task 6: Cadastrar a esteira no catálogo

**Files:**
- Create: `supabase/migrations/20260731_000002_seed_esteira.sql`

**Interfaces:**
- Consumes: colunas da Task 1
- Produces: catálogo com os produtos da esteira

- [ ] **Step 1: Escrever o seed**

Preços e promessas vêm de `ESTEIRA-DIGITAL-10-PRODUTOS-v2.pdf`. Tudo entra `em_breve` — só o que já tem conteúdo vira `disponivel`, e isso é decisão da Sunyan, não do seed.

```sql
-- Catalogo da esteira. Idempotente por slug.
-- ATENCAO: nenhum produto aqui nasce compravel. status='em_breve' ate que
-- alguem confirme que existe conteudo dentro.

insert into public.products (slug, title, subtitle, promise, price, status, sort_order, highlights, is_active)
values
  ('bussola-da-espiral', 'Bússola da Espiral', 'Diagnóstico gratuito',
   'Descubra em que volta da espiral você está presa.', 0, 'em_breve', 10,
   '["12 perguntas","Retrato do seu arquétipo","Áudio de devolutiva"]'::jsonb, true),

  ('sete-manhas', 'Sete Manhãs', 'Micro-jornada de 7 dias',
   'Sete dias para sair do piloto automático — dez minutos por manhã.', 47, 'em_breve', 20,
   '["7 áudios-ritual","Journaling guiado","Comunidade da turma"]'::jsonb, true),

  ('mapa-dos-sentimentos', 'Mapa dos Sentimentos que Aprisionam', 'Módulo avulso',
   'O módulo que a maioria diz ter sido o que quebrou a casca.', 27, 'em_breve', 30,
   '["Vídeo do módulo 7","Mapa de journaling","Áudio de neutralização"]'::jsonb, true),

  ('prosperidade-em-espiral', 'Prosperidade em Espiral', 'Imersão de fim de semana',
   'Um fim de semana para desbloquear sua relação com o dinheiro.', 297, 'em_breve', 40,
   '["Imersão ao vivo","Gravação vitalícia","Workbook de crenças"]'::jsonb, true),

  ('circulo-espiral', 'Círculo Espiral', 'Turma ao vivo',
   'A jornada conduzida ao vivo, em grupo pequeno.', 1497, 'em_breve', 60,
   '["Encontros ao vivo","Grupo reduzido","Acompanhamento"]'::jsonb, true),

  ('clube-guardia', 'Clube Guardiã', 'Assinatura mensal',
   'A espiral não acaba no último módulo.', 47, 'em_breve', 70,
   '["Ritual semanal inédito","Carta do dia","SunyClass mensal"]'::jsonb, true),

  ('mentoria-espiral', 'Mentoria Espiral', 'Reprogramação 1:1',
   'Isto não é um formulário. É uma decisão.', 9997, 'em_breve', 80,
   '["8 sessões 1:1","Acesso vitalício ao ecossistema","Linha direta"]'::jsonb, true),

  ('guardias-formacao', 'Guardiãs', 'Formação de facilitadoras',
   'Conduza outras mulheres pela espiral — com método e selo.', 5997, 'em_breve', 90,
   '["6 meses de formação","Supervisões mensais","Selo verificável"]'::jsonb, true)
on conflict (slug) do nothing;

-- O core ja existente ganha apresentacao de vitrine.
update public.products
   set promise = 'Você não precisa de mais informação. Você precisa de transformação.',
       subtitle = 'O método completo',
       sort_order = 50,
       highlights = '["10 módulos","Acesso vitalício","Comunidade privada"]'::jsonb
 where slug = 'mulher-espiral';
```

- [ ] **Step 2: Aplicar**

```bash
npx supabase db push
```

- [ ] **Step 3: Conferir**

```sql
select slug, status, price, sort_order from public.products order by sort_order;
```

Expected: 9 linhas; apenas `mulher-espiral` com `status = 'disponivel'`.

- [ ] **Step 4: Ver a vitrine cheia**

```bash
npm run dev
```

Expected: a home mostra 9 cards; 8 com "Avise-me quando abrir", 1 com preço e "Quero começar".

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260731_000002_seed_esteira.sql
git commit -m "feat(catalogo): cadastrar a esteira com status em_breve

Grade nasce cheia e honesta; cada 'avise-me' vira demanda medida antes
de produzir conteudo."
```

---

## Pendências que este plano NÃO resolve

Ficam registradas para não sumirem:

1. **Preço do core.** A esteira define R$ 497 com âncora de R$ 997; o catálogo vende R$ 997 seco. Decisão da Sunyan. O "de R$ 997" só pode ser exibido se tiver sido preço real.
2. **Prova social.** "280+ alunas" na home e "2.500+ mulheres" no documento. Nenhum dos dois entra na página nova sem conferência contra `orders`/`user_products`.
3. **Conteúdo.** Nenhum produto sai de `em_breve` sem aula dentro.
4. **Notificação por e-mail de fato.** A lista de espera grava o interesse, mas nada dispara o e-mail quando o produto abre. Isso é trabalho de edge function (`send-email` já existe) e fica para um plano seguinte — hoje o disparo é manual.
