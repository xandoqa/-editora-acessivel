import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LogoMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-9 w-9 rounded-xl';
  return (
    <span className={`hc-border inline-flex items-center justify-center brand-mark border border-transparent ${box}`} aria-hidden>
      <BookOpen className={size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'} />
    </span>
  );
}

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3 rounded-xl" aria-label="Livrin — Quadrinhos Acessíveis, ir para o catálogo">
      <LogoMark />
      <span className="leading-tight">
        <span className="block font-display text-lg font-bold text-ink">Livrin</span>
        <span className="block text-xs font-semibold text-accent">Quadrinhos Acessíveis</span>
      </span>
    </Link>
  );
}
