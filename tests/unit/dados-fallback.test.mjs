/**
 * Fallback publico de dados.js (item 3.3).
 *
 * Garante que o snapshot local:
 * - carrega e expoe as colecoes esperadas;
 * - tem ids unicos e sem os registros de teste conhecidos;
 * - nao carrega PII (cpf, matricula, chassi, renavam);
 * - nao referencia Luziania nem vaza publish_status;
 * - mantem os vinculos entre colecoes;
 * - nao passa do teto de tamanho do boot.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARQUIVO = path.join(RAIZ, 'dados.js');
const TEXTO = fs.readFileSync(ARQUIVO, 'utf8');

function carregarDados() {
  const contexto = { window: {} };
  vm.createContext(contexto);
  vm.runInContext(TEXTO, contexto, { filename: 'dados.js' });
  return contexto.window.DADOS_INICIAIS;
}

const DADOS = carregarDados();

const COLECOES = [
  'funcionarios', 'manuais', 'processos', 'arquivos', 'veiculos',
  'sistemas', 'servicos', 'infoJuridico', 'infoMunicipio', 'infoOrgaos',
  'avisos', 'agendaEventos', 'escalaFerias', 'acessoRapido', 'layoutConfig',
];

const MINIMOS = {
  funcionarios: ['id', 'nome', 'cargo', 'lotacao'],
  manuais: ['id', 'titulo', 'passos', 'documentos'],
  processos: ['id', 'titulo', 'etapas'],
  arquivos: ['id', 'nome', 'tipo', 'storage_path'],
  veiculos: ['id', 'nome', 'tipo', 'situacao'],
  escalaFerias: ['id', 'nome', 'periodo_inicio', 'status'],
};

const EXCLUIDOS = {
  funcionarios: [18],
  manuais: [7],
  processos: [5],
  arquivos: [67],
  veiculos: [4, 5],
  escalaFerias: [],
};

function ids(colecao) {
  return new Set(colecao.map((registro) => registro.id));
}

function chavesDeObjeto(valor, encontradas = new Set()) {
  if (Array.isArray(valor)) {
    valor.forEach((item) => chavesDeObjeto(item, encontradas));
  } else if (valor && typeof valor === 'object') {
    for (const [chave, filho] of Object.entries(valor)) {
      encontradas.add(chave);
      chavesDeObjeto(filho, encontradas);
    }
  }
  return encontradas;
}

test('dados.js expoe todas as colecoes esperadas', () => {
  for (const nome of COLECOES) {
    assert.ok(nome in DADOS, `colecao ausente: ${nome}`);
  }
});

test('cada colecao tem ids unicos', () => {
  for (const nome of Object.keys(MINIMOS)) {
    const lista = DADOS[nome];
    assert.equal(new Set(lista.map((item) => item.id)).size, lista.length, nome);
  }
});

test('nenhum registro de teste conhecido entra no fallback', () => {
  for (const [nome, bloqueados] of Object.entries(EXCLUIDOS)) {
    const presentes = DADOS[nome]
      .map((item) => item.id)
      .filter((id) => bloqueados.includes(id));
    assert.equal(presentes.length, 0, `${nome} ainda tem ids de teste: ${[...presentes].join(',')}`);
  }
});

test('fallback nao carrega PII nem publish_status', () => {
  const chaves = chavesDeObjeto(DADOS);
  for (const proibida of ['cpf', 'matricula', 'chassi', 'renavam', 'publish_status']) {
    assert.ok(!chaves.has(proibida), `campo proibido no fallback: ${proibida}`);
  }
});

test('fallback nao menciona Luziania', () => {
  assert.ok(!/Luzi/i.test(TEXTO));
});

test('registros gerados tem os campos minimos', () => {
  for (const [nome, campos] of Object.entries(MINIMOS)) {
    for (const registro of DADOS[nome]) {
      for (const campo of campos) {
        assert.ok(campo in registro, `${nome} id ${registro.id} sem "${campo}"`);
      }
      for (const campo of ['passos', 'documentos', 'etapas', 'tags', 'arquivo_ids', 'motorista_ids']) {
        if (campo in registro) {
          assert.ok(Array.isArray(registro[campo]), `${nome} id ${registro.id}: "${campo}" nao e lista`);
        }
      }
    }
  }
});

test('vinculos entre colecoes apontam para ids existentes', () => {
  const funcionarios = ids(DADOS.funcionarios);
  const manuais = ids(DADOS.manuais);
  const processos = ids(DADOS.processos);
  const arquivos = ids(DADOS.arquivos);
  const problemas = [];

  for (const veiculo of DADOS.veiculos) {
    for (const id of veiculo.motorista_ids || []) {
      if (!funcionarios.has(id)) problemas.push(`veiculo ${veiculo.id} -> funcionario ${id}`);
    }
    for (const id of veiculo.arquivo_ids || []) {
      if (!arquivos.has(id)) problemas.push(`veiculo ${veiculo.id} -> arquivo ${id}`);
    }
  }
  for (const manual of DADOS.manuais) {
    for (const doc of manual.documentos || []) {
      if (doc && doc.arquivo_id && !arquivos.has(doc.arquivo_id)) {
        problemas.push(`manual ${manual.id} -> arquivo ${doc.arquivo_id}`);
      }
    }
  }
  for (const processo of DADOS.processos) {
    for (const etapa of processo.etapas || []) {
      for (const id of etapa.manuais_ids || []) {
        if (!manuais.has(id)) problemas.push(`processo ${processo.id} -> manual ${id}`);
      }
    }
  }
  for (const escala of DADOS.escalaFerias) {
    if (escala.funcionario_id && !funcionarios.has(escala.funcionario_id)) {
      problemas.push(`escala ${escala.id} -> funcionario ${escala.funcionario_id}`);
    }
  }

  assert.deepEqual(problemas, []);
});

test('dados.js fica abaixo do teto de tamanho do boot', () => {
  assert.ok(Buffer.byteLength(TEXTO) < 300 * 1024, 'dados.js passou de 300 KB');
});
