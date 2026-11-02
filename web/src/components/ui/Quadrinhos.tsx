import { useId } from 'react';

/**
 * Vocabulário de quadrinho, desenhado para o Livrin.
 *
 * As referências que chegaram eram colagens e artes pop prontas. Reproduzi-las
 * seria copiar o trabalho de outra pessoa — mas a *linguagem* delas não
 * pertence a ninguém: retícula, balão de fala e estrela de impacto são o
 * alfabeto do quadrinho desde os anos 1930, do mesmo jeito que pauta e clave
 * são o alfabeto da partitura.
 *
 * Então aqui está esse alfabeto, escrito com a letra da casa: nenhuma curva
 * perfeita, traço de tinta, cor saindo dos tokens. A diferença entre citar uma
 * linguagem e copiar uma obra é exatamente esta — o que se reaproveita é a
 * gramática, não as frases.
 *
 * Tudo é decorativo (`aria-hidden`) e nada carrega informação: quem não
 * enxergar os ornamentos não perde uma palavra do que está escrito.
 */

/**
 * Retícula — a malha de pontos da impressão barata que virou a assinatura
 * visual do quadrinho. Fica como fundo, atrás do conteúdo.
 *
 * É um `<pattern>` de SVG, não imagem: escala sem borrar, muda de cor com o
 * tema e pesa alguns bytes.
 *
 * ONDE ELA PODE ENTRAR — a regra, para não virar poluição:
 *
 *  1. **Só atrás de bloco curto**: abertura de página, cartão de destaque,
 *     rodapé. Nunca atrás de texto corrido — ponto atrás de parágrafo é
 *     ruído para quem tem baixa visão e para quem só está com pressa.
 *  2. **No máximo uma por tela visível.** Se duas aparecem juntas, ela deixa
 *     de ser sotaque e vira papel de parede.
 *  3. **Opacidade baixa** (8% a 14%) e sempre em cor da marca. Acima disso
 *     ela começa a disputar contraste com o texto que está por cima.
 *  4. **Ritmo**: seção com retícula, seção sem. É o alternado que cria o
 *     ritmo; retícula em tudo não cria nada.
 *
 * O `id` sai do `useId` do React porque dois `<pattern>` com o mesmo id na
 * mesma página se atropelam — o segundo passa a desenhar com a definição do
 * primeiro. Com várias retículas espalhadas pelo site, lembrar de inventar um
 * id diferente a cada uso seria questão de tempo até esquecer.
 */
export function Reticula({
  className = '',
  espaco = 10,
  raio = 2.2,
  id,
}: {
  className?: string;
  /** Distância entre os centros dos pontos. */
  espaco?: number;
  raio?: number;
  /** Só para quem precisar de um id estável; o padrão já é único. */
  id?: string;
}) {
  // Os dois-pontos que o `useId` devolve (`:r3:`) são válidos em atributo,
  // mas atrapalham se alguém um dia mirar o pattern por seletor de CSS.
  const automatico = useId().replace(/:/g, '');
  const patternId = id ?? `reticula-${automatico}`;

  return (
    <svg className={className} aria-hidden focusable="false">
      <defs>
        <pattern id={patternId} width={espaco} height={espaco} patternUnits="userSpaceOnUse">
          <circle cx={espaco / 2} cy={espaco / 2} r={raio} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

/**
 * Estrela de impacto — o "pow" sem a palavra.
 *
 * As pontas não são regulares de propósito: estrela de compasso parece selo de
 * certificado, não pancada de quadrinho. Os raios alternam entre dois
 * comprimentos e cada um recebe um empurrãozinho, calculado a partir do índice
 * para o desenho não mudar a cada renderização.
 */
export function EstrelaDeImpacto({ className = '', pontas = 12 }: { className?: string; pontas?: number }) {
  const vertices: string[] = [];
  for (let i = 0; i < pontas * 2; i++) {
    const longa = i % 2 === 0;
    // O "torto" é determinístico: um seno do índice, não um sorteio.
    const desvio = Math.sin(i * 2.4) * 4;
    const raio = (longa ? 48 : 27) + desvio;
    const angulo = (i / (pontas * 2)) * Math.PI * 2 - Math.PI / 2;
    vertices.push(`${(50 + raio * Math.cos(angulo)).toFixed(1)} ${(50 + raio * Math.sin(angulo)).toFixed(1)}`);
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <path d={`M${vertices.join('L')}Z`} fill="currentColor" />
    </svg>
  );
}

/**
 * Balão de fala com rabicho. Serve de moldura para um texto curto.
 *
 * O desenho é só a moldura; o texto vai por cima, em HTML de verdade — não
 * dentro do SVG. Texto em SVG não quebra linha sozinho, não aceita o tamanho
 * de fonte da pessoa e some na hora de selecionar e copiar.
 */
export function BalaoDeFala({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 120" preserveAspectRatio="none" className={className} aria-hidden focusable="false">
      <path
        d="M12 10h176q9 0 9 9v62q0 9-9 9h-96l-28 26 5-26H12q-9 0-9-9V19q0-9 9-9Z"
        fill="rgb(var(--c-surface))"
        stroke="rgb(var(--c-ink))"
        strokeWidth="3"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Linhas de velocidade — os traços que saem do canto quando alguém corre.
 * Entram em quina de seção, nunca atrás de texto.
 */
export function LinhasDeVelocidade({ className = '' }: { className?: string }) {
  const linhas = [0, 1, 2, 3, 4].map((i) => ({
    y: 14 + i * 13,
    largura: 58 - Math.abs(i - 2) * 14,
    grossura: 3.4 - Math.abs(i - 2) * 0.5,
  }));
  return (
    <svg viewBox="0 0 70 80" className={className} aria-hidden focusable="false">
      {linhas.map((l) => (
        <rect key={l.y} x="0" y={l.y} width={l.largura} height={l.grossura} rx={l.grossura / 2} fill="currentColor" />
      ))}
    </svg>
  );
}
