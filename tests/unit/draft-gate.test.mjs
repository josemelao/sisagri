/**
 * Bloco 7 (T7.1/T7.3/T7.4) — defesa em profundidade do rascunho.
 *
 * Regra: a RLS e a garantia; o filtro `publish_status = published` no select e
 * a segunda camada. Fail-closed: sem sessao, sem papel ou com erro de rede, o
 * cliente pede apenas o que e publico.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts } from '../helpers/load-script.mjs';

const SESSAO = { user: { id: 'fc124783-4dc3-46ec-9677-3b15282a7220' }, access_token: 'x' };

function carregar(cenario = {}) {
  const chamadas = { rpc: [], eq: [] };

  const cliente = {
    auth: {
      getSession: async () =>
        cenario.erroSessao
          ? { data: { session: null }, error: { message: 'falha de rede' } }
          : { data: { session: cenario.sessao ?? null }, error: null },
    },
    rpc: async (nome) => {
      chamadas.rpc.push(nome);
      if (cenario.erroRpc) return { data: null, error: { message: 'rpc indisponivel' } };
      return { data: cenario.podeEditar === true, error: null };
    },
    from: () => {
      const consulta = {
        select: () => consulta,
        eq: (coluna, valor) => {
          chamadas.eq.push([coluna, valor]);
          return consulta;
        },
        order: async () => ({ data: cenario.dados ?? [], error: cenario.erroBanco ?? null }),
      };
      return consulta;
    },
  };

  const h = carregarScripts(['db.js'], { supabase: false, cliente });
  h.run('_sb = window.__clienteFake; _db = {}');
  return { h, chamadas };
}

test('_resolverPodeVerRascunhos: sem sessao devolve false e nao chama o banco', async () => {
  const { h, chamadas } = carregar({ sessao: null });

  assert.equal(await h.get('_resolverPodeVerRascunhos')(), false);
  assert.deepEqual(chamadas.rpc, []);
});

test('_resolverPodeVerRascunhos: sessao com pode_editar=true (admin/servidor) devolve true', async () => {
  const { h, chamadas } = carregar({ sessao: SESSAO, podeEditar: true });

  assert.equal(await h.get('_resolverPodeVerRascunhos')(), true);
  assert.deepEqual(chamadas.rpc, ['pode_editar']);
});

test('_resolverPodeVerRascunhos: sessao sem pode_editar devolve false', async () => {
  const { h } = carregar({ sessao: SESSAO, podeEditar: false });

  assert.equal(await h.get('_resolverPodeVerRascunhos')(), false);
});

test('_resolverPodeVerRascunhos: erro no RPC falha fechado', async () => {
  const { h } = carregar({ sessao: SESSAO, erroRpc: true });

  assert.equal(await h.get('_resolverPodeVerRascunhos')(), false);
});

test('_resolverPodeVerRascunhos: erro no getSession falha fechado', async () => {
  const { h } = carregar({ erroSessao: true });

  assert.equal(await h.get('_resolverPodeVerRascunhos')(), false);
});

test('_loadSupabaseCollection: sem permissao pede so publish_status=published', async () => {
  const { h, chamadas } = carregar({ dados: [{ id: 1, titulo: 'X', publish_status: 'published' }] });
  h.run('_podeVerRascunhos = false');

  await h.get('_loadSupabaseCollection')('processos');

  assert.deepEqual(chamadas.eq, [['publish_status', 'published']]);
});

test('_loadSupabaseCollection: com permissao (admin/servidor) nao filtra', async () => {
  const { h, chamadas } = carregar({ dados: [{ id: 1, titulo: 'X', publish_status: 'draft' }] });
  h.run('_podeVerRascunhos = true');

  await h.get('_loadSupabaseCollection')('processos');

  assert.deepEqual(chamadas.eq, []);
  assert.equal(h.get('_db').processos[0].publish_status, 'draft');
});

test('_loadSupabaseCollection: erro do banco continua propagando', async () => {
  const { h } = carregar({ erroBanco: { message: 'sem rede' } });
  h.run('_podeVerRascunhos = false');

  await assert.rejects(
    () => h.get('_loadSupabaseCollection')('processos'),
    (erro) => erro && erro.message === 'sem rede'
  );
});

test('_normalizeSupabaseRow: preserva updated_at nos casos sem spread (T8.5)', () => {
  const { h } = carregar();
  const normalizar = h.get('_normalizeSupabaseRow');

  const processo = normalizar('processos', {
    id: 7,
    titulo: 'X',
    publish_status: 'draft',
    updated_at: '2026-10-21T13:00:00+00:00',
  });

  assert.equal(processo.updated_at, '2026-10-21T13:00:00+00:00');
});

test('escalaFerias: "status" operacional nunca vira publish_status', () => {
  const { h } = carregar();
  const normalizar = h.get('_normalizeCollectionRecord');

  const registro = normalizar('escalaFerias', {
    id: 1,
    nome: 'Fulano',
    status: 'ativo',
    publish_status: 'draft',
  });

  assert.equal(registro.status, 'ativo');
  assert.equal(registro.publish_status, 'draft');

  const semPublish = normalizar('escalaFerias', { id: 2, status: 'published' });
  assert.equal(semPublish.publish_status, 'draft', 'status nao publica nada');
});
