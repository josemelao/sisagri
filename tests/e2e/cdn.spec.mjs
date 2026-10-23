/**
 * E2E da T13.5 — o app e o painel nao dependem de CDNs externas para carregar.
 *
 * Bloqueia unpkg, jsDelivr e Google Fonts. Exige:
 *  - boot e navegacao do app publico;
 *  - login do painel visivel;
 *  - `supabase-js` local disponivel;
 *  - fontes/icones locais carregados;
 *  - nenhuma violacao de CSP e nenhuma requisicao para as CDNs bloqueadas.
 */

/* global navigateTo */

import { test, expect } from '@playwright/test';

const HOSTS_BLOQUEADOS = [
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

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

test.describe('CDN confiavel (T13.5)', () => {
  test('app e painel carregam com unpkg, jsDelivr e Google Fonts bloqueados', async ({ page }) => {
    const bloqueados = [];
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (HOSTS_BLOQUEADOS.some((host) => url.includes(host))) {
        bloqueados.push(url);
        return route.abort();
      }
      return route.continue();
    });

    await coletarViolacoes(page);
    await page.goto('/index.html');
    await esperarBoot(page);

    expect(await page.evaluate(() => typeof window.supabase?.createClient)).toBe('function');
    const fontes = await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('16px "DM Sans"'),
        document.fonts.load('16px "DM Serif Display"'),
        document.fonts.load('700 16px "Playfair Display"'),
        document.fonts.load('italic 700 16px "Playfair Display"'),
        document.fonts.load('700 16px "Roboto"'),
        document.fonts.load('16px "Phosphor-Bold"'),
      ]);
      return {
        dmSans: document.fonts.check('16px "DM Sans"'),
        dmSerif: document.fonts.check('16px "DM Serif Display"'),
        playfair: document.fonts.check('700 16px "Playfair Display"'),
        playfairItalic: document.fonts.check('italic 700 16px "Playfair Display"'),
        roboto: document.fonts.check('700 16px "Roboto"'),
        phosphor: document.fonts.check('16px "Phosphor-Bold"'),
      };
    });
    expect(fontes).toEqual({
      dmSans: true,
      dmSerif: true,
      playfair: true,
      playfairItalic: true,
      roboto: true,
      phosphor: true,
    });

    const icone = await page.evaluate(() => {
      const alvo = document.querySelector('.ph-bold');
      if (!alvo) return null;
      return {
        conteudo: getComputedStyle(alvo, '::before').content,
        familia: getComputedStyle(alvo).fontFamily,
      };
    });
    expect(icone).not.toBeNull();
    expect(icone.conteudo).not.toBe('none');
    expect(icone.conteudo).not.toBe('normal');
    expect(icone.familia).toContain('Phosphor-Bold');

    for (const modulo of MODULOS) {
      await page.evaluate((alvo) => navigateTo(alvo), modulo);
      await page.waitForTimeout(100);
    }

    expect(await violacoes(page)).toEqual([]);

    await page.goto('/admin.html');
    await expect(page.locator('#login-screen')).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => typeof window.supabase?.createClient)).toBe('function');
    expect(await page.evaluate(() => document.fonts.check('16px "DM Sans"'))).toBe(true);
    expect(await page.evaluate(() => document.fonts.check('16px "Phosphor-Bold"'))).toBe(true);
    expect(await violacoes(page)).toEqual([]);
    expect(bloqueados).toEqual([]);
  });
});
