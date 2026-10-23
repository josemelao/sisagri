/**
 * E2E de acessibilidade do app publico.
 *
 * Cobre o que o Lighthouse nao ve sozinho: teclado em cards, foco em paineis,
 * retorno de foco ao fechar, estado do menu mobile e ordem de headings.
 */

import { test, expect } from '@playwright/test';

async function esperarBoot(page) {
  await expect(page.locator('#boot-screen')).toHaveClass(/is-hidden/, { timeout: 30_000 });
}

test.describe('acessibilidade publica', () => {
  test('1. card do dashboard abre por teclado e marca aria-current', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    const card = page.locator('.card-nav[data-nav="funcionarios"]');
    await expect(card).toHaveAttribute('role', 'link');
    await expect(card).toHaveAttribute('tabindex', '0');

    await card.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('#page-funcionarios')).toHaveClass(/active/);
    await expect(page.locator('.nav-item[data-page="funcionarios"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.nav-item[data-page="dashboard"]')).not.toHaveAttribute('aria-current', 'page');
  });

  test('2. card de lista abre detalhe por teclado, foca painel e devolve o foco', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    await page.locator('.nav-item[data-page="processos"]').click();
    const card = page.locator('#processos-list .list-card').first();
    await expect(card).toHaveAttribute('role', 'button');
    await expect(card).toHaveAttribute('tabindex', '0');

    await card.focus();
    await page.keyboard.press('Enter');

    const overlay = page.locator('#processo-detail-overlay');
    await expect(overlay).toHaveClass(/open/);
    await expect(overlay).toHaveAttribute('role', 'dialog');
    await expect(overlay).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('#processo-detail-panel')).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(overlay).not.toHaveClass(/open/);
    await expect(overlay).toHaveAttribute('hidden', '');
    await expect(card).toBeFocused();
  });

  test('3. overlays fechados ficam fora da tela e da tabulacao', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    const overlay = page.locator('#processo-detail-overlay');
    await expect(overlay).toHaveAttribute('hidden', '');
    await expect(overlay).toBeHidden();
    await expect(page.locator('#processo-detail-close')).toHaveAttribute('aria-label', 'Fechar');
  });

  test('4. menu mobile anuncia aberto/fechado', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index.html');
    await esperarBoot(page);

    const hamburger = page.locator('#hamburger');
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    await expect(hamburger).toHaveAttribute('aria-controls', 'sidebar');

    await hamburger.click();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');

    await page.locator('.nav-item[data-page="funcionarios"]').click();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  test('5. dashboard usa h1 e h2 nos modulos', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    await expect(page.locator('#page-dashboard .card-nav h2').first()).toBeVisible();
    await expect(page.locator('#page-dashboard .card-nav h3')).toHaveCount(0);
  });

  test('6. resultado da busca global abre por teclado', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    await page.locator('#global-search').fill('se');
    await expect(page.locator('#search-results')).toHaveClass(/visible/, { timeout: 15_000 });

    const item = page.locator('#search-results .search-result-item').first();
    await expect(item).toHaveAttribute('tabindex', '0');
    await expect(item).toHaveAttribute('role', 'button');

    await item.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#search-results')).not.toHaveClass(/visible/);
  });
});
