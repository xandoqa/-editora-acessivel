import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import { useT } from '../../i18n/I18nContext';
import { BalaoDeFala } from '../ui/Quadrinhos';
import Pingo from './Pingo';

/**
 * O Pingo no canto da tela, convidando a escrever.
 *
 * O que ele é, e o que ele não é
 * ------------------------------
 * É um **link** para `/contato`, não um chat. Chat de verdade exige alguém do
 * outro lado, e inventar um atendimento que não existe seria mentir na tela
 * mais sensível do site. O balão diz o que de fato acontece: há um formulário,
 * e a resposta vem por e-mail.
 *
 * Três cuidados que o impedem de virar aquele widget que todo mundo fecha
 * antes de ler:
 *
 *  1. **Dá para fechar, e ele lembra.** A escolha fica no `localStorage` da
 *     pessoa. Botão flutuante que volta a cada página é o motivo de tanta
 *     gente odiar botão flutuante.
 *  2. **Não cobre o rodapé nem o conteúdo em tela estreita.** Abaixo de 640px
 *     ele vira só o mascote, sem a faixa de texto.
 *  3. **Some na própria página de contato.** Convidar para a tela em que a
 *     pessoa já está é ruído.
 *
 * Ele também não aparece nas telas de leitura: no leitor, a área da página é o
 * conteúdo, e qualquer coisa boiando por cima atrapalha justamente quem usa
 * ampliação de tela.
 */

const CHAVE = 'livrin:fale-conosco-fechado';

/** Rotas onde o convite não aparece. */
const SILENCIO = ['/contato', '/reader/', '/login', '/register', '/forgot-password', '/admin'];

export default function BotaoFaleConosco() {
  const t = useT();
  const { pathname } = useLocation();
  const [fechado, setFechado] = useState(true);

  /*
   * A leitura do `localStorage` fica em efeito, e o estado começa "fechado".
   *
   * Lendo direto no estado inicial, o convite pisca na tela de quem já o
   * dispensou — e armazenamento pode simplesmente lançar (janela anônima,
   * dados de site bloqueados), o que derrubaria a renderização inteira.
   */
  useEffect(() => {
    try {
      setFechado(window.localStorage.getItem(CHAVE) === '1');
    } catch {
      setFechado(false);
    }
  }, []);

  const dispensar = () => {
    setFechado(true);
    try {
      window.localStorage.setItem(CHAVE, '1');
    } catch {
      // Sem armazenamento, o convite volta na próxima página. Melhor isso do
      // que a tela quebrar por causa de um enfeite.
    }
  };

  if (fechado || SILENCIO.some((rota) => pathname.startsWith(rota))) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-end gap-2 sm:bottom-6 sm:right-6">
      <Link
        to="/contato"
        className="group/pingo relative flex items-center gap-3 rounded-full border border-outline bg-surface py-2 pl-2 pr-3 shadow-card transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5 sm:pr-5"
        aria-label={t('contato.abrir')}
      >
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-high sm:h-14 sm:w-14">
          <Pingo humor="oi" className="h-11 w-11 sm:h-[52px] sm:w-[52px]" />
        </span>

        {/* A faixa de texto só a partir de 640px: em tela estreita ela cobriria
            metade da largura útil. O `aria-label` do link já diz o mesmo. */}
        <span className="hidden text-left sm:block">
          <span className="block font-display text-sm font-bold leading-tight text-ink">{t('contato.abrir')}</span>
          <span className="block text-xs text-ink-muted">{t('contato.convite')}</span>
        </span>

        <MessageCircle className="hidden h-4 w-4 shrink-0 text-accent sm:block" aria-hidden />

        {/* Balão de quadrinho que aparece no foco e no passar do mouse. É
            decorativo: tudo que ele diz já está no rótulo do link. */}
        <span
          className="pointer-events-none absolute bottom-full right-2 mb-2 hidden w-56 opacity-0 transition-opacity group-hover/pingo:opacity-100 group-focus-visible/pingo:opacity-100 lg:block"
          aria-hidden
        >
          <span className="relative block">
            <BalaoDeFala className="h-20 w-full" />
            <span className="absolute inset-0 flex items-center px-4 pb-4 text-[13px] font-semibold leading-snug text-ink">
              {t('contato.convite')}
            </span>
          </span>
        </span>
      </Link>

      <button
        type="button"
        onClick={dispensar}
        /* 44px de verdade (WCAG 2.5.5). Estava em 36px: é controle flutuante,
           sem nada em volta para restringir o tamanho — não havia motivo. */
        className="icon-btn h-11 w-11 shrink-0 border-outline/50 bg-surface"
        aria-label={t('contato.fechar')}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
