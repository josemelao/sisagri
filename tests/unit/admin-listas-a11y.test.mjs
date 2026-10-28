/**
 * Bloco 12 — T12.5: acessibilidade das listas do admin.
 *
 * Trava, para os 14 modulos (15 tabelas, porque Informacoes tem duas):
 *   - busca com nome acessivel (`aria-label`);
 *   - contador e indicador de pagina em regiao viva (`role="status"`);
 *   - botoes de paginacao com rotulo que inclui o modulo;
 *   - tabela com `caption` so para leitor de tela e `th scope="col"`;
 *   - re-render da secao devolve o foco ao mesmo controle (teclado).
 */

import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

const LISTAS = [
  {
    nome: 'Funcionários',
    colecao: 'funcionarios',
    secao: 'section-funcionarios',
    busca: 'funcionarios-search',
    render: (h) => h.get('renderFuncionarios')(),
  },
  {
    nome: 'Manuais',
    colecao: 'manuais',
    secao: 'section-manuais',
    busca: 'manuais-search',
    render: (h) => h.get('renderManuais')(),
  },
  {
    nome: 'Processos',
    colecao: 'processos',
    secao: 'section-processos',
    busca: 'processos-search',
    render: (h) => h.get('renderProcessos')(),
  },
  {
    nome: 'Arquivos',
    colecao: 'arquivos',
    secao: 'section-arquivos',
    busca: 'arquivos-search',
    render: (h) => h.get('renderArquivos')(),
  },
  {
    nome: 'Veículos',
    colecao: 'veiculos',
    secao: 'section-veiculos',
    busca: 'veiculos-search',
    render: (h) => h.get('renderVeiculos')(),
  },
  {
    nome: 'Sistemas',
    colecao: 'sistemas',
    secao: 'section-sistemas',
    busca: 'sistemas-search',
    render: (h) => h.get('renderSistemas')(),
  },
  {
    nome: 'Serviços',
    colecao: 'servicos',
    secao: 'section-servicos',
    busca: 'servicos-search',
    render: (h) => h.get('renderServicos')(),
  },
  {
    nome: 'Avisos',
    colecao: 'avisos',
    secao: 'section-avisos',
    busca: 'avisos-search',
    render: (h) => h.get('renderAvisos')(),
  },
  {
    nome: 'Eventos',
    colecao: 'agendaEventos',
    secao: 'section-agendaEventos',
    busca: 'agenda-search',
    render: (h) => h.get('renderAgendaEventos')(),
  },
  {
    nome: 'Escala de Férias',
    colecao: 'escalaFerias',
    secao: 'section-escalaFerias',
    busca: 'escala-search',
    render: (h) => h.get('renderEscalaFerias')(),
  },
  {
    nome: 'Acesso Rápido',
    colecao: 'acessoRapido',
    secao: 'section-acessoRapido',
    busca: 'acesso-search',
    render: (h) => h.get('renderAcessoRapido')(),
  },
  {
    nome: 'Informações da Secretaria',
    colecao: 'infoJuridico',
    secao: 'section-infoJuridico',
    busca: 'infosimples-search-infoJuridico',
    render: (h) => h.get('renderInfoSimples')('infoJuridico', 'Secretaria', 'Informações da Secretaria'),
  },
  {
    nome: 'Informações do Município',
    colecao: 'infoMunicipio',
    secao: 'section-infoMunicipio',
    busca: 'infosimples-search-infoMunicipio',
    render: (h) => h.get('renderInfoSimples')('infoMunicipio', 'Município e Prefeitura', 'Informações do Município'),
  },
  {
    nome: 'Órgãos Externos',
    colecao: 'infoOrgaos',
    secao: 'section-infoOrgaos',
    busca: 'orgaos-search',
    render: (h) => h.get('renderInfoOrgaos')(),
  },
  {
    nome: 'Histórico',
    colecao: 'auditoria',
    secao: 'section-auditoria',
    busca: 'auditoria-search',
    render: (h) => h.get('renderAuditoria')(),
  },
];

let ambiente;

before(async () => {
  const secoes = {};
  const elementos = {
    'login-email': criarElemento('input'),
    'login-senha': criarElemento('input'),
    modal: criarElemento('div'),
  };
  const dados = {};

  for (const lista of LISTAS) {
    secoes[lista.secao] = criarElemento('section');
    elementos[lista.secao] = secoes[lista.secao];
    elementos[lista.busca] = criarElemento('input');
    dados[lista.colecao] = [];
  }

  const h = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'],
    { supabase: false, dadosIniciais: dados, elementos },
  );
  await h.get('dbInit')();
  ambiente = { h, secoes };
});

for (const lista of LISTAS) {
  test(`${lista.nome}: tabela, busca e paginação acessíveis`, () => {
    const { h, secoes } = ambiente;
    lista.render(h);
    const html = secoes[lista.secao].innerHTML;
    const rotulo = `${lista.nome} (${lista.colecao})`;

    assert.ok(
      html.includes(`<caption class="sr-only">${lista.nome}</caption>`),
      `${rotulo}: falta <caption class="sr-only">`,
    );
    assert.match(html, /<th scope="col">/, `${rotulo}: falta scope="col" nos th`);

    const tagBusca = (html.match(new RegExp(`<input[^>]*id="${lista.busca}"[^>]*>`)) || [''])[0];
    assert.match(tagBusca, /aria-label="[^"]+"/, `${rotulo}: busca sem aria-label`);

    assert.match(
      html,
      /class="badge" role="status" aria-live="polite" aria-atomic="true"/,
      `${rotulo}: contador sem regiao viva`,
    );
    assert.match(
      html,
      /role="status" aria-live="polite" aria-atomic="true"[^>]*>Pagina /,
      `${rotulo}: indicador de pagina sem regiao viva`,
    );
    assert.match(
      html,
      /aria-label="Página anterior — [^"]+"/,
      `${rotulo}: botao Anterior sem rotulo`,
    );
    assert.match(
      html,
      /aria-label="Próxima — [^"]+"/,
      `${rotulo}: botao Proxima sem rotulo`,
    );
  });
}

test('re-render devolve o foco ao mesmo controle da lista', () => {
  const { h } = ambiente;
  const secao = criarElemento('section');
  const antigo = criarElemento('button');
  antigo.dataset = { acao: 'pagina-arquivos', delta: '1' };

  let focado = 0;
  const novo = criarElemento('button');
  novo.focus = () => { focado += 1; };

  secao.contains = (el) => el === antigo;
  secao.querySelector = (seletor) => (
    seletor === '[data-acao="pagina-arquivos"][data-delta="1"]' ? novo : null
  );

  h.window.document.activeElement = antigo;
  try {
    h.get('renderAdminSectionWithTableAnimation')(secao, '<p>pagina 2</p>');
  } finally {
    h.window.document.activeElement = null;
  }

  assert.equal(secao.innerHTML, '<p>pagina 2</p>');
  assert.equal(focado, 1, 'o foco deve voltar para o botao equivalente');
});

test('se o botao equivalente fica desabilitado, o foco vai para o oposto', () => {
  const { h } = ambiente;
  const secao = criarElemento('section');
  const antigo = criarElemento('button');
  antigo.dataset = { acao: 'pagina-arquivos', delta: '1' };

  const proximaDesabilitada = criarElemento('button');
  proximaDesabilitada.disabled = true;

  let focado = 0;
  const anterior = criarElemento('button');
  anterior.focus = () => { focado += 1; };

  secao.contains = (el) => el === antigo;
  secao.querySelector = (seletor) => {
    if (seletor === '[data-acao="pagina-arquivos"][data-delta="1"]') return proximaDesabilitada;
    if (seletor === '[data-acao="pagina-arquivos"][data-delta="-1"]') return anterior;
    return null;
  };

  h.window.document.activeElement = antigo;
  try {
    h.get('renderAdminSectionWithTableAnimation')(secao, '<p>ultima pagina</p>');
  } finally {
    h.window.document.activeElement = null;
  }

  assert.equal(focado, 1, 'o foco deve ir para o botao Anterior');
});

test('re-render nao rouba o foco de fora da secao', () => {
  const { h } = ambiente;
  const secao = criarElemento('section');
  const antigo = criarElemento('button');
  antigo.dataset = { acao: 'pagina-arquivos', delta: '1' };

  let focado = 0;
  const novo = criarElemento('button');
  novo.focus = () => { focado += 1; };

  secao.contains = () => false;
  secao.querySelector = () => novo;

  h.window.document.activeElement = antigo;
  try {
    h.get('renderAdminSectionWithTableAnimation')(secao, '<p>conteudo</p>');
  } finally {
    h.window.document.activeElement = null;
  }

  assert.equal(focado, 0);
});
