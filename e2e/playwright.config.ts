import { defineConfig, devices } from '@playwright/test';

/**
 * Testes E2E contra um ambiente já em execução (Docker ou npm run dev).
 * BASE_URL padrão: http://localhost:5173. Requer SEED_DEMO_DATA=true e as
 * credenciais definidas no .env (ADMIN_EMAIL/ADMIN_PASSWORD/DEMO_USER_PASSWORD).
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
});
