/**
 * Login do index publico + cache separado por identidade.
 *
 * O ponto sensivel: o cache `smader_db_v1` antigo pode guardar dados de uma
 * sessao admin e ser lido por um visitante. A chave passa a ser por uid
 * (`smader_db_v1:<uid|anon>`) e e apagada no logout.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts } from '../helpers/load-script.mjs';

function carregar() {
  return carregarScripts(['db.js'], { supabase: false });
}

function criarAuth({ erroLogin = null } = {}) {
  const chamadas = { login: [], logout: 0, subscribe: 0 };
  const cliente = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async ({ email, password }) => {
        chamadas.login.push({ email, password });
        if (erroLogin) return { data: null, error: { message: erroLogin } };
        return { data: { user: { id: 'uid-1', email } }, error: null };
      },
      signOut: async () => {
        chamadas.logout += 1;
        return { error: null };
      },
      onAuthStateChange: (cb) => {
        chamadas.subscribe += 1;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  };
  return { cliente, chamadas };
}

function injetar(h, cliente) {
  h.window.__clienteFake = cliente;
  h.run('_sb = window.__clienteFake; _db = { layoutConfig: {} };');
}

test('DB.entrar autentica com email e senha', async () => {
  const h = carregar();
  const { cliente, chamadas } = criarAuth();
  injetar(h, cliente);
  const DB = h.get('DB');

  const resultado = await DB.entrar('servidor@exemplo.test', 'segredo');

  assert.equal(resultado.ok, true);
  assert.deepEqual(chamadas.login, [
    { email: 'servidor@exemplo.test', password: 'segredo' },
  ]);
  assert.equal(h.get('_usuarioAtual').id, 'uid-1');
});

test('DB.entrar devolve erro legivel quando a senha falha', async () => {
  const h = carregar();
  const { cliente } = criarAuth({ erroLogin: 'Invalid login credentials' });
  injetar(h, cliente);
  const DB = h.get('DB');

  const resultado = await DB.entrar('x@y.test', 'errada');

  assert.equal(resultado.ok, false);
  assert.match(resultado.erro, /Invalid login credentials/);
});

test('DB.sair encerra a sessao e apaga o cache daquela identidade', async () => {
  const h = carregar();
  const { cliente, chamadas } = criarAuth();
  injetar(h, cliente);
  h.run(
    '_usuarioAtual = { id: "uid-1", email: "x@y.test" };' +
    'localStorage.setItem("smader_db_v1:uid-1", "{}");' +
    'localStorage.setItem("smader_pending_writes_v1:uid-1", "[]");' +
    'localStorage.setItem("smader_db_v1", "{}");'
  );
  const DB = h.get('DB');

  await DB.sair();

  assert.equal(chamadas.logout, 1);
  assert.equal(h.run('localStorage.getItem("smader_db_v1:uid-1")'), null);
  assert.equal(h.run('localStorage.getItem("smader_pending_writes_v1:uid-1")'), null);
  assert.equal(h.run('localStorage.getItem("smader_db_v1")'), null);
  assert.equal(h.get('_usuarioAtual'), null);
});

test('DB.aoMudarSessao assina o evento de auth e devolve cancelamento', () => {
  const h = carregar();
  const { cliente, chamadas } = criarAuth();
  injetar(h, cliente);
  const DB = h.get('DB');

  const cancelar = DB.aoMudarSessao(() => {});

  assert.equal(chamadas.subscribe, 1);
  assert.equal(typeof cancelar, 'function');
  cancelar();
});

test('cache usa :anon sem sessao e :uid com sessao', () => {
  const h = carregar();
  const chave = h.run('typeof _chaveCacheDb === "undefined" ? null : _chaveCacheDb');
  assert.ok(chave, '_chaveCacheDb ausente');

  assert.equal(chave(), 'smader_db_v1:anon');
  h.run('_usuarioAtual = { id: "uid-9", email: "x@y.test" };');
  assert.equal(chave(), 'smader_db_v1:uid-9');
});

test('_persistLocal grava na chave da identidade, nao na chave global', () => {
  const h = carregar();
  injetar(h, criarAuth().cliente);
  h.run('_usuarioAtual = { id: "uid-9", email: "x@y.test" }; _db = { layoutConfig: {} };');

  h.get('_persistLocal')();

  assert.ok(h.run('localStorage.getItem("smader_db_v1:uid-9")'));
  assert.equal(h.run('localStorage.getItem("smader_db_v1")'), null);
});
