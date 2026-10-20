-- ============================================================================
-- 0009_storage_buckets_privados.sql — Bloco 3b parte 2 (fase 2)
-- ----------------------------------------------------------------------------
-- Torna privados os dois buckets com URL assinada.
--
-- Aplicar SOMENTE depois de:
--   1. 0008_storage_policies_assinatura.sql aplicada;
--   2. codigo com DB.createSignedUrl publicado e validado.
--
-- Com o bucket privado, a URL publica antiga para de funcionar. O app usa a
-- URL assinada (1 h) e, para legado sem storage_path, mantem foto/url salvas.
--
-- Rollback (devolve o acesso publico imediatamente):
--   update storage.buckets
--      set public = true
--    where id in ('arquivos-smader', 'funcionarios-fotos-smader');
--
-- manuais-imagens-smader continua publico nesta fase.
-- ============================================================================

update storage.buckets
   set public = false
 where id in ('arquivos-smader', 'funcionarios-fotos-smader');
