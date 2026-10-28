/**
 * Menu lateral do admin em telas pequenas (Plano de evolucao, fase 2.1).
 *
 * Regra: abaixo de 900px a sidebar vira off-canvas, com hamburguer no header,
 * backdrop e fechamento por Esc/selecao. Em desktop nada muda.
 *
 * Os testes de interacao precisam de credenciais reais; sem elas, sao pulados
 * (mesmo criterio de admin.spec.mjs). Os testes de estrutura e de CSS rodam
 * sempre, porque bastam para impedir que o menu volte a sumir no celular.
 */

import { test, expect } from '@playwright/test';

const EMAIL = process.env.SISAGRI_ADMIN_EMAIL;
const SENHA = process.env.SISAGRI_ADMIN_PASSWORD;
const TEM_CREDENCIAIS = Boolean(EMAIL && SENHA);

async function entrar(page) {
  await page.goto('/admin.html');
  await expect(page.locator('#login-screen')).toBeVisible({ timeout: 30_000 });

  await page.locator('#login-email').fill(EMAIL);
  await page.locator('#login-senha').fill(SENHA);
  await page.locator('button:has-text("Entrar")').click();

  await expect(page.locator('#admin-app')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#login-screen')).toBeHidden();
}

/** Mostra o painel sem sessao: os testes de layout nao precisam de login. */
async function mostrarPainel(page) {
  await page.addStyleTag({ content: '#admin-app { display: block !important; }' });
}

test.describe('menu mobile — estrutura', () => {
  test('1. o header tem hamburguer ligado a sidebar', async ({ page }) => {
    await page.goto('/admin.html');

    const toggle = page.locator('#admin-menu-toggle');
    await expect(toggle).toHaveCount(1);
    await expect(toggle).toHaveAttribute('aria-controls', 'admin-sidebar');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#admin-sidebar')).toHaveCount(1);
    await expect(page.locator('#admin-backdrop')).toHaveCount(1);
  });

  test('2. em 390px a sidebar sai da tela e o hamburguer aparece', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin.html');
    await mostrarPainel(page);

    const estado = await page.evaluate(() => {
      const toggle = document.getElementById('admin-menu-toggle');
      const sidebar = document.getElementById('admin-sidebar');
      return {
        botao: getComputedStyle(toggle).display,
        sidebar: sidebar.getBoundingClientRect().toJSON(),
      };
    });

    expect(estado.botao).not.toBe('none');
    // Off-canvas: a sidebar termina antes da borda esquerda da tela.
    expect(estado.sidebar.right).toBeLessThanOrEqual(1);
  });

  test('3. em 1280px o layout segue igual (sem hamburguer, sidebar de 220px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin.html');
    await mostrarPainel(page);

    const estado = await page.evaluate(() => {
      const toggle = document.getElementById('admin-menu-toggle');
      const sidebar = document.getElementById('admin-sidebar');
      return {
        botao: getComputedStyle(toggle).display,
        esquerda: sidebar.getBoundingClientRect().left,
        largura: sidebar.getBoundingClientRect().width,
        posicao: getComputedStyle(sidebar).position,
      };
    });

    expect(estado.botao).toBe('none');
    expect(estado.esquerda).toBe(0);
    expect(estado.largura).toBe(220);
    expect(estado.posicao).toBe('static');
  });
});

test.describe('menu mobile — interacao', () => {
  test.skip(!TEM_CREDENCIAIS, 'defina SISAGRI_ADMIN_EMAIL e SISAGRI_ADMIN_PASSWORD');

  test('4. abre, escolhe uma secao e fecha devolvendo o foco', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await entrar(page);

    const toggle = page.locator('#admin-menu-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#admin-sidebar')).toBeInViewport();
    await expect(page.locator('#admin-backdrop')).toBeVisible();

    await page.locator('.admin-nav-item[data-section="funcionarios"]').click();
    await expect(page.locator('#section-funcionarios')).toHaveClass(/active/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#admin-backdrop')).toBeHidden();
    await expect(page.locator('#admin-sidebar')).not.toBeInViewport();

    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id))
      .toBe('admin-menu-toggle');
  });

  test('5. Esc e backdrop fecham o menu e devolvem o foco', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await entrar(page);

    const toggle = page.locator('#admin-menu-toggle');

    await toggle.click();
    await expect(page.locator('#admin-sidebar')).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#admin-sidebar')).not.toBeInViewport();
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('admin-menu-toggle');

    await toggle.click();
    await page.locator('#admin-backdrop').click({ position: { x: 380, y: 400 } });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#admin-backdrop')).toBeHidden();
  });
});
