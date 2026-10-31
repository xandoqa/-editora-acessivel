import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Contrast, PersonStanding, Volume2 } from 'lucide-react';
import { LogoMark } from '../../components/layout/Logo';
import { usePreferences } from '../../preferences/PreferencesContext';
import { useT } from '../../i18n/I18nContext';

/** Moldura das telas de acesso (login, cadastro, recuperação), fiel à Tela 1 do protótipo. */
export default function AuthShell({ children, subtitle }: { children: ReactNode; subtitle: string }) {
  const prefs = usePreferences();
  const t = useT();
  const toggle = (active: boolean) =>
    `btn w-full text-xs ${active ? 'bg-primary-container text-primary' : 'bg-surface-highest text-ink hover:bg-outline'}`;
  return (
    <div className="flex min-h-screen items-start justify-center bg-bg px-4 py-10 md:items-center">
      <main id="main-content" className="w-full max-w-[540px]">
        <div className="card p-6 shadow-card sm:p-8">
          <div className="mb-7 flex flex-col items-center text-center">
            <Link to="/" aria-label={t('auth.voltarCatalogoAria')}>
              <LogoMark size="lg" />
            </Link>
            <p className="eyebrow mt-4 flex items-center gap-2 text-primary">
              {t('auth.acessoEditorial')} <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden /> {t('auth.leituraParaTodos')}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-ink">Editora Livrin</h1>
            <p className="mt-2 max-w-sm text-ink-muted">{subtitle}</p>
          </div>

          {children}

          <section className="mt-7 rounded-xl bg-surface-low p-4" aria-labelledby="a11y-title">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="a11y-title" className="flex items-center gap-2 font-sans text-sm font-semibold text-ink">
                <PersonStanding className="h-4 w-4 text-accent" aria-hidden /> {t('auth.recursosA11y')}
              </h2>
              <span className="chip bg-accent-container text-accent">{t('auth.ativo')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className={toggle(prefs.highContrast)} aria-pressed={prefs.highContrast} onClick={prefs.toggleHighContrast}>
                <Contrast className="h-4 w-4" aria-hidden /> {t('auth.altoContraste')}
              </button>
              <button
                type="button"
                className={toggle(prefs.readerOptimized)}
                aria-pressed={prefs.readerOptimized}
                onClick={prefs.toggleReaderOptimized}
                title={t('auth.leitorOtimizadoTitulo')}
              >
                <Volume2 className="h-4 w-4" aria-hidden /> {t('auth.leitorOtimizado')}
              </button>
            </div>
          </section>
        </div>
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="font-semibold text-primary underline-offset-4 hover:underline">
            {t('auth.explorarSemEntrar')}
          </Link>
        </p>
      </main>
    </div>
  );
}
