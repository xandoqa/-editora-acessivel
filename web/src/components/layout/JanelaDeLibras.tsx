import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Hand, Loader2 } from 'lucide-react';
import { safeStorage } from '../../lib/api';

/**
 * Janela de Libras (VLibras).
 *
 * Liga uma janela com um avatar que sinaliza em Libras o texto que a pessoa
 * seleciona na tela. O tradutor é o **VLibras**, suíte livre do governo
 * federal desenvolvida com a UFPB, usada no gov.br e em vários tribunais.
 *
 * Quatro decisões, e nenhuma delas é detalhe:
 *
 *  1. **É opcional e começa desligada.** Mesma mecânica da leitura em voz
 *     alta: quem quer, liga. Recurso de acessibilidade imposto a todo mundo
 *     atrapalha quem não precisa dele.
 *
 *  2. **O script só é baixado quando se liga.** Enquanto o botão estiver
 *     desligado, esta aplicação não faz uma única requisição a
 *     `vlibras.gov.br`. O projeto não carrega script de terceiro em lugar
 *     nenhum — nem a publicidade carrega —, e essa é a única exceção: ela
 *     acontece por escolha explícita da pessoa, não por padrão.
 *
 *  3. **A falha é dita, não escondida.** O avatar vem de um serviço externo.
 *     Se ele estiver fora do ar, ou se a máquina estiver sem internet, o
 *     botão avisa em vez de ficar girando para sempre. Um recurso de
 *     acessibilidade que falha em silêncio é pior que um ausente.
 *
 *  4. **Diz o que é.** Tradução automática por avatar não equivale a
 *     intérprete humano: Libras é uma língua com gramática própria, não
 *     português sinalizado. A interface declara que é automática, para que
 *     ninguém tome por mais do que é.
 */

/** O que o VLibras injeta no `window` depois de carregar. */
declare global {
  interface Window {
    VLibras?: { Widget: new (rootPath: string) => unknown };
  }
}

/**
 * Os atributos que o plugin procura no DOM (`vw`, `vw-access-button`,
 * `vw-plugin-wrapper`) não existem no HTML padrão. Declará-los aqui é o que
 * permite escrevê-los em JSX com tipo, em vez de burlar o compilador.
 */
declare module 'react' {
  interface HTMLAttributes<T> {
    vw?: string;
    'vw-access-button'?: string;
    'vw-plugin-wrapper'?: string;
  }
}

const URL_APP = 'https://vlibras.gov.br/app';
const URL_PLUGIN = `${URL_APP}/vlibras-plugin.js`;
const CHAVE = 'livrin_libras';
/** Depois disso, considera-se que o serviço não respondeu. */
const LIMITE_MS = 15_000;

type Estado = 'desligado' | 'carregando' | 'ligado' | 'falhou';

/**
 * Carrega o plugin uma única vez por sessão.
 *
 * O `new window.VLibras.Widget(...)` roda dentro do `onload` do script, e não
 * depois da tag: inicializar antes de o plugin terminar de carregar quebra
 * com `onLoadPlayer is not a function`.
 */
let promessaDoPlugin: Promise<void> | null = null;

function carregarPlugin(): Promise<void> {
  if (promessaDoPlugin) return promessaDoPlugin;
  promessaDoPlugin = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = URL_PLUGIN;
    script.async = true;

    const limite = window.setTimeout(() => {
      reject(new Error('tempo esgotado'));
    }, LIMITE_MS);

    script.onload = () => {
      window.clearTimeout(limite);
      if (!window.VLibras?.Widget) {
        reject(new Error('plugin carregou sem o Widget'));
        return;
      }
      try {
        new window.VLibras.Widget(URL_APP);
        resolve();
      } catch (erro) {
        reject(erro instanceof Error ? erro : new Error('falha ao iniciar o widget'));
      }
    };
    script.onerror = () => {
      window.clearTimeout(limite);
      reject(new Error('não foi possível baixar o plugin'));
    };

    document.head.appendChild(script);
  }).catch((erro) => {
    // Uma falha não pode envenenar as tentativas seguintes: a pessoa pode
    // reconectar e tentar de novo.
    promessaDoPlugin = null;
    throw erro;
  });
  return promessaDoPlugin;
}

export default function JanelaDeLibras({ classeBotao }: { classeBotao: string }) {
  const [estado, setEstado] = useState<Estado>('desligado');
  const [aviso, setAviso] = useState('');
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const ligar = async () => {
    setEstado('carregando');
    setAviso('');
    try {
      await carregarPlugin();
      if (!montado.current) return;
      setEstado('ligado');
      safeStorage.set(CHAVE, 'on');
    } catch {
      if (!montado.current) return;
      setEstado('falhou');
      safeStorage.remove(CHAVE);
      setAviso(
        'Não foi possível carregar a janela de Libras. O tradutor é um serviço externo (vlibras.gov.br): ' +
          'verifique sua conexão e tente de novo.',
      );
    }
  };

  const desligar = () => {
    setEstado('desligado');
    setAviso('');
    safeStorage.remove(CHAVE);
  };

  // Quem deixou ligado na visita anterior encontra ligado na próxima.
  useEffect(() => {
    if (safeStorage.get(CHAVE) === 'on') void ligar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alternar = () => {
    if (estado === 'ligado') desligar();
    else if (estado !== 'carregando') void ligar();
  };

  const rotulo =
    estado === 'ligado'
      ? 'Desligar a janela de Libras'
      : estado === 'carregando'
        ? 'Carregando a janela de Libras'
        : 'Ligar a janela de Libras (tradução automática)';

  return (
    <>
      <button
        type="button"
        className={classeBotao}
        onClick={alternar}
        aria-pressed={estado === 'ligado'}
        disabled={estado === 'carregando'}
        title={rotulo}
      >
        {estado === 'carregando' ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <Hand className="h-5 w-5" aria-hidden />
        )}
        <span className="sr-only">{rotulo}</span>
      </button>

      {/* O aviso é educado — não rouba o foco — mas chega a quem usa leitor
          de tela, que é exatamente o público que precisa saber que o recurso
          não subiu. */}
      <span aria-live="polite" className="sr-only">
        {estado === 'ligado' ? 'Janela de Libras ligada.' : aviso}
      </span>

      {aviso && (
        <p
          role="alert"
          className="card absolute right-2 top-16 z-40 max-w-xs p-3 text-sm text-ink shadow-card"
        >
          {aviso}
        </p>
      )}

      {/*
       * A marcação que o VLibras procura. Vai no `body` por portal porque o
       * plugin a espera no nível mais alto do documento, e aqui ela nasceria
       * dentro do cabeçalho, que é `sticky` e cria contexto de empilhamento —
       * a janela do avatar ficaria presa dentro da barra.
       *
       * Fica montada só enquanto o recurso está ligado: desligar remove a
       * janela da tela. O script em si permanece carregado até recarregar a
       * página, porque navegador nenhum descarrega script — e fingir o
       * contrário seria mentir para quem lê este código.
       */}
      {estado === 'ligado' &&
        createPortal(
          <div vw="" className="enabled">
            <div vw-access-button="" className="active" />
            <div vw-plugin-wrapper="">
              <div className="vw-plugin-top-wrapper" />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
