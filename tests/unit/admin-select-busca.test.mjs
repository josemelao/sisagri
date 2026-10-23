/**
 * Bloco 12 - T12.4 (UI de vinculos): picker no padrao de "Documentos
 * necessarios" do modal de Manual.
 *
 * O que fica fixado aqui:
 *   - clicar numa opcao marca/desmarca o vinculo e atualiza os chips;
 *   - o "x" do chip remove o vinculo e devolve o foco para a busca;
 *   - o <select multiple> oculto continua sendo a fonte da verdade
 *     (salvarSistema/salvarServico nao mudaram de contrato);
 *   - o filtro usa as mensagens configuradas no picker;
 *   - o campo "Documentos necessarios" de Servicos usa o mesmo markup do
 *     Manual (doc-item + seletor de arquivo) e o salvamento segue igual.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

/* ------------------------------------------------------------------ */
/* fakes                                                               */
/* ------------------------------------------------------------------ */

function criarOpcao(texto, { valor, selecionada = false } = {}) {
  const opcao = criarElemento('option');
  opcao.textContent = texto;
  opcao.value = valor ?? texto;
  opcao.selected = selecionada;
  return opcao;
}

function montarSelect(id, opcoes) {
  const select = criarElemento('select');
  select.id = id;
  select.options = opcoes;
  Object.defineProperty(select, 'selectedOptions', {
    get: () => opcoes.filter((opcao) => opcao.selected),
  });
  return select;
}

function criarBotao(dataset = {}) {
  const attrs = {};
  const botao = criarElemento('button');
  botao.dataset = { ...dataset };
  botao.setAttribute = (chave, valor) => { attrs[chave] = String(valor); };
  botao.getAttribute = (chave) => (chave in attrs ? attrs[chave] : null);
  return botao;
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
    renderServicos = () => {};
    renderOverview = () => {};
  `);
  return h;
}

/* ------------------------------------------------------------------ */
/* interacao do picker                                                 */
/* ------------------------------------------------------------------ */

test('alternarVinculo marca a opcao, atualiza o chip e o aria-selected', () => {
  const ferias = criarOpcao('Manual de Férias', { valor: '11' });
  const ponto = criarOpcao('Manual de Ponto', { valor: '12' });
  const select = montarSelect('s-manuais', [ferias, ponto]);

  const chips = criarElemento('div');
  const busca = criarElemento('input');
  const botaoFerias = criarBotao({ alvo: 's-manuais', id: '11' });
  const picker = criarElemento('div');
  picker.dataset.alvo = 's-manuais';
  picker.dataset.singular = 'manual';
  picker.querySelector = (seletor) => {
    if (seletor === '.vinculo-chips') return chips;
    if (seletor === '.doc-arquivo-busca') return busca;
    if (seletor === '.doc-arquivo-opcao[data-id="11"]') return botaoFerias;
    return null;
  };
  picker.querySelectorAll = () => [botaoFerias];

  const h = montarAmbiente({ 's-manuais': select });
  h.window.document.querySelector = (seletor) =>
    (String(seletor).includes('.vinculo-picker') ? picker : null);

  h.get('alternarVinculo')(botaoFerias);

  assert.equal(ferias.selected, true);
  assert.equal(botaoFerias.classList.contains('active'), true);
  assert.equal(botaoFerias.getAttribute('aria-selected'), 'true');
  assert.match(chips.innerHTML, /Manual de Férias/);
  assert.match(chips.innerHTML, /data-acao="remover-vinculo"/);
  assert.match(chips.innerHTML, /data-id="11"/);
  assert.doesNotMatch(chips.innerHTML, /Manual de Ponto/);
});

test('alternarVinculo desmarca e volta ao estado vazio', () => {
  const ferias = criarOpcao('Manual de Férias', { valor: '11', selecionada: true });
  const select = montarSelect('s-manuais', [ferias]);
  const chips = criarElemento('div');
  const botao = criarBotao({ alvo: 's-manuais', id: '11' });
  botao.classList.add('active');
  const picker = criarElemento('div');
  picker.dataset.alvo = 's-manuais';
  picker.dataset.singular = 'manual';
  picker.querySelector = (seletor) => (seletor === '.vinculo-chips' ? chips : null);
  picker.querySelectorAll = () => [botao];

  const h = montarAmbiente({ 's-manuais': select });
  h.window.document.querySelector = (seletor) =>
    (String(seletor).includes('.vinculo-picker') ? picker : null);

  h.get('alternarVinculo')(botao);

  assert.equal(ferias.selected, false);
  assert.equal(botao.classList.contains('active'), false);
  assert.equal(botao.getAttribute('aria-selected'), 'false');
  assert.match(chips.innerHTML, /Nenhum manual selecionado/);
});

test('removerVinculo desmarca pelo chip e devolve o foco para a busca', () => {
  const ferias = criarOpcao('Manual de Férias', { valor: '11', selecionada: true });
  const select = montarSelect('s-manuais', [ferias]);

  const chips = criarElemento('div');
  const busca = criarElemento('input');
  let focado = false;
  busca.focus = () => { focado = true; };

  const botaoOpcao = criarBotao({ alvo: 's-manuais', id: '11' });
  botaoOpcao.classList.add('active');

  const picker = criarElemento('div');
  picker.dataset.alvo = 's-manuais';
  picker.dataset.singular = 'manual';
  picker.querySelector = (seletor) => {
    if (seletor === '.vinculo-chips') return chips;
    if (seletor === '.doc-arquivo-busca') return busca;
    if (seletor === '.doc-arquivo-opcao[data-id="11"]') return botaoOpcao;
    return null;
  };
  picker.querySelectorAll = () => [botaoOpcao];

  const h = montarAmbiente({ 's-manuais': select });
  h.window.document.querySelector = (seletor) =>
    (String(seletor).includes('.vinculo-picker') ? picker : null);

  const botaoChip = criarBotao({ alvo: 's-manuais', id: '11' });
  h.get('removerVinculo')(botaoChip);

  assert.equal(ferias.selected, false);
  assert.equal(botaoOpcao.classList.contains('active'), false);
  assert.match(chips.innerHTML, /Nenhum manual selecionado/);
  assert.equal(focado, true, 'foco volta para a busca');
});

test('limpar-multi-select zera selecao, chips e destaque das opcoes', () => {
  const ferias = criarOpcao('Manual de Férias', { valor: '11', selecionada: true });
  const select = montarSelect('s-manuais', [ferias]);
  const chips = criarElemento('div');
  const botaoOpcao = criarBotao({ alvo: 's-manuais', id: '11' });
  botaoOpcao.classList.add('active');

  const picker = criarElemento('div');
  picker.dataset.alvo = 's-manuais';
  picker.dataset.singular = 'manual';
  picker.querySelector = (seletor) => (seletor === '.vinculo-chips' ? chips : null);
  picker.querySelectorAll = () => [botaoOpcao];

  const h = montarAmbiente({ 's-manuais': select });
  h.window.document.querySelector = (seletor) =>
    (String(seletor).includes('.vinculo-picker') ? picker : null);

  h.get('clearAdminMultiSelect')('s-manuais');

  assert.equal(ferias.selected, false);
  assert.equal(botaoOpcao.classList.contains('active'), false);
  assert.equal(botaoOpcao.getAttribute('aria-selected'), 'false');
  assert.match(chips.innerHTML, /Nenhum manual selecionado/);
});

test('filtrarArquivosDoc usa as mensagens configuradas no picker', () => {
  const opcao = criarElemento('button');
  opcao.dataset.nome = 'Manual de Férias';
  opcao.dataset.tipo = 'Férias';
  const lista = criarElemento('div');
  const vazio = criarElemento('p');

  const picker = criarElemento('div');
  picker.dataset.vazioBusca = 'Nenhum manual corresponde à busca.';
  picker.querySelectorAll = () => [opcao];
  picker.querySelector = (seletor) => {
    if (seletor === '.doc-arquivo-vazio') return vazio;
    if (seletor === '.doc-arquivo-lista') return lista;
    if (seletor === '.doc-arquivo-opcao') return opcao;
    return null;
  };

  const input = criarElemento('input');
  input.value = 'zzz';
  input.closest = () => picker;

  const h = montarAmbiente();
  h.get('filtrarArquivosDoc')(input);

  assert.equal(opcao.hidden, true);
  assert.equal(vazio.hidden, false);
  assert.equal(vazio.textContent, 'Nenhum manual corresponde à busca.');
});

/* ------------------------------------------------------------------ */
/* markup                                                              */
/* ------------------------------------------------------------------ */

test('formSistema usa o picker de vinculos com select oculto por tras', () => {
  const h = montarAmbiente();
  h.run(`DB.get = (colecao) => [{ id: 1, titulo: 'Manual ' + colecao, categoria: 'Férias' }];`);
  const html = h.get('formSistema')();

  assert.match(html, /class="vinculo-picker" data-alvo="s-manuais" data-singular="manual"/);
  assert.match(html, /class="vinculo-picker" data-alvo="s-processos" data-singular="processo"/);
  assert.match(html, /data-acao="alternar-vinculo"/);
  assert.match(html, /class="vinculo-chips"/);
  assert.match(html, /data-vazio-busca="Nenhum manual corresponde à busca\."/);
  assert.match(html, /<select id="s-manuais" multiple hidden/);
  assert.doesNotMatch(html, /select-busca/);
});

test('formServico usa o picker nos processos e o mesmo documento do Manual', () => {
  const h = montarAmbiente();
  h.run(`DB.get = (colecao) => (colecao === 'arquivos'
    ? [{ id: 5, nome: 'Contrato.pdf', tipo: 'PDF' }]
    : [{ id: 1, titulo: 'Item ' + colecao, categoria: 'Cat' }]);`);
  const html = h.get('formServico')();

  assert.match(html, /class="vinculo-picker" data-alvo="sv-processos"/);
  assert.match(html, /data-acao="alternar-vinculo"/);
  assert.match(html, /<select id="sv-processos" multiple hidden/);

  // Secao Documentos: markup do manual (doc-top, doc-tipo, seletor com busca).
  assert.match(html, /id="dyn-servico-documentos"/);
  assert.match(html, /class="doc-item"/);
  assert.match(html, /class="doc-tipo doc-tipo-select"/);
  assert.match(html, /class="doc-arquivo-picker"/);
  assert.doesNotMatch(html, /sv_doc_arquivo_/);
});

/* ------------------------------------------------------------------ */
/* salvamento (contrato preservado)                                    */
/* ------------------------------------------------------------------ */

test('salvarSistema mantem os ids selecionados no select oculto', async () => {
  const manual = criarOpcao('Manual A', { valor: '11', selecionada: true });
  const processo = criarOpcao('Processo B', { valor: '22', selecionada: true });

  const h = montarAmbiente({
    's-manuais': montarSelect('s-manuais', [manual]),
    's-processos': montarSelect('s-processos', [processo]),
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

test('salvarServico le os documentos no novo markup do Manual', async () => {
  const docArquivo = criarElemento('div');
  const tipoArquivo = criarElemento('select');
  tipoArquivo.value = 'arquivo';
  const nomeArquivo = criarElemento('input');
  const idArquivo = criarElemento('input');
  idArquivo.value = '5';
  docArquivo.querySelector = (seletor) => ({
    '.doc-tipo': tipoArquivo,
    '.doc-nome': nomeArquivo,
    '.doc-arquivo-id': idArquivo,
    '.doc-arquivo select': null,
  }[seletor] ?? null);

  const docTexto = criarElemento('div');
  const tipoTexto = criarElemento('select');
  tipoTexto.value = 'texto';
  const nomeTexto = criarElemento('input');
  nomeTexto.value = 'RG e CPF';
  docTexto.querySelector = (seletor) => ({
    '.doc-tipo': tipoTexto,
    '.doc-nome': nomeTexto,
    '.doc-arquivo-id': null,
    '.doc-arquivo select': null,
  }[seletor] ?? null);

  const docsList = criarElemento('div');
  docsList.children = [docArquivo, docTexto];

  const h = montarAmbiente({
    'dyn-servico-documentos': docsList,
    'sv-nome': criarElemento('input'),
    'sv-categoria': criarElemento('select'),
    'sv-categoria-outra': criarElemento('input'),
    'sv-descricao': criarElemento('input'),
    'sv-publico': criarElemento('input'),
    'sv-como': criarElemento('input'),
    'sv-processos': montarSelect('sv-processos', []),
    'sv-prazo': criarElemento('input'),
    'sv-obs': criarElemento('input'),
  });
  h.window.document.getElementById('sv-nome').value = 'Corte de árvore';
  h.window.document.getElementById('sv-categoria').value = 'Trator';

  h.run(`
    getIconeCorValues = () => ({ icone: 'ph-tractor', cor: 'verde' });
    getModalPublishStatus = () => 'draft';
    DB.get = (colecao) => (colecao === 'arquivos'
      ? [{ id: 5, nome: 'Contrato.pdf', tipo: 'PDF' }]
      : []);
    window.__salvo = null;
    DB.save = async (colecao, id, dados) => {
      __salvo = { colecao, id, dados };
      return { id: 1 };
    };
  `);

  await h.get('salvarServico')(0);

  const documentos = JSON.parse(JSON.stringify(h.window.__salvo.dados.documentos));
  assert.deepEqual(documentos, [
    { nome: 'Contrato.pdf', arquivo_id: 5 },
    'RG e CPF',
  ]);
  assert.deepEqual([...h.window.__salvo.dados.processos_ids], []);
});
