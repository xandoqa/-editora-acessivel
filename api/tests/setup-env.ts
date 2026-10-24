import 'dotenv/config';
import os from 'node:os';
import path from 'node:path';

/**
 * Variáveis de ambiente dos testes, definidas ANTES de importar a aplicação.
 * Os testes de integração usam um banco PostgreSQL dedicado (TEST_DATABASE_URL),
 * que é apagado e recriado a cada arquivo de teste. Nunca aponte para o banco real.
 *
 * A URL vem do ambiente ou do arquivo api/.env (carregado acima). Não há senha
 * embutida neste arquivo de propósito: credenciais ficam só em arquivos .env.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL não definida.\n' +
      'Os testes APAGAM e recriam o banco apontado por ela, então ela precisa ser informada de propósito.\n' +
      'Defina em api/.env (copie de api/.env.example) ou na linha de comando:\n' +
      '  TEST_DATABASE_URL=postgres://livrin_user:SUA_SENHA@localhost:5432/livrin_test npm test',
  );
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters!!';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `livrin-test-uploads-${process.pid}`);
process.env.SEED_DEMO_DATA = 'false';
process.env.ADMIN_EMAIL = '';
process.env.ADMIN_PASSWORD = '';
process.env.BCRYPT_ROUNDS = '4';
process.env.LOG_REQUESTS = 'false';
