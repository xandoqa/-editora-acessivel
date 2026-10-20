import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb } from '../src/db/client';
import { api, bearer, createUser, login, resetDatabase } from './helpers';

beforeAll(resetDatabase);
afterAll(closeDb);

describe('Autenticação', () => {
  it('cadastra sempre como USER, mesmo se o cliente tentar enviar role=ADMIN', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ANA@Teste.com', password: 'Senha12345', role: 'ADMIN' });
    // O schema é estrito: campos desconhecidos (role) são rejeitados.
    expect(res.status).toBe(400);

    const ok = await api().post('/api/auth/register').send({ name: 'Ana', email: 'ANA@Teste.com', password: 'Senha12345' });
    expect(ok.status).toBe(201);
    expect(ok.body.user.role).toBe('USER');
    expect(ok.body.user.email).toBe('ana@teste.com');
    expect(ok.body.user).not.toHaveProperty('passwordHash');
    expect(ok.body.token).toBeTypeOf('string');
  });

  it('rejeita e-mail duplicado e senha fraca', async () => {
    const dup = await api().post('/api/auth/register').send({ name: 'Ana 2', email: 'ana@teste.com', password: 'Senha12345' });
    expect(dup.status).toBe(409);
    const weak = await api().post('/api/auth/register').send({ name: 'Bia', email: 'bia@teste.com', password: '123' });
    expect(weak.status).toBe(400);
    expect(weak.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('faz login e retorna o perfil em /auth/me', async () => {
    const token = await login('ana@teste.com');
    const me = await api().get('/api/auth/me').set(bearer(token));
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('ana@teste.com');
  });

  it('recusa senha errada com mensagem genérica', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'ana@teste.com', password: 'errada123' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('E-mail ou senha incorretos.');
    const unknown = await api().post('/api/auth/login').send({ email: 'ninguem@teste.com', password: 'errada123' });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.message).toBe(res.body.error.message);
  });

  it('recusa token inválido ou ausente', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/auth/me').set(bearer('abc.def.ghi'))).status).toBe(401);
  });

  it('altera a senha exigindo a senha atual', async () => {
    const token = await login('ana@teste.com');
    const wrong = await api().post('/api/auth/me/password').set(bearer(token)).send({ currentPassword: 'x', newPassword: 'NovaSenha123' });
    expect(wrong.status).toBe(400);
    const ok = await api().post('/api/auth/me/password').set(bearer(token)).send({ currentPassword: 'Senha12345', newPassword: 'NovaSenha123' });
    expect(ok.status).toBe(204);
    await login('ana@teste.com', 'NovaSenha123');
  });
});

describe('Autorização da área administrativa', () => {
  it('bloqueia /api/admin/* para visitantes (401) e usuários comuns (403)', async () => {
    await createUser('comum@teste.com');
    const token = await login('comum@teste.com');
    expect((await api().get('/api/admin/stats')).status).toBe(401);
    const res = await api().get('/api/admin/stats').set(bearer(token));
    expect(res.status).toBe(403);
    expect((await api().patch('/api/admin/works/1/status').set(bearer(token)).send({ status: 'PUBLICADO' })).status).toBe(403);
  });

  it('permite ADMIN e aplica desativação imediatamente (mesmo com token válido)', async () => {
    const admin = await createUser('chefe@teste.com', 'ADMIN');
    const other = await createUser('alvo@teste.com');
    const adminToken = await login('chefe@teste.com');
    const otherToken = await login('alvo@teste.com');
    expect((await api().get('/api/admin/stats').set(bearer(adminToken))).status).toBe(200);

    const off = await api().patch(`/api/admin/users/${other.id}`).set(bearer(adminToken)).send({ isActive: false });
    expect(off.status).toBe(200);
    expect((await api().get('/api/auth/me').set(bearer(otherToken))).status).toBe(401);
    expect((await api().post('/api/auth/login').send({ email: 'alvo@teste.com', password: 'Senha12345' })).status).toBe(401);

    // Proteções: não pode remover o próprio acesso nem excluir a própria conta.
    expect((await api().patch(`/api/admin/users/${admin.id}`).set(bearer(adminToken)).send({ role: 'USER' })).status).toBe(400);
    expect((await api().delete(`/api/admin/users/${admin.id}`).set(bearer(adminToken))).status).toBe(400);
  });

  it('redefine a senha de um usuário', async () => {
    const adminToken = await login('chefe@teste.com');
    const u = await createUser('esqueceu@teste.com');
    const res = await api().post(`/api/admin/users/${u.id}/reset-password`).set(bearer(adminToken)).send({ password: 'Temporaria123' });
    expect(res.status).toBe(204);
    await login('esqueceu@teste.com', 'Temporaria123');
  });

  it('valida IDs de rota e parâmetros de busca', async () => {
    const adminToken = await login('chefe@teste.com');
    expect((await api().get('/api/admin/users/abc').set(bearer(adminToken))).status).toBe(400);
    const injection = await api().get('/api/admin/users').query({ q: "%' OR 1=1 --" }).set(bearer(adminToken));
    expect(injection.status).toBe(200);
    expect(injection.body.data).toHaveLength(0);
  });
});
