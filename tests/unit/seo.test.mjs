/**
 * Bloco 13 (T13.2) — SEO do app publico.
 *
 * Trava os sinais que o buscador e os cards sociais leem: title, description,
 * canonical, Open Graph/Twitter, robots.txt, sitemap.xml e o noindex do admin.
 * A imagem OG tambem e conferida (PNG 1200x630).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const RAIZ = new URL('../../', import.meta.url);
const BASE = 'https://josemelao.github.io/sisagri/';

function ler(arquivo) {
  return fs.readFileSync(new URL(arquivo, RAIZ), 'utf8');
}

function meta(html, atributo, nome) {
  const regex = new RegExp(`<meta\\s+${atributo}="${nome}"\\s+content="([^"]*)"`, 'i');
  return (html.match(regex) || [])[1] || '';
}

test('index tem title e description com tamanho util', () => {
  const html = ler('index.html');
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  const description = meta(html, 'name', 'description');

  assert.match(title, /SisAgri/i);
  assert.match(title, /Agricultura/i);
  assert.match(title, /Cidade Ocidental/i);
  assert.match(description, /Cidade Ocidental/i);
  assert.ok(description.length >= 50, `description curta: ${description.length}`);
  assert.ok(description.length <= 160, `description longa: ${description.length}`);
  assert.equal((html.match(/name="description"/g) || []).length, 1);
});

test('index tem canonical absoluto e unico', () => {
  const html = ler('index.html');
  const canonicais = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/gi) || [];

  assert.equal(canonicais.length, 1);
  assert.match(canonicais[0], new RegExp(`href="${BASE}"`));
});

test('index tem Open Graph e Twitter completos', () => {
  const html = ler('index.html');

  assert.equal(meta(html, 'property', 'og:type'), 'website');
  assert.equal(meta(html, 'property', 'og:locale'), 'pt_BR');
  assert.match(meta(html, 'property', 'og:title'), /SisAgri/i);
  assert.ok(meta(html, 'property', 'og:description').length >= 50);
  assert.equal(meta(html, 'property', 'og:url'), BASE);
  assert.equal(meta(html, 'property', 'og:image'), `${BASE}assets/og-image.png`);
  assert.equal(meta(html, 'property', 'og:image:width'), '1200');
  assert.equal(meta(html, 'property', 'og:image:height'), '630');
  assert.equal(meta(html, 'name', 'twitter:card'), 'summary_large_image');
  assert.equal(meta(html, 'name', 'twitter:image'), `${BASE}assets/og-image.png`);
});

test('imagem OG existe e e PNG 1200x630', () => {
  const buffer = fs.readFileSync(new URL('assets/og-image.png', RAIZ));

  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  assert.equal(buffer.readUInt32BE(16), 1200);
  assert.equal(buffer.readUInt32BE(20), 630);
  assert.ok(buffer.length > 10_000, 'imagem OG suspeita de vazia');
});

test('robots.txt libera o app, bloqueia o admin e aponta o sitemap', () => {
  const texto = ler('robots.txt');

  assert.match(texto, /User-agent:\s*\*/i);
  assert.match(texto, /Allow:\s*\//i);
  assert.match(texto, /Disallow:\s*\/sisagri\/admin\.html/i);
  assert.match(texto, new RegExp(`Sitemap:\\s*${BASE}sitemap\\.xml`));
});

test('sitemap.xml lista a raiz com lastmod', () => {
  const xml = ler('sitemap.xml');

  assert.match(xml, /<urlset[^>]+sitemaps\.org\/schemas\/sitemap\/0\.9/);
  assert.match(xml, new RegExp(`<loc>${BASE}</loc>`));
  assert.match(xml, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  assert.equal((xml.match(/<loc>/g) || []).length, 1);
});

test('admin.html pede noindex', () => {
  const html = ler('admin.html');

  assert.equal(meta(html, 'name', 'robots'), 'noindex, nofollow');
});
