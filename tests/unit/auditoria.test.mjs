/**
 * Fase 2.2 — Historico de alteracoes (audit_log).
 *
 * Trava o contrato do lado do cliente:
 *   - normalizacao dos filtros (allowlist de tabela, teto do limite, dia inteiro);
 *   - `DB.auditoria.listar`: sem Supabase devolve `ok:false`, com Supabase aplica
 *     os filtros na consulta e normaliza a resposta;
 *   - `pintarAuditoria`: escapa rotulo/email, tem estado vazio e NAO oferece
 *     nenhuma acao de escrita (a tela e somente leitura).
 *
 * A parte de banco (trigger, RLS, privacidade) fica em
 * `supabase/tests/08_audit_log.sql`, rodado contra o projeto de teste.
 */

import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

const REGISTRO = {
  id: 1,
  tabela: 'manuais',
  registro_id: 7,
  operacao: 'update',
  campos: ['titulo', 'descricao'],
  rotulo: 'Manual de poda',
  usuario_email: 'jose@sisagri.test',
  em: '2026-10-28T10:00:00.000Z',
};

let ambiente;

before(async () => {
  const secao = criarElemento('section');
  const elementos = {
    'login-email': criarElemento('input'),
    'login-senha': criarElemento('input'),
    modal: criarElemento('div'),
    'section-auditoria': secao,
    'auditoria-search': criarElemento('input'),
  };
  const h = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'],
    { supabase: false, dadosIniciais: { manuais: [] }, elementos },
  );
  await h.get('dbInit')();
  ambiente = { h, secao };
});

/** Cliente falso: registra a consulta e devolve a resposta pedida. */
function instalarCliente(resposta = { data: [], error: null }) {
  const chamadas = [];
  const cliente = {
    from(tabela) {
      chamadas.push(['from', tabela]);
      const consulta = {
        select: (colunas) => { chamadas.push(['select', colunas]); return consulta; },
        order: (coluna, opcoes) => { chamadas.push(['order', coluna, opcoes]); return consulta; },
        limit: (n) => { chamadas.push(['limit', n]); return consulta; },
        eq: (coluna, valor) => { chamadas.push(['eq', coluna, valor]); return consulta; },
        ilike: (coluna, valor) => { chamadas.push(['ilike', coluna, valor]); return consulta; },
        gte: (coluna, valor) => { chamadas.push(['gte', coluna, valor]); return consulta; },
        lte: (coluna, valor) => { chamadas.push(['lte', coluna, valor]); return consulta; },
        then: (resolver) => resolver(resposta),
      };
      return consulta;
    },
  };
  ambiente.h.window.__clienteFake = cliente;
  ambiente.h.run('_sb = window.__clienteFake');
  return chamadas;
}

/* ------------------------------------------------------------------ */
/* normalizacao dos filtros                                            */
/* ------------------------------------------------------------------ */

test('_normalizarFiltrosAuditoria: tabela fora da allowlist e ignorada', () => {
  const normalizar = ambiente.h.get('_normalizarFiltrosAuditoria');
  assert.equal(normalizar({ tabela: 'app_admins' }).tabela, '');
});

test('_normalizarFiltrosAuditoria: aceita tabela auditada', () => {
  const normalizar = ambiente.h.get('_normalizarFiltrosAuditoria');
  assert.equal(normalizar({ tabela: 'manuais' }).tabela, 'manuais');
});

test('_normalizarFiltrosAuditoria: periodo cobre o dia inteiro', () => {
  const normalizar = ambiente.h.get('_normalizarFiltrosAuditoria');
  const filtros = normalizar({ de: '2026-10-01', ate: '2026-10-31' });
  assert.equal(filtros.de, '2026-10-01T00:00:00');
  assert.equal(filtros.ate, '2026-10-31T23:59:59.999');
});

test('_normalizarFiltrosAuditoria: limite padrao, teto e valor invalido', () => {
  const normalizar = ambiente.h.get('_normalizarFiltrosAuditoria');
  assert.equal(normalizar({}).limite, 1000);
  assert.equal(normalizar({ limite: 5000 }).limite, 1000);
  assert.equal(normalizar({ limite: -3 }).limite, 1000);
  assert.equal(normalizar({ limite: 'abc' }).limite, 1000);
});

test('_normalizarFiltrosAuditoria: email sem espacos e vazio quando ausente', () => {
  const normalizar = ambiente.h.get('_normalizarFiltrosAuditoria');
  assert.equal(normalizar({ email: '  jose@sisagri.test  ' }).email, 'jose@sisagri.test');
  assert.equal(normalizar({}).email, '');
});

/* ------------------------------------------------------------------ */
/* DB.auditoria.listar                                                 */
/* ------------------------------------------------------------------ */

test('DB.auditoria.tabelas devolve as 14 tabelas auditadas', () => {
  const tabelas = ambiente.h.get('DB').auditoria.tabelas();
  assert.equal(tabelas.length, 14);
  assert.ok(tabelas.includes('manuais'));
  assert.ok(tabelas.includes('funcionarios'));
});

test('DB.auditoria.listar: sem Supabase devolve ok:false e lista vazia', async () => {
  ambiente.h.run('_sb = null');
  const resposta = await ambiente.h.get('DB').auditoria.listar({});
  assert.equal(resposta.ok, false);
  assert.equal(resposta.itens.length, 0);
  assert.match(resposta.erro, /Supabase/);
});

test('DB.auditoria.listar: aplica tabela, usuario e periodo na consulta', async () => {
  const chamadas = instalarCliente();
  const resposta = await ambiente.h.get('DB').auditoria.listar({
    tabela: 'manuais',
    email: 'jose',
    de: '2026-10-01',
    ate: '2026-10-31',
  });

  assert.equal(resposta.ok, true);
  assert.deepEqual(chamadas[0], ['from', 'audit_log']);
  assert.ok(
    chamadas.some((c) => c[0] === 'eq' && c[1] === 'tabela' && c[2] === 'manuais'),
    'filtro por tabela nao foi enviado',
  );
  assert.ok(
    chamadas.some((c) => c[0] === 'ilike' && c[1] === 'usuario_email' && c[2] === '%jose%'),
    'filtro por usuario nao foi enviado',
  );
  assert.ok(
    chamadas.some((c) => c[0] === 'gte' && c[1] === 'em' && c[2] === '2026-10-01T00:00:00'),
    'inicio do periodo nao foi enviado',
  );
  assert.ok(
    chamadas.some((c) => c[0] === 'lte' && c[1] === 'em' && c[2] === '2026-10-31T23:59:59.999'),
    'fim do periodo nao foi enviado',
  );
  assert.ok(
    chamadas.some((c) => c[0] === 'order' && c[1] === 'em' && c[2]?.ascending === false),
    'ordem decrescente por data nao foi pedida',
  );
  assert.ok(
    chamadas.some((c) => c[0] === 'limit' && c[1] === 1000),
    'limite nao foi aplicado',
  );
});

test('DB.auditoria.listar: normaliza campos nulos e email ausente', async () => {
  instalarCliente({
    data: [{ ...REGISTRO, campos: null, usuario_email: null, rotulo: null }],
    error: null,
  });
  const resposta = await ambiente.h.get('DB').auditoria.listar({});
  assert.equal(resposta.ok, true);
  assert.equal(resposta.itens.length, 1);
  assert.equal(resposta.itens[0].campos.length, 0);
  assert.equal(resposta.itens[0].usuario_email, '');
  assert.equal(resposta.itens[0].rotulo, '');
  assert.equal(resposta.itens[0].registro_id, 7);
});

test('DB.auditoria.listar: erro do banco vira ok:false com a mensagem real', async () => {
  instalarCliente({ data: null, error: { message: 'permission denied for table audit_log' } });
  const resposta = await ambiente.h.get('DB').auditoria.listar({});
  assert.equal(resposta.ok, false);
  assert.equal(resposta.itens.length, 0);
  assert.match(resposta.erro, /permission denied/);
});

/* ------------------------------------------------------------------ */
/* tela (somente leitura)                                              */
/* ------------------------------------------------------------------ */

test('pintarAuditoria: escapa rotulo e email do log', () => {
  const { h, secao } = ambiente;
  h.get('AUDITORIA_LISTA').setItems([
    {
      ...REGISTRO,
      rotulo: '<img src=x onerror=alert(1)>',
      usuario_email: '<b>x</b>@sisagri.test',
    },
  ]);
  const html = secao.innerHTML;
  assert.ok(!html.includes('<img src=x'), 'rotulo nao foi escapado');
  assert.ok(html.includes('&lt;img src=x'), 'rotulo escapado nao aparece');
  assert.ok(!html.includes('<b>x</b>'), 'email nao foi escapado');
});

test('pintarAuditoria: sem registros mostra estado vazio', () => {
  const { h, secao } = ambiente;
  h.get('AUDITORIA_LISTA').setItems([]);
  assert.match(secao.innerHTML, /Nenhuma altera/);
});

test('pintarAuditoria: tela somente leitura, sem acao de escrita', () => {
  const { h, secao } = ambiente;
  h.get('AUDITORIA_LISTA').setItems([REGISTRO]);
  const html = secao.innerHTML;
  assert.ok(
    !/data-acao="(novo|editar|excluir|salvar|confirmar-delecao)/.test(html),
    'a tela de historico nao pode oferecer acao de escrita',
  );
});

test('pintarAuditoria: mostra operacao, campos e data legivel', () => {
  const { h, secao } = ambiente;
  h.get('AUDITORIA_LISTA').setItems([REGISTRO]);
  const html = secao.innerHTML;
  assert.match(html, /Manual de poda/);
  assert.match(html, /titulo/);
  assert.match(html, /descricao/);
  assert.match(html, /Atualiza|atualiza/);
  assert.match(html, /jose@sisagri\.test/);
});

/* ------------------------------------------------------------------ */
/* busca do historico (debounce de 200 ms)                             */
/* ------------------------------------------------------------------ */

test('busca do historico: acao ligada no input, nao no clique', () => {
  const { h } = ambiente;
  assert.equal(typeof h.get('ACOES_ADMIN_INPUT')['buscar-auditoria'], 'function');
  assert.equal(h.get('ACOES_ADMIN_CLIQUE')['buscar-auditoria'], undefined);
});

test('busca do historico: digitar filtra so depois de 200 ms', async () => {
  const { h } = ambiente;
  const lista = h.get('AUDITORIA_LISTA');
  lista.setQuery('');
  lista.setItems([
    { ...REGISTRO, id: 1, rotulo: 'AAA', tabela: 'veiculos' },
    { ...REGISTRO, id: 2, rotulo: 'BBB', tabela: 'manuais' },
  ]);
  assert.equal(lista.getState().total, 2);

  // O despachante recebe o evento como o navegador entrega: input + data-acao.
  h.get('document').getElementById('auditoria-search').value = 'AAA';
  const alvo = criarElemento('input');
  alvo.dataset.acao = 'buscar-auditoria';
  alvo.closest = (seletor) => (seletor === '[data-acao]' ? alvo : null);

  h.get('despacharAcaoAdmin')({ target: alvo }, h.get('ACOES_ADMIN_INPUT'));
  assert.equal(lista.getState().total, 2, 'nao pode filtrar antes do debounce');

  await new Promise((ok) => setTimeout(ok, 250));

  assert.equal(lista.getState().query, 'AAA');
  assert.equal(lista.getState().total, 1);
});

/* ------------------------------------------------------------------ */
/* teto de leitura (busca e paginacao sao no cliente)                   */
/* ------------------------------------------------------------------ */

test('carregarAuditoria: pede o teto de 1000 ao banco', async () => {
  const chamadas = instalarCliente();
  await ambiente.h.get('carregarAuditoria')();
  assert.ok(
    chamadas.some((c) => c[0] === 'limit' && c[1] === 1000),
    'a tela precisa pedir o mesmo teto de db.js',
  );
});

test('pintarAuditoria: avisa quando o teto de 1000 foi atingido', () => {
  const { h, secao } = ambiente;
  const lista = h.get('AUDITORIA_LISTA');

  lista.setItems(Array.from({ length: 1000 }, (_, i) => ({ ...REGISTRO, id: i + 1 })));
  assert.match(secao.innerHTML, /Mostrando os 1000 registros mais recentes/);

  lista.setItems([REGISTRO]);
  assert.doesNotMatch(secao.innerHTML, /registros mais recentes/);
});
