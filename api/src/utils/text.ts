/** Gera um slug ASCII a partir de um texto em português ("Ficção Científica" → "ficcao-cientifica"). */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    // Remove os sinais diacríticos separados pelo NFD (U+0300 a U+036F).
    // Escrito com escapes de propósito: os caracteres combinantes literais são
    // invisíveis no editor e somem se o arquivo for salvo fora de UTF-8.
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
