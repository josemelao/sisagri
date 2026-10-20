-- ============================================================================
-- 0006_rls_papeis.sql — Bloco 6: policies por operacao
--
-- Depende de 0005_rbac_papel.sql (pode_editar()).
--
--   INSERT / UPDATE  -> pode_editar()      (admin ou servidor)
--   DELETE           -> is_admin()         (sem mudanca)
--   SELECT auth      -> published OR pode_editar()
--   SELECT anon      -> published          (sem mudanca)
--   admin_settings   -> is_admin()         (sem mudanca)
--
-- Nomes, roles e contagem de policies nao mudam: so o conteudo.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'acesso_rapido', 'agenda_eventos', 'arquivos', 'avisos',
    'escala_ferias', 'funcionarios', 'info_juridico', 'info_municipio',
    'info_orgaos', 'manuais', 'processos', 'servicos',
    'sistemas', 'veiculos'
  ] loop
    execute format(
      'alter policy %I on public.%I with check (public.pode_editar())',
      'Insercao autenticada ' || t, t
    );
    execute format(
      'alter policy %I on public.%I using (public.pode_editar()) with check (public.pode_editar())',
      'Atualizacao autenticada ' || t, t
    );
    execute format(
      'alter policy %I on public.%I using ((publish_status = ''published''::text) or public.pode_editar())',
      'Leitura autenticada ' || t, t
    );
  end loop;
end $$;

-- Storage: servidor precisa subir/trocar/listar imagens; excluir continua admin.
alter policy arquivos_smader_select_auth on storage.objects
  using (bucket_id = 'arquivos-smader' and public.pode_editar());
alter policy arquivos_smader_insert_auth on storage.objects
  with check (bucket_id = 'arquivos-smader' and public.pode_editar());
alter policy arquivos_smader_update_auth on storage.objects
  using (bucket_id = 'arquivos-smader' and public.pode_editar())
  with check (bucket_id = 'arquivos-smader' and public.pode_editar());

alter policy funcionarios_fotos_select_auth on storage.objects
  using (bucket_id = 'funcionarios-fotos-smader' and public.pode_editar());
alter policy funcionarios_fotos_insert_auth on storage.objects
  with check (bucket_id = 'funcionarios-fotos-smader' and public.pode_editar());
alter policy funcionarios_fotos_update_auth on storage.objects
  using (bucket_id = 'funcionarios-fotos-smader' and public.pode_editar())
  with check (bucket_id = 'funcionarios-fotos-smader' and public.pode_editar());

alter policy manuais_imagens_select_auth on storage.objects
  using (bucket_id = 'manuais-imagens-smader' and public.pode_editar());
alter policy manuais_imagens_insert_auth on storage.objects
  with check (bucket_id = 'manuais-imagens-smader' and public.pode_editar());
alter policy manuais_imagens_update_auth on storage.objects
  using (bucket_id = 'manuais-imagens-smader' and public.pode_editar())
  with check (bucket_id = 'manuais-imagens-smader' and public.pode_editar());

-- Rollback (nao executar aqui): recriar as mesmas policies com is_admin()
-- usando os valores de 0001/0003/0004, ou restaurar a baseline do Bloco 2.
