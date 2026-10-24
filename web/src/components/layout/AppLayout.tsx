import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { HandHeart, X } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { OndaDivisoria } from '../ui/Ornamentos';

/**
 * Rodapé do site. É aqui que mora o convite para apoiar o projeto: discreto, no
 * fim da página, como pede a seção 19 da especificação — nunca um banner, nunca
 * um anteparo na frente da leitura.
 */
function Rodape() {
  return (
    <footer className="mt-16 border-t-2 border-outline pt-8">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-10 md:flex-row md:items-center md:justify-between md:px-8">
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">
          O Livrin é uma editora digital aberta: quem não tem como bancar um lançamento tradicional publica e é lido aqui. Ler é de graça e
          continua sendo.
        </p>
        <div className="flex shrink-0 items-center gap-4">
          <span className="text-xs text-ink-subtle" title="Versão do site que está no seu navegador">
            v{__LIVRIN_VERSAO__}
          </span>
          <Link to="/apoiar" className="btn-secondary">
            <HandHeart className="h-4 w-4" aria-hidden /> Apoiar o Livrin
          </Link>
        </div>
      </div>
    </footer>
  );
}

/** Estrutura do protótipo: barra lateral fixa + barra superior + conteúdo. */
export default function AppLayout() {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawer(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <div className="min-h-screen bg-bg">
      <a href="#main-content" className="sr-only-focusable fixed left-3 top-3 z-[70] rounded-lg bg-primary px-4 py-2 font-semibold text-primary-on">
        Pular para o conteúdo
      </a>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[272px] border-r-2 border-outline lg:block">
        <Sidebar />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} aria-label="Fechar menu" />
          <div className="relative h-full w-[290px] max-w-[85vw] border-r-2 border-outline">
            <button type="button" className="icon-btn absolute right-2 top-3 z-10" onClick={() => setDrawer(false)} aria-label="Fechar menu">
              <X className="h-5 w-5" aria-hidden />
            </button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-[272px]">
        <Topbar onOpenMenu={() => setDrawer(true)} />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1280px] px-4 py-6 focus:outline-none md:px-8 md:py-8">
          <Outlet />
        </main>
        <OndaDivisoria />
        <Rodape />
      </div>
    </div>
  );
}
