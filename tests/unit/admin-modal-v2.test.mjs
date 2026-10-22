/**
 * Bloco 12 (T12.0.2 -> Onda 1) - modal v2 de Manuais e Processos.
 *
 * Testes de caracterizacao do HTML gerado: secoes, acordeao, chips de
 * documento, seletor de arquivo com busca e barra de alteracoes. Nao tocam
 * em DOM real (o helper monta fakes) nem em rede.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

const ARQUIVOS = [
  { id: 7, nome: 'Planilha de safra', tipo: 'XLSX', publish_status: 'draft' },
  { id: 8, nome: 'Contrato <b>de locação</b>', tipo: 'PDF', publish_status: 'published' },
];

async function carregar() {
  const h = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'],
    {
      supabase: false,
      elementos: {
        'login-email': criarElemento('input'),
        'login-senha': criarElemento('input'),
        modal: criarElemento('div'),
      },
    },
  );
  await h.get('dbInit')();
  h.run(`DB.get = (colecao) => (colecao === 'arquivos' ? window.__arquivosTeste : []);
         window.__arquivosTeste = window.__arquivosTeste || [];`);
  h.run(`window.__arquivosTeste = ${JSON.stringify(ARQUIVOS)};`);
  return h;
}

/* ------------------------------------------------------------------ */
/* Manuais                                                             */
/* ------------------------------------------------------------------ */

test('formManual: secoes, titulo, categoria com sugestoes e acordeao de passos', async () => {
  const h = await carregar();
  const html = h.get('formManual')({
    titulo: 'Manual de campo',
    categoria: 'Administrativo',
    passos: [{ texto: 'Primeiro passo' }],
    documentos: ['RG'],
    observacoes: 'obs',
  });

  assert.match(html, /class="modal-v2"/);
  assert.match(html, /id="modal-title" tabindex="-1"/);
  assert.match(html, /Identificação/);
  assert.match(html, /list="m-categorias"/);
  assert.match(html, /class="step-list" id="dyn-passos" data-acordeao="passo"/);
  assert.match(html, /data-acao="add-manual-passo"/);
  assert.match(html, /data-acao="add-documento"/);
  assert.match(html, /class="unsaved-bar" id="unsaved-bar"/);
  assert.match(html, /data-acao="salvar-modal" data-salvar="manual"/);
  assert.match(html, /1 passo · arraste para reordenar/);
});

test('formManual: item publicado oferece "Salvar como rascunho (sai do ar)"', async () => {
  const h = await carregar();
  const novo = h.get('formManual')({});
  const publicado = h.get('formManual')({ id: 3, publish_status: 'published', titulo: 'X' });
  const rascunho = h.get('formManual')({ id: 4, publish_status: 'draft', titulo: 'Y' });

  assert.doesNotMatch(novo, /sai do ar/);
  assert.doesNotMatch(rascunho, /sai do ar/);
  assert.match(publicado, /Salvar como rascunho \(sai do ar\)/);
});

test('manualDocHTML: texto usa campo de nome; arquivo usa chip e id oculto', async () => {
  const h = await carregar();
  const texto = h.get('manualDocHTML')('RG e CPF');
  const arquivo = h.get('manualDocHTML')({ nome: 'Planilha de safra (Rascunho)', arquivo_id: 7 });

  assert.match(texto, /class="doc-nome doc-nome-input" value="RG e CPF"/);
  assert.doesNotMatch(texto, /doc-chip/);
  assert.match(texto, /class="doc-arquivo-atual" hidden/);

  assert.match(arquivo, /class="doc-nome doc-nome-input" value="Planilha de safra \(Rascunho\)" .*hidden/);
  assert.match(arquivo, /class="doc-chip"/);
  assert.match(arquivo, /class="doc-arquivo-id" value="7"/);
  assert.match(arquivo, /data-acao="limpar-arquivo-doc"/);
});

test('docChipHTML: escapa nome e mostra estado vazio', async () => {
  const h = await carregar();
  const vazio = h.get('docChipHTML')('');
  const cheio = h.get('docChipHTML')('Contrato "A" <b>');

  assert.match(vazio, /Nenhum arquivo selecionado/);
  assert.doesNotMatch(vazio, /doc-chip"/);
  assert.match(cheio, /title="Contrato &quot;A&quot; &lt;b&gt;"/);
  assert.match(cheio, /Contrato &quot;A&quot; &lt;b&gt;/);
});

test('arquivoPickerHTML: busca, opcoes com tipo e vazio quando nao ha arquivos', async () => {
  const h = await carregar();
  const html = h.get('arquivoPickerHTML')(7);

  assert.match(html, /class="doc-arquivo-busca"/);
  assert.match(html, /data-acao="escolher-arquivo-doc"/);
  assert.match(html, /data-id="7"/);
  assert.match(html, /class="doc-arquivo-opcao active"[\s\S]*?Planilha de safra \(Rascunho\)/);
  assert.match(html, /<span class="badge">XLSX<\/span>/);
  assert.match(html, /class="doc-arquivo-id" value="7"/);
  // nome com HTML vira texto escapado, nao markup
  assert.match(html, /Contrato &lt;b&gt;de locação&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>de locação/);

  h.run('window.__arquivosTeste = [];');
  const semArquivos = h.get('arquivoPickerHTML')(null);
  assert.match(semArquivos, /Nenhum arquivo cadastrado\. Cadastre em Arquivos\./);
  assert.match(semArquivos, /class="doc-arquivo-lista" role="listbox" aria-label="Arquivos disponíveis" hidden/);
  assert.match(semArquivos, /class="doc-arquivo-id" value=""/);
});

/* ------------------------------------------------------------------ */
/* Processos                                                           */
/* ------------------------------------------------------------------ */

test('formProcesso: secoes, acordeao de etapas e barra de alteracoes', async () => {
  const h = await carregar();
  const html = h.get('formProcesso')({
    titulo: 'Licenciamento',
    etapas: [{ titulo: 'Entrada', descricao: 'd', manuais_ids: [1] }],
  });

  assert.match(html, /class="step-list" id="dyn-etapas" data-acordeao="etapa"/);
  assert.match(html, /id="etapas-hint"/);
  assert.match(html, /class="etapa-manuais-busca"/);
  assert.match(html, /data-acao="add-etapa"/);
  assert.match(html, /data-acao="salvar-modal" data-salvar="processo"/);
  assert.match(html, /id="unsaved-bar"/);
});

/* ------------------------------------------------------------------ */
/* Catalogo de icones                                                  */
/* ------------------------------------------------------------------ */

test('ICONES_DISPONIVEIS: nomes unicos e todos com classe Phosphor', async () => {
  const h = await carregar();
  const icones = h.get('ICONES_DISPONIVEIS');
  const nomes = icones.map((o) => o.icone);

  assert.ok(icones.length >= 60);
  assert.equal(new Set(nomes).size, nomes.length, 'icone duplicado no catalogo');
  nomes.forEach((nome) => assert.match(nome, /^ph-[a-z0-9-]+$/));
  icones.forEach((o) => assert.ok(o.label && o.label.trim(), `label vazio para ${o.icone}`));
});
