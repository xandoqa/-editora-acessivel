/**
 * Síntese de voz do navegador (Web Speech API), usada para:
 *  - "Ouvir introdução da página" / botão de alto-falante da barra superior;
 *  - "Ouvir sinopse" nos cards do catálogo;
 *  - narrar a audiodescrição quando a obra não possui faixa de áudio gravada.
 * Não depende de serviço externo nem de chave de API.
 */
import { safeStorage } from './api';

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const CHAVE_VOZ = 'livrin.voz';
const CHAVE_VELOCIDADE = 'livrin.voz.velocidade';

/**
 * As vozes em português instaladas no sistema.
 *
 * A qualidade da leitura NÃO depende deste código: quem fala é o motor de voz
 * do sistema operacional. No Linux o padrão costuma ser o espeak, que é
 * robótico a ponto de atrapalhar; em Windows, macOS e Chrome há vozes bem
 * melhores. Como não dá para melhorar o motor a partir daqui, o que se pode
 * fazer é deixar a pessoa escolher entre o que ela tem — e é por isso que esta
 * lista existe.
 */
export function vozesDisponiveis(): SpeechSynthesisVoice[] {
  if (!speechSupported) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('pt'))
    .sort((a, b) => Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name));
}

export function vozEscolhida(): string {
  return safeStorage.get(CHAVE_VOZ) ?? '';
}

export function escolherVoz(voiceURI: string) {
  safeStorage.set(CHAVE_VOZ, voiceURI);
}

export function velocidade(): number {
  const bruto = Number(safeStorage.get(CHAVE_VELOCIDADE));
  return Number.isFinite(bruto) && bruto >= 0.5 && bruto <= 2 ? bruto : 1;
}

export function ajustarVelocidade(valor: number) {
  safeStorage.set(CHAVE_VELOCIDADE, String(valor));
}

function ptVoice(): SpeechSynthesisVoice | undefined {
  if (!speechSupported) return undefined;
  const vozes = window.speechSynthesis.getVoices();
  const preferida = vozEscolhida();
  if (preferida) {
    const achada = vozes.find((v) => v.voiceURI === preferida);
    if (achada) return achada;
  }
  return vozes.find((v) => v.lang === 'pt-BR') ?? vozes.find((v) => v.lang.startsWith('pt'));
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
  u.rate = opts.rate ?? velocidade();
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
