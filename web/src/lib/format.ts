const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const monthYearFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const numberFmt = new Intl.NumberFormat('pt-BR');

export const formatDate = (d?: string | null) => (d ? dateFmt.format(new Date(d)) : '—');
export const formatDateTime = (d?: string | null) => (d ? dateTimeFmt.format(new Date(d)) : '—');
export const formatNumber = (n: number) => numberFmt.format(n);

export function formatMonthYear(d?: string | null): string {
  if (!d) return '—';
  const s = monthYearFmt.format(new Date(d));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Hoje, 11:15", "Ontem, 16:40" ou data curta. */
export function formatRelative(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (diffDays === 0) return `Hoje, ${time}`;
  if (diffDays === 1) return `Ontem, ${time}`;
  return formatDateTime(d);
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
