-- ============================================================================
-- 05_rbac.sql — verificação do Bloco 6 (papel servidor)
--
-- Rode depois de 0005_rbac_papel.sql + 0006_rls_papeis.sql.
-- Cada consulta traz o resultado esperado no comentário.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- C1. app_admins.role existe, NOT NULL, com check de valores
--     Esperado: role_nullable = false | constraint = app_admins_role_check
-- ---------------------------------------------------------------------------
select
  column_name,
  is_nullable,
  (select pg_get_constraintdef(oid)
     from pg_constraint
    where conname = 'app_admins_role_check'
      and conrelid = 'public.app_admins'::regclass) as constraint_role
from information_schema.columns
where table_schema = 'public'
  and table_name = 'app_admins'
  and column_name = 'role';

-- ---------------------------------------------------------------------------
-- C2. A conta existente continua admin (backfill)
--     Esperado: n_admin >= 1 e n_sem_papel = 0
-- ---------------------------------------------------------------------------
select
  count(*) filter (where role = 'admin') as n_admin,
  count(*) filter (where role = 'servidor') as n_servidor,
  count(*) as total,
  count(*) filter (where role is null) as n_sem_papel
from public.app_admins;

-- ---------------------------------------------------------------------------
-- C3. Funcoes existem, SECURITY DEFINER, STABLE, search_path fixo
--     Esperado: 3 linhas, todas true
-- ---------------------------------------------------------------------------
select
  p.proname,
  p.prosecdef as security_definer,
  p.provolatile = 's' as stable,
  p.proconfig as search_path_fixo
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_admin', 'pode_editar', 'meu_papel')
order by p.proname;

-- ---------------------------------------------------------------------------
-- C4. Escrita de conteudo usa pode_editar(); is_admin() sumiu de INSERT/UPDATE
--     Esperado: cmd INSERT = 14 | cmd UPDATE = 14 | n_com_is_admin = 0
-- ---------------------------------------------------------------------------
select
  cmd,
  count(*) as n_pode_editar,
  count(*) filter (
    where coalesce(qual, '') like '%is_admin%'
       or coalesce(with_check, '') like '%is_admin%'
  ) as n_com_is_admin
from pg_policies
where schemaname = 'public'
  and tablename <> 'admin_settings'
  and cmd in ('INSERT', 'UPDATE')
  and (coalesce(qual, '') like '%pode_editar%' or coalesce(with_check, '') like '%pode_editar%')
group by cmd
order by cmd;

-- ---------------------------------------------------------------------------
-- C5. DELETE continua exclusivo do admin
--     Esperado: n = 14, todas com is_admin e nenhuma com pode_editar
-- ---------------------------------------------------------------------------
select
  count(*) as n_delete,
  count(*) filter (where coalesce(qual, '') like '%is_admin%') as n_is_admin,
  count(*) filter (where coalesce(qual, '') like '%pode_editar%') as n_pode_editar
from pg_policies
where schemaname = 'public'
  and tablename <> 'admin_settings'
  and cmd = 'DELETE';

-- ---------------------------------------------------------------------------
-- C6. Leitura: anon intacta; authenticated ve rascunho via pode_editar()
--     Esperado: anon = 14 | auth = 14
-- ---------------------------------------------------------------------------
select
  count(*) filter (where roles::text like '%anon%') as n_anon,
  count(*) filter (where roles::text like '%authenticated%') as n_auth,
  count(*) filter (
    where roles::text like '%authenticated%'
      and coalesce(qual, '') like '%pode_editar%'
  ) as n_auth_com_pode_editar
from pg_policies
where schemaname = 'public'
  and tablename <> 'admin_settings'
  and cmd = 'SELECT';

-- ---------------------------------------------------------------------------
-- C7. Contagem de policies nao mudou
--     Esperado: public = 73 | storage.objects = 12
-- ---------------------------------------------------------------------------
select
  (select count(*) from pg_policies where schemaname = 'public') as public_policies,
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects') as storage_policies;

-- ---------------------------------------------------------------------------
-- C8. Storage: subir/trocar/listar para servidor; excluir so admin
--     Esperado: editaveis = 9 | delete_admin = 3
-- ---------------------------------------------------------------------------
select
  count(*) filter (where cmd in ('INSERT', 'UPDATE', 'SELECT')
                     and coalesce(qual, '') || coalesce(with_check, '') like '%pode_editar%') as editaveis,
  count(*) filter (where cmd = 'DELETE'
                     and coalesce(qual, '') like '%is_admin%') as delete_admin
from pg_policies
where schemaname = 'storage' and tablename = 'objects';

-- ---------------------------------------------------------------------------
-- C9. admin_settings continua restrito ao admin
--     Esperado: 3 policies, todas com is_admin
-- ---------------------------------------------------------------------------
select
  count(*) as n,
  count(*) filter (
    where coalesce(qual, '') like '%is_admin%'
       or coalesce(with_check, '') like '%is_admin%'
  ) as n_is_admin
from pg_policies
where schemaname = 'public' and tablename = 'admin_settings';

-- ---------------------------------------------------------------------------
-- C10. anon/authenticated podem executar as funcoes de leitura de papel
--      Esperado: 2 linhas, pode_executar = true
-- ---------------------------------------------------------------------------
select 'anon' as papel,
       has_function_privilege('anon', 'public.meu_papel()', 'execute') as pode_executar
union all
select 'authenticated',
       has_function_privilege('authenticated', 'public.meu_papel()', 'execute');
