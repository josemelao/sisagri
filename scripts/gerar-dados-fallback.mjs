/**
 * Gera as colecoes de dados publicos de `dados.js` a partir da producao.
 *
 * Uso:
 *   node scripts/gerar-dados-fallback.mjs            # regrava dados.js
 *   node scripts/gerar-dados-fallback.mjs --dry-run  # so mostra as contagens
 *
 * Regras:
 * - le apenas registros com publish_status = 'published';
 * - remove da saida os ids listados em EXCLUIDOS (lixo de teste conhecido);
 * - nunca grava PII: cpf, matricula, chassi e renavam ficam de fora;
 * - preserva as demais colecoes de dados.js sem tocar no texto delas;
 * - saida deterministica (ordenada por id, uma propriedade por linha).
 *
 * A URL e a chave anon vem do proprio db.js (fonte unica), nao sao duplicadas.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARQUIVO_DADOS = path.join(RAIZ, 'dados.js');
const DRY_RUN = process.argv.includes('--dry-run');

/** Ids de registros de teste que nao devem entrar no fallback. */
const EXCLUIDOS = {
  funcionarios: [18],
  manuais: [7],
  processos: [5],
  arquivos: [67],
  veiculos: [4, 5],
  escalaFerias: [],
};

/** Colecao em dados.js -> tabela no Supabase + colunas selecionadas. */
const COLECOES = [
  {
    chave: 'funcionarios',
    tabela: 'funcionarios',
    colunas: [
      'id', 'nome', 'cargo', 'lotacao', 'departamento', 'orgao', 'vinculo',
      'descricao', 'foto_storage_path',
    ],
  },
  {
    chave: 'manuais',
    tabela: 'manuais',
    colunas: [
      'id', 'titulo', 'categoria', 'descricao', 'observacoes', 'passos',
      'documentos',
    ],
  },
  {
    chave: 'processos',
    tabela: 'processos',
    colunas: ['id', 'titulo', 'categoria', 'descricao', 'etapas'],
  },
  {
    chave: 'arquivos',
    tabela: 'arquivos',
    colunas: [
      'id', 'nome', 'tipo', 'tags', 'arquivo_nome', 'storage_bucket',
      'storage_path',
    ],
  },
  {
    chave: 'veiculos',
    tabela: 'veiculos',
    colunas: [
      'id', 'nome', 'tipo', 'marca', 'modelo', 'ano', 'placa', 'patrimonio',
      'combustivel', 'situacao', 'localizacao', 'motoristas', 'observacoes',
      'arquivo_ids', 'motorista_ids', 'icone', 'cor', 'cor_veiculo',
    ],
  },
  {
    chave: 'escalaFerias',
    tabela: 'escala_ferias',
    colunas: [
      'id', 'funcionario_id', 'nome', 'cargo', 'periodo_inicio',
      'periodo_fim', 'status',
    ],
  },
];

/** Listas que o renderer percorre com .map() nunca podem vir null. */
const LISTAS_PADRAO = {
  manuais: { passos: [], documentos: [] },
  processos: { etapas: [] },
  arquivos: { tags: [] },
  veiculos: { arquivo_ids: [], motorista_ids: [] },
};

function lerConfig() {
  const db = fs.readFileSync(path.join(RAIZ, 'db.js'), 'utf8');
  const url = db.match(/SUPABASE_URL:\s*'([^']+)'/);
  const chave = db.match(/SUPABASE_KEY:\s*'([^']+)'/);
  if (!url || !chave) {
    throw new Error('Nao encontrei SUPABASE_URL/SUPABASE_KEY em db.js');
  }
  return { url: url[1], chave: chave[1] };
}

async function buscar(colecao, config) {
  const params = new URLSearchParams({
    select: colecao.colunas.join(','),
    publish_status: 'eq.published',
    order: 'id.asc',
  });
  const resposta = await fetch(`${config.url}/rest/v1/${colecao.tabela}?${params}`, {
    headers: {
      apikey: config.chave,
      Authorization: `Bearer ${config.chave}`,
    },
  });
  if (!resposta.ok) {
    throw new Error(`${colecao.tabela}: HTTP ${resposta.status} ${await resposta.text()}`);
  }
  const registros = await resposta.json();
  const bloqueados = new Set(EXCLUIDOS[colecao.chave] || []);
  return registros
    .filter((registro) => !bloqueados.has(registro.id))
    .map((registro) => {
      const saida = {};
      for (const campo of colecao.colunas) {
        saida[campo] = registro[campo] ?? null;
      }
      for (const [campo, valor] of Object.entries(LISTAS_PADRAO[colecao.chave] || {})) {
        saida[campo] = Array.isArray(saida[campo]) ? saida[campo] : valor;
      }
      return saida;
    });
}

/** Serializa valor JS no estilo do arquivo (chaves sem aspas, 2 espacos). */
function serializar(valor, nivel) {
  const recuo = (n) => '  '.repeat(n);
  if (valor === null || valor === undefined) return 'null';
  if (typeof valor === 'string') return JSON.stringify(valor);
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (Array.isArray(valor)) {
    if (valor.length === 0) return '[]';
    const soPrimitivos = valor.every(
      (item) => item === null || typeof item !== 'object',
    );
    if (soPrimitivos) {
      return `[${valor.map((item) => serializar(item, nivel)).join(', ')}]`;
    }
    const itens = valor
      .map((item) => `${recuo(nivel + 1)}${serializar(item, nivel + 1)}`)
      .join(',\n');
    return `[\n${itens}\n${recuo(nivel)}]`;
  }
  const chaves = Object.keys(valor).filter((chave) => valor[chave] !== undefined);
  if (chaves.length === 0) return '{}';
  const itens = chaves
    .map((chave) => {
      const nome = /^[A-Za-z_$][\w$]*$/.test(chave) ? chave : JSON.stringify(chave);
      return `${recuo(nivel + 1)}${nome}: ${serializar(valor[chave], nivel + 1)}`;
    })
    .join(',\n');
  return `{\n${itens}\n${recuo(nivel)}}`;
}

function bloco(chave, registros) {
  if (registros.length === 0) return `  ${chave}: [],`;
  const itens = registros
    .map((registro) => `    ${serializar(registro, 2)},`)
    .join('\n');
  return `  ${chave}: [\n${itens}\n  ],`;
}

/** Troca apenas o bloco da colecao, preservando o resto do arquivo. */
function substituirBloco(texto, chave, novoBloco) {
  const inicio = texto.search(new RegExp(`^  ${chave}: \\[`, 'm'));
  if (inicio < 0) throw new Error(`Bloco da colecao "${chave}" nao encontrado em dados.js`);
  const fim = texto.indexOf('\n  ],', inicio);
  if (fim < 0) throw new Error(`Fim do bloco "${chave}" nao encontrado em dados.js`);
  return texto.slice(0, inicio) + novoBloco + texto.slice(fim + '\n  ],'.length);
}

async function principal() {
  const config = lerConfig();
  const textoOriginal = fs.readFileSync(ARQUIVO_DADOS, 'utf8');
  let texto = textoOriginal;
  const resumo = {};

  for (const colecao of COLECOES) {
    const registros = await buscar(colecao, config);
    resumo[colecao.chave] = registros.length;
    if (!DRY_RUN) {
      texto = substituirBloco(texto, colecao.chave, bloco(colecao.chave, registros));
    }
  }

  console.log('Registros publicados importados:', JSON.stringify(resumo));
  if (DRY_RUN) {
    console.log('--dry-run: dados.js nao foi alterado.');
    return;
  }
  fs.writeFileSync(ARQUIVO_DADOS, texto.replace(/\r?\n/g, '\n'), 'utf8');
  console.log('dados.js regravado.');
}

principal().catch((erro) => {
  console.error('Falha ao gerar o fallback:', erro.message);
  process.exitCode = 1;
});
