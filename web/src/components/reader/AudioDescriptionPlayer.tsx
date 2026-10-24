import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Headphones, Pause, Play, RotateCcw, RotateCw, X } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { formatDuration } from '../../lib/format';
import { speak, speechSupported, stopSpeaking } from '../../lib/speech';
import type { AudioDescription, Work } from '../../types/api';

export interface PlayerHandle {
  toggle: () => void;
  play: () => void;
}

interface Props {
  work: Pick<Work, 'id' | 'title' | 'hasAudio' | 'audioNarrator'>;
  descriptions: AudioDescription[];
  currentPage: number;
  onGoToPage: (page: number) => void;
  onUse: () => void;
  onClose: () => void;
}

const RATES = [1, 1.25, 1.5];
const RATE_LABEL: Record<number, string> = { 1: '1.0x', 1.25: '1.25x', 1.5: '1.5x' };

/** Texto narrado de uma página: descrição do quadro seguida das falas. */
export function narrationText(ad: AudioDescription): string {
  const parts = [ad.panelLabel ? `${ad.panelLabel}.` : '', ad.description];
  for (const d of ad.dialogues) parts.push(`${d.speaker}${d.tone ? `, ${d.tone.toLowerCase()}` : ''}: ${d.text}`);
  return parts.filter(Boolean).join(' ');
}

/**
 * Player de audiodescrição. Dois modos reais:
 *  - "áudio": reproduz a faixa MP3/OGG/M4A enviada para a obra (com avanço/retorno de 10s e velocidade);
 *  - "voz sintetizada": quando não há faixa gravada, narra a audiodescrição página a página com a
 *    síntese de voz do navegador e vira as páginas do leitor em sincronia.
 */
const AudioDescriptionPlayer = forwardRef<PlayerHandle, Props>(function AudioDescriptionPlayer(
  { work, descriptions, currentPage, onGoToPage, onUse, onClose },
  ref,
) {
  const mode: 'audio' | 'tts' = work.hasAudio ? 'audio' : 'tts';
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioError, setAudioError] = useState('');
  /** Pedido de reprodução feito antes de a faixa terminar de baixar. */
  const playWhenReady = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  const items = useMemo(() => [...descriptions].sort((a, b) => a.pageNumber - b.pageNumber), [descriptions]);
  const [index, setIndex] = useState(0);
  const playingRef = useRef(false);
  const rateRef = useRef(rate);
  rateRef.current = rate;

  /* ------------------------------- Modo áudio ------------------------------ */
  useEffect(() => {
    if (mode !== 'audio') return;
    let url = '';
    let active = true;
    api
      .get<Blob>(`/works/${work.id}/audio`, { responseType: 'blob' })
      .then((res) => {
        if (!active) return;
        url = URL.createObjectURL(res.data);
        setAudioUrl(url);
      })
      .catch(
        (err: unknown) =>
          active &&
          // A API explica quando a faixa some do volume ou nunca existiu;
          // trocar isso por uma frase fixa some com a única pista.
          setAudioError(errorMessage(err, 'Não foi possível carregar a faixa de audiodescrição.')),
      );
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [mode, work.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate, audioUrl]);

  /* ---------------------------- Modo voz sintética ------------------------- */
  // Mantém o trecho alinhado com a página exibida quando o player está parado.
  useEffect(() => {
    if (mode !== 'tts' || playingRef.current || !items.length) return;
    const i = items.findIndex((ad) => ad.pageNumber >= currentPage);
    setIndex(i === -1 ? items.length - 1 : i);
  }, [currentPage, items, mode]);

  const speakFrom = useCallback(
    (i: number) => {
      const ad = items[i];
      if (!ad) {
        playingRef.current = false;
        setPlaying(false);
        return;
      }
      setIndex(i);
      onGoToPage(ad.pageNumber);
      speak(narrationText(ad), {
        rate: rateRef.current,
        onEnd: () => {
          if (!playingRef.current) return;
          if (i + 1 < items.length) speakFrom(i + 1);
          else {
            playingRef.current = false;
            setPlaying(false);
          }
        },
        onError: () => {
          playingRef.current = false;
          setPlaying(false);
        },
      });
    },
    [items, onGoToPage],
  );

  useEffect(() => () => stopSpeaking(), []);

  /* --------------------------------- Ações --------------------------------- */
  const play = useCallback(() => {
    onUse();
    if (mode === 'audio') {
      if (audioRef.current) void audioRef.current.play();
      // A faixa ainda está baixando: toca sozinha assim que estiver pronta,
      // em vez de o clique simplesmente não fazer nada.
      else playWhenReady.current = true;
      return;
    }
    if (!items.length || !speechSupported) return;
    playingRef.current = true;
    setPlaying(true);
    speakFrom(index);
  }, [index, items.length, mode, onUse, speakFrom]);

  const pause = useCallback(() => {
    if (mode === 'audio') {
      audioRef.current?.pause();
      return;
    }
    playingRef.current = false;
    setPlaying(false);
    stopSpeaking();
  }, [mode]);

  const toggle = useCallback(() => (playing ? pause() : play()), [pause, play, playing]);
  useImperativeHandle(ref, () => ({ toggle, play }), [toggle, play]);

  const skip = (delta: number) => {
    if (mode === 'audio') {
      const a = audioRef.current;
      if (a) a.currentTime = Math.min(Math.max(0, a.currentTime + delta), a.duration || 0);
      return;
    }
    const next = Math.min(Math.max(0, index + (delta > 0 ? 1 : -1)), items.length - 1);
    if (playingRef.current) speakFrom(next);
    else {
      setIndex(next);
      if (items[next]) onGoToPage(items[next].pageNumber);
    }
  };

  const changeRate = (r: number) => {
    setRate(r);
    rateRef.current = r;
    if (mode === 'tts' && playingRef.current) speakFrom(index); // reinicia o trecho na nova velocidade
  };

  const close = () => {
    pause();
    onClose();
  };

  const current = items[index];
  const unavailable = mode === 'tts' ? (!speechSupported ? 'Seu navegador não suporta síntese de voz.' : !items.length ? 'Esta obra ainda não possui audiodescrição cadastrada.' : '') : audioError;
  const progress = mode === 'audio' ? (duration ? (time / duration) * 100 : 0) : items.length ? ((index + (playing ? 0.5 : 0)) / items.length) * 100 : 0;
  const heading = current ? [current.chapterLabel, current.chapterTitle].filter(Boolean).join(': ') : 'Prólogo';

  return (
    <section className="card flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-8 md:p-6" aria-labelledby="player-title">
      <div className="flex min-w-0 items-start gap-4 md:w-[34%]">
        <span className="hc-border inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-transparent bg-accent-container text-accent" aria-hidden>
          <Headphones className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h2 id="player-title" className="text-lg font-semibold leading-snug text-ink">
            Audiodescrição Narrada: {heading}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {mode === 'audio'
              ? `Voz de ${work.audioNarrator ?? 'narração gravada'} • Ritmo ajustado com descrições táteis de cenários`
              : 'Síntese de voz do navegador (pt-BR) • Narra a descrição e as falas de cada página'}
          </p>
        </div>
      </div>

      <div className="flex-1">
        {unavailable ? (
          <p className="text-sm text-ink-muted" role="status">
            {unavailable}
          </p>
        ) : mode === 'audio' && !audioUrl ? (
          <p className="text-sm text-ink-muted" role="status">
            Carregando a faixa de audiodescrição...
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-center gap-4">
              <button type="button" className="icon-btn" onClick={() => skip(-10)} aria-label={mode === 'audio' ? 'Voltar 10 segundos' : 'Trecho anterior'}>
                <RotateCcw className="h-6 w-6" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-on hover:brightness-110"
                onClick={toggle}
                aria-label={playing ? 'Pausar audiodescrição' : 'Reproduzir audiodescrição'}
              >
                {playing ? <Pause className="h-6 w-6 fill-current" aria-hidden /> : <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden />}
              </button>
              <button type="button" className="icon-btn" onClick={() => skip(10)} aria-label={mode === 'audio' ? 'Avançar 10 segundos' : 'Próximo trecho'}>
                <RotateCw className="h-6 w-6" aria-hidden />
              </button>
            </div>
            <div className="flex items-center gap-3 text-sm tabular-nums text-ink-muted">
              <span className="w-14 text-right">{mode === 'audio' ? formatDuration(time) : `${index + 1}`}</span>
              {mode === 'audio' ? (
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={1}
                  value={time}
                  onChange={(e) => {
                    if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
                  }}
                  className="h-2 flex-1 accent-[rgb(var(--c-primary))]"
                  aria-label="Posição da audiodescrição"
                  aria-valuetext={`${formatDuration(time)} de ${formatDuration(duration)}`}
                />
              ) : (
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-surface-highest"
                  role="progressbar"
                  aria-label="Progresso da audiodescrição"
                  aria-valuemin={0}
                  aria-valuemax={items.length}
                  aria-valuenow={index + 1}
                  aria-valuetext={`Trecho ${index + 1} de ${items.length}`}
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
              )}
              <span className="w-14">{mode === 'audio' ? formatDuration(duration) : `${items.length}`}</span>
            </div>
            {mode === 'tts' && current && (
              <p className="mt-2 text-center text-xs text-ink-subtle" aria-live="polite">
                Trecho {index + 1} de {items.length} — página {current.pageNumber}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <div className="flex rounded-xl bg-surface-high p-1" role="group" aria-label="Velocidade de reprodução">
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={rate === r}
              onClick={() => changeRate(r)}
              className={`min-h-[40px] rounded-lg px-3 text-sm font-semibold ${rate === r ? 'bg-surface-highest text-ink' : 'text-ink-muted hover:text-ink'}`}
            >
              {RATE_LABEL[r]}
            </button>
          ))}
        </div>
        <button type="button" className="icon-btn" onClick={close} aria-label="Fechar player de audiodescrição">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {mode === 'audio' && audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onCanPlay={(e) => {
            if (!playWhenReady.current) return;
            playWhenReady.current = false;
            void e.currentTarget.play();
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          className="hidden"
        />
      )}
    </section>
  );
});

export default AudioDescriptionPlayer;
