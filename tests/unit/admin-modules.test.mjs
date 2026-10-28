/**
 * Bloco 11 (T11.4) — registro de modulos do painel.
 *
 * O roteador de secoes deixa de ser uma cadeia de `case` e passa a consultar
 * `MODULES`. O teste trava a lista de modulos e garante que chave desconhecida
 * nao quebra a navegacao.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

const ESPERADOS = [
  'overview',
  'funcionarios',
  'manuais',
  'processos',
  'arquivos',
  'veiculos',
  'sistemas',
  'servicos',
  'avisos',
  'agendaEventos',
  'escalaFerias',
  'acessoRapido',
  'infoJuridico',
  'infoMunicipio',
  'infoOrgaos',
  'auditoria',
  'configuracoes',
];

async function carregar() {
  const h = carregarScripts(
    ['js/core/utils.js', 'js/admin/list-controller.js', 'db.js', 'admin.js'],
    {
      supabase: false,
      elementos: {
        'login-email': criarElemento('input'),
        'login-senha': criarElemento('input'),
        modal: criarElemento('div'),
      },
    },
  );
  await h.get('dbInit')();
  return h;
}

test('MODULES registra todos os modulos e os ids de busca', async () => {
  const h = await carregar();
  const modulos = h.get('MODULES');

  assert.deepEqual(Object.keys(modulos).sort(), [...ESPERADOS].sort());
  assert.equal(modulos.arquivos.searchId, 'arquivos-search');
  assert.equal(modulos.agendaEventos.searchId, 'agenda-search');
  assert.equal(modulos.infoJuridico.searchId, 'infosimples-search-infoJuridico');
  assert.equal(modulos.auditoria.searchId, 'auditoria-search');
  assert.equal(modulos.overview.searchId, undefined);
  assert.equal(modulos.configuracoes.searchId, undefined);
});

test('renderSection despacha pelo registro e ignora chave desconhecida', async () => {
  const h = await carregar();
  const modulos = h.get('MODULES');
  const chamadas = [];

  for (const chave of Object.keys(modulos)) {
    modulos[chave] = { ...modulos[chave], render: () => chamadas.push(chave) };
  }

  h.get('renderSection')('arquivos');
  h.get('renderSection')('infoMunicipio');
  h.get('renderSection')('nao-existe');

  assert.deepEqual(chamadas, ['arquivos', 'infoMunicipio']);
});
