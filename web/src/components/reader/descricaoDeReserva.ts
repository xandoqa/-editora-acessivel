import { FEATURES, FORMAT_LABEL, ageRatingLabel } from '../../lib/labels';
import type { AudioDescription, Work } from '../../types/api';

/**
 * Audiodescrição de reserva.
 *
 * Nem toda obra tem audiodescrição cadastrada página a página — e até agora,
 * quando não tinha, o botão de audiodescrição simplesmente não fazia nada.
 * Um botão que não faz nada é pior que um botão ausente: promete um recurso
 * de acessibilidade e não entrega.
 *
 * Esta função monta uma descrição a partir do que o sistema **de fato sabe**
 * sobre a obra: a descrição da capa escrita pela autoria, a ficha, os
 * recursos declarados, a sinopse e as notas. Nada é inventado — e onde falta
 * informação, a narração diz que falta, em vez de preencher com conversa.
 *
 * O resultado tem o mesmo formato da audiodescrição real, então o player
 * existente reproduz, pausa e para sem saber a diferença.
 */

/** Um trecho só existe se tiver conteúdo real. Nada de "não informado". */
function trecho(pageNumber: number, label: string, texto: string | null | undefined): AudioDescription | null {
  const limpo = (texto ?? '').trim();
  if (!limpo) return null;
  return {
    id: -pageNumber,
    workId: 0,
    pageNumber,
    // Sem rótulo de capítulo: o player já escreve "Audiodescrição Narrada:"
    // antes do título, e um "Descrição da obra" no meio produzia um cabeçalho
    // com dois 'dois-pontos' seguidos.
    chapterLabel: null,
    chapterTitle: label,
    panelLabel: label,
    description: limpo,
    dialogues: [],
  };
}

/** A ficha lida em voz: formato, páginas, gênero e classificação. */
function ficha(work: Work): string {
  const partes = [
    `${FORMAT_LABEL[work.format] ?? work.format}`,
    `${work.pages} ${work.pages === 1 ? 'página' : 'páginas'}`,
    work.genre?.name,
    work.ageRating ? `classificação ${ageRatingLabel(work.ageRating)}` : null,
  ].filter(Boolean);
  return `${partes.join(', ')}.`;
}

/** Os recursos de acessibilidade que a autoria declarou e a curadoria conferiu. */
function recursos(work: Work): string | null {
  const declarados = FEATURES.filter((f) => work[f.flag]).map((f) => f.label.toLowerCase());
  if (!declarados.length) return null;
  return `Esta obra declara os seguintes recursos: ${declarados.join('; ')}.`;
}

export function descricaoDeReserva(work: Work): AudioDescription[] {
  const capa =
    work.coverAlt?.trim() ||
    (work.coverUrl
      ? 'A capa desta obra não tem descrição cadastrada pela autoria. ' +
        'Peça a inclusão pela página de edição da obra.'
      : 'Esta obra ainda não tem capa enviada.');

  const itens = [
    trecho(1, 'Capa', capa),
    trecho(1, 'Ficha', `${work.title}${work.subtitle ? `. ${work.subtitle}` : ''}, de ${work.author.name}. ${ficha(work)}`),
    trecho(1, 'Recursos de acessibilidade', recursos(work)),
    trecho(1, 'Sinopse', work.synopsis),
    trecho(1, 'Notas da autoria', work.authorNotes),
  ].filter((t): t is AudioDescription => t !== null);

  itens.push(
    trecho(
      1,
      'Aviso',
      'Esta é uma descrição básica, montada a partir da ficha da obra. ' +
        'A audiodescrição página a página ainda não foi cadastrada para este título.',
    )!,
  );

  return itens;
}
