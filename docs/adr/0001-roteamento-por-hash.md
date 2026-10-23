# ADR 0001 — Rotas por hash na SPA pública

**Status:** aceita (2026-10-22)

## Contexto

O app público é uma SPA estática, publicada no GitHub Pages, sem servidor de
rewrite. Links antigos usavam `href="#"` e `data-page`; recarregar uma página
interna não preservava a rota.

## Decisão

- A rota canônica é `#/pagina` (ex.: `#/funcionarios`).
- `#pagina` é canonicalizado para `#/pagina` sem criar entrada duplicada no
  histórico.
- A navegação usa `pushState`/`hashchange` para permitir voltar e avançar.
- Hash inválido cai no dashboard.

## Consequências

- Links profundos funcionam em hospedagem estática.
- O servidor não precisa de fallback para `index.html`.
- O crawler indexa apenas a raiz; o conteúdo interno não é uma URL própria.
- O admin continua fora do escopo do roteamento público.

## Alternativas descartadas

- History API com rewrite no servidor: não há servidor no GitHub Pages.
- Múltiplos HTMLs: duplicaria shell, boot e navegação.
