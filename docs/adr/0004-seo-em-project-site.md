# ADR 0004 — SEO em GitHub Pages project site

**Status:** aceita (2026-10-22)

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
