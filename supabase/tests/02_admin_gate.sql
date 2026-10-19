-- ============================================================================
-- 02_admin_gate.sql — verificação do Bloco 3 (gate is_admin)
--
-- Rode isto DENTRO da transação, depois de 0002_admin_gate.sql, antes do commit.
-- Também serve como teste de regressão depois do deploy.
--
-- Como rodar: execute cada consulta separadamente via MCP (execute_sql) ou psql.
--
-- C5, C6, C9, C10, C11 = esperado ZERO colunas de falha (ou valor exato indicado)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- C5. Não sobrou policy de escrita always-true para `authenticated`
--     Esperado: ZERO linhas  (era 42 antes do Bloco 3)
-- ---------------------------------------------------------------------------
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and roles::text like '%authenticated%'
  and (
        (cmd = 'INSERT' and with_check = 'true')
     or (cmd = 'UPDATE' and (qual = 'true' or with_check = 'true'))
     or (cmd = 'DELETE' and qual = 'true')
  )
order by tablename, cmd;

-- ---------------------------------------------------------------------------
-- C6. Exatamente 42 policies de escrita passaram a usar is_admin()
--     Esperado: n_escrita = 42
-- ---------------------------------------------------------------------------
select
  cmd,
  count(*) as n_escrita
from pg_policies
where schemaname = 'public'
  and roles::text like '%authenticated%'
  and cmd in ('INSERT', 'UPDATE', 'DELETE')
  and (coalesce(qual, '') like '%is_admin%' or coalesce(with_check, '') like '%is_admin%')
group by cmd
order by cmd;

-- ---------------------------------------------------------------------------
-- C7. is_admin() existe, é SECURITY DEFINER, STABLE e com search_path fixo
--     Esperado: 1 linha, security_definer = true, stable = true
-- ---------------------------------------------------------------------------
select
  p.proname,
  p.prosecdef  as security_definer,
  p.provolatile = 's' as stable,
  p.proconfig  as search_path_fixo
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_admin';

-- ---------------------------------------------------------------------------
-- C8. app_admins tem o administrador semeado
--     Esperado: n >= 1
-- ---------------------------------------------------------------------------
select count(*) as administradores from public.app_admins;

-- ---------------------------------------------------------------------------
-- C9. As 14 policies `anon` de leitura continuam intactas
--     Esperado: ZERO linhas (nenhuma delas foi alterada/removida)
-- ---------------------------------------------------------------------------
with esperadas(t) as (
  values
    ('acesso_rapido'), ('agenda_eventos'), ('arquivos'), ('avisos'),
    ('escala_ferias'), ('funcionarios'), ('info_juridico'), ('info_municipio'),
    ('info_orgaos'), ('manuais'), ('processos'), ('servicos'),
    ('sistemas'), ('veiculos')
)
select e.t as tabela_anon_afetada
from esperadas e
where not exists (
  select 1 from pg_policies p
  where p.schemaname = 'public'
    and p.tablename  = e.t
    and p.cmd        = 'SELECT'
    and p.roles::text like '%anon%'
    and p.qual = '(publish_status = ''published''::text)'
    and p.policyname like 'Leitura publica published%'
);

-- ---------------------------------------------------------------------------
-- C10. Contagem total de policies em public não mudou
--      Esperado: n = 73 (o Bloco 3 troca conteúdo, não cria nem remove policy)
-- ---------------------------------------------------------------------------
select count(*) as total_policies_public from pg_policies where schemaname = 'public';

-- ---------------------------------------------------------------------------
-- C11. N1 fechado: anon/authenticated não executam mais rls_auto_enable()
--      Esperado: ZERO linhas (ambos false)
-- ---------------------------------------------------------------------------
select
  'anon' as papel,
  has_function_privilege('anon', 'public.rls_auto_enable()', 'execute') as pode_executar
where has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')
union all
select
  'authenticated',
  has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute')
where has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute');
