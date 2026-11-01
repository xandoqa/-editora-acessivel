/**
 * Prévia dos retratos de autoria.
 *
 * Gera uma folha de contato com os retratos do acervo de demonstração em dois
 * temas, para alguém OLHAR antes de publicar. Existe porque a primeira versão
 * do desenho tinha um erro que nenhum teste pegaria: o arco dos ombros era um
 * semicírculo e subia até a altura da cabeça, transformando o busto numa pera.
 * CSS válido, SVG válido, tipos válidos — e o desenho errado.
 *
 * O ponto importante: este arquivo **importa o desenho de verdade**
 * (`web/src/components/autores/retrato.ts`) em vez de reescrevê-lo. Uma cópia à
 * mão divergiria no primeiro ajuste, e a prévia passaria a mostrar um retrato
 * que o site não desenha.
 *
 *   node --experimental-strip-types ferramentas/previa-retratos.mjs [saida.png]
 *
 * Precisa do Playwright (já instalado para os testes de ponta a ponta) e do
 * Node 22+, pela leitura direta do TypeScript.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { montarRetrato } from '../web/src/components/autores/retrato.ts';

// O Playwright está instalado no ambiente, não no projeto: `createRequire`
// acha o pacote onde o Node o acha para CommonJS, sem exigir instalação local.
const { chromium } = createRequire(import.meta.url)('playwright');

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = process.argv[2] ?? path.join(RAIZ, 'docs/design/previa-retratos.png');

/** Nomes do acervo de demonstração, mais alguns para ver a variedade. */
const NOMES = [
  'Marina Bastos',
  'Lorena Campolina',
  'Eloá Santana',
  'Cauã Pataxó',
  'Marina Duarte',
  'Tiago Medeiros',
  'Ana Ribeiro',
  'Bruno Sales',
  'Carla Meireles',
  'Diego Antunes',
  'Elisa Prado',
  'Fábio Nunes',
];

/** Os mesmos ornamentos do componente, em string. */
function ornamento(v, cor) {
  const f = `rgb(var(${cor}))`;
  switch (v) {
    case 0:
      return `<g fill="${f}"><rect x="11" y="17" width="18" height="3.4" rx="1.7"/><rect x="11" y="24" width="12" height="3.4" rx="1.7"/><rect x="11" y="31" width="15" height="3.4" rx="1.7"/></g>`;
    case 1:
      return `<path d="M82 15a13 13 0 1 0 0 22 16 16 0 0 1 0-22Z" fill="${f}"/>`;
    case 2:
      return `<g fill="${f}" stroke="${f}" stroke-width="1.1"><path d="M80 19 88 30M80 19 72 30"/><circle cx="80" cy="19" r="3.4"/><circle cx="88" cy="30" r="2.2"/><circle cx="72" cy="30" r="1.8"/></g>`;
    case 3:
      return `<path d="M80 13 92 35H68Z" fill="${f}"/>`;
    case 4:
      return `<g fill="none" stroke="${f}" stroke-width="3" stroke-linecap="round"><path d="M76 19q6 8 0 16"/><path d="M84 14q10 13 0 26"/></g>`;
    default:
      return `<g fill="none" stroke="${f}" stroke-width="3" stroke-linecap="round"><path d="M13 35a12 12 0 0 1 24 0"/><path d="M21 35a4 4 0 0 1 8 0"/></g>`;
  }
}

function svg(nome) {
  const r = montarRetrato(nome);
  const { fundo, figura, ornamento: orn } = r.paleta;
  const id = `r${nome.replace(/[^a-zA-Z0-9]/g, '')}${r.ornamento}${r.chao}`;
  return `<svg viewBox="0 0 100 100" width="104" height="104" role="img" aria-label="${nome}">
    <defs><clipPath id="${id}"><circle cx="50" cy="50" r="50"/></clipPath></defs>
    <g clip-path="url(#${id})">
      <rect width="100" height="100" fill="rgb(var(${fundo}))"/>
      <rect y="${100 - r.chao}" width="100" height="${r.chao}" fill="rgb(var(${figura}) / 0.14)"/>
      ${r.halo ? `<circle cx="50" cy="42" r="30" fill="none" stroke="rgb(var(${orn}) / 0.35)" stroke-width="2.5"/>` : ''}
      <path d="${r.ombros}" fill="rgb(var(${figura}))"/>
      <path d="${r.gola}" fill="none" stroke="rgb(var(${fundo}))" stroke-width="3" stroke-linecap="round"/>
      <path d="${r.cabeca}" fill="rgb(var(${figura}))"/>
      <path d="${r.brilho}" fill="rgb(var(${fundo}) / 0.45)"/>
      ${ornamento(r.ornamento, orn)}
    </g>
    <circle cx="50" cy="50" r="48.5" fill="none" stroke="rgb(var(--c-outline) / 0.55)" stroke-width="3"/>
  </svg>`;
}

/** Recorta o corpo de um bloco de regras do global.css. */
function tokens(seletor) {
  const css = fs.readFileSync(path.join(RAIZ, 'web/src/styles/global.css'), 'utf8');
  // A busca é ancorada no INÍCIO DA LINHA seguida de `{`. Procurar o seletor
  // solto achava a primeira menção a ele, que está num comentário lá em cima
  // explicando o sistema de temas — e aí os três temas saíam com as cores do
  // primeiro bloco, idênticos.
  const re = new RegExp(`^${seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`, 'm');
  const achado = re.exec(css);
  if (!achado) throw new Error(`seletor não encontrado no global.css: ${seletor}`);
  const abre = css.indexOf('{', achado.index);
  // Os comentários precisam sair: um /* ... */ dentro de um atributo `style`
  // invalida a lista de declarações inteira, e os três temas saem idênticos.
  // Foi o que aconteceu na primeira prévia.
  return css
    .slice(abre + 1, css.indexOf('\n}', abre))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const TEMAS = [
  ['Papel (claro, padrão)', tokens(':root')],
  ['Noite (escuro)', tokens(':root.tema-escuro')],
  ['Alto contraste', tokens(':root.hc')],
];

const galeria = (nomes) =>
  nomes.map((n) => `<figure>${svg(n)}<figcaption>${n}</figcaption></figure>`).join('');

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1340, height: 900 } });
await pagina.setContent(`<style>
  body{margin:0;font:12px system-ui}
  section{padding:20px 22px}
  .grade{display:flex;flex-wrap:wrap;gap:16px}
  figure{margin:0;width:104px;text-align:center}
  figcaption{margin-top:6px;opacity:.85}
  h2{margin:0 0 14px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;opacity:.7}
</style>
${TEMAS.map(
  ([nome, vars], i) =>
    `<section style="${vars};background:rgb(var(--c-bg));color:rgb(var(--c-ink))">
       <h2>${i + 1}. ${nome}</h2><div class="grade">${galeria(NOMES)}</div></section>`,
).join('')}`);
fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
await pagina.screenshot({ path: SAIDA, fullPage: true });
await navegador.close();
console.log(`Prévia dos retratos: ${SAIDA}`);
