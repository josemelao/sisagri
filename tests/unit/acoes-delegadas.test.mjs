/**
 * Bloco 9c (T9.4) — delegacao unica de cliques no app publico.
 *
 * Os templates deixam de emitir `onclick="..."` e passam a emitir
 * `data-acao="..."` + `data-*`. Estes testes travam o despachante: acao
 * conhecida chama a funcao certa, acao desconhecida nao explode, botao
 * desabilitado nao dispara e o link de download previne a navegacao.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

function carregar() {
  return carregarScripts(['js/core/utils.js', 'db.js', 'script.js'], { supabase: false });
}

function alvo(dataset) {
  const el = criarElemento('button');
  Object.assign(el.dataset, dataset);
  el.closest = (seletor) => (seletor === '[data-acao]' ? el : null);
  return el;
}

function clicar(h, el) {
  let prevenido = false;
  h.get('despacharAcaoClique')({
    target: el,
    preventDefault: () => { prevenido = true; },
  });
  return prevenido;
}

/** O array nasce no contexto vm; copia para o reino do teste antes de comparar. */
function chamada(h) {
  return h.window.__chamada === undefined
    ? undefined
    : JSON.parse(JSON.stringify(h.window.__chamada));
}

test('delegacao: card de funcionario abre pelo id do data-*', () => {
  const h = carregar();
  h.run('openFuncionario = (id) => { globalThis.__chamada = ["openFuncionario", id]; };');

  clicar(h, alvo({ acao: 'abrir-funcionario', id: '7' }));

  assert.deepEqual(chamada(h), ['openFuncionario', '7']);
});

test('delegacao: passo do manual chega como numero', () => {
  const h = carregar();
  h.run('switchManualPasso = (id, passo) => { globalThis.__chamada = ["passo", id, passo]; };');

  clicar(h, alvo({ acao: 'manual-passo', id: '3', passo: '2' }));

  assert.deepEqual(chamada(h), ['passo', '3', 2]);
});

test('delegacao: painel neto escolhe a funcao de render correta', () => {
  const h = carregar();
  h.run(`
    manuais = [{ id: 5, titulo: 'Manual', passos: [], documentos: [] }];
    _renderManualEmPainel = (m, modo, passoAtivo, cfg) => {
      globalThis.__chamada = ['neto', m.id, modo, cfg.processoId, passoAtivo, cfg.painel];
    };
  `);

  clicar(h, alvo({
    acao: 'manual-painel-modo',
    painel: 'sistema-neto',
    id: '5',
    modo: 'completo',
    passo: '0',
    processoId: '9',
  }));

  assert.deepEqual(chamada(h), ['neto', 5, 'completo', '9', 0, 'sistema-neto']);
});

test('delegacao: link de download previne a navegacao', () => {
  const h = carregar();
  h.run('baixarArquivoStorage = (el) => { globalThis.__chamada = ["download"]; };');
  const el = alvo({ acao: 'baixar-arquivo-storage' });

  const prevenido = clicar(h, el);

  assert.equal(prevenido, true);
  assert.deepEqual(chamada(h), ['download']);
});

test('delegacao: botao desabilitado e acao desconhecida nao disparam nada', () => {
  const h = carregar();
  h.run('openFuncionario = () => { globalThis.__chamada = ["nao deveria"]; };');

  const desabilitado = alvo({ acao: 'abrir-funcionario', id: '1' });
  desabilitado.disabled = true;
  clicar(h, desabilitado);
  assert.equal(h.window.__chamada, undefined);

  clicar(h, alvo({ acao: 'acao-inexistente' }));
  assert.equal(h.window.__chamada, undefined);
});
