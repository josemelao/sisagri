/**
 * Bloco 9c (grupo 2) — delegacao unica de acoes nas tabelas/listas do admin.
 *
 * As tabelas deixam de emitir `onclick`/`oninput`/`onchange` e passam a
 * carregar `data-acao` + `data-*`. Estes testes travam o despachante: a acao
 * resolve a funcao certa com os tipos certos (id/delta numericos), acao
 * desconhecida nao explode e botao desabilitado nao dispara.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

function carregar() {
  return carregarScripts(['db.js', 'admin.js'], {
    supabase: false,
    elementos: {
      'login-email': criarElemento('input'),
      'login-senha': criarElemento('input'),
      modal: criarElemento('div'),
    },
  });
}

function alvo(dataset) {
  const el = criarElemento('button');
  Object.assign(el.dataset, dataset);
  el.closest = (seletor) => (seletor === '[data-acao]' ? el : null);
  return el;
}

function despachar(h, el, tabela) {
  h.get('despacharAcaoAdmin')({ target: el, type: 'click' }, h.get(tabela));
}

/** O array nasce no contexto vm; copia para o reino do teste antes de comparar. */
function chamada(h) {
  return h.window.__chamada === undefined
    ? undefined
    : JSON.parse(JSON.stringify(h.window.__chamada));
}

test('admin delegacao: confirmar-delecao entrega colecao, id numerico e nome', () => {
  const h = carregar();
  h.run('confirmarDelecao = (colecao, id, nome) => { globalThis.__chamada = ["del", colecao, id, nome]; };');

  despachar(h, alvo({ acao: 'confirmar-delecao', colecao: 'manuais', id: '7', nome: 'Manual X' }), 'ACOES_ADMIN_CLIQUE');

  assert.deepEqual(chamada(h), ['del', 'manuais', 7, 'Manual X']);
});

test('admin delegacao: editar-* abre o formulario com id numerico', () => {
  const h = carregar();
  h.run('editarFuncionario = (id) => { globalThis.__chamada = ["editar", id]; };');

  despachar(h, alvo({ acao: 'editar-funcionario', id: '12' }), 'ACOES_ADMIN_CLIQUE');

  assert.deepEqual(chamada(h), ['editar', 12]);
});

test('admin delegacao: pagina-* chega como numero', () => {
  const h = carregar();
  h.run('mudarPaginaManuais = (delta) => { globalThis.__chamada = ["pagina", delta]; };');

  despachar(h, alvo({ acao: 'pagina-manuais', delta: '-1' }), 'ACOES_ADMIN_CLIQUE');

  assert.deepEqual(chamada(h), ['pagina', -1]);
});

test('admin delegacao: novo-* e busca-* resolvem a funcao certa', () => {
  const h = carregar();
  h.run(`
    novoProcesso = () => { globalThis.__chamada = ['novo']; };
    atualizarBuscaAvisos = (el) => { globalThis.__chamada = ['busca', el.value]; };
  `);

  despachar(h, alvo({ acao: 'novo-processo' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['novo']);

  const campo = alvo({ acao: 'buscar-avisos' });
  campo.value = 'chamado';
  despachar(h, campo, 'ACOES_ADMIN_INPUT');
  assert.deepEqual(chamada(h), ['busca', 'chamado']);
});

test('admin delegacao: lista info-simples usa a colecao do data-*', () => {
  const h = carregar();
  h.run(`
    mudarPaginaInfoSimples = (colecao, delta) => { globalThis.__chamada = ['pagina', colecao, delta]; };
    novoInfoSimples = (colecao) => { globalThis.__chamada = ['novo', colecao]; };
    editarInfoSimples = (colecao, id) => { globalThis.__chamada = ['editar', colecao, id]; };
  `);

  despachar(h, alvo({ acao: 'pagina-info-simples', colecao: 'infoJuridico', delta: '1' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['pagina', 'infoJuridico', 1]);

  despachar(h, alvo({ acao: 'novo-info-simples', colecao: 'infoMunicipio' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['novo', 'infoMunicipio']);

  despachar(h, alvo({ acao: 'editar-info-simples', colecao: 'infoMunicipio', id: '3' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['editar', 'infoMunicipio', 3]);
});

test('admin delegacao: toggle inline usa a colecao, o id e o checked', () => {
  const h = carregar();
  h.run('toggleInlinePublishStatus = (colecao, id, checked) => { globalThis.__chamada = [colecao, id, checked]; };');

  const caixa = alvo({ acao: 'toggle-publish-inline', colecao: 'funcionarios', id: '9' });
  caixa.checked = true;
  despachar(h, caixa, 'ACOES_ADMIN_CHANGE');

  assert.deepEqual(chamada(h), ['funcionarios', 9, true]);
});

test('admin delegacao: acao desconhecida ou botao desabilitado nao disparam nada', () => {
  const h = carregar();
  h.run('editarFuncionario = () => { globalThis.__chamada = ["nao deveria"]; };');

  const desabilitado = alvo({ acao: 'editar-funcionario', id: '1' });
  desabilitado.disabled = true;
  despachar(h, desabilitado, 'ACOES_ADMIN_CLIQUE');
  assert.equal(h.window.__chamada, undefined);

  despachar(h, alvo({ acao: 'acao-inexistente' }), 'ACOES_ADMIN_CLIQUE');
  assert.equal(h.window.__chamada, undefined);
});
