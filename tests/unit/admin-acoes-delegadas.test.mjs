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
  return carregarScripts(['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'], {
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

/* ==========================================================================
   Acoes que estavam no admin.html (grupo 4)
   ========================================================================== */

test('admin delegacao: login e logout usam as funcoes globais', () => {
  const h = carregar();
  h.run(`
    fazerLogin = () => { globalThis.__chamada = ['login']; };
    fazerLogout = () => { globalThis.__chamada = ['logout']; };
  `);

  despachar(h, alvo({ acao: 'fazer-login' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['login']);

  despachar(h, alvo({ acao: 'fazer-logout' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['logout']);
});

test('admin delegacao: exportar dados chama DB.exportarDadosJS', () => {
  const h = carregar();
  h.run('DB.exportarDadosJS = () => { globalThis.__chamada = ["exportar"]; };');

  despachar(h, alvo({ acao: 'exportar-dados' }), 'ACOES_ADMIN_CLIQUE');

  assert.deepEqual(chamada(h), ['exportar']);
});

test('admin delegacao: salvar configuracao do dashboard usa a funcao', () => {
  const h = carregar();
  h.run('salvarConfigDashboard = () => { globalThis.__chamada = ["config"]; };');

  despachar(h, alvo({ acao: 'salvar-config-dashboard' }), 'ACOES_ADMIN_CLIQUE');

  assert.deepEqual(chamada(h), ['config']);
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

/* ------------------------------------------------------------------ */
/* Grupo 3 — modais e formularios                                      */
/* ------------------------------------------------------------------ */

test('admin delegacao: salvar-modal resolve a funcao pela chave e passa o id', () => {
  const h = carregar();
  h.run(`
    SALVAR_MODAL.funcionario = (id) => { globalThis.__chamada = ['funcionario', id]; };
    SALVAR_MODAL.infoSimples = (colecao, id) => { globalThis.__chamada = ['info', colecao, id]; };
  `);

  despachar(h, alvo({ acao: 'salvar-modal', salvar: 'funcionario', id: '5' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['funcionario', 5]);

  despachar(h, alvo({ acao: 'salvar-modal', salvar: 'infoSimples', id: '2', colecao: 'infoJuridico' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['info', 'infoJuridico', 2]);

  despachar(h, alvo({ acao: 'salvar-modal', salvar: 'inexistente', id: '2' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['info', 'infoJuridico', 2], 'chave desconhecida nao muda nada');
});

test('admin delegacao: salvar-modal de registro novo manda id 0', () => {
  const h = carregar();
  h.run('SALVAR_MODAL.manual = (id) => { globalThis.__chamada = ["manual", id]; };');

  despachar(h, alvo({ acao: 'salvar-modal', salvar: 'manual' }), 'ACOES_ADMIN_CLIQUE');

  assert.deepEqual(chamada(h), ['manual', 0]);
});

test('admin delegacao: executar-delecao entrega colecao e id numerico', () => {
  const h = carregar();
  h.run('executarDelecao = (colecao, id) => { globalThis.__chamada = [colecao, id]; };');

  despachar(h, alvo({ acao: 'executar-delecao', colecao: 'veiculos', id: '11' }), 'ACOES_ADMIN_CLIQUE');

  assert.deepEqual(chamada(h), ['veiculos', 11]);
});

test('admin delegacao: add-dyn-item entrega campo, placeholder e booleano', () => {
  const h = carregar();
  h.run('addDynItem = (field, ph, txt) => { globalThis.__chamada = [field, ph, txt]; };');

  despachar(h, alvo({ acao: 'add-dyn-item', field: 'passos', placeholder: 'Item...', textarea: 'true' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['passos', 'Item...', true]);

  despachar(h, alvo({ acao: 'add-dyn-item', field: 'tags', placeholder: '', textarea: 'false' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['tags', '', false]);
});

test('admin delegacao: limpar-multi-select usa o alvo ou o elemento anterior', () => {
  const h = carregar();
  h.run(`
    clearAdminMultiSelect = (alvo) => { globalThis.__chamada = [alvo === null ? 'nulo' : 'elemento']; };
    globalThis.__select = { id: 's-manuais' };
    globalThis.__pedido = null;
    document.getElementById = (id) => { globalThis.__pedido = id; return globalThis.__select; };
  `);

  despachar(h, alvo({ acao: 'limpar-multi-select', alvo: 's-manuais' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['elemento']);
  assert.equal(h.run('globalThis.__pedido'), 's-manuais');

  const previo = { anterior: true };
  const botao = alvo({ acao: 'limpar-multi-select' });
  botao.previousElementSibling = previo;
  despachar(h, botao, 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['elemento']);
});

test('admin delegacao: abrir-input-arquivo clica no input indicado', () => {
  const h = carregar();
  h.run(`
    globalThis.__cliques = 0;
    globalThis.__pedido = null;
    document.getElementById = (id) => {
      globalThis.__pedido = id;
      return { click: () => { globalThis.__cliques += 1; } };
    };
  `);

  despachar(h, alvo({ acao: 'abrir-input-arquivo', input: 'f-foto-file' }), 'ACOES_ADMIN_CLIQUE');

  assert.equal(h.run('globalThis.__cliques'), 1);
  assert.equal(h.run('globalThis.__pedido'), 'f-foto-file');
});

test('admin delegacao: previews e toggles de formulario chegam pelo change', () => {
  const h = carregar();
  h.run(`
    toggleDocTipo = (el) => { globalThis.__chamada = ['doc', el.value]; };
    toggleDynValorInput = (el) => { globalThis.__chamada = ['dyn', !!el.checked]; };
    previewFoto = (el) => { globalThis.__chamada = ['foto', el.id]; };
    processarArquivoUpload = (el) => { globalThis.__chamada = ['upload', el.id]; };
    handlePublishStatusToggle = (el) => { globalThis.__chamada = ['publish', !!el.checked]; };
  `);

  const select = alvo({ acao: 'toggle-doc-tipo' });
  select.value = 'arquivo';
  despachar(h, select, 'ACOES_ADMIN_CHANGE');
  assert.deepEqual(chamada(h), ['doc', 'arquivo']);

  const check = alvo({ acao: 'toggle-dyn-valor' });
  check.checked = true;
  despachar(h, check, 'ACOES_ADMIN_CHANGE');
  assert.deepEqual(chamada(h), ['dyn', true]);

  const foto = alvo({ acao: 'preview-foto' });
  foto.id = 'f-1';
  despachar(h, foto, 'ACOES_ADMIN_CHANGE');
  assert.deepEqual(chamada(h), ['foto', 'f-1']);

  const up = alvo({ acao: 'processar-arquivo-upload' });
  up.id = 'a-file-input';
  despachar(h, up, 'ACOES_ADMIN_CHANGE');
  assert.deepEqual(chamada(h), ['upload', 'a-file-input']);

  const pub = alvo({ acao: 'toggle-publish-modal' });
  pub.checked = true;
  despachar(h, pub, 'ACOES_ADMIN_CHANGE');
  assert.deepEqual(chamada(h), ['publish', true]);
});

test('admin delegacao: selecionar-icone/cor usam o field e o valor', () => {
  const h = carregar();
  h.run(`
    selecionarIcone = (field, valor) => { globalThis.__chamada = ['icone', field, valor]; };
    selecionarCor = (field, valor) => { globalThis.__chamada = ['cor', field, valor]; };
  `);

  despachar(h, alvo({ acao: 'selecionar-icone', field: 'manual', valor: 'ph-leaf' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['icone', 'manual', 'ph-leaf']);

  despachar(h, alvo({ acao: 'selecionar-cor', field: 'manual', valor: '#2d6a4f' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['cor', 'manual', '#2d6a4f']);
});

test('admin delegacao: botoes de dyn e acoes simples nao dependem de argumentos', () => {
  const h = carregar();
  h.run(`
    fecharModal = () => { globalThis.__chamada = ['fechar']; };
    addManualPasso = () => { globalThis.__chamada = ['passo']; };
    addDocumento = () => { globalThis.__chamada = ['doc']; };
    addEtapa = () => { globalThis.__chamada = ['etapa']; };
    addServicoDocumento = () => { globalThis.__chamada = ['sdoc']; };
    addCampo = () => { globalThis.__chamada = ['campo']; };
    addOrgCampo = () => { globalThis.__chamada = ['orgcampo']; };
    removerFoto = () => { globalThis.__chamada = ['remover-foto']; };
    removerArquivoUpload = () => { globalThis.__chamada = ['remover-arquivo']; };
    removeDynItem = (el) => { globalThis.__chamada = ['dyn-remove', el.dataset.acao]; };
  `);

  const casos = [
    ['fechar-modal', 'fechar'],
    ['add-manual-passo', 'passo'],
    ['add-documento', 'doc'],
    ['add-etapa', 'etapa'],
    ['add-servico-documento', 'sdoc'],
    ['add-campo', 'campo'],
    ['add-org-campo', 'orgcampo'],
    ['remover-foto', 'remover-foto'],
    ['remover-arquivo-upload', 'remover-arquivo'],
  ];
  for (const [acao, esperado] of casos) {
    despachar(h, alvo({ acao }), 'ACOES_ADMIN_CLIQUE');
    assert.deepEqual(chamada(h), [esperado], acao);
  }

  despachar(h, alvo({ acao: 'remover-dyn-item' }), 'ACOES_ADMIN_CLIQUE');
  assert.deepEqual(chamada(h), ['dyn-remove', 'remover-dyn-item']);
});

test('admin delegacao: renderPublishStatusActions emite data-acao, nao handler', () => {
  const h = carregar();
  const render = h.get('renderPublishStatusActions');

  const html = render('funcionario', { id: 5 });
  assert.ok(html.includes('data-acao="salvar-modal"'));
  assert.ok(html.includes('data-salvar="funcionario"'));
  assert.ok(html.includes('data-id="5"'));
  assert.ok(html.includes('data-acao="fechar-modal"'));
  assert.ok(html.includes('data-acao="toggle-publish-modal"'));
  assert.ok(!/on(click|change)=/.test(html), 'nao deve emitir handler inline');

  const novo = render('manual', {});
  assert.ok(novo.includes('data-id="0"'), 'registro novo usa id 0');

  const info = render('infoSimples', { id: 3 }, { colecao: 'infoJuridico' });
  assert.ok(info.includes('data-colecao="infoJuridico"'));
});
