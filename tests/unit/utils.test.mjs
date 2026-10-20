/**
 * Testes de `js/core/utils.js` (Bloco 9a).
 *
 * Antes existiam DUAS implementacoes de escape e as duas tinham defeito:
 *   - script.js `escapeHtml`: nao escapava aspas e lancava TypeError em null;
 *   - admin.js `escHtml`: nao escapava apostrofo e transformava 0/false em ''.
 *
 * Agora existe uma so, correta, exposta em `window.SisUtils`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts } from '../helpers/load-script.mjs';

function carregarUtils() {
  return carregarScripts(['js/core/utils.js'], { supabase: false });
}

/* ==========================================================================
   escapeHtml
   ========================================================================== */

test('escapeHtml: escapa & < > " \'', () => {
  const { SisUtils } = carregarUtils().window;

  assert.equal(SisUtils.escapeHtml('&'), '&amp;');
  assert.equal(SisUtils.escapeHtml('<'), '&lt;');
  assert.equal(SisUtils.escapeHtml('>'), '&gt;');
  assert.equal(SisUtils.escapeHtml('"'), '&quot;');
  assert.equal(SisUtils.escapeHtml("'"), '&#39;');
});

test('escapeHtml: & e escapado primeiro (sem dupla escapada errada)', () => {
  const { SisUtils } = carregarUtils().window;

  assert.equal(SisUtils.escapeHtml('&lt;'), '&amp;lt;');
  assert.equal(SisUtils.escapeHtml('<b>&"x"</b>'), '&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;');
});

test('escapeHtml: valor nulo/vazio vira string vazia (nao lanca)', () => {
  const { SisUtils } = carregarUtils().window;

  assert.equal(SisUtils.escapeHtml(null), '');
  assert.equal(SisUtils.escapeHtml(undefined), '');
  assert.equal(SisUtils.escapeHtml(''), '');
});

test('escapeHtml: numero e booleano sao convertidos, nao zerados', () => {
  const { SisUtils } = carregarUtils().window;

  assert.equal(SisUtils.escapeHtml(0), '0');
  assert.equal(SisUtils.escapeHtml(42), '42');
  assert.equal(SisUtils.escapeHtml(false), 'false');
});

/* ==========================================================================
   escapeAttr
   ========================================================================== */

test('escapeAttr: aspas duplas e simples nao quebram atributo', () => {
  const { SisUtils } = carregarUtils().window;

  assert.equal(SisUtils.escapeAttr('" onerror="alert(1)'), '&quot; onerror=&quot;alert(1)');
  assert.equal(SisUtils.escapeAttr("' onclick='x"), '&#39; onclick=&#39;x');
});

test('escapeAttr: tambem escapa < > &', () => {
  const { SisUtils } = carregarUtils().window;

  assert.equal(SisUtils.escapeAttr('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
});

test('escapeAttr: valor nulo vira string vazia', () => {
  const { SisUtils } = carregarUtils().window;

  assert.equal(SisUtils.escapeAttr(null), '');
  assert.equal(SisUtils.escapeAttr(undefined), '');
  assert.equal(SisUtils.escapeAttr(0), '0');
});

/* ==========================================================================
   urlSegura
   ========================================================================== */

test('urlSegura: bloqueia javascript: e variacoes', () => {
  const { SisUtils } = carregarUtils().window;

  assert.equal(SisUtils.urlSegura('javascript:alert(1)'), '');
  assert.equal(SisUtils.urlSegura('JavaScript:alert(1)'), '');
  assert.equal(SisUtils.urlSegura(' java\tscript:alert(1)'), '');
  assert.equal(SisUtils.urlSegura('vbscript:msgbox(1)'), '');
  assert.equal(SisUtils.urlSegura('data:text/html,<script>alert(1)</script>'), '');
});

test('urlSegura: mantem URL normal', () => {
  const { SisUtils } = carregarUtils().window;

  assert.equal(SisUtils.urlSegura('https://exemplo.gov.br/x'), 'https://exemplo.gov.br/x');
  assert.equal(SisUtils.urlSegura('http://exemplo.br'), 'http://exemplo.br');
  assert.equal(SisUtils.urlSegura('mailto:a@b.br'), 'mailto:a@b.br');
  assert.equal(SisUtils.urlSegura('/arquivos/x.pdf'), '/arquivos/x.pdf');
});

test('urlSegura: nulo vira string vazia', () => {
  const { SisUtils } = carregarUtils().window;

  assert.equal(SisUtils.urlSegura(null), '');
  assert.equal(SisUtils.urlSegura(undefined), '');
  assert.equal(SisUtils.urlSegura('   '), '');
});

/* ==========================================================================
   script.js usa a versao unica
   ========================================================================== */

test('script.js: escapeHtml delega para SisUtils e ganha aspas', () => {
  const h = carregarScripts(['js/core/utils.js', 'db.js', 'script.js'], { supabase: false });

  const escapeHtml = h.get('escapeHtml');
  assert.equal(escapeHtml('"x"'), '&quot;x&quot;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml('<b>a & b</b>'), '&lt;b&gt;a &amp; b&lt;/b&gt;');
});

test('script.js: escapeAttr delega para SisUtils', () => {
  const h = carregarScripts(['js/core/utils.js', 'db.js', 'script.js'], { supabase: false });

  const escapeAttr = h.get('escapeAttr');
  assert.equal(escapeAttr('" onerror="x'), '&quot; onerror=&quot;x');
});
