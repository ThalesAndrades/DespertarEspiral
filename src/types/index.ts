export interface User {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
  anonymous_name: string;
  created_at: string;
  products: string[]; // product slugs the user has access to
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  thumbnail: string;
  is_published: boolean;
  modules: Module[];
  created_at: string;
}

export interface Module {
  id: string;
  product_id: string;
  title: string;
  sort_order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  type: "video" | "text" | "pdf" | "audio";
  content: string; // embed URL or text body
  sort_order: number;
  is_free_preview: boolean;
}

export interface LessonProgress {
  lesson_id: string;
  completed: boolean;
}

export interface Order {
  id: string;
  user_id: string;
  user_email: string;
  product_id: string;
  product_title: string;
  payment_method: "pix" | "credit_card" | "boleto";
  status: "pending" | "paid" | "failed" | "refunded";
  amount: number;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  author_anonymous: string;
  category: "geral" | "desabafo" | "duvidas" | "conquistas" | "dicas";
  title: string;
  body: string;
  is_pinned: boolean;
  is_visible: boolean;
  likes: number;
  comments_count: number;
  created_at: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_anonymous: string;
  body: string;
  likes: number;
  created_at: string;
}
