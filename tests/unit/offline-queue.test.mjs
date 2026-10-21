/**
 * Bloco 8 (T8.2) — fila de escrita offline.
 *
 * Falha transitoria (rede) entra na fila `smader_pending_writes_v1` e e
 * reenviada no boot/`online`, sem duplicar. Erro permanente (permissao/dado)
 * nao entra na fila.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts } from '../helpers/load-script.mjs';

const CHAVE = 'smader_pending_writes_v1';

function carregar({ falhar = true, erro = { message: 'sem rede' } } = {}) {
  const estado = { falhar, erro };
  const chamadas = [];

  const resposta = () => Promise.resolve({ error: estado.falhar ? estado.erro : null });

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
      upsert: (payload) => { chamadas.push({ tipo: 'upsert', tabela, payload }); return resposta(); },
      update: (payload) => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'update', tabela, valor, payload });
          return resposta();
        },
      }),
      delete: () => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'delete', tabela, valor });
          return resposta();
        },
      }),
    }),
  };

  const h = carregarScripts(['db.js'], { supabase: false, cliente });
  h.run('_sb = window.__clienteFake; _db = {}');
  return { h, estado, chamadas };
}

test('falha de rede entra na fila e o dado local continua', async () => {
  const { h } = carregar({ falhar: true });
  const DB = h.get('DB');

  await assert.rejects(() => DB.save('processos', 0, { titulo: 'Offline', publish_status: 'draft' }));

  const fila = DB.getPendingWrites();
  assert.equal(fila.length, 1);
  assert.equal(fila[0].op, 'insert');
  assert.equal(fila[0].colecao, 'processos');
  assert.equal(fila[0].payload.titulo, 'Offline');
  assert.equal(h.localStorage.getItem(CHAVE) !== null, true);
  assert.equal(DB.get('processos').length, 1);
});

test('erro permanente (permissao) nao entra na fila', async () => {
  const { h } = carregar({ falhar: true, erro: { message: 'permission denied', code: '42501' } });
  const DB = h.get('DB');

  await assert.rejects(() => DB.save('processos', 0, { titulo: 'X', publish_status: 'draft' }));

  assert.equal(DB.getPendingWrites().length, 0);
});

test('flush reenvia a fila e nao duplica', async () => {
  const { h, estado, chamadas } = carregar({ falhar: true });
  const DB = h.get('DB');

  await assert.rejects(() => DB.save('processos', 0, { titulo: 'Offline', publish_status: 'draft' }));
  assert.equal(DB.getPendingWrites().length, 1);

  estado.falhar = false;
  const restante = await DB.flushPendingWrites();
  assert.equal(restante.length, 0, 'fila deve esvaziar');

  const envios = chamadas.filter(c => c.tipo === 'upsert' || c.tipo === 'insert');
  assert.equal(envios.length >= 2, true, 'deve tentar de novo o insert');

  // Segundo flush nao reenvia nada.
  const antes = chamadas.length;
  await DB.flushPendingWrites();
  assert.equal(chamadas.length, antes);
});

test('update pendente usa o id e o payload salvos', async () => {
  const { h, estado, chamadas } = carregar({ falhar: false });
  const DB = h.get('DB');
  DB.insert('processos', { titulo: 'Antigo', publish_status: 'draft' });
  const id = DB.get('processos')[0].id;

  estado.falhar = true;
  await assert.rejects(() => DB.save('processos', id, { titulo: 'Editado' }));

  const item = DB.getPendingWrites()[0];
  assert.equal(item.op, 'update');
  assert.equal(item.id, id);
  assert.equal(item.payload.titulo, 'Editado');

  estado.falhar = false;
  await DB.flushPendingWrites();
  assert.ok(chamadas.some(c => c.tipo === 'update' && c.valor === id && c.payload.titulo === 'Editado'));
});

test('sucesso nao cria pendencia', async () => {
  const { h } = carregar({ falhar: false });
  const DB = h.get('DB');

  await DB.save('processos', 0, { titulo: 'Online', publish_status: 'draft' });
  assert.equal(DB.getPendingWrites().length, 0);
});
