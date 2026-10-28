/**
 * Guarda do subset de ícones (Plano de evolução, fase 1.1).
 *
 * O app usa uma biblioteca com ~4.600 ícones e consome pouco mais de 100.
 * O subset em `vendor/phosphor/subset/` é gerado por
 * `node scripts/gerar-icones.mjs` e este arquivo garante que:
 *
 *  - toda classe citada no código existe no subset (senão o ícone some);
 *  - as páginas não voltam a carregar o Phosphor completo;
 *  - o subset continua pequeno;
 *  - o peso `regular` não é usado (só o `bold` é empacotado).
 *
 * Se um teste falhar por ícone ausente, rode o gerador e commite os arquivos.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const SUBSET_CSS = 'vendor/phosphor/subset/phosphor.css';
const SUBSET_FONT = 'vendor/phosphor/subset/phosphor-bold.woff2';

/** Peso/tamanho do ícone não são nomes de ícone. */
const PESOS = new Set([
  'ph',
  'ph-bold',
  'ph-regular',
  'ph-fill',
  'ph-thin',
  'ph-light',
  'ph-duotone',
]);

function arquivosDeCodigo() {
  const lista = ['index.html', 'admin.html', 'script.js', 'admin.js', 'dados.js'];

  for (const pasta of ['css', 'js']) {
    const base = path.join(RAIZ, pasta);
    if (!fs.existsSync(base)) continue;
    for (const entrada of fs.readdirSync(base, { recursive: true, withFileTypes: true })) {
      if (!entrada.isFile()) continue;
      if (!/\.(css|js|html)$/.test(entrada.name)) continue;
      lista.push(path.relative(RAIZ, path.join(entrada.parentPath ?? entrada.path, entrada.name)));
    }
  }

  return lista.filter((arquivo) => fs.existsSync(path.join(RAIZ, arquivo)));
}

function iconesUsados() {
  const encontrados = new Set();

  for (const arquivo of arquivosDeCodigo()) {
    const texto = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
    for (const [classe] of texto.matchAll(/ph-[a-z0-9-]+/g)) {
      if (!PESOS.has(classe)) encontrados.add(classe);
    }
  }

  return [...encontrados].sort();
}

function classesNoSubset() {
  const css = fs.readFileSync(path.join(RAIZ, SUBSET_CSS), 'utf8');
  return [...css.matchAll(/\.ph-bold\.(ph-[a-z0-9-]+):before/g)].map((m) => m[1]);
}

test('o subset existe e cobre todos os ícones usados no código', () => {
  assert.ok(fs.existsSync(path.join(RAIZ, SUBSET_CSS)), `falta ${SUBSET_CSS}: rode node scripts/gerar-icones.mjs`);
  assert.ok(fs.existsSync(path.join(RAIZ, SUBSET_FONT)), `falta ${SUBSET_FONT}: rode node scripts/gerar-icones.mjs`);

  const noSubset = new Set(classesNoSubset());
  const faltando = iconesUsados().filter((classe) => !noSubset.has(classe));

  assert.deepEqual(faltando, [], `ícones sem glifo no subset (rode node scripts/gerar-icones.mjs): ${faltando.join(', ')}`);
});

test('as páginas carregam o subset, nunca o Phosphor completo', () => {
  for (const pagina of ['index.html', 'admin.html']) {
    const html = fs.readFileSync(path.join(RAIZ, pagina), 'utf8');

    assert.match(html, /vendor\/phosphor\/subset\/phosphor\.css/, `${pagina} não carrega o subset`);
    assert.equal(html.includes('vendor/phosphor/bold/style.css'), false, `${pagina} ainda carrega o Phosphor bold completo`);
    assert.equal(html.includes('vendor/phosphor/regular/style.css'), false, `${pagina} ainda carrega o Phosphor regular completo`);
  }
});

test('o subset continua pequeno e a fonte é woff2 local', () => {
  const css = fs.statSync(path.join(RAIZ, SUBSET_CSS));
  const fonte = fs.statSync(path.join(RAIZ, SUBSET_FONT));

  assert.ok(css.size < 40 * 1024, `CSS do subset com ${Math.round(css.size / 1024)} KB (limite 40 KB)`);
  assert.ok(fonte.size < 40 * 1024, `fonte do subset com ${Math.round(fonte.size / 1024)} KB (limite 40 KB)`);

  const assinatura = fs.readFileSync(path.join(RAIZ, SUBSET_FONT)).subarray(0, 4).toString('ascii');
  assert.equal(assinatura, 'wOF2', 'a fonte do subset não é woff2');

  const texto = fs.readFileSync(path.join(RAIZ, SUBSET_CSS), 'utf8');
  assert.match(texto, /url\(["']?\.\/phosphor-bold\.woff2["']?\)/, 'o @font-face não aponta para o woff2 do subset');
  assert.match(texto, /font-family:\s*["']Phosphor-Bold["']/);
});

test('nenhum componente usa o peso regular do Phosphor', () => {
  const ofensores = [];

  for (const arquivo of arquivosDeCodigo()) {
    const texto = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
    for (const [tag] of texto.matchAll(/class="ph(?!-)/g)) {
      ofensores.push(`${arquivo}: ${tag}`);
    }
  }

  assert.deepEqual(ofensores, [], 'troque class="ph ..." por class="ph-bold ...": o peso regular não é empacotado');
});
