-- ============================================================================
-- 0004_storage_gate.sql
-- ----------------------------------------------------------------------------
-- Bloco 3b (parte 1) — fecha QUEM pode listar, sobrescrever e apagar arquivos.
--
-- Projeto : yiujxempodimegdoexqo (SisAgri / SMADER)
-- Escrito : 2026-10-19
-- Depende : 0002_admin_gate.sql (usa public.is_admin())
-- Status  : ver supabase/README.md — aplicado em 2026-10-19.
--
-- ----------------------------------------------------------------------------
-- O FURO QUE ESTE ARQUIVO FECHA (medido)
-- ----------------------------------------------------------------------------
-- As 12 policies de `storage.objects` eram `to authenticated` com a única
-- condição `bucket_id = '...'`. Traduzindo: QUALQUER conta autenticada podia
-- listar, sobrescrever e apagar qualquer arquivo dos 3 buckets. É exatamente o
-- mesmo furo do C2 que o 0002 fechou nas tabelas — só que nos arquivos.
--
--   select policyname, cmd, roles from pg_policies
--    where schemaname='storage' and tablename='objects';
--   -> 12 linhas, todas {authenticated}, nenhuma com is_admin()
--
-- ----------------------------------------------------------------------------
-- O QUE ESTE ARQUIVO **NÃO** FECHA — leia antes de relaxar
-- ----------------------------------------------------------------------------
-- Os 3 buckets continuam `public = true`. Isso significa que qualquer objeto
-- continua acessível por
--
--   /storage/v1/object/public/<bucket>/<caminho>
--
-- sem credencial nenhuma, porque URL pública **não consulta policy**. Fechar
-- isso exige bucket privado + URL assinada, que mexe no `script.js` e nas URLs
-- já gravadas no banco — é o Bloco 3b (parte 2), ainda pendente.
--
-- Ou seja: depois deste arquivo, um upload NOVO feito em rascunho continua
-- nascendo público. O que muda é que ninguém além do admin pode listar,
-- sobrescrever ou apagar.
--
-- Observação: `anon` não tem policy nenhuma em `storage.objects`, então já não
-- lista nada. Este arquivo não cria policy para `anon` — o site público lê por
-- URL direta, sem passar por RLS.
--
-- ----------------------------------------------------------------------------
-- ORDEM DE ESCRITA: preservei os nomes das policies
-- ----------------------------------------------------------------------------
-- Cada `drop policy if exists` + `create policy` usa o MESMO nome de antes, para
-- não sobrar policy órfã nem quebrar nada que dependa do nome.
--
-- ----------------------------------------------------------------------------
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- Recriar as 12 policies no formato antigo (copiado da baseline do Bloco 2):
--
--   create policy "arquivos_smader_select_auth" on storage.objects
--     for select to authenticated using (bucket_id = 'arquivos-smader'::text);
--   ... e assim por diante para os 3 buckets × SELECT/INSERT/UPDATE/DELETE.
--
-- O baseline completo de `storage.objects` está em
-- `0001_baseline_policies.sql` (seção de storage).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. bucket arquivos-smader
-- ----------------------------------------------------------------------------
drop policy if exists "arquivos_smader_select_auth" on storage.objects;
create policy "arquivos_smader_select_auth" on storage.objects
  for select to authenticated
  using ((bucket_id = 'arquivos-smader'::text) and public.is_admin());

drop policy if exists "arquivos_smader_insert_auth" on storage.objects;
create policy "arquivos_smader_insert_auth" on storage.objects
  for insert to authenticated
  with check ((bucket_id = 'arquivos-smader'::text) and public.is_admin());

drop policy if exists "arquivos_smader_update_auth" on storage.objects;
create policy "arquivos_smader_update_auth" on storage.objects
  for update to authenticated
  using ((bucket_id = 'arquivos-smader'::text) and public.is_admin())
  with check ((bucket_id = 'arquivos-smader'::text) and public.is_admin());

drop policy if exists "arquivos_smader_delete_auth" on storage.objects;
create policy "arquivos_smader_delete_auth" on storage.objects
  for delete to authenticated
  using ((bucket_id = 'arquivos-smader'::text) and public.is_admin());


-- ----------------------------------------------------------------------------
-- 2. bucket funcionarios-fotos-smader
-- ----------------------------------------------------------------------------
drop policy if exists "funcionarios_fotos_select_auth" on storage.objects;
create policy "funcionarios_fotos_select_auth" on storage.objects
  for select to authenticated
  using ((bucket_id = 'funcionarios-fotos-smader'::text) and public.is_admin());

drop policy if exists "funcionarios_fotos_insert_auth" on storage.objects;
create policy "funcionarios_fotos_insert_auth" on storage.objects
  for insert to authenticated
  with check ((bucket_id = 'funcionarios-fotos-smader'::text) and public.is_admin());

drop policy if exists "funcionarios_fotos_update_auth" on storage.objects;
create policy "funcionarios_fotos_update_auth" on storage.objects
  for update to authenticated
  using ((bucket_id = 'funcionarios-fotos-smader'::text) and public.is_admin())
  with check ((bucket_id = 'funcionarios-fotos-smader'::text) and public.is_admin());

drop policy if exists "funcionarios_fotos_delete_auth" on storage.objects;
create policy "funcionarios_fotos_delete_auth" on storage.objects
  for delete to authenticated
  using ((bucket_id = 'funcionarios-fotos-smader'::text) and public.is_admin());


-- ----------------------------------------------------------------------------
-- 3. bucket manuais-imagens-smader
-- ----------------------------------------------------------------------------
drop policy if exists "manuais_imagens_select_auth" on storage.objects;
create policy "manuais_imagens_select_auth" on storage.objects
  for select to authenticated
  using ((bucket_id = 'manuais-imagens-smader'::text) and public.is_admin());

drop policy if exists "manuais_imagens_insert_auth" on storage.objects;
create policy "manuais_imagens_insert_auth" on storage.objects
  for insert to authenticated
  with check ((bucket_id = 'manuais-imagens-smader'::text) and public.is_admin());

drop policy if exists "manuais_imagens_update_auth" on storage.objects;
create policy "manuais_imagens_update_auth" on storage.objects
  for update to authenticated
  using ((bucket_id = 'manuais-imagens-smader'::text) and public.is_admin())
  with check ((bucket_id = 'manuais-imagens-smader'::text) and public.is_admin());

drop policy if exists "manuais_imagens_delete_auth" on storage.objects;
create policy "manuais_imagens_delete_auth" on storage.objects
  for delete to authenticated
  using ((bucket_id = 'manuais-imagens-smader'::text) and public.is_admin());


-- ----------------------------------------------------------------------------
-- 4. Trava: aborta a migration se sobrou policy de authenticated sem o gate
-- ----------------------------------------------------------------------------
-- Mesmo padrão do 0002. Se este bloco levantar exceção, a migration inteira é
-- desfeita — melhor não aplicar do que aplicar pela metade.
do $$
declare
  restantes int;
begin
  select count(*) into restantes
    from pg_policies
   where schemaname = 'storage'
     and tablename  = 'objects'
     and roles::text like '%authenticated%'
     and coalesce(qual, '')       not like '%is_admin%'
     and coalesce(with_check, '') not like '%is_admin%';

  if restantes > 0 then
    raise exception
      'ABORTADO: % policy(s) de authenticated em storage.objects sem is_admin()',
      restantes;
  end if;
end $$;
-- ============================================================================
