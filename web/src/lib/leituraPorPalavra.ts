import { speak, stopSpeaking } from './speech';

/**
 * Leitura palavra a palavra.
 *
 * O modo anterior lia a página inteira de uma vez: a pessoa apertava o
 * alto-falante e recebia alguns minutos de texto corrido, sem controle sobre
 * onde estava. Para quem usa a leitura em voz alta como apoio — baixa visão,
 * dislexia, leitura em outro idioma —, o que serve é o contrário: ouvir
 * exatamente a palavra que se está olhando, no ritmo de quem lê.
 *
 * Duas entradas, de propósito:
 *
 *  - **Mouse:** a palavra sob o ponteiro é falada. Encontrar qual palavra está
 *    sob um ponto da tela não exige envolver cada palavra num elemento: o
 *    navegador responde isso com `caretPositionFromPoint` (padrão, Firefox e
 *    Chrome recente) ou `caretRangeFromPoint` (Chrome e Safari). Nenhuma
 *    alteração no HTML da página, e funciona sobre qualquer texto.
 *
 *  - **Teclado:** as setas ← → andam palavra a palavra pelo conteúdo. Isso
 *    não é enfeite. Um recurso de acessibilidade que só funcionasse com o
 *    mouse excluiria justamente quem não usa mouse, e reprovaria no critério
 *    WCAG 2.1.1. A palavra corrente é selecionada de verdade (API de seleção),
 *    então ela fica visível sem precisar inserir marcação na página.
 */

/** Limites de uma palavra dentro de um nó de texto. */
function limitesDaPalavra(texto: string, posicao: number): [number, number] | null {
  // \p{L} cobre letras acentuadas; \p{N}, números. Hífen e apóstrofo mantêm
  // "guarda-chuva" e "d'água" inteiros.
  const ehPalavra = (c: string) => /[\p{L}\p{N}’'-]/u.test(c);
  if (!texto.length) return null;

  let i = Math.min(Math.max(posicao, 0), texto.length - 1);
  if (!ehPalavra(texto[i])) {
    // Clicou no espaço entre palavras: tenta a da esquerda.
    if (i > 0 && ehPalavra(texto[i - 1])) i -= 1;
    else return null;
  }
  let inicio = i;
  let fim = i + 1;
  while (inicio > 0 && ehPalavra(texto[inicio - 1])) inicio -= 1;
  while (fim < texto.length && ehPalavra(texto[fim])) fim += 1;
  return [inicio, fim];
}

/** O nó de texto e o deslocamento sob um ponto da tela, nos dois dialetos. */
function pontoParaTexto(x: number, y: number): { no: Text; deslocamento: number } | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  if (typeof d.caretPositionFromPoint === 'function') {
    const pos = d.caretPositionFromPoint(x, y);
    if (pos && pos.offsetNode.nodeType === Node.TEXT_NODE) {
      return { no: pos.offsetNode as Text, deslocamento: pos.offset };
    }
    return null;
  }
  if (typeof d.caretRangeFromPoint === 'function') {
    const range = d.caretRangeFromPoint(x, y);
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
      return { no: range.startContainer as Text, deslocamento: range.startOffset };
    }
  }
  return null;
}

/** Nós de texto visíveis dentro de uma raiz, na ordem de leitura. */
function nosDeTexto(raiz: HTMLElement): Text[] {
  const saida: Text[] = [];
  const caminhante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode(no) {
      if (!no.nodeValue || !no.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const pai = no.parentElement;
      if (!pai) return NodeFilter.FILTER_REJECT;
      // Fora: o que não se lê (script, style) e o que está escondido —
      // inclusive o texto só-para-leitor-de-tela, que seria dito duas vezes.
      if (pai.closest('script, style, [aria-hidden="true"], .sr-only')) return NodeFilter.FILTER_REJECT;
      const estilo = window.getComputedStyle(pai);
      if (estilo.display === 'none' || estilo.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let atual = caminhante.nextNode();
  while (atual) {
    saida.push(atual as Text);
    atual = caminhante.nextNode();
  }
  return saida;
}

export interface Palavra {
  texto: string;
  no: Text;
  inicio: number;
  fim: number;
}

/** Todas as palavras da raiz, na ordem em que são lidas. */
export function palavrasDe(raiz: HTMLElement): Palavra[] {
  const palavras: Palavra[] = [];
  for (const no of nosDeTexto(raiz)) {
    const texto = no.nodeValue ?? '';
    for (const m of texto.matchAll(/[\p{L}\p{N}’'-]+/gu)) {
      if (m.index === undefined) continue;
      palavras.push({ texto: m[0], no, inicio: m.index, fim: m.index + m[0].length });
    }
  }
  return palavras;
}

function selecionar(p: Palavra) {
  const selecao = window.getSelection();
  if (!selecao) return;
  const range = document.createRange();
  range.setStart(p.no, p.inicio);
  range.setEnd(p.no, p.fim);
  selecao.removeAllRanges();
  selecao.addRange(range);
  p.no.parentElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

export interface ControleDeLeitura {
  /** Liga a escuta de mouse e teclado. Devolve a função que desliga tudo. */
  parar: () => void;
}

/**
 * Liga a leitura por palavra sobre uma raiz.
 *
 * `aoLer` recebe cada palavra falada — serve para a interface mostrar o que
 * está sendo lido sem precisar saber como ela foi encontrada.
 */
export function iniciarLeituraPorPalavra(raiz: HTMLElement, aoLer?: (palavra: string) => void): ControleDeLeitura {
  let ultimaChave = '';
  let indiceTeclado = -1;
  let cacheDePalavras: Palavra[] | null = null;

  const falar = (texto: string, chave: string) => {
    if (!texto.trim() || chave === ultimaChave) return;
    ultimaChave = chave;
    speak(texto);
    aoLer?.(texto);
  };

  const aoMover = (evento: PointerEvent) => {
    // Só o ponteiro de mouse: em tela sensível ao toque, "passar por cima" não
    // existe, e disparar a cada toque atrapalharia a rolagem.
    if (evento.pointerType !== 'mouse') return;
    const achado = pontoParaTexto(evento.clientX, evento.clientY);
    if (!achado) return;
    if (!raiz.contains(achado.no)) return;
    const texto = achado.no.nodeValue ?? '';
    const limites = limitesDaPalavra(texto, achado.deslocamento);
    if (!limites) return;
    falar(texto.slice(limites[0], limites[1]), `${limites[0]}@${texto.slice(0, 12)}`);
  };

  const aoTeclar = (evento: KeyboardEvent) => {
    if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
    // Não sequestra as setas de quem está digitando ou dentro de um controle.
    const alvo = evento.target as HTMLElement | null;
    if (alvo?.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (!cacheDePalavras) cacheDePalavras = palavrasDe(raiz);
    if (!cacheDePalavras.length) return;
    evento.preventDefault();
    /*
     * Enquanto a leitura por palavra está ligada, as setas pertencem a ela.
     *
     * O leitor de obras também escuta ← → em `window`, para virar página. Este
     * ouvinte está em `document`, que vem antes no borbulhamento, então sem
     * parar a propagação os dois rodavam: a seta falava a próxima palavra E
     * virava a página — e virar a página troca o conteúdo, o que zera o índice
     * pelo MutationObserver e joga a leitura de volta para a primeira palavra.
     *
     * `preventDefault` não resolvia isso: ele cancela a ação padrão do
     * navegador, não os outros ouvintes. Quem faz isso é `stopPropagation`.
     *
     * A escolha é deliberada: com a leitura ligada, as setas andam palavra a
     * palavra e não viram página. Para virar página, desligue a leitura — ou
     * use os botões de navegação do leitor, que continuam valendo.
     */
    evento.stopPropagation();

    indiceTeclado += evento.key === 'ArrowRight' ? 1 : -1;
    if (indiceTeclado < 0) indiceTeclado = 0;
    if (indiceTeclado >= cacheDePalavras.length) indiceTeclado = cacheDePalavras.length - 1;

    const palavra = cacheDePalavras[indiceTeclado];
    selecionar(palavra);
    falar(palavra.texto, `teclado:${indiceTeclado}`);
  };

  // O conteúdo muda quando se navega entre páginas: o índice precisa ser refeito.
  const observador = new MutationObserver(() => {
    cacheDePalavras = null;
    indiceTeclado = -1;
  });
  observador.observe(raiz, { childList: true, subtree: true });

  document.addEventListener('pointermove', aoMover);
  document.addEventListener('keydown', aoTeclar);

  return {
    parar() {
      document.removeEventListener('pointermove', aoMover);
      document.removeEventListener('keydown', aoTeclar);
      observador.disconnect();
      stopSpeaking();
      window.getSelection()?.removeAllRanges();
    },
  };
}
