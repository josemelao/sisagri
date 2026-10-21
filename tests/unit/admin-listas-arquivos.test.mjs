/**
 * Bloco 11 (T11.2) — modulo Arquivos no motor de listas.
 *
 * Trava o comportamento que existia antes da migracao: render da tabela,
 * paginacao, busca com acento e persistencia da busca ao re-renderizar
 * (equivalente a trocar de modulo e voltar).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

function criarArquivos(total) {
  return Array.from({ length: total }, (_, indice) => ({
    id: indice + 1,
    nome: `Arquivo ${String(indice + 1).padStart(2, '0')}`,
    tipo: 'PDF',
    tags: ['geral'],
  }));
}

async function carregar(arquivos) {
  const secao = criarElemento('section');
  const busca = criarElemento('input');
  const h = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'],
    {
      supabase: false,
      dadosIniciais: { arquivos },
      elementos: {
        'login-email': criarElemento('input'),
        'login-senha': criarElemento('input'),
        modal: criarElemento('div'),
        'section-arquivos': secao,
        'arquivos-search': busca,
      },
    },
  );
  await h.get('dbInit')();
  return { h, secao, busca };
}

test('arquivos: renderiza a primeira pagina e avanca para a segunda', async () => {
  const { h, secao } = await carregar(criarArquivos(13));

  h.get('renderArquivos')();

  assert.match(secao.innerHTML, /Pagina 1 de 2/);
  assert.match(secao.innerHTML, /13 de 13/);
  assert.match(secao.innerHTML, /Arquivo 01/);
  assert.doesNotMatch(secao.innerHTML, /Arquivo 13/);

  h.get('mudarPaginaArquivos')(1);

  assert.match(secao.innerHTML, /Pagina 2 de 2/);
  assert.match(secao.innerHTML, /Arquivo 13/);
});

test('arquivos: busca filtra, volta para a pagina 1 e ignora acento', async () => {
  const arquivos = criarArquivos(13);
  arquivos[4].nome = 'Relatorio Anual';
  const { h, secao, busca } = await carregar(arquivos);

  h.get('renderArquivos')();
  h.get('mudarPaginaArquivos')(1);

  busca.value = 'relatório';
  busca.selectionStart = 4;
  busca.setSelectionRange = (inicio, fim) => {
    busca.selectionStart = inicio;
    busca.selectionEnd = fim;
  };

  h.get('atualizarBuscaArquivos')(busca);

  assert.match(secao.innerHTML, /Pagina 1 de 1/);
  assert.match(secao.innerHTML, /1 de 13/);
  assert.match(secao.innerHTML, /Relatorio Anual/);
  assert.doesNotMatch(secao.innerHTML, /Arquivo 01/);
  assert.equal(busca.value, 'relatório');
  assert.equal(busca.selectionStart, 4);
});

test('arquivos: busca continua aplicada ao re-renderizar a secao', async () => {
  const { h, secao, busca } = await carregar(criarArquivos(13));

  h.get('renderArquivos')();
  busca.value = 'Arquivo 07';
  h.get('atualizarBuscaArquivos')(busca);

  // Simula sair do modulo e voltar: a secao e remontada a partir do estado.
  h.get('renderArquivos')();

  assert.match(secao.innerHTML, /Arquivo 07/);
  assert.doesNotMatch(secao.innerHTML, /Arquivo 01/);
  assert.match(secao.innerHTML, /value="Arquivo 07"/);
});
