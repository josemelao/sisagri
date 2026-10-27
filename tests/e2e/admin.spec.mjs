/**
 * E2E do painel admin (somente leitura).
 *
 * Precisa de credenciais reais porque nao existe projeto Supabase de teste:
 *
 *   SISAGRI_ADMIN_EMAIL=... SISAGRI_ADMIN_PASSWORD=... npm run test:e2e
 *
 * Sem as variaveis, os testes sao PULADOS (nao falham).
 *
 * O que estes testes NAO fazem, de propositio: criar, editar ou apagar
 * registro. O app aponta para o Supabase de producao - um teste de escrita
 * viraria dado real. Isso so entra quando houver projeto de teste (junto com
 * o Bloco 3b parte 2).
 */

/* global DB -- global real do db.js no contexto da pagina */
import { test, expect } from '@playwright/test';

const EMAIL = process.env.SISAGRI_ADMIN_EMAIL;
const SENHA = process.env.SISAGRI_ADMIN_PASSWORD;
const TEM_CREDENCIAIS = Boolean(EMAIL && SENHA);

/** Faz login e espera o painel aparecer. */
async function entrar(page) {
  await page.goto('/admin.html');
  await expect(page.locator('#login-screen')).toBeVisible({ timeout: 30_000 });

  await page.locator('#login-email').fill(EMAIL);
  await page.locator('#login-senha').fill(SENHA);
  await page.locator('button:has-text("Entrar")').click();

  await expect(page.locator('#admin-app')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#login-screen')).toBeHidden();
}

test.describe('painel admin', () => {
  test.skip(
    !TEM_CREDENCIAIS,
    'defina SISAGRI_ADMIN_EMAIL e SISAGRI_ADMIN_PASSWORD para rodar os fluxos do painel'
  );

  test('5. login: entra no painel e mostra a visao geral', async ({ page }) => {
    const erros = [];
    page.on('pageerror', (erro) => erros.push(erro.message));

    await entrar(page);

    await expect(page.locator('#section-overview')).toHaveClass(/active/);
    expect(erros, `erros de JS no login: ${erros.join(' | ')}`).toEqual([]);
  });

  test('6. listagem: abre um modulo e renderiza a secao', async ({ page }) => {
    const erros = [];
    page.on('pageerror', (erro) => erros.push(erro.message));

    await entrar(page);

    await page.locator('.admin-nav-item[data-section="funcionarios"]').click();
    await expect(page.locator('#section-funcionarios')).toHaveClass(/active/);

    // Nao assume estrutura de tabela: so exige que a secao tenha sido
    // renderizada de verdade (nao ficou vazia).
    await expect
      .poll(async () => (await page.locator('#section-funcionarios').innerHTML()).length, {
        timeout: 20_000,
      })
      .toBeGreaterThan(200);

    expect(erros, `erros de JS ao abrir o modulo: ${erros.join(' | ')}`).toEqual([]);
  });
});

test.describe('painel admin — transicao de login', () => {
  test('7. login: o boot cobre a transicao e abre o painel', async ({ page }) => {
    await page.goto('/admin.html');
    await expect(page.locator('#login-screen')).toBeVisible({ timeout: 30_000 });

    await page.evaluate(() => {
      DB.adminLogin = async () => true;
      DB.isStaff = async () => true;
      window.dbInit = async () => {};
      window.initAdmin = () => {};
    });

    await page.locator('#login-email').fill('teste@local');
    await page.locator('#login-senha').fill('senha');

    const inicio = Date.now();
    await page.locator('[data-acao="fazer-login"]').click();

    await expect(page.locator('#boot-screen')).toBeVisible();
    await expect(page.locator('#admin-app')).toBeVisible({ timeout: 3_000 });
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(400);

    await expect(page.locator('#login-screen')).toBeHidden();
    await expect(page.locator('#boot-screen')).toBeHidden();
  });
});
