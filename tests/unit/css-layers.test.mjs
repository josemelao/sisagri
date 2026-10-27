/**
 * T13.4 — CSS em camadas.
 *
 * Garantias estaticas do refactor:
 *  - a ordem de carga esta explicita no HTML (nao ha @import entre camadas);
 *  - o CSS do admin saiu do HTML e vive em admin.css;
 *  - todo var(--x) usado tem definicao em :root, fallback ou e preenchido
 *    por style inline (os tokens dinamicos vindos dos dados).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const CAMADAS = [
  'css/01-tokens-base.css',
  'css/02-shell.css',
  'css/03-header-search.css',
  'css/04-dashboard.css',
  'css/05-detail.css',
  'css/06-widgets.css',
  'css/07-pages.css',
  'css/08-responsive.css',
  'css/09-forms-preview.css',
];

/** Tokens preenchidos por style inline (index.html ou script.js), nao por :root. */
const TOKENS_DINAMICOS = ['--ac', '--c', '--ct', '--ic', '--mc', '--rc'];

const ler = (relativo) => fs.readFileSync(path.join(RAIZ, relativo), 'utf8');
const existe = (relativo) => fs.existsSync(path.join(RAIZ, relativo));

function linksDeCss(html) {
  return [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
    (achado) => achado[1]
  );
}

/** Nomes de token declarados dentro do primeiro bloco :root. */
function tokensDefinidos(css) {
  const inicio = css.indexOf(':root');
  assert.ok(inicio >= 0, 'o CSS deveria declarar :root');
  const fim = css.indexOf('}', inicio);
  const bloco = css.slice(inicio, fim);
  return new Set([...bloco.matchAll(/(--[\w-]+)\s*:/g)].map((achado) => achado[1]));
}

/** var(--x) sem fallback: sao os que precisam existir em :root. */
function tokensSemFallback(css) {
  const usados = new Set();
  for (const achado of css.matchAll(/var\(\s*(--[\w-]+)\s*(,?)/g)) {
    if (achado[2] !== ',') usados.add(achado[1]);
  }
  return usados;
}

test('T13.4: o index.html carrega as camadas na ordem numerica', () => {
  const links = linksDeCss(ler('index.html')).filter((href) => href.startsWith('css/'));
  assert.deepEqual(links, CAMADAS, 'os <link> das camadas devem seguir a ordem 01..09');

  const html = ler('index.html');
  assert.doesNotMatch(html, /href="style\.css"/, 'index.html ainda aponta para style.css');
  assert.ok(!existe('style.css'), 'style.css deveria ter sido removido');
});

test('T13.4: cada camada existe, nao esta vazia e nao importa outra', () => {
  for (const camada of CAMADAS) {
    assert.ok(existe(camada), `camada ausente: ${camada}`);
    const css = ler(camada);
    assert.ok(css.trim().length > 0, `camada vazia: ${camada}`);
    assert.doesNotMatch(css, /@import/, `${camada}: use <link> no HTML, nao @import`);
  }
});

test('T13.4: nenhum @media se perdeu no split', () => {
  const total = CAMADAS.reduce(
    (soma, camada) => soma + (ler(camada).match(/@media/g) ?? []).length,
    0
  );
  assert.equal(total, 14, '13 @media do split + 1 de prefers-reduced-motion no boot');
});

test('T13.4: todo var(--x) do publico tem definicao ou fallback', () => {
  const css = CAMADAS.map(ler).join('\n');
  const definidos = tokensDefinidos(ler(CAMADAS[0]));
  const semFallback = tokensSemFallback(css);
  const orfaos = [...semFallback].filter(
    (token) => !definidos.has(token) && !TOKENS_DINAMICOS.includes(token)
  );
  assert.deepEqual(orfaos, [], 'tokens usados sem definicao nem fallback');
});

test('T13.4: os tokens dinamicos continuam sendo preenchidos pelo app', () => {
  const fontes = `${ler('index.html')}\n${ler('script.js')}`;
  for (const token of TOKENS_DINAMICOS) {
    assert.ok(
      fontes.includes(`${token}:`),
      `${token} esta na lista de dinamicos mas nao e preenchido no HTML/JS`
    );
  }
});

test('T13.4: o css do admin saiu do HTML e vive em admin.css', () => {
  const html = ler('admin.html');
  assert.doesNotMatch(html, /<style\b/, 'admin.html ainda tem bloco <style> inline');
  assert.ok(
    linksDeCss(html).includes('admin.css'),
    'admin.html deveria carregar admin.css'
  );
  assert.ok(existe('admin.css'), 'admin.css nao existe');

  const css = ler('admin.css');
  assert.match(css, /:root\s*\{/, 'admin.css deveria declarar :root');
  assert.equal((css.match(/@media/g) ?? []).length, 5, '4 @media originais + prefers-reduced-motion no boot');

  const definidos = tokensDefinidos(css);
  const orfaos = [...tokensSemFallback(css)].filter((token) => !definidos.has(token));
  assert.deepEqual(orfaos, [], 'admin.css usa tokens sem definicao nem fallback');
});
