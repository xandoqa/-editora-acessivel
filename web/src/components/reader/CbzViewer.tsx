import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { PALETTES } from './readerPrefs';
import type { ViewerProps } from './types';
import { Spinner } from '../ui';

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
/** Quantas páginas ficam decodificadas na memória ao mesmo tempo. */
const MAX_CACHE = 6;
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };

/** Leitor de quadrinhos CBZ (ZIP de imagens), com ordenação natural das pranchas. */
export default function CbzViewer({ data, page, onPageCount, prefs, title, pageAlt }: ViewerProps) {
  const [entries, setEntries] = useState<JSZip.JSZipObject[]>([]);
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState('');
  const cache = useRef(new Map<string, string>());

  useEffect(() => {
    let active = true;
    const urls = cache.current;
    JSZip.loadAsync(data)
      .then((zip) => {
        if (!active) return;
        const images = Object.values(zip.files)
          .filter((f) => !f.dir && IMAGE_RE.test(f.name) && !f.name.startsWith('__MACOSX'))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        if (!images.length) throw new Error('vazio');
        setEntries(images);
        onPageCount(images.length);
      })
      .catch(() => active && setError('Não foi possível abrir este arquivo CBZ.'));
    return () => {
      active = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, [data, onPageCount]);

  useEffect(() => {
    const entry = entries[Math.min(Math.max(1, page), entries.length) - 1];
    if (!entry) return;
    const cached = cache.current.get(entry.name);
    if (cached) {
      setUrl(cached);
      return;
    }
    let active = true;
    entry.async('blob').then((blob) => {
      const ext = entry.name.split('.').pop()!.toLowerCase();
      const objectUrl = URL.createObjectURL(new Blob([blob], { type: MIME[ext] ?? 'image/jpeg' }));
      cache.current.set(entry.name, objectUrl);
      // Mantém só as páginas vizinhas na memória. Sem este limite, uma HQ longa
      // acumulava o blob de TODAS as páginas visitadas até sair da tela.
      while (cache.current.size > MAX_CACHE) {
        const [oldestName, oldestUrl] = cache.current.entries().next().value as [string, string];
        if (oldestName === entry.name) break;
        URL.revokeObjectURL(oldestUrl);
        cache.current.delete(oldestName);
      }
      if (active) setUrl(objectUrl);
    });
    return () => {
      active = false;
    };
  }, [entries, page]);

  if (error) return <p className="p-6 text-center text-danger">{error}</p>;
  if (!url) return <div className="flex min-h-[300px] items-center justify-center"><Spinner label="Carregando prancha..." /></div>;
  return (
    <div className="w-full overflow-x-auto">
      <img
        src={url}
        alt={pageAlt ? `Página ${page}: ${pageAlt}` : `Página ${page} de ${title}`}
        className="mx-auto block rounded-lg"
        style={{ width: `${prefs.scale}%`, maxWidth: 'none', filter: PALETTES[prefs.palette].imageFilter }}
      />
    </div>
  );
}
