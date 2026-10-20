/**
 * Testes do widget do Instagram (Bloco 10).
 *
 * Regra: o token NUNCA pode estar no navegador. O frontend chama a Edge
 * Function `instagram`, que guarda o token em Supabase Secrets.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts, criarElemento } from '../helpers/load-script.mjs';

function carregar(opcoes = {}) {
  const chamadas = [];
  const fetchFalso =
    opcoes.fetch ||
    (async (url, init) => {
      chamadas.push({ url, init });
      return { ok: true, status: 200, json: async () => ({ data: [] }) };
    });

  const h = carregarScripts(['js/core/utils.js', 'db.js', 'script.js'], {
    supabase: false,
    fetch: fetchFalso,
    elementos: { 'ig-grid': criarElemento('div') },
    ...opcoes,
  });

  return { h, chamadas };
}

/* ==========================================================================
   O token saiu do navegador
   ========================================================================== */

test('widget: nao existe mais campo de token do Instagram', () => {
  const { h } = carregar();
  const html = h.get('getInstagramWidgetHTML')();

  assert.equal(html.includes('ig-token-input'), false, 'input de token nao pode existir');
  assert.equal(html.includes('ig-token-save'), false, 'botao de salvar token nao pode existir');
  assert.equal(html.includes('Access Token'), false, 'nao deve pedir token ao visitante');
  // O grid continua: e onde o feed renderiza.
  assert.ok(html.includes('id="ig-grid"'), 'o grid do feed deve continuar');
});

test('initInstagram: limpa o token antigo do localStorage', () => {
  const { h } = carregar({ localStorage: { ig_access_token: 'EAAG-token-antigo' } });

  assert.equal(h.localStorage.getItem('ig_access_token'), 'EAAG-token-antigo');
  h.get('initInstagram')();
  assert.equal(h.localStorage.getItem('ig_access_token'), null);
});

/* ==========================================================================
   O frontend chama o proxy, sem token
   ========================================================================== */

test('fetchInstagramPosts: chama a Edge Function, nao o graph.instagram.com', async () => {
  const { h, chamadas } = carregar();

  await h.get('fetchInstagramPosts')();

  assert.equal(chamadas.length, 1);
  const { url } = chamadas[0];
  assert.ok(url.includes('/functions/v1/instagram'), `url inesperada: ${url}`);
  assert.equal(url.includes('graph.instagram.com'), false);
  assert.equal(url.includes('access_token'), false, 'token nao pode ir na query string');
});

test('fetchInstagramPosts: envia a anon key no header, nao na URL', async () => {
  const { h, chamadas } = carregar();

  await h.get('fetchInstagramPosts')();

  const { url, init } = chamadas[0];
  assert.equal(url.includes('eyJ'), false, 'a chave nao pode aparecer na URL');
  assert.ok(init && init.headers, 'deve mandar headers');
  assert.ok(init.headers.apikey, 'deve mandar apikey');
  assert.match(init.headers.Authorization, /^Bearer /);
});

test('fetchInstagramPosts: resposta vazia mostra mensagem, sem erro', async () => {
  const { h } = carregar();
  const grid = h.window.document.getElementById('ig-grid');

  await h.get('fetchInstagramPosts')();

  assert.match(grid.innerHTML, /Nenhuma postagem|indispon/i);
});

test('fetchInstagramPosts: falha da function degrada sem quebrar', async () => {
  const { h } = carregar({
    fetch: async () => ({ ok: false, status: 503, json: async () => ({ error: 'sem token' }) }),
  });
  const grid = h.window.document.getElementById('ig-grid');

  await assert.doesNotReject(() => h.get('fetchInstagramPosts')());
  assert.match(grid.innerHTML, /ig-error/);
  assert.equal(grid.innerHTML.includes('access_token'), false);
});

test('fetchInstagramPosts: legenda com aspas nao injeta atributo', async () => {
  const { h } = carregar({
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: '1',
            media_type: 'IMAGE',
            media_url: 'https://exemplo/a.jpg',
            permalink: 'https://instagram.com/p/1',
            caption: '" onerror="alert(1)',
          },
        ],
      }),
    }),
  });
  const grid = h.window.document.getElementById('ig-grid');

  await h.get('fetchInstagramPosts')();

  assert.equal(grid.innerHTML.includes('onerror="alert(1)"'), false, 'atributo nao pode ser quebrado por aspa');
});
