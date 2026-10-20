-- ============================================================================
-- 0011_manuais_imagens_bucket_privado.sql — Bloco 3c/13 (fase 2)
-- ----------------------------------------------------------------------------
-- Torna privado o bucket de imagens de manuais.
--
-- Aplicar SOMENTE depois de:
--   1. 0010_manuais_imagens_policy.sql aplicada;
--   2. codigo com imagem_url_assinada publicado e validado;
--   3. as imagens publicadas carregarem via URL assinada.
--
-- Com o bucket privado, a URL publica antiga para de funcionar. O app usa a URL
-- assinada (1 h) e, para legado sem storage_path, mantem a imagem externa.
--
-- Rollback (devolve o acesso publico imediatamente):
--   update storage.buckets
--      set public = true
--    where id = 'manuais-imagens-smader';
-- ============================================================================

update storage.buckets
   set public = false
 where id = 'manuais-imagens-smader';
