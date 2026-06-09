/**
 * Global motion control — trims CPU/battery cost of decorative animations
 * without changing how they look while visible.
 *
 *  1. Pauses every CSS animation while the browser tab is backgrounded.
 *  2. Pauses the heavy infinite "spiral" animations while they're scrolled
 *     off-screen, resuming them just before they re-enter the viewport.
 *
 * Animations disabled via `prefers-reduced-motion` are unaffected (they're
 * already off in CSS). Safe to call once at startup; it's a no-op on SSR.
 */
export function initMotionControl(): void {
  if (typeof document === "undefined") return;

  // 1. Pause all animations when the tab isn't visible.
  const syncTabVisibility = () =>
    document.documentElement.classList.toggle("tab-hidden", document.hidden);
  document.addEventListener("visibilitychange", syncTabVisibility);
  syncTabVisibility();

  // 2. Cull off-screen decorative spirals.
  if (typeof IntersectionObserver === "undefined") return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        (entry.target as HTMLElement).classList.toggle(
          "anim-paused",
          !entry.isIntersecting,
        );
      }
    },
    { rootMargin: "120px" },
  );

  const SELECTOR = ".spiral-outer, .spiral-inner";
  const observeSpirals = () =>
    document.querySelectorAll(SELECTOR).forEach((el) => observer.observe(el));

  // Spirals may mount after the first paint (lazy/decorative components),
  // so sweep again on the next frame and shortly after hydration settles.
  observeSpirals();
  requestAnimationFrame(observeSpirals);
  window.setTimeout(observeSpirals, 1500);
}
