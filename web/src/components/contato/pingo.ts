/**
 * Pingo — o mascote do Fale Conosco.
 *
 * Quem é
 * ------
 * Uma gota de tinta que trabalha no atendimento do Livrin. A forma não é
 * decorativa: a identidade do projeto é "papel e traço de tinta", e a logo é um
 * livro que fala. O mascote fecha o par — a tinta que *escuta*. Por isso ele
 * usa fone com microfone, que é o sinal universal de "tem gente aqui para
 * atender", e por isso o traço é torto do mesmo jeito que o das letras da
 * marca: nenhuma curva é perfeita, de propósito.
 *
 * A referência enviada era um atendente humano de cabelo laranja e óculos.
 * Copiá-lo seria copiar o mascote de outra loja. O que vale daquela imagem é a
 * ideia — um rosto amigável dentro de um balão, no canto da tela —, e é a ideia
 * que está aqui, com um personagem que só o Livrin tem.
 *
 * Por que a geometria mora neste arquivo
 * --------------------------------------
 * Para `ferramentas/previa-mascote.mjs` desenhar **exatamente** o que o site
 * desenha. Uma prévia que reimplementasse o traço divergiria no primeiro
 * ajuste — e foi olhando a prévia que eu descobri, nos retratos de autoria, um
 * arco que engolia a cabeça inteira.
 *
 * Nenhuma cor literal aqui: tudo sai dos tokens, então o Pingo acompanha os
 * sete temas, alto contraste incluído.
 */

export type Humor = 'oi' | 'escutando' | 'enviado' | 'ops';

/** A gota: ponta em cima, barriga redonda embaixo. */
export const CORPO = 'M50 7c12 19 26 31 26 47a26 26 0 0 1-52 0c0-16 14-28 26-47Z';

/** Brilho na testa, que tira o chapado da mancha de tinta. */
export const BRILHO = 'M39 38c3-7 8-13 12-18-7 5-13 12-16 21Z';

/** Arco do fone, acompanhando a barriga da gota por fora. */
export const ARCO_FONE = 'M20 59a30 30 0 0 1 60 0';

/** Haste do microfone, saindo da concha direita até a altura da boca. */
export const HASTE_MIC = 'M80 64q5 13-9 16';

/** Ondas de som: o Pingo é da casa de quem lê com os ouvidos. */
export const ONDAS = ['M86 48q6 7 0 14', 'M93 42q11 13 0 26'];

export interface Rosto {
  /** Caminho de cada olho, ou `null` quando o olho é um círculo cheio. */
  olhos: { esquerdo: string; direito: string } | null;
  boca: string;
  /** Sobrancelhas, quando o humor pede. */
  sobrancelhas?: { esquerda: string; direita: string };
  /** Mostrar as ondas de som saindo do fone. */
  ondas: boolean;
}

const OLHO_ESQ = 41;
const OLHO_DIR = 59;
const OLHO_Y = 54;

/**
 * O rosto por humor.
 *
 * São quatro e cada um tem um momento: `oi` esperando, `escutando` enquanto a
 * pessoa digita, `enviado` quando a mensagem foi gravada, `ops` quando a
 * validação recusou. A mudança de rosto não é enfeite — é a confirmação que
 * aparece antes de qualquer texto ser lido.
 */
export function rosto(humor: Humor): Rosto {
  switch (humor) {
    case 'escutando':
      // Olhos atentos e boca pequena: ele está ouvindo, não falando.
      return {
        olhos: null,
        boca: `M46 67q4 3 8 0`,
        sobrancelhas: { esquerda: 'M35 45q6-4 11-1', direita: 'M54 44q5-3 11 1' },
        ondas: true,
      };
    case 'enviado':
      // Olhos fechados em arco para cima — o sorriso que se faz com os olhos.
      return {
        olhos: {
          esquerdo: `M${OLHO_ESQ - 5} ${OLHO_Y + 2}q5-6 10 0`,
          direito: `M${OLHO_DIR - 5} ${OLHO_Y + 2}q5-6 10 0`,
        },
        boca: 'M40 64q10 11 20 0',
        ondas: true,
      };
    case 'ops':
      // Sobrancelhas erguidas por dentro e boca torta: preocupação, não bronca.
      return {
        olhos: null,
        boca: 'M41 69q9-5 18-1',
        // Ponta de DENTRO para cima: é o que separa preocupado de bravo.
        // Na primeira versão elas desciam para dentro e o Pingo parecia
        // estar brigando com quem errou o formulário.
        sobrancelhas: { esquerda: 'M34 47q6-3 11-5', direita: 'M55 42q6 2 11 5' },
        ondas: false,
      };
    default:
      return { olhos: null, boca: 'M41 65q9 9 18 0', ondas: false };
  }
}

export const OLHOS_CHEIOS = [
  { cx: OLHO_ESQ, cy: OLHO_Y, r: 4.6 },
  { cx: OLHO_DIR, cy: OLHO_Y, r: 4.6 },
];

/** Reflexo nos olhos. Sem ele o olhar fica morto. */
export const REFLEXOS = [
  { cx: OLHO_ESQ + 1.7, cy: OLHO_Y - 1.7, r: 1.5 },
  { cx: OLHO_DIR + 1.7, cy: OLHO_Y - 1.7, r: 1.5 },
];

/** Conchas do fone, uma de cada lado da cabeça. */
export const CONCHAS = [
  { x: 14, y: 50, w: 13, h: 19 },
  { x: 73, y: 50, w: 13, h: 19 },
];
