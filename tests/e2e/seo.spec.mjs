/**
 * Bloco 13 (T13.2) — SEO no navegador e no servidor.
 *
 * Complementa tests/unit/seo.test.mjs: aqui os arquivos sao servidos de
 * verdade (HTTP 200 + content-type) e o <head> e lido pelo Chromium.
 */

import { test, expect } from '@playwright/test';

const BASE = 'https://josemelao.github.io/sisagri/';

test.describe('SEO do app publico', () => {
  test('head entrega title, description, canonical e Open Graph', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/SisAgri/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^.{50,160}$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', BASE);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', BASE);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${BASE}assets/og-image.png`);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  });

  test('robots.txt, sitemap.xml e imagem OG respondem 200', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain(`Sitemap: ${BASE}sitemap.xml`);

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain(`<loc>${BASE}</loc>`);

    const imagem = await request.get('/assets/og-image.png');
    expect(imagem.status()).toBe(200);
    expect(imagem.headers()['content-type']).toContain('image/png');
  });

  test('admin.html nao entra no indice', async ({ page }) => {
    await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  });
});
