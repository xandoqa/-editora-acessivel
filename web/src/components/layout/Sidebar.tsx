import { NavLink, useNavigate } from 'react-router-dom';
import { BookOpenText, ClipboardList, LayoutDashboard, LibraryBig, PersonStanding, ShieldCheck, SquarePlus, UserRoundCog } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useMySummary } from '../../hooks/queries';
import Logo from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  badge?: ReactNode;
}

function Item({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-[48px] items-center gap-3 rounded-xl px-4 text-[15px] font-semibold transition-colors ${
          isActive ? 'hc-border border border-transparent bg-primary-container text-primary' : 'text-ink-muted hover:bg-surface-high hover:text-ink'
        }`
      }
    >
      <span aria-hidden>{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge}
    </NavLink>
  );
}

/** Navegação lateral do protótipo. Em telas pequenas é exibida como gaveta (drawer). */
export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isAdmin, logout } = useAuth();
  const { data: summary } = useMySummary();
  const navigate = useNavigate();
  const inReview = summary?.inReview ?? 0;

  const items: NavItem[] = [
    { to: '/', label: 'Início / Catálogo', icon: <BookOpenText className="h-5 w-5" />, end: true },
    { to: '/submit', label: 'Publicar Obra', icon: <SquarePlus className="h-5 w-5" /> },
    {
      to: '/review',
      label: 'Em Análise',
      icon: <ClipboardList className="h-5 w-5" />,
      badge:
        inReview > 0 ? (
          <span className="rounded-md bg-surface-highest px-2 py-0.5 text-xs font-bold text-ink" aria-label={`${inReview} obra(s) em análise`}>
            {inReview}
          </span>
        ) : undefined,
    },
    { to: '/dashboard', label: 'Meu Painel', icon: <LayoutDashboard className="h-5 w-5" /> },
    {
      to: '/leitor',
      label: 'Leitor Acessível',
      icon: <LibraryBig className="h-5 w-5" />,
      badge: <span className="rounded-md bg-accent-container px-2 py-0.5 text-xs font-bold text-accent">AAA</span>,
    },
  ];
  if (isAdmin) items.push({ to: '/admin', label: 'Administração', icon: <ShieldCheck className="h-5 w-5 text-admin" /> });

  return (
    <div className="flex h-full flex-col bg-surface-low">
      <div className="flex h-[72px] items-center border-b border-outline/40 px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5" aria-label="Navegação principal">
        {items.map((item) => (
          <Item key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="space-y-2 border-t border-outline/40 p-3">
        <div className="card-high flex items-center gap-3 px-4 py-3">
          <PersonStanding className="h-6 w-6 shrink-0 text-accent" aria-hidden />
          <p className="text-xs font-semibold leading-snug text-ink">
            Diretriz WCAG 2.2
            <br />
            Totalmente Compatível
          </p>
        </div>
        <button
          type="button"
          className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-4 text-[15px] font-semibold text-ink-muted hover:bg-surface-high hover:text-ink"
          onClick={() => {
            if (user) logout();
            onNavigate?.();
            navigate('/login');
          }}
        >
          <UserRoundCog className="h-5 w-5" aria-hidden />
          {user ? 'Entrar / Trocar Conta' : 'Entrar / Criar Conta'}
        </button>
      </div>
    </div>
  );
}
