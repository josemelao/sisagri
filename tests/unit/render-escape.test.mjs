/**
 * Testes de saida segura dos renders publicos (Bloco 9b).
 *
 * Cada teste chama o render de verdade com um registro "venenoso" e confere
 * que o HTML gerado nao contem tag/atributo executavel — e que o texto
 * aparece escapado (o visitante ve o texto, nao o codigo).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

const VENENO = '<img src=x onerror="window.__xss=1">';

function montar(ids) {
  const elementos = {};
  for (const id of ids) elementos[id] = criarElemento('div');
  const h = carregarScripts(['js/core/utils.js', 'db.js', 'script.js'], {
    supabase: false,
    elementos,
  });
  return { h, elementos };
}

function semExecucao(html, rotulo) {
  // O texto escapado pode conter a PALAVRA "onerror"; o que não pode existir é
  // o atributo de verdade, que exige a aspa: onerror="
  assert.equal(html.includes('onerror="'), false, `${rotulo}: atributo onerror vazou`);
  assert.equal(html.includes('onmouseover="'), false, `${rotulo}: atributo onmouseover vazou`);
  assert.equal(html.toLowerCase().includes('<script'), false, `${rotulo}: <script> vazou`);
  assert.equal(html.includes('<img src=x'), false, `${rotulo}: tag do payload vazou`);
}

test('renderFuncionarios: nome/cargo com payload nao viram HTML', () => {
  const { h, elementos } = montar(['func-list']);
  h.get('renderFuncionarios')([{
    id: 1,
    nome: VENENO,
    cargo: '" onmouseover="window.__xss=1',
    lotacao: '<b>Setor</b>',
  }]);

  const html = elementos['func-list'].innerHTML;
  semExecucao(html, 'funcionarios');
  assert.ok(html.includes('&lt;img'), 'o texto do nome deveria aparecer escapado');
});

test('renderManuais: titulo/categoria escapados e passos contados', () => {
  const { h, elementos } = montar(['manuais-list']);
  h.get('renderManuais')([{
    id: 7,
    titulo: VENENO,
    categoria: '<b>Cat</b>',
    passos: [{ texto: 'ok' }, { texto: 'ok2' }],
  }]);

  const html = elementos['manuais-list'].innerHTML;
  semExecucao(html, 'manuais');
  assert.ok(html.includes('2 etapas'));
});

test('renderProcessos: titulo/categoria escapados', () => {
  const { h, elementos } = montar(['processos-list']);
  h.get('renderProcessos')([{
    id: 4,
    titulo: VENENO,
    categoria: '<i>Cat</i>',
    etapas: [{ titulo: 'a', descricao: 'b' }],
  }]);

  semExecucao(elementos['processos-list'].innerHTML, 'processos');
});

test('renderSistemas: descricao/url/categoria escapados', () => {
  const { h, elementos } = montar(['sistemas-list']);
  h.get('renderSistemas')([{
    id: 1,
    nome: VENENO,
    nome_completo: '<b>Nome</b>',
    descricao: '<script>alert(1)</script>',
    orgao: '<i>Orgao</i>',
    url: 'javascript:alert(1)',
    cor: '#fff',
    icone: 'ph-x',
  }]);

  const html = elementos['sistemas-list'].innerHTML;
  semExecucao(html, 'sistemas');
  assert.equal(html.includes('javascript:'), false, 'href javascript: nao pode sair');
});

test('renderServicos: descricao/publico/obs escapados', () => {
  const { h, elementos } = montar(['servicos-list']);
  h.get('renderServicos')([{
    id: 1,
    nome: VENENO,
    categoria: 'X',
    descricao: '<script>alert(1)</script>',
    publico: '" onfocus="x',
    cor: '#fff',
    icone: 'ph-x',
  }]);

  semExecucao(elementos['servicos-list'].innerHTML, 'servicos');
});

test('renderVeiculos: nome/marca/placa escapados', () => {
  const { h, elementos } = montar(['veiculos-list']);
  h.get('renderVeiculos')([{
    id: 1,
    nome: VENENO,
    marca: '<b>M</b>',
    modelo: '" onload="x',
    ano: '2020',
    situacao: 'Em operação',
    cor: '#fff',
    icone: 'ph-x',
  }]);

  semExecucao(elementos['veiculos-list'].innerHTML, 'veiculos');
});

test('renderJuridico: titulo e status escapados', () => {
  const { h, elementos } = montar(['juridico-list']);
  h.get('renderJuridico')([{
    id: 1,
    titulo: VENENO,
    cor: '#fff',
    icone: 'ph-x',
    campos: [{ label: 'a', valor: 'b' }],
  }]);

  semExecucao(elementos['juridico-list'].innerHTML, 'juridico');
});

/* ==========================================================================
   O unico HTML permitido: <a href> em campos de informacao
   ========================================================================== */

test('camposGridHTML: link https continua clicavel', () => {
  const { h } = montar([]);
  const html = h.get('camposGridHTML')([
    { label: 'Site', valor: '<a style="text-decoration: underline;" href="https://exemplo.gov.br/">LINK</a>' },
  ]);

  assert.ok(html.includes('<a href="https://exemplo.gov.br/"'), 'link deveria continuar como <a>');
  assert.ok(html.includes('>LINK</a>'), 'texto do link deveria aparecer');
});

test('camposGridHTML: href javascript: vira texto, nao link', () => {
  const { h } = montar([]);
  const html = h.get('camposGridHTML')([
    { label: 'Site', valor: '<a href="javascript:alert(1)">clique</a>' },
  ]);

  assert.equal(html.includes('href="javascript:'), false);
  assert.equal(html.includes('<a '), false, 'nao deveria sobrar link');
});

test('camposGridHTML: tag dentro do link nao executa', () => {
  const { h } = montar([]);
  const html = h.get('camposGridHTML')([
    { label: 'Site', valor: '<a href="https://ok">x<img src=x onerror=alert(1)></a>' },
  ]);

  assert.equal(html.includes('<img'), false);
  assert.equal(html.includes('&lt;img'), true, 'a tag deveria aparecer como texto');
});

test('camposGridHTML: label tambem e escapado', () => {
  const { h } = montar([]);
  const html = h.get('camposGridHTML')([
    { label: '<img src=x onerror=1>', valor: 'ok' },
  ]);

  assert.equal(html.includes('<img'), false);
});
