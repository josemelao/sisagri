/**
 * Render publico: PII so aparece com acesso interno.
 *
 * Estes testes usam os renderers reais do script.js e o db.js em modo local.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

const FUNCIONARIO = {
  id: 1,
  nome: 'Ana Teste',
  cargo: 'Fiscal',
  lotacao: 'Defesa Agropecuaria',
  matricula: 'MAT-001',
  cpf: '111.222.333-44',
  telefone: '61 99999-0000',
  email: 'ana@exemplo.test',
  publish_status: 'published',
};

const VEICULO = {
  id: 1,
  nome: 'Caminhao Teste',
  tipo: 'Caminhao',
  marca: 'Marca',
  modelo: 'Modelo',
  ano: 2024,
  placa: 'ABC1D23',
  chassi: 'CHASSI-SENSIVEL',
  renavam: 'RENAVAM-SENSIVEL',
  situacao: 'Em operacao',
  publish_status: 'published',
};

async function montar() {
  const detalheFunc = criarElemento('div');
  const overlayFunc = criarElemento('div');
  const detalheVeic = criarElemento('div');
  const overlayVeic = criarElemento('div');
  const entrar = criarElemento('button');
  const usuario = criarElemento('div');
  const email = criarElemento('span');
  const navRel = criarElemento('a');
  const dashEscala = criarElemento('div');

  const h = carregarScripts(
    ['js/core/utils.js', 'db.js', 'script.js'],
    {
      supabase: false,
      dadosIniciais: {
        funcionarios: [FUNCIONARIO],
        veiculos: [VEICULO],
      },
      elementos: {
        'func-detail-content': detalheFunc,
        'func-detail-overlay': overlayFunc,
        'veiculo-detail-content': detalheVeic,
        'veiculo-detail-overlay': overlayVeic,
        'auth-entrar': entrar,
        'auth-usuario': usuario,
        'auth-email': email,
        'nav-relatorios': navRel,
        'dash-escala': dashEscala,
        'main-content': criarElemento('main'),
      },
    },
  );

  await h.get('_initLocal')();
  h.run('carregarDados()');

  return { h, detalheFunc, detalheVeic, entrar, usuario, email, navRel, dashEscala };
}

test('anon nao ve CPF, telefone nem e-mail no detalhe do funcionario', async () => {
  const { h, detalheFunc } = await montar();

  h.get('openFuncionario')(1);
  const html = detalheFunc.innerHTML;

  assert.match(html, /MAT-001/);
  assert.doesNotMatch(html, /CPF/);
  assert.doesNotMatch(html, /111\.222\.333-44/);
  assert.doesNotMatch(html, /Telefone/);
  assert.doesNotMatch(html, /ana@exemplo\.test/);
});

test('staff ve CPF, telefone e e-mail no detalhe do funcionario', async () => {
  const { h, detalheFunc } = await montar();
  h.run('_acessoInterno = true;');

  h.get('openFuncionario')(1);
  const html = detalheFunc.innerHTML;

  assert.match(html, /CPF/);
  assert.match(html, /111\.222\.333-44/);
  assert.match(html, /Telefone/);
  assert.match(html, /ana@exemplo\.test/);
});

test('anon nao ve chassi nem RENAVAM no detalhe do veiculo', async () => {
  const { h, detalheVeic } = await montar();

  h.get('openVeiculo')(1);
  const html = detalheVeic.innerHTML;

  assert.match(html, /ABC1D23/);
  assert.doesNotMatch(html, /CHASSI-SENSIVEL/);
  assert.doesNotMatch(html, /RENAVAM-SENSIVEL/);
});

test('staff ve chassi e RENAVAM no detalhe do veiculo', async () => {
  const { h, detalheVeic } = await montar();
  h.run('_acessoInterno = true;');

  h.get('openVeiculo')(1);
  const html = detalheVeic.innerHTML;

  assert.match(html, /CHASSI-SENSIVEL/);
  assert.match(html, /RENAVAM-SENSIVEL/);
});

test('atualizarAuthUI esconde relatorios e escala para anon', async () => {
  const { h, entrar, usuario, navRel, dashEscala } = await montar();

  h.get('atualizarAuthUI')();

  assert.equal(entrar.hidden, false);
  assert.equal(usuario.hidden, true);
  assert.equal(navRel.hidden, true);
  assert.equal(dashEscala.hidden, true);
});

test('atualizarAuthUI mostra a sessao e libera itens internos', async () => {
  const { h, entrar, usuario, email, navRel, dashEscala } = await montar();
  h.run('_acessoInterno = true; _usuarioAtual = { id: "uid-1", email: "x@y.test" };');

  h.get('atualizarAuthUI')();

  assert.equal(entrar.hidden, true);
  assert.equal(usuario.hidden, false);
  assert.equal(email.textContent, 'x@y.test');
  assert.equal(navRel.hidden, false);
  assert.equal(dashEscala.hidden, false);
});
