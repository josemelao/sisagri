/**
 * Gera o subset de ícones Phosphor usado pelo app (Plano de evolução, 1.1).
 *
 * O app consome ~120 classes de uma biblioteca com ~4.600 ícones. Este script
 * lê as classes citadas no código, pega os codepoints do CSS oficial da
 * Phosphor e produz:
 *
 *   vendor/phosphor/subset/phosphor.css        (só as regras usadas)
 *   vendor/phosphor/subset/phosphor-bold.woff2 (só os glifos usados)
 *
 * Os arquivos originais em `vendor/phosphor/{bold,regular}` ficam intactos.
 *
 * Uso: node scripts/gerar-icones.mjs
 * Rode sempre que adicionar um ícone novo. O teste tests/unit/icones.test.mjs
 * falha se o subset estiver desatualizado.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');

const FONTE_ORIGINAL = path.join(RAIZ, 'vendor/phosphor/bold/Phosphor-Bold.woff2');
const CSS_ORIGINAL = path.join(RAIZ, 'vendor/phosphor/bold/style.css');
const SAIDA = path.join(RAIZ, 'vendor/phosphor/subset');
const CSS_SAIDA = path.join(SAIDA, 'phosphor.css');
const FONTE_SAIDA = path.join(SAIDA, 'phosphor-bold.woff2');

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

/** Classes `ph-*` citadas no código, em ordem alfabética. */
export function iconesUsados(raiz = RAIZ) {
  const encontrados = new Set();

  for (const relativo of arquivosDeCodigo()) {
    const texto = fs.readFileSync(path.join(raiz, relativo), 'utf8');
    for (const [classe] of texto.matchAll(/ph-[a-z0-9-]+/g)) {
      if (!PESOS.has(classe)) encontrados.add(classe);
    }
  }

  return [...encontrados].sort();
}

/** Mapa classe -> codepoint, lido do CSS oficial da Phosphor. */
export function mapaDeCodepoints() {
  const css = fs.readFileSync(CSS_ORIGINAL, 'utf8');
  const mapa = new Map();

  for (const [, classe, hex] of css.matchAll(/\.ph-bold\.(ph-[a-z0-9-]+):before\s*\{\s*content:\s*"\\([0-9a-f]+)"/g)) {
    mapa.set(classe, Number.parseInt(hex, 16));
  }

  return mapa;
}

/** Corpo do seletor `.ph-bold` (mantém o mesmo desenho do original). */
function blocoBase(css) {
  const inicio = css.indexOf('.ph-bold {');
  if (inicio === -1) throw new Error('CSS da Phosphor sem o bloco .ph-bold');

  const fim = css.indexOf('}', inicio);
  return css.slice(inicio, fim + 1).trim();
}

async function main() {
  const usados = iconesUsados();
  const mapa = mapaDeCodepoints();
  const semGlifo = usados.filter((classe) => !mapa.has(classe));

  if (semGlifo.length) {
    throw new Error(
      `Ícones usados no código que não existem no CSS da Phosphor: ${semGlifo.join(', ')}`
    );
  }

  const codepoints = usados.map((classe) => mapa.get(classe));
  const cssOriginal = fs.readFileSync(CSS_ORIGINAL, 'utf8');

  const regras = usados
    .map((classe) => `.ph-bold.${classe}:before {\n  content: "\\${mapa.get(classe).toString(16)}";\n}`)
    .join('\n');

  const css = `/**
 * Subset de ícones Phosphor — GERADO por scripts/gerar-icones.mjs.
 * Não edite à mão: adicione o ícone no código e rode o gerador.
 * ${usados.length} ícones, peso bold.
 */
@font-face {
  font-family: "Phosphor-Bold";
  src: url("./phosphor-bold.woff2") format("woff2");
  font-weight: normal;
  font-style: normal;
  font-display: block;
}

${blocoBase(cssOriginal)}

${regras}
`;

  const original = fs.readFileSync(FONTE_ORIGINAL);
  const fonte = await subsetFont(original, String.fromCodePoint(...codepoints), {
    targetFormat: 'woff2',
  });

  fs.mkdirSync(SAIDA, { recursive: true });
  fs.writeFileSync(CSS_SAIDA, css);
  fs.writeFileSync(FONTE_SAIDA, fonte);

  console.log(`ícones: ${usados.length}`);
  console.log(`css:    ${(Buffer.byteLength(css) / 1024).toFixed(1)} KB`);
  console.log(`fonte:  ${(fonte.length / 1024).toFixed(1)} KB (era ${(original.length / 1024).toFixed(1)} KB)`);
}

main().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});
