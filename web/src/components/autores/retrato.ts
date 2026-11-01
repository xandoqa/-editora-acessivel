/**
 * O desenho do retrato de autoria, em funções puras.
 *
 * Mora fora do componente React de propósito: assim a ferramenta de prévia
 * (`ferramentas/previa-retratos.cjs`) desenha **exatamente** o mesmo retrato
 * que o site, em vez de uma tradução à mão que vai divergir no primeiro ajuste.
 * Foi assim que eu descobri, olhando, que o arco dos ombros era um semicírculo
 * e engolia a cabeça.
 */

/** Hash estável e pequeno (FNV-1a de 32 bits). Não é criptografia; é sorteio. */
export function hashDoNome(nome: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < nome.length; i++) {
    h ^= nome.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Pares (fundo, figura, ornamento) tirados dos tokens de tema.
 *
 * Todos põem cor de recipiente atrás e cor de traço/cartaz na frente, que é o
 * que mantém a forma legível nos sete temas: nenhuma combinação coloca cor
 * saturada sobre cor saturada. Nenhuma cor literal aparece aqui — por isso o
 * retrato acompanha o tema, inclusive o alto contraste, de graça.
 */
export const PALETAS = [
  { fundo: '--c-primary-container', figura: '--c-primary', ornamento: '--c-accent' },
  { fundo: '--c-accent-container', figura: '--c-accent', ornamento: '--c-primary' },
  { fundo: '--c-warn-container', figura: '--c-warn', ornamento: '--c-primary' },
  { fundo: '--c-admin-container', figura: '--c-admin', ornamento: '--c-accent' },
  { fundo: '--c-surface-highest', figura: '--c-ink', ornamento: '--c-primary' },
  { fundo: '--c-danger-container', figura: '--c-danger', ornamento: '--c-ink' },
] as const;

export interface Retrato {
  paleta: (typeof PALETAS)[number];
  /** Caminho SVG dos ombros. */
  ombros: string;
  /** Caminho SVG da cabeça — círculo ou quadrado arredondado. */
  cabeca: string;
  /** Caminho do brilho sobre a cabeça. */
  brilho: string;
  /** Caminho da gola, que quebra a massa escura do busto. */
  gola: string;
  /** Índice do ornamento (0–5). */
  ornamento: number;
  /** Se há um halo de arco atrás da cabeça. */
  halo: boolean;
  /** Altura da faixa de chão. */
  chao: number;
}

/**
 * Monta o retrato a partir do nome. **Determinístico**: o mesmo nome dá sempre
 * o mesmo desenho, em qualquer navegador e em qualquer recarregamento. Sem
 * isso, a pessoa mudaria de cara a cada visita.
 *
 * São 6 paletas × 6 ornamentos × 2 formatos de cabeça × 5 alturas × 6 larguras
 * de ombro × 2 halos — mais de 4 mil combinações, o suficiente para um acervo
 * inteiro sem dois retratos iguais lado a lado.
 */
export function montarRetrato(nome: string): Retrato {
  const h = hashDoNome(nome);
  const alturaCabeca = 38 + ((h >>> 16) % 5);
  const larguraOmbro = 29 + ((h >>> 20) % 6);
  const raio = 18;
  const quadrada = ((h >>> 4) & 1) === 1;
  const topoOmbro = alturaCabeca + 32;

  return {
    paleta: PALETAS[h % PALETAS.length],
    // Arco achatado (ry = 15), não semicírculo: um semicírculo de raio igual à
    // meia-largura subiria até a altura da cabeça e a engoliria.
    ombros: `M${50 - larguraOmbro} 100V${topoOmbro}a${larguraOmbro} 15 0 0 1 ${2 * larguraOmbro} 0V100Z`,
    cabeca: quadrada
      ? `M${50 - raio} ${alturaCabeca - raio + 4}a4 4 0 0 1 4-4h${2 * raio - 8}a4 4 0 0 1 4 4v${
          2 * raio - 8
        }a4 4 0 0 1-4 4h-${2 * raio - 8}a4 4 0 0 1-4-4Z`
      : `M50 ${alturaCabeca - raio}a${raio} ${raio} 0 1 1 0 ${2 * raio}a${raio} ${raio} 0 1 1 0-${2 * raio}Z`,
    brilho: `M50 ${alturaCabeca - raio}a${raio} ${raio} 0 0 1 ${raio * 0.7} ${raio * 0.3}a${raio} ${raio} 0 0 0-${
      raio * 1.4
    } 0a${raio} ${raio} 0 0 1 ${raio * 0.7}-${raio * 0.3}Z`,
    // Gola: um V claro sobre o busto. É o que separa a cabeça dos ombros sem
    // precisar de contorno, e o que impede o retrato de virar uma mancha só.
    gola: `M${50 - raio * 0.5} ${topoOmbro + 4}L50 ${topoOmbro + 11}l${raio * 0.5} -7`,
    ornamento: (h >>> 8) % 6,
    halo: ((h >>> 12) & 1) === 1,
    chao: 26 + ((h >>> 24) % 10),
  };
}
