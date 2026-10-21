/**
 * Bloco 11 (T11.3) — modulos de cadastro no motor de listas.
 *
 * Manuais, Processos, Veiculos, Sistemas e Servicos compartilham o mesmo
 * contrato: render da tabela, paginacao, busca e persistencia do estado.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

const MODULOS = [
  {
    colecao: 'manuais',
    render: 'renderManuais',
    buscar: 'atualizarBuscaManuais',
    paginar: 'mudarPaginaManuais',
    item: (id, nome) => ({ id, titulo: nome, categoria: 'Geral', passos: [{ texto: 'passo' }] }),
  },
  {
    colecao: 'processos',
    render: 'renderProcessos',
    buscar: 'atualizarBuscaProcessos',
    paginar: 'mudarPaginaProcessos',
    item: (id, nome) => ({ id, titulo: nome, categoria: 'Geral', etapas: [{ titulo: 'etapa' }] }),
  },
  {
    colecao: 'veiculos',
    render: 'renderVeiculos',
    buscar: 'atualizarBuscaVeiculos',
    paginar: 'mudarPaginaVeiculos',
    item: (id, nome) => ({
      id,
      nome,
      marca: 'Marca',
      modelo: 'Modelo',
      placa: `ABC${id}`,
      patrimonio: `P${id}`,
      situacao: 'Em operação',
    }),
  },
  {
    colecao: 'sistemas',
    render: 'renderSistemas',
    buscar: 'atualizarBuscaSistemas',
    paginar: 'mudarPaginaSistemas',
    item: (id, nome) => ({
      id,
      nome,
      nome_completo: `${nome} completo`,
      orgao: 'SMADER',
      url: `https://exemplo.test/${id}`,
    }),
  },
  {
    colecao: 'servicos',
    render: 'renderServicos',
    buscar: 'atualizarBuscaServicos',
    paginar: 'mudarPaginaServicos',
    item: (id, nome) => ({ id, nome, categoria: 'Geral', publico: 'Servidor' }),
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
        [`section-${modulo.colecao}`]: secao,
        [`${modulo.colecao}-search`]: busca,
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
