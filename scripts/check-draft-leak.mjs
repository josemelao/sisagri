#!/usr/bin/env node
/**
 * check-draft-leak.mjs
 * ---------------------------------------------------------------------------
 * Prova que nenhum rascunho (publish_status = 'draft') é acessível com a
 * anon key pública. É a suíte adversarial do Bloco 1 do v2_plano_refatoração.md
 * e a rede de regressão dos Blocos 3 / 3c / 7.
 *
 * Uso:
 *   node scripts/check-draft-leak.mjs
 *   node scripts/check-draft-leak.mjs --verbose
 *
 * Saída (exit code):
 *   0 = OK, nenhum rascunho exposto
 *   1 = VAZAMENTO encontrado (falha de segurança)
 *   2 = falha de configuração/rede (não é veredito de segurança)
 *
 * Importante: a chave NÃO é copiada aqui. É lida de db.js em tempo de
 * execução, para não duplicar segredo em dois lugares.
 * ---------------------------------------------------------------------------
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const VERBOSE = process.argv.includes("--verbose");
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DB_JS = resolve(RAIZ, "db.js");

/** Tabela que existe no banco mas NÃO é conteúdo público (deve ser invisível para anon). */
const SOMENTE_AUTENTICADO = ["admin_settings"];

const falhasDeSeguranca = [];
const problemas = [];

function abortarConfiguracao(mensagem) {
  console.error(`\n✖ ${mensagem}\n`);
  process.exit(2);
}

function lerConfiguracao() {
  let fonte;
  try {
    fonte = readFileSync(DB_JS, "utf8");
  } catch (erro) {
    abortarConfiguracao(`Não consegui ler ${DB_JS}: ${erro.message}`);
  }

  const url = fonte.match(/SUPABASE_URL\s*:\s*'([^']+)'/)?.[1];
  const chave = fonte.match(/SUPABASE_KEY\s*:\s*'([^']+)'/)?.[1];
  if (!url || !chave) {
    abortarConfiguracao("SUPABASE_URL ou SUPABASE_KEY não encontrados em db.js");
  }

  // Deriva as tabelas do próprio db.js (não duplica a lista).
  const bloco = fonte.match(/const\s+SUPABASE_TABLES\s*=\s*\{([\s\S]*?)\};/)?.[1] ?? "";
  const tabelas = [...new Set([...bloco.matchAll(/:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]))];
  if (tabelas.length === 0) {
    abortarConfiguracao("Não consegui derivar SUPABASE_TABLES de db.js");
  }

  return { url: url.replace(/\/+$/, ""), chave, tabelas };
}

function cabecalhos(chave, extras = {}) {
  return { apikey: chave, Authorization: `Bearer ${chave}`, ...extras };
}

async function pedir(url, chave, caminho, extras = {}) {
  const resposta = await fetch(`${url}/rest/v1/${caminho}`, {
    headers: cabecalhos(chave, extras),
  });
  const texto = await resposta.text();
  let corpo = null;
  try {
    corpo = JSON.parse(texto);
  } catch {
    corpo = texto;
  }
  return { status: resposta.status, intervalo: resposta.headers.get("content-range"), corpo };
}

/** @returns {Promise<boolean>} true se a tabela está segura */
async function conferirRascunhos(config, tabela) {
  const alvo = `${tabela}?select=id,publish_status&publish_status=eq.draft&limit=1`;
  let resposta;
  try {
    resposta = await pedir(config.url, config.chave, alvo);
  } catch (erro) {
    problemas.push(`${tabela}: erro de rede (${erro.message})`);
    return false;
  }

  // 401/403 => anon não tem acesso algum: seguro por negação.
  if (resposta.status === 401 || resposta.status === 403) {
    if (VERBOSE) console.log(`  · ${tabela}: negado para anon (${resposta.status}) — seguro`);
    return true;
  }
  if (resposta.status >= 400) {
    problemas.push(`${tabela}: HTTP ${resposta.status} — não consegui verificar (${String(resposta.corpo).slice(0, 120)})`);
    return false;
  }

  const linhas = Array.isArray(resposta.corpo) ? resposta.corpo : [];
  if (linhas.length > 0) {
    const ids = linhas.map((l) => l.id).join(", ");
    falhasDeSeguranca.push(`${tabela}: rascunho visível para anon (id: ${ids})`);
    return false;
  }

  if (VERBOSE) {
    console.log(`  · ${tabela}: nenhum rascunho exposto (content-range ${resposta.intervalo ?? "-"})`);
  }
  return true;
}

/** Amostra as primeiras linhas e confirma que todas são published. */
async function conferirAmostra(config, tabela) {
  const alvo = `${tabela}?select=id,publish_status&limit=50`;
  let resposta;
  try {
    resposta = await pedir(config.url, config.chave, alvo);
  } catch (erro) {
    problemas.push(`${tabela}: erro de rede na amostra (${erro.message})`);
    return false;
  }
  if (resposta.status === 401 || resposta.status === 403) return true;
  if (resposta.status >= 400) {
    problemas.push(`${tabela}: HTTP ${resposta.status} na amostra`);
    return false;
  }
  const linhas = Array.isArray(resposta.corpo) ? resposta.corpo : [];
  const naoPublicadas = linhas.filter((l) => l.publish_status !== "published");
  if (naoPublicadas.length > 0) {
    falhasDeSeguranca.push(
      `${tabela}: linha não publicada na amostra anon (ids: ${naoPublicadas.map((l) => `${l.id}=${l.publish_status}`).join(", ")})`
    );
    return false;
  }
  return true;
}

/** Tabelas que devem ser completamente invisíveis para anon. */
async function conferirInvisivel(config, tabela) {
  const alvo = `${tabela}?select=*&limit=1`;
  let resposta;
  try {
    resposta = await pedir(config.url, config.chave, alvo);
  } catch (erro) {
    problemas.push(`${tabela}: erro de rede (${erro.message})`);
    return false;
  }
  if (resposta.status === 401 || resposta.status === 403) {
    if (VERBOSE) console.log(`  · ${tabela}: negado para anon — seguro`);
    return true;
  }
  if (resposta.status >= 400) {
    problemas.push(`${tabela}: HTTP ${resposta.status}`);
    return false;
  }
  const linhas = Array.isArray(resposta.corpo) ? resposta.corpo : [];
  if (linhas.length > 0) {
    falhasDeSeguranca.push(`${tabela}: visível para anon — deveria ser somente autenticado`);
    return false;
  }
  if (VERBOSE) console.log(`  · ${tabela}: invisível para anon — seguro`);
  return true;
}

async function principal() {
  const config = lerConfiguracao();

  console.log("\nVerificação de vazamento de rascunho (anon key)");
  console.log(`Projeto: ${config.url}`);
  console.log(`Tabelas: ${config.tabelas.length} + ${SOMENTE_AUTENTICADO.length} somente-autenticado\n`);

  let verificadas = 0;

  for (const tabela of config.tabelas) {
    const okRascunho = await conferirRascunhos(config, tabela);
    const okAmostra = await conferirAmostra(config, tabela);
    if (okRascunho && okAmostra) verificadas += 1;
  }

  for (const tabela of SOMENTE_AUTENTICADO) {
    if (await conferirInvisivel(config, tabela)) verificadas += 1;
  }

  const total = config.tabelas.length + SOMENTE_AUTENTICADO.length;

  if (falhasDeSeguranca.length > 0) {
    console.error("\n✖ VAZAMENTO ENCONTRADO\n");
    for (const f of falhasDeSeguranca) console.error(`  • ${f}`);
    console.error("");
    process.exit(1);
  }

  if (problemas.length > 0) {
    console.error("\n⚠ Não consegui concluir a verificação\n");
    for (const p of problemas) console.error(`  • ${p}`);
    console.error("");
    process.exit(2);
  }

  console.log(`\n✔ OK — ${verificadas}/${total} tabelas sem rascunho exposto para anon\n`);
  process.exit(0);
}

principal().catch((erro) => {
  console.error(`\n✖ Falha inesperada: ${erro?.stack ?? erro}\n`);
  process.exit(2);
});
