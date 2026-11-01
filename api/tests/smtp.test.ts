import net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { enviarEmail } from '../src/services/smtp';

/**
 * O cliente SMTP, conversando com um servidor de mentira.
 *
 * Um cliente de protocolo escrito à mão sem teste é um palpite. Aqui há um
 * servidor SMTP de brinquedo, montado com `net`, que fala o suficiente do
 * protocolo para o cliente achar que é real — e que grava tudo que recebeu,
 * para o teste conferir o que foi dito, em que ordem, e como o corpo chegou.
 *
 * O que estes testes seguram, e que já foi defeito em cliente SMTP de todo
 * mundo: resposta em várias linhas lida pela metade; assunto com acento
 * chegando como lixo; e falha de autenticação tratada como sucesso.
 */

let servidor: net.Server | undefined;

interface Registro {
  comandos: string[];
  dados: string;
}

/**
 * Sobe um servidor SMTP de brinquedo.
 *
 * `respostas` permite trocar a resposta de um comando para testar falha — por
 * exemplo, devolver 535 no AUTH.
 */
function servidorFalso(respostas: Record<string, string> = {}): Promise<{ porta: number; registro: Registro }> {
  const registro: Registro = { comandos: [], dados: '' };
  return new Promise((resolve) => {
    servidor = net.createServer((socket) => {
      let emDados = false;
      let buffer = '';
      socket.write('220 fake.livrin ESMTP pronto\r\n');

      socket.on('data', (pedaco) => {
        buffer += pedaco.toString('utf8');
        let corte: number;
        while ((corte = buffer.indexOf('\r\n')) >= 0) {
          const linha = buffer.slice(0, corte);
          buffer = buffer.slice(corte + 2);

          if (emDados) {
            if (linha === '.') {
              emDados = false;
              socket.write('250 2.0.0 aceito\r\n');
            } else {
              registro.dados += `${linha}\n`;
            }
            continue;
          }

          registro.comandos.push(linha);
          const verbo = linha.split(' ')[0].toUpperCase();

          if (respostas[verbo]) {
            socket.write(`${respostas[verbo]}\r\n`);
            continue;
          }

          if (verbo === 'EHLO') {
            // RESPOSTA EM VÁRIAS LINHAS, de propósito: é o formato real, e um
            // cliente que lê só o primeiro pedaço quebra exatamente aqui.
            socket.write('250-fake.livrin saudações\r\n250-SIZE 35882577\r\n250-8BITMIME\r\n250 AUTH LOGIN PLAIN\r\n');
          } else if (verbo === 'AUTH') {
            socket.write('334 VXNlcm5hbWU6\r\n');
          } else if (verbo === 'MAIL' || verbo === 'RCPT') {
            socket.write('250 2.1.0 ok\r\n');
          } else if (verbo === 'DATA') {
            emDados = true;
            socket.write('354 pode mandar\r\n');
          } else if (verbo === 'QUIT') {
            socket.write('221 tchau\r\n');
            socket.end();
          } else {
            // Base64 do usuário e da senha chegam como linha solta.
            socket.write(registro.comandos.filter((c) => !c.includes(' ')).length >= 2 ? '235 autenticado\r\n' : '334 UGFzc3dvcmQ6\r\n');
          }
        }
      });
      socket.on('error', () => undefined);
    });
    servidor.listen(0, '127.0.0.1', () => {
      resolve({ porta: (servidor!.address() as net.AddressInfo).port, registro });
    });
  });
}

const CFG = {
  host: '127.0.0.1',
  port: 0,
  user: 'remetente@exemplo.com',
  pass: 'senha-de-app',
  para: 'destino@exemplo.com',
  remetenteNome: 'Livrin — Fale Conosco',
};

/** Liga o cliente ao servidor de brinquedo em vez de abrir TLS de verdade. */
const conectarSimples = (host: string, port: number) => net.connect(port, host);

afterEach(() => {
  servidor?.close();
  servidor = undefined;
});

describe('cliente SMTP', () => {
  it('cumpre o diálogo inteiro e entrega a mensagem', async () => {
    const { porta, registro } = await servidorFalso();

    await enviarEmail(
      { ...CFG, port: porta },
      { assunto: 'Teste simples', corpo: 'Corpo da mensagem.', responderPara: 'quem.mandou@exemplo.com' },
      conectarSimples,
    );

    const verbos = registro.comandos.map((c) => c.split(' ')[0].toUpperCase());
    expect(verbos).toContain('EHLO');
    expect(verbos).toContain('AUTH');
    expect(verbos).toContain('DATA');
    expect(registro.comandos).toContain('MAIL FROM:<remetente@exemplo.com>');
    expect(registro.comandos).toContain('RCPT TO:<destino@exemplo.com>');

    // Responder o e-mail precisa escrever para quem mandou a mensagem, não
    // para a própria caixa — senão a caixa de entrada vira um monólogo.
    expect(registro.dados).toContain('Reply-To: <quem.mandou@exemplo.com>');
    expect(registro.dados).toContain('Content-Transfer-Encoding: base64');
  });

  it('entrega acento no assunto e no corpo sem virar lixo', async () => {
    const { porta, registro } = await servidorFalso();
    const corpo = 'Olá! A audiodescrição não está funcionando na obra "Raízes".';

    await enviarEmail({ ...CFG, port: porta }, { assunto: 'Dúvida sobre acessibilidade — urgente', corpo }, conectarSimples);

    // Cabeçalho de e-mail é ASCII de sete bits: acento precisa de palavra
    // codificada (RFC 2047), senão chega ilegível em metade dos clientes.
    expect(registro.dados).toContain('=?UTF-8?B?');
    const assuntoCru = registro.dados.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)?.[1] ?? '';
    expect(Buffer.from(assuntoCru, 'base64').toString('utf8')).toBe('Dúvida sobre acessibilidade — urgente');

    // E o corpo precisa voltar a ser exatamente o que foi escrito.
    const base64 = registro.dados.split('\n\n')[1]?.replace(/\n/g, '') ?? '';
    expect(Buffer.from(base64, 'base64').toString('utf8')).toBe(corpo);
  });

  it('não engasga com resposta de várias linhas no EHLO', async () => {
    // O servidor de brinquedo já responde o EHLO em quatro linhas. Se o
    // cliente lesse só o primeiro pedaço, o diálogo pararia aqui.
    const { porta, registro } = await servidorFalso();
    await enviarEmail({ ...CFG, port: porta }, { assunto: 'ok', corpo: 'ok' }, conectarSimples);
    expect(registro.comandos.map((c) => c.split(' ')[0])).toContain('QUIT');
  });

  it('falha quando a autenticação é recusada, em vez de fingir que deu certo', async () => {
    const { porta } = await servidorFalso({ AUTH: '535 5.7.8 usuário ou senha incorretos' });

    await expect(
      enviarEmail({ ...CFG, port: porta }, { assunto: 'x', corpo: 'y' }, conectarSimples),
    ).rejects.toThrow(/535/);
  });

  it('falha quando o destinatário é recusado', async () => {
    const { porta } = await servidorFalso({ RCPT: '550 5.1.1 caixa inexistente' });

    await expect(
      enviarEmail({ ...CFG, port: porta }, { assunto: 'x', corpo: 'y' }, conectarSimples),
    ).rejects.toThrow(/550/);
  });
});
