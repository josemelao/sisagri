/**
 * Bloco 13 (T13.1) — roteamento por hash no app publico.
 *
 * Trava o que o dono pediu: F5 mantem a pagina, link direto abre a pagina
 * certa, voltar/avancar do navegador funciona e os links da navegacao
 * deixam de ser `href="#"`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

const PAGINAS = [
  'dashboard',
  'funcionarios',
  'manuais',
  'processos',
  'arquivos',
  'informacoes',
  'veiculos',
  'sistemas',
  'servicos',
  'agenda',
  'relatorios',
];

function montar(hashInicial = '') {
  const paginaDashboard = criarElemento('section');
  const paginaFuncionarios = criarElemento('section');
  const paginaManuais = criarElemento('section');
  const paginaRelatorios = criarElemento('section');
  const main = criarElemento('main');
  main.scrollTo = () => {};

  const h = carregarScripts(
    ['js/core/utils.js', 'db.js', 'script.js'],
    {
      supabase: false,
      dadosIniciais: {},
      elementos: {
        'page-dashboard': paginaDashboard,
        'page-funcionarios': paginaFuncionarios,
        'page-manuais': paginaManuais,
        'page-relatorios': paginaRelatorios,
        'main-content': main,
        sidebar: criarElemento('aside'),
      },
    },
  );

  // O fake nao troca as paginas sozinho; devolve as secoes de teste.
  h.window.document.querySelectorAll = (seletor) => (
    seletor === '.page'
      ? [paginaDashboard, paginaFuncionarios, paginaManuais, paginaRelatorios]
      : []
  );

  h.window.location.hash = hashInicial;

  const pushes = [];
  const replaces = [];
  h.window.history.pushState = (estado, titulo, url) => {
    pushes.push(url);
    h.window.location.hash = url;
  };
  h.window.history.replaceState = (estado, titulo, url) => {
    replaces.push(url);
    h.window.location.hash = url;
  };

  h.run(`
    modulosInicializados.add("dashboard");
    modulosInicializados.add("funcionarios");
    modulosInicializados.add("manuais");
  `);

  return { h, paginaDashboard, paginaFuncionarios, paginaManuais, paginaRelatorios, pushes, replaces };
}

test('navigateTo troca a pagina e grava o hash', () => {
  const { h, paginaDashboard, paginaFuncionarios, pushes } = montar();

  h.get('navigateTo')('funcionarios');

  assert.equal(paginaFuncionarios.classList.contains('active'), true);
  assert.equal(paginaDashboard.classList.contains('active'), false);
  assert.deepEqual(pushes, ['#/funcionarios']);
  assert.equal(h.window.location.hash, '#/funcionarios');
});

test('paginaDoHash aceita #/pagina e #pagina e rejeita desconhecida', () => {
  const { h } = montar();
  const paginaDoHash = h.get('paginaDoHash');

  h.window.location.hash = '#/manuais';
  assert.equal(paginaDoHash(), 'manuais');

  h.window.location.hash = '#manuais';
  assert.equal(paginaDoHash(), 'manuais');

  h.window.location.hash = '#/nao-existe';
  assert.equal(paginaDoHash(), '');

  h.window.location.hash = '';
  assert.equal(paginaDoHash(), '');
});

test('initNavigation abre a pagina do hash (F5 / link direto)', () => {
  const { h, paginaDashboard, paginaManuais, replaces } = montar('#/manuais');

  h.get('initNavigation')();

  assert.equal(paginaManuais.classList.contains('active'), true);
  assert.equal(paginaDashboard.classList.contains('active'), false);
  assert.deepEqual(replaces, [], 'hash ja canonico nao precisa ser reescrito');
});

test('initNavigation canonicaliza hash sem barra', () => {
  const { h, paginaManuais, replaces } = montar('#manuais');

  h.get('initNavigation')();

  assert.equal(paginaManuais.classList.contains('active'), true);
  assert.deepEqual(replaces, ['#/manuais']);
});

test('hashchange aplica a pagina sem criar nova entrada', () => {
  const { h, paginaFuncionarios, pushes } = montar('#/dashboard');
  h.get('initNavigation')();

  h.window.location.hash = '#/funcionarios';
  h.disparar('hashchange');

  assert.equal(paginaFuncionarios.classList.contains('active'), true);
  assert.deepEqual(pushes, []);
});

test('hash invalido cai no dashboard e corrige a URL', () => {
  const { h, paginaDashboard, replaces } = montar('#/nao-existe');

  h.get('initNavigation')();

  assert.equal(paginaDashboard.classList.contains('active'), true);
  assert.deepEqual(replaces, ['#/dashboard']);
});

test('anon nao abre relatorios por hash direto', () => {
  const { h, paginaDashboard, paginaRelatorios, replaces } = montar('#/relatorios');

  h.get('initNavigation')();

  assert.equal(paginaRelatorios.classList.contains('active'), false);
  assert.equal(paginaDashboard.classList.contains('active'), true);
  assert.deepEqual(replaces, ['#/dashboard']);
});

test('staff abre relatorios por hash direto', () => {
  const { h, paginaRelatorios } = montar('#/relatorios');
  h.run('_acessoInterno = true;');

  h.get('initNavigation')();

  assert.equal(paginaRelatorios.classList.contains('active'), true);
});

test('anon que pede relatorios e redirecionado no navigateTo', () => {
  const { h, paginaDashboard, pushes } = montar();

  h.get('navigateTo')('relatorios');

  assert.equal(paginaDashboard.classList.contains('active'), true);
  assert.deepEqual(pushes, ['#/dashboard']);
});

test('navegar para a pagina atual nao duplica o historico', () => {
  const { h, pushes } = montar('#/funcionarios');

  h.get('navigateTo')('funcionarios');

  assert.deepEqual(pushes, []);
});

test('os links da navegacao usam hash e batem com data-page', () => {
  const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

  assert.equal((html.match(/href="#"/g) || []).length, 0, 'nao deve sobrar href="#"');

  for (const pagina of PAGINAS) {
    assert.match(
      html,
      new RegExp(`href="#/${pagina}"[^>]*data-page="${pagina}"`),
      `link da pagina ${pagina} sem hash correspondente`,
    );
  }

  assert.match(html, /href="#\/funcionarios"[^>]*data-acao="navegar"/);
  assert.equal((html.match(/href="#\/agenda"[^>]*data-nav="agenda"/g) || []).length, 2);
});
