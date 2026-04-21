import { Shield, Clock, Infinity as InfinityIcon } from "lucide-react";

export const LANDING_STATS = {
  students: "280+",
  recommendation: "92%",
  rating: "4.8",
  guarantee: "7 dias",
};

export const COMMUNITY_STATS = [
  { value: "280+", label: "Alunas na comunidade" },
  { value: "Privada", label: "Acesso exclusivo" },
  { value: "92%", label: "Recomendam o espaço" },
];

export const testimonials = [
  {
    name: "Lua Crescente",
    text: "Pela primeira vez em anos me senti em casa na minha própria pele. O método da Sunyan toca onde nenhum outro chegou.",
    detail: "Módulo 3 — O Corpo como Sabedoria",
  },
  {
    name: "Violeta Silvestre",
    text: "Esse curso não te ensina sobre autoconhecimento. Ele te faz vivê-lo. É completamente diferente de qualquer coisa que já experimentei.",
    detail: "Concluiu Mulher Espiral",
  },
  {
    name: "Rosa do Deserto",
    text: "Cheguei cética. Fui transformada. A profundidade do conteúdo e o cuidado de cada aula são incomparáveis.",
    detail: "Módulo 5 — O Feminino Sagrado",
  },
];

export const steps = [
  { num: "01", title: "Reconhecer", body: "Você enxerga os padrões que te aprisionam, com olhos de compaixão — não de julgamento." },
  { num: "02", title: "Sentir", body: "O corpo fala. Aprendemos a ouvir o que ele carrega há anos em silêncio." },
  { num: "03", title: "Integrar", body: "Cada aspecto de si mesma é acolhido. A espiral avança quando você para de fugir." },
  { num: "04", title: "Despertar", body: "Não é um destino. É uma orientação. Uma forma de viver mais leve e alinhada." },
];

export const guarantees = [
  { icon: Shield, label: "7 dias de garantia", desc: "Devolução integral sem perguntas" },
  { icon: InfinityIcon, label: "Acesso vitalício", desc: "Conteúdo sempre disponível" },
  { icon: Clock, label: "Suporte humanizado", desc: "Time dedicado à sua jornada" },
];

export const faqs = [
  {
    q: "Para quem é o Mulher Espiral?",
    a: "Para mulheres que sentem que algo está faltando — mesmo quando tudo 'parece' bem por fora. Para quem carrega histórias difíceis no corpo, mas ainda acredita em transformação. Não é necessária nenhuma experiência prévia com autoconhecimento.",
  },
  {
    q: "Como funciona o acesso ao curso?",
    a: "Após a confirmação do pagamento, você recebe acesso vitalício à plataforma. Os módulos são liberados progressivamente para que você possa integrar cada etapa. Você aprende no seu ritmo, sem pressão.",
  },
  {
    q: "E se eu não me identificar com o conteúdo?",
    a: "Você tem 7 dias de garantia incondicional. Se por qualquer motivo sentir que não é o momento certo, devolvemos 100% do investimento sem burocracia e sem perguntas. Simples assim.",
  },
  {
    q: "Preciso de muito tempo disponível?",
    a: "As aulas foram criadas para a realidade da mulher moderna. Você pode progredir com 20 a 40 minutos por dia. O que importa é constância, não velocidade — a espiral avança no seu tempo.",
  },
  {
    q: "Existe suporte durante a jornada?",
    a: "Sim. Você tem acesso à comunidade exclusiva de alunas e ao suporte humanizado da nossa equipe. Ninguém percorre esse caminho sozinha.",
  },
  {
    q: "Como é feito o pagamento?",
    a: "Aceitamos PIX (aprovação instantânea), cartão de crédito em até 12× e boleto bancário. Após o pedido, você recebe as instruções detalhadas por e-mail.",
  },
];
