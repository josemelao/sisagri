/**
 * Testes de `DB.isAdminLoggedIn` (Bloco 5).
 *
 * A regra: estar autenticado NAO e ser admin. A resposta tem que vir do banco
 * (`rpc('is_admin')`), que consulta `public.app_admins` com security definer.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts } from '../helpers/load-script.mjs';

/**
 * Monta db.js com um cliente Supabase falso.
 *
 * @param {object} cenario
 * @param {object|null} cenario.sessao   valor de data.session
 * @param {boolean|Error} cenario.isAdmin valor de data do rpc, ou Error
 * @param {boolean} cenario.erroSessao    getSession devolve error
 */
function carregar(cenario = {}) {
  const chamadas = { signOut: 0, rpc: [] };

  const cliente = {
    auth: {
      getSession: async () =>
        cenario.erroSessao
          ? { data: { session: null }, error: { message: 'falha de rede' } }
          : { data: { session: cenario.sessao ?? null }, error: null },
      signOut: async () => {
        chamadas.signOut++;
        return { error: null };
      },
    },
    rpc: async (nome) => {
      chamadas.rpc.push(nome);
      if (cenario.isAdmin instanceof Error) {
        return { data: null, error: { message: cenario.isAdmin.message } };
      }
      return { data: cenario.isAdmin === undefined ? false : cenario.isAdmin, error: null };
    },
  };

  const h = carregarScripts(['db.js'], { supabase: false, cliente });
  h.run('_sb = window.__clienteFake');
  return { h, chamadas };
}

const SESSAO = { user: { id: 'fc124783-4dc3-46ec-9677-3b15282a7220' }, access_token: 'x' };

test('isAdminLoggedIn: sem sessao devolve false e nao chama o banco', async () => {
  const { h, chamadas } = carregar({ sessao: null });

  assert.equal(await h.get('DB').isAdminLoggedIn(), false);
  assert.equal(chamadas.rpc.length, 0, 'nao deve consultar o banco sem sessao');
  assert.equal(chamadas.signOut, 0);
  assert.equal(h.get('DB').motivoUltimoAcesso, 'sem_sessao');
});

test('isAdminLoggedIn: sessao valida mas is_admin=false devolve false e encerra a sessao', async () => {
  const { h, chamadas } = carregar({ sessao: SESSAO, isAdmin: false });

  assert.equal(await h.get('DB').isAdminLoggedIn(), false);
  assert.deepEqual(chamadas.rpc, ['is_admin']);
  assert.equal(chamadas.signOut, 1, 'sessao sem permissao nao pode ficar orfa');
  assert.equal(h.get('DB').motivoUltimoAcesso, 'sem_permissao');
});

test('isAdminLoggedIn: sessao valida e is_admin=true devolve true', async () => {
  const { h, chamadas } = carregar({ sessao: SESSAO, isAdmin: true });

  assert.equal(await h.get('DB').isAdminLoggedIn(), true);
  assert.deepEqual(chamadas.rpc, ['is_admin']);
  assert.equal(chamadas.signOut, 0);
});

test('isAdminLoggedIn: erro ao consultar permissao falha fechado, sem derrubar a sessao', async () => {
  const { h, chamadas } = carregar({ sessao: SESSAO, isAdmin: new Error('rpc indisponivel') });

  assert.equal(await h.get('DB').isAdminLoggedIn(), false);
  assert.equal(chamadas.signOut, 0, 'erro de rede nao e prova de falta de permissao');
  assert.equal(h.get('DB').motivoUltimoAcesso, 'erro');
});

test('isAdminLoggedIn: erro no getSession devolve false', async () => {
  const { h } = carregar({ erroSessao: true });

  assert.equal(await h.get('DB').isAdminLoggedIn(), false);
});
