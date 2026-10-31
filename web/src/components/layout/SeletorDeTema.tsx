import { useEffect, useRef, useState } from 'react';
import { Check, Moon, Palette, Sun } from 'lucide-react';
import { usePreferences } from '../../preferences/PreferencesContext';
import { TEMAS, infoDoTema } from '../../preferences/temas';
import { useT } from '../../i18n/I18nContext';

/**
 * Seletor de tema.
 *
 * Substitui o botão que alternava entre dois temas. A escolha de virar lista
 * veio do número: com seis temas, um botão de ciclo obrigaria a passar por
 * cinco para chegar ao sexto, e ninguém descobriria o que existe.
 *
 * A lista é agrupada em claros e escuros porque é assim que as pessoas
 * decidem — primeiro o tom, depois o gosto —, e cada item traz uma linha
 * dizendo para que serve. Tema sem explicação é só um nome bonito.
 *
 * O alto contraste **não** está aqui: continua com botão próprio ao lado,
 * porque é recurso de acessibilidade e vence qualquer tema escolhido.
 */
export default function SeletorDeTema({ classeBotao }: { classeBotao: string }) {
  const prefs = usePreferences();
  const t = useT();
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

  const atual = infoDoTema(prefs.theme);
  const claros = TEMAS.filter((tema) => tema.tom === 'claro');
  const escuros = TEMAS.filter((tema) => tema.tom === 'escuro');

  const item = (id: (typeof TEMAS)[number]['id']) => {
    const tema = infoDoTema(id);
    const escolhido = prefs.theme === id;
    return (
      <button
        key={id}
        type="button"
        role="menuitemradio"
        aria-checked={escolhido}
        className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-surface-highest"
        onClick={() => {
          prefs.setTheme(id);
          setAberto(false);
        }}
      >
        <Check
          className={`mt-0.5 h-4 w-4 shrink-0 ${escolhido ? 'text-primary' : 'opacity-0'}`}
          aria-hidden
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">{t(tema.nome)}</span>
          <span className="block text-xs text-ink-subtle">{t(tema.descricao)}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="relative" ref={caixa}>
      <button
        type="button"
        className={classeBotao}
        aria-haspopup="menu"
        aria-expanded={aberto}
        title={t('tema.atual', { nome: t(atual.nome) })}
        onClick={() => setAberto((a) => !a)}
      >
        {atual.tom === 'escuro' ? (
          <Moon className="h-5 w-5" aria-hidden />
        ) : (
          <Sun className="h-5 w-5" aria-hidden />
        )}
        <span className="sr-only">{t('tema.atual', { nome: t(atual.nome) })}</span>
      </button>

      {aberto && (
        <div role="menu" aria-label={t('tema.seletor')} className="card absolute right-0 top-12 z-40 w-72 p-2 shadow-card">
          <p className="px-3 pb-1 pt-1 text-xs font-bold uppercase tracking-wider text-ink-subtle">
            <Palette className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {t('tema.claros')}
          </p>
          {claros.map((tema) => item(tema.id))}
          <p className="mt-1 border-t border-outline/40 px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">
            {t('tema.escuros')}
          </p>
          {escuros.map((tema) => item(tema.id))}
        </div>
      )}
    </div>
  );
}
