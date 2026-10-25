import { Link } from 'react-router-dom';
import { AudioLines, BookOpen, Ear, Eye, Headphones, Info, PersonStanding, SpellCheck2, Square, Type, Video } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { FeatureFlag, Work } from '../../types/api';
import { FORMAT_SHORT } from '../../lib/labels';
import { speak, speechSupported, stopSpeaking } from '../../lib/speech';
import { Cover } from '../ui';
import { SeloCompacto } from './SeloLivrin';

/** Selo superior (recurso de destaque) e etiqueta lateral, como nos cards do protótipo. */
const TOP_BADGE: Partial<Record<FeatureFlag, { label: string; icon: ReactNode }>> = {
  hasAudioDesc: { label: 'Áudio sincronizado', icon: <AudioLines className="h-3.5 w-3.5" /> },
  hasLibras: { label: 'Libras inclusa', icon: <Video className="h-3.5 w-3.5" /> },
  hasFacilLeitura: { label: 'Fácil leitura', icon: <SpellCheck2 className="h-3.5 w-3.5" /> },
  hasLeitorTela: { label: 'Texto ampliado', icon: <Type className="h-3.5 w-3.5" /> },
  hasTextoAlt: { label: 'Descrição de cenas', icon: <Square className="h-3.5 w-3.5" /> },
  hasAltoContraste: { label: 'Alto contraste', icon: <Eye className="h-3.5 w-3.5" /> },
};
const SIDE_TAG: Partial<Record<FeatureFlag, { label: string; icon: ReactNode; tone: string }>> = {
  hasAltoContraste: { label: 'Alto contraste', icon: <Eye className="h-3.5 w-3.5" />, tone: 'text-accent' },
  hasAudioDesc: { label: 'Audio HQ', icon: <Ear className="h-3.5 w-3.5" />, tone: 'text-primary' },
  hasLibras: { label: 'Vídeo Libras', icon: <Video className="h-3.5 w-3.5" />, tone: 'text-primary' },
  hasFacilLeitura: { label: 'Lexical', icon: <SpellCheck2 className="h-3.5 w-3.5" />, tone: 'text-primary' },
  hasLeitorTela: { label: 'Leitor de tela', icon: <PersonStanding className="h-3.5 w-3.5" />, tone: 'text-accent' },
};

function pick<T>(work: Work, map: Partial<Record<FeatureFlag, T>>): T | undefined {
  const flag = (Object.keys(map) as FeatureFlag[]).find((f) => work[f]);
  return flag ? map[flag] : undefined;
}

/**
 * A linha de ficha do card, sem repetição.
 *
 * `editionLabel` é livre e muitas vezes repete o gênero ("Ficção histórica" e
 * "Ficção Histórica"), o que imprime a mesma palavra duas vezes com caixa
 * diferente. Compara sem acento e sem caixa antes de juntar.
 */
function ficha(work: Work): string {
  const partes = [work.editionLabel ?? FORMAT_SHORT[work.format], work.genre.name, `${work.pages}p`];
  const vistas = new Set<string>();
  return partes
    .filter((parte) => {
      const chave = parte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      if (vistas.has(chave)) return false;
      vistas.add(chave);
      return true;
    })
    .join(' · ');
}

export default function WorkCard({ work }: { work: Work }) {
  const [speaking, setSpeaking] = useState(false);
  const top = pick(work, TOP_BADGE);
  const side = pick(
    work,
    work.hasAudioDesc && !work.hasAltoContraste ? { hasAudioDesc: SIDE_TAG.hasAudioDesc } : SIDE_TAG,
  );

  const listen = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const ok = speak(`${work.title}, de ${work.author.name}. ${work.synopsis}`, {
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    setSpeaking(!!ok);
  };

  return (
    /*
     * A arte fica inteira e o texto desce para a página.
     *
     * Antes o card era uma caixa com borda, sombra e três etiquetas sobre a
     * capa, e o título ficava escrito em cima da imagem. Isso tinha dois
     * problemas: o visual, de cada obra competir com a vizinha por atenção; e
     * o de acessibilidade, porque texto sobre imagem arbitrária não tem
     * contraste garantido — era preciso um gradiente preto cobrindo a arte só
     * para o título ser legível.
     *
     * Agora a capa aparece como foi desenhada e o título fica embaixo, sobre o
     * papel: contraste previsível, e a cor da página vem da arte, não da
     * interface.
     */
    <article className="group flex flex-col" aria-labelledby={`work-${work.id}-title`}>
      <Link
        to={`/reader/${work.id}`}
        className="block overflow-hidden rounded-[10px_14px_10px_14px] border border-outline/70 bg-surface-high"
        tabIndex={-1}
        aria-hidden
      >
        <Cover
          url={work.coverUrl}
          title={work.title}
          alt=""
          className="decorative-tint aspect-[16/9] w-full transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex flex-1 flex-col pt-3">
        <p className="eyebrow text-ink-subtle">{ficha(work)}</p>

        <h3 id={`work-${work.id}-title`} className="mt-1.5 font-display text-[1.375rem] font-semibold leading-[1.15] text-ink">
          {work.title}
        </h3>

        <p className="mt-1 truncate text-sm text-ink-muted">{work.author.name}</p>

        {/* Recursos assistivos como texto, não como etiqueta colorida: os
            ícones continuam, o peso visual sai. */}
        {(top || side) && (
          <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            {top && (
              <li className="flex items-center gap-1.5">
                {top.icon}
                {top.label}
              </li>
            )}
            {side && side.label !== top?.label && (
              <li className="flex items-center gap-1.5">
                {side.icon}
                {side.label}
              </li>
            )}
          </ul>
        )}

        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-muted">{work.synopsis}</p>

        <SeloCompacto work={work} className="mt-3 self-start" />

        <div className="mt-3 flex items-center gap-2 border-t border-outline/25 pt-3">
          <Link to={`/reader/${work.id}`} className="btn-secondary flex-1" aria-label={`Ler agora: ${work.title}`}>
            <BookOpen className="h-4 w-4" aria-hidden /> Ler agora
          </Link>
          <button
            type="button"
            className="icon-btn"
            onClick={listen}
            disabled={!speechSupported}
            aria-pressed={speaking}
            aria-label={speaking ? `Parar leitura da sinopse de ${work.title}` : `Ouvir sinopse de ${work.title}`}
          >
            <Headphones className="h-5 w-5" aria-hidden />
          </button>
          <Link to={`/reader/${work.id}#ficha`} className="icon-btn" aria-label={`Detalhes de ${work.title}`}>
            <Info className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
