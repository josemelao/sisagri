/**
 * Acesso por perfil: o que o visitante anonimo pode ler.
 *
 * Regra: CPF, telefone e e-mail de funcionarios e chassi/RENAVAM de veiculos
 * nunca saem para o anonimo. A escala de ferias e staff-only. Uma colecao
 * negada nao pode derrubar o boot inteiro.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts } from '../helpers/load-script.mjs';

function carregar() {
  const h = carregarScripts(['db.js'], { supabase: false });
  return h;
}

function criarClienteEspiao({ falhar = [], dados = {} } = {}) {
  const chamadas = [];
  const cliente = {
    from(tabela) {
      const consulta = {
        select(colunas) {
          chamadas.push({ tabela, colunas });
          return consulta;
        },
        eq() {
          return consulta;
        },
        order: async () => {
          if (falhar.includes(tabela)) throw new Error(`permission denied: ${tabela}`);
          return { data: dados[tabela] ?? [], error: null };
        },
      };
      return consulta;
    },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  };
  return { cliente, chamadas };
}

function injetar(h, cliente, acessoInterno = false) {
  h.window.__clienteFake = cliente;
  h.run(`_sb = window.__clienteFake; _acessoInterno = ${acessoInterno}; _db = {};`);
}

test('CAMPOS_PUBLICOS existe e cobre funcionarios e veiculos', () => {
  const h = carregar();
  const campos = h.run('typeof CAMPOS_PUBLICOS === "undefined" ? null : CAMPOS_PUBLICOS');
  assert.ok(campos, 'CAMPOS_PUBLICOS ausente');
  assert.ok(campos.funcionarios, 'lista publica de funcionarios ausente');
  assert.ok(campos.veiculos, 'lista publica de veiculos ausente');
});

test('lista publica de funcionarios esconde PII e mantem matricula', () => {
  const h = carregar();
  const campos = h.run('typeof CAMPOS_PUBLICOS === "undefined" ? null : CAMPOS_PUBLICOS');
  assert.ok(campos);
  const colunas = campos.funcionarios.split(',');
  for (const proibida of ['cpf', 'telefone', 'email']) {
    assert.ok(!colunas.includes(proibida), `coluna sensivel exposta: ${proibida}`);
  }
  for (const obrigatoria of ['id', 'nome', 'matricula', 'cargo', 'publish_status']) {
    assert.ok(colunas.includes(obrigatoria), `coluna publica ausente: ${obrigatoria}`);
  }
});

test('lista publica de veiculos esconde chassi e RENAVAM', () => {
  const h = carregar();
  const campos = h.run('typeof CAMPOS_PUBLICOS === "undefined" ? null : CAMPOS_PUBLICOS');
  assert.ok(campos);
  const colunas = campos.veiculos.split(',');
  for (const proibida of ['chassi', 'renavam']) {
    assert.ok(!colunas.includes(proibida), `coluna sensivel exposta: ${proibida}`);
  }
  for (const obrigatoria of ['id', 'nome', 'placa', 'publish_status']) {
    assert.ok(colunas.includes(obrigatoria), `coluna publica ausente: ${obrigatoria}`);
  }
});

test('_colunasDaColecao usa lista publica no anon e * no staff', () => {
  const h = carregar();
  const fn = h.run('typeof _colunasDaColecao === "undefined" ? null : _colunasDaColecao');
  assert.ok(fn, '_colunasDaColecao ausente');
  const campos = h.get('CAMPOS_PUBLICOS');
  assert.equal(fn('funcionarios', false), campos.funcionarios);
  assert.equal(fn('veiculos', false), campos.veiculos);
  assert.equal(fn('funcionarios', true), '*');
  assert.equal(fn('avisos', false), '*');
});

test('anon nao consulta escala e a colecao fica vazia', async () => {
  const h = carregar();
  const { cliente, chamadas } = criarClienteEspiao();
  injetar(h, cliente, false);
  const carregarColecao = h.get('_loadSupabaseCollection');

  await carregarColecao('escalaFerias');

  assert.equal(chamadas.length, 0);
  assert.equal(h.get('_db').escalaFerias.length, 0);
});

test('staff consulta escala', async () => {
  const h = carregar();
  const { cliente, chamadas } = criarClienteEspiao({
    dados: { escala_ferias: [{ id: 1, nome: 'X', publish_status: 'published' }] },
  });
  injetar(h, cliente, true);
  const carregarColecao = h.get('_loadSupabaseCollection');

  await carregarColecao('escalaFerias');

  assert.equal(chamadas.length, 1);
  assert.equal(h.get('_db').escalaFerias.length, 1);
});

test('anon busca funcionarios apenas com as colunas publicas', async () => {
  const h = carregar();
  const { cliente, chamadas } = criarClienteEspiao({
    dados: { funcionarios: [{ id: 1, nome: 'X', publish_status: 'published' }] },
  });
  injetar(h, cliente, false);
  const carregarColecao = h.get('_loadSupabaseCollection');

  await carregarColecao('funcionarios');

  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].colunas, h.get('CAMPOS_PUBLICOS').funcionarios);
});

test('staff busca funcionarios com todas as colunas', async () => {
  const h = carregar();
  const { cliente, chamadas } = criarClienteEspiao({
    dados: { funcionarios: [{ id: 1, nome: 'X', publish_status: 'published' }] },
  });
  injetar(h, cliente, true);
  const carregarColecao = h.get('_loadSupabaseCollection');

  await carregarColecao('funcionarios');

  assert.equal(chamadas[0].colunas, '*');
});

test('colecao negada nao derruba o carregamento das demais', async () => {
  const h = carregar();
  const { cliente } = criarClienteEspiao({
    falhar: ['escala_ferias'],
    dados: { avisos: [{ id: 1, titulo: 'X', publish_status: 'published' }] },
  });
  injetar(h, cliente, true);
  const carregarColecoes = h.run(
    'typeof _carregarColecoesSupabase === "undefined" ? null : _carregarColecoesSupabase'
  );
  assert.ok(carregarColecoes, '_carregarColecoesSupabase ausente');

  await carregarColecoes(['avisos', 'escalaFerias']);

  assert.equal(h.get('_db').avisos.length, 1);
  assert.equal(h.get('_db').escalaFerias.length, 0);
});

test('falha em todas as colecoes continua rejeitando (fallback local)', async () => {
  const h = carregar();
  const { cliente } = criarClienteEspiao({ falhar: ['avisos', 'veiculos'] });
  injetar(h, cliente, true);
  const carregarColecoes = h.get('_carregarColecoesSupabase');

  await assert.rejects(() => carregarColecoes(['avisos', 'veiculos']));
});

test('DB.get("escalaFerias") devolve vazio para anon no index publico', () => {
  const h = carregar();
  h.run('_modoPublico = true; _acessoInterno = false; _db = { escalaFerias: [{ id: 1, nome: "X" }] };');
  const DB = h.get('DB');
  assert.equal(DB.get('escalaFerias').length, 0);

  h.run('_acessoInterno = true;');
  assert.equal(DB.get('escalaFerias').length, 1);
});

test('DB.get("escalaFerias") continua funcionando no painel admin', () => {
  const h = carregar();
  h.run('_modoPublico = false; _acessoInterno = false; _db = { escalaFerias: [{ id: 1, nome: "X" }] };');
  const DB = h.get('DB');
  assert.equal(DB.get('escalaFerias').length, 1);
});

test('resposta atrasada de staff nao entra no _db depois do logout', async () => {
  const h = carregar();
  let resolver;
  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    order: () => new Promise((resolve) => { resolver = resolve; }),
  };
  h.window.__clienteFake = {
    from: () => consulta,
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
  };
  h.run(
    '_sb = window.__clienteFake; _db = {}; _acessoInterno = true; ' +
    '_modoPublico = false; _usuarioAtual = { id: "uid-1" };'
  );

  const promessa = h.get('_loadSupabaseCollection')('funcionarios');
  // Simula o logout: a geracao muda antes de a resposta chegar.
  h.run('_geracaoAuth += 1; _usuarioAtual = null; _acessoInterno = false;');
  resolver({
    data: [{ id: 1, nome: 'X', cpf: '111', publish_status: 'published' }],
    error: null,
  });
  await promessa;

  assert.equal(h.get('_db').funcionarios, undefined);
});

test('falha transitoria preserva o snapshot local da colecao', async () => {
  const h = carregar();
  const { cliente } = criarClienteEspiao({
    falhar: ['avisos'],
    dados: { funcionarios: [{ id: 2, nome: 'Y', publish_status: 'published' }] },
  });
  injetar(h, cliente, true);
  h.run('_db = { avisos: [{ id: 9, titulo: "snapshot", publish_status: "published" }] };');

  await h.get('_carregarColecoesSupabase')(['avisos', 'funcionarios']);

  assert.equal(h.get('_db').avisos[0].id, 9);
  assert.equal(h.get('_db').funcionarios[0].id, 2);
});
