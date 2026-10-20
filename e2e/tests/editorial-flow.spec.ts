import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Fluxo editorial completo no navegador:
 * cadastro → submissão com upload → curadoria (admin) → publicação → catálogo → leitura → avaliação.
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@livrin.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'TroqueEstaSenha123';
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? 'Demo12345';
const SAMPLE_PDF = path.resolve(__dirname, '../../api/seed-assets/works/meu-livro-incrivel.pdf');

const stamp = Date.now().toString();
const title = `Obra E2E ${stamp}`;
let workId = '';

async function loginAs(browser: Browser, email: string, password: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Entrar na Plataforma' }).click();
  await page.waitForURL(/\/(dashboard|admin)/);
  return page;
}

test.describe.serial('Fluxo editorial', () => {
  let author: Page;

  test('autor se cadastra e envia uma obra com arquivo', async ({ browser }) => {
    author = await (await browser.newContext()).newPage();
    await author.goto('/register');
    await author.getByRole('textbox', { name: 'Nome completo' }).fill('Autora E2E');
    await author.getByRole('textbox', { name: 'E-mail' }).fill(`e2e${stamp}@teste.com`);
    await author.getByRole('textbox', { name: 'Senha', exact: true }).fill('Senha12345');
    await author.getByRole('textbox', { name: 'Confirme a senha' }).fill('Senha12345');
    await author.getByRole('button', { name: 'Criar minha conta' }).click();
    await expect(author.getByRole('heading', { name: 'Olá, Autora E2E' })).toBeVisible();

    await author.goto('/submit');
    await author.getByRole('textbox', { name: 'Título do livro ou HQ' }).fill(title);
    await author.getByRole('combobox', { name: 'Gênero literário' }).selectOption({ label: 'Aventura' });
    await author.getByRole('spinbutton', { name: 'Nº de páginas' }).fill('12');
    await author.getByRole('textbox', { name: 'Sinopse da obra' }).fill('Uma aventura acessível criada durante o teste automatizado de ponta a ponta.');
    await author.getByRole('button', { name: 'Enviar para análise' }).click();
    await expect(author.getByText('Envie o arquivo original da obra para submetê-la à análise.')).toBeVisible();

    await author.locator('input[type=file]').first().setInputFiles(SAMPLE_PDF);
    await author.getByRole('button', { name: 'Enviar para análise' }).click();
    await expect(author.getByRole('heading', { name: 'Seu livro em processo editorial' })).toBeVisible({ timeout: 20_000 });
    workId = author.url().split('/').pop()!;
  });

  test('visitante não vê obra em análise', async ({ page }) => {
    await page.goto(`/reader/${workId}`);
    await expect(page.getByText('Obra não encontrada.')).toBeVisible();
  });

  test('curadoria aprova e o autor publica', async ({ browser }) => {
    const admin = await loginAs(browser, ADMIN_EMAIL, ADMIN_PASSWORD);
    await admin.goto(`/admin/works/${workId}`);
    await admin.getByRole('button', { name: 'Aprovar (Etapa 3)' }).click();
    await admin.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(admin.getByText('Status atual:').locator('strong')).toHaveText('Aprovado pelo Comitê');

    await author.goto(`/review/${workId}`);
    await expect(author.getByText('Publicação liberada')).toBeVisible();
    await author.getByRole('button', { name: 'Publicar agora' }).click();
    await author.getByRole('dialog').getByRole('button', { name: 'Publicar agora' }).click();
    await expect(author.getByText('Obra publicada', { exact: true })).toBeVisible();
  });

  test('obra publicada aparece no catálogo e abre no leitor', async ({ page }) => {
    await page.goto(`/?q=${stamp}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await page.getByRole('link', { name: `Ler agora: ${title}` }).click();
    await expect(page.getByText('Pág 01 / 02')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Próxima página' }).click();
    await expect(page.getByText('Pág 02 / 02')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByText('Pág 01 / 02')).toBeVisible();
  });

  test('leitor avalia a obra', async ({ browser }) => {
    const reader = await loginAs(browser, 'lucas@livrin.com', DEMO_PASSWORD);
    await reader.goto(`/reader/${workId}`);
    await reader.getByRole('radio', { name: '4 estrelas' }).click();
    await reader.getByRole('textbox', { name: 'Comentário' }).fill('Leitura confortável com a fonte para dislexia.');
    await reader.getByRole('button', { name: 'Publicar avaliação' }).click();
    await expect(reader.getByText('“Leitura confortável com a fonte para dislexia.”')).toBeVisible();
  });

  test('usuário comum não acessa a administração (front e API)', async () => {
    await author.goto('/admin');
    await expect(author.getByRole('heading', { name: 'Leituras em destaque' })).toBeVisible();
    const status = await author.evaluate(() =>
      fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${localStorage.getItem('livrin_token')}` } }).then((r) => r.status),
    );
    expect(status).toBe(403);
  });
});

test('leitores EPUB e CBZ renderizam as obras de demonstração', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Ler agora: Raízes' }).click();
  await expect(page.frameLocator('iframe').first().getByText('Dona Celeste').first()).toBeVisible({ timeout: 20_000 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Ler agora: O Último Mapa' }).click();
  await expect(page.locator('img[alt^="Página 1"]')).toBeVisible({ timeout: 20_000 });
});
