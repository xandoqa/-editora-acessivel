import { useCallback, useEffect, useRef } from 'react';
import { api } from '../../lib/api';

export interface SessionFlags {
  lastPage?: number;
  usedAudioDesc?: boolean;
  usedHighContrast?: boolean;
  usedDyslexicFont?: boolean;
  usedZoom?: boolean;
}

/**
 * Registra uma sessão de leitura na API ao abrir a obra e envia, de forma
 * agrupada (debounce), a página atual e os recursos de acessibilidade usados.
 * Esses dados alimentam as métricas reais dos painéis do autor e da administração.
 */
export function useReadingSession(workId: number | undefined, enabled: boolean) {
  const sessionId = useRef<string | null>(null);
  /** Token assinado devolvido ao abrir a sessão: a API só aceita atualizações com ele. */
  const sessionToken = useRef<string | null>(null);
  const pending = useRef<SessionFlags>({});
  const sent = useRef<SessionFlags>({});
  const timer = useRef<number>();

  const flush = useCallback(() => {
    const id = sessionId.current;
    const token = sessionToken.current;
    const body = pending.current;
    if (!id || !token || !Object.keys(body).length) return;
    pending.current = {};
    api.patch(`/sessions/${id}`, body, { headers: { 'X-Session-Token': token } }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!workId || !enabled) return;
    let cancelled = false;
    api
      .post<{ id: string; token: string }>(`/works/${workId}/sessions`)
      .then((res) => {
        if (cancelled) return;
        sessionId.current = res.data.id;
        sessionToken.current = res.data.token;
        flush();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      window.clearTimeout(timer.current);
      flush();
      sessionId.current = null;
      sessionToken.current = null;
      sent.current = {};
    };
  }, [workId, enabled, flush]);

  return useCallback(
    (flags: SessionFlags) => {
      // Envia apenas o que mudou (flags booleanas só precisam ser enviadas uma vez).
      const changes: SessionFlags = {};
      for (const [k, v] of Object.entries(flags) as [keyof SessionFlags, SessionFlags[keyof SessionFlags]][]) {
        if (v === undefined || v === false) continue;
        if (sent.current[k] === v) continue;
        (changes as Record<string, unknown>)[k] = v;
        (sent.current as Record<string, unknown>)[k] = v;
      }
      if (!Object.keys(changes).length) return;
      pending.current = { ...pending.current, ...changes };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 1500);
    },
    [flush],
  );
}
