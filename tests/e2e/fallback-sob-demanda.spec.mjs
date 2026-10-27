/**
 * Fallback de dados sob demanda (Plano de evolucao, fase 1.2).
 *
 * O `dados.js` e a rede de seguranca para quando o Supabase nao responde. Ele
 * nao pode pesar no boot normal: com o banco no ar, o arquivo nem deve ser
 * baixado. Sem o banco, ele entra em cena e a tela precisa abrir com dados.
 */

import { test, expect } from '@playwright/test';

async function esperarBoot(page) {
  await expect(page.locator('#boot-screen')).toHaveClass(/is-hidden/, { timeout: 30_000 });
}

function registrarPedidos(page) {
  const pedidos = [];
  page.on('request', (req) => {
    try {
      pedidos.push(new URL(req.url()).pathname);
    } catch {
      /* requisicao sem URL valida: ignora */
    }
  });
  return pedidos;
}

test.describe('dados.js sob demanda', () => {
  test('1. com o Supabase no ar, dados.js nao e baixado', async ({ page }) => {
    const pedidos = registrarPedidos(page);

    await page.goto('/index.html');
    await esperarBoot(page);

    expect(pedidos.filter((caminho) => caminho === '/dados.js')).toEqual([]);
  });

  test('2. sem Supabase, o app abre com o fallback carregado sob demanda', async ({ page }) => {
    const pedidos = registrarPedidos(page);

    await page.route('**/*.supabase.co/**', (rota) => rota.abort());

    await page.goto('/index.html');
    await esperarBoot(page);

    expect(pedidos).toContain('/dados.js');

    const total = await page.evaluate(() => window.DB.get('funcionarios').length);
    expect(total).toBeGreaterThan(0);

    await page.locator('.nav-item[data-page="funcionarios"]').click();
    await expect(page.locator('#func-list .list-card').first()).toBeVisible();
    await expect(page.locator('#func-list .list-card').first()).not.toBeEmpty();
  });
});
