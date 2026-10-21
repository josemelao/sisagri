/**
 * E2E de saida segura (Bloco 9b) — roda no navegador de verdade.
 *
 * Nao escreve no banco: injeta um registro "venenoso" direto nas funcoes de
 * render e confere que o navegador NAO executa nada e mostra o texto literal.
 */

/* global arquivos, renderTagFilter -- globais reais do script.js (page context) */

import { test, expect } from '@playwright/test';

async function esperarBoot(page) {
  await expect(page.locator('#boot-screen')).toHaveClass(/is-hidden/, { timeout: 30_000 });
}

const PAYLOAD = '<img src=x onerror="window.__xss=true">';

test.describe('saida segura', () => {
  test('payload em nome de funcionario nao executa e aparece como texto', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    const resultado = await page.evaluate((payload) => {
      window.__xss = false;

      const container = document.getElementById('func-list');
      window.renderFuncionarios([
        { id: 1, nome: payload, cargo: '" onmouseover="window.__xss=true', lotacao: '<b>Setor</b>' },
      ]);

      // O HTML serializado de um TEXTO pode conter aspas; o que nao pode existir
      // e um elemento/atributo executavel de verdade.
      const perigosos = Array.from(container.querySelectorAll('*')).filter((el) => {
        if (el.hasAttribute('onerror') || el.hasAttribute('onmouseover')) return true;
        if (el.tagName === 'SCRIPT' || el.tagName === 'IFRAME') return true;
        return el.tagName === 'IMG' && el.getAttribute('src') === 'x';
      }).length;

      return {
        xss: window.__xss === true,
        perigosos,
        texto: container.textContent || '',
        temCard: !!container.querySelector('.list-card'),
      };
    }, PAYLOAD);

    expect(resultado.xss).toBe(false);
    expect(resultado.perigosos).toBe(0);
    expect(resultado.texto).toContain(PAYLOAD);
    expect(resultado.temCard).toBe(true);
  });

  test('link em campo de informacao continua clicavel e javascript: e bloqueado', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    const resultado = await page.evaluate(() => ({
      ok: window.camposGridHTML([
        { label: 'Site', valor: '<a style="text-decoration: underline;" href="https://exemplo.gov.br/">LINK</a>' },
      ]),
      ruim: window.camposGridHTML([
        { label: 'Site', valor: '<a href="javascript:window.__xss=true">clique</a>' },
      ]),
    }));

    expect(resultado.ok).toContain('href="https://exemplo.gov.br/"');
    expect(resultado.ok).toContain('>LINK</a>');

    expect(resultado.ruim).not.toContain('<a ');
    expect(resultado.ruim).not.toContain('href="javascript:');
  });

  test('filtro de tags com aspas nao quebra a delegacao', async ({ page }) => {
    const erros = [];
    page.on('pageerror', (erro) => erros.push(erro.message));

    await page.goto('/index.html');
    await esperarBoot(page);

    await page.locator('.nav-item[data-page="arquivos"]').click();
    await expect(page.locator('#page-arquivos')).toHaveClass(/active/);

    await page.evaluate(() => {
      // `arquivos` e um `let` global: a atribuicao aqui alcanca o binding real.
      arquivos = [
        { id: 1, nome: 'Teste', tipo: 'PDF', tags: ["d'água"], url: 'https://exemplo.gov.br/x.pdf' },
      ];
      renderTagFilter();
    });

    const botao = page.locator('#arquivos-tags .tag-filter-btn').first();
    await expect(botao).toHaveText(/d'água/);
    await botao.click();

    expect(erros, `erros de JS: ${erros.join(' | ')}`).toEqual([]);
  });
});
