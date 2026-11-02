import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookMarked, ChevronLeft, ChevronRight, Info, Users } from 'lucide-react';
import { useAutores } from '../../hooks/queries';
import { useT } from '../../i18n/I18nContext';
import { Badge, Spinner } from '../ui';
import { Reticula } from '../ui/Quadrinhos';
import RetratoAutor from '../autores/RetratoAutor';

/**
 * Roleta de autores — quem publica no acervo, numa roda que gira.
 *
 * Honestidade antes do efeito
 * ---------------------------
 * A referência desta seção é uma fileira de fotografias de quadrinistas reais
 * sob a frase "compre por mestre". Reproduzir isso aqui significaria duas
 * coisas que este projeto não faz: usar fotos que não são nossas e sugerir que
 * pessoas reais apoiam o Livrin. Ninguém apoiou — o Livrin é um trabalho
 * acadêmico.
 *
 * Então a roleta mostra os autores DO ACERVO, que são fictícios e estão
 * escritos no seed, com os retratos geométricos gerados a partir do nome. O
 * aviso de ficção fica na própria seção, visível, não escondido num rodapé. E
 * não há nenhuma frase entre aspas: o que aparece de cada autoria é a linha de
 * apresentação que ela mesma tem no cadastro, não um depoimento inventado
 * sobre a plataforma.
 *
 * A roda como componente
 * ----------------------
 * É um `radiogroup` de verdade, não uma animação clicável: seta esquerda e
 * direita trocam a seleção, Home e End vão às pontas, e só o retrato
 * selecionado fica na ordem de tabulação (foco itinerante). Quem navega por
 * teclado percorre a roda inteira sem precisar passar por seis paradas antes
 * de chegar ao conteúdo seguinte.
 *
 * O giro é puro CSS. A roda inteira roda, e cada retrato roda de volta o mesmo
 * tanto para continuar de pé — e `prefers-reduced-motion` desliga a transição
 * em `global.css`, deixando a troca instantânea em vez de desconfortável.
 */

/** Raio da roda, em porcentagem do lado do quadrado que a contém. */
const RAIO = 40;

export default function RoletaDeAutores() {
  const t = useT();
  const { data: autores = [], isLoading } = useAutores();
  const [atual, setAtual] = useState(0);
  /**
   * Quanto a roda está girada, SEPARADO de quem está selecionado.
   *
   * Eram a mesma coisa, e isso tornava a roleta difícil de usar: clicar num
   * retrato girava a roda, e todos os outros saíam do lugar. Quem queria
   * escolher dois autores seguidos errava o segundo clique, porque o alvo tinha
   * se mudado. Agora clicar escolhe NO LUGAR; a roda gira só pelas setas e pelo
   * teclado, que é onde ela não está embaixo do dedo de ninguém.
   */
  const [giro, setGiro] = useState(0);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const anel = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <section className="mb-14 flex h-72 items-center justify-center" aria-busy>
        <Spinner />
      </section>
    );
  }
  // Acervo sem autoria publicada: a seção inteira some, em vez de anunciar uma
  // comunidade vazia.
  if (autores.length < 2) return null;

  const selecionado = autores[atual] ?? autores[0];
  const passo = 360 / autores.length;

  /**
   * Leva o foco ao retrato escolhido — mas só quando o foco JÁ estava dentro da
   * roda, ou seja, quando a navegação veio do teclado.
   *
   * No clique do mouse, mover o foco é ativamente ruim: o navegador rola a
   * página para trazer o elemento focado à vista (medido: 930px num caso de
   * teste), e a seta que a pessoa acabou de clicar sai de baixo do dedo. Daí a
   * sensação de "às vezes não consigo clicar". O `preventScroll` é a segunda
   * trava, para o caso de o foco estar na roda e o retrato estar fora da vista.
   */
  const focarSeVeioDoTeclado = (indice: number) => {
    if (anel.current?.contains(document.activeElement)) {
      botoes.current[indice]?.focus({ preventScroll: true });
    }
  };

  /** Clique direto: escolhe sem girar a roda. O alvo não foge. */
  const escolher = (indice: number) => setAtual(indice);

  /** Setas e teclado: escolhe E gira, levando o escolhido ao topo. */
  const mover = (delta: number) => {
    const proximo = (atual + delta + autores.length) % autores.length;
    setAtual(proximo);
    setGiro(proximo * passo);
    focarSeVeioDoTeclado(proximo);
  };

  const irPara = (indice: number) => {
    setAtual(indice);
    setGiro(indice * passo);
    focarSeVeioDoTeclado(indice);
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    const teclas: Record<string, () => void> = {
      ArrowRight: () => mover(1),
      ArrowDown: () => mover(1),
      ArrowLeft: () => mover(-1),
      ArrowUp: () => mover(-1),
      Home: () => irPara(0),
      End: () => irPara(autores.length - 1),
    };
    const acao = teclas[e.key];
    if (acao) {
      e.preventDefault();
      acao();
    }
  };

  return (
    <section className="mb-14" aria-labelledby="roleta-titulo">
      <div className="mb-6 max-w-2xl">
        <p className="eyebrow flex items-center gap-2 text-accent">
          <Users className="h-4 w-4" aria-hidden />
          {t('roleta.olho')}
        </p>
        <h2
          id="roleta-titulo"
          className="mt-2 font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl"
        >
          {t('roleta.titulo')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">{t('roleta.chamada')}</p>
      </div>

      <div className="card relative overflow-hidden p-6 md:p-8">
        {/* A retícula fica só na metade da roda, não atrás da biografia. */}
        <Reticula className="pointer-events-none absolute inset-y-0 left-0 h-full w-1/2 text-accent/[0.12] [mask-image:linear-gradient(to_right,black,transparent)]" />
        <div className="relative grid gap-8 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:items-center md:gap-10">
        {/* ------------------------------- A roda ------------------------- */}
        <div className="mx-auto w-full max-w-[320px] md:max-w-none">
          <div className="relative aspect-square w-full">
            {/* Trilho da roda: o círculo que diz "isto gira". */}
            {/* Trilho tracejado: decorativo, e `pointer-events-none` para não
                roubar clique de nada que fique por cima dele. */}
            <div
              className="pointer-events-none absolute inset-[9%] rounded-full border border-dashed border-outline/40"
              aria-hidden
            />

            <div
              ref={anel}
              role="radiogroup"
              aria-label={t('roleta.grupo')}
              onKeyDown={aoTeclar}
              className="roleta-anel absolute inset-0"
              style={{ transform: `rotate(${-giro}deg)` }}
            >
              {autores.map((autor, i) => {
                const angulo = i * passo;
                const radianos = (angulo * Math.PI) / 180;
                const escolhido = i === atual;
                return (
                  <button
                    key={autor.id}
                    ref={(el) => {
                      botoes.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={escolhido}
                    // Foco itinerante: só o selecionado entra na tabulação.
                    tabIndex={escolhido ? 0 : -1}
                    onClick={() => escolher(i)}
                    aria-label={t('roleta.selecionar', { nome: autor.name })}
                    className="roleta-retrato absolute rounded-full"
                    style={{
                      left: `${50 + RAIO * Math.sin(radianos)}%`,
                      top: `${50 - RAIO * Math.cos(radianos)}%`,
                      /*
                       * Desfaz o giro da roda, para o retrato ficar de pé.
                       *
                       * A conta precisa usar `giro`, o mesmo valor que o anel
                       * usa — e as DUAS transições precisam ter a mesma
                       * duração, senão a soma não é zero no meio do caminho e
                       * o retrato gira sozinho antes de assentar. Era isso que
                       * fazia a cabeça quadrada parecer "mudar de redondo para
                       * quadrado": 6,2° de giro parasita, medidos.
                       */
                      transform: `translate(-50%, -50%) rotate(${giro}deg) scale(${
                        escolhido ? 1.22 : 1
                      })`,
                      opacity: escolhido ? 1 : 0.62,
                    }}
                  >
                    <RetratoAutor
                      nome={autor.name}
                      className={`h-[62px] w-[62px] rounded-full sm:h-[72px] sm:w-[72px] ${
                        escolhido ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Miolo: o nome de quem está selecionado, no centro da roda. */}
            <div className="pointer-events-none absolute inset-[26%] flex flex-col items-center justify-center rounded-full bg-surface-low px-3 text-center">
              <span className="font-display text-base font-bold leading-tight text-ink sm:text-lg">
                {selecionado.name}
              </span>
              <span className="mt-1 text-xs text-ink-subtle">
                {selecionado.worksCount === 1
                  ? t('roleta.umaObra')
                  : t('roleta.obras', { n: selecionado.worksCount })}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button type="button" className="icon-btn border-outline/60" onClick={() => mover(-1)} aria-label={t('roleta.anterior')}>
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <span className="text-sm tabular-nums text-ink-subtle" aria-hidden>
              {atual + 1} / {autores.length}
            </span>
            <button type="button" className="icon-btn border-outline/60" onClick={() => mover(1)} aria-label={t('roleta.proximo')}>
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* --------------------- Quem está selecionado --------------------- */}
        {/* `aria-live="polite"`: girar a roda muda este texto, e quem usa leitor
            de tela precisa ouvir a mudança sem ter de procurá-la. */}
        <div aria-live="polite">
          <h3 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
            {selecionado.name}
          </h3>
          {selecionado.headline && (
            <p className="mt-1 text-sm font-semibold text-accent">{selecionado.headline}</p>
          )}
          {selecionado.bio && (
            <p className="mt-3 max-w-prose leading-relaxed text-ink-muted">{selecionado.bio}</p>
          )}

          <ul className="mt-4 flex flex-wrap gap-2">
            {selecionado.genres.slice(0, 4).map((genero) => (
              <li key={genero}>
                <Badge tone="muted">{genero}</Badge>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to={`/autores/${selecionado.id}`} className="btn-primary">
              <BookMarked className="h-4 w-4" aria-hidden /> {t('roleta.verColecao')}
            </Link>
            <Link to="/autores" className="btn-ghost">
              {t('autores.naLista')} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
        </div>
      </div>

      {/* O aviso de ficção fica aqui, visível, e não num rodapé: é a seção que
          poderia ser lida como "gente famosa apoia isto", então é nela que a
          correção precisa estar. */}
      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-subtle">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {t('roleta.ficcao')}
      </p>
    </section>
  );
}
