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
 * `controle.liberar` resolve a escrita pendente.
 */
function carregar({ falhar = false, manual = false } = {}) {
  const chamadas = [];
  let liberar = null;
  let pendente = null;

  const resposta = () => {
    if (manual) {
      pendente = new Promise((resolve) => { liberar = resolve; });
      return pendente;
    }
    return Promise.resolve({ error: falhar ? { message: 'sem rede' } : null });
  };

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
      insert: (payload) => { chamadas.push({ tipo: 'insert', tabela, payload }); return resposta(); },
      update: (payload) => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'update', tabela, coluna, valor, payload });
          return resposta();
        },
      }),
      delete: () => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'delete', tabela, coluna, valor });
          return resposta();
        },
      }),
    }),
  };

  const h = carregarScripts(['db.js'], { supabase: false, cliente });
  h.run('_sb = window.__clienteFake; _db = {}');
  return { h, chamadas, liberar: () => liberar && liberar({ error: null }) };
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
  assert.ok(update, 'deve chamar update');
  assert.equal(update.valor, id);
  assert.equal(update.payload.titulo, 'Editado');
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
