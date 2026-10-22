/**
 * Bloco 12 - T12.2: feedback minimo de upload (Arquivos e Funcionarios).
 *
 * O que fica fixado aqui:
 *   - o botao Salvar entra em "Enviando arquivo..." e depois "Salvando...";
 *   - falha de upload mostra o erro no rodape (#save-error), restaura o botao
 *     e NAO tenta salvar o registro;
 *   - em Funcionarios, o nome e validado ANTES do upload (nao sobe foto e
 *     depois reclama do nome).
 *
 * Nao toca em rede nem em DOM real: o helper monta fakes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

/**
 * Campo falso no formato `.form-group > input`.
 */
function montarCampo(valorInicial = '') {
  const field = criarElemento('div');
  const input = criarElemento('input');
  input.value = valorInicial;
  input.closest = (seletor) => (String(seletor).includes('.form-group') ? field : null);
  field.querySelector = (seletor) =>
    seletor === '.field-error-msg'
      ? field.children.find((filho) => filho.className === 'field-error-msg') || null
      : null;
  return { field, input };
}

function montarAmbiente(camposExtras = {}) {
  const botao = criarElemento('button');
  botao.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Salvar';

  const caixaErro = criarElemento('div');
  caixaErro.classList.add('save-error');

  const elementos = {
    'login-email': criarElemento('input'),
    'login-senha': criarElemento('input'),
    modal: criarElemento('div'),
    'modal-box': criarElemento('div'),
    'modal-content': criarElemento('div'),
    'unsaved-bar': criarElemento('div'),
    'save-error': caixaErro,
    ...camposExtras,
  };

  const h = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'],
    { supabase: false, elementos },
  );

  // iniciarSalvamentoV2 procura o botao por document.querySelector.
  h.window.document.querySelector = (seletor) =>
    (String(seletor).includes('salvar-modal') ? botao : null);

  h.run(`
    getTagsValues = () => [];
    getModalPublishStatus = () => 'draft';
    fecharModal = () => {};
    renderArquivos = () => {};
    renderFuncionarios = () => {};
    renderOverview = () => {};
    toast = () => {};
    DB.resolveStorageUrls = async () => {};
  `);

  return { h, botao, caixaErro };
}

/* ------------------------------------------------------------------ */
/* Arquivos                                                            */
/* ------------------------------------------------------------------ */

function camposArquivo() {
  return {
    'a-nome': criarElemento('input'),
    'a-remover-arquivo': criarElemento('input'),
    'a-url': criarElemento('input'),
    'a-tipo': criarElemento('input'),
  };
}

test('salvarArquivo: botao mostra "Enviando arquivo..." e depois "Salvando..."', async () => {
  const campos = camposArquivo();
  campos['a-nome'].value = 'Ofício modelo';
  const { h, botao } = montarAmbiente(campos);

  h.run(`
    window.__log = [];
    arquivoUploadPendente = { name: 'oficio.pdf' };
    DB.uploadArquivoStorage = async () => {
      __log.push(__botao.innerHTML);
      return { url: 'https://fake/x.pdf', arquivo_nome: 'oficio.pdf', storage_path: 'p/x.pdf', storage_bucket: 'arquivos-smader' };
    };
    DB.save = async () => { __log.push(__botao.innerHTML); return { id: 7 }; };
  `);
  h.window.__botao = botao;

  await h.get('salvarArquivo')(0);

  const log = h.window.__log;
  assert.equal(log.length, 2, 'upload e save chamados uma vez cada');
  assert.match(log[0], /Enviando arquivo/);
  assert.doesNotMatch(log[0], /Salvando/);
  assert.match(log[1], /Salvando/);
});

test('salvarArquivo: falha no upload restaura o botao, avisa no rodape e nao salva', async () => {
  const campos = camposArquivo();
  campos['a-nome'].value = 'Ofício modelo';
  const { h, botao, caixaErro } = montarAmbiente(campos);

  h.run(`
    window.__salvou = false;
    arquivoUploadPendente = { name: 'oficio.pdf' };
    DB.uploadArquivoStorage = async () => { throw new Error('sem rede'); };
    DB.save = async () => { __salvou = true; return { id: 7 }; };
  `);

  await h.get('salvarArquivo')(0);

  assert.equal(h.window.__salvou, false, 'nao tenta salvar o registro');
  assert.match(caixaErro.textContent, /Falha no upload: sem rede/);
  assert.equal(caixaErro.classList.contains('visible'), true);
  assert.equal(botao.disabled, false, 'botao volta a ficar clicavel');
  assert.equal(botao.classList.contains('is-loading'), false);
  assert.match(botao.innerHTML, /Salvar/);
  assert.ok(h.get('arquivoUploadPendente'), 'arquivo pendente permanece para nova tentativa');
});

/* ------------------------------------------------------------------ */
/* Funcionarios                                                        */
/* ------------------------------------------------------------------ */

test('salvarFuncionario: nome vazio nao dispara upload da foto', async () => {
  const nome = montarCampo('');
  const { h } = montarAmbiente({
    'f-nome': nome.input,
    'f-remover-foto': criarElemento('input'),
  });

  h.run(`
    window.__subiu = false;
    funcionarioFotoUploadPendente = { name: 'foto.jpg' };
    DB.uploadFuncionarioFotoStorage = async () => { __subiu = true; return {}; };
  `);

  await h.get('salvarFuncionario')(0);

  assert.equal(h.window.__subiu, false, 'validacao acontece antes do upload');
  assert.equal(nome.field.classList.contains('field-error'), true);
  assert.ok(h.get('funcionarioFotoUploadPendente'), 'foto pendente continua guardada');
});

test('salvarFuncionario: botao passa por "Enviando foto..." e "Salvando..."', async () => {
  const nome = montarCampo('Maria');
  const { h, botao } = montarAmbiente({
    'f-nome': nome.input,
    'f-remover-foto': criarElemento('input'),
    'f-matricula': criarElemento('input'),
    'f-cargo': criarElemento('input'),
    'f-lotacao': criarElemento('input'),
    'f-vinculo': criarElemento('input'),
    'f-orgao': criarElemento('input'),
    'f-data-admissao': criarElemento('input'),
    'f-telefone': criarElemento('input'),
    'f-email': criarElemento('input'),
    'f-cpf': criarElemento('input'),
    'f-departamento': criarElemento('input'),
    'f-descricao': criarElemento('input'),
  });

  h.run(`
    window.__log = [];
    funcionarioFotoUploadPendente = { name: 'foto.jpg' };
    DB.uploadFuncionarioFotoStorage = async () => {
      __log.push(__botao.innerHTML);
      return { url: 'https://fake/foto.jpg', storage_path: 'f/foto.jpg', storage_bucket: 'funcionarios-fotos-smader' };
    };
    DB.save = async () => { __log.push(__botao.innerHTML); return { id: 3 }; };
  `);
  h.window.__botao = botao;

  await h.get('salvarFuncionario')(0);

  const log = h.window.__log;
  assert.equal(log.length, 2);
  assert.match(log[0], /Enviando foto/);
  assert.match(log[1], /Salvando/);
});
