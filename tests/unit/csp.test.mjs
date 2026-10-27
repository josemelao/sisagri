/**
 * Bloco 9d (T9.5) + T13.5 — CSP declarada por meta tag.
 *
 * A politica e medida no navegador em tests/e2e/csp.spec.mjs; aqui ficam as
 * garantias estaticas: a meta existe nos dois HTMLs, as fontes permitidas sao
 * exatamente as necessarias, os assets sao locais e o supabase-js esta
 * vendorizado em versao exata.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTMLS = ['index.html', 'admin.html'];

const DIRETIVAS = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'font-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
  'frame-src': ["'self'", 'blob:', 'https://*.supabase.co', 'https://view.officeapps.live.com'],
  'object-src': ["'none'"],
};

const SUPABASE_LOCAL = 'vendor/supabase-js/supabase-js-2.118.0.js';
const SUPABASE_SHA384 = '4dc1d1037cc16e7f8b7b18799fe3a297882e34f392deb8cd0e919100de3abbfb3f981d88679d1c782e93603536caf80a';

function lerHtml(arquivo) {
  return fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
}

function lerCsp(arquivo) {
  const meta = lerHtml(arquivo).match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i);
  assert.ok(meta, `${arquivo}: falta a meta Content-Security-Policy`);
  const conteudo = meta[0].match(/content=(["'])([\s\S]*?)\1/i);
  assert.ok(conteudo, `${arquivo}: meta CSP sem atributo content`);
  return conteudo[2];
}

function mapaDiretivas(csp) {
  return new Map(
    csp.split(';')
      .map((parte) => parte.trim())
      .filter(Boolean)
      .map((parte) => {
        const [nome, ...fontes] = parte.split(/\s+/);
        return [nome.toLowerCase(), fontes];
      }),
  );
}

test('CSP: index.html e admin.html declaram as diretivas e fontes necessarias', () => {
  for (const arquivo of HTMLS) {
    const csp = lerCsp(arquivo);
    const diretivas = mapaDiretivas(csp);

    for (const [diretiva, fontes] of Object.entries(DIRETIVAS)) {
      assert.ok(diretivas.has(diretiva), `${arquivo}: falta a diretiva ${diretiva}`);
      for (const fonte of fontes) {
        assert.ok(
          diretivas.get(diretiva).includes(fonte),
          `${arquivo}: ${diretiva} sem ${fonte}`,
        );
      }
    }

    assert.ok(!/['"]?unsafe-eval['"]?/.test(csp), `${arquivo}: CSP nao pode liberar unsafe-eval`);
    assert.ok(
      !diretivas.get('script-src').includes("'unsafe-inline'"),
      `${arquivo}: script-src nao pode liberar unsafe-inline`,
    );
    assert.ok(
      !/unpkg\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(csp),
      `${arquivo}: CSP ainda libera CDN externa`,
    );
  }
});

test('CSP: supabase-js vendorizado em versao exata nos dois HTMLs', () => {
  const origens = new Map();

  for (const arquivo of HTMLS) {
    const tag = lerHtml(arquivo).match(/<script[^>]+src=["']([^"']*supabase-js[^"']*)["'][^>]*>/i);
    assert.ok(tag, `${arquivo}: script do supabase-js nao encontrado`);
    assert.equal(tag[1], SUPABASE_LOCAL, `${arquivo}: supabase-js deve ser local`);
    assert.match(tag[1], /supabase-js-\d+\.\d+\.\d+\.js$/, `${arquivo}: versao do supabase-js nao esta fixa`);
    assert.doesNotMatch(tag[0], /https?:\/\//, `${arquivo}: script do supabase-js ainda aponta para CDN`);

    origens.set(arquivo, tag[1]);
  }

  assert.equal(
    new Set(origens.values()).size,
    1,
    'index.html e admin.html devem carregar a mesma versao do supabase-js',
  );

  const caminho = path.join(RAIZ, SUPABASE_LOCAL);
  assert.ok(fs.existsSync(caminho), `arquivo local do supabase-js nao existe: ${SUPABASE_LOCAL}`);
  const hash = crypto.createHash('sha384').update(fs.readFileSync(caminho)).digest('hex');
  assert.equal(hash, SUPABASE_SHA384, 'supabase-js local mudou; atualize a versao e o hash esperado');
});

test('T13.5: fontes, Phosphor e supabase-js sao locais', () => {
  const assets = [
    'assets/fonts/fonts.css',
    'assets/fonts/dmsans-latin.woff2',
    'assets/fonts/dmserifdisplay-latin.woff2',
    'assets/fonts/playfairdisplay-700-latin.woff2',
    'assets/fonts/playfairdisplay-700-italic-latin.woff2',
    'assets/fonts/roboto-latin.woff2',
    'vendor/phosphor/regular/style.css',
    'vendor/phosphor/regular/Phosphor.woff2',
    'vendor/phosphor/bold/style.css',
    'vendor/phosphor/bold/Phosphor-Bold.woff2',
    'vendor/phosphor/subset/phosphor.css',
    'vendor/phosphor/subset/phosphor-bold.woff2',
    SUPABASE_LOCAL,
  ];

  for (const arquivo of HTMLS) {
    const html = lerHtml(arquivo);
    assert.match(html, /assets\/fonts\/fonts\.css/, `${arquivo}: falta o CSS de fontes local`);
    assert.match(html, /vendor\/phosphor\/subset\/phosphor\.css/, `${arquivo}: falta o subset de icones local`);
    assert.doesNotMatch(
      html,
      /unpkg\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/,
      `${arquivo}: ainda referencia CDN externa`,
    );
  }

  for (const asset of assets) {
    assert.ok(fs.existsSync(path.join(RAIZ, asset)), `asset local ausente: ${asset}`);
  }
});
