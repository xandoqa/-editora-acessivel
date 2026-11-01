/**
 * Prévia do Pingo, o mascote do Fale Conosco.
 *
 * Mesma ideia da prévia dos retratos: importa o desenho de verdade
 * (`web/src/components/contato/pingo.ts`) em vez de reescrevê-lo, e renderiza
 * os quatro humores em três temas, para alguém OLHAR antes de publicar.
 *
 *   node --experimental-strip-types ferramentas/previa-mascote.mjs [saida.png]
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  ARCO_FONE,
  BRILHO,
  CONCHAS,
  CORPO,
  HASTE_MIC,
  OLHOS_CHEIOS,
  ONDAS,
  REFLEXOS,
  rosto,
} from '../web/src/components/contato/pingo.ts';

const { chromium } = createRequire(import.meta.url)('playwright');
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = process.argv[2] ?? path.join(RAIZ, 'docs/design/previa-mascote.png');

const HUMORES = [
  ['oi', 'esperando'],
  ['escutando', 'enquanto escreve'],
  ['enviado', 'mensagem gravada'],
  ['ops', 'faltou alguma coisa'],
];

function pingo(humor) {
  const r = rosto(humor);
  const ondas = r.ondas
    ? ONDAS.map(
        (d, i) =>
          `<path d="${d}" fill="none" stroke="rgb(var(--c-accent))" stroke-width="3" stroke-linecap="round" opacity="${
            0.85 - i * 0.25
          }"/>`,
      ).join('')
    : '';
  const conchas = CONCHAS.map(
    (c) =>
      `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="6" fill="rgb(var(--c-accent))" stroke="rgb(var(--c-ink))" stroke-width="2.6"/>`,
  ).join('');
  const sobrancelhas = r.sobrancelhas
    ? `<g fill="none" stroke="rgb(var(--c-on-primary))" stroke-width="2.6" stroke-linecap="round"><path d="${r.sobrancelhas.esquerda}"/><path d="${r.sobrancelhas.direita}"/></g>`
    : '';
  const olhos = r.olhos
    ? `<g fill="none" stroke="rgb(var(--c-on-primary))" stroke-width="3.2" stroke-linecap="round"><path d="${r.olhos.esquerdo}"/><path d="${r.olhos.direito}"/></g>`
    : OLHOS_CHEIOS.map((o) => `<circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="rgb(var(--c-on-primary))"/>`).join('') +
      REFLEXOS.map((o) => `<circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="rgb(var(--c-primary))"/>`).join('');

  return `<svg viewBox="0 0 100 100" width="132" height="132">
    ${ondas}${conchas}
    <path d="${CORPO}" fill="rgb(var(--c-primary))" stroke="rgb(var(--c-ink))" stroke-width="3" stroke-linejoin="round"/>
    <path d="${BRILHO}" fill="rgb(var(--c-on-primary) / 0.35)"/>
    <g fill="none" stroke-linecap="round">
      <path d="${ARCO_FONE}" stroke="rgb(var(--c-ink))" stroke-width="6"/>
      <path d="${ARCO_FONE}" stroke="rgb(var(--c-accent))" stroke-width="3.2"/>
      <path d="${HASTE_MIC}" stroke="rgb(var(--c-ink))" stroke-width="5.4"/>
      <path d="${HASTE_MIC}" stroke="rgb(var(--c-accent))" stroke-width="2.8"/>
    </g>
    <circle cx="71" cy="80" r="3.6" fill="rgb(var(--c-accent))" stroke="rgb(var(--c-ink))" stroke-width="2.2"/>
    ${sobrancelhas}${olhos}
    <path d="${r.boca}" fill="none" stroke="rgb(var(--c-on-primary))" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`;
}

/** Recorta os tokens de um tema, ancorando no início da linha. */
function tokens(seletor) {
  const css = fs.readFileSync(path.join(RAIZ, 'web/src/styles/global.css'), 'utf8');
  const re = new RegExp(`^${seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`, 'm');
  const achado = re.exec(css);
  if (!achado) throw new Error(`seletor não encontrado: ${seletor}`);
  const abre = css.indexOf('{', achado.index);
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

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 760, height: 760 } });
await pagina.setContent(`<style>
  body{margin:0;font:12px system-ui}
  section{padding:22px 24px}
  .fila{display:flex;gap:26px;align-items:flex-end}
  figure{margin:0;text-align:center}
  figcaption{margin-top:8px;opacity:.85}
  figcaption b{display:block;font-size:13px}
  h2{margin:0 0 16px;font:700 11px system-ui;letter-spacing:.1em;text-transform:uppercase;opacity:.7}
</style>
${TEMAS.map(
  ([nome, vars]) =>
    `<section style="${vars};background:rgb(var(--c-bg));color:rgb(var(--c-ink))">
       <h2>${nome}</h2>
       <div class="fila">${HUMORES.map(
         ([h, legenda]) => `<figure>${pingo(h)}<figcaption><b>${h}</b>${legenda}</figcaption></figure>`,
       ).join('')}</div>
     </section>`,
).join('')}`);
fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
await pagina.screenshot({ path: SAIDA, fullPage: true });
await navegador.close();
console.log(`Prévia do mascote: ${SAIDA}`);
