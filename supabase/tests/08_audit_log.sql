-- ============================================================================
-- 08_audit_log.sql — verificacao da fase 2.2 (historico de alteracoes)
--
-- Rode depois de 0016_audit_log.sql. Cada consulta traz o resultado esperado
-- no comentario. O bloco de comportamento (T5) roda dentro de uma transacao
-- com ROLLBACK: cria/edita/apaga um registro de teste e desfaz tudo no fim.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- T1. Estrutura: tabela, colunas, PK e check da operacao
--     Esperado: 9 colunas | pk = audit_log_pkey | check com insert/update/delete
-- ---------------------------------------------------------------------------
select
  count(*) as n_colunas,
  (select pg_get_constraintdef(oid)
     from pg_constraint
    where conname = 'audit_log_pkey'
      and conrelid = 'public.audit_log'::regclass) as pk,
  (select pg_get_constraintdef(oid)
     from pg_constraint
    where conname = 'audit_log_operacao_check'
      and conrelid = 'public.audit_log'::regclass) as check_operacao
from information_schema.columns
where table_schema = 'public'
  and table_name = 'audit_log';

-- ---------------------------------------------------------------------------
-- T2. Indices para os filtros da tela (data, tabela+data, usuario+data)
--     Esperado: 3 linhas
-- ---------------------------------------------------------------------------
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'audit_log'
order by indexname;

-- ---------------------------------------------------------------------------
-- T3. RLS ligada, uma policy de SELECT por pode_editar(), nenhuma de escrita
--     Esperado: rls = true | select_pode_editar = 1 | policies_escrita = 0
-- ---------------------------------------------------------------------------
select
  (select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass) as rls,
  count(*) filter (where cmd = 'SELECT' and coalesce(qual, '') like '%pode_editar%') as select_pode_editar,
  count(*) filter (where cmd in ('INSERT', 'UPDATE', 'DELETE')) as policies_escrita
from pg_policies
where schemaname = 'public' and tablename = 'audit_log';

-- ---------------------------------------------------------------------------
-- T4. Privilegios: anon nunca le nem escreve; authenticated so le
--     Esperado: anon_select = false | anon_insert = false |
--               auth_select = true | auth_insert = false
-- ---------------------------------------------------------------------------
select
  has_table_privilege('anon', 'public.audit_log', 'select') as anon_select,
  has_table_privilege('anon', 'public.audit_log', 'insert') as anon_insert,
  has_table_privilege('authenticated', 'public.audit_log', 'select') as auth_select,
  has_table_privilege('authenticated', 'public.audit_log', 'insert') as auth_insert;

-- ---------------------------------------------------------------------------
-- T5. Trigger e funcao: 14 triggers AFTER, funcao SECURITY DEFINER com
--     search_path fixo e sem execute para anon
--     Esperado: triggers = 14 | security_definer = true | search_path_fixo = true |
--               anon_executa_limpeza = false
-- ---------------------------------------------------------------------------
select
  (select count(*) from pg_trigger
    where tgrelid in (
      select c.oid from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
          'acesso_rapido','agenda_eventos','arquivos','avisos','escala_ferias',
          'funcionarios','info_juridico','info_municipio','info_orgaos','manuais',
          'processos','servicos','sistemas','veiculos'
        )
    )
      and tgname = 'auditar_alteracoes'
      and not tgisinternal) as triggers,
  (select prosecdef from pg_proc
    where proname = 'registrar_auditoria'
      and pronamespace = 'public'::regnamespace) as security_definer,
  (select proconfig is not null from pg_proc
    where proname = 'registrar_auditoria'
      and pronamespace = 'public'::regnamespace) as search_path_fixo,
  has_function_privilege('anon', 'public.limpar_audit_log(integer)', 'execute') as anon_executa_limpeza;

-- ---------------------------------------------------------------------------
-- T6. Comportamento e privacidade (transacao com ROLLBACK)
--     Esperado:
--       insert  -> operacao=insert, campos={}, rotulo preenchido
--       update  -> operacao=update, campos={titulo}
--       delete  -> operacao=delete, campos={}
--       cpf     -> campos contem 'cpf' e NENHUMA coluna do log guarda o valor
-- ---------------------------------------------------------------------------
begin;

insert into public.manuais (titulo, categoria, descricao, publish_status)
values ('TESTE AUDITORIA 2.2', 'teste', 'linha de teste do 08_audit_log.sql', 'draft');

update public.manuais
   set titulo = 'TESTE AUDITORIA 2.2 (editado)'
 where titulo = 'TESTE AUDITORIA 2.2';

insert into public.funcionarios (nome, cpf, publish_status)
values ('TESTE AUDITORIA CPF', '123.456.789-00', 'draft');

update public.funcionarios
   set cpf = '987.654.321-00'
 where nome = 'TESTE AUDITORIA CPF';

select operacao, campos, rotulo
from public.audit_log
where tabela = 'manuais'
order by id;

select operacao, campos
from public.audit_log
where tabela = 'funcionarios'
order by id;

-- Esperado: 0 linhas (nenhum valor de CPF pode aparecer no log)
select count(*) as vazamentos
from public.audit_log
where array_to_string(campos, ',') like '%123.456%'
   or array_to_string(campos, ',') like '%987.654%'
   or coalesce(rotulo, '') like '%123.456%'
   or coalesce(rotulo, '') like '%987.654%';

delete from public.manuais where titulo like 'TESTE AUDITORIA 2.2%';
delete from public.funcionarios where nome = 'TESTE AUDITORIA CPF';

-- Esperado: delete | {} (as duas linhas apagadas acima)
select operacao, campos, rotulo
from public.audit_log
where tabela in ('manuais', 'funcionarios')
  and operacao = 'delete'
order by id;

rollback;

-- ---------------------------------------------------------------------------
-- T7. Retencao: funcao existe, exige admin e tem default de 12 meses
--     Esperado: 1 linha com defaults = '{12}' e security_definer = true
-- ---------------------------------------------------------------------------
select
  pg_get_function_arguments(oid) as argumentos,
  pg_get_functiondef(oid) like '%make_interval(months => p_meses)%' as usa_intervalo,
  prosecdef as security_definer
from pg_proc
where proname = 'limpar_audit_log'
  and pronamespace = 'public'::regnamespace;
