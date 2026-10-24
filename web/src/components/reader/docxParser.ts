/**
 * Leitura de .docx no navegador, sem biblioteca nova.
 *
 * Um .docx é um ZIP cujo texto mora em `word/document.xml`. O projeto já traz
 * JSZip (usado pelo leitor de CBZ) e o navegador já traz DOMParser, então a
 * conversão não custa nenhuma dependência.
 *
 * O que sai daqui é ESTRUTURA, não HTML: blocos tipados que o React desenha
 * como componentes. Isso não é preciosismo — devolver HTML de um arquivo
 * enviado por terceiros obrigaria a higienizar a marcação antes de injetar, e
 * um erro nessa higienização vira execução de script na página de quem lê.
 * Gerando a estrutura nós mesmos, não existe marcação para injetar.
 *
 * Vantagem de acessibilidade: diferente do PDF, que é imagem com uma camada de
 * texto por cima, o .docx vira texto de verdade — reflui, aceita a tipografia
 * escolhida pelo leitor e é lido na ordem certa por leitor de tela.
 */

/** Namespace do WordprocessingML. */
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export interface TrechoDocx {
  texto: string;
  negrito?: boolean;
  italico?: boolean;
}

export type BlocoDocx =
  | { tipo: 'titulo'; nivel: 1 | 2 | 3; trechos: TrechoDocx[] }
  | { tipo: 'paragrafo'; trechos: TrechoDocx[] }
  | { tipo: 'item'; nivel: number; trechos: TrechoDocx[] }
  | { tipo: 'tabela'; linhas: string[][] };

/** Filhos diretos com um nome local, ignorando o prefixo do namespace. */
function filhos(no: Element, nome: string): Element[] {
  const saida: Element[] = [];
  for (let i = 0; i < no.children.length; i++) {
    const filho = no.children[i];
    if (filho.localName === nome) saida.push(filho);
  }
  return saida;
}

function primeiro(no: Element, nome: string): Element | null {
  for (let i = 0; i < no.children.length; i++) {
    if (no.children[i].localName === nome) return no.children[i];
  }
  return null;
}

/** Nível de título a partir do estilo do parágrafo ("Heading2", "Ttulo2"...). */
function nivelDeTitulo(pPr: Element | null): 1 | 2 | 3 | null {
  if (!pPr) return null;
  const estilo = primeiro(pPr, 'pStyle');
  const valor = estilo?.getAttributeNS(W, 'val') ?? estilo?.getAttribute('w:val') ?? '';
  const m = /^(?:heading|ttulo|titulo|t[ií]tulo)\s*(\d)/i.exec(valor.replace(/[\s_-]/g, ''));
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 3 ? (n as 1 | 2 | 3) : 3;
}

/** Os trechos de texto de um parágrafo, preservando negrito e itálico. */
function trechosDoParagrafo(p: Element): TrechoDocx[] {
  const trechos: TrechoDocx[] = [];
  for (const run of filhos(p, 'r')) {
    const rPr = primeiro(run, 'rPr');
    const negrito = !!(rPr && primeiro(rPr, 'b'));
    const italico = !!(rPr && primeiro(rPr, 'i'));
    let texto = '';
    for (let i = 0; i < run.children.length; i++) {
      const filho = run.children[i];
      if (filho.localName === 't') texto += filho.textContent ?? '';
      else if (filho.localName === 'tab') texto += '\t';
      else if (filho.localName === 'br') texto += '\n';
    }
    if (!texto) continue;
    const anterior = trechos[trechos.length - 1];
    // Junta trechos vizinhos com a mesma formatação: o Word quebra uma frase em
    // vários runs por motivos internos (revisão ortográfica, por exemplo).
    if (anterior && !!anterior.negrito === negrito && !!anterior.italico === italico) {
      anterior.texto += texto;
    } else {
      trechos.push({ texto, ...(negrito && { negrito }), ...(italico && { italico }) });
    }
  }
  return trechos;
}

function paragrafoParaBloco(p: Element): BlocoDocx | null {
  const trechos = trechosDoParagrafo(p);
  if (!trechos.length || !trechos.some((t) => t.texto.trim())) return null;

  const pPr = primeiro(p, 'pPr');
  const nivel = nivelDeTitulo(pPr);
  if (nivel) return { tipo: 'titulo', nivel, trechos };

  const numPr = pPr ? primeiro(pPr, 'numPr') : null;
  if (numPr) {
    const ilvl = primeiro(numPr, 'ilvl');
    const bruto = ilvl?.getAttributeNS(W, 'val') ?? ilvl?.getAttribute('w:val') ?? '0';
    const n = Number.parseInt(bruto, 10);
    return { tipo: 'item', nivel: Number.isFinite(n) ? Math.min(Math.max(n, 0), 3) : 0, trechos };
  }

  return { tipo: 'paragrafo', trechos };
}

function tabelaParaBloco(tbl: Element): BlocoDocx | null {
  const linhas: string[][] = [];
  for (const tr of filhos(tbl, 'tr')) {
    const celulas: string[] = [];
    for (const tc of filhos(tr, 'tc')) {
      const partes = filhos(tc, 'p')
        .map((p) => trechosDoParagrafo(p).map((t) => t.texto).join(''))
        .filter(Boolean);
      celulas.push(partes.join(' ').trim());
    }
    if (celulas.some((c) => c)) linhas.push(celulas);
  }
  return linhas.length ? { tipo: 'tabela', linhas } : null;
}

/** Converte o XML do documento em blocos. Lança se o XML não for válido. */
export function blocosDoDocumentXml(xml: string): BlocoDocx[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('XML do documento inválido');

  const corpo = doc.getElementsByTagNameNS(W, 'body')[0] ?? doc.documentElement;
  const blocos: BlocoDocx[] = [];
  for (let i = 0; i < corpo.children.length; i++) {
    const no = corpo.children[i];
    const bloco = no.localName === 'p' ? paragrafoParaBloco(no) : no.localName === 'tbl' ? tabelaParaBloco(no) : null;
    if (bloco) blocos.push(bloco);
  }
  return blocos;
}

/**
 * Um .docx não tem páginas: a paginação é do programa que imprime, não do
 * arquivo. O leitor do Livrin navega por página, então os blocos são agrupados
 * em telas de tamanho parecido. Um título nunca fica sozinho no fim de uma
 * tela — é o que um livro impresso também evita.
 */
export const BLOCOS_POR_PAGINA = 14;

export function paginar(blocos: BlocoDocx[], porPagina = BLOCOS_POR_PAGINA): BlocoDocx[][] {
  const paginas: BlocoDocx[][] = [];
  let atual: BlocoDocx[] = [];
  for (let i = 0; i < blocos.length; i++) {
    const bloco = blocos[i];
    const ultimoDaPagina = atual.length >= porPagina - 1;
    // Título que cairia na última linha começa a página seguinte.
    if (ultimoDaPagina && bloco.tipo === 'titulo' && atual.length) {
      paginas.push(atual);
      atual = [];
    }
    atual.push(bloco);
    if (atual.length >= porPagina) {
      paginas.push(atual);
      atual = [];
    }
  }
  if (atual.length) paginas.push(atual);
  return paginas.length ? paginas : [[]];
}
