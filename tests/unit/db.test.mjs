/**
 * Testes de characterization de `db.js`.
 *
 * Objetivo do Bloco 4: criar a rede, nao mudar comportamento. Cada teste aqui
 * descreve o que o codigo FAZ HOJE. Onde isso diverge do que o plano v2
 * esperava, o teste esta marcado com "DIVERGENCIA CONHECIDA" e o achado foi
 * registrado em docs/qualidade/linha-de-base-lint.md, para decisao posterior.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts } from '../helpers/load-script.mjs';

/** Carrega db.js no modo local (sem cliente Supabase). */
function carregarDb(opcoes = {}) {
  return carregarScripts(['db.js'], { supabase: false, ...opcoes });
}

/* ==========================================================================
   _normalizePublishStatus
   ========================================================================== */

test('_normalizePublishStatus: "draft" continua "draft"', () => {
  const h = carregarDb();
  assert.equal(h.get('_normalizePublishStatus')('draft'), 'draft');
});

test('_normalizePublishStatus: "published" continua "published"', () => {
  const h = carregarDb();
  assert.equal(h.get('_normalizePublishStatus')('published'), 'published');
});

test('DIVERGENCIA CONHECIDA: status ausente vira "published", nao "draft"', () => {
  // O plano v2 (T4.3) esperava "default = rascunho". O codigo faz o oposto:
  // qualquer valor diferente de 'draft' vira 'published'. Isso e fail-open:
  // um registro sem publish_status aparece no site publico.
  // NAO corrigido neste bloco (T4 proibe mexer no app). Decisao pendente.
  const h = carregarDb();
  assert.equal(h.get('_normalizePublishStatus')(undefined), 'published');
  assert.equal(h.get('_normalizePublishStatus')(null), 'published');
  assert.equal(h.get('_normalizePublishStatus')(''), 'published');
  assert.equal(h.get('_normalizePublishStatus')('lixo'), 'published');
});

/* ==========================================================================
   _normalizeSupabaseRow
   ========================================================================== */

test('_normalizeSupabaseRow: funcionarios espelha "lotacao" em "setor"', () => {
  const h = carregarDb();
  const row = h.get('_normalizeSupabaseRow')('funcionarios', { id: 1, lotacao: 'SEMAG' });
  assert.equal(row.setor, 'SEMAG');
  assert.equal(row.lotacao, 'SEMAG');
});

test('_normalizeSupabaseRow: funcionarios espelha "setor" em "lotacao"', () => {
  const h = carregarDb();
  const row = h.get('_normalizeSupabaseRow')('funcionarios', { id: 2, setor: 'SEMADER' });
  assert.equal(row.lotacao, 'SEMADER');
  assert.equal(row.setor, 'SEMADER');
});

test('_normalizeSupabaseRow: com os dois preenchidos, cada um mantem o seu', () => {
  const h = carregarDb();
  const row = h.get('_normalizeSupabaseRow')('funcionarios', { setor: 'A', lotacao: 'B' });
  assert.equal(row.setor, 'A');
  assert.equal(row.lotacao, 'B');
});

test('_normalizeSupabaseRow: linha nula nao explode', () => {
  const h = carregarDb();
  assert.equal(h.get('_normalizeSupabaseRow')('funcionarios', null), null);
});

/* ==========================================================================
   DB.get
   ========================================================================== */

test('DB.get: colecao inexistente devolve array vazio', () => {
  const h = carregarDb();
  // .length em vez de deepEqual: o array vem do realm do vm, entao o protótipo
  // e diferente e deepStrictEqual acusaria falso negativo.
  assert.equal(h.get('DB').get('nao_existe').length, 0);
});

test('DB.get: devolve copia profunda (mutar o resultado nao altera a base)', async () => {
  const h = carregarDb({
    dadosIniciais: { avisos: [{ id: 1, titulo: 'Original', publish_status: 'published' }] },
  });
  await h.get('_initLocal')();

  const primeira = h.get('DB').get('avisos');
  assert.equal(primeira[0].titulo, 'Original');

  primeira[0].titulo = 'MUTADO';

  const segunda = h.get('DB').get('avisos');
  assert.equal(segunda[0].titulo, 'Original');
});

test('DB.get: normaliza "draft" ao ler, sem perder o valor', async () => {
  const h = carregarDb({
    dadosIniciais: { avisos: [{ id: 1, titulo: 'R', publish_status: 'draft' }] },
  });
  await h.get('_initLocal')();

  const lista = h.get('DB').get('avisos');
  assert.equal(lista.length, 1);
  assert.equal(lista[0].publish_status, 'draft');
});

/* ==========================================================================
   dbInit / modo local
   ========================================================================== */

test('_initLocal: carrega window.DADOS_INICIAIS quando o localStorage esta vazio', async () => {
  const h = carregarDb({
    dadosIniciais: { servicos: [{ id: 7, nome: 'X', publish_status: 'published' }] },
  });
  await h.get('_initLocal')();

  const servicos = h.get('DB').get('servicos');
  assert.equal(servicos.length, 1);
  assert.equal(servicos[0].id, 7);
});

test('_initLocal: localStorage tem prioridade sobre dados.js', async () => {
  const h = carregarDb({
    dadosIniciais: { servicos: [{ id: 1, nome: 'dos dados', publish_status: 'published' }] },
    localStorage: { smader_db_v1: JSON.stringify({ servicos: [{ id: 2, nome: 'do storage', publish_status: 'published' }] }) },
  });
  await h.get('_initLocal')();

  const servicos = h.get('DB').get('servicos');
  assert.equal(servicos[0].nome, 'do storage');
});

test('_initLocal: migra a chave legada seagri_db_v1', async () => {
  const h = carregarDb({
    localStorage: { seagri_db_v1: JSON.stringify({ servicos: [{ id: 3, nome: 'legado', publish_status: 'published' }] }) },
  });
  await h.get('_initLocal')();

  assert.equal(h.get('DB').get('servicos')[0].nome, 'legado');
  assert.ok(h.localStorage.getItem('smader_db_v1'), 'deveria gravar na chave nova');
  assert.equal(h.localStorage.getItem('seagri_db_v1'), null, 'deveria remover a chave antiga');
});
