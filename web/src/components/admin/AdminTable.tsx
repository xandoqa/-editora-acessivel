import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';

/** Cabeçalho de coluna ordenável (aria-sort para leitores de tela). */
export function SortHeader({ label, field, sort, order, onSort }: { label: string; field: string; sort: string; order: 'asc' | 'desc'; onSort: (field: string) => void }) {
  const active = sort === field;
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3">
      <button type="button" className="inline-flex items-center gap-1.5 font-semibold hover:text-ink" onClick={() => onSort(field)}>
        {label} <Icon className="h-3.5 w-3.5" aria-hidden />
      </button>
    </th>
  );
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={`px-4 py-3 font-semibold ${className}`}>
      {children}
    </th>
  );
}

export function TableShell({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export const theadClass = 'border-b border-outline/40 bg-surface-high text-xs uppercase tracking-wider text-ink-muted';
export const rowClass = 'border-b border-outline/30 last:border-0 hover:bg-surface-high';

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-outline bg-surface px-3">
      <Search className="h-4 w-4 text-ink-muted" aria-hidden />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
      />
    </div>
  );
}
