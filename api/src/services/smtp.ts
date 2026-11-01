import net from 'node:net';
import tls from 'node:tls';

/**
 * Cliente SMTP mínimo, sem dependência nenhuma.
 *
 * Por que escrever isto em vez de instalar uma biblioteca
 * ------------------------------------------------------
 * Nodemailer resolveria em três linhas. Mas o projeto tem `package-lock.json`
 * travado e a integração contínua roda `npm ci`, que recusa um lock que não
 * bate com o `package.json` — então acrescentar dependência exige resolver a
 * árvore, e isso não é algo que se faz no escuro. SMTP, por outro lado, é um
 * protocolo de texto de 1982: abrir a conexão, cumprimentar, autenticar,
 * dizer de quem e para quem, mandar o corpo e desligar. São seis comandos.
 *
 * O que ele faz e o que não faz
 * -----------------------------
 * Faz: TLS implícito (porta 465), `AUTH LOGIN`, um destinatário, corpo em
 * UTF-8, assunto com acento, `Reply-To` apontando para quem escreveu.
 *
 * Não faz: STARTTLS na porta 587, anexos, múltiplos destinatários, fila de
 * reenvio, OAuth. Nada disso é necessário aqui e cada um deles seria código
 * sem teste. Se um dia for necessário, aí sim vale a biblioteca.
 *
 * Erro nunca derruba a requisição: quem chama grava a mensagem primeiro e
 * trata a falha de entrega como informação, não como exceção fatal.
 */

export interface ConfigSmtp {
  host: string;
  port: number;
  user: string;
  /** Senha de app do provedor. Nunca a senha da conta. */
  pass: string;
  /** Caixa que recebe. */
  para: string;
  /** Nome exibido no remetente. */
  remetenteNome: string;
}

export interface Mensagem {
  assunto: string;
  corpo: string;
  /** Vai no `Reply-To`: responder no cliente de e-mail escreve para quem mandou. */
  responderPara?: string;
}

/** Fábrica de conexão. Existe para o teste poder usar socket simples. */
export type Conectar = (host: string, port: number) => net.Socket;

const conectarComTls: Conectar = (host, port) =>
  tls.connect({ host, port, servername: host }) as unknown as net.Socket;

const TEMPO_LIMITE_MS = 15_000;

/**
 * Assunto com acento precisa de "palavra codificada" (RFC 2047).
 *
 * Cabeçalho de e-mail é ASCII de sete bits. "Nova mensagem — Dúvida" escrito
 * cru chega como lixo em boa parte dos clientes.
 */
function cabecalhoCodificado(texto: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7E]*$/.test(texto)) return texto;
  return `=?UTF-8?B?${Buffer.from(texto, 'utf8').toString('base64')}?=`;
}

/** Base64 quebrado em 76 colunas, como manda o formato. */
function corpoBase64(texto: string): string {
  return (Buffer.from(texto, 'utf8').toString('base64').match(/.{1,76}/g) ?? []).join('\r\n');
}

/**
 * Conversa com o servidor.
 *
 * Resposta de SMTP pode vir em várias linhas: as intermediárias trazem hífen
 * depois do código (`250-STARTTLS`) e só a última traz espaço (`250 OK`). Ler
 * só o primeiro pedaço que chega é o erro clássico aqui — e dá um cliente que
 * funciona com um servidor e trava com outro.
 */
class Conversa {
  private buffer = '';
  private esperando: { resolve: (linha: string) => void; reject: (e: Error) => void } | null = null;

  constructor(private readonly socket: net.Socket) {
    socket.setEncoding('utf8');
    socket.on('data', (pedaco: string) => {
      this.buffer += pedaco;
      const linhas = this.buffer.split('\r\n');
      for (let i = 0; i < linhas.length - 1; i++) {
        const linha = linhas[i];
        // Linha final de uma resposta: código, espaço, texto.
        if (/^\d{3} /.test(linha) && this.esperando) {
          const pendente = this.esperando;
          this.esperando = null;
          this.buffer = linhas.slice(i + 1).join('\r\n');
          pendente.resolve(linha);
          return;
        }
      }
    });
    socket.on('error', (e) => this.esperando?.reject(e));
    socket.on('close', () => this.esperando?.reject(new Error('conexão encerrada pelo servidor')));
  }

  /** Espera a próxima resposta completa e confere o código esperado. */
  async esperar(codigos: number[]): Promise<string> {
    const linha = await new Promise<string>((resolve, reject) => {
      this.esperando = { resolve, reject };
    });
    const codigo = Number(linha.slice(0, 3));
    if (!codigos.includes(codigo)) {
      throw new Error(`servidor respondeu "${linha.trim()}" (esperado ${codigos.join(' ou ')})`);
    }
    return linha;
  }

  /** Manda um comando e espera a resposta. */
  async dizer(comando: string, codigos: number[]): Promise<string> {
    this.socket.write(`${comando}\r\n`);
    return this.esperar(codigos);
  }
}

/**
 * Entrega uma mensagem. Lança em caso de falha; quem chama decide o que fazer.
 */
export async function enviarEmail(
  cfg: ConfigSmtp,
  msg: Mensagem,
  conectar: Conectar = conectarComTls,
): Promise<void> {
  const socket = conectar(cfg.host, cfg.port);
  socket.setTimeout(TEMPO_LIMITE_MS, () => socket.destroy(new Error('tempo esgotado falando com o servidor de e-mail')));

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once('error', reject);
      // `secureConnect` é o que o socket TLS emite depois do aperto de mão;
      // `connect`, o que um socket simples emite — e é esse que o teste usa.
      socket.once('secureConnect', () => resolve());
      socket.once('connect', () => resolve());
    });

    const conversa = new Conversa(socket);
    await conversa.esperar([220]);
    await conversa.dizer('EHLO livrin', [250]);
    await conversa.dizer('AUTH LOGIN', [334]);
    await conversa.dizer(Buffer.from(cfg.user, 'utf8').toString('base64'), [334]);
    await conversa.dizer(Buffer.from(cfg.pass, 'utf8').toString('base64'), [235]);
    await conversa.dizer(`MAIL FROM:<${cfg.user}>`, [250]);
    await conversa.dizer(`RCPT TO:<${cfg.para}>`, [250, 251]);
    await conversa.dizer('DATA', [354]);

    const cabecalhos = [
      `From: ${cabecalhoCodificado(cfg.remetenteNome)} <${cfg.user}>`,
      `To: <${cfg.para}>`,
      msg.responderPara ? `Reply-To: <${msg.responderPara}>` : '',
      `Subject: ${cabecalhoCodificado(msg.assunto)}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
    ].filter(Boolean);

    // O ponto sozinho encerra os dados. Como o corpo vai em base64 — cujo
    // alfabeto não tem ponto — nenhuma linha dele pode ser confundida com o
    // encerramento, e o "dot stuffing" fica desnecessário.
    await conversa.dizer(`${cabecalhos.join('\r\n')}\r\n\r\n${corpoBase64(msg.corpo)}\r\n.`, [250]);
    await conversa.dizer('QUIT', [221]).catch(() => undefined);
  } finally {
    socket.destroy();
  }
}
