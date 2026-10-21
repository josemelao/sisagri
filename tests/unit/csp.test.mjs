/**
 * Bloco 9d (T9.5) — CSP declarada por meta tag.
 *
 * A politica e medida no navegador em tests/e2e/csp.spec.mjs; aqui ficam as
 * garantias estaticas: a meta existe nos dois HTMLs, as fontes permitidas sao
 * exatamente as necessarias e o supabase-js esta fixado com SRI.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTMLS = ['index.html', 'admin.html'];

const DIRETIVAS = {
  'default-src': ["'self'"],
  'script-src': ["'self'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://unpkg.com'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
  'frame-src': ["'self'", 'blob:', 'https://*.supabase.co', 'https://view.officeapps.live.com'],
  'object-src': ["'none'"],
};

function lerHtml(arquivo) {
  return fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
}

function lerCsp(arquivo) {
  const meta = lerHtml(arquivo).match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i);
  assert.ok(meta, `${arquivo}: falta a meta Content-Security-Policy`);
  const conteudo = meta[0].match(/content=(["'])([\s\S]*?)\1/i);
  assert.ok(conteudo, `${arquivo}: meta CSP sem atributo content`);
  return conteudo[2];
}

function mapaDiretivas(csp) {
  return new Map(
    csp.split(';')
      .map((parte) => parte.trim())
      .filter(Boolean)
      .map((parte) => {
        const [nome, ...fontes] = parte.split(/\s+/);
        return [nome.toLowerCase(), fontes];
      }),
  );
}

test('CSP: index.html e admin.html declaram as diretivas e fontes necessarias', () => {
  for (const arquivo of HTMLS) {
    const csp = lerCsp(arquivo);
    const diretivas = mapaDiretivas(csp);

    for (const [diretiva, fontes] of Object.entries(DIRETIVAS)) {
      assert.ok(diretivas.has(diretiva), `${arquivo}: falta a diretiva ${diretiva}`);
      for (const fonte of fontes) {
        assert.ok(
          diretivas.get(diretiva).includes(fonte),
          `${arquivo}: ${diretiva} sem ${fonte}`,
        );
      }
    }

    assert.ok(!/['"]?unsafe-eval['"]?/.test(csp), `${arquivo}: CSP nao pode liberar unsafe-eval`);
    assert.ok(
      !diretivas.get('script-src').includes("'unsafe-inline'"),
      `${arquivo}: script-src nao pode liberar unsafe-inline`,
    );
  }
});

test('CSP: supabase-js fixado em versao exata, com SRI, nos dois HTMLs', () => {
  const fontes = new Map();

  for (const arquivo of HTMLS) {
    const tag = lerHtml(arquivo).match(
      /<script[^>]+src=["'](https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^"']+)["'][^>]*>/i,
    );
    assert.ok(tag, `${arquivo}: script do supabase-js nao encontrado`);

    assert.match(
      tag[1],
      /@supabase\/supabase-js@\d+\.\d+\.\d+\//,
      `${arquivo}: versao do supabase-js nao esta fixa (use @x.y.z)`,
    );
    assert.match(
      tag[0],
      /integrity=["']sha384-[A-Za-z0-9+/=]+["']/,
      `${arquivo}: script do supabase-js sem integrity (SRI)`,
    );
    assert.match(
      tag[0],
      /crossorigin=["']anonymous["']/,
      `${arquivo}: SRI exige crossorigin="anonymous"`,
    );

    fontes.set(arquivo, tag[1]);
  }

  assert.equal(
    new Set(fontes.values()).size,
    1,
    'index.html e admin.html devem carregar a mesma versao do supabase-js',
  );
});
