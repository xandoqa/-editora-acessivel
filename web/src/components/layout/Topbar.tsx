import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Contrast, LayoutDashboard, LogOut, Menu, Moon, Plus, Search, ShieldCheck, Sun, UserRound, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { FONT_MAX, FONT_MIN, usePreferences } from '../../preferences/PreferencesContext';
import { ROLE_LABEL } from '../../lib/labels';
import { speak, speechSupported, stopSpeaking } from '../../lib/speech';
import { Avatar } from '../ui';

function UserMenu() {
  const { user, isAdmin, isWriter, logout } = useAuth();
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
        <UserRound className="h-4 w-4" aria-hidden /> Entrar
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
        aria-label={`Menu da conta de ${user.name}`}
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
                <LayoutDashboard className="h-4 w-4" aria-hidden /> Meu painel
              </Link>
            )}
            <Link role="menuitem" to="/profile" className={item} onClick={() => setOpen(false)}>
              <UserRound className="h-4 w-4" aria-hidden /> Meu perfil
            </Link>
            {isAdmin && (
              <Link role="menuitem" to="/admin" className={item} onClick={() => setOpen(false)}>
                <ShieldCheck className="h-4 w-4 text-admin" aria-hidden /> Administração
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
              <LogOut className="h-4 w-4" aria-hidden /> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const prefs = usePreferences();
  const { isWriter } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (location.pathname === '/') setTerm(params.get('q') ?? '');
  }, [location.pathname, params]);

  useEffect(() => {
    // Interrompe a leitura em voz alta ao trocar de página.
    stopSpeaking();
    setReading(false);
  }, [location.pathname]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
  };

  const toggleRead = () => {
    if (reading) {
      stopSpeaking();
      setReading(false);
      return;
    }
    const text = document.getElementById('main-content')?.innerText ?? '';
    const utterance = speak(text.slice(0, 4000), { onEnd: () => setReading(false), onError: () => setReading(false) });
    setReading(!!utterance);
  };

  const tool = 'inline-flex h-10 min-w-[40px] items-center justify-center rounded-lg px-2 text-sm font-bold text-ink-muted hover:bg-surface-highest hover:text-ink disabled:opacity-40';

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b-2 border-outline bg-bg/95 px-4 backdrop-blur md:px-6">
      <button type="button" className="icon-btn lg:hidden" onClick={onOpenMenu} aria-label="Abrir menu de navegação">
        <Menu className="h-6 w-6" aria-hidden />
      </button>

      <form role="search" onSubmit={onSearch} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-outline bg-surface px-3 md:max-w-xl">
        <Search className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
        <label htmlFor="global-search" className="sr-only">
          Buscar obras
        </label>
        <input
          id="global-search"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar HQs, graphic novels, autores e obras com audiodescrição..."
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
        />
      </form>

      <div className="hidden items-center gap-0.5 rounded-xl border border-outline bg-surface-high p-1 sm:flex" role="group" aria-label="Recursos de acessibilidade">
        <button
          type="button"
          className={tool}
          onClick={prefs.toggleTheme}
          aria-pressed={prefs.theme === 'noite'}
          title={prefs.theme === 'noite' ? 'Voltar ao tema Papel (claro)' : 'Mudar para o tema Noite (escuro)'}
        >
          {prefs.theme === 'noite' ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
          <span className="sr-only">{prefs.theme === 'noite' ? 'Tema Papel' : 'Tema Noite'}</span>
        </button>
        <button type="button" className={tool} onClick={prefs.toggleHighContrast} aria-pressed={prefs.highContrast} title="Alto contraste (amarelo/preto)">
          <Contrast className="h-5 w-5" aria-hidden />
          <span className="sr-only">Alto contraste</span>
        </button>
        <button type="button" className={tool} onClick={prefs.decreaseFont} disabled={prefs.fontScale <= FONT_MIN} aria-label="Diminuir tamanho do texto">
          A-
        </button>
        <button type="button" className={tool} onClick={prefs.increaseFont} disabled={prefs.fontScale >= FONT_MAX} aria-label="Aumentar tamanho do texto">
          A+
        </button>
        <button
          type="button"
          className={tool}
          onClick={toggleRead}
          disabled={!speechSupported}
          aria-pressed={reading}
          title={speechSupported ? 'Ler a página em voz alta' : 'Seu navegador não suporta leitura em voz alta'}
        >
          {reading ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
          <span className="sr-only">{reading ? 'Parar leitura em voz alta' : 'Ler a página em voz alta'}</span>
        </button>
      </div>

      {isWriter && (
        <Link to="/submit" className="btn-primary hidden md:inline-flex">
          <Plus className="h-4 w-4" aria-hidden /> Publique sua obra
        </Link>
      )}
      <div className="mx-1 hidden h-8 w-px bg-outline/60 md:block" aria-hidden />
      <UserMenu />
    </header>
  );
}
