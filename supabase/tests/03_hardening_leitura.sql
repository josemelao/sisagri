-- ============================================================================
-- 03_hardening_leitura.sql — verificação do Bloco 3 (parte 2)
-- ----------------------------------------------------------------------------
-- Confere o estado produzido por 0002_admin_gate.sql + 0003_hardening_leitura.sql.
-- SOMENTE LEITURA quando rodado fora de transação. As medições por papel usam
-- `set local role`, então precisam de transação — rode o arquivo inteiro entre
-- `begin;` e `rollback;` para não deixar rastro.
--
-- O que o resultado esperado diz:
--   * não-admin vê 59 publicados e 0 rascunhos  -> o furo C2 está fechado
--   * não-admin NÃO perdeu a leitura pública    -> sem regressão
--   * admin vê 1 rascunho                       -> o dono continua trabalhando
--   * 0 policies de `authenticated` com `true`  -> nada ficou para trás
--   * 14 policies `anon`                        -> a proteção original intacta
-- ============================================================================

begin;

create temp table _verificacao(ordem int, rotulo text, valor text, esperado text);
grant insert on _verificacao to authenticated, anon;

-- --- anon ------------------------------------------------------------------
set local role anon;
insert into _verificacao values
  (1, 'anon: publicados', (select count(*)::text from public.arquivos where publish_status = 'published'), '59'),
  (2, 'anon: rascunhos',  (select count(*)::text from public.arquivos where publish_status = 'draft'),     '0');
reset role;

-- --- autenticado que NÃO é admin (sub inexistente) --------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
insert into _verificacao values
  (3, 'nao-admin: publicados',     (select count(*)::text from public.arquivos where publish_status = 'published'), '59'),
  (4, 'nao-admin: rascunhos',      (select count(*)::text from public.arquivos where publish_status = 'draft'),     '0'),
  (5, 'nao-admin: admin_settings', (select count(*)::text from public.admin_settings),                             '0'),
  (6, 'nao-admin: is_admin()',     (select public.is_admin()::text),                                              'false');
reset role;

-- --- admin (a conta do dono) ------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"fc124783-4dc3-46ec-9677-3b15282a7220"}';
insert into _verificacao values
  (7,  'admin: publicados',     (select count(*)::text from public.arquivos where publish_status = 'published'), '59'),
  (8,  'admin: rascunhos',      (select count(*)::text from public.arquivos where publish_status = 'draft'),     '1'),
  (9,  'admin: admin_settings', (select count(*)::text from public.admin_settings),                             '1'),
  (10, 'admin: is_admin()',     (select public.is_admin()::text),                                              'true');
reset role;

-- --- forma das policies -----------------------------------------------------
insert into _verificacao values
  (11, 'policies em public',                    (select count(*)::text from pg_policies where schemaname = 'public'), '73'),
  (12, 'policies citando is_admin',             (select count(*)::text from pg_policies where schemaname = 'public' and (coalesce(qual,'') like '%is_admin%' or coalesce(with_check,'') like '%is_admin%')), '59'),
  (13, 'authenticated ainda always-true',       (select count(*)::text from pg_policies where schemaname = 'public' and roles::text like '%authenticated%' and (qual = 'true' or with_check = 'true')), '0'),
  (14, 'policies anon intactas',                (select count(*)::text from pg_policies where schemaname = 'public' and roles::text like '%anon%'), '14'),
  (15, 'admins semeados',                       (select count(*)::text from public.app_admins), '1');

select ordem, rotulo, valor, esperado,
       case when valor = esperado then 'ok' else 'DIVERGE' end as situacao
from _verificacao
order by ordem;

rollback;
