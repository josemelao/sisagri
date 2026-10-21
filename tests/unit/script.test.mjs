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
  assert.match(meta.attrs, /data-acao="baixar-arquivo-storage"/);
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

/* ==========================================================================
   Navegacao de passos do manual (bug: voltava para "resumido")
   ========================================================================== */

test('buildManualPaginationHTML: botoes de passo carregam o modo completo', () => {
  const h = carregarApp();
  const html = h.get('buildManualPaginationHTML')(3, 1, {
    acao: 'manual-painel-passo',
    id: 1,
    painel: 'manual-filho',
  });

  assert.match(html, /data-acao="manual-painel-passo"/);
  assert.match(html, /data-modo="completo"/);
});

test('_renderManualNoPainel: passo sem data-modo permanece no modo completo', () => {
  const h = carregarApp();
  h.run(`
    manuais = [{
      id: 1,
      titulo: 'Manual',
      categoria: 'Categoria',
      observacoes: '',
      documentos: [],
      passos: [{ texto: 'Primeiro' }, { texto: 'Segundo' }]
    }];
    window.__renderManualChamadas = [];
    PAINEIS_MANUAIS['manual-filho'] = (m, modo, passo) => {
      window.__renderManualChamadas.push({ id: m.id, modo, passo });
    };
  `);

  h.get('_renderManualNoPainel')({
    dataset: { acao: 'manual-painel-passo', painel: 'manual-filho', id: '1', passo: '1' },
  }, 1);

  const chamadas = h.window.__renderManualChamadas;
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].id, 1);
  assert.equal(chamadas[0].modo, 'completo');
  assert.equal(chamadas[0].passo, 1);
});

/* ==========================================================================
   Busca por modulo com campo nulo (bug 2026-10-21)
   O filtro chamava `.toLowerCase()` direto no campo; um registro com null
   lancava TypeError dentro do filter e a lista nem era re-renderizada.
   ========================================================================== */

/** Substitui as funcoes de render por capturadoras de id e devolve o mapa. */
function capturarIds(h, nomes) {
  h.run('window.__ids = {};');
  nomes.forEach((nome) => {
    h.run(`${nome} = (lista) => { window.__ids[${JSON.stringify(nome)}] = (lista || []).map((item) => item.id); };`);
  });
  return h.window.__ids;
}

test('applyManuaisSearch: manual com categoria nula nao quebra a busca', () => {
  const h = carregarApp();
  const ids = capturarIds(h, ['renderManuais']);
  h.run(`
    manuais = [
      { id: 7, titulo: 'Manual novo', categoria: null },
      { id: 2, titulo: 'Manual de Ferias', categoria: 'RH' }
    ];
  `);

  h.get('applyManuaisSearch')('ferias');

  assert.deepEqual([...ids.renderManuais], [2]);
});

test('applyProcessosSearch: processo com categoria e etapas nulas nao quebra a busca', () => {
  const h = carregarApp();
  const ids = capturarIds(h, ['renderProcessos']);
  h.run(`
    processos = [
      { id: 5, titulo: 'Processo novo', categoria: null, etapas: null },
      { id: 2, titulo: 'Processo de Fiscalizacao', categoria: 'Fiscalizacao', etapas: [{ titulo: null }] }
    ];
  `);

  h.get('applyProcessosSearch')('fiscalizacao');

  assert.deepEqual([...ids.renderProcessos], [2]);
});

test('applyVeiculosSearch: veiculo com marca/modelo/placa/tipo nulos nao quebra a busca', () => {
  const h = carregarApp();
  const ids = capturarIds(h, ['renderVeiculos']);
  h.run(`
    veiculos = [
      { id: 4, nome: 'Veiculo novo', marca: null, modelo: null, placa: null, tipo: null, situacao: null },
      { id: 2, nome: 'Hilux', marca: 'Toyota', modelo: 'Hilux', placa: 'ABC1D23', tipo: 'Caminhonete', situacao: 'Em operacao' }
    ];
  `);

  h.get('applyVeiculosSearch')('abc1d23');

  assert.deepEqual([...ids.renderVeiculos], [2]);
});

test('applySistemasSearch: sistema com campos nulos nao quebra a busca', () => {
  const h = carregarApp();
  const ids = capturarIds(h, ['renderSistemas']);
  h.run(`
    sistemas = [
      { id: 1, nome: 'SEI', nome_completo: null, descricao: null, orgao: null },
      { id: 2, nome: 'Outro', nome_completo: 'Outro sistema', descricao: 'Descricao', orgao: 'Orgao' }
    ];
  `);

  h.get('applySistemasSearch')('outro');

  assert.deepEqual([...ids.renderSistemas], [2]);
});

test('applyServicosSearch: servico com categoria/descricao/publico nulos nao quebra a busca', () => {
  const h = carregarApp();
  const ids = capturarIds(h, ['renderServicos']);
  h.run(`
    servicos = [
      { id: 1, nome: 'Outro', categoria: null, descricao: null, publico: null },
      { id: 2, nome: 'Licenciamento', categoria: 'Ambiental', descricao: 'Emissao', publico: 'Produtor' }
    ];
  `);

  h.get('applyServicosSearch')('licenciamento');

  assert.deepEqual([...ids.renderServicos], [2]);
});

test('applyAgendaSearch: aviso com titulo nulo nao quebra a busca', () => {
  const h = carregarApp();
  const ids = capturarIds(h, ['renderAvisos', 'renderAgendaEventos', 'renderAgendaHistorico']);
  h.run(`
    avisos = [
      { id: 1, titulo: null, desc: null, local: null, tipo: null },
      { id: 2, titulo: 'Aviso de vacinacao', desc: '', local: '', tipo: 'aviso' }
    ];
    agendaEventos = [];
  `);

  h.get('applyAgendaSearch')('vacinacao');

  assert.deepEqual([...ids.renderAvisos], [2]);
});

test('applyInformacoesSearch: item com campos nulos nao quebra a busca', () => {
  const h = carregarApp();
  const ids = capturarIds(h, ['renderJuridico', 'renderMunicipio', 'renderOrgaos']);
  h.run(`
    infoJuridico = [
      { id: 1, titulo: 'Lei', campos: null },
      { id: 2, titulo: 'Decreto', campos: [{ label: 'Assunto', valor: 'Licitacao' }] }
    ];
    infoMunicipio = [];
    infoOrgaos = [];
  `);

  h.get('applyInformacoesSearch')('licitacao');

  assert.deepEqual([...ids.renderJuridico], [2]);
});

test('renderArquivos: arquivo com nome e tags nulos nao quebra a busca por texto', () => {
  const lista = criarElemento('div');
  const h = carregarApp({ elementos: { 'arquivos-list': lista } });
  h.run(`
    arquivos = [
      { id: 1, nome: null, tags: null, tipo: 'PDF' },
      { id: 2, nome: 'Edital.pdf', tags: [], tipo: 'PDF' }
    ];
    arquivoQuery = 'edital';
  `);

  h.get('renderArquivos')();

  assert.match(lista.innerHTML, /Edital\.pdf/);
});
