/**
 * E2E do app publico (somente leitura).
 *
 * Nao cria, nao edita, nao apaga. So observa o que o site faz quando abre.
 */

import { test, expect } from '@playwright/test';

/** Espera o boot terminar. Falha aqui = o app nao inicializou. */
async function esperarBoot(page) {
  await expect(page.locator('#boot-screen')).toHaveClass(/is-hidden/, { timeout: 30_000 });
}

test.describe('app publico', () => {
  test('1. boot: carrega, esconde a tela inicial e mostra o dashboard', async ({ page }) => {
    await page.goto('/index.html');

    await expect(page.locator('#boot-screen')).toHaveAttribute('aria-busy', 'false', { timeout: 30_000 });
    await esperarBoot(page);

    await expect(page.locator('#page-dashboard')).toHaveClass(/active/);
    await expect(page.locator('#page-dashboard')).toBeVisible();
  });

  test('2. navegacao: clicar no menu troca a pagina ativa', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    await page.locator('.nav-item[data-page="funcionarios"]').click();
    await expect(page.locator('#page-funcionarios')).toHaveClass(/active/);
    await expect(page.locator('#page-dashboard')).not.toHaveClass(/active/);
    await expect(page.locator('.nav-item[data-page="funcionarios"]')).toHaveClass(/active/);

    await page.locator('.nav-item[data-page="servicos"]').click();
    await expect(page.locator('#page-servicos')).toHaveClass(/active/);
    await expect(page.locator('#page-funcionarios')).not.toHaveClass(/active/);
  });

  test('3. busca global: 1 letra nao abre, 2 letras abrem o dropdown', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    // Limpa o indice/busca e digita 1 letra.
    await page.locator('#global-search').fill('a');
    await expect(page.locator('#search-results')).not.toHaveClass(/visible/);

    // 2 letras disparam o debounce de 300ms.
    await page.locator('#global-search').fill('se');
    await expect(page.locator('#search-results')).toHaveClass(/visible/, { timeout: 15_000 });

    // Esc fecha.
    await page.locator('#global-search').press('Escape');
    await expect(page.locator('#search-results')).not.toHaveClass(/visible/);
  });

  test('4. conteudo publicado aparece (modulo processos nao fica vazio)', async ({ page }) => {
    // Guarda do fail-closed: se o filtro de publish_status ficar restritivo
    // demais, esta e a primeira coisa que quebra - o site abre, mas vazio.
    await page.goto('/index.html');
    await esperarBoot(page);

    await page.locator('.nav-item[data-page="processos"]').click();
    await expect(page.locator('#page-processos')).toHaveClass(/active/);

    await expect(page.locator('#processos-list .list-card').first()).toBeVisible();
    expect(await page.locator('#processos-list .list-card').count()).toBeGreaterThan(0);
  });

  test('5. todos os modulos abrem sem erro de JavaScript', async ({ page }) => {
    const erros = [];
    page.on('pageerror', (erro) => erros.push(erro.message));

    await page.goto('/index.html');
    await esperarBoot(page);

    const paginas = await page
      .locator('.nav-item[data-page]')
      .evaluateAll((itens) => itens.map((item) => item.dataset.page));

    expect(paginas.length).toBeGreaterThan(0);

    for (const pageId of paginas) {
      await page.locator(`.nav-item[data-page="${pageId}"]`).click();
      await expect(page.locator(`#page-${pageId}`)).toHaveClass(/active/);

      // Deixa o modulo terminar de renderizar antes do proximo clique.
      await page.waitForTimeout(150);
    }

    expect(erros, `erros de JS ao navegar: ${erros.join(' | ')}`).toEqual([]);
  });

  test('6. defesa em profundidade: o anonimo pede so publish_status=published', async ({ page }) => {
    // Bloco 7 (T7.1): a RLS ja barra o rascunho; este teste garante que o
    // cliente tambem nao pede rascunho. admin_settings nao tem o campo.
    const requisicoes = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!url.includes('/rest/v1/')) return;
      const tabela = new URL(url).pathname.split('/').pop();
      if (tabela === 'admin_settings') return;
      requisicoes.push({ tabela, url });
    });

    await page.goto('/index.html');
    await esperarBoot(page);

    expect(requisicoes.length).toBeGreaterThan(0);
    for (const { tabela, url } of requisicoes) {
      expect(url, `tabela ${tabela} pediu sem o filtro de publicado`).toContain('publish_status=eq.published');
    }
  });

  test('7. delegacao: card de processo usa data-acao e abre o detalhe', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    await page.locator('.nav-item[data-page="processos"]').click();
    const card = page.locator('#processos-list .list-card').first();
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-acao', 'abrir-processo');

    await card.click();
    await expect(page.locator('#processo-detail-overlay')).toHaveClass(/open/);
    await expect(page.locator('#processo-detail-content .detail-name')).toBeVisible();
  });
});
