import { NavLink, useNavigate } from 'react-router-dom';
import { BookOpenText, ClipboardList, Crown, History, LayoutDashboard, Library, LibraryBig, LogOut, PersonStanding, ShieldCheck, SquarePlus, UserRoundCog } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useMySummary } from '../../hooks/queries';
import { useT } from '../../i18n/I18nContext';
import { ROLE_LABEL } from '../../lib/labels';
import Logo from './Logo';
import PainelDeAcessibilidade from './PainelDeAcessibilidade';

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
        /* O item ativo era um bloco de cor preenchido. Agora é um filete à
           esquerda com o texto em tinta cheia: continua inequívoco — e o
           aria-current do NavLink nunca dependeu da cor —, mas para de competir
           com o conteúdo da página. */
        `flex min-h-[48px] items-center gap-3 border-l-2 pl-4 pr-3 text-[15px] transition-colors ${
          isActive ? 'border-primary font-semibold text-ink' : 'border-transparent font-medium text-ink-muted hover:border-outline/30 hover:text-ink'
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
  const { user, isAdmin, isWriter, logout } = useAuth();
  const { data: summary } = useMySummary();
  const navigate = useNavigate();
  const t = useT();
  const inReview = summary?.inReview ?? 0;

  // A navegação acompanha o papel: leitores não veem a área de publicação.
  // Esconder o menu é conveniência; quem recusa de fato é a API.
  const items: NavItem[] = [{ to: '/', label: t('nav.inicio'), icon: <BookOpenText className="h-5 w-5" />, end: true }];

  if (isWriter) {
    items.push(
      { to: '/submit', label: t('nav.publicarObra'), icon: <SquarePlus className="h-5 w-5" /> },
      {
        to: '/review',
        label: t('nav.emAnalise'),
        icon: <ClipboardList className="h-5 w-5" />,
        badge:
          inReview > 0 ? (
            <span className="rounded-md bg-surface-highest px-2 py-0.5 text-xs font-bold text-ink" aria-label={t('nav.emAnaliseContagem', { n: inReview })}>
              {inReview}
            </span>
          ) : undefined,
      },
      { to: '/dashboard', label: t('nav.meuPainel'), icon: <LayoutDashboard className="h-5 w-5" /> },
    );
  }

  items.push({
    to: '/leitor',
    label: t('nav.leitorAcessivel'),
    icon: <LibraryBig className="h-5 w-5" />,
    badge: <span className="chip bg-accent-container text-accent">{t('nav.audio')}</span>,
  });

  // A biblioteca e o histórico só existem para quem tem conta: os dois
  // pertencem à conta, não ao navegador.
  if (user) {
    items.push({ to: '/biblioteca', label: t('nav.biblioteca'), icon: <Library className="h-5 w-5" /> });
    items.push({ to: '/historico', label: t('nav.historico'), icon: <History className="h-5 w-5" /> });
  }
  // Planos aparece para todo mundo: no cabeçalho ele some em tela pequena, e
  // é aqui que quem usa celular vai encontrá-lo.
  items.push({ to: '/planos', label: t('nav.planos'), icon: <Crown className="h-5 w-5" /> });
  if (user && !isWriter) {
    items.push({ to: '/profile', label: t('nav.queroPublicar'), icon: <SquarePlus className="h-5 w-5" /> });
  }
  if (isAdmin) items.push({ to: '/admin', label: t('conta.administracao'), icon: <ShieldCheck className="h-5 w-5 text-admin" /> });

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex h-[72px] items-center border-b border-outline/25 px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5" aria-label={t('nav.principal')}>
        {items.map((item) => (
          <Item key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="space-y-2 border-t border-outline/25 p-3">
        {/* Só aparece abaixo de 640px, que é onde o grupo do cabeçalho some.
            É o que torna alto contraste, tamanho do texto, leitura em voz alta
            e Libras alcançáveis no celular. */}
        <PainelDeAcessibilidade />
        <div className="card-high flex items-center gap-3 px-4 py-3">
          <PersonStanding className="h-6 w-6 shrink-0 text-accent" aria-hidden />
          <p className="text-xs font-semibold leading-snug text-ink">
            {t('nav.selo')
              .split('\n')
              .map((linha) => (
                <span key={linha} className="block">
                  {linha}
                </span>
              ))}
          </p>
        </div>
        {user ? (
          <>
            <div className="px-4 pb-1 pt-2">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="text-xs font-semibold text-accent">{ROLE_LABEL[user.role]}</p>
            </div>
            <button
              type="button"
              className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-4 text-[15px] font-semibold text-ink-muted hover:bg-surface-high hover:text-ink"
              onClick={() => {
                logout();
                onNavigate?.();
                navigate('/login');
              }}
            >
              <LogOut className="h-5 w-5" aria-hidden />
              {t('conta.sairDaConta')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-4 text-[15px] font-semibold text-ink-muted hover:bg-surface-high hover:text-ink"
            onClick={() => {
              onNavigate?.();
              navigate('/login');
            }}
          >
            <UserRoundCog className="h-5 w-5" aria-hidden />
            {t('conta.entrarOuCriar')}
          </button>
        )}
      </div>
    </div>
  );
}
