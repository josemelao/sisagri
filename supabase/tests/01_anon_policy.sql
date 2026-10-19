-- ============================================================================
-- 01_anon_policy.sql — verificação da política pública de leitura
-- Bloco 1 do v2_plano_refatoração.md
--
-- Como rodar: execute cada consulta separadamente via MCP (execute_sql) ou psql.
--
-- C1 = esperado ZERO linhas (falha se retornar algo)
-- C2 = esperado ZERO linhas (falha se retornar algo)
-- C3 = esperado 42 linhas ANTES do Bloco 3 e ZERO DEPOIS do Bloco 3
-- ============================================================================

-- ---------------------------------------------------------------------------
-- C1. Tabelas de conteúdo sem policy anon de leitura de publicado
--     Esperado: ZERO linhas
-- ---------------------------------------------------------------------------
with esperadas(t) as (
  values
    ('acesso_rapido'), ('agenda_eventos'), ('arquivos'), ('avisos'),
    ('escala_ferias'), ('funcionarios'), ('info_juridico'), ('info_municipio'),
    ('info_orgaos'), ('manuais'), ('processos'), ('servicos'),
    ('sistemas'), ('veiculos')
)
select e.t as tabela_sem_policy_anon_de_publicado
from esperadas e
where not exists (
  select 1
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename  = e.t
    and p.cmd        = 'SELECT'
    and p.roles::text like '%anon%'
    and coalesce(p.qual, '') like '%publish_status%'
);

-- ---------------------------------------------------------------------------
-- C2. Tabelas públicas sem RLS habilitado
--     Esperado: ZERO linhas
-- ---------------------------------------------------------------------------
select c.relname as tabela_sem_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by c.relname;

-- ---------------------------------------------------------------------------
-- C3. Dívida do Bloco 3: policies de escrita liberadas para qualquer autenticado
--     Esperado: 42 linhas antes do Bloco 3 · ZERO depois
--
--     ATENÇÃO ao NULL: policies de INSERT não têm USING (qual = NULL) e
--     policies de DELETE não têm WITH CHECK (with_check = NULL). Um
--     coalesce(qual,'true') ingênuo gera falso positivo em admin_settings.
--     Por isso cada comando é julgado pela cláusula que ele realmente possui.
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
-- C4. Inventário de policies por tabela (leitura de referência)
--     Esperado: 1 anon + 4 authenticated nas 14 tabelas de conteúdo;
--               0 anon + 3 authenticated em admin_settings
-- ---------------------------------------------------------------------------
select
  tablename,
  count(*) filter (where roles::text like '%anon%')          as pol_anon,
  count(*) filter (where roles::text like '%authenticated%') as pol_autenticado
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;
