/**
 * Tests — type assertions and data shape validation (src/types/index.ts)
 * Ensures the shared type system is consistent with DB schema expectations.
 */
import { describe, it, expect } from "vitest";
import type { CommunityPost, Lesson, Order, Module } from "@/types";

/* ── Helper: creates a minimal valid object from a type ── */
const validPost = (): CommunityPost => ({
  id: "post-1",
  author_anonymous: "Lua Crescente",
  category: "geral",
  title: "Test post",
  body: "Body content",
  is_pinned: false,
  is_visible: true,
  likes: 0,
  comments_count: 0,
  created_at: new Date().toISOString(),
});

const validLesson = (): Lesson => ({
  id: "lesson-1",
  module_id: "module-1",
  title: "Lesson 1",
  type: "video",
  content: "https://youtube.com/embed/abc",
  sort_order: 1,
  is_free_preview: false,
});

const validOrder = (): Order => ({
  id: "order-1",
  user_id: "user-1",
  user_email: "user@example.com",
  product_id: "product-1",
  product_title: "Mulher Espiral",
  payment_method: "pix",
  status: "paid",
  amount: 997,
  created_at: new Date().toISOString(),
});

describe("CommunityPost type", () => {
  it("accepts all valid categories", () => {
    const categories: CommunityPost["category"][] = ["geral", "desabafo", "duvidas", "conquistas", "dicas"];
    categories.forEach((category) => {
      const post: CommunityPost = { ...validPost(), category };
      expect(post.category).toBe(category);
    });
  });

  it("has all required fields", () => {
    const post = validPost();
    expect(post).toHaveProperty("id");
    expect(post).toHaveProperty("author_anonymous");
    expect(post).toHaveProperty("category");
    expect(post).toHaveProperty("title");
    expect(post).toHaveProperty("body");
    expect(post).toHaveProperty("is_pinned");
    expect(post).toHaveProperty("likes");
    expect(post).toHaveProperty("comments_count");
    expect(post).toHaveProperty("created_at");
  });

  it("likes is a number", () => {
    const post = validPost();
    expect(typeof post.likes).toBe("number");
  });
});

describe("Lesson type", () => {
  it("accepts all valid lesson types", () => {
    const types: Lesson["type"][] = ["video", "text", "pdf", "audio"];
    types.forEach((type) => {
      const lesson: Lesson = { ...validLesson(), type };
      expect(lesson.type).toBe(type);
    });
  });

  it("has all required fields", () => {
    const lesson = validLesson();
    expect(lesson).toHaveProperty("id");
    expect(lesson).toHaveProperty("module_id");
    expect(lesson).toHaveProperty("title");
    expect(lesson).toHaveProperty("type");
    expect(lesson).toHaveProperty("content");
    expect(lesson).toHaveProperty("sort_order");
    expect(lesson).toHaveProperty("is_free_preview");
  });
});

describe("Order type", () => {
  it("accepts all valid payment methods", () => {
    const methods: Order["payment_method"][] = ["pix", "credit_card", "boleto"];
    methods.forEach((payment_method) => {
      const order: Order = { ...validOrder(), payment_method };
      expect(order.payment_method).toBe(payment_method);
    });
  });

  it("accepts all valid statuses", () => {
    const statuses: Order["status"][] = ["pending", "paid", "failed", "refunded"];
    statuses.forEach((status) => {
      const order: Order = { ...validOrder(), status };
      expect(order.status).toBe(status);
    });
  });

  it("amount is a number", () => {
    expect(typeof validOrder().amount).toBe("number");
  });
});
