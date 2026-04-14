import courseThumb1 from "@/assets/course-thumb-1.jpg";
import courseThumb2 from "@/assets/course-thumb-2.jpg";
import type { Product, CommunityPost, Order, User } from "@/types";

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    slug: "mulher-espiral",
    title: "Mulher Espiral",
    subtitle: "Método de Reconexão e Cura",
    description: "Uma jornada profunda de autoconhecimento que conduz mulheres ao reencontro com sua essência. Através de 8 módulos cuidadosamente estruturados, você percorrerá a espiral de volta para si mesma.",
    price: 497.00,
    thumbnail: courseThumb1,
    is_published: true,
    created_at: "2026-01-15T00:00:00Z",
    modules: [
      {
        id: "m1",
        product_id: "1",
        title: "O Chamado da Espiral",
        sort_order: 1,
        lessons: [
          { id: "l1", module_id: "m1", title: "Bem-vinda à sua jornada", type: "video", content: "https://www.youtube.com/embed/dQw4w9WgXcQ", sort_order: 1, is_free_preview: true },
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
          { id: "l4", module_id: "m2", title: "Padrões que nos aprisionam", type: "video", content: "https://www.youtube.com/embed/dQw4w9WgXcQ", sort_order: 1, is_free_preview: false },
          { id: "l5", module_id: "m2", title: "Mapeando sua história", type: "text", content: "<p>Para se libertar de um padrão, primeiro é preciso enxergá-lo com olhos de compaixão, não de julgamento...</p>", sort_order: 2, is_free_preview: false },
        ],
      },
      {
        id: "m3",
        product_id: "1",
        title: "O Corpo como Sabedoria",
        sort_order: 3,
        lessons: [
          { id: "l6", module_id: "m3", title: "Escutando o corpo feminino", type: "video", content: "https://www.youtube.com/embed/dQw4w9WgXcQ", sort_order: 1, is_free_preview: false },
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
    description: "Aprenda a navegar pelo mundo interior das emoções com sabedoria e leveza. Um curso transformador para quem quer reconhecer, acolher e integrar cada sentimento.",
    price: 297.00,
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
          { id: "l8", module_id: "m4", title: "Emoções como mensageiras", type: "video", content: "https://www.youtube.com/embed/dQw4w9WgXcQ", sort_order: 1, is_free_preview: true },
          { id: "l9", module_id: "m4", title: "O mapa das emoções", type: "text", content: "<p>Cada emoção carrega uma mensagem que precisa ser ouvida...</p>", sort_order: 2, is_free_preview: false },
        ],
      },
    ],
  },
];

export const MOCK_COMMUNITY_POSTS: CommunityPost[] = [
  { id: "p1", author_anonymous: "Lua Crescente", category: "conquistas", title: "Terminei o módulo 3 e me senti diferente", body: "Não sei bem como descrever, mas algo mudou. Completei as aulas do corpo e pela primeira vez em anos me senti em casa na minha própria pele.", is_pinned: true, is_visible: true, likes: 47, comments_count: 12, created_at: "2026-04-10T14:30:00Z" },
  { id: "p2", author_anonymous: "Rosa do Deserto", category: "duvidas", title: "Como lidar com a resistência ao processo?", body: "Estou na semana 2 e sinto uma resistência enorme. Parte de mim quer continuar, outra parte foge. Alguém passou por isso?", is_pinned: false, is_visible: true, likes: 31, comments_count: 8, created_at: "2026-04-12T09:15:00Z" },
  { id: "p3", author_anonymous: "Violeta Silvestre", category: "desabafo", title: "Hoje foi difícil, mas estou aqui", body: "Semana pesada no trabalho, briguei com quem amo, e mesmo assim abri o curso. Algo me chamou. Obrigada por esse espaço seguro.", is_pinned: false, is_visible: true, likes: 89, comments_count: 24, created_at: "2026-04-13T21:00:00Z" },
  { id: "p4", author_anonymous: "Cedro Dourado", category: "dicas", title: "Minha rotina de prática que faz diferença", body: "Criei o hábito de assistir uma aula por dia logo ao acordar, antes do celular. Mudou minha manhã inteira. Compartilhem as suas!", is_pinned: false, is_visible: true, likes: 55, comments_count: 19, created_at: "2026-04-11T07:00:00Z" },
  { id: "p5", author_anonymous: "Íris do Campo", category: "geral", title: "Gratidão por essa comunidade", body: "Nunca pensei que encontraria mulheres tão profundas num espaço online. Esse lugar é diferente. Obrigada a cada uma.", is_pinned: false, is_visible: true, likes: 112, comments_count: 31, created_at: "2026-04-09T18:00:00Z" },
];

export const MOCK_ORDERS: Order[] = [
  { id: "o1", user_id: "u2", user_email: "maria@example.com", product_id: "1", product_title: "Mulher Espiral", payment_method: "pix", status: "paid", amount: 497.00, created_at: "2026-04-01T10:00:00Z" },
  { id: "o2", user_id: "u3", user_email: "ana@example.com", product_id: "2", product_title: "Despertar das Emoções", payment_method: "credit_card", status: "paid", amount: 297.00, created_at: "2026-04-05T15:30:00Z" },
  { id: "o3", user_id: "u4", user_email: "julia@example.com", product_id: "1", product_title: "Mulher Espiral", payment_method: "boleto", status: "pending", amount: 497.00, created_at: "2026-04-13T08:00:00Z" },
  { id: "o4", user_id: "u5", user_email: "paula@example.com", product_id: "2", product_title: "Despertar das Emoções", payment_method: "pix", status: "paid", amount: 297.00, created_at: "2026-04-14T11:00:00Z" },
];

export const MOCK_ADMIN_USERS: User[] = [
  { id: "u1", name: "Sunyan Nunes", email: "sunyan@despertarespiral.com", role: "admin", anonymous_name: "Sunyan", created_at: "2026-01-01T00:00:00Z", products: ["mulher-espiral", "despertar-das-emocoes"] },
  { id: "u2", name: "Maria Clara", email: "maria@example.com", role: "member", anonymous_name: "Lua Crescente", created_at: "2026-04-01T10:00:00Z", products: ["mulher-espiral"] },
  { id: "u3", name: "Ana Beatriz", email: "ana@example.com", role: "member", anonymous_name: "Rosa do Deserto", created_at: "2026-04-05T15:30:00Z", products: ["despertar-das-emocoes"] },
  { id: "u4", name: "Júlia Santos", email: "julia@example.com", role: "member", anonymous_name: "Violeta Silvestre", created_at: "2026-04-13T08:00:00Z", products: [] },
  { id: "u5", name: "Paula Mendes", email: "paula@example.com", role: "member", anonymous_name: "Cedro Dourado", created_at: "2026-04-14T11:00:00Z", products: ["despertar-das-emocoes"] },
];


