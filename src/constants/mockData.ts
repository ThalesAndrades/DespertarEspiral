import courseThumb2 from "@/assets/course-thumb-2.jpg";
import mulherEspiralProduct from "@/assets/mulher-espiral-hero.jpg";
import type { Product, CommunityPost, Order, User } from "@/types";

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    slug: "mulher-espiral",
    title: "Mulher Espiral",
    subtitle: "Método de Reconexão e Cura",
    description: "Uma jornada guiada de autoconhecimento feminino com aulas práticas, reflexões e integrações simples para o dia a dia.",
    price: 497.00,
    thumbnail: mulherEspiralProduct,
    is_published: true,
    created_at: "2026-01-15T00:00:00Z",
    modules: [
      {
        id: "m1",
        product_id: "1",
        title: "O Chamado da Espiral",
        sort_order: 1,
        lessons: [
          { id: "l1", module_id: "m1", title: "Bem-vinda à sua jornada", type: "video", content: "https://player.vimeo.com/video/76979871", sort_order: 1, is_free_preview: true },
          { id: "l2", module_id: "m1", title: "O que é a espiral de reconexão", type: "text", content: "<p>A espiral não é um retorno ao passado. É um aprofundamento da consciência que já existe em você...</p><p>Cada volta da espiral representa um nível mais profundo de autoconhecimento e integração.</p>", sort_order: 2, is_free_preview: false },
          { id: "l3", module_id: "m1", title: "Diário da jornada (PDF)", type: "pdf", content: "https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF1.pdf", sort_order: 3, is_free_preview: false },
        ],
      },
      {
        id: "m2",
        product_id: "1",
        title: "Reconhecendo Padrões",
        sort_order: 2,
        lessons: [
          { id: "l4", module_id: "m2", title: "Padrões que nos aprisionam", type: "video", content: "https://player.vimeo.com/video/76979871", sort_order: 1, is_free_preview: false },
          { id: "l5", module_id: "m2", title: "Mapeando sua história", type: "text", content: "<p>Para se libertar de um padrão, primeiro é preciso enxergá-lo com olhos de compaixão, não de julgamento...</p>", sort_order: 2, is_free_preview: false },
        ],
      },
      {
        id: "m3",
        product_id: "1",
        title: "O Corpo como Sabedoria",
        sort_order: 3,
        lessons: [
          { id: "l6", module_id: "m3", title: "Escutando o corpo feminino", type: "video", content: "https://player.vimeo.com/video/76979871", sort_order: 1, is_free_preview: false },
          { id: "l7", module_id: "m3", title: "Meditação guiada — Enraizamento", type: "audio", content: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", sort_order: 2, is_free_preview: false },
        ],
      },
    ],
  },
  {
    id: "2",
    slug: "despertar-das-emocoes",
    title: "Despertar das Emoções",
    subtitle: "Inteligência Emocional Feminina",
    description: "Um percurso leve e objetivo para reconhecer emoções, compreender padrões e responder com mais presença no cotidiano.",
    price: 247.00,
    thumbnail: courseThumb2,
    is_published: true,
    created_at: "2026-02-20T00:00:00Z",
    modules: [
      {
        id: "m4",
        product_id: "2",
        title: "Fundamentos Emocionais",
        sort_order: 1,
        lessons: [
          { id: "l8", module_id: "m4", title: "Emoções como mensageiras", type: "video", content: "https://player.vimeo.com/video/76979871", sort_order: 1, is_free_preview: true },
          { id: "l9", module_id: "m4", title: "O mapa das emoções", type: "text", content: "<p>Cada emoção carrega uma mensagem que precisa ser ouvida...</p>", sort_order: 2, is_free_preview: false },
        ],
      },
    ],
  },
];

export const MOCK_COMMUNITY_POSTS: CommunityPost[] = [
  { id: "p1", author_anonymous: "Lua Crescente", category: "conquistas", title: "Terminei o módulo 3 e percebi uma mudança real", body: "Concluí as aulas do corpo nesta semana e senti mais clareza para lidar com minhas emoções no dia a dia.", is_pinned: true, is_visible: true, likes: 12, comments_count: 4, created_at: "2026-04-10T14:30:00Z" },
  { id: "p2", author_anonymous: "Rosa do Deserto", category: "duvidas", title: "Como lidar com a resistência ao processo?", body: "Estou no começo da jornada e notei muita resistência para manter constância. Alguém viveu isso também?", is_pinned: false, is_visible: true, likes: 7, comments_count: 3, created_at: "2026-04-12T09:15:00Z" },
  { id: "p3", author_anonymous: "Violeta Silvestre", category: "desabafo", title: "Hoje foi difícil, mas eu apareci", body: "A semana foi intensa e mesmo assim consegui assistir uma aula e escrever duas linhas no diário. Já foi importante para mim.", is_pinned: false, is_visible: true, likes: 15, comments_count: 5, created_at: "2026-04-13T21:00:00Z" },
  { id: "p4", author_anonymous: "Cedro Dourado", category: "dicas", title: "Uma prática curta que me ajudou", body: "Reservei 20 minutos antes de dormir para revisar uma aula e respirar sem pressa. Fez diferença na minha semana.", is_pinned: false, is_visible: true, likes: 9, comments_count: 2, created_at: "2026-04-11T07:00:00Z" },
  { id: "p5", author_anonymous: "Íris do Campo", category: "geral", title: "Feliz por encontrar esse espaço", body: "É bom poder compartilhar a jornada com outras mulheres sem sentir cobrança ou comparação o tempo todo.", is_pinned: false, is_visible: true, likes: 18, comments_count: 6, created_at: "2026-04-09T18:00:00Z" },
];

export const MOCK_ORDERS: Order[] = [
  { id: "o1", user_id: "u2", user_email: "maria.clara@provedor.com.br", product_id: "1", product_title: "Mulher Espiral", payment_method: "pix", status: "paid", amount: 497.00, created_at: "2026-04-01T10:00:00Z" },
  { id: "o2", user_id: "u3", user_email: "ana.beatriz@provedor.com.br", product_id: "2", product_title: "Despertar das Emoções", payment_method: "credit_card", status: "paid", amount: 247.00, created_at: "2026-04-05T15:30:00Z" },
  { id: "o3", user_id: "u4", user_email: "julia.santos@provedor.com.br", product_id: "1", product_title: "Mulher Espiral", payment_method: "boleto", status: "pending", amount: 497.00, created_at: "2026-04-13T08:00:00Z" },
  { id: "o4", user_id: "u5", user_email: "paula.mendes@provedor.com.br", product_id: "2", product_title: "Despertar das Emoções", payment_method: "pix", status: "paid", amount: 247.00, created_at: "2026-04-14T11:00:00Z" },
];

export const MOCK_ADMIN_USERS: User[] = [
  { id: "u1", name: "Sunyan Nunes", email: "sunyan@despertarespiral.com", role: "admin", anonymous_name: "Sunyan", created_at: "2026-01-01T00:00:00Z", products: ["mulher-espiral", "despertar-das-emocoes"] },
  { id: "u2", name: "Maria Clara", email: "maria.clara@provedor.com.br", role: "member", anonymous_name: "Lua Crescente", created_at: "2026-04-01T10:00:00Z", products: ["mulher-espiral"] },
  { id: "u3", name: "Ana Beatriz", email: "ana.beatriz@provedor.com.br", role: "member", anonymous_name: "Rosa do Deserto", created_at: "2026-04-05T15:30:00Z", products: ["despertar-das-emocoes"] },
  { id: "u4", name: "Júlia Santos", email: "julia.santos@provedor.com.br", role: "member", anonymous_name: "Violeta Silvestre", created_at: "2026-04-13T08:00:00Z", products: [] },
  { id: "u5", name: "Paula Mendes", email: "paula.mendes@provedor.com.br", role: "member", anonymous_name: "Cedro Dourado", created_at: "2026-04-14T11:00:00Z", products: ["despertar-das-emocoes"] },
];
