import { Link } from 'react-router-dom';
import { AudioLines, BookOpen, Ear, Eye, Headphones, Info, PersonStanding, SpellCheck2, Square, Type, Video } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { FeatureFlag, Work } from '../../types/api';
import { FORMAT_SHORT } from '../../lib/labels';
import { speak, speechSupported, stopSpeaking } from '../../lib/speech';
import { Cover } from '../ui';

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
  hasAltoContraste: { label: 'WCAG AAA', icon: <Eye className="h-3.5 w-3.5" />, tone: 'text-accent' },
  hasAudioDesc: { label: 'Audio HQ', icon: <Ear className="h-3.5 w-3.5" />, tone: 'text-primary' },
  hasLibras: { label: 'Vídeo Libras', icon: <Video className="h-3.5 w-3.5" />, tone: 'text-primary' },
  hasFacilLeitura: { label: 'Lexical', icon: <SpellCheck2 className="h-3.5 w-3.5" />, tone: 'text-primary' },
  hasLeitorTela: { label: 'AAA', icon: <PersonStanding className="h-3.5 w-3.5" />, tone: 'text-accent' },
};

function pick<T>(work: Work, map: Partial<Record<FeatureFlag, T>>): T | undefined {
  const flag = (Object.keys(map) as FeatureFlag[]).find((f) => work[f]);
  return flag ? map[flag] : undefined;
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
    <article className="card flex flex-col overflow-hidden shadow-card" aria-labelledby={`work-${work.id}-title`}>
      <div className="relative h-56 overflow-hidden bg-surface-high">
        <Cover url={work.coverUrl} title={work.title} alt="" className="decorative-tint h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" aria-hidden />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {top ? (
            <span className="chip min-w-0 truncate bg-black/60 text-white backdrop-blur">
              {top.icon}
              {top.label}
            </span>
          ) : (
            <span />
          )}
          <span className="chip shrink-0 bg-black/70 text-white">
            {work.genre.name} · {work.pages}p
          </span>
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <p className="eyebrow mb-1 text-[11px] text-[#d6e2ff]">{work.editionLabel ?? FORMAT_SHORT[work.format]}</p>
          <h3 id={`work-${work.id}-title`} className="text-2xl font-bold leading-tight text-white">
            {work.title}
          </h3>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-ink">{work.author.name}</p>
          {side && (
            <span className={`flex shrink-0 items-center gap-1 text-xs font-bold ${side.tone}`}>
              {side.icon}
              {side.label}
            </span>
          )}
        </div>
        <p className="mb-4 line-clamp-2 flex-1 text-sm text-ink-muted">{work.synopsis}</p>
        <div className="flex items-center gap-2">
          <Link to={`/reader/${work.id}`} className="btn-primary flex-1" aria-label={`Ler agora: ${work.title}`}>
            <BookOpen className="h-4 w-4" aria-hidden /> Ler agora
          </Link>
          <button
            type="button"
            className="icon-btn bg-surface-high"
            onClick={listen}
            disabled={!speechSupported}
            aria-pressed={speaking}
            aria-label={speaking ? `Parar leitura da sinopse de ${work.title}` : `Ouvir sinopse de ${work.title}`}
          >
            <Headphones className="h-5 w-5" aria-hidden />
          </button>
          <Link to={`/reader/${work.id}#ficha`} className="icon-btn bg-surface-high" aria-label={`Detalhes de ${work.title}`}>
            <Info className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
