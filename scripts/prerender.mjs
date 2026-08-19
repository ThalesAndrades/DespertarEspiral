// Prerender das páginas públicas — roda DEPOIS de `vite build` e de
// `vite build --ssr src/entry-server.tsx --outDir dist-ssr`.
//
// O desenho evita a armadilha clássica de SPA pré-renderizada: o
// dist/index.html continua sendo a CASCA VAZIA (é o fallback de TODAS as
// rotas do app — /login, /dashboard, /checkout/... — e se contivesse o DOM da
// landing, cada uma dessas rotas hidrataria em cima do HTML errado). As
// versões com conteúdo vivem em dist/prerender/*.html e é o .htaccess quem as
// serve nas URLs públicas (/ → prerender/home.html etc).
//
// A home mantém o <script> e é HIDRATADA. Termos e privacidade saem SEM
// script (e sem <noscript>, que ali só confundiria — o conteúdo JÁ está no
// HTML): texto legal é documento — os links navegam de volta para o SPA.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(RAIZ, "dist");
const modelo = fs.readFileSync(path.join(DIST, "index.html"), "utf-8");

const { renderPagina, renderEstatica } = await import(
  pathToFileURL(path.join(RAIZ, "dist-ssr", "entry-server.js")).href
);

const PAGINAS = [
  {
    url: "/",
    saida: "home.html",
    hidrata: true,
    titulo: null, // mantém título e metas do modelo — a home É a página do modelo
    descricao: null,
    prova: /espiral/i,
  },
  {
    url: "/termos",
    saida: "termos.html",
    hidrata: false,
    titulo: "Termos de Uso — Despertar Espiral",
    // Sem isto a página legal herda a meta/OG de VENDA da home: snippet errado
    // na busca e prévia de link dizendo "Método de Reconexão" num documento.
    descricao: "Termos de Uso do site e da plataforma Despertar Espiral.",
    prova: /termos/i,
  },
  {
    url: "/privacidade",
    saida: "privacidade.html",
    hidrata: false,
    titulo: "Política de Privacidade — Despertar Espiral",
    descricao: "Política de Privacidade do site e da plataforma Despertar Espiral.",
    prova: /privacidade/i,
  },
];

fs.mkdirSync(path.join(DIST, "prerender"), { recursive: true });

const escaparAttr = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

for (const p of PAGINAS) {
  const html = p.hidrata ? await renderPagina(p.url) : renderEstatica(p.url);
  if (!html || html.length < 500 || !p.prova.test(html)) {
    console.error(`[prerender] ${p.url} rendeu vazio ou sem o conteúdo esperado (${html.length} chars)`);
    process.exit(1);
  }

  // Replacer em FUNÇÃO, nunca string: o HTML renderizado carrega "R$ ..." e os
  // padrões $&/$'/$` de String.replace corromperiam a página em silêncio.
  let pagina = modelo.replace('<div id="root"></div>', () => `<div id="root">${html}</div>`);

  // Canonical, og:url e metas apontam para a PRÓPRIA página, não para a home.
  if (p.url !== "/") {
    const alvo = `https://despertarespiral.com${p.url}`;
    pagina = pagina
      .replace(/<link rel="canonical" href="[^"]*"/, () => `<link rel="canonical" href="${alvo}"`)
      .replace(/property="og:url" content="[^"]*"/, () => `property="og:url" content="${alvo}"`);
    if (p.titulo) {
      pagina = pagina
        .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${p.titulo}</title>`)
        .replace(/property="og:title" content="[^"]*"/, () => `property="og:title" content="${escaparAttr(p.titulo)}"`)
        .replace(/name="twitter:title" content="[^"]*"/, () => `name="twitter:title" content="${escaparAttr(p.titulo)}"`);
    }
    if (p.descricao) {
      pagina = pagina
        .replace(/name="description" content="[^"]*"/, () => `name="description" content="${escaparAttr(p.descricao)}"`)
        .replace(/property="og:description" content="[^"]*"/, () => `property="og:description" content="${escaparAttr(p.descricao)}"`)
        .replace(/name="twitter:description" content="[^"]*"/, () => `name="twitter:description" content="${escaparAttr(p.descricao)}"`);
    }
  }

  if (!p.hidrata) {
    // Documento estático de verdade: sem boot do React, sem preloads de chunk
    // e sem o <noscript> do modelo (o conteúdo já está no HTML; o aviso de
    // "habilite JavaScript" numa página que não precisa dele é ruído).
    pagina = pagina
      .replace(/\s*<script type="module"[^>]*><\/script>/g, "")
      .replace(/\s*<link rel="modulepreload"[^>]*>/g, "")
      .replace(/\s*<noscript>[\s\S]*?<\/noscript>/g, "");
  }

  // A prova final é na PÁGINA GRAVADA, não no render: se o formato do template
  // mudar e o replace do root virar no-op, é AQUI que o build quebra — nunca
  // um deploy silenciosamente vazio (o contrato deste script).
  if (pagina.includes('<div id="root"></div>') || !p.prova.test(pagina)) {
    console.error(`[prerender] ${p.url}: o template não recebeu o conteúdo (o replace do root falhou?)`);
    process.exit(1);
  }

  fs.writeFileSync(path.join(DIST, "prerender", p.saida), pagina);
  console.log(`[prerender] ${p.url} → prerender/${p.saida} (${(pagina.length / 1024).toFixed(0)}KB${p.hidrata ? ", hidratável" : ", estática"})`);
}
