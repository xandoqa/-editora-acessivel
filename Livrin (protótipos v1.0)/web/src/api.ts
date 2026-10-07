export type Book = { id: number; title: string; genre: string; pages: number; synopsis: string; status: string; reads: number; authorId: number };
export const api = async <T,>(url: string, body?: unknown, method?: string): Promise<T> => {
  const r = await fetch('/api' + url, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const d = r.status === 204 ? null : await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
};
