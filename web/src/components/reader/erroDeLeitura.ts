/**
 * Mensagens de falha dos leitores.
 *
 * Todos os leitores tinham a mesma falha de origem: um `catch` que trocava o
 * erro real por uma frase fixa — "Não foi possível abrir este EPUB", "...este
 * arquivo CBZ", "...este arquivo do Word". A frase é verdadeira e inútil. Ela
 * não distingue arquivo que não chegou de arquivo corrompido, não diz se o
 * problema é do servidor ou do arquivo, e não dá nada a quem for investigar.
 *
 * Aqui o erro é traduzido para linguagem comum **e** o detalhe técnico é
 * mantido junto. As bibliotecas que o projeto usa já dizem coisas específicas
 * ("Can't find end of central directory", "sem document.xml"); descartar isso
 * era jogar fora a única pista que existia.
 */

/** Nome e mensagem do erro, quando houver, em uma linha. */
export function detalheTecnico(err: unknown): string {
  if (err instanceof Error) {
    return [err.name, err.message].filter(Boolean).join(': ');
  }
  if (typeof err === 'string') return err;
  const obj = err as { name?: string; message?: string } | null;
  return [obj?.name, obj?.message].filter(Boolean).join(': ');
}

/**
 * Pistas que as bibliotecas de ZIP dão quando o arquivo não é o que diz ser.
 * EPUB, CBZ e DOCX são todos ZIP, então compartilham os mesmos sintomas.
 */
function causaDeZip(detalhe: string): string | null {
  const d = detalhe.toLowerCase();
  if (d.includes('end of central directory') || d.includes('corrupted zip')) {
    return 'O arquivo não chegou inteiro, ou não é um arquivo compactado válido. Reenvie a obra.';
  }
  if (d.includes('encrypted')) {
    return 'O arquivo está protegido por senha e o navegador não consegue abri-lo. Reenvie sem proteção.';
  }
  return null;
}

/**
 * Mensagem completa para um formato que não abriu.
 *
 * `formato` aparece para a pessoa ("EPUB", "CBZ", "DOCX"); `alternativa` é o
 * que ela pode fazer agora, que para todos os formatos é baixar e abrir num
 * programa do computador.
 */
export function falhaAoAbrir(formato: string, err: unknown): string {
  const detalhe = detalheTecnico(err);
  const causa = causaDeZip(detalhe);
  const base =
    causa ??
    `O leitor do navegador não conseguiu interpretar este ${formato}. ` +
      'Use o botão de baixar para abrir a obra em um programa do computador.';
  return detalhe ? `${base}\n\nDetalhe técnico: ${detalhe}` : base;
}
