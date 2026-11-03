import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import { useT } from '../../i18n/I18nContext';
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
 *  1. **Dá para fechar, mas ele NÃO lembra disso.** Fechar vale só para esta
 *     visita; qualquer recarregamento traz o Pingo de volta.
 *
 *     Antes a escolha ficava no `localStorage`, com o argumento de que botão
 *     flutuante que volta a cada página é o motivo de tanta gente odiar botão
 *     flutuante. O argumento é bom para um site de verdade e estava errado
 *     aqui: quem apertou o X uma vez — inclusive sem querer, que foi o que
 *     aconteceu — perdia o mascote para sempre, sem nenhuma forma de trazê-lo
 *     de volta pela interface. Não havia "reabrir". Um enfeite que some em
 *     definitivo por um clique não pode guardar essa decisão.
 *
 *     Como o código não lê mais a chave antiga, quem já a tinha gravada volta
 *     a ver o Pingo sem precisar limpar nada no navegador.
 *  2. **Não cobre o rodapé nem o conteúdo em tela estreita.** Abaixo de 640px
 *     ele vira só o mascote, sem a faixa de texto.
 *  3. **Some na própria página de contato.** Convidar para a tela em que a
 *     pessoa já está é ruído.
 *
 * Ele também não aparece nas telas de leitura: no leitor, a área da página é o
 * conteúdo, e qualquer coisa boiando por cima atrapalha justamente quem usa
 * ampliação de tela.
 */

/** Rotas onde o convite não aparece. */
const SILENCIO = ['/contato', '/reader/', '/login', '/register', '/forgot-password', '/admin'];

export default function BotaoFaleConosco() {
  const t = useT();
  const { pathname } = useLocation();
  /*
   * Começa VISÍVEL, e nada é lido de armazenamento nenhum.
   *
   * Antes começava fechado e um efeito consultava o `localStorage`, o que
   * deixava o Pingo piscando para fora da tela por um quadro em todo
   * carregamento. Sem armazenamento, o estado inicial já é o certo.
   */
  const [fechado, setFechado] = useState(false);

  /** Fecha só por esta visita. Recarregar a página traz o Pingo de volta. */
  const dispensar = () => setFechado(true);

  if (fechado || SILENCIO.some((rota) => pathname.startsWith(rota))) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-end gap-2 sm:bottom-6 sm:right-6">
      <Link
        to="/contato"
        /*
          UMA animação, e a mesma do resto do site: o fundo preenche.
          Tinha três — o cartão subia meio pixel, um balão aparecia por cima e
          o X mudava de cor. Subir no `hover` era o único lugar do site que
          fazia isso, e balão aparecendo era o único popup de passar o mouse.
          Três efeitos diferentes num controle só é o oposto de consistência.
        */
        className="flex items-center gap-3 rounded-full border border-outline bg-surface py-2 pl-2 pr-3 shadow-card transition-colors hover:bg-surface-high sm:pr-5"
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

        {/*
          O balão de quadrinho saiu.

          Ele escrevia `contato.convite` — exatamente a MESMA frase que já está
          logo acima, na linha de apoio do botão. Era texto duplicado, uma
          animação a mais e um popup que nenhum outro lugar do site tem. O
          desenho do balão continua em `ui/Quadrinhos` para quem precisar dele.
        */}
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
