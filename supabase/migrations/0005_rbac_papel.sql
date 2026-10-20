-- ============================================================================
-- 0005_rbac_papel.sql — Bloco 6: papel 'servidor' em app_admins
--
-- Design aprovado: docs/superpowers/specs/2026-10-19-rbac-design.md
--
-- Regras:
--   admin    -> tudo
--   servidor -> criar e editar (INSERT/UPDATE), NAO excluir
--   publico  -> so published
--
-- Ordem importa: coluna -> backfill -> not null -> constraint -> funcoes.
-- Se algo falhar antes do backfill, a is_admin() antiga continua valendo.
-- ============================================================================

alter table public.app_admins add column if not exists role text;

-- A conta existente continua admin. Sem este passo, o painel fecha.
update public.app_admins set role = 'admin' where role is null;

alter table public.app_admins alter column role set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'app_admins_role_check'
      and conrelid = 'public.app_admins'::regclass
  ) then
    alter table public.app_admins
      add constraint app_admins_role_check check (role in ('admin', 'servidor'));
  end if;
end $$;

-- Mesma assinatura de antes; agora exige role = 'admin'.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.app_admins
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Gate de escrita: admin ou servidor.
create or replace function public.pode_editar()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.app_admins
    where user_id = auth.uid() and role in ('admin', 'servidor')
  );
$$;

-- Papel do usuario logado, para a UI. Sem sessao/papel devolve null.
create or replace function public.meu_papel()
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select role from public.app_admins where user_id = auth.uid();
$$;

-- Rollback (nao executar aqui):
--   drop function if exists public.meu_papel();
--   drop function if exists public.pode_editar();
--   create or replace function public.is_admin() ... (versao sem role)
--   update public.app_admins set role = 'admin';
--   alter table public.app_admins drop constraint if exists app_admins_role_check;
--   alter table public.app_admins drop column if exists role;
