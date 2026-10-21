/**
 * Testes de characterization de `script.js`.
 *
 * `script.js` e grande e so registra listeners no load (o DOMContentLoaded nao
 * roda aqui). Entao o harness carrega `db.js` + `script.js` e testa as funcoes
 * puras que valem a pena travar.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

function carregarApp(opcoes = {}) {
  // utils primeiro (escapeHtml), depois db.js (script.js consome o global DB).
  return carregarScripts(['js/core/utils.js', 'db.js', 'script.js'], { supabase: false, ...opcoes });
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

test('escapeHtml: escapa aspas (corrigido no Bloco 9a)', () => {
  // Antes a versao de script.js deixava aspas passarem, o que permitia
  // quebrar atributo HTML. Agora usa a implementacao unica de SisUtils.
  const h = carregarApp();
  const escapeHtml = h.get('escapeHtml');
  assert.equal(escapeHtml('"duplas"'), '&quot;duplas&quot;');
  assert.equal(escapeHtml("'simples'"), '&#39;simples&#39;');
});

test('escapeHtml: valor nulo/vazio nao lanca (corrigido no Bloco 9a)', () => {
  // Antes `str.replace` direto explodia em null/undefined e zerava 0/false.
  const h = carregarApp();
  const escapeHtml = h.get('escapeHtml');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(0), '0');
  assert.equal(escapeHtml(false), 'false');
  assert.equal(escapeHtml(42), '42');
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
   isPublished / filterPublished  (fail-closed)
   ========================================================================== */

test('isPublished: status ausente NAO publica', () => {
  const h = carregarApp();
  const isPublished = h.get('isPublished');
  assert.equal(isPublished({ id: 1 }), false);
  assert.equal(isPublished({ id: 1, publish_status: null }), false);
  assert.equal(isPublished({ id: 1, publish_status: '' }), false);
  assert.equal(isPublished({ id: 1, publish_status: 'lixo' }), false);
  assert.equal(isPublished(null), false);
});

test('isPublished: so "published" explicito publica', () => {
  const h = carregarApp();
  const isPublished = h.get('isPublished');
  assert.equal(isPublished({ id: 1, publish_status: 'published' }), true);
  assert.equal(isPublished({ id: 2, publish_status: 'draft' }), false);
});

test('isPublished: o campo operacional "status" NAO publica (escala_ferias)', () => {
  const h = carregarApp();
  const isPublished = h.get('isPublished');
  assert.equal(isPublished({ id: 1, status: 'ativo', publish_status: 'draft' }), false);
  assert.equal(isPublished({ id: 2, status: 'published' }), false);
  assert.equal(isPublished({ id: 3, status: 'ferias', publish_status: 'published' }), true);
});

test('filterPublished: lista mista mostra so os publicados', () => {
  const h = carregarApp();
  const filterPublished = h.get('filterPublished');
  const lista = [
    { id: 1, publish_status: 'published' },
    { id: 2, publish_status: 'draft' },
    { id: 3 },
  ];
  assert.equal(filterPublished(lista).length, 1);
  assert.equal(filterPublished(lista)[0].id, 1);
  assert.equal(filterPublished(null).length, 0);
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

/* ==========================================================================
   getArquivoLinkMeta — download com URL assinada (Bloco 3b parte 2)
   ========================================================================== */

test('getArquivoLinkMeta: url_assinada tem prioridade sobre url legada', () => {
  const h = carregarApp();
  const meta = h.get('getArquivoLinkMeta')({
    nome: 'A',
    storage_path: 'a/p.pdf',
    storage_bucket: 'arquivos-smader',
    url: 'https://old.example/public',
    url_assinada: 'https://signed.example/token',
  });

  assert.equal(meta.href, 'https://signed.example/token');
  assert.equal(meta.isDownload, true);
  assert.match(meta.attrs, /data-storage-path="a\/p\.pdf"/);
  assert.match(meta.attrs, /baixarArquivoStorage/);
});

test('getArquivoLinkMeta: path sem URL assinada ainda gera link de download', () => {
  const h = carregarApp();
  const meta = h.get('getArquivoLinkMeta')({
    nome: 'A',
    storage_path: 'a/p.pdf',
    storage_bucket: 'arquivos-smader',
    url: '',
  });

  assert.equal(meta.href, '#');
  assert.equal(meta.isDownload, true);
  assert.match(meta.attrs, /data-storage-path="a\/p\.pdf"/);
});

test('getArquivoLinkMeta: arquivo_data local continua tendo prioridade', () => {
  const h = carregarApp();
  const meta = h.get('getArquivoLinkMeta')({
    nome: 'A',
    arquivo_data: 'data:text/plain;base64,abc',
    url_assinada: 'https://signed.example/token',
  });

  assert.equal(meta.href, 'data:text/plain;base64,abc');
  assert.equal(meta.isDownload, true);
  assert.match(meta.attrs, /data-baixar-href="data:text\/plain;base64,abc"/);
});

test('getArquivoLinkMeta: URL externa sem path abre em nova aba', () => {
  const h = carregarApp();
  const meta = h.get('getArquivoLinkMeta')({
    nome: 'A',
    url: 'https://example.com/doc',
  });

  assert.equal(meta.href, 'https://example.com/doc');
  assert.equal(meta.isDownload, false);
  assert.equal(meta.isExternal, true);
  assert.doesNotMatch(meta.attrs, /baixarArquivoStorage/);
});

/* ==========================================================================
   getArquivoPreviewHTML — URL assinada tambem no preview (Bloco 3b parte 2)
   ========================================================================== */

test('getArquivoPreviewHTML: url_assinada tem prioridade sobre url legada', () => {
  const h = carregarApp();
  const html = h.get('getArquivoPreviewHTML')({
    nome: 'Documento',
    tipo: 'PDF',
    url: 'https://old.example/public/doc.pdf',
    url_assinada: 'https://signed.example/token/doc.pdf',
  });

  assert.match(html, /signed\.example/);
  assert.doesNotMatch(html, /old\.example/);
});

test('getArquivoPreviewHTML: arquivo_data tem prioridade, mas urlSegura bloqueia data:', () => {
  const h = carregarApp();
  const html = h.get('getArquivoPreviewHTML')({
    nome: 'Imagem',
    tipo: 'JPG',
    arquivo_data: 'data:image/png;base64,abc',
    url: 'https://old.example/public/foto.jpg',
    url_assinada: 'https://signed.example/token/foto.jpg',
  });

  // O Bloco 9b bloqueia data: em src; o importante e nao cair na URL publica.
  assert.match(html, /src=""/);
  assert.doesNotMatch(html, /old\.example|signed\.example/);
});

test('getArquivoPreviewHTML: upload novo sem url usa url_assinada', () => {
  const h = carregarApp();
  const html = h.get('getArquivoPreviewHTML')({
    nome: 'Novo',
    tipo: 'JPG',
    url: '',
    url_assinada: 'https://signed.example/token/novo.jpg',
  });

  assert.match(html, /signed\.example/);
  assert.doesNotMatch(html, /object\/public/);
});

/* ==========================================================================
   Imagens de manual com URL assinada (Bloco 3c/13)
   ========================================================================== */

test('getManualPassoImagemUrl: prioriza imagem_url_assinada e cai em imagem', () => {
  const h = carregarApp();
  const getUrl = h.get('getManualPassoImagemUrl');

  assert.equal(
    getUrl({ imagem: 'https://old.example/public.jpg', imagem_url_assinada: 'https://signed.example/token.jpg' }),
    'https://signed.example/token.jpg'
  );
  assert.equal(getUrl({ imagem: 'https://old.example/public.jpg' }), 'https://old.example/public.jpg');
  assert.equal(getUrl({ imagem_url_assinada: 'https://signed.example/token.jpg' }), 'https://signed.example/token.jpg');
  assert.equal(getUrl({}), '');
  assert.equal(getUrl('texto'), '');
  assert.equal(getUrl(null), '');
});

test('renderManualDetail: usa imagem_url_assinada e nao a URL publica antiga', () => {
  const container = criarElemento('div');
  const h = carregarApp({ elementos: { 'manual-detail-content': container } });

  h.get('renderManualDetail')(
    {
      id: 1,
      titulo: 'Manual',
      categoria: 'Categoria',
      observacoes: '',
      documentos: [],
      passos: [
        {
          texto: 'Passo com imagem',
          imagem: 'https://old.example/object/public/manuais/1.jpg',
          imagem_url_assinada: 'https://signed.example/object/sign/manuais/1.jpg?token=abc',
        },
      ],
    },
    'completo',
    0
  );

  assert.match(container.innerHTML, /signed\.example\/object\/sign\/manuais\/1\.jpg/);
  assert.doesNotMatch(container.innerHTML, /object\/public\/manuais\/1\.jpg/);
});

