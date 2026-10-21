/**
 * Bloco 11 (T11.2) — modulos Avisos e Funcionarios no motor de listas.
 *
 * Mesma prova feita para Arquivos: render, paginacao, busca com acento e
 * persistencia da busca ao trocar de modulo e voltar.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

async function carregar(colecao, itens) {
  const secaoId = `section-${colecao}`;
  const buscaId = `${colecao}-search`;
  const secao = criarElemento('section');
  const busca = criarElemento('input');
  const h = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'],
    {
      supabase: false,
      dadosIniciais: { [colecao]: itens },
      elementos: {
        'login-email': criarElemento('input'),
        'login-senha': criarElemento('input'),
        modal: criarElemento('div'),
        [secaoId]: secao,
        [buscaId]: busca,
      },
    },
  );
  await h.get('dbInit')();
  return { h, secao, busca };
}

function criarAvisos(total) {
  return Array.from({ length: total }, (_, indice) => ({
    id: indice + 1,
    titulo: `Aviso ${String(indice + 1).padStart(2, '0')}`,
    tipo: 'aviso',
    local: 'Sede',
  }));
}

function criarFuncionarios(total) {
  return Array.from({ length: total }, (_, indice) => ({
    id: indice + 1,
    nome: `Servidor ${String(indice + 1).padStart(2, '0')}`,
    cargo: 'Agente',
    lotacao: 'Sede',
    departamento: 'Administracao',
  }));
}

test('avisos: pagina, filtra por local com acento e mantem a busca no re-render', async () => {
  const avisos = criarAvisos(13);
  avisos[4].tipo = 'Comunicado';
  avisos[4].local = 'Auditório';
  const { h, secao, busca } = await carregar('avisos', avisos);

  h.get('renderAvisos')();
  assert.match(secao.innerHTML, /Pagina 1 de 2/);
  assert.match(secao.innerHTML, /13 de 13/);

  h.get('mudarPaginaAvisos')(1);
  assert.match(secao.innerHTML, /Aviso 13/);

  busca.value = 'auditorio';
  h.get('atualizarBuscaAvisos')(busca);

  assert.match(secao.innerHTML, /Pagina 1 de 1/);
  assert.match(secao.innerHTML, /1 de 13/);
  assert.match(secao.innerHTML, /Aviso 05/);

  h.get('renderAvisos')();
  assert.match(secao.innerHTML, /Aviso 05/);
  assert.doesNotMatch(secao.innerHTML, /Aviso 01/);
  assert.match(secao.innerHTML, /value="auditorio"/);
});

test('funcionarios: filtra por lotacao/setor e por busca', async () => {
  const funcionarios = criarFuncionarios(13);
  funcionarios[3].lotacao = 'Auditório';
  funcionarios[7].lotacao = '';
  funcionarios[7].setor = 'Almoxarifado';
  const { h, secao, busca } = await carregar('funcionarios', funcionarios);

  h.get('renderFuncionarios')();
  assert.match(secao.innerHTML, /Pagina 1 de 2/);

  busca.value = 'almoxarifado';
  h.get('atualizarBuscaFuncionarios')(busca);
  assert.match(secao.innerHTML, /1 de 13/);
  assert.match(secao.innerHTML, /Servidor 08/);

  busca.value = 'auditorio';
  h.get('atualizarBuscaFuncionarios')(busca);
  assert.match(secao.innerHTML, /1 de 13/);
  assert.match(secao.innerHTML, /Servidor 04/);
});
