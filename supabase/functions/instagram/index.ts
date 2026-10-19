/**
 * Edge Function `instagram` — ponte entre o site e a API do Instagram.
 *
 * Por que existe: o token de longa duracao do Instagram nao pode ficar no
 * navegador (localStorage) nem viajar na query string. Aqui ele fica em
 * Supabase Secrets e nunca sai do servidor.
 *
 * Segredo necessario:
 *   IG_ACCESS_TOKEN        token de longa duracao do Instagram Basic Display
 *
 * Opcional:
 *   IG_ALLOWED_ORIGINS     lista separada por virgula; vazio = qualquer origem
 *                          ex.: "https://smader.go.gov.br,http://localhost:5173"
 *
 * Deploy:
 *   supabase secrets set IG_ACCESS_TOKEN=...
 *   supabase functions deploy instagram
 *
 * A resposta tem o mesmo formato que a API antiga (`{ data: [...] }`), para o
 * frontend nao precisar de traducao.
 */

const IG_TOKEN = Deno.env.get("IG_ACCESS_TOKEN") ?? "";

const ORIGENS_PERMITIDAS = (Deno.env.get("IG_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origem) => origem.trim())
  .filter(Boolean);

const CACHE_MS = 5 * 60 * 1000;
const LIMITE_POSTS = 6;
const CAMPOS = "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp";

let cache: { em: number; corpo: string } | null = null;

function cabecalhosCors(origem: string | null): Record<string, string> {
  // Sem lista configurada, libera qualquer origem: o conteudo e publico.
  const permitida = ORIGENS_PERMITIDAS.length === 0
    ? "*"
    : (origem && ORIGENS_PERMITIDAS.includes(origem) ? origem : null);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Cache-Control": "public, max-age=300",
  };

  if (permitida) headers["Access-Control-Allow-Origin"] = permitida;
  return headers;
}

function json(corpo: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  const cors = cabecalhosCors(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "GET") {
    return json({ error: "metodo_nao_permitido" }, 405, cors);
  }

  if (!IG_TOKEN) {
    // Nao e erro do site: falta configurar o segredo.
    console.error("[instagram] IG_ACCESS_TOKEN nao configurado.");
    return json({ error: "token_nao_configurado" }, 503, cors);
  }

  const agora = Date.now();
  if (cache && agora - cache.em < CACHE_MS) {
    return new Response(cache.corpo, {
      status: 200,
      headers: { ...cors, "content-type": "application/json; charset=utf-8", "x-cache": "hit" },
    });
  }

  try {
    // ATENCAO: a URL carrega o token. Nunca logar `url`.
    const url = "https://graph.instagram.com/me/media"
      + `?fields=${CAMPOS}`
      + `&limit=${LIMITE_POSTS}`
      + `&access_token=${encodeURIComponent(IG_TOKEN)}`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
      // Nao repassar o corpo: pode conter detalhe do token.
      console.error(`[instagram] graph.instagram.com respondeu ${resposta.status}`);
      return json({ error: "instagram_indisponivel" }, 502, cors);
    }

    const dados = await resposta.json();
    const corpo = JSON.stringify({ data: Array.isArray(dados?.data) ? dados.data : [] });

    cache = { em: agora, corpo };

    return new Response(corpo, {
      status: 200,
      headers: { ...cors, "content-type": "application/json; charset=utf-8", "x-cache": "miss" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error("[instagram] falha ao consultar o Instagram:", mensagem);
    return json({ error: "instagram_indisponivel" }, 502, cors);
  }
});
