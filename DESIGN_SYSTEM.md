# 🎨 Despertar Espiral — Design System

> **Single source of truth for the visual language.** Every color, size, motion
> curve, and component recipe lives as a token in `src/index.css`. This document
> is the contract: build with these tokens, not with magic numbers.
>
> **Brand DNA:** feminine, spiritual, premium-calm. Gold on deep navy (dark) /
> warm ivory (light), serif display + humanist sans, the spiral motif, generous
> whitespace, and slow, decelerating motion. When in doubt, choose *quiet over loud*.

---

## 1. Principles

1. **Token-first.** Never hardcode a hex, a `cubic-bezier`, or a `z-index` in a
   component. If a value isn't a token yet, add it here first, then use it.
2. **Theme-agnostic components.** Components reference semantic tokens
   (`--text-primary`, `--bg-surface-2`, `--gold`) that resolve per theme. Never
   branch on theme inside a component for color.
3. **Fluid by default.** Type and spacing use `clamp()` so layouts breathe from
   mobile to desktop without breakpoint soup.
4. **Motion is calm.** Decelerate (`--ease-out`) for almost everything; a gentle
   spring (`--ease-spring`) only for press/lift. Always honor
   `prefers-reduced-motion`.
5. **Accessible always.** Visible focus, AA contrast, ≥44px touch targets,
   semantic HTML, `aria-*` on interactive/decorative elements.

---

## 2. Color tokens

Semantic, theme-aware (defined for both `[data-theme="dark"]` and `light`).

| Token | Role |
|---|---|
| `--gold` / `--gold-soft` / `--gold-dim` / `--gold-glow` | Primary accent (CTAs, highlights, focus) |
| `--rose` / `--lavender` / `--sage` | Secondary accents (categories, status, quiz) |
| `--bg-base` → `--bg-surface-4` | Background elevation ramp (5 steps) |
| `--text-primary` / `--text-secondary` / `--text-muted` / `--text-faint` | Text hierarchy (4 steps) |
| `--border-subtle` → `--border-strong` | Hairline → emphasis borders (4 steps) |
| `--input-bg` / `--input-border` / `--input-focus` | Form fields |
| `--card-bg` / `--card-hover` / `--sidebar-bg` / `--nav-bg` | Surfaces |
| `--spiral-stroke` / `--spiral-glow` | Decorative spiral motif |

shadcn/ui consumes the HSL channel tokens (`--background`, `--primary`, `--ring`, …)
for the `components/ui/*` primitives — keep those in sync with the semantic palette.

**Rules:** use `--text-*` for text, `--bg-surface-*` for panels, `--gold` for the
single primary action per view. `--sage` = success/complete, `--rose`/`--lavender`
= secondary categorization only.

---

## 3. Typography

Three families, each with one job:

| Family | Token / class | Use for |
|---|---|---|
| Cormorant Garamond (serif, 300) | `--font-display` · `.font-display` | H1/H2, hero numerals, emotive display |
| DM Sans (humanist sans, 300–500) | `.font-body` (body default) | Paragraphs, UI text, lesson content |
| Montserrat (geometric, 400–600) | `.font-label` · `.overline` | Labels, eyebrows, buttons, metadata |

**Type scale** (fluid tokens — prefer these over inline `clamp()`):

```
--fs-overline 10px · --fs-xs · --fs-sm · --fs-base · --fs-md
--fs-lg · --fs-xl · --fs-2xl · --fs-display
```

**Letter-spacing:** `--ls-tight` (display headings), `--ls-label` (buttons/labels),
`--ls-overline` (eyebrows, uppercase). Overlines/labels are **uppercase**; display
and body are sentence case.

---

## 4. Spacing

4px base scale — use for padding, gaps, and margins:

```
--space-1 4 · -2 8 · -3 12 · -4 16 · -5 20 · -6 24
--space-8 32 · -10 40 · -12 48 · -16 64 · -20 80 · -24 96
```

Section rhythm fluidly scales (`clamp(...)`) but should land on scale values at
its endpoints. Don't invent one-off `13px`/`27px` paddings.

---

## 5. Radius & elevation

**Radius:** `--r-sm 10` · `--r-md 14` · `--r-lg 18` · `--r-xl 24` · `--r-2xl 32`.
Pills/buttons use `100px`. Match radius to element size (chips → sm, cards → lg/xl,
sheets → 2xl).

**Elevation (shadows):** `--shadow-xs` → `--shadow-lg` (4 steps) plus
`--shadow-gold` for accent glow on primary actions. One elevation step per
interaction level; hover lifts exactly one step. Both themes define all six.

---

## 6. Motion

| Token | Curve | When |
|---|---|---|
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | **Default** — reveals, expands, hovers, progress |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | Press / lift on buttons & cards (slight overshoot) |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | Symmetric loops/toggles |

Durations: `--dur-fast 0.18s` (taps, micro), `--dur-base 0.28s` (most UI),
`--dur-slow 0.6s` (progress fills, large reveals). Decorative loops (spirals,
ticker) run long (40–140s) and are paused off-screen / when the tab is hidden via
`src/lib/motionControl.ts`. **All motion is disabled under
`prefers-reduced-motion: reduce`.**

---

## 7. Z-index

Use the scale, never raw integers:

```
--z-base 1 · --z-sticky 50 · --z-nav 100 · --z-drawer 300 · --z-overlay 500 · --z-toast 9999
```

---

## 8. Component recipes

Shared primitives in `@layer components` of `src/index.css` — reuse, don't reinvent.

- **Buttons** — `.btn-gold` (one primary action per view), `.btn-outline-gold`
  (secondary), `.btn-ghost` (tertiary). All: pill radius, uppercase Montserrat,
  ≥52px min-height, hover lifts `-2px` + one shadow step, active presses to `0.98`.
- **Cards** — `.card-dark` (panel on `--bg-surface-2`), `.card-lift` (adds hover
  raise). Radius `--r-lg`/`--r-xl`, border `--border-subtle`.
- **Eyebrow** — `.overline` for the small uppercase gold labels above headings.
- **Skeletons** — `SkeletonShimmer` for all loading states; never a bare spinner
  where content shape is known.

**Touch:** under `(hover: none) and (pointer: coarse)`, hover transforms are
neutralized and replaced with `:active` scale feedback — keep new interactive
elements consistent with this.

---

## 9. Accessibility checklist (per feature)

- [ ] Visible `:focus-visible` (gold outline, 2px, offset 3px — global)
- [ ] Text contrast ≥ AA on its surface (verify gold-on-light especially)
- [ ] Touch targets ≥ 44px
- [ ] Decorative elements `aria-hidden`; informative icons get `aria-label`
- [ ] Accordions/disclosures: `aria-expanded` + `aria-controls` → panel `id`
- [ ] Honors `prefers-reduced-motion`

---

## 10. How to add to the system

1. Need a new value? Add a **token** in the correct group in `src/index.css`
   (both themes if it's a color).
2. Need a new pattern used 2+ times? Add a **class** in `@layer components`, not a
   repeated inline style.
3. Update this document in the same change. The doc and the tokens move together.
