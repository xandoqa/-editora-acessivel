import os from 'node:os';
import path from 'node:path';

/**
 * Variáveis de ambiente dos testes, definidas ANTES de importar a aplicação.
 * Os testes de integração usam um banco PostgreSQL dedicado (TEST_DATABASE_URL),
 * que é apagado e recriado a cada arquivo de teste. Nunca aponte para o banco real.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://livrin_user:livrin_dev_password@localhost:5432/livrin_test';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters!!';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `livrin-test-uploads-${process.pid}`);
process.env.SEED_DEMO_DATA = 'false';
process.env.ADMIN_EMAIL = '';
process.env.ADMIN_PASSWORD = '';
process.env.BCRYPT_ROUNDS = '4';
process.env.LOG_REQUESTS = 'false';
