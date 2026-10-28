/**
 * Fase 2.3 — previa de rascunho.
 *
 * O desenho aprovado pelo dono em 2026-10-28:
 *   - a previa e um iframe de `index.html?previa=1` por cima do modal de
 *     edicao, mostrando so o painel de detalhe publico;
 *   - o rascunho viaja por `postMessage` (mesma origem) e fica SO em memoria:
 *     nao entra em URL, localStorage nem requisicao;
 *   - o publico aceita o payload apenas com origem, `source`, nonce e colecao
 *     validos;
 *   - `escalaFerias` e `acessoRapido` nao tem detalhe publico: sem previa.
 *
 * Os testes abaixo travam os contratos puros. O iframe de verdade fica em
 * `tests/e2e/previa-rascunho.spec.mjs`.
 */

import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

const COLECOES_PUBLICAS = [
  'agendaEventos',
  'arquivos',
  'avisos',
  'funcionarios',
  'infoJuridico',
  'infoMunicipio',
  'infoOrgaos',
  'manuais',
  'processos',
  'servicos',
  'sistemas',
  'veiculos',
];

let publico;

before(async () => {
  publico = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'script.js'],
    {
      supabase: false,
      dadosIniciais: { manuais: [] },
      elementos: {
        'login-email': criarElemento('input'),
        'login-senha': criarElemento('input'),
        'manual-detail-content': criarElemento('div'),
        'manual-detail-overlay': criarElemento('div'),
      },
    },
  );
});

/* ------------------------------------------------------------------ */
/* publico: allowlist e validacao da mensagem                          */
/* ------------------------------------------------------------------ */

test('PREVIA_COLECOES cobre as 12 colecoes com detalhe publico', () => {
  const mapa = publico.get('PREVIA_COLECOES');
  assert.deepEqual(Object.keys(mapa).sort(), [...COLECOES_PUBLICAS].sort());
});

test('PREVIA_COLECOES nao inclui escalaFerias nem acessoRapido', () => {
  const mapa = publico.get('PREVIA_COLECOES');
  assert.equal(mapa.escalaFerias, undefined);
  assert.equal(mapa.acessoRapido, undefined);
});

const SOURCE = { id: 'parent' };

function evento(extra = {}) {
  const alvo = publico.window;
  return {
    origin: alvo.location.origin,
    source: SOURCE,
    data: {
      tipo: 'sisagri-previa-registro',
      nonce: 'n-1',
      colecao: 'manuais',
      registro: { id: 7, titulo: 'Manual de poda', passos: [] },
      relacionados: {},
      ...extra,
    },
  };
}

const ESPERADO = { origin: 'http://localhost:5173', source: SOURCE, nonce: 'n-1' };

test('previaAceitaMensagem aceita payload valido', () => {
  const aceita = publico.get('previaAceitaMensagem');
  assert.equal(aceita(evento(), ESPERADO), true);
});

test('previaAceitaMensagem recusa origem diferente', () => {
  const aceita = publico.get('previaAceitaMensagem');
  assert.equal(aceita(evento({}), { ...ESPERADO, origin: 'https://evil.test' }), false);
});

test('previaAceitaMensagem recusa source diferente', () => {
  const aceita = publico.get('previaAceitaMensagem');
  assert.equal(aceita(evento({}), { ...ESPERADO, source: { id: 'outro' } }), false);
});

test('previaAceitaMensagem recusa nonce diferente', () => {
  const aceita = publico.get('previaAceitaMensagem');
  assert.equal(aceita(evento(), { ...ESPERADO, nonce: 'n-2' }), false);
});

test('previaAceitaMensagem recusa tipo diferente', () => {
  const aceita = publico.get('previaAceitaMensagem');
  assert.equal(aceita(evento({ tipo: 'outra-coisa' }), ESPERADO), false);
});

test('previaAceitaMensagem recusa colecao fora da allowlist', () => {
  const aceita = publico.get('previaAceitaMensagem');
  assert.equal(aceita(evento({ colecao: 'app_admins' }), ESPERADO), false);
  assert.equal(aceita(evento({ colecao: 'escalaFerias' }), ESPERADO), false);
});

test('previaAceitaMensagem recusa registro ausente', () => {
  const aceita = publico.get('previaAceitaMensagem');
  assert.equal(aceita(evento({ registro: null }), ESPERADO), false);
});

test('previaAceitaMensagem recusa evento nulo', () => {
  const aceita = publico.get('previaAceitaMensagem');
  assert.equal(aceita(null, ESPERADO), false);
});

/* ------------------------------------------------------------------ */
/* publico: seed em memoria                                            */
/* ------------------------------------------------------------------ */

test('DB.aplicarPrevia recusa quando o modo previa nao foi habilitado', () => {
  publico.run('_habilitarPrevia(false)');
  const ok = publico.get('DB').aplicarPrevia('manuais', { id: 1, titulo: 'x' });
  assert.equal(ok, false);
  assert.equal(publico.get('DB').get('manuais').length, 0);
});

test('DB.aplicarPrevia grava em memoria e forca publicado no registro principal', () => {
  publico.run('_habilitarPrevia(true)');
  const ok = publico.get('DB').aplicarPrevia(
    'manuais',
    { id: 7, titulo: 'Manual de poda', publish_status: 'draft', passos: [] },
  );
  assert.equal(ok, true);

  const itens = publico.get('DB').get('manuais');
  assert.equal(itens.length, 1);
  assert.equal(itens[0].id, 7);
  assert.equal(itens[0].publish_status, 'published');

  publico.run('_habilitarPrevia(false)');
});

test('DB.aplicarPrevia descarta rascunhos dos relacionados', () => {
  publico.run('_habilitarPrevia(true)');
  publico.get('DB').aplicarPrevia(
    'processos',
    { id: 3, titulo: 'Processo', publish_status: 'draft' },
    {
      manuais: [
        { id: 1, titulo: 'Publicado', publish_status: 'published' },
        { id: 2, titulo: 'Rascunho', publish_status: 'draft' },
      ],
    },
  );

  const manuais = publico.get('DB').get('manuais');
  assert.equal(manuais.map((m) => m.id).join(','), '1');

  publico.run('_habilitarPrevia(false)');
});

test('DB.aplicarPrevia mantem o registro da previa a frente dos irmaos publicados', () => {
  publico.run('_habilitarPrevia(true)');
  publico.get('DB').aplicarPrevia(
    'manuais',
    { id: 7, titulo: 'Rascunho', publish_status: 'draft' },
    {
      manuais: [
        { id: 7, titulo: 'Versao publicada', publish_status: 'published' },
        { id: 8, titulo: 'Irmao publicado', publish_status: 'published' },
      ],
    },
  );

  const itens = publico.get('DB').get('manuais');
  assert.equal(itens.map((m) => `${m.id}:${m.titulo}`).join('|'), '7:Rascunho|8:Irmao publicado');

  publico.run('_habilitarPrevia(false)');
});

test('DB.aplicarPrevia nao grava no localStorage', () => {
  const antes = JSON.stringify(publico.localStorage);
  publico.run('_habilitarPrevia(true)');
  publico.get('DB').aplicarPrevia('manuais', { id: 9, titulo: 'Efemero', publish_status: 'draft' });
  publico.run('_habilitarPrevia(false)');

  const depois = JSON.stringify(publico.localStorage);
  assert.equal(depois, antes);
});

test('DB.aplicarPrevia recusa registro invalido', () => {
  publico.run('_habilitarPrevia(true)');
  assert.equal(publico.get('DB').aplicarPrevia('manuais', null), false);
  assert.equal(publico.get('DB').aplicarPrevia('manuais', 'texto'), false);
  publico.run('_habilitarPrevia(false)');
});

test('previaDespachar chama a funcao de abertura da colecao', () => {
  publico.run('window.__abriu = ""; openManual = (id) => { window.__abriu = "manuais:" + id; };');
  publico.get('previaDespachar')('manuais', 7);
  assert.equal(publico.window.__abriu, 'manuais:7');
});

test('previaDespachar ignora colecao fora da allowlist', () => {
  publico.run('window.__abriu = ""; openManual = () => { window.__abriu = "chamou"; };');
  publico.get('previaDespachar')('escalaFerias', 1);
  assert.equal(publico.window.__abriu, '');
});

test('previaAplicarPayload carrega o registro nas listas do app publico', () => {
  publico.run('_habilitarPrevia(true); window.__abriu = ""; openManual = (id) => { window.__abriu = "manuais:" + id; };');

  const ok = publico.get('previaAplicarPayload')({
    colecao: 'manuais',
    registro: { id: 11, titulo: 'Manual previa', publish_status: 'draft', passos: [] },
    relacionados: {},
  });

  assert.equal(ok, true);
  // Os abridores publicos leem `manuais`, nao o `DB`: o seed precisa chegar la.
  assert.equal(publico.run('manuais.map((m) => m.id).join(",")'), '11');
  assert.equal(publico.window.__abriu, 'manuais:11');

  publico.run('_habilitarPrevia(false)');
});

/* ------------------------------------------------------------------ */
/* admin: de-para, allowlist e payload                                 */
/* ------------------------------------------------------------------ */

let admin;

before(async () => {
  const secao = criarElemento('section');
  admin = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'],
    {
      supabase: false,
      dadosIniciais: { manuais: [] },
      elementos: {
        'login-email': criarElemento('input'),
        'login-senha': criarElemento('input'),
        modal: criarElemento('div'),
        'preview-overlay': secao,
      },
    },
  );
  await admin.get('dbInit')();
});

test('previaColecaoPorSalvar traduz a acao do botao Salvar', () => {
  const traduzir = admin.get('previaColecaoPorSalvar');
  assert.equal(traduzir('manual'), 'manuais');
  assert.equal(traduzir('processo'), 'processos');
  assert.equal(traduzir('funcionario'), 'funcionarios');
  assert.equal(traduzir('evento'), 'agendaEventos');
  assert.equal(traduzir('orgao'), 'infoOrgaos');
});

test('previaColecaoPorSalvar usa data-colecao em infoSimples', () => {
  const traduzir = admin.get('previaColecaoPorSalvar');
  assert.equal(traduzir('infoSimples', 'infoMunicipio'), 'infoMunicipio');
  assert.equal(traduzir('infoSimples', 'infoJuridico'), 'infoJuridico');
  assert.equal(traduzir('infoSimples', ''), null);
});

test('previaColecaoPorSalvar devolve null sem detalhe publico', () => {
  const traduzir = admin.get('previaColecaoPorSalvar');
  assert.equal(traduzir('ferias'), null);
  assert.equal(traduzir('acesso'), null);
  assert.equal(traduzir('desconhecido'), null);
  assert.equal(traduzir(''), null);
});

test('previaPermitida aceita as 12 colecoes publicas', () => {
  const permitida = admin.get('previaPermitida');
  COLECOES_PUBLICAS.forEach((colecao) => {
    assert.equal(permitida(colecao), true, `${colecao} deveria ter previa`);
  });
  assert.equal(permitida('escalaFerias'), false);
  assert.equal(permitida('acessoRapido'), false);
});

test('previaMontarPayload devolve null quando o registro nao existe', () => {
  const montar = admin.get('previaMontarPayload');
  assert.equal(montar('manuais', 999), null);
});

test('previaMontarPayload envia o registro e so os relacionados publicados', () => {
  admin.run(`
    _db.manuais = [
      { id: 7, titulo: 'Manual de poda', publish_status: 'draft', passos: [] },
      { id: 8, titulo: 'Manual publicado', publish_status: 'published', passos: [] },
    ];
    _db.arquivos = [
      { id: 1, nome: 'A', publish_status: 'published' },
      { id: 2, nome: 'B', publish_status: 'draft' },
    ];
  `);

  const payload = admin.get('previaMontarPayload')('manuais', 7);
  assert.equal(payload.colecao, 'manuais');
  assert.equal(payload.registro.id, 7);
  assert.equal(payload.registro.publish_status, 'draft');
  assert.equal(payload.relacionados.manuais.map((m) => m.id).join(','), '8');
  assert.equal(payload.relacionados.arquivos.map((a) => a.id).join(','), '1');
});
