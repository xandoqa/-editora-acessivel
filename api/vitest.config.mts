import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup-env.ts'],
    // Os testes de integração compartilham o mesmo banco de teste: executar em série.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
