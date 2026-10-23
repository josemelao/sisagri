/**
 * Bloco 13 (T13.7) — frescor do app publico ao entrar no modulo.
 *
 * O app deve mostrar o cache na hora e revalidar em segundo plano. Se a rede
 * falhar, a tela anterior continua. Se o usuario sair do modulo antes da
 * resposta, a resposta atrasada nao pode renderizar a pagina errada.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

const VEICULO_ANTIGO = {
  id: 1,
  nome: 'Veiculo Antigo',
  marca: 'Marca A',
  modelo: 'Modelo A',
  ano: 2020,
  situacao: 'Em operacao',
  cor: '#123456',
  icone: 'ph-car',
  publish_status: 'published',
};

const VEICULO_NOVO = {
  id: 2,
  nome: 'Veiculo Novo',
  marca: 'Marca B',
  modelo: 'Modelo B',
  ano: 2026,
  situacao: 'Em operacao',
  cor: '#654321',
  icone: 'ph-car',
  publish_status: 'published',
};

const FUNCIONARIO_ANTIGO = {
  id: 1,
  nome: 'Servidor Antigo',
  cargo: 'Analista',
  lotacao: 'SMADER',
  publish_status: 'published',
};

const FUNCIONARIO_NOVO = {
  id: 2,
  nome: 'Servidor Novo',
  cargo: 'Gestor',
  lotacao: 'SMADER',
  publish_status: 'published',
};

const consoleSilencioso = {
  log() {},
  info() {},
  warn() {},
  error() {},
  debug() {},
};

async function montar() {
  const paginaDashboard = criarElemento('section');
  const paginaFuncionarios = criarElemento('section');
  const paginaVeiculos = criarElemento('section');
  const listaFuncionarios = criarElemento('div');
  const listaVeiculos = criarElemento('div');
  const main = criarElemento('main');
  main.scrollTo = () => {};

  const h = carregarScripts(
    ['js/core/utils.js', 'db.js', 'script.js'],
    {
      supabase: false,
      console: consoleSilencioso,
      dadosIniciais: {
        funcionarios: [FUNCIONARIO_ANTIGO],
        veiculos: [VEICULO_ANTIGO],
      },
      elementos: {
        'page-dashboard': paginaDashboard,
        'page-funcionarios': paginaFuncionarios,
        'page-veiculos': paginaVeiculos,
        'func-list': listaFuncionarios,
        'veiculos-list': listaVeiculos,
        'main-content': main,
      },
    },
  );

  await h.window.dbInit();
  h.run(`
    carregarDados();
    modulosInicializados.add("dashboard");
    modulosInicializados.add("funcionarios");
    modulosInicializados.add("veiculos");
    renderFuncionarios(funcionarios);
    renderVeiculos(veiculos);
  `);

  h.window.document.querySelectorAll = (seletor) => {
    if (seletor === '.page') return [paginaDashboard, paginaFuncionarios, paginaVeiculos];
    return [];
  };
  h.window.history.pushState = (estado, titulo, url) => {
    h.window.location.hash = url;
  };

  return { h, listaFuncionarios, listaVeiculos };
}

async function esperarSincronizacao() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test('ao navegar para veiculos, atualiza a colecao e re-renderiza sem F5', async () => {
  const { h, listaVeiculos } = await montar();
  const chamadas = [];

  h.window.DB.refreshCollection = async (colecao) => {
    chamadas.push(colecao);
    await h.window.DB.replaceCollection('veiculos', [VEICULO_NOVO]);
    return h.window.DB.get(colecao);
  };

  h.get('navigateTo')('veiculos');
  await esperarSincronizacao();

  assert.deepEqual(chamadas, ['veiculos']);
  assert.match(listaVeiculos.innerHTML, /Veiculo Novo/);
  assert.doesNotMatch(listaVeiculos.innerHTML, /Veiculo Antigo/);
});

test('se a atualizacao falhar, mantem a lista que ja estava na tela', async () => {
  const { h, listaVeiculos } = await montar();
  const chamadas = [];

  assert.match(listaVeiculos.innerHTML, /Veiculo Antigo/);

  h.window.DB.refreshCollection = async (colecao) => {
    chamadas.push(colecao);
    throw new Error('sem internet');
  };

  h.get('navigateTo')('veiculos');
  await esperarSincronizacao();

  assert.deepEqual(chamadas, ['veiculos']);
  assert.match(listaVeiculos.innerHTML, /Veiculo Antigo/);
  assert.doesNotMatch(listaVeiculos.innerHTML, /Veiculo Novo/);
});

test('navegacao sincroniza, mas a abertura inicial nao', async () => {
  const { h } = await montar();
  const chamadas = [];

  h.window.DB.refreshCollection = async (colecao) => {
    chamadas.push(colecao);
  };

  h.window.location.hash = '#/veiculos';
  h.get('initNavigation')();
  await esperarSincronizacao();

  assert.deepEqual(chamadas, [], 'boot nao deve buscar de novo');

  h.get('navigateTo')('funcionarios');
  await esperarSincronizacao();

  assert.deepEqual(chamadas, ['funcionarios']);
});

test('resposta atrasada nao renderiza o modulo que ja saiu da tela', async () => {
  const { h, listaVeiculos } = await montar();
  let liberar;
  const chamadas = [];

  h.window.DB.refreshCollection = (colecao) => {
    chamadas.push(colecao);
    return new Promise((resolve) => {
      liberar = async () => {
        await h.window.DB.replaceCollection('veiculos', [VEICULO_NOVO]);
        resolve(h.window.DB.get(colecao));
      };
    });
  };

  h.get('navigateTo')('veiculos');
  h.get('navigateTo')('dashboard');
  await liberar();
  await esperarSincronizacao();

  assert.deepEqual(chamadas, ['veiculos']);
  assert.match(listaVeiculos.innerHTML, /Veiculo Antigo/);
  assert.doesNotMatch(listaVeiculos.innerHTML, /Veiculo Novo/);
});

test('nao re-renderiza o modulo se houver detalhe aberto', async () => {
  const { h, listaVeiculos } = await montar();
  const chamadas = [];
  const detalhe = criarElemento('div');
  detalhe.classList.add('open');

  h.window.document.querySelector = (seletor) => (
    seletor === '.detail-overlay.open' ? detalhe : null
  );
  h.window.DB.refreshCollection = async (colecao) => {
    chamadas.push(colecao);
    await h.window.DB.replaceCollection('veiculos', [VEICULO_NOVO]);
    return h.window.DB.get(colecao);
  };

  h.get('navigateTo')('veiculos');
  await esperarSincronizacao();

  assert.deepEqual(chamadas, ['veiculos']);
  assert.match(listaVeiculos.innerHTML, /Veiculo Antigo/);
});

test('funcionarios renova as URLs assinadas antes de re-renderizar', async () => {
  const { h, listaFuncionarios } = await montar();
  const eventos = [];
  const getOriginal = h.window.DB.get.bind(h.window.DB);

  h.window.DB.refreshCollection = async () => {
    eventos.push('refresh');
  };
  h.window.DB.resolveStorageUrls = async () => {
    eventos.push('resolve');
  };
  h.window.DB.get = (colecao) => (
    colecao === 'funcionarios' ? [FUNCIONARIO_NOVO] : getOriginal(colecao)
  );

  h.get('navigateTo')('funcionarios');
  await esperarSincronizacao();

  assert.deepEqual(eventos, ['refresh', 'resolve']);
  assert.match(listaFuncionarios.innerHTML, /Servidor Novo/);
});
