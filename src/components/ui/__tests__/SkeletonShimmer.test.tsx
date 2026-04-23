/**
 * Tests — Skeleton UI components
 * Coverage: SkeletonShimmer renders with correct dimensions, className, style
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Skeleton from "@/components/ui/SkeletonShimmer";

describe("Skeleton", () => {
  it("renders a div with skeleton class", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe("DIV");
    expect(el.classList.contains("skeleton") || el.style.background.includes("linear-gradient")).toBe(true);
  });

  it("applies default dimensions (100% width, 16px height)", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("100%");
    expect(el.style.height).toBe("16px");
  });

  it("applies custom width and height", () => {
    const { container } = render(<Skeleton width="200px" height="32px" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("200px");
    expect(el.style.height).toBe("32px");
  });

  it("applies custom borderRadius", () => {
    const { container } = render(<Skeleton borderRadius="50%" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderRadius).toBe("50%");
  });

  it("merges custom className", () => {
    const { container } = render(<Skeleton className="my-custom-class" />);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains("my-custom-class")).toBe(true);
  });

  it("merges custom style", () => {
    const { container } = render(<Skeleton style={{ opacity: 0.5 }} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.opacity).toBe("0.5");
  });

  it("accepts numeric width and height", () => {
    const { container } = render(<Skeleton width={120} height={40} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("120px");
    expect(el.style.height).toBe("40px");
  });
});
