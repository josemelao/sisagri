/**
 * Guarda de CI: conta atribuicoes de HTML cru com interpolacao.
 *
 * Por que existe: `${dado}` dentro de `innerHTML` transforma dado em marcacao.
 * Se o dado vier de fora (formulario, API, legenda do Instagram), vira XSS.
 *
 * Uso:
 *   node scripts/check-innerhtml.mjs            -> compara com o baseline
 *   node scripts/check-innerhtml.mjs --listar   -> so lista (sem falhar)
 *   node scripts/check-innerhtml.mjs --atualizar -> grava o baseline atual
 *
 * Regra: o numero pode CAIR livremente. Para SUBIR, e preciso rodar
 * `--atualizar` de proposito — o diff do baseline fica visivel na revisao.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(RAIZ, 'scripts', 'innerhtml-baseline.json');

/** Arquivos que pertencem ao app (nao varre node_modules nem testes). */
const ALVOS = [
  'script.js',
  'admin.js',
  'js/core/utils.js',
];

/* ------------------------------------------------------------------ */
/* leitura de strings/templates                                        */
/* ------------------------------------------------------------------ */

function pularEspacos(texto, i) {
  while (i < texto.length && /\s/.test(texto[i])) i++;
  return i;
}

/** i aponta para a aspa de abertura; devolve o indice logo apos o fechamento. */
function fimDaString(texto, i) {
  const aspa = texto[i];
  i++;
  while (i < texto.length) {
    if (texto[i] === '\\') { i += 2; continue; }
    if (texto[i] === aspa) return i + 1;
    i++;
  }
  return texto.length;
}

/** i aponta para a crase de abertura; devolve o indice da crase de fechamento. */
function fimDoTemplate(texto, i) {
  i++;
  while (i < texto.length) {
    const c = texto[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '`') return i;
    if (c === '$' && texto[i + 1] === '{') {
      i = fimDaInterpolacao(texto, i + 2);
      continue;
    }
    i++;
  }
  return texto.length;
}

/** i aponta para o primeiro caractere depois de `${`. */
function fimDaInterpolacao(texto, i) {
  let profundidade = 1;
  while (i < texto.length) {
    const c = texto[i];
    if (c === '\\') { i += 2; continue; }
    if (c === "'" || c === '"') { i = fimDaString(texto, i); continue; }
    if (c === '`') { i = fimDoTemplate(texto, i) + 1; continue; }
    if (c === '{') { profundidade++; i++; continue; }
    if (c === '}') {
      profundidade--;
      i++;
      if (profundidade === 0) return i;
      continue;
    }
    i++;
  }
  return texto.length;
}

/** i aponta para o caractere logo apos `(`; devolve o indice logo apos o `)`. */
function fimDaChamada(texto, i) {
  let profundidade = 1;
  while (i < texto.length) {
    const c = texto[i];
    if (c === '\\') { i += 2; continue; }
    if (c === "'" || c === '"') { i = fimDaString(texto, i); continue; }
    if (c === '`') { i = fimDoTemplate(texto, i) + 1; continue; }
    if (c === '(') profundidade++;
    if (c === ')') {
      profundidade--;
      i++;
      if (profundidade === 0) return i;
      continue;
    }
    i++;
  }
  return texto.length;
}

/* ------------------------------------------------------------------ */
/* varredura                                                           */
/* ------------------------------------------------------------------ */

/** i aponta para o inicio da expressao; devolve onde ela termina. */
function fimDaExpressao(texto, i) {
  let profundidade = 0;
  while (i < texto.length) {
    const c = texto[i];
    if (c === '\\') { i += 2; continue; }
    if (c === "'" || c === '"') { i = fimDaString(texto, i); continue; }
    if (c === '`') { i = fimDoTemplate(texto, i) + 1; continue; }
    if (c === '(' || c === '[' || c === '{') { profundidade++; i++; continue; }
    if (c === ')' || c === ']' || c === '}') {
      if (profundidade === 0) return i;
      profundidade--;
      i++;
      continue;
    }
    if (c === ';' && profundidade === 0) return i;
    i++;
  }
  return texto.length;
}

/**
 * @param {string} texto
 * @returns {{ total: number, interpolado: number, linhas: number[] }}
 */
export function analisar(texto) {
  let i = 0;
  let linha = 1;
  let total = 0;
  const linhas = [];

  const avancarLinhas = (ate) => {
    for (let k = i; k < ate && k < texto.length; k++) {
      if (texto[k] === '\n') linha++;
    }
  };

  while (i < texto.length) {
    const c = texto[i];

    if (c === '\n') { linha++; i++; continue; }

    // comentario de linha
    if (c === '/' && texto[i + 1] === '/') {
      while (i < texto.length && texto[i] !== '\n') i++;
      continue;
    }

    // comentario de bloco
    if (c === '/' && texto[i + 1] === '*') {
      i += 2;
      while (i < texto.length && !(texto[i] === '*' && texto[i + 1] === '/')) {
        if (texto[i] === '\n') linha++;
        i++;
      }
      i = Math.min(i + 2, texto.length);
      continue;
    }

    // string comum
    if (c === "'" || c === '"') {
      const fim = fimDaString(texto, i);
      avancarLinhas(fim);
      i = fim;
      continue;
    }

    // template literal
    if (c === '`') {
      const fim = fimDoTemplate(texto, i);
      avancarLinhas(fim + 1);
      i = fim + 1;
      continue;
    }

    // possivel sink
    if (c === '.') {
      const cabeca = /^\.(innerHTML\s*\+?=|insertAdjacentHTML\s*\()/.exec(texto.slice(i, i + 60));
      if (cabeca) {
        total++;
        const linhaDoAchado = linha;

        if (cabeca[0].startsWith('.innerHTML')) {
          const inicio = pularEspacos(texto, i + cabeca[0].length);
          const fim = fimDaExpressao(texto, inicio);
          if (texto.slice(inicio, fim).includes('${')) linhas.push(linhaDoAchado);
          avancarLinhas(fim);
          i = fim;
          continue;
        }

        // insertAdjacentHTML(...)
        const fim = fimDaChamada(texto, i + cabeca[0].length);
        if (texto.slice(i, fim).includes('${')) linhas.push(linhaDoAchado);
        avancarLinhas(fim);
        i = fim;
        continue;
      }
    }

    i++;
  }

  return { total, interpolado: linhas.length, linhas };
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

function main() {
  const argumentos = new Set(process.argv.slice(2));

  function lerBaseline() {
    if (!fs.existsSync(BASELINE)) return {};
    try {
      return JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    } catch (erro) {
      console.error(`Baseline ilegivel (${BASELINE}): ${erro.message}`);
      process.exit(2);
    }
  }

  const atual = {};
  for (const alvo of ALVOS) {
    const caminho = path.join(RAIZ, alvo);
    if (!fs.existsSync(caminho)) continue;
    atual[alvo] = analisar(fs.readFileSync(caminho, 'utf8'));
  }

  if (argumentos.has('--atualizar')) {
    const novo = {};
    for (const [arquivo, dados] of Object.entries(atual)) {
      novo[arquivo] = dados.interpolado;
    }
    fs.writeFileSync(BASELINE, `${JSON.stringify(novo, null, 2)}\n`, 'utf8');
    console.log(`Baseline gravado em ${path.relative(RAIZ, BASELINE)}:`);
    for (const [arquivo, n] of Object.entries(novo)) console.log(`  ${arquivo}: ${n}`);
    process.exit(0);
  }

  const base = lerBaseline();
  let falhou = false;

  console.log('innerHTML/insertAdjacentHTML com interpolacao:\n');
  for (const [arquivo, dados] of Object.entries(atual)) {
    const limite = base[arquivo] ?? 0;
    const delta = dados.interpolado - limite;
    const marca = delta > 0 ? 'ACIMA' : delta < 0 ? 'abaixo' : 'ok';
    console.log(
      `  ${arquivo.padEnd(20)} total ${String(dados.total).padStart(3)} |`
      + ` interpolado ${String(dados.interpolado).padStart(3)} |`
      + ` baseline ${String(limite).padStart(3)} | ${marca}`,
    );
    if (delta > 0) falhou = true;
  }

  if (falhou && !argumentos.has('--listar')) {
    console.error(
      '\nFalhou: apareceu HTML cru com interpolacao acima do baseline.\n'
      + 'Use SisUtils.escapeHtml/escapeAttr no dado, ou textContent.\n'
      + 'Se for divida tecnica consciente, rode: node scripts/check-innerhtml.mjs --atualizar',
    );
    process.exit(1);
  }

  if (!argumentos.has('--listar')) {
    const novos = Object.keys(atual).filter((arquivo) => !(arquivo in base));
    if (novos.length) {
      console.error(`\nArquivo novo fora do baseline: ${novos.join(', ')}. Rode --atualizar.`);
      process.exit(1);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
