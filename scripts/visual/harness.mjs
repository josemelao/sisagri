/**
 * Infraestrutura de comparacao visual do T13.4.
 *
 * O objetivo e provar que um refactor de CSS nao mudou nada visualmente.
 * Duas provas independentes:
 *   1. fingerprint: getComputedStyle de todos os elementos (e ::before/::after);
 *   2. screenshot: comparacao pixel a pixel.
 *
 * A comparacao e feita entre duas REFS do git, servidas por dois servidores
 * estaticos. Nao existe baseline versionado: a referencia e sempre um commit.
 */

import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PORTA_A = 5199;
export const PORTA_B = 5200;

export const VIEWPORTS = [
  { nome: '390', width: 390, height: 844 },
  { nome: '768', width: 768, height: 1024 },
  { nome: '1024', width: 1024, height: 768 },
  { nome: '1366', width: 1366, height: 768 },
  { nome: '1920', width: 1920, height: 1080 },
];

export const ROTAS = [
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

export const SECOES_ADMIN = [
  'overview',
  'funcionarios',
  'manuais',
  'processos',
  'arquivos',
  'avisos',
  'infoJuridico',
  'infoMunicipio',
  'infoOrgaos',
  'veiculos',
  'sistemas',
  'servicos',
  'agendaEventos',
  'escalaFerias',
  'acessoRapido',
  'configuracoes',
];

export const VIEWPORTS_ADMIN_SECOES = ['1366', '390'];

export const PROPS = [
  'display', 'visibility', 'position', 'top', 'right', 'bottom', 'left',
  'float', 'clear', 'z-index', 'box-sizing',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-right-radius', 'border-bottom-left-radius',
  'overflow-x', 'overflow-y',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'justify-content', 'align-items', 'align-content', 'align-self',
  'gap', 'row-gap', 'column-gap', 'order',
  'grid-template-columns', 'grid-template-rows', 'grid-auto-flow',
  'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
  'line-height', 'letter-spacing', 'word-spacing',
  'text-align', 'text-transform', 'text-decoration-line', 'text-decoration-color',
  'text-indent', 'text-shadow',
  'white-space', 'word-break', 'overflow-wrap',
  'color', 'background-color', 'background-image', 'background-position',
  'background-size', 'background-repeat', 'background-clip',
  'opacity', 'box-shadow', 'transform', 'transform-origin', 'filter',
  'transition-property', 'transition-duration', 'animation-name', 'animation-duration',
  'cursor', 'list-style-type', 'pointer-events', 'object-fit', 'aspect-ratio',
  'outline-color', 'outline-style', 'outline-width',
];

const DATA_FIXA = new Date('2026-10-23T15:00:00-03:00');

/** Sobe um servidor estatico para uma raiz e espera responder. */
export async function iniciarServidor(raiz, porta) {
  const proc = spawn(process.execPath, [path.join(raiz, 'scripts', 'serve.mjs')], {
    cwd: raiz,
    env: { ...process.env, PORT: String(porta) },
    stdio: 'ignore',
  });

  for (let tentativa = 0; tentativa < 120; tentativa += 1) {
    try {
      const resposta = await fetch(`http://127.0.0.1:${porta}/index.html`);
      if (resposta.ok) {
        return {
          url: `http://127.0.0.1:${porta}`,
          parar: () => proc.kill(),
        };
      }
    } catch {
      // servidor ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  proc.kill();
  throw new Error(`servidor nao subiu na porta ${porta}`);
}

/** Cria um worktree temporario para uma ref. */
export function criarWorktree(ref, destino) {
  removerWorktree(destino);
  execFileSync('git', ['worktree', 'add', '--detach', destino, ref], {
    cwd: RAIZ,
    stdio: 'ignore',
  });
}

export function removerWorktree(destino) {
  try {
    execFileSync('git', ['worktree', 'remove', '--force', destino], {
      cwd: RAIZ,
      stdio: 'ignore',
    });
  } catch {
    // ja removido
  }
}

/** Contexto publico: bloqueia rede externa para usar o fallback local. */
export async function novoContextoPublico(browser, viewport) {
  const contexto = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
  });
  await contexto.route('**/rest/v1/**', (rota) => rota.abort());
  await contexto.route('**/auth/v1/**', (rota) => rota.abort());
  await contexto.route('**/functions/v1/**', (rota) => rota.abort());
  return contexto;
}

export async function novoContextoAdmin(browser, viewport) {
  return browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
  });
}

/** Preparacao comum: relogio fixo e animacoes neutralizadas. */
export async function prepararPagina(page) {
  await page.clock.setFixedTime(DATA_FIXA);
  await page.addStyleTag({
    content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}',
  });
}

export async function esperarBoot(page) {
  await page
    .waitForFunction(
      () => {
        const boot = document.getElementById('boot-screen');
        if (!boot) return true;
        return (
          boot.classList.contains('is-hidden') ||
          getComputedStyle(boot).display === 'none'
        );
      },
      null,
      { timeout: 20_000 }
    )
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(500);
}

export async function abrirRotaPublica(page, base, rota) {
  await page.goto(`${base}/index.html#/${rota}`, { waitUntil: 'domcontentloaded' });
  await esperarBoot(page);
  await prepararPagina(page);
}

export async function fazerLoginAdmin(page, base, credenciais) {
  await page.goto(`${base}/admin.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#login-screen').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('#login-email').fill(credenciais.email);
  await page.locator('#login-senha').fill(credenciais.senha);
  await page.locator('[data-acao="fazer-login"]').click();
  await page.locator('#admin-app').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(500);
}

export async function abrirSecaoAdmin(page, secao) {
  if (secao !== 'overview') {
    await page.locator(`.admin-nav-item[data-section="${secao}"]`).click();
    await page.locator(`#section-${secao}.active`).waitFor({ state: 'visible', timeout: 15_000 });
  }
  await page.waitForTimeout(350);
}

/** Coleta o estilo computado de todos os elementos do body. */
export async function coletarEstilos(page, props) {
  return page.evaluate((listaProps) => {
    const ignoradas = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE']);

    function caminho(elemento) {
      const partes = [];
      let atual = elemento;
      while (atual && atual.nodeType === 1) {
        if (atual === document.body) {
          partes.unshift('body');
          break;
        }
        let indice = 1;
        let irmao = atual;
        while ((irmao = irmao.previousElementSibling)) {
          if (irmao.tagName === atual.tagName) indice += 1;
        }
        partes.unshift(`${atual.tagName.toLowerCase()}:nth-of-type(${indice})`);
        atual = atual.parentElement;
      }
      return partes.join('>');
    }

    function estilos(estilo) {
      const objeto = {};
      for (const prop of listaProps) objeto[prop] = estilo.getPropertyValue(prop);
      return objeto;
    }

    const elementos = [];
    for (const elemento of document.body.querySelectorAll('*')) {
      if (ignoradas.has(elemento.tagName)) continue;
      const registro = {
        caminho: caminho(elemento),
        estilos: estilos(getComputedStyle(elemento)),
      };
      for (const pseudo of ['::before', '::after']) {
        const estiloPseudo = getComputedStyle(elemento, pseudo);
        registro[`pseudo${pseudo}`] = estilos(estiloPseudo);
      }
      elementos.push(registro);
    }

    return elementos;
  }, props);
}

export async function capturar(page) {
  return page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
}

export function credenciaisAdmin() {
  const email = process.env.SISAGRI_ADMIN_EMAIL;
  const senha = process.env.SISAGRI_ADMIN_PASSWORD;
  return email && senha ? { email, senha } : null;
}
