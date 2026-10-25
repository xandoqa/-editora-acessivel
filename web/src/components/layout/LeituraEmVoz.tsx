import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Settings2 } from 'lucide-react';
import {
  ajustarVelocidade,
  escolherVoz,
  speechSupported,
  velocidade as velocidadeSalva,
  vozEscolhida,
  vozesDisponiveis,
} from '../../lib/speech';
import { iniciarLeituraPorPalavra, type ControleDeLeitura } from '../../lib/leituraPorPalavra';

/**
 * Botão de leitura em voz alta.
 *
 * Substitui o modo que lia a página inteira de uma vez. Ligado, o Livrin fala
 * a palavra sob o ponteiro, e as setas ← → andam palavra a palavra para quem
 * não usa mouse.
 *
 * O seletor de voz existe porque a qualidade da fala é do sistema
 * operacional, não deste código: a mesma página soa bem num computador e
 * robótica em outro, conforme as vozes instaladas. Deixar escolher é o que
 * está ao nosso alcance.
 */
export default function LeituraEmVoz({ classeBotao }: { classeBotao: string }) {
  const [ligado, setLigado] = useState(false);
  const [painel, setPainel] = useState(false);
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([]);
  const [vozURI, setVozURI] = useState(vozEscolhida());
  const [velocidade, setVelocidade] = useState(velocidadeSalva());
  const [ultimaPalavra, setUltimaPalavra] = useState('');
  const controle = useRef<ControleDeLeitura | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // A lista de vozes chega de forma assíncrona na maioria dos navegadores.
  useEffect(() => {
    if (!speechSupported) return;
    const carregar = () => setVozes(vozesDisponiveis());
    carregar();
    window.speechSynthesis.addEventListener('voiceschanged', carregar);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', carregar);
  }, []);

  useEffect(() => {
    if (!ligado) {
      controle.current?.parar();
      controle.current = null;
      setUltimaPalavra('');
      return;
    }
    const raiz = document.getElementById('main-content');
    if (!raiz) return;
    controle.current = iniciarLeituraPorPalavra(raiz, setUltimaPalavra);
    return () => {
      controle.current?.parar();
      controle.current = null;
    };
  }, [ligado]);

  // Fecha o painel ao clicar fora.
  useEffect(() => {
    if (!painel) return;
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setPainel(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [painel]);

  if (!speechSupported) {
    return (
      <button type="button" className={classeBotao} disabled title="Seu navegador não suporta leitura em voz alta">
        <Volume2 className="h-5 w-5" aria-hidden />
        <span className="sr-only">Leitura em voz alta indisponível neste navegador</span>
      </button>
    );
  }

  return (
    <div className="relative flex items-center" ref={caixa}>
      <button
        type="button"
        className={classeBotao}
        onClick={() => setLigado((v) => !v)}
        aria-pressed={ligado}
        title={ligado ? 'Desligar leitura em voz alta' : 'Ler em voz alta a palavra sob o cursor'}
      >
        {ligado ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
        <span className="sr-only">{ligado ? 'Desligar leitura em voz alta' : 'Ligar leitura em voz alta'}</span>
      </button>

      <button
        type="button"
        className={classeBotao}
        onClick={() => setPainel((v) => !v)}
        aria-expanded={painel}
        title="Ajustar voz e velocidade"
      >
        <Settings2 className="h-4 w-4" aria-hidden />
        <span className="sr-only">Ajustar voz e velocidade da leitura</span>
      </button>

      {/* Aviso do que está sendo lido, para leitor de tela e para quem quiser
          confirmar visualmente. Não interrompe: é uma região educada. */}
      <span aria-live="polite" className="sr-only">
        {ultimaPalavra}
      </span>

      {painel && (
        <div className="card absolute right-0 top-12 z-40 w-[20rem] p-4 text-sm" role="dialog" aria-label="Ajustes da leitura em voz alta">
          <p className="eyebrow mb-2 text-ink-subtle">Leitura em voz alta</p>
          <p className="mb-3 leading-relaxed text-ink-muted">
            Ligada, o Livrin fala a palavra sob o ponteiro. Sem mouse, use <kbd className="font-semibold text-ink">←</kbd> e{' '}
            <kbd className="font-semibold text-ink">→</kbd> para andar palavra a palavra.
          </p>

          <label htmlFor="voz" className="label">
            Voz
          </label>
          <select
            id="voz"
            className="input py-2"
            value={vozURI}
            onChange={(e) => {
              setVozURI(e.target.value);
              escolherVoz(e.target.value);
            }}
          >
            <option value="">Voz padrão do sistema</option>
            {vozes.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>

          <label htmlFor="velocidade" className="label mt-3">
            Velocidade: {velocidade.toFixed(1)}×
          </label>
          <input
            id="velocidade"
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={velocidade}
            className="w-full"
            onChange={(e) => {
              const valor = Number(e.target.value);
              setVelocidade(valor);
              ajustarVelocidade(valor);
            }}
          />

          {vozes.length === 0 && (
            <p className="mt-3 leading-relaxed text-ink-muted">
              Nenhuma voz em português encontrada neste computador. A qualidade da fala vem do sistema operacional — instalar vozes em
              português resolve, e no Chrome costuma haver vozes melhores que no Firefox.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
