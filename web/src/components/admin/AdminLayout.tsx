import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, BookCopy, Gauge, HandHeart, Menu, MessageSquareQuote, ShieldAlert, Tags, Users, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { LogoMark } from '../layout/Logo';
import { Avatar } from '../ui';

const NAV = [
  { to: '/admin', label: 'Visão geral', icon: Gauge, end: true },
  { to: '/admin/works', label: 'Obras & Curadoria', icon: BookCopy },
  { to: '/admin/users', label: 'Usuários', icon: Users },
  { to: '/admin/genres', label: 'Gêneros', icon: Tags },
  { to: '/admin/feedbacks', label: 'Avaliações', icon: MessageSquareQuote },
  { to: '/admin/donations', label: 'Apoios', icon: HandHeart },
];

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  return (
    <div className="flex h-full flex-col bg-surface-low">
      <div className="flex h-[72px] items-center gap-3 border-b-2 border-outline px-5">
        <LogoMark />
        <div className="leading-tight">
          <p className="font-display text-lg font-bold text-ink">Livrin</p>
          <p className="text-xs font-bold uppercase tracking-wider text-admin">Administração</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1.5 px-3 py-5" aria-label="Navegação administrativa">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-[48px] items-center gap-3 rounded-xl px-4 text-[15px] font-semibold ${
                isActive ? 'hc-border border border-transparent bg-admin-container text-admin' : 'text-ink-muted hover:bg-surface-high hover:text-ink'
              }`
            }
          >
            <Icon className="h-5 w-5" aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 border-t-2 border-outline p-3">
        {user && (
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-subtle">{user.email}</p>
            </div>
          </div>
        )}
        <Link to="/" onClick={onNavigate} className="flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-sm font-semibold text-ink-muted hover:bg-surface-high hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar ao site
        </Link>
      </div>
    </div>
  );
}

/** Layout próprio da área administrativa: mesma identidade visual, com acento laranja de "acesso restrito". */
export default function AdminLayout() {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  useEffect(() => setDrawer(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-bg">
      <a href="#admin-content" className="sr-only-focusable fixed left-3 top-3 z-[70] rounded-lg bg-primary px-4 py-2 font-semibold text-primary-on">
        Pular para o conteúdo
      </a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[260px] border-r-2 border-outline lg:block">
        <AdminNav />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu administrativo">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} aria-label="Fechar menu" />
          <div className="relative h-full w-[280px] max-w-[85vw]">
            <button type="button" className="icon-btn absolute right-2 top-3 z-10" onClick={() => setDrawer(false)} aria-label="Fechar menu">
              <X className="h-5 w-5" aria-hidden />
            </button>
            <AdminNav onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b-2 border-outline bg-admin-container px-4 backdrop-blur md:px-8">
          <button type="button" className="icon-btn lg:hidden" onClick={() => setDrawer(true)} aria-label="Abrir menu administrativo">
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <ShieldAlert className="h-5 w-5 text-admin" aria-hidden />
          <p className="eyebrow text-admin">Área administrativa · Acesso restrito</p>
        </header>
        <main id="admin-content" tabIndex={-1} className="mx-auto w-full max-w-[1320px] px-4 py-6 focus:outline-none md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
