/**
 * Bloco 11 (T11.3) — Agenda, Escala de Ferias e Acesso Rapido no motor.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

const MODULOS = [
  {
    colecao: 'agendaEventos',
    secao: 'section-agendaEventos',
    busca: 'agenda-search',
    render: 'renderAgendaEventos',
    buscar: 'atualizarBuscaAgenda',
    paginar: 'mudarPaginaAgenda',
    item: (id, nome) => ({
      id,
      titulo: nome,
      tipo: 'reuniao',
      local: 'Sede',
      data: '2026-01-10',
    }),
  },
  {
    colecao: 'escalaFerias',
    secao: 'section-escalaFerias',
    busca: 'escala-search',
    render: 'renderEscalaFerias',
    buscar: 'atualizarBuscaEscala',
    paginar: 'mudarPaginaEscala',
    item: (id, nome) => ({
      id,
      nome,
      cargo: 'Agente',
      periodo_inicio: '2026-01-10',
      periodo_fim: '2026-01-20',
    }),
  },
  {
    colecao: 'acessoRapido',
    secao: 'section-acessoRapido',
    busca: 'acesso-search',
    render: 'renderAcessoRapido',
    buscar: 'atualizarBuscaAcesso',
    paginar: 'mudarPaginaAcesso',
    item: (id, nome) => ({
      id,
      titulo: nome,
      url: `https://exemplo.test/${id}`,
      icone: 'link',
    }),
  },
];

function criarItens(modulo, total) {
  return Array.from({ length: total }, (_, indice) => {
    const numero = String(indice + 1).padStart(2, '0');
    return modulo.item(indice + 1, `Item ${numero}`);
  });
}

async function carregar(modulo, itens) {
  const secao = criarElemento('section');
  const busca = criarElemento('input');
  const h = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'],
    {
      supabase: false,
      dadosIniciais: { [modulo.colecao]: itens },
      elementos: {
        'login-email': criarElemento('input'),
        'login-senha': criarElemento('input'),
        modal: criarElemento('div'),
        [modulo.secao]: secao,
        [modulo.busca]: busca,
      },
    },
  );
  await h.get('dbInit')();
  return { h, secao, busca };
}

for (const modulo of MODULOS) {
  test(`${modulo.colecao}: render, paginacao, busca e persistencia do estado`, async () => {
    const itens = criarItens(modulo, 13);
    itens[4] = modulo.item(5, 'Registro Único');
    const { h, secao, busca } = await carregar(modulo, itens);

    h.get(modulo.render)();
    assert.match(secao.innerHTML, /Pagina 1 de 2/);
    assert.match(secao.innerHTML, /13 de 13/);
    assert.match(secao.innerHTML, /Item 01/);

    h.get(modulo.paginar)(1);
    assert.match(secao.innerHTML, /Pagina 2 de 2/);
    assert.match(secao.innerHTML, /Registro Único/);

    busca.value = 'unico';
    h.get(modulo.buscar)(busca);

    assert.match(secao.innerHTML, /Pagina 1 de 1/);
    assert.match(secao.innerHTML, /1 de 13/);
    assert.match(secao.innerHTML, /Registro Único/);
    assert.doesNotMatch(secao.innerHTML, /Item 01/);

    h.get(modulo.render)();
    assert.match(secao.innerHTML, /Registro Único/);
    assert.match(secao.innerHTML, /value="unico"/);
  });
}
