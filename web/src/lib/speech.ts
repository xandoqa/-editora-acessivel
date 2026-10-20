/**
 * Síntese de voz do navegador (Web Speech API), usada para:
 *  - "Ouvir introdução da página" / botão de alto-falante da barra superior;
 *  - "Ouvir sinopse" nos cards do catálogo;
 *  - narrar a audiodescrição quando a obra não possui faixa de áudio gravada.
 * Não depende de serviço externo nem de chave de API.
 */
export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function ptVoice(): SpeechSynthesisVoice | undefined {
  if (!speechSupported) return undefined;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'pt-BR') ?? voices.find((v) => v.lang.startsWith('pt'));
}

export interface SpeakOptions {
  rate?: number;
  onEnd?: () => void;
  onError?: () => void;
}

export function speak(text: string, opts: SpeakOptions = {}): SpeechSynthesisUtterance | null {
  if (!speechSupported || !text.trim()) return null;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  const voice = ptVoice();
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 1;
  u.onend = () => opts.onEnd?.();
  u.onerror = (e) => {
    // "interrupted"/"canceled" acontecem quando o usuário pausa: não é erro real.
    if (e.error !== 'interrupted' && e.error !== 'canceled') opts.onError?.();
  };
  window.speechSynthesis.speak(u);
  return u;
}

export function stopSpeaking() {
  if (speechSupported) window.speechSynthesis.cancel();
}

export function isSpeaking() {
  return speechSupported && window.speechSynthesis.speaking;
}
