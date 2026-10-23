# ADR 0003 — Storage privado com URL assinada

**Status:** aceita (2026-10-22)

## Contexto

Arquivos e imagens de manuais eram servidos por URL pública. Despublicar um
registro não removia o acesso ao objeto já conhecido. O bucket
`manuais-imagens-smader` também precisava fechar.

## Decisão

- Buckets de arquivos e imagens são **privados**.
- A policy de `SELECT` libera assinatura apenas quando existe registro
  publicado vinculado ao objeto.
- O frontend assina a URL sob demanda e mantém o resultado **em memória**.
- Não há Edge Function no caminho: a RLS expressa a regra.
- Imagem de rascunho não é assinada para `anon`.

## Consequências

- URL pública antiga deixa de funcionar (pode responder por cache).
- O app precisa tratar falha de assinatura e usar fallback visual.
- O admin autenticado pode assinar publicado e rascunho.
- A decisão de Edge Function fica reservada para um caso que a RLS não consiga
  expressar; hoje não é o caso.

## Alternativas descartadas

- Bucket público com URL longa: não protege rascunho.
- Edge Function com `service_role`: mais peças, secret e cold start sem ganho.
