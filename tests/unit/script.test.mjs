/**
 * Testes de characterization de `script.js`.
 *
 * `script.js` e grande e so registra listeners no load (o DOMContentLoaded nao
 * roda aqui). Entao o harness carrega `db.js` + `script.js` e testa as funcoes
 * puras que valem a pena travar.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts } from '../helpers/load-script.mjs';

function carregarApp() {
  // db.js primeiro: script.js consome o global DB.
  return carregarScripts(['db.js', 'script.js'], { supabase: false });
}

/* ==========================================================================
   escapeHtml
   ========================================================================== */

test('escapeHtml: escapa & < >', () => {
  const h = carregarApp();
  const escapeHtml = h.get('escapeHtml');
  assert.equal(escapeHtml('<b>bold</b>'), '&lt;b&gt;bold&lt;/b&gt;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml('&<>'), '&amp;&lt;&gt;');
});

test('escapeHtml: o & e escapado antes, sem dupla escapada nos outros', () => {
  const h = carregarApp();
  const escapeHtml = h.get('escapeHtml');
  assert.equal(escapeHtml('&lt;'), '&amp;lt;');
});

test('DIVERGENCIA CONHECIDA: escapeHtml NAO escapa aspas', () => {
  // Risco de injecao quando o valor cai dentro de um atributo HTML.
  // Hoje todos os usos observados sao em conteudo de texto, entao nao explora.
  // NAO corrigido neste bloco (T4 proibe mexer no app). Decisao pendente.
  const h = carregarApp();
  const escapeHtml = h.get('escapeHtml');
  assert.equal(escapeHtml('"duplas"'), '"duplas"');
  assert.equal(escapeHtml("'simples'"), "'simples'");
});

test('DIVERGENCIA CONHECIDA: escapeHtml lanca em valor nao-string', () => {
  // `str.replace` direto: null/undefined/number explodem em vez de virar ''.
  // Assercao por mensagem (nao por TypeError) porque o erro vem do realm do vm.
  const h = carregarApp();
  const escapeHtml = h.get('escapeHtml');
  assert.throws(() => escapeHtml(null), /replace/);
  assert.throws(() => escapeHtml(undefined), /replace/);
  assert.throws(() => escapeHtml(42), /replace/);
});

/* ==========================================================================
   getInitials
   ========================================================================== */

test('getInitials: nome e sobrenome', () => {
  const h = carregarApp();
  assert.equal(h.get('getInitials')('Jose Tadeu'), 'JT');
});

test('getInitials: nome unico usa a primeira letra', () => {
  const h = carregarApp();
  assert.equal(h.get('getInitials')('Maria'), 'M');
});

test('getInitials: usa primeiro e ultimo de nomes compostos', () => {
  const h = carregarApp();
  assert.equal(h.get('getInitials')('Ana Paula Souza Lima'), 'AL');
});

/* ==========================================================================
   carga do app
   ========================================================================== */

test('script.js carrega sem tocar no DOM real e expoe os handlers globais', () => {
  const h = carregarApp();
  assert.equal(typeof h.window.switchManualMode, 'function');
  assert.equal(typeof h.window.switchManualPasso, 'function');
  // db.js exposto
  assert.equal(typeof h.window.DB, 'object');
  assert.equal(typeof h.window.dbInit, 'function');
});
