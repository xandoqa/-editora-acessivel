import fs from 'node:fs';
import path from 'node:path';

/**
 * Credenciais dos testes de ponta a ponta, lidas do `.env` da RAIZ do projeto.
 *
 * Antes cada valor tinha um padrão escrito aqui dentro, e esses padrões não
 * batiam com nenhum arquivo do projeto: rodar `npx playwright test` sem exportar
 * variáveis quebrava no login do administrador. Agora existe uma fonte só — o
 * mesmo `.env` que o `docker compose` usa — e os testes falham com uma mensagem
 * clara se ela não existir.
 */

const RAIZ = path.resolve(__dirname, '..');

function lerEnv(arquivo: string): Record<string, string> {
  if (!fs.existsSync(arquivo)) return {};
  const valores: Record<string, string> = {};
  for (const linha of fs.readFileSync(arquivo, 'utf8').split('\n')) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const corte = limpa.indexOf('=');
    if (corte < 0) continue;
    valores[limpa.slice(0, corte).trim()] = limpa.slice(corte + 1).trim().replace(/^["']|["']$/g, '');
  }
  return valores;
}

const doArquivo = lerEnv(path.join(RAIZ, '.env'));

/** Ambiente ganha do arquivo: dá para sobrescrever na linha de comando. */
function obrigatoria(nome: string): string {
  const valor = process.env[nome] ?? doArquivo[nome];
  if (!valor) {
    throw new Error(
      `${nome} não está definida. Os testes de ponta a ponta leem o .env da raiz do projeto.\n` +
        'Rode "./iniciar.sh" (ou "iniciar.bat") uma vez para criá-lo, ou exporte a variável antes de rodar os testes.',
    );
  }
  return valor;
}

export const ADMIN_EMAIL = obrigatoria('ADMIN_EMAIL');
export const ADMIN_PASSWORD = obrigatoria('ADMIN_PASSWORD');
export const DEMO_PASSWORD = obrigatoria('DEMO_USER_PASSWORD');
export const BASE_URL = process.env.BASE_URL ?? `http://localhost:${doArquivo.WEB_PORT ?? '5173'}`;
