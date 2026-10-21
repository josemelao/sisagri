/**
 * Bloco 9c (T9.4) — nenhum handler inline no codigo.
 *
 * O padrao passa a ser `data-acao="modulo:acao"` + uma unica delegacao por
 * arquivo. Este teste e a criterio de aceite do grupo migrado: qualquer
 * `onclick=`, `onchange=`, `oninput=` ou `onsubmit=` que voltar quebra aqui.
 *
 * Bloco 9d (T9.5): a CSP bloqueia handler inline (`script-src-attr`), entao
 * `onerror=` / `onload=` tambem entram na guarda. O fallback de imagem do
 * preview usa delegacao de `error` em script.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARQUIVOS = ['script.js', 'admin.js', 'index.html', 'admin.html'];
// Atributo inline sempre tem valor entre aspas (`onerror="..."`); atribuicoes
// de propriedade no JS (`reader.onload = ...`) nao entram.
const HANDLER_INLINE = /\bon(click|change|input|submit|error|load|mouseover|focus|blur)\s*=\s*["']/g;

test('Bloco 9c/9d: JS e HTML nao tem handlers inline', () => {
  for (const arquivo of ARQUIVOS) {
    const codigo = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
    const achados = codigo.match(HANDLER_INLINE) || [];
    assert.deepEqual(
      achados,
      [],
      `${arquivo}: ${achados.length} handler(s) inline; use data-acao + delegacao`,
    );
  }
});
