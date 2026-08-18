import type { Pilar } from "@/lib/bussola";

/**
 * ⚠️ CONTEUDO PROVISORIO — rascunho derivado dos blueprints da marca.
 * Gate de publicacao: a Sunyan revisa cada pergunta, opcao e leitura de
 * arquetipo e vira esta flag para false na mesma alteracao em que aprovar.
 * O quiz NAO deve ser divulgado enquanto isto for true.
 */
export const CONTEUDO_PROVISORIO = true;
export const CONTENT_VERSION = "v1-provisorio";

export interface OpcaoQuiz {
  id: string;
  texto: string;
  pilar: Pilar;
}

export interface PerguntaQuiz {
  id: string;
  texto: string;
  opcoes: OpcaoQuiz[];
}

export interface Arquetipo {
  pilar: Pilar;
  nome: string;
  titulo: string;
  leitura: string;
  convite: string;
}

export const PERGUNTAS: PerguntaQuiz[] = [
  {
    id: "q1",
    texto: "Quando você acorda, qual é o primeiro sentimento que costuma aparecer?",
    opcoes: [
      { id: "q1a", pilar: "consciencia", texto: "Uma neblina — sigo no automático sem me perguntar como estou" },
      { id: "q1b", pilar: "reconexao", texto: "Uma saudade de mim mesma que não sei nomear" },
      { id: "q1c", pilar: "ativacao", texto: "Vontade de mudar tudo, que se dissolve antes do café" },
      { id: "q1d", pilar: "integracao", texto: "Clareza do que preciso, mas os dias não se conectam" },
    ],
  },
  {
    id: "q2",
    texto: "O que mais pesa na sua rotina hoje?",
    opcoes: [
      { id: "q2a", pilar: "consciencia", texto: "Viver reagindo — os dias decidem por mim" },
      { id: "q2b", pilar: "reconexao", texto: "Cuidar de todo mundo e nunca sobrar para mim" },
      { id: "q2c", pilar: "ativacao", texto: "Saber o que quero e não conseguir começar" },
      { id: "q2d", pilar: "integracao", texto: "Começar mil coisas e não sustentar nenhuma" },
    ],
  },
  {
    id: "q3",
    texto: "Quando algo te machuca, o que você costuma fazer?",
    opcoes: [
      { id: "q3a", pilar: "consciencia", texto: "Sigo em frente sem olhar — nem percebo que doeu" },
      { id: "q3b", pilar: "reconexao", texto: "Guardo para não incomodar ninguém" },
      { id: "q3c", pilar: "ativacao", texto: "Prometo que vou mudar, mas fico onde estou" },
      { id: "q3d", pilar: "integracao", texto: "Entendo a dor, mas ela volta nos mesmos ciclos" },
    ],
  },
  {
    id: "q4",
    texto: "Como está a sua relação com o próprio corpo?",
    opcoes: [
      { id: "q4a", pilar: "consciencia", texto: "Só o escuto quando ele grita — dor, cansaço, insônia" },
      { id: "q4b", pilar: "reconexao", texto: "Sinto que moro do pescoço para cima" },
      { id: "q4c", pilar: "ativacao", texto: "Sei o que ele pede, mas nunca é prioridade" },
      { id: "q4d", pilar: "integracao", texto: "Cuido em fases: semanas de presença, meses de abandono" },
    ],
  },
  {
    id: "q5",
    texto: "Qual frase mais parece sua?",
    opcoes: [
      { id: "q5a", pilar: "consciencia", texto: "\"Nem sei o que eu sinto, de verdade.\"" },
      { id: "q5b", pilar: "reconexao", texto: "\"Eu me perdi em algum lugar do caminho.\"" },
      { id: "q5c", pilar: "ativacao", texto: "\"Falta coragem para fazer o que eu já sei.\"" },
      { id: "q5d", pilar: "integracao", texto: "\"Eu sei tanto e vivo tão pouco do que sei.\"" },
    ],
  },
  {
    id: "q6",
    texto: "Nos relacionamentos, o padrão que mais se repete é…",
    opcoes: [
      { id: "q6a", pilar: "consciencia", texto: "Só percebo que estava infeliz depois que acaba" },
      { id: "q6b", pilar: "reconexao", texto: "Desapareço para caber no outro" },
      { id: "q6c", pilar: "ativacao", texto: "Vejo o problema e adio a conversa que precisava ter" },
      { id: "q6d", pilar: "integracao", texto: "Melhoro por um tempo e volto ao mesmo lugar" },
    ],
  },
  {
    id: "q7",
    texto: "O que você faz com a sua intuição?",
    opcoes: [
      { id: "q7a", pilar: "consciencia", texto: "Intuição? O barulho de fora é mais alto que qualquer voz de dentro" },
      { id: "q7b", pilar: "reconexao", texto: "Eu a sinto, mas desconfio dela — peço opinião de todo mundo" },
      { id: "q7c", pilar: "ativacao", texto: "Ela fala claro e eu finjo que não ouvi" },
      { id: "q7d", pilar: "integracao", texto: "Confio em dias bons, traio em dias difíceis" },
    ],
  },
  {
    id: "q8",
    texto: "Quando aparece um tempo só seu, o que acontece?",
    opcoes: [
      { id: "q8a", pilar: "consciencia", texto: "Preencho com tela, tarefa, qualquer coisa — silêncio incomoda" },
      { id: "q8b", pilar: "reconexao", texto: "Não sei mais o que eu gosto de fazer sozinha" },
      { id: "q8c", pilar: "ativacao", texto: "Planejo coisas incríveis que não saem do papel" },
      { id: "q8d", pilar: "integracao", texto: "Uso bem às vezes, mas sem constância" },
    ],
  },
  {
    id: "q9",
    texto: "A palavra que melhor descreve sua energia hoje:",
    opcoes: [
      { id: "q9a", pilar: "consciencia", texto: "Anestesiada" },
      { id: "q9b", pilar: "reconexao", texto: "Fragmentada" },
      { id: "q9c", pilar: "ativacao", texto: "Represada" },
      { id: "q9d", pilar: "integracao", texto: "Intermitente" },
    ],
  },
  {
    id: "q10",
    texto: "O que você mais teme, se nada mudar?",
    opcoes: [
      { id: "q10a", pilar: "consciencia", texto: "Chegar ao fim sem ter percebido a própria vida" },
      { id: "q10b", pilar: "reconexao", texto: "Nunca mais reencontrar quem eu era" },
      { id: "q10c", pilar: "ativacao", texto: "Morrer com a música ainda dentro de mim" },
      { id: "q10d", pilar: "integracao", texto: "Saber tudo sobre mim e continuar vivendo igual" },
    ],
  },
  {
    id: "q11",
    texto: "Se a sua vida fosse uma casa, ela estaria…",
    opcoes: [
      { id: "q11a", pilar: "consciencia", texto: "Com as luzes apagadas — moro nela sem ver" },
      { id: "q11b", pilar: "reconexao", texto: "Cheia de gente, menos de mim" },
      { id: "q11c", pilar: "ativacao", texto: "Com a reforma pronta no papel há anos" },
      { id: "q11d", pilar: "integracao", texto: "Com cômodos lindos que não conversam entre si" },
    ],
  },
  {
    id: "q12",
    texto: "O que você espera encontrar do outro lado desta jornada?",
    opcoes: [
      { id: "q12a", pilar: "consciencia", texto: "Acordar — ver com clareza o que estou vivendo" },
      { id: "q12b", pilar: "reconexao", texto: "Voltar para mim — habitar meu corpo e minha história" },
      { id: "q12c", pilar: "ativacao", texto: "Coragem — transformar clareza em movimento" },
      { id: "q12d", pilar: "integracao", texto: "Consistência — fazer a mudança durar" },
    ],
  },
];

export const ARQUETIPOS: Record<Pilar, Arquetipo> = {
  consciencia: {
    pilar: "consciencia",
    nome: "A Adormecida",
    titulo: "Seu pilar travado é a Consciência",
    leitura:
      "Você aprendeu a funcionar — e funcionar virou anestesia. Os dias passam no automático e a sua vida acontece sem testemunha. A Adormecida não está quebrada: está protegida por um sono que um dia foi necessário. O primeiro movimento da espiral não é mudar nada. É acordar e VER — sem julgamento, sem pressa. A clareza que você teme é a mesma que vai te devolver a vida.",
    convite: "O Sete Manhãs foi desenhado exatamente para isto: sete despertares guiados, dez minutos por manhã.",
  },
  reconexao: {
    pilar: "reconexao",
    nome: "A Exilada",
    titulo: "Seu pilar travado é a Reconexão",
    leitura:
      "Você sabe exatamente onde todo mundo está — menos você. Em algum ponto do caminho, caber na vida dos outros custou o seu próprio endereço interno. A Exilada não se perdeu por fraqueza: ela se doou até sumir. A volta não é dramática; é feita de pequenos reencontros — com o corpo, com o gosto, com a voz que ficou de fora. Você não precisa se reinventar. Precisa se REENCONTRAR.",
    convite: "O Sete Manhãs é um caminho de volta: sete manhãs em que a prioridade, pela primeira vez em anos, é você.",
  },
  ativacao: {
    pilar: "ativacao",
    nome: "A Represada",
    titulo: "Seu pilar travado é a Ativação",
    leitura:
      "Clareza você tem. Livros, terapias, insights — o mapa está desenhado há anos. O que falta não é saber: é ATRAVESSAR. A Represada acumula força atrás de um dique de medo que se disfarça de prudência, de timing, de 'depois'. E força represada, com o tempo, vira ansiedade. A espiral não pede o salto gigante que você imagina — pede o primeiro passo pequeno, dado HOJE, com o corpo junto.",
    convite: "O Sete Manhãs transforma intenção em movimento: uma prática pequena por dia, sete dias seguidos. Começar é o método.",
  },
  integracao: {
    pilar: "integracao",
    nome: "A Intermitente",
    titulo: "Seu pilar travado é a Integração",
    leitura:
      "Você já acordou, já se reencontrou, já se moveu — em ondas. O seu desafio não é começar: é SUSTENTAR. A Intermitente vive ciclos de presença intensa seguidos de recaídas no automático, e cada recaída cobra um imposto de culpa que atrasa o próximo ciclo. A espiral tem uma notícia para você: a recaída faz parte da subida. O que muda tudo não é intensidade — é ritmo. Pequeno, diário, gentil.",
    convite: "O Sete Manhãs instala exatamente esse ritmo: sete dias de constância guiada, sem punição por tropeço.",
  },
};
