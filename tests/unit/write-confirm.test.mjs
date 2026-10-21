/**
 * Bloco 8 (T8.1) — a UI nao pode dizer "salvo" antes do banco responder.
 *
 * `DB.save`/`DB.remove` esperam a resposta real; em falha, devolvem erro e
 * preservam o dado local (fallback local e feature, nao divida).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts } from '../helpers/load-script.mjs';

/**
 * Cliente falso com controle da resposta remota.
 * `liberar()` resolve a escrita pendente (modo manual).
 * `dadosUpdate` simula o retorno do update (vazio = conflito).
 */
function carregar({ falhar = false, manual = false, dadosUpdate = undefined } = {}) {
  const chamadas = [];
  let liberar = null;

  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    order: async () => ({ data: [], error: null }),
  };

  const cliente = {
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    rpc: async () => ({ data: false, error: null }),
    from: (tabela) => ({
      select: () => consulta,
      insert: (payload) => {
        chamadas.push({ tipo: 'insert', tabela, payload });
        const builder = {
          select: () => builder,
          single: () => {
            if (manual) return new Promise((resolve) => { liberar = resolve; });
            return Promise.resolve({
              data: falhar ? null : { id: 900 },
              error: falhar ? { message: 'sem rede' } : null,
            });
          },
        };
        return builder;
      },
      update: (payload) => {
        chamadas.push({ tipo: 'update', tabela, payload });
        const builder = {
          eq: (coluna, valor) => {
            chamadas.push({ tipo: 'eq', coluna, valor });
            return builder;
          },
          select: () => builder,
          then: (resolve) => {
            const data = dadosUpdate !== undefined ? dadosUpdate : [{ id: payload.id }];
            resolve({
              data: falhar ? null : data,
              error: falhar ? { message: 'sem rede' } : null,
            });
          },
        };
        return builder;
      },
      delete: () => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'delete', tabela, coluna, valor });
          return Promise.resolve({ data: null, error: falhar ? { message: 'sem rede' } : null });
        },
      }),
    }),
  };

  const h = carregarScripts(['db.js'], { supabase: false, cliente });
  h.run('_sb = window.__clienteFake; _db = {}');
  return {
    h,
    chamadas,
    liberar: () => liberar && liberar({ data: { id: 900 }, error: null }),
  };
}

test('DB.save: espera a resposta do banco antes de resolver', async () => {
  const { h, chamadas, liberar } = carregar({ manual: true });
  const DB = h.get('DB');

  const promessa = DB.save('processos', 0, { titulo: 'Novo', publish_status: 'draft' });

  // Antes da resposta, a promessa ainda esta pendente.
  const estado = await Promise.race([
    promessa.then(() => 'resolveu'),
    Promise.resolve('pendente'),
  ]);
  assert.equal(estado, 'pendente');
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].tipo, 'insert');

  liberar();
  const salvo = await promessa;
  assert.equal(salvo.titulo, 'Novo');
});

test('DB.save: falha do banco rejeita com a mensagem real', async () => {
  const { h } = carregar({ falhar: true });
  const DB = h.get('DB');

  await assert.rejects(
    () => DB.save('processos', 0, { titulo: 'X', publish_status: 'draft' }),
    (erro) => erro.message === 'sem rede'
  );

  // O dado local continua (fallback e feature), sem mentir que sincronizou.
  assert.equal(DB.get('processos').length, 1);
});

test('DB.save: update usa o id e envia so o payload normalizado', async () => {
  const { h, chamadas } = carregar();
  const DB = h.get('DB');
  DB.insert('processos', { titulo: 'Antigo', publish_status: 'draft' });
  const id = DB.get('processos')[0].id;

  await DB.save('processos', id, { titulo: 'Editado' });

  const update = chamadas.find(c => c.tipo === 'update');
  const filtroId = chamadas.find(c => c.tipo === 'eq' && c.coluna === 'id');
  assert.ok(update, 'deve chamar update');
  assert.equal(filtroId.valor, id);
  assert.equal(update.payload.titulo, 'Editado');
});

test('DB.save: insert nao envia id e adota o id que o banco devolve (T8.3)', async () => {
  const { h, chamadas } = carregar();
  const DB = h.get('DB');

  const salvo = await DB.save('processos', 0, { titulo: 'Novo', publish_status: 'draft' });

  const insert = chamadas.find(c => c.tipo === 'insert');
  assert.ok(insert, 'deve chamar insert');
  assert.equal('id' in insert.payload, false, 'o id nao pode ser enviado no insert');
  assert.equal(salvo.id, 900, 'o registro assume o id gerado pelo banco');
});

test('DB.save: updated_at desatualizado vira conflito e nao entra na fila (T8.5)', async () => {
  const { h, chamadas } = carregar({ dadosUpdate: [] });
  const DB = h.get('DB');
  h.run(`_db = { processos: [{
    id: 1,
    titulo: 'De outro editor',
    publish_status: 'draft',
    updated_at: '2026-01-01T00:00:00+00:00'
  }] }`);

  await assert.rejects(
    () => DB.save('processos', 1, { titulo: 'Minha versao' }),
    (erro) => erro.message.includes('alterado por outro usuario')
  );

  const filtroUpdatedAt = chamadas.find(c => c.tipo === 'eq' && c.coluna === 'updated_at');
  assert.equal(filtroUpdatedAt.valor, '2026-01-01T00:00:00+00:00');
  assert.equal(DB.getPendingWrites().length, 0, 'conflito nao e erro transitorio');
});

test('DB.remove: falha do banco devolve o registro ao cache', async () => {
  const { h } = carregar({ falhar: true });
  const DB = h.get('DB');
  DB.insert('processos', { titulo: 'Fica', publish_status: 'draft' });
  const id = DB.get('processos')[0].id;

  await assert.rejects(() => DB.remove('processos', id), (erro) => erro.message === 'sem rede');

  assert.equal(DB.get('processos').length, 1);
  assert.equal(DB.get('processos')[0].id, id);
});

test('DB.remove: sucesso remove do cache e do banco', async () => {
  const { h, chamadas } = carregar();
  const DB = h.get('DB');
  DB.insert('processos', { titulo: 'Sai', publish_status: 'draft' });
  const id = DB.get('processos')[0].id;

  assert.equal(await DB.remove('processos', id), true);

  assert.equal(DB.get('processos').length, 0);
  assert.ok(chamadas.some(c => c.tipo === 'delete' && c.valor === id));
});
