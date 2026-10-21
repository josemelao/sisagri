/**
 * Bloco 8 (T8.4) — troca de colecao numa transacao.
 *
 * A RPC `replace_collection` faz delete + insert no banco. O cliente NUNCA
 * pode apagar antes: se o insert falhar, a colecao sumiria.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts } from '../helpers/load-script.mjs';

function carregar({ falhar = false } = {}) {
  const chamadas = { rpc: [], delete: 0, insert: 0 };

  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    order: async () => ({ data: [], error: null }),
  };

  const cliente = {
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    rpc: async (nome, args) => {
      chamadas.rpc.push({ nome, args });
      if (falhar) return { data: null, error: { message: 'payload invalido' } };
      return { data: args?.p_payload?.length ?? 0, error: null };
    },
    from: () => ({
      select: () => consulta,
      delete: () => { chamadas.delete += 1; return { gte: async () => ({ error: null }) }; },
      insert: () => { chamadas.insert += 1; return Promise.resolve({ error: null }); },
    }),
  };

  const h = carregarScripts(['db.js'], { supabase: false, cliente });
  h.run('_sb = window.__clienteFake; _db = {}');
  return { h, chamadas };
}

test('replaceCollection chama a RPC e nao apaga pelo cliente', async () => {
  const { h, chamadas } = carregar();
  const DB = h.get('DB');

  await DB.replaceCollection('processos', [
    { id: 1, titulo: 'A', publish_status: 'draft' },
    { id: 2, titulo: 'B', publish_status: 'published' },
  ]);

  assert.equal(chamadas.rpc.length, 1);
  assert.equal(chamadas.rpc[0].nome, 'replace_collection');
  assert.equal(chamadas.rpc[0].args.p_tabela, 'processos');
  assert.equal(Array.isArray(chamadas.rpc[0].args.p_payload), true);
  assert.equal(chamadas.rpc[0].args.p_payload.length, 2);
  assert.equal(chamadas.delete, 0, 'delete so pode acontecer dentro da RPC');
  assert.equal(chamadas.insert, 0, 'insert so pode acontecer dentro da RPC');
});

test('replaceCollection propaga erro do banco', async () => {
  const { h } = carregar({ falhar: true });
  const DB = h.get('DB');

  await assert.rejects(
    () => DB.replaceCollection('processos', [{ id: 1, titulo: 'A' }]),
    (erro) => erro.message === 'payload invalido'
  );
});
