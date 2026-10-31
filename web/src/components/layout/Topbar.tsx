import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Contrast, Crown, LayoutDashboard, LogOut, Menu, Plus, Search, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { FONT_MAX, FONT_MIN, usePreferences } from '../../preferences/PreferencesContext';
import { useT } from '../../i18n/I18nContext';
import { ROLE_LABEL } from '../../lib/labels';
import { stopSpeaking } from '../../lib/speech';
import JanelaDeLibras from './JanelaDeLibras';
import LeituraEmVoz from './LeituraEmVoz';
import SeletorDeIdioma from './SeletorDeIdioma';
import SeletorDeTema from './SeletorDeTema';
import { Avatar } from '../ui';

function UserMenu() {
  const { user, isAdmin, isWriter, logout } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link to="/login" className="btn-secondary">
        <UserRound className="h-4 w-4" aria-hidden /> {t('comum.entrar')}
      </Link>
    );
  }
  const item = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-ink hover:bg-surface-highest';
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-full p-1 hover:bg-surface-high"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('conta.menu', { nome: user.name })}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="relative">
          <Avatar name={user.name} />
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-bg bg-accent" aria-hidden />
        </span>
        <ChevronDown className="h-4 w-4 text-ink-muted" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 top-12 z-40 w-60 p-2 shadow-card">
          <div className="border-b border-outline/50 px-3 pb-2 pt-1">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-subtle">{user.email}</p>
            <p className="mt-1 text-xs font-semibold text-accent">{ROLE_LABEL[user.role]}</p>
          </div>
          <div className="pt-2">
            {isWriter && (
              <Link role="menuitem" to="/dashboard" className={item} onClick={() => setOpen(false)}>
                <LayoutDashboard className="h-4 w-4" aria-hidden /> {t('conta.painel')}
              </Link>
            )}
            <Link role="menuitem" to="/profile" className={item} onClick={() => setOpen(false)}>
              <UserRound className="h-4 w-4" aria-hidden /> {t('conta.perfil')}
            </Link>
            {isAdmin && (
              <Link role="menuitem" to="/admin" className={item} onClick={() => setOpen(false)}>
                <ShieldCheck className="h-4 w-4 text-admin" aria-hidden /> {t('conta.administracao')}
              </Link>
            )}
            <button
              role="menuitem"
              type="button"
              className={item}
              onClick={() => {
                setOpen(false);
                logout();
                navigate('/login');
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden /> {t('comum.sair')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const prefs = usePreferences();
  const t = useT();
  const { isWriter } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');

  useEffect(() => {
    if (location.pathname === '/') setTerm(params.get('q') ?? '');
  }, [location.pathname, params]);

  useEffect(() => {
    // Interrompe a leitura em voz alta ao trocar de página.
    stopSpeaking();
  }, [location.pathname]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
  };

  const tool =
    'inline-flex h-10 min-w-[40px] items-center justify-center rounded-full px-2 text-sm font-bold text-ink-muted hover:bg-surface-high hover:text-ink disabled:opacity-40';

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-outline/25 bg-bg/95 px-4 backdrop-blur md:px-6">
      <button type="button" className="icon-btn lg:hidden" onClick={onOpenMenu} aria-label={t('nav.abrirMenu')}>
        <Menu className="h-6 w-6" aria-hidden />
      </button>

      {/*
        O campo NÃO leva `focus:outline-none`.

        O utilitário do Tailwind gera `.focus\:outline-none:focus`, de
        especificidade 0-2-0, e vence o `:focus-visible` do global.css, que é
        0-1-0 — aplicando `outline: 2px solid transparent`. O resultado era um
        campo de busca sem nenhum indicador de foco ao chegar pelo Tab, falha do
        critério WCAG 2.4.7 numa plataforma de acessibilidade. O realce da borda
        abaixo é um reforço visual, não o indicador: o indicador é o contorno.
      */}
      <form
        role="search"
        onSubmit={onSearch}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-outline bg-surface px-4 focus-within:border-primary md:max-w-xl"
      >
        <Search className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
        <label htmlFor="global-search" className="sr-only">
          {t('nav.buscarObras')}
        </label>
        <input
          id="global-search"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t('nav.buscaPlaceholder')}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-subtle"
        />
      </form>

      <div className="relative hidden items-center gap-0.5 rounded-full border border-outline bg-surface p-1 sm:flex" role="group" aria-label={t('a11y.grupo')}>
        <SeletorDeTema classeBotao={tool} />
        <button type="button" className={tool} onClick={prefs.toggleHighContrast} aria-pressed={prefs.highContrast} title={t('a11y.altoContrasteTitulo')}>
          <Contrast className="h-5 w-5" aria-hidden />
          <span className="sr-only">{t('a11y.altoContraste')}</span>
        </button>
        <button type="button" className={tool} onClick={prefs.decreaseFont} disabled={prefs.fontScale <= FONT_MIN} aria-label={t('a11y.diminuirTexto')}>
          A-
        </button>
        <button type="button" className={tool} onClick={prefs.increaseFont} disabled={prefs.fontScale >= FONT_MAX} aria-label={t('a11y.aumentarTexto')}>
          A+
        </button>
        <SeletorDeIdioma classeBotao={tool} />
        <LeituraEmVoz classeBotao={tool} />
        <JanelaDeLibras classeBotao={tool} />
      </div>

      {/* Planos fica ao lado de "Publique sua obra" e aparece para todo mundo,
          inclusive visitante sem conta: quem ainda não assinou é justamente
          quem precisa encontrar a página. */}
      <Link to="/planos" className="btn-secondary hidden md:inline-flex">
        <Crown className="h-4 w-4" aria-hidden /> {t('nav.planos')}
      </Link>

      {isWriter && (
        <Link to="/submit" className="btn-primary hidden md:inline-flex">
          <Plus className="h-4 w-4" aria-hidden /> {t('nav.publicar')}
        </Link>
      )}
      <div className="mx-1 hidden h-8 w-px bg-outline/60 md:block" aria-hidden />
      <UserMenu />
    </header>
  );
}
