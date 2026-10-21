/**
 * Testes do motor de listas do admin (`SisListas.createListController`).
 *
 * Escritos ANTES da implementacao (T11.1 do Bloco 11). O controlador nao
 * conhece DOM nem `DB`: recebe `filter`, `sort` e `render` prontos, para que
 * os modulos migrados mantenham exatamente o comportamento atual.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { carregarScripts, criarElemento, criarLocalStorage } from '../helpers/load-script.mjs';

function carregar(opcoes = {}) {
  return carregarScripts(['js/admin/list-controller.js'], opcoes);
}

function criarControlador(h, opcoes = {}) {
  return h.window.SisListas.createListController({
    colecao: 'teste',
    stateKey: 'estado-teste',
    ...opcoes,
  });
}

function nomes(resultado) {
  return [...resultado.itens].map((item) => item.nome);
}

const ITENS = [
  { nome: 'Milho' },
  { nome: 'Soja' },
  { nome: 'Feijao' },
  { nome: 'Arroz' },
  { nome: 'Trigo' },
];

const FILTRO_NOME = (lista, query) => {
  const q = String(query || '').toLowerCase();
  if (!q) return lista;
  return lista.filter((item) => String(item.nome || '').toLowerCase().includes(q));
};

test('setQuery aplica o filtro e devolve para a primeira pagina', () => {
  const h = carregar();
  const c = criarControlador(h, { pageSize: 10, filter: FILTRO_NOME });

  c.setItems(ITENS);
  assert.equal(c.getState().total, 5);

  c.setPage(2);
  c.setQuery('so');

  const estado = c.getState();
  assert.deepEqual(nomes(estado), ['Soja']);
  assert.equal(estado.total, 1);
  assert.equal(estado.pagina, 1);
});

test('setQuery com valor nulo vira busca vazia', () => {
  const h = carregar();
  const c = criarControlador(h, { filter: FILTRO_NOME });

  c.setItems(ITENS);
  c.setQuery('soja');
  c.setQuery(null);

  assert.equal(c.getState().query, '');
  assert.equal(c.getState().total, 5);
});

test('setPage pagina, limita ao intervalo e guarda a pagina valida', () => {
  const h = carregar();
  const c = criarControlador(h, { pageSize: 2, filter: FILTRO_NOME });

  c.setItems(ITENS);

  assert.equal(c.getState().totalPaginas, 3);

  c.setPage(2);
  assert.deepEqual(nomes(c.getState()), ['Feijao', 'Arroz']);

  c.setPage(99);
  assert.equal(c.getState().pagina, 3);
  assert.deepEqual(nomes(c.getState()), ['Trigo']);

  c.setPage(-5);
  assert.equal(c.getState().pagina, 1);
});

test('colecao vazia nao quebra e sinaliza vazio', () => {
  const h = carregar();
  const c = criarControlador(h, { pageSize: 2, filter: FILTRO_NOME });

  c.setItems([]);

  const estado = c.getState();
  assert.equal(estado.total, 0);
  assert.equal(estado.totalPaginas, 1);
  assert.equal(estado.pagina, 1);
  assert.deepEqual([...estado.itens], []);
  assert.equal(estado.vazio, true);
  assert.equal(estado.semResultado, false);
});

test('busca sem resultado distingue de colecao vazia', () => {
  const h = carregar();
  const c = criarControlador(h, { filter: FILTRO_NOME });

  c.setItems(ITENS);
  c.setQuery('mandioca');

  const estado = c.getState();
  assert.equal(estado.total, 0);
  assert.equal(estado.vazio, true);
  assert.equal(estado.semResultado, true);
});

test('render recebe o estado calculado a cada mudanca', () => {
  const h = carregar();
  const chamadas = [];
  const c = criarControlador(h, {
    pageSize: 2,
    filter: FILTRO_NOME,
    render: (resultado) => chamadas.push(resultado),
  });

  c.setItems(ITENS);
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].total, 5);
  assert.equal(chamadas[0].totalPaginas, 3);
  assert.equal(chamadas[0].pagina, 1);
  assert.deepEqual(nomes(chamadas[0]), ['Milho', 'Soja']);

  c.setPage(3);
  assert.equal(chamadas.length, 2);
  assert.equal(chamadas[1].pagina, 3);
  assert.deepEqual(nomes(chamadas[1]), ['Trigo']);

  c.setQuery('arroz');
  assert.equal(chamadas.length, 3);
  assert.equal(chamadas[2].total, 1);
  assert.deepEqual(nomes(chamadas[2]), ['Arroz']);
});

test('persiste query e pagina por colecao e restaura em outro controlador', () => {
  const h = carregar();
  const storage = criarLocalStorage();
  const base = { stateKey: 'estado-persistido', storage, pageSize: 2, filter: FILTRO_NOME };

  const primeiro = criarControlador(h, { ...base, colecao: 'manuais' });
  primeiro.setItems(ITENS);
  primeiro.setQuery('a');
  primeiro.setPage(2);

  const segundo = criarControlador(h, { ...base, colecao: 'manuais' });
  segundo.setItems(ITENS);

  assert.equal(segundo.getState().query, 'a');
  assert.equal(segundo.getState().pagina, 2);

  const outro = criarControlador(h, { ...base, colecao: 'arquivos' });
  outro.setItems(ITENS);
  assert.equal(outro.getState().query, '');
  assert.equal(outro.getState().pagina, 1);
});

test('estado persistido invalido nao derruba o controlador', () => {
  const storage = criarLocalStorage({ 'estado-corrompido': '{isso nao e json' });
  const h = carregar();

  const c = criarControlador(h, { colecao: 'manuais', stateKey: 'estado-corrompido', storage });
  c.setItems(ITENS);

  assert.equal(c.getState().query, '');
  assert.equal(c.getState().pagina, 1);
});

test('storage que lanca excecao nao interrompe a lista', () => {
  const storage = {
    getItem() { throw new Error('bloqueado'); },
    setItem() { throw new Error('bloqueado'); },
  };
  const h = carregar();

  const c = criarControlador(h, { colecao: 'manuais', stateKey: 'k', storage, filter: FILTRO_NOME });
  c.setItems(ITENS);
  c.setQuery('soja');

  assert.equal(c.getState().total, 1);
});

test('aplicarBusca le o input, preserva o cursor e volta para a pagina 1', () => {
  const input = criarElemento('input');
  input.value = 'Arroz';
  input.selectionStart = 3;
  input.setSelectionRange = (inicio, fim) => {
    input.selectionStart = inicio;
    input.selectionEnd = fim;
  };
  const focos = [];
  input.focus = () => focos.push(input.value);

  const h = carregar({ elementos: { 'busca-teste': input } });
  const c = criarControlador(h, {
    stateKey: 'estado-busca',
    pageSize: 2,
    filter: FILTRO_NOME,
    searchInputId: 'busca-teste',
  });

  c.setItems(ITENS);
  c.setPage(2);
  c.aplicarBusca(input);

  assert.equal(c.getState().query, 'Arroz');
  assert.equal(c.getState().pagina, 1);
  assert.equal(input.selectionStart, 3);
  assert.equal(input.selectionEnd, 3);
  assert.equal(focos.length, 1);
});

test('aplicarBusca sem input encontrado ainda aplica a busca vazia', () => {
  const h = carregar();
  const c = criarControlador(h, {
    stateKey: 'estado-busca-sem-input',
    filter: FILTRO_NOME,
    searchInputId: 'nao-existe',
  });

  c.setItems(ITENS);
  c.setQuery('soja');
  c.aplicarBusca();

  assert.equal(c.getState().query, '');
  assert.equal(c.getState().total, 5);
});

test('ordena com o comparador injetado sem alterar o array original', () => {
  const h = carregar();
  const original = [{ nome: 'b' }, { nome: 'a' }];
  const c = criarControlador(h, {
    stateKey: 'estado-ordem',
    filter: FILTRO_NOME,
    sort: (lista) => [...lista].sort((x, y) => x.nome.localeCompare(y.nome)),
  });

  c.setItems(original);

  assert.deepEqual(nomes(c.getState()), ['a', 'b']);
  assert.deepEqual(original.map((item) => item.nome), ['b', 'a']);
});

test('filtro que devolve valor invalido vira lista vazia', () => {
  const h = carregar();
  const c = criarControlador(h, {
    stateKey: 'estado-filtro-invalido',
    filter: () => null,
  });

  c.setItems(ITENS);

  assert.equal(c.getState().total, 0);
  assert.equal(c.getState().vazio, true);
});

test('pageSize invalido cai no padrao de 12', () => {
  const h = carregar();
  const c = criarControlador(h, { stateKey: 'estado-page-size', pageSize: 0 });

  c.setItems(Array.from({ length: 13 }, (_, i) => ({ nome: `Item ${i}` })));

  assert.equal(c.getState().pageSize, 12);
  assert.equal(c.getState().totalPaginas, 2);
});

test('admin.html carrega o controlador antes do admin.js', () => {
  const html = fs.readFileSync(new URL('../../admin.html', import.meta.url), 'utf8');
  const posControlador = html.indexOf('src="js/admin/list-controller.js"');
  const posAdmin = html.indexOf('src="admin.js"');

  assert.ok(posControlador > 0, 'admin.html deve carregar js/admin/list-controller.js');
  assert.ok(posAdmin > posControlador, 'o controlador deve ser carregado antes de admin.js');
});
