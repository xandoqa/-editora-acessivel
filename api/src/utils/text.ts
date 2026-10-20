/** Gera um slug ASCII a partir de um texto em português ("Ficção Científica" → "ficcao-cientifica"). */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/** Escapa curingas do LIKE/ILIKE para que a busca do usuário seja literal. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
