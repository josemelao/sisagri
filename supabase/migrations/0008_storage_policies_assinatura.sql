-- ============================================================================
-- 0008_storage_policies_assinatura.sql — Bloco 3b parte 2 (fase 1)
-- ----------------------------------------------------------------------------
-- Cria a LEITURA minima para o app assinar URL de objeto PUBLICADO.
--
-- Por que esta migration vem antes do codigo:
--   a Storage API exige SELECT em storage.objects para createSignedUrl, mesmo
--   com o bucket ainda publico. Sem esta policy, o codigo novo cairia no
--   fallback legado.
--
-- Por que e segura:
--   * e aditiva (OR): nao remove nem altera nenhuma policy existente;
--   * nao muda o bucket (continua publico nesta fase);
--   * so libera objeto cujo registro em public.* esta 'published';
--   * rascunho continua invisivel para anon.
--
-- Ordem de implantacao:
--   1. aplicar esta migration (producao e teste);
--   2. publicar o codigo com URL assinada;
--   3. aplicar 0009_storage_buckets_privados.sql.
--
-- Rollback:
--   drop policy if exists "storage_arquivos_select_publico" on storage.objects;
--   drop policy if exists "storage_funcionarios_select_publico" on storage.objects;
-- ============================================================================

-- ---------------------------------------------------------------------------
-- arquivos-smader
-- ---------------------------------------------------------------------------
drop policy if exists "storage_arquivos_select_publico" on storage.objects;
create policy "storage_arquivos_select_publico" on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'arquivos-smader'
    and exists (
      select 1
      from public.arquivos a
      where a.storage_path = storage.objects.name
        and coalesce(a.storage_bucket, 'arquivos-smader') = storage.objects.bucket_id
        and a.publish_status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- funcionarios-fotos-smader
-- ---------------------------------------------------------------------------
drop policy if exists "storage_funcionarios_select_publico" on storage.objects;
create policy "storage_funcionarios_select_publico" on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'funcionarios-fotos-smader'
    and exists (
      select 1
      from public.funcionarios f
      where f.foto_storage_path = storage.objects.name
        and coalesce(f.foto_storage_bucket, 'funcionarios-fotos-smader') = storage.objects.bucket_id
        and f.publish_status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- manuais-imagens-smader fica com o bucket publico nesta fase (sem coluna de
-- vinculo; as imagens vivem dentro de manuais.passos). Ver o design em
-- docs/superpowers/specs/2026-10-20-storage-url-assinada.md.
-- ---------------------------------------------------------------------------
