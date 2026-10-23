# ADR 0002 — `publish_status` fail-closed

**Status:** aceita (2026-10-22)

## Contexto

O sistema tem conteúdo público e conteúdo em rascunho. O campo operacional
`status` (ex.: `ativo`, `ferias`) não indica publicação. A ausência de
`publish_status` já causou risco de exposição.

## Decisão

- Só é público o registro com `publish_status === 'published'`.
- Registro sem status, com status desconhecido ou com erro de leitura é tratado
  como rascunho.
- A regra é aplicada em duas camadas: RLS no Supabase e filtro no frontend.
- O admin não publica automaticamente ao salvar.

## Consequências

- Um erro de configuração falha fechado (esconde), não aberto (expõe).
- Consultas anônimas precisam incluir `publish_status=eq.published`.
- Testes de fumaça devem comparar contagens públicas antes/depois de mudanças.

## Alternativas descartadas

- Confiar só no filtro do frontend: qualquer query direta contornaria.
- Confiar só na RLS: o app ainda renderizaria dados indevidos se a policy
  regredisse.
