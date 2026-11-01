import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './env';

/**
 * Testes E2E contra um ambiente já em execução (Docker ou npm run dev).
 *
 * As credenciais e a porta saem do `.env` da raiz do projeto (ver env.ts), que
 * é o mesmo arquivo usado pelo docker compose — não há valores duplicados aqui.
 * Requer SEED_DEMO_DATA=true para que as contas de demonstração existam.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    /*
     * Idioma fixo em português.
     *
     * Desde a 3.5.5 a interface escolhe o idioma pelo `navigator.language`
     * quando não há escolha salva. O Chromium do Playwright roda em `en-US`
     * por padrão, então o site subia em INGLÊS e todos os seletores desta
     * suíte — que procuram "Entrar na Plataforma", "Criar minha conta",
     * "Aprovar e publicar" — falhavam.
     *
     * A suíte não roda na integração contínua, então isso passou despercebido.
     */
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
});
