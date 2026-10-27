/**
 * Site interno — fora de buscadores (2026-10-27).
 *
 * Substitui os testes de SEO do T13.2: agora travam o contrario — noindex nas
 * duas paginas, ausencia de canonical/Open Graph/Twitter/description,
 * robots.txt fechado e ausencia de sitemap. Tambem conferem a logo nova, o
 * favicon e a versao do rodape.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const RAIZ = new URL('../../', import.meta.url);

function ler(arquivo) {
  return fs.readFileSync(new URL(arquivo, RAIZ), 'utf8');
}

function existe(arquivo) {
  return fs.existsSync(new URL(arquivo, RAIZ));
}

function meta(html, atributo, nome) {
  const regex = new RegExp(`<meta\\s+${atributo}="${nome}"\\s+content="([^"]*)"`, 'i');
  return (html.match(regex) || [])[1] || '';
}

function dimensoesPng(arquivo) {
  const buffer = fs.readFileSync(new URL(arquivo, RAIZ));
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG', `${arquivo} nao e PNG`);
  return {
    largura: buffer.readUInt32BE(16),
    altura: buffer.readUInt32BE(20),
    bytes: buffer.length,
  };
}

test('index.html nao e indexavel', () => {
  const html = ler('index.html');
  const robots = meta(html, 'name', 'robots');

  for (const diretiva of ['noindex', 'nofollow', 'noarchive', 'nosnippet', 'noimageindex']) {
    assert.match(robots, new RegExp(diretiva), `falta ${diretiva}: ${robots}`);
  }
  assert.equal((html.match(/name="robots"/g) || []).length, 1);
});

test('index.html nao carrega sinais de SEO ou divulgacao', () => {
  const html = ler('index.html');

  assert.equal(meta(html, 'name', 'description'), '');
  assert.equal(html.includes('rel="canonical"'), false, 'canonical ainda presente');
  assert.equal(/property="og:/.test(html), false, 'Open Graph ainda presente');
  assert.equal(/name="twitter:/.test(html), false, 'Twitter Card ainda presente');
});

test('admin.html continua fora do indice', () => {
  assert.equal(meta(ler('admin.html'), 'name', 'robots'), 'noindex, nofollow');
});

test('robots.txt fecha o site inteiro e nao anuncia sitemap', () => {
  const texto = ler('robots.txt');

  assert.match(texto, /User-agent:\s*\*/i);
  assert.match(texto, /Disallow:\s*\/\s*$/m);
  assert.equal(/^\s*Allow:/im.test(texto), false, 'Allow nao deveria existir');
  assert.equal(/Sitemap:/i.test(texto), false, 'Sitemap nao deveria ser anunciado');
});

test('sitemap.xml e a imagem OG nao existem mais', () => {
  assert.equal(existe('sitemap.xml'), false);
  assert.equal(existe('assets/og-image.png'), false);
});

test('favicon e apple-touch-icon existem, sao PNG quadrados e sao referenciados', () => {
  const favicon = dimensoesPng('assets/favicon-32.png');
  assert.deepEqual([favicon.largura, favicon.altura], [32, 32]);

  const apple = dimensoesPng('assets/apple-touch-icon.png');
  assert.deepEqual([apple.largura, apple.altura], [180, 180]);

  for (const pagina of ['index.html', 'admin.html']) {
    const html = ler(pagina);
    assert.match(html, /rel="icon"[^>]+assets\/favicon-32\.png/, `${pagina} sem favicon`);
    assert.match(html, /rel="apple-touch-icon"[^>]+assets\/apple-touch-icon\.png/, `${pagina} sem apple-touch-icon`);
  }
});

test('logo: original e recorte do emblema existem e o index usa o emblema', () => {
  const original = dimensoesPng('assets/logo-agricultura.png');
  assert.ok(original.largura >= 300 && original.altura >= 200, 'logo original pequena demais');

  const emblema = dimensoesPng('assets/logo-emblema.png');
  assert.deepEqual([emblema.largura, emblema.altura], [128, 128]);
  assert.ok(emblema.bytes < 100_000, 'emblema grande demais para 40px');

  const html = ler('index.html');
  assert.match(html, /<img src="assets\/logo-emblema\.png"[^>]*alt=""/);
  assert.equal(html.includes('ph-bold ph-leaf"></i></span>'), false, 'icone antigo ainda presente');
});

test('rodape mostra v2.0 - por Jose Tadeu', () => {
  const html = ler('index.html');

  assert.match(html, /<span>v2\.0 - por José Tadeu<\/span>/);
  assert.equal(html.includes('v1.1'), false, 'versao antiga ainda presente');
});
