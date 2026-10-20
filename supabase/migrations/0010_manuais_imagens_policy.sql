-- ============================================================================
-- 0010_manuais_imagens_policy.sql — Bloco 3c/13 (fase 1)
-- ----------------------------------------------------------------------------
-- Cria a LEITURA minima para o app assinar imagem de manual PUBLICADO.
--
-- Por que esta migration vem antes do codigo:
--   a Storage API exige SELECT em storage.objects para createSignedUrl. Sem esta
--   policy, o codigo novo nao consegue assinar as imagens de manuais.
--
-- Por que e segura:
--   * e aditiva (OR): nao remove nem altera nenhuma policy existente;
--   * nao muda o bucket (continua publico nesta fase);
--   * so libera objeto referenciado por manual 'published';
--   * rascunho continua invisivel para anon;
--   * a policy existente de staff (pode_editar) continua valendo.
--
-- Ordem de implantacao:
--   1. aplicar esta migration (teste e producao);
--   2. publicar o codigo com URL assinada;
--   3. validar as imagens publicadas;
--   4. aplicar 0011_manuais_imagens_bucket_privado.sql.
--
-- Rollback:
--   drop policy if exists "storage_manuais_imagens_select_publico" on storage.objects;
-- ============================================================================

drop policy if exists "storage_manuais_imagens_select_publico" on storage.objects;

create policy "storage_manuais_imagens_select_publico" on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'manuais-imagens-smader'
    and exists (
      select 1
      from public.manuais m
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(m.passos) = 'array' then m.passos
          else '[]'::jsonb
        end
      ) p
      where m.publish_status = 'published'
        and p->>'imagem_storage_path' = storage.objects.name
        and coalesce(
          p->>'imagem_storage_bucket',
          'manuais-imagens-smader'
        ) = storage.objects.bucket_id
    )
  );
