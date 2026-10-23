/**
 * Bloco 12 - T12.4: seletor pesquisavel pai -> filho.
 *
 * Fixa o comportamento do filtro dos <select multiple> de vinculo
 * (sistema -> manuais/processos e servico -> processos):
 *   - esconde as opcoes que nao casam com o termo (sem acento/caixa);
 *   - opcao ja selecionada continua visivel e selecionada;
 *   - busca vazia restaura a lista inteira;
 *   - sem resultado, aparece o aviso aria-live.
 *
 * E garante que filtrar nao perde vinculo no salvamento.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

function criarOpcao(texto, { valor, selecionada = false } = {}) {
  const opcao = criarElemento('option');
  opcao.textContent = texto;
  opcao.value = valor ?? texto;
  opcao.selected = selecionada;
  return opcao;
}

function montarSelect(opcoes) {
  const select = criarElemento('select');
  select.multiple = true;
  select.options = opcoes;
  Object.defineProperty(select, 'selectedOptions', {
    get: () => opcoes.filter((opcao) => opcao.selected),
  });
  return select;
}

function montarBusca(valor, alvo = 's-manuais') {
  const grupo = criarElemento('div');
  const vazio = criarElemento('p');
  vazio.dataset.vazio = 'Nenhum resultado corresponde à busca.';
  grupo.querySelector = (seletor) => (seletor === '.select-busca-vazio' ? vazio : null);

  const input = criarElemento('input');
  input.dataset.alvo = alvo;
  input.value = valor;
  input.parentElement = grupo;
  return { input, vazio };
}

function montarAmbiente(elementos = {}) {
  const h = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'],
    {
      supabase: false,
      elementos: {
        'login-email': criarElemento('input'),
        'login-senha': criarElemento('input'),
        modal: criarElemento('div'),
        'modal-box': criarElemento('div'),
        'modal-content': criarElemento('div'),
        'unsaved-bar': criarElemento('div'),
        ...elementos,
      },
    },
  );
  h.run(`
    toast = () => {};
    fecharModal = () => {};
    renderSistemas = () => {};
    renderOverview = () => {};
  `);
  return h;
}

/* ------------------------------------------------------------------ */
/* Filtro                                                              */
/* ------------------------------------------------------------------ */

test('filtrarOpcoesSelect esconde o que nao casa e preserva a selecao', () => {
  const ferias = criarOpcao('Manual de Férias', { valor: '1' });
  const ponto = criarOpcao('Manual de Ponto', { valor: '2' });
  const rh = criarOpcao('Guia de RH', { valor: '3', selecionada: true });
  const select = montarSelect([ferias, ponto, rh]);
  const h = montarAmbiente({ 's-manuais': select });
  const { input, vazio } = montarBusca('ponto');

  h.get('filtrarOpcoesSelect')(input);

  assert.equal(ponto.hidden, false);
  assert.equal(ferias.hidden, true);
  assert.equal(rh.hidden, false, 'opcao selecionada continua visivel');
  assert.equal(rh.selected, true, 'filtro nao altera a selecao');
  assert.equal(vazio.textContent, '');
});

test('filtrarOpcoesSelect ignora acento e caixa', () => {
  const ferias = criarOpcao('Manual de Férias', { valor: '1' });
  const ponto = criarOpcao('Manual de Ponto', { valor: '2' });
  const select = montarSelect([ferias, ponto]);
  const h = montarAmbiente({ 's-manuais': select });
  const { input } = montarBusca('FERIAS');

  h.get('filtrarOpcoesSelect')(input);

  assert.equal(ferias.hidden, false);
  assert.equal(ponto.hidden, true);
});

test('filtrarOpcoesSelect: busca vazia restaura tudo', () => {
  const ferias = criarOpcao('Manual de Férias', { valor: '1' });
  const ponto = criarOpcao('Manual de Ponto', { valor: '2' });
  const select = montarSelect([ferias, ponto]);
  const h = montarAmbiente({ 's-manuais': select });
  const { input, vazio } = montarBusca('ponto');
  const filtrar = h.get('filtrarOpcoesSelect');

  filtrar(input);
  assert.equal(ferias.hidden, true);

  input.value = '';
  filtrar(input);

  assert.equal(ferias.hidden, false);
  assert.equal(ponto.hidden, false);
  assert.equal(vazio.textContent, '');
});

test('filtrarOpcoesSelect mostra aviso quando nada corresponde', () => {
  const ferias = criarOpcao('Manual de Férias', { valor: '1' });
  const select = montarSelect([ferias]);
  const h = montarAmbiente({ 's-manuais': select });
  const { input, vazio } = montarBusca('inexistente');

  h.get('filtrarOpcoesSelect')(input);

  assert.equal(ferias.hidden, true);
  assert.equal(vazio.textContent, 'Nenhum resultado corresponde à busca.');
});

/* ------------------------------------------------------------------ */
/* Markup e salvamento                                                 */
/* ------------------------------------------------------------------ */

test('formSistema e formServico expoem o filtro de vinculos', () => {
  const h = montarAmbiente();

  const sistema = h.get('formSistema')();
  assert.match(sistema, /class="select-busca" data-alvo="s-manuais"/);
  assert.match(sistema, /class="select-busca" data-alvo="s-processos"/);
  assert.match(sistema, /class="form-hint select-busca-vazio"/);

  const servico = h.get('formServico')();
  assert.match(servico, /class="select-busca" data-alvo="sv-processos"/);
});

test('salvarSistema mantem vinculo selecionado mesmo escondido pelo filtro', async () => {
  const manual = criarOpcao('Manual A', { valor: '11', selecionada: true });
  manual.hidden = true;
  const processo = criarOpcao('Processo B', { valor: '22', selecionada: true });
  processo.hidden = true;

  const h = montarAmbiente({
    's-manuais': montarSelect([manual]),
    's-processos': montarSelect([processo]),
    's-nome': criarElemento('input'),
    's-orgao': criarElemento('input'),
    's-nome-completo': criarElemento('input'),
    's-url': criarElemento('input'),
    's-descricao': criarElemento('input'),
    's-acesso': criarElemento('input'),
  });
  h.window.document.getElementById('s-nome').value = 'SIGA';

  h.run(`
    getIconeCorValues = () => ({ icone: 'ph-app-window', cor: 'azul' });
    getModalPublishStatus = () => 'draft';
    window.__salvo = null;
    DB.save = async (colecao, id, dados) => {
      __salvo = { colecao, id, dados };
      return { id: 1 };
    };
  `);

  await h.get('salvarSistema')(0);

  assert.equal(h.window.__salvo.colecao, 'sistemas');
  assert.deepEqual([...h.window.__salvo.dados.manuais_ids], [11]);
  assert.deepEqual([...h.window.__salvo.dados.processos_ids], [22]);
});
