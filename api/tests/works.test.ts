import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb } from '../src/db/client';
import { PDF_BYTES, api, bearer, createUser, login, resetDatabase, workFields } from './helpers';
import { DOCX_BYTES } from './fixtures/docx';

let author: string;
let reader: string;
let admin: string;
let workId: number;

function multipart(req: ReturnType<ReturnType<typeof api>['post']>, fields: Record<string, string>) {
  for (const [k, v] of Object.entries(fields)) req.field(k, v);
  return req;
}

beforeAll(async () => {
  await resetDatabase();
  await createUser('autora@teste.com', 'ESCRITOR');
  await createUser('leitor@teste.com', 'LEITOR');
  await createUser('curadoria@teste.com', 'ADMIN');
  author = await login('autora@teste.com');
  reader = await login('leitor@teste.com');
  admin = await login('curadoria@teste.com');
});
afterAll(closeDb);

describe('Três perfis de usuário', () => {
  it('leitor não cadastra obra; escritor cadastra', async () => {
    const negado = await multipart(api().post('/api/works').set(bearer(reader)), { ...workFields, action: 'draft' });
    expect(negado.status).toBe(403);
    expect(negado.body.error.code).toBe('FORBIDDEN');

    const permitido = await multipart(api().post('/api/works').set(bearer(author)), { ...workFields, action: 'draft' });
    expect(permitido.status).toBe(201);
  });

  it('leitor ativa o perfil de escritor e passa a poder cadastrar', async () => {
    await createUser('curiosa@teste.com', 'LEITOR');
    const token = await login('curiosa@teste.com');

    expect((await multipart(api().post('/api/works').set(bearer(token)), workFields)).status).toBe(403);

    const upgrade = await api().post('/api/auth/me/writer').set(bearer(token));
    expect(upgrade.status).toBe(200);
    expect(upgrade.body.user.role).toBe('ESCRITOR');

    // Mesmo token de antes: o papel é lido do banco a cada requisição.
    const depois = await multipart(api().post('/api/works').set(bearer(token)), { ...workFields, action: 'draft' });
    expect(depois.status).toBe(201);

    // Ativar duas vezes não faz sentido.
    expect((await api().post('/api/auth/me/writer').set(bearer(token))).status).toBe(409);
  });

  it('escritor não alcança a área administrativa', async () => {
    expect((await api().get('/api/admin/stats').set(bearer(author))).status).toBe(403);
    expect((await api().get('/api/admin/stats').set(bearer(admin))).status).toBe(200);
  });
});

describe('Ciclo editorial completo', () => {
  it('salva rascunho sem arquivo, mas exige arquivo para enviar à análise', async () => {
    const draft = await multipart(api().post('/api/works').set(bearer(author)), { ...workFields, action: 'draft' });
    expect(draft.status).toBe(201);
    expect(draft.body.status).toBe('RASCUNHO');

    const submit = await api().post(`/api/works/${draft.body.id}/submit`).set(bearer(author));
    expect(submit.status).toBe(422);

    const noFile = await multipart(api().post('/api/works').set(bearer(author)), { ...workFields, action: 'submit' });
    expect(noFile.status).toBe(422);
  });

  it('rejeita arquivo cujo conteúdo não corresponde à extensão', async () => {
    const res = await multipart(api().post('/api/works').set(bearer(author)), workFields).attach('file', Buffer.from('não sou pdf'), 'falso.pdf');
    expect(res.status).toBe(400);
  });

  it('envia obra com PDF para análise e cria o checklist da curadoria', async () => {
    const res = await multipart(api().post('/api/works').set(bearer(author)), { ...workFields, tags: 'Teste, #Acessível' }).attach('file', PDF_BYTES, 'obra.pdf');
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('EM_ANALISE');
    expect(res.body.file.type).toBe('PDF');
    expect(res.body.tags).toEqual(['Teste', 'Acessível']);
    expect(res.body).not.toHaveProperty('filePath');
    workId = res.body.id;

    const review = await api().get(`/api/works/${workId}/review`).set(bearer(author));
    expect(review.status).toBe(200);
    expect(review.body.checks).toHaveLength(4);
    expect(review.body.stage).toBe(2);
  });

  it('não expõe obras não publicadas a visitantes nem a outros usuários', async () => {
    expect((await api().get(`/api/works/${workId}`)).status).toBe(404);
    expect((await api().get(`/api/works/${workId}`).set(bearer(reader))).status).toBe(404);
    expect((await api().get(`/api/works/${workId}/file`)).status).toBe(404);
    expect((await api().get(`/api/works/${workId}/review`).set(bearer(reader))).status).toBe(404);
    expect((await api().get(`/api/works/${workId}`).set(bearer(author))).status).toBe(200);
    const catalog = await api().get('/api/works');
    expect(catalog.body.data.map((w: { id: number }) => w.id)).not.toContain(workId);
  });

  it('bloqueia edição pelo autor enquanto está em análise', async () => {
    expect((await api().patch(`/api/works/${workId}`).set(bearer(author)).field('title', 'Novo')).status).toBe(403);
    // O autor não tem ação de publicar: a rota deixou de existir.
    expect((await api().post(`/api/works/${workId}/publish`).set(bearer(author))).status).toBe(404);
  });

  it('curadoria registra nota, valida transições e aprova', async () => {
    const note = await api().post(`/api/admin/works/${workId}/notes`).set(bearer(admin)).send({ content: 'Ótimo contraste!' });
    expect(note.status).toBe(201);
    const invalid = await api().patch(`/api/admin/works/${workId}/status`).set(bearer(admin)).send({ status: 'ARQUIVADO' });
    expect(invalid.status).toBe(409);
    const rejectWithoutReason = await api().patch(`/api/admin/works/${workId}/status`).set(bearer(admin)).send({ status: 'REJEITADO' });
    expect(rejectWithoutReason.status).toBe(400);

    const approve = await api().patch(`/api/admin/works/${workId}/status`).set(bearer(admin)).send({ status: 'APROVADO' });
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe('APROVADO');
    // Aprovar É publicar: a data de publicação sai na mesma ação (seção 8).
    expect(approve.body.publishedAt).toBeTruthy();
    const review = await api().get(`/api/works/${workId}/review`).set(bearer(author));
    expect(review.body.progress).toBe(100);
    expect(review.body.notes[0].content).toBe('Ótimo contraste!');
  });

  it('a obra aprovada aparece no catálogo público sem nenhuma ação do autor', async () => {
    const catalog = await api().get('/api/works').query({ q: 'obra de teste' });
    expect(catalog.body.data.map((w: { id: number }) => w.id)).toContain(workId);
    expect(catalog.body.catalogTotal).toBe(1);

    const file = await api().get(`/api/works/${workId}/file`);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toContain('application/pdf');

    // Após publicada, o autor só edita metadados.
    expect((await api().patch(`/api/works/${workId}`).set(bearer(author)).field('title', 'Outro')).status).toBe(403);
    const meta = await api().patch(`/api/works/${workId}`).set(bearer(author)).field('synopsis', 'Sinopse atualizada com detalhes suficientes para validar.');
    expect(meta.status).toBe(200);
  });

  it('a obra aprovada recebe o Selo Livrin, com responsável e itens verificados', async () => {
    // Na listagem o selo vem resumido: concedido, data e quem assinou.
    const catalog = await api().get('/api/works').query({ q: 'obra de teste' });
    const naLista = catalog.body.data.find((w: { id: number }) => w.id === workId);
    expect(naLista.seal.granted).toBe(true);
    expect(naLista.seal.grantedAt).not.toBeNull();
    expect(naLista.seal.reviewer).toBe('curadoria');
    // A lista de itens não trafega no catálogo inteiro, só no detalhe.
    expect(naLista.seal.checks).toBeUndefined();

    // No detalhe, o critério é público: o leitor vê no que está confiando.
    const detalhe = await api().get(`/api/works/${workId}`);
    expect(detalhe.body.seal.granted).toBe(true);
    expect(detalhe.body.seal.checks).toHaveLength(4);
    expect(detalhe.body.seal.checks.every((c: { status: string }) => c.status === 'APROVADO')).toBe(true);
  });

  it('obra fora do catálogo não tem selo', async () => {
    const rascunho = await multipart(api().post('/api/works').set(bearer(author)), { ...workFields, title: 'Sem Selo', action: 'draft' });
    expect(rascunho.status).toBe(201);
    expect(rascunho.body.seal.granted).toBe(false);
    expect(rascunho.body.seal.grantedAt).toBeNull();
    expect(rascunho.body.seal.reviewer).toBeNull();
  });

  it('leitores avaliam (uma vez, atualizável); autor não avalia a própria obra', async () => {
    const first = await api().post(`/api/works/${workId}/feedbacks`).set(bearer(reader)).send({ rating: 4, content: 'Audiodescrição muito boa!' });
    expect(first.status).toBe(201);
    const again = await api().post(`/api/works/${workId}/feedbacks`).set(bearer(reader)).send({ rating: 5, content: 'Revi a leitura: excelente!' });
    expect(again.status).toBe(201);
    const list = await api().get(`/api/works/${workId}/feedbacks`);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].rating).toBe(5);
    expect((await api().post(`/api/works/${workId}/feedbacks`).set(bearer(author)).send({ rating: 5, content: 'Minha obra é ótima' })).status).toBe(409);
    expect((await api().post(`/api/works/${workId}/feedbacks`).set(bearer(reader)).send({ rating: 9, content: 'nota inválida aqui' })).status).toBe(400);
  });

  it('registra sessões de leitura que alimentam o painel do autor', async () => {
    const session = await api().post(`/api/works/${workId}/sessions`);
    expect(session.status).toBe(201);
    expect(session.body.token).toBeTypeOf('string');

    // Sem o token assinado, qualquer um inflaria as métricas das obras.
    const semToken = await api().patch(`/api/sessions/${session.body.id}`).send({ lastPage: 2 });
    expect(semToken.status).toBe(403);
    const tokenErrado = await api()
      .patch(`/api/sessions/${session.body.id}`)
      .set('X-Session-Token', 'nao-e-o-token')
      .send({ lastPage: 2 });
    expect(tokenErrado.status).toBe(403);

    const patch = await api()
      .patch(`/api/sessions/${session.body.id}`)
      .set('X-Session-Token', session.body.token)
      .send({ lastPage: 2, usedAudioDesc: true });
    expect(patch.status).toBe(204);
    expect((await api().patch('/api/sessions/nao-e-uuid').send({ lastPage: 2 })).status).toBe(400);

    const dash = await api().get('/api/me/dashboard').set(bearer(author));
    expect(dash.status).toBe(200);
    expect(dash.body.totalReads).toBe(1);
    expect(dash.body.engagement.audioDesc.count).toBe(1);
    expect(dash.body.accessibilityIndex.average).toBe(5);
    expect(dash.body.summary.published).toBe(1);
  });

  it('gerencia audiodescrição por página com validação', async () => {
    const created = await api()
      .post(`/api/works/${workId}/audio-descriptions`)
      .set(bearer(admin))
      .send({ pageNumber: 1, description: 'A nave atravessa a nebulosa.', dialogues: [{ speaker: 'Yara', text: 'Sensores ligados.' }] });
    expect(created.status).toBe(201);
    const dup = await api().post(`/api/works/${workId}/audio-descriptions`).set(bearer(admin)).send({ pageNumber: 1, description: 'Duplicada' });
    expect(dup.status).toBe(409);
    // Autor não altera audiodescrição de obra já no catálogo (só a curadoria).
    expect((await api().post(`/api/works/${workId}/audio-descriptions`).set(bearer(author)).send({ pageNumber: 2, description: 'x' })).status).toBe(403);
    const list = await api().get(`/api/works/${workId}/audio-descriptions`);
    expect(list.body).toHaveLength(1);
  });

  it('impede exclusão de gênero em uso e de usuário com obras', async () => {
    expect((await api().delete('/api/admin/genres/1').set(bearer(admin))).status).toBe(409);
    const users = await api().get('/api/admin/users').query({ q: 'autora' }).set(bearer(admin));
    expect((await api().delete(`/api/admin/users/${users.body.data[0].id}`).set(bearer(admin))).status).toBe(409);
  });

  it('arquiva (despublica) e a obra sai do catálogo', async () => {
    const res = await api().patch(`/api/admin/works/${workId}/status`).set(bearer(admin)).send({ status: 'ARQUIVADO' });
    expect(res.status).toBe(200);
    expect((await api().get(`/api/works/${workId}`)).status).toBe(404);
    const stats = await api().get('/api/admin/stats').set(bearer(admin));
    expect(stats.body.works.byStatus.ARQUIVADO).toBe(1);
  });
});

describe('Manuscrito em .docx', () => {
  // É o formato em que quem escreve entrega o texto. Aceitá-lo é o que baixa a
  // barreira para publicar — e, no leitor, é o formato mais acessível de todos,
  // porque o texto reflui em vez de ser uma página fixa.
  it('aceita o arquivo e registra o tipo DOCX', async () => {
    const res = await multipart(api().post('/api/works').set(bearer(author)), workFields).attach('file', DOCX_BYTES, 'manuscrito.docx');
    expect(res.status).toBe(201);
    expect(res.body.file.type).toBe('DOCX');

    const baixado = await api().get(`/api/works/${res.body.id}/file`).set(bearer(author));
    expect(baixado.status).toBe(200);
    expect(baixado.headers['content-type']).toContain('wordprocessingml.document');
  });

  it('recusa PDF truncado, antes de a obra entrar no catálogo', async () => {
    // A assinatura "%PDF-" continua no começo de um arquivo cortado no meio do
    // envio: sem conferir o fim, ele só falharia lá na frente, no leitor.
    const cortado = PDF_BYTES.subarray(0, PDF_BYTES.length - 8);
    const res = await multipart(api().post('/api/works').set(bearer(author)), workFields).attach('file', cortado, 'cortado.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/incompleto/i);
  });

  it('recusa .docx que não é um ZIP de verdade', async () => {
    // Renomear um .exe para .docx não deve passar: a extensão não é prova.
    const res = await multipart(api().post('/api/works').set(bearer(author)), workFields).attach('file', Buffer.from('MZ não sou um zip'), 'falso.docx');
    expect(res.status).toBe(400);
  });
});
