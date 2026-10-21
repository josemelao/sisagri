/**
 * E2E do Bloco 9d (T9.5) — CSP em vigor no navegador.
 *
 * Nao escreve no banco. Coleta `securitypolicyviolation` e exige zero em:
 *  - boot + navegacao por todos os modulos do app publico;
 *  - abertura de manual e de arquivos (iframe de PDF/Office e imagem);
 *  - tela de login do painel.
 *
 * Tambem prova que o fallback de imagem do preview continua funcionando sem
 * `onerror` inline (que a CSP bloqueia).
 */

/* global closeDetail, getArquivoPreviewHTML, navigateTo */

import { test, expect } from '@playwright/test';

const MODULOS = [
  'dashboard',
  'funcionarios',
  'manuais',
  'processos',
  'arquivos',
  'informacoes',
  'veiculos',
  'sistemas',
  'servicos',
  'agenda',
  'relatorios',
];

async function esperarBoot(page) {
  await expect(page.locator('#boot-screen')).toHaveClass(/is-hidden/, { timeout: 30_000 });
}

/** Registra o coletor antes de qualquer script da pagina rodar. */
async function coletarViolacoes(page) {
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (evento) => {
      window.__csp.push(`${evento.violatedDirective} <- ${evento.blockedURI}`);
    });
  });
}

async function violacoes(page) {
  return page.evaluate(() => window.__csp.slice());
}

test.describe('CSP', () => {
  test('1. app publico: boot, todos os modulos e modais sem violacao', async ({ page }) => {
    await coletarViolacoes(page);
    await page.goto('/index.html');
    await esperarBoot(page);

    for (const modulo of MODULOS) {
      await page.evaluate((alvo) => navigateTo(alvo), modulo);
      await page.waitForTimeout(120);
    }

    await page.evaluate(() => navigateTo('manuais'));
    const manual = page.locator('#manuais-list [data-acao="abrir-manual"]').first();
    if (await manual.count()) {
      await manual.click();
      await page.waitForTimeout(400);
    }

    // Abre os 3 primeiros arquivos: cobre imagem, PDF (iframe) e Office.
    await page.evaluate(() => navigateTo('arquivos'));
    const cards = page.locator('#arquivos-list [data-acao="abrir-arquivo"]');
    const total = Math.min(3, await cards.count());
    for (let i = 0; i < total; i += 1) {
      await cards.nth(i).click();
      await page.waitForTimeout(700);
      await page.evaluate(() => closeDetail('arquivo-detail-overlay'));
      await page.waitForTimeout(150);
    }

    expect(await violacoes(page)).toEqual([]);
  });

  test('2. painel: tela de login sem violacao', async ({ page }) => {
    await coletarViolacoes(page);
    await page.goto('/admin.html');

    await expect(page.locator('#login-screen')).toBeVisible({ timeout: 30_000 });
    expect(await violacoes(page)).toEqual([]);
  });

  test('3. fallback de imagem do preview funciona sem handler inline', async ({ page }) => {
    await coletarViolacoes(page);
    await page.goto('/index.html');
    await esperarBoot(page);

    const texto = await page.evaluate(async () => {
      const alvo = document.createElement('div');
      alvo.innerHTML = getArquivoPreviewHTML({
        nome: 'quebrada.png',
        url: '/arquivo-que-nao-existe.png',
      });
      document.body.appendChild(alvo);

      const img = alvo.querySelector('img');
      if (!img) return 'sem img';

      await new Promise((ok) => {
        if (img.complete) return ok();
        img.addEventListener('error', ok, { once: true });
        setTimeout(ok, 3000);
      });
      await new Promise((ok) => setTimeout(ok, 300));

      const resultado = alvo.textContent || '';
      alvo.remove();
      return resultado;
    });

    expect(texto).toContain('Não foi possível carregar a imagem');
    expect(await violacoes(page)).toEqual([]);
  });
});
