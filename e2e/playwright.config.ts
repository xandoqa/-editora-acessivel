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
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
});
