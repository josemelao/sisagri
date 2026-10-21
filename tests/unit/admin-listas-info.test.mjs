/**
 * Bloco 11 (T11.3) — Informacoes (infoJuridico/infoMunicipio) e Orgaos.
 *
 * Estas duas listas tinham estado proprio por colecao. O teste garante que
 * cada colecao continua independente e que a busca/paginacao seguem iguais.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

function criarBlocos(total) {
  return Array.from({ length: total }, (_, indice) => {
    const numero = String(indice + 1).padStart(2, '0');
    return {
      id: indice + 1,
      titulo: `Bloco ${numero}`,
      campos: [{ label: 'Responsavel', valor: 'SMADER' }],
    };
  });
}

function criarOrgaos(total) {
  return Array.from({ length: total }, (_, indice) => {
    const numero = String(indice + 1).padStart(2, '0');
    return {
      id: indice + 1,
      titulo: `Orgao ${numero}`,
      nome_completo: `Orgao ${numero} completo`,
      campos: [{ label: 'Sigla', valor: `O${numero}` }],
    };
  });
}

async function carregar(dadosIniciais, elementos) {
  const h = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'],
    {
      supabase: false,
      dadosIniciais,
      elementos: {
        'login-email': criarElemento('input'),
        'login-senha': criarElemento('input'),
        modal: criarElemento('div'),
        ...elementos,
      },
    },
  );
  await h.get('dbInit')();
  return h;
}

test('infoSimples: paginacao, busca e estado independente por colecao', async () => {
  const juridico = criarBlocos(13);
  juridico[4].titulo = 'Registro Único';
  const municipio = criarBlocos(3);
  const secaoJuridico = criarElemento('section');
  const secaoMunicipio = criarElemento('section');
  const buscaJuridico = criarElemento('input');

  const h = await carregar(
    { infoJuridico: juridico, infoMunicipio: municipio },
    {
      'section-infoJuridico': secaoJuridico,
      'section-infoMunicipio': secaoMunicipio,
      'infosimples-search-infoJuridico': buscaJuridico,
    },
  );

  h.get('renderInfoSimples')('infoJuridico', 'Secretaria', 'Informacoes da Secretaria');
  assert.match(secaoJuridico.innerHTML, /Informacoes da Secretaria/);
  assert.match(secaoJuridico.innerHTML, /Pagina 1 de 2/);
  assert.match(secaoJuridico.innerHTML, /13 de 13/);

  h.get('mudarPaginaInfoSimples')('infoJuridico', 1);
  assert.match(secaoJuridico.innerHTML, /Pagina 2 de 2/);
  assert.match(secaoJuridico.innerHTML, /Registro Único/);

  buscaJuridico.value = 'unico';
  h.get('atualizarBuscaInfoSimples')('infoJuridico', buscaJuridico);
  assert.match(secaoJuridico.innerHTML, /1 de 13/);
  assert.match(secaoJuridico.innerHTML, /Registro Único/);

  // A outra colecao tem estado proprio: nao herda a busca da primeira.
  h.get('renderInfoSimples')('infoMunicipio', 'Municipio', 'Informacoes do Municipio');
  assert.match(secaoMunicipio.innerHTML, /Informacoes do Municipio/);
  assert.match(secaoMunicipio.innerHTML, /3 de 3/);
  assert.match(secaoMunicipio.innerHTML, /Bloco 01/);
});

test('infoOrgaos: paginacao, busca e persistencia do estado', async () => {
  const orgaos = criarOrgaos(13);
  orgaos[4].titulo = 'Registro Único';
  orgaos[4].nome_completo = 'Registro Único completo';
  const secao = criarElemento('section');
  const busca = criarElemento('input');

  const h = await carregar(
    { infoOrgaos: orgaos },
    { 'section-infoOrgaos': secao, 'orgaos-search': busca },
  );

  h.get('renderInfoOrgaos')();
  assert.match(secao.innerHTML, /Pagina 1 de 2/);
  assert.match(secao.innerHTML, /13 de 13/);

  h.get('mudarPaginaInfoOrgaos')(1);
  assert.match(secao.innerHTML, /Pagina 2 de 2/);
  assert.match(secao.innerHTML, /Registro Único/);

  busca.value = 'unico';
  h.get('atualizarBuscaInfoOrgaos')(busca);
  assert.match(secao.innerHTML, /Pagina 1 de 1/);
  assert.match(secao.innerHTML, /1 de 13/);
  assert.doesNotMatch(secao.innerHTML, /Orgao 01/);

  h.get('renderInfoOrgaos')();
  assert.match(secao.innerHTML, /Registro Único/);
  assert.match(secao.innerHTML, /value="unico"/);
});
