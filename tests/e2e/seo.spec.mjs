/**
 * Site interno fora dos buscadores (substitui o e2e de SEO do T13.2).
 *
 * Complementa tests/unit/seo.test.mjs: aqui o Chromium le o <head> e o
 * servidor responde de verdade (200 para os icones, 404 para o que saiu).
 */

import { test, expect } from '@playwright/test';

test.describe('site interno fora dos buscadores', () => {
  test('index.html e admin.html entregam noindex e nao carregam sinais de divulgacao', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('meta[property^="og:"]')).toHaveCount(0);
    await expect(page.locator('meta[name^="twitter:"]')).toHaveCount(0);
    await expect(page.locator('meta[name="description"]')).toHaveCount(0);

    await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('robots.txt fecha tudo, sitemap e og-image dao 404 e os icones respondem 200', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const texto = await robots.text();
    expect(texto).toMatch(/Disallow:\s*\//);
    expect(texto).not.toMatch(/Sitemap:/i);

    expect((await request.get('/sitemap.xml')).status()).toBe(404);
    expect((await request.get('/assets/og-image.png')).status()).toBe(404);

    for (const arquivo of [
      '/assets/favicon-32.png',
      '/assets/apple-touch-icon.png',
      '/assets/logo-emblema.png',
      '/assets/logo-agricultura.png',
    ]) {
      const resposta = await request.get(arquivo);
      expect(resposta.status(), arquivo).toBe(200);
      expect(resposta.headers()['content-type'], arquivo).toContain('image/png');
    }
  });

  test('a logo nova carrega na sidebar e o rodape esta em v2.0', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

    const logo = page.locator('.logo-icon img');
    await expect(logo).toHaveAttribute('src', 'assets/logo-emblema.png');
    await expect
      .poll(() => logo.evaluate((img) => img.naturalWidth), { timeout: 10_000 })
      .toBeGreaterThan(0);

    await expect(page.locator('.sidebar-footer span')).toHaveText('v2.0 - por José Tadeu');
  });
});
