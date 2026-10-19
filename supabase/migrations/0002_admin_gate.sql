-- ============================================================================
-- 0002_admin_gate.sql
-- ----------------------------------------------------------------------------
-- BLOCO 3 do v2_plano_refatoração.md — fecha o achado C2.
--
-- Projeto : yiujxempodimegdoexqo (SisAgri / SMADER)
-- Escrito : 2026-10-19
-- Status  : NÃO APLICADO. Aguarda teste em projeto de teste (ver supabase/README.md)
--
-- ----------------------------------------------------------------------------
-- O PROBLEMA (medido, não deduzido)
-- ----------------------------------------------------------------------------
-- Antes desta migration, qualquer conta autenticada tinha poder total. Provado
-- dentro de uma transação revertida, com um `sub` de usuário inexistente:
--
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"1111...1111"}';
--   insert into public.avisos (titulo) values ('PROBE');   -- SUCESSO
--   select count(*) from public.arquivos where publish_status='draft';  -- 1
--
-- Ou seja: escrevia em qualquer tabela E lia os rascunhos. Com o cadastro
-- público aberto (fechado no Bloco 0), isso era uma porta aberta na internet.
--
-- ----------------------------------------------------------------------------
-- A CORREÇÃO
-- ----------------------------------------------------------------------------
-- Substitui as 42 policies de escrita (14 tabelas x INSERT/UPDATE/DELETE) de
-- `using (true)` por `public.is_admin()`. Os NOMES das policies são mantidos de
-- propósito: nada de policy órfã, e o diff fica legível.
--
--   INSERT  -> with check (is_admin())
--   UPDATE  -> using (is_admin()) with check (is_admin())
--   DELETE  -> using (is_admin())
--
-- A policy `anon` de leitura NÃO é tocada por este arquivo. É ela que impede o
-- rascunho de vazar para o visitante e já está correta.
--
-- ----------------------------------------------------------------------------
-- COMO APLICAR
-- ----------------------------------------------------------------------------
--   begin;
--   \i supabase/migrations/0002_admin_gate.sql
--   -- rode supabase/tests/02_admin_gate.sql e confira todas as consultas
--   commit;   -- ou rollback; se algo não fechar
--
-- Rollback: supabase/migrations/0001_baseline_policies.sql devolve as 42
-- policies liberadas. Aplicar o baseline é a volta atrás.
--
-- ----------------------------------------------------------------------------
-- O QUE ESTA MIGRATION NÃO FAZ (por decisão)
-- ----------------------------------------------------------------------------
-- · Não mexe nas 15 policies de LEITURA de `authenticated` (14 tabelas +
--   admin_settings), que continuam `using (true)`. Endurecer a leitura é uma
--   decisão separada — ver a conversa do Bloco 3.
-- · Não mexe em `admin_settings` (3 policies), que já são restritas por
--   `scope = 'global'`, mas seguem abertas a qualquer autenticado.
-- · Não toca em Storage (Blocos 3b e 3c).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. QUEM É ADMIN — tabela de administradores
-- ----------------------------------------------------------------------------
-- Tabela nova, sem policy NENHUMA. RLS ligado + zero policy = ninguém lê por
-- PostgREST (nem `anon` nem `authenticated`), mesmo com o grant de tabela que o
-- Supabase dá por padrão a tabelas novas em `public`.
--
-- Só a função `is_admin()` lê esta tabela, porque é SECURITY DEFINER.
create table if not exists public.app_admins (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  observacao text
);

alter table public.app_admins enable row level security;

comment on table public.app_admins is
  'Administradores com poder total sobre o conteudo. Sem policy: so a funcao is_admin() le.';


-- ----------------------------------------------------------------------------
-- 2. O GATE — public.is_admin()
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER: roda como `postgres` (dono), então enxerga `app_admins`
-- apesar do RLS sem policy.
-- STABLE: o resultado não muda dentro da mesma consulta.
-- search_path fixo: evita seququestro de search_path em função DEFINER.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
  select exists (
    select 1 from public.app_admins where user_id = auth.uid()
  );
$fn$;

comment on function public.is_admin() is
  'true se auth.uid() esta em public.app_admins. Gate das policies de escrita.';

-- Toda função nasce executável por PUBLIC. Fechar e liberar só para quem usa:
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;


-- ----------------------------------------------------------------------------
-- 3. SEMEAR O ADMIN EXISTENTE
-- ----------------------------------------------------------------------------
-- A única conta do projeto hoje é o dono do painel:
--   jose.tadeu.junior@gmail.com  (criada em 2026-03-24)
--
-- Sem esta linha, o painel perde a escrita — o próprio admin seria barrado pelo
-- gate que ele mesmo instalou.
insert into public.app_admins (user_id, observacao)
select id, 'admin semeado no Bloco 3'
from auth.users
where id = 'fc124783-4dc3-46ec-9677-3b15282a7220'
on conflict (user_id) do nothing;

-- Trava de segurança: se a semeadura não pegou, ABORTA.
-- Melhor falhar aqui, com a transação aberta, do que trancar o painel em silêncio.
do $$
begin
  if (select count(*) from public.app_admins) = 0 then
    raise exception
      'Bloco 3 abortado: nenhum admin em public.app_admins. O painel perderia a escrita.';
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 4. AS 42 POLICIES DE ESCRITA (14 tabelas x INSERT/UPDATE/DELETE)
-- ----------------------------------------------------------------------------
-- Antes: to authenticated ... using (true) / with check (true)
-- Depois: to authenticated ... public.is_admin()
--
-- A policy de leitura `authenticated` de cada tabela é deixada intacta de
-- propósito. A policy `anon` idem.

-- acesso_rapido
drop policy if exists "Insercao autenticada acesso_rapido" on public.acesso_rapido;
create policy "Insercao autenticada acesso_rapido" on public.acesso_rapido as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada acesso_rapido" on public.acesso_rapido;
create policy "Atualizacao autenticada acesso_rapido" on public.acesso_rapido as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada acesso_rapido" on public.acesso_rapido;
create policy "Exclusao autenticada acesso_rapido" on public.acesso_rapido as permissive for delete to authenticated using (public.is_admin());

-- agenda_eventos
drop policy if exists "Insercao autenticada agenda_eventos" on public.agenda_eventos;
create policy "Insercao autenticada agenda_eventos" on public.agenda_eventos as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada agenda_eventos" on public.agenda_eventos;
create policy "Atualizacao autenticada agenda_eventos" on public.agenda_eventos as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada agenda_eventos" on public.agenda_eventos;
create policy "Exclusao autenticada agenda_eventos" on public.agenda_eventos as permissive for delete to authenticated using (public.is_admin());

-- arquivos
drop policy if exists "Insercao autenticada arquivos" on public.arquivos;
create policy "Insercao autenticada arquivos" on public.arquivos as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada arquivos" on public.arquivos;
create policy "Atualizacao autenticada arquivos" on public.arquivos as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada arquivos" on public.arquivos;
create policy "Exclusao autenticada arquivos" on public.arquivos as permissive for delete to authenticated using (public.is_admin());

-- avisos
drop policy if exists "Insercao autenticada avisos" on public.avisos;
create policy "Insercao autenticada avisos" on public.avisos as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada avisos" on public.avisos;
create policy "Atualizacao autenticada avisos" on public.avisos as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada avisos" on public.avisos;
create policy "Exclusao autenticada avisos" on public.avisos as permissive for delete to authenticated using (public.is_admin());

-- escala_ferias (ATENCAO: tem `status` E `publish_status`)
drop policy if exists "Insercao autenticada escala_ferias" on public.escala_ferias;
create policy "Insercao autenticada escala_ferias" on public.escala_ferias as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada escala_ferias" on public.escala_ferias;
create policy "Atualizacao autenticada escala_ferias" on public.escala_ferias as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada escala_ferias" on public.escala_ferias;
create policy "Exclusao autenticada escala_ferias" on public.escala_ferias as permissive for delete to authenticated using (public.is_admin());

-- funcionarios
drop policy if exists "Insercao autenticada funcionarios" on public.funcionarios;
create policy "Insercao autenticada funcionarios" on public.funcionarios as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada funcionarios" on public.funcionarios;
create policy "Atualizacao autenticada funcionarios" on public.funcionarios as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada funcionarios" on public.funcionarios;
create policy "Exclusao autenticada funcionarios" on public.funcionarios as permissive for delete to authenticated using (public.is_admin());

-- info_juridico
drop policy if exists "Insercao autenticada info_juridico" on public.info_juridico;
create policy "Insercao autenticada info_juridico" on public.info_juridico as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada info_juridico" on public.info_juridico;
create policy "Atualizacao autenticada info_juridico" on public.info_juridico as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada info_juridico" on public.info_juridico;
create policy "Exclusao autenticada info_juridico" on public.info_juridico as permissive for delete to authenticated using (public.is_admin());

-- info_municipio
drop policy if exists "Insercao autenticada info_municipio" on public.info_municipio;
create policy "Insercao autenticada info_municipio" on public.info_municipio as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada info_municipio" on public.info_municipio;
create policy "Atualizacao autenticada info_municipio" on public.info_municipio as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada info_municipio" on public.info_municipio;
create policy "Exclusao autenticada info_municipio" on public.info_municipio as permissive for delete to authenticated using (public.is_admin());

-- info_orgaos
drop policy if exists "Insercao autenticada info_orgaos" on public.info_orgaos;
create policy "Insercao autenticada info_orgaos" on public.info_orgaos as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada info_orgaos" on public.info_orgaos;
create policy "Atualizacao autenticada info_orgaos" on public.info_orgaos as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada info_orgaos" on public.info_orgaos;
create policy "Exclusao autenticada info_orgaos" on public.info_orgaos as permissive for delete to authenticated using (public.is_admin());

-- manuais
drop policy if exists "Insercao autenticada manuais" on public.manuais;
create policy "Insercao autenticada manuais" on public.manuais as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada manuais" on public.manuais;
create policy "Atualizacao autenticada manuais" on public.manuais as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada manuais" on public.manuais;
create policy "Exclusao autenticada manuais" on public.manuais as permissive for delete to authenticated using (public.is_admin());

-- processos
drop policy if exists "Insercao autenticada processos" on public.processos;
create policy "Insercao autenticada processos" on public.processos as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada processos" on public.processos;
create policy "Atualizacao autenticada processos" on public.processos as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada processos" on public.processos;
create policy "Exclusao autenticada processos" on public.processos as permissive for delete to authenticated using (public.is_admin());

-- servicos
drop policy if exists "Insercao autenticada servicos" on public.servicos;
create policy "Insercao autenticada servicos" on public.servicos as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada servicos" on public.servicos;
create policy "Atualizacao autenticada servicos" on public.servicos as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada servicos" on public.servicos;
create policy "Exclusao autenticada servicos" on public.servicos as permissive for delete to authenticated using (public.is_admin());

-- sistemas
drop policy if exists "Insercao autenticada sistemas" on public.sistemas;
create policy "Insercao autenticada sistemas" on public.sistemas as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada sistemas" on public.sistemas;
create policy "Atualizacao autenticada sistemas" on public.sistemas as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada sistemas" on public.sistemas;
create policy "Exclusao autenticada sistemas" on public.sistemas as permissive for delete to authenticated using (public.is_admin());

-- veiculos
drop policy if exists "Insercao autenticada veiculos" on public.veiculos;
create policy "Insercao autenticada veiculos" on public.veiculos as permissive for insert to authenticated with check (public.is_admin());
drop policy if exists "Atualizacao autenticada veiculos" on public.veiculos;
create policy "Atualizacao autenticada veiculos" on public.veiculos as permissive for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Exclusao autenticada veiculos" on public.veiculos;
create policy "Exclusao autenticada veiculos" on public.veiculos as permissive for delete to authenticated using (public.is_admin());


-- ----------------------------------------------------------------------------
-- 5. N1 — funcao de event trigger executavel por qualquer um
-- ----------------------------------------------------------------------------
-- `public.rls_auto_enable()` é SECURITY DEFINER e é a função do event trigger
-- `ensure_rls` do Supabase (auto-liga RLS em tabela nova de `public`).
--
-- ACL original medida:
--   {=X/postgres, postgres=X/postgres, anon=X/postgres,
--    authenticated=X/postgres, service_role=X/postgres}
--
-- O `=X/postgres` é o grant implícito a PUBLIC. Revogar só de anon/authenticated
-- NÃO resolve — o PUBLIC continua concedendo. Revogar só de `public` também não,
-- porque anon e authenticated têm grants próprios. Testei as duas hipóteses e
-- ambas deixavam `has_function_privilege(...) = true`. Por isso os três vão
-- revogados na mesma linha:
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Depois do revoke (medido):
--   ACL = {postgres=X/postgres, service_role=X/postgres}
--   has_function_privilege('anon', ...)          = false
--   has_function_privilege('authenticated', ...) = false
--   has_function_privilege('service_role', ...)  = true   (mantido de propósito)
--
-- Isso NÃO quebra o event trigger: função de trigger não passa por checagem de
-- EXECUTE no momento em que dispara. Verificado criando uma tabela nova em
-- `public` já com o revoke aplicado — `ensure_rls` continuou ligando o RLS
-- sozinho. `anon` também não tem CREATE no schema `public`.
--
-- Rollback (restaura a ACL original, inclusive o furo):
--   grant execute on function public.rls_auto_enable() to public, anon, authenticated;
-- ============================================================================
