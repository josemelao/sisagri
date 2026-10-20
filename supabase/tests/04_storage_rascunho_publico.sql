-- ============================================================================
-- 04_storage_rascunho_publico.sql — o guarda do N5
-- ----------------------------------------------------------------------------
-- Responde uma pergunta só: **existe algum objeto alcançável por URL pública
-- que não deveria estar?**
--
-- Regra: o resultado esperado é **0 linhas**. Qualquer linha aqui é um arquivo
-- servido em /storage/v1/object/public/... pertencente a um registro NÃO
-- publicado (ou sem registro nenhum).
--
-- Rode como `postgres` (o MCP serve). Não precisa de transação: é só leitura.
--
-- LIMITE CONHECIDO — leia antes de confiar demais
-- ----------------------------------------------------------------------------
-- Este teste compara `storage.objects` com as colunas de vínculo que existem
-- no banco: `arquivos.storage_path` e `funcionarios.foto_storage_path`.
--
-- `manuais` passou a ter vínculo em `passos[].imagem_storage_path` no Bloco
-- 3c/13. A autorização desse bucket é coberta por
-- `07_manuais_imagens_storage.sql`; este guarda continua focado nos buckets
-- públicos de arquivos e funcionários.
--
-- Também importante: este teste prova o estado dos REGISTROS. Ele não prova o
-- MECANISMO. Enquanto os buckets forem `public = true`, um upload novo em
-- rascunho nasce público e só aparece aqui se tiver registro vinculado.
-- Fechar o mecanismo é o Bloco 3b (bucket privado + URL assinada).
-- ============================================================================

-- 1) Buckets públicos hoje (informativo; não é falha)
select b.id as bucket, b.public as publico, count(o.id) as objetos
  from storage.buckets b
  left join storage.objects o on o.bucket_id = b.id
 group by b.id, b.public
 order by b.id;

-- 2) O teste de verdade: esperado 0 linhas
select origem, registro, url_publica from (

  -- rascunho de arquivo com objeto enviado
  select 'arquivos: rascunho com objeto' as origem,
         a.id::text as registro,
         a.url as url_publica
    from public.arquivos a
    join storage.objects o
      on o.bucket_id = a.storage_bucket
     and o.name     = a.storage_path
   where a.publish_status <> 'published'

  union all

  -- rascunho de funcionário com foto enviada
  select 'funcionarios: rascunho com objeto',
         f.id::text,
         f.foto
    from public.funcionarios f
    join storage.objects o
      on o.bucket_id = f.foto_storage_bucket
     and o.name     = f.foto_storage_path
   where f.publish_status <> 'published'

  union all

  -- objeto sem nenhum registro apontando (lixo público)
  select 'orfao', o.name, null
    from storage.objects o
   where (o.bucket_id = 'arquivos-smader'
          and not exists (select 1 from public.arquivos a
                           where a.storage_path = o.name))
      or (o.bucket_id = 'funcionarios-fotos-smader'
          and not exists (select 1 from public.funcionarios f
                           where f.foto_storage_path = o.name))

) v
order by origem, registro;
