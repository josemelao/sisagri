/**
 * Compara o CSS entre duas refs do git.
 *
 * Uso:
 *   node scripts/visual/css-diff.mjs <refA> <refB>
 *   node scripts/visual/css-diff.mjs HEAD~1 HEAD --only=fingerprint
 *   node scripts/visual/css-diff.mjs HEAD~1 HEAD --only=shots
 *
 * Sai com codigo 1 se houver qualquer diferenca.
 * Requer SISAGRI_ADMIN_EMAIL e SISAGRI_ADMIN_PASSWORD para as telas logadas.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as h from './harness.mjs';

const argumentos = process.argv.slice(2);
const refs = argumentos.filter((arg) => !arg.startsWith('--'));
const opcoes = new Set(argumentos.filter((arg) => arg.startsWith('--')));
const somente = [...opcoes]
  .find((opcao) => opcao.startsWith('--only='))
  ?.replace('--only=', '');
const compararFingerprint = somente !== 'shots';
const compararShots = somente !== 'fingerprint';
const verbose = opcoes.has('--verbose');
const filtroRotas = [...opcoes]
  .find((opcao) => opcao.startsWith('--rotas='))
  ?.replace('--rotas=', '')
  .split(',')
  .filter(Boolean);
const filtroViewports = [...opcoes]
  .find((opcao) => opcao.startsWith('--viewports='))
  ?.replace('--viewports=', '')
  .split(',')
  .filter(Boolean);
const rotas = filtroRotas?.length ? h.ROTAS.filter((rota) => filtroRotas.includes(rota)) : h.ROTAS;
const viewports = filtroViewports?.length
  ? h.VIEWPORTS.filter((viewport) => filtroViewports.includes(viewport.nome))
  : h.VIEWPORTS;

if (refs.length !== 2) {
  console.error('uso: node scripts/visual/css-diff.mjs <refA> <refB> [--only=fingerprint|shots]');
  process.exit(2);
}

const [refA, refB] = refs;
const SAIDA = path.join(h.RAIZ, '.visual-baseline');
const DIFS = path.join(SAIDA, 'diffs');
const WT_A = path.join(os.tmpdir(), 'sisagri-visual', 'wt-a');
const WT_B = path.join(os.tmpdir(), 'sisagri-visual', 'wt-b');

let falhas = 0;
let comparacoes = 0;
let servidorA;
let servidorB;
let browser;

function nomeSeguro(valor) {
  return valor.replace(/[^a-z0-9._-]+/gi, '-');
}

function compararEstilos(elementosA, elementosB) {
  const mapaA = new Map(elementosA.map((item) => [item.caminho, item]));
  const mapaB = new Map(elementosB.map((item) => [item.caminho, item]));
  const problemas = [];

  for (const [caminho, itemA] of mapaA) {
    const itemB = mapaB.get(caminho);
    if (!itemB) {
      problemas.push({ caminho, detalhe: 'elemento ausente na ref B' });
      continue;
    }

    const grupos = [
      ['estilos', itemA.estilos, itemB.estilos],
      ['::before', itemA['pseudo::before'], itemB['pseudo::before']],
      ['::after', itemA['pseudo::after'], itemB['pseudo::after']],
    ];

    for (const [grupo, estilosA, estilosB] of grupos) {
      if (!estilosA || !estilosB) continue;
      for (const prop of Object.keys(estilosA)) {
        if (estilosA[prop] !== estilosB[prop]) {
          problemas.push({
            caminho,
            detalhe: `${grupo} ${prop}: ${estilosA[prop]} -> ${estilosB[prop]}`,
          });
        }
      }
    }
  }

  for (const caminho of mapaB.keys()) {
    if (!mapaA.has(caminho)) {
      problemas.push({ caminho, detalhe: 'elemento novo na ref B' });
    }
  }

  return problemas;
}

async function compararPagina(nome, pageA, pageB) {
  comparacoes += 1;
  const problemas = [];

  if (compararFingerprint) {
    const elementosA = await h.coletarEstilos(pageA, h.PROPS);
    const elementosB = await h.coletarEstilos(pageB, h.PROPS);
    problemas.push(...compararEstilos(elementosA, elementosB));
  }

  if (compararShots) {
    const pngA = PNG.sync.read(await h.capturar(pageA));
    const pngB = PNG.sync.read(await h.capturar(pageB));

    if (pngA.width !== pngB.width || pngA.height !== pngB.height) {
      problemas.push({
        caminho: '(screenshot)',
        detalhe: `dimensoes ${pngA.width}x${pngA.height} -> ${pngB.width}x${pngB.height}`,
      });
    } else {
      const diff = new PNG({ width: pngA.width, height: pngA.height });
      const pixels = pixelmatch(pngA.data, pngB.data, diff.data, pngA.width, pngA.height, {
        threshold: 0.1,
        includeAA: false,
      });
      if (pixels > 0) {
        fs.mkdirSync(DIFS, { recursive: true });
        const arquivo = path.join(DIFS, `${nomeSeguro(nome)}.png`);
        fs.writeFileSync(arquivo, PNG.sync.write(diff));
        problemas.push({
          caminho: '(screenshot)',
          detalhe: `${pixels} pixel(s) diferentes -> ${path.relative(h.RAIZ, arquivo)}`,
        });
      }
    }
  }

  if (problemas.length === 0) {
    if (verbose) console.log(`[OK]    ${nome}`);
    return;
  }

  falhas += 1;
  console.log(`[FALHA] ${nome} (${problemas.length} diferenca(s))`);
  for (const problema of problemas.slice(0, 12)) {
    console.log(`        ${problema.caminho} :: ${problema.detalhe}`);
  }
  if (problemas.length > 12) {
    console.log(`        ... e mais ${problemas.length - 12}`);
  }
}

async function compararPublico() {
  for (const viewport of viewports) {
    const contextoA = await h.novoContextoPublico(browser, viewport);
    const contextoB = await h.novoContextoPublico(browser, viewport);
    const pageA = await contextoA.newPage();
    const pageB = await contextoB.newPage();

    for (const rota of rotas) {
      await h.abrirRotaPublica(pageA, servidorA.url, rota);
      await h.abrirRotaPublica(pageB, servidorB.url, rota);
      await compararPagina(`publico-${rota}-${viewport.nome}`, pageA, pageB);
    }

    await contextoA.close();
    await contextoB.close();
  }
}

async function capturarLoginsAdmin() {
  for (const viewport of viewports) {
    const contextoA = await h.novoContextoAdmin(browser, viewport);
    const contextoB = await h.novoContextoAdmin(browser, viewport);
    const pageA = await contextoA.newPage();
    const pageB = await contextoB.newPage();

    await pageA.goto(`${servidorA.url}/admin.html`, { waitUntil: 'domcontentloaded' });
    await pageB.goto(`${servidorB.url}/admin.html`, { waitUntil: 'domcontentloaded' });
    await pageA.locator('#login-screen').waitFor({ state: 'visible', timeout: 30_000 });
    await pageB.locator('#login-screen').waitFor({ state: 'visible', timeout: 30_000 });
    await h.prepararPagina(pageA);
    await h.prepararPagina(pageB);
    await compararPagina(`admin-login-${viewport.nome}`, pageA, pageB);

    await contextoA.close();
    await contextoB.close();
  }
}

async function abrirAdminLogado(page, base) {
  await page.goto(`${base}/admin.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#admin-app').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(500);
}

async function compararAdmin(credenciais) {
  await capturarLoginsAdmin();
  if (!credenciais) return;

  // Um unico login por ref; a sessao e reaproveitada nos demais viewports.
  const viewportLogin = h.VIEWPORTS.find((item) => item.nome === '1366');
  const contextoLoginA = await h.novoContextoAdmin(browser, viewportLogin);
  const contextoLoginB = await h.novoContextoAdmin(browser, viewportLogin);
  const pageLoginA = await contextoLoginA.newPage();
  const pageLoginB = await contextoLoginB.newPage();

  await h.fazerLoginAdmin(pageLoginA, servidorA.url, credenciais);
  await h.fazerLoginAdmin(pageLoginB, servidorB.url, credenciais);

  const estadoA = await contextoLoginA.storageState();
  const estadoB = await contextoLoginB.storageState();
  await contextoLoginA.close();
  await contextoLoginB.close();

  for (const viewport of viewports) {
    const contextoA = await h.novoContextoAdmin(browser, viewport, estadoA);
    const contextoB = await h.novoContextoAdmin(browser, viewport, estadoB);
    const pageA = await contextoA.newPage();
    const pageB = await contextoB.newPage();

    await abrirAdminLogado(pageA, servidorA.url);
    await abrirAdminLogado(pageB, servidorB.url);
    await h.prepararPagina(pageA);
    await h.prepararPagina(pageB);
    await compararPagina(`admin-overview-${viewport.nome}`, pageA, pageB);

    await contextoA.close();
    await contextoB.close();
  }

  const alvosSecoes = h.VIEWPORTS_ADMIN_SECOES.filter((nome) =>
    viewports.some((viewport) => viewport.nome === nome)
  );

  for (const nomeViewport of alvosSecoes) {
    const viewport = h.VIEWPORTS.find((item) => item.nome === nomeViewport);
    if (!viewport) continue;
    const contextoA = await h.novoContextoAdmin(browser, viewport, estadoA);
    const contextoB = await h.novoContextoAdmin(browser, viewport, estadoB);
    const pageA = await contextoA.newPage();
    const pageB = await contextoB.newPage();

    await abrirAdminLogado(pageA, servidorA.url);
    await abrirAdminLogado(pageB, servidorB.url);

    for (const secao of h.SECOES_ADMIN) {
      if (secao === 'overview') continue;
      await h.abrirSecaoAdmin(pageA, secao);
      await h.abrirSecaoAdmin(pageB, secao);
      await h.prepararPagina(pageA);
      await h.prepararPagina(pageB);
      await compararPagina(`admin-${secao}-${nomeViewport}`, pageA, pageB);
    }

    if (nomeViewport === '1366') {
      for (const [nome, secao, acao] of [
        ['manual', 'manuais', 'novo-manual'],
        ['funcionario', 'funcionarios', 'novo-funcionario'],
      ]) {
        for (const page of [pageA, pageB]) {
          await h.abrirSecaoAdmin(page, secao);
          await page.locator(`[data-acao="${acao}"]`).first().click();
          await page.locator('.modal-box').first().waitFor({ state: 'visible', timeout: 15_000 });
          await page.waitForTimeout(400);
        }
        await h.prepararPagina(pageA);
        await h.prepararPagina(pageB);
        await compararPagina(`admin-modal-${nome}-1366`, pageA, pageB);
        for (const page of [pageA, pageB]) {
          await page.keyboard.press('Escape').catch(() => {});
          await page.locator('[data-acao="fechar-modal"]').first().click().catch(() => {});
        }
      }
    }

    await contextoA.close();
    await contextoB.close();
  }
}

async function principal() {
  fs.mkdirSync(SAIDA, { recursive: true });
  fs.mkdirSync(path.dirname(WT_A), { recursive: true });

  const credenciais = h.credenciaisAdmin();
  if (!credenciais) {
    console.log('[aviso] sem SISAGRI_ADMIN_EMAIL/SISAGRI_ADMIN_PASSWORD: telas logadas serao puladas.');
  }

  console.log(`Comparando ${refA} (A) com ${refB} (B)`);
  console.log(`Fingerprint: ${compararFingerprint ? 'sim' : 'nao'} | Screenshots: ${compararShots ? 'sim' : 'nao'}`);

  h.criarWorktree(refA, WT_A);
  h.criarWorktree(refB, WT_B);

  try {
    servidorA = await h.iniciarServidor(WT_A, h.PORTA_A);
    servidorB = await h.iniciarServidor(WT_B, h.PORTA_B);
    browser = await chromium.launch();

    await compararPublico();
    await compararAdmin(credenciais);

    console.log('');
    console.log(`Comparacoes: ${comparacoes} | Falhas: ${falhas}`);
    process.exitCode = falhas === 0 ? 0 : 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (servidorA) servidorA.parar();
    if (servidorB) servidorB.parar();
    h.removerWorktree(WT_A);
    h.removerWorktree(WT_B);
  }
}

principal().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
