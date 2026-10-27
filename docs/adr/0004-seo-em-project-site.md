# ADR 0004 — SEO em GitHub Pages project site

**Status:** **substituída em 2026-10-27** — o site passou a ser interno e não
deve ser indexado. O texto abaixo fica como registro histórico da decisão de
2026-10-22.

## Substituta (2026-10-27)

- `index.html` e `admin.html` levam `noindex, nofollow` (o index também com
  `noarchive, nosnippet, noimageindex`).
- `robots.txt` responde `Disallow: /`; `sitemap.xml`, `canonical`, Open Graph,
  Twitter Card, `description` e `assets/og-image.png` foram removidos.
- A limitação do project site continua: o `robots.txt` autoritativo é o da raiz
  do host, então a garantia real é o `noindex` das páginas.
- A remoção dos índices já existentes depende do recrawl ou de uma remoção
  manual no Search Console.

## Contexto

O site é publicado em `https://josemelao.github.io/sisagri/`, um **project
site** do GitHub Pages. O crawler lê `robots.txt` na raiz do domínio
(`josemelao.github.io`), não na subpasta do projeto.

## Decisão

- `index.html` tem `title`, `description`, `canonical`, Open Graph e Twitter
  Card.
- `sitemap.xml` lista apenas a raiz; rotas por hash não são indexadas como URLs
  próprias.
- `admin.html` tem `noindex, nofollow`.
- `robots.txt` documenta a intenção e aponta o sitemap, mas não é a proteção
  efetiva do admin em project site.
- A proteção real do admin é o `noindex` + login.

## Consequências

- O SEO funciona para a página inicial e para o card social.
- Não há URLs internas indexáveis enquanto o roteamento for por hash.
- Para `robots.txt` na raiz, seria necessário domínio próprio ou user site.
- O `sitemap.xml` pode ser submetido manualmente no Search Console.

## Alternativas descartadas

- Migrar para history API: exigiria rewrite de servidor.
- Publicar em user site: mudaria a URL pública e o escopo do projeto.
