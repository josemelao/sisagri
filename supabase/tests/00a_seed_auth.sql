-- ============================================================================
-- 00a_seed_auth.sql — contas de teste do T6.5
-- ----------------------------------------------------------------------------
-- Execute ANTES da 0002_admin_gate.sql.
--
-- A 0002 semeia public.app_admins a partir de auth.users, usando o UUID do
-- dono em producao. Por isso a conta "admin" aqui usa o mesmo UUID.
--
-- Somente projeto de TESTE. Nao rode em producao.
-- ============================================================================

insert into auth.users (id, email, role, aud, email_confirmed_at, created_at, updated_at)
values
  ('fc124783-4dc3-46ec-9677-3b15282a7220', 'admin@teste.local',      'authenticated', 'authenticated', now(), now(), now()),
  ('11111111-1111-4111-8111-111111111111', 'servidor@teste.local',   'authenticated', 'authenticated', now(), now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'sem-papel@teste.local',  'authenticated', 'authenticated', now(), now(), now())
on conflict (id) do nothing;
