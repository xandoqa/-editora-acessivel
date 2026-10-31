import { Contrast } from 'lucide-react';
import { FONT_MAX, FONT_MIN, usePreferences } from '../../preferences/PreferencesContext';
import { useT } from '../../i18n/I18nContext';
import JanelaDeLibras from './JanelaDeLibras';
import LeituraEmVoz from './LeituraEmVoz';

/**
 * Recursos de acessibilidade no menu lateral, para telas pequenas.
 *
 * O grupo do cabeçalho é `hidden sm:flex`: abaixo de 640px ele não existe.
 * Isso significava que, **no celular**, não havia como ligar o alto contraste,
 * aumentar o tamanho do texto, usar a leitura em voz alta ou abrir a janela de
 * Libras. Numa plataforma cuja razão de existir é acessibilidade, esse era o
 * defeito mais grave da versão para telefone — e ele não aparecia em nenhum
 * teste, porque a suíte roda em tela de computador.
 *
 * Este painel não duplica lógica: usa os mesmos componentes e as mesmas
 * preferências do cabeçalho. O que muda é a forma — botões de 44px, que é o
 * alvo mínimo recomendado pelo critério 2.5.5 da WCAG para toque, contra os
 * 40px que bastam para ponteiro.
 *
 * Aparece só abaixo de 640px (`sm:hidden`), exatamente onde o grupo do
 * cabeçalho some. Acima disso seria repetição.
 */
export default function PainelDeAcessibilidade() {
  const prefs = usePreferences();
  const t = useT();

  const botao =
    'inline-flex h-11 min-w-[44px] items-center justify-center rounded-lg px-2 text-sm font-bold ' +
    'text-ink-muted hover:bg-surface-highest hover:text-ink disabled:opacity-40';

  return (
    <section className="rounded-xl border border-outline/40 p-2 sm:hidden" aria-label={t('a11y.grupo')}>
      <p className="px-1 pb-1.5 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        {t('a11y.grupo')}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          className={botao}
          onClick={prefs.toggleHighContrast}
          aria-pressed={prefs.highContrast}
          title={t('a11y.altoContrasteTitulo')}
        >
          <Contrast className="h-5 w-5" aria-hidden />
          <span className="sr-only">{t('a11y.altoContraste')}</span>
        </button>
        <button
          type="button"
          className={botao}
          onClick={prefs.decreaseFont}
          disabled={prefs.fontScale <= FONT_MIN}
          aria-label={t('a11y.diminuirTexto')}
        >
          A-
        </button>
        <button
          type="button"
          className={botao}
          onClick={prefs.increaseFont}
          disabled={prefs.fontScale >= FONT_MAX}
          aria-label={t('a11y.aumentarTexto')}
        >
          A+
        </button>
        <LeituraEmVoz classeBotao={botao} />
        <JanelaDeLibras classeBotao={botao} />
      </div>
    </section>
  );
}
