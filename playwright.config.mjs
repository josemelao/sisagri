/**
 * Playwright - testes de ponta a ponta no navegador real.
 *
 * Regra deste bloco: os testes NAO ESCREVEM em producao. O app aponta para o
 * projeto Supabase real (`db.js` -> USE_SUPABASE: true), entao qualquer
 * "criar/editar" aqui viraria dado de verdade. Os fluxos implementados sao de
 * leitura. Criar/editar de verdade exige projeto de teste - ver
 * docs/qualidade/linha-de-base-lint.md e a pendencia do Bloco 3b parte 2.
 *
 * Uso:
 *   npm run test:e2e
 *   SISAGRI_ADMIN_EMAIL=... SISAGRI_ADMIN_PASSWORD=... npm run test:e2e
 */

import { defineConfig, devices } from '@playwright/test';

const PORTA = 5173;
const BASE = `http://localhost:${PORTA}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  expect: { timeout: 15_000 },

  // Um por vez: os testes compartilham o mesmo servidor e o mesmo localStorage.
  fullyParallel: false,
  workers: 1,

  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'node scripts/serve.mjs',
    url: `${BASE}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
