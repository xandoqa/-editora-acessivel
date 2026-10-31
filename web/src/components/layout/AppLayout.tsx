import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import Rodape from './Rodape';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { OndaDivisoria } from '../ui/Ornamentos';

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

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[272px] border-r border-outline/30 lg:block">
        <Sidebar />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} aria-label="Fechar menu" />
          <div className="relative h-full w-[290px] max-w-[85vw] border-r border-outline/30">
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
