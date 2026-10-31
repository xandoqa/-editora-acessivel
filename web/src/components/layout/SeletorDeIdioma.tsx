import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { IDIOMAS, infoDoIdioma } from '../../i18n/tipos';

/**
 * Seletor de idioma.
 *
 * Cada idioma aparece escrito **no próprio idioma** — "Français", não
 * "Francês". Quem caiu numa interface que não entende precisa reconhecer a
 * própria língua na lista, e é por isso que esses nomes não passam pelo
 * dicionário: traduzi-los derrotaria o propósito do seletor.
 *
 * O aviso no rodapé do menu existe porque a expectativa precisa ser honesta:
 * muda a interface, não as obras. Título, sinopse e avaliação continuam no
 * idioma em que foram escritos.
 */
export default function SeletorDeIdioma({ classeBotao }: { classeBotao: string }) {
  const { idioma, definirIdioma, t } = useI18n();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const foraDaCaixa = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', foraDaCaixa);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', foraDaCaixa);
      document.removeEventListener('keydown', escape);
    };
  }, [aberto]);

  const atual = infoDoIdioma(idioma);

  return (
    <div className="relative" ref={caixa}>
      <button
        type="button"
        className={classeBotao}
        aria-haspopup="menu"
        aria-expanded={aberto}
        title={t('idioma.atual', { nome: atual.nomeNativo })}
        onClick={() => setAberto((a) => !a)}
      >
        <Languages className="h-[18px] w-[18px]" aria-hidden />
        {/* O código fica VISÍVEL: um globo sozinho diz que existe algo de
            idioma ali; "PT" diz em qual a pessoa está agora. A seta diz que
            abre um menu, e não que alterna no clique. */}
        <span aria-hidden className="ml-1 text-xs font-bold tracking-wide">
          {atual.codigo}
        </span>
        <ChevronDown className="ml-0.5 hidden h-3.5 w-3.5 opacity-70 sm:block" aria-hidden />
        <span className="sr-only">{t('idioma.atual', { nome: atual.nomeNativo })}</span>
      </button>

      {aberto && (
        <div
          role="menu"
          aria-label={t('idioma.seletor')}
          className="card absolute right-0 top-12 z-40 w-72 max-w-[calc(100vw-1.5rem)] p-2 shadow-card"
        >
          {IDIOMAS.map((info) => (
            <button
              key={info.id}
              type="button"
              role="menuitemradio"
              aria-checked={idioma === info.id}
              // `lang` no próprio item: sem isto, o leitor de tela anuncia
              // "Français" com fonética portuguesa.
              lang={info.tag}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-surface-highest"
              onClick={() => {
                definirIdioma(info.id);
                setAberto(false);
              }}
            >
              <Check
                className={`h-4 w-4 shrink-0 ${idioma === info.id ? 'text-primary' : 'opacity-0'}`}
                aria-hidden
              />
              <span className="text-sm font-semibold text-ink">{info.nomeNativo}</span>
            </button>
          ))}
          <p className="mt-1 border-t border-outline/40 px-3 pb-1 pt-2 text-xs text-ink-subtle">
            {t('idioma.aviso')}
          </p>
        </div>
      )}
    </div>
  );
}
