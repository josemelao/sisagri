/**
 * Testes da guarda de CI `scripts/check-innerhtml.mjs` (Bloco 9a).
 *
 * A guarda so vale se ela nao der falso negativo (deixar passar HTML cru) nem
 * falso positivo (contar comentario/string). Estes testes fixam a deteccao.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { analisar } from '../../scripts/check-innerhtml.mjs';

function contar(codigo) {
  return analisar(codigo).interpolado;
}

test('detecta template literal interpolado em innerHTML', () => {
  assert.equal(contar('el.innerHTML = `<b>${nome}</b>`;'), 1);
});

test('detecta innerHTML = map(...).join("") com template dentro', () => {
  assert.equal(contar('el.innerHTML = lista.map(i => `<li>${i}</li>`).join("");'), 1);
});

test('detecta insertAdjacentHTML com interpolacao', () => {
  assert.equal(contar("el.insertAdjacentHTML('beforeend', `<p>${x}</p>`);"), 1);
});

test('detecta interpolacao aninhada dentro da interpolacao', () => {
  assert.equal(contar('el.innerHTML = `<b>${ok ? `sim ${n}` : ""}</b>`;'), 1);
});

test('nao conta string simples sem interpolacao', () => {
  assert.equal(contar('el.innerHTML = "";'), 0);
  assert.equal(contar('el.innerHTML = "<b>fixo</b>";'), 0);
});

test('nao conta variavel que ja veio pronta', () => {
  assert.equal(contar('el.innerHTML = html;'), 0);
});

test('nao conta concatenacao sem ${', () => {
  assert.equal(contar('el.innerHTML = "<b>" + nome + "</b>";'), 0);
});

test('nao conta comentario de linha', () => {
  assert.equal(contar('// el.innerHTML = `<b>${x}</b>`;\nconst a = 1;'), 0);
});

test('nao conta comentario de bloco', () => {
  assert.equal(contar('/*\n  el.innerHTML = `<b>${x}</b>`;\n*/\nconst a = 1;'), 0);
});

test('nao conta texto dentro de string comum', () => {
  assert.equal(contar('const exemplo = "el.innerHTML = `<b>${x}</b>`";'), 0);
});

test('conta total separado de interpolado', () => {
  const r = analisar('el.innerHTML = "";\nel.innerHTML = `<b>${x}</b>`;\nel.innerHTML = html;');
  assert.equal(r.total, 3);
  assert.equal(r.interpolado, 1);
});

test('reporta a linha certa', () => {
  const r = analisar('const a = 1;\nconst b = 2;\nel.innerHTML = `<b>${x}</b>`;');
  assert.equal(r.linhas.length, 1);
  assert.equal(r.linhas[0], 3);
});
