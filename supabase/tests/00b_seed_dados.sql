-- ============================================================================
-- 00b_seed_dados.sql — dados sinteticos do T6.5
-- ----------------------------------------------------------------------------
-- Execute DEPOIS da 0007_fn_grants.sql.
--
-- Cria:
--   * papel 'servidor' em app_admins;
--   * os 3 buckets (publicos, como em producao);
--   * a linha global de admin_settings;
--   * 1 linha 'published' + 1 'draft' nas 14 colecoes (prefixo T6.5).
--
-- Idempotente: apaga as linhas T6.5 antes de recriar.
-- Somente projeto de TESTE. Nao rode em producao.
-- ============================================================================

insert into public.app_admins (user_id, role, observacao)
values ('11111111-1111-4111-8111-111111111111', 'servidor', 'conta de teste T6.5')
on conflict (user_id) do update set role = excluded.role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('arquivos-smader',           'arquivos-smader',           true, 10485760, null),
  ('funcionarios-fotos-smader', 'funcionarios-fotos-smader', true, 10485760, null),
  ('manuais-imagens-smader',    'manuais-imagens-smader',    true, 10485760, null)
on conflict (id) do nothing;

insert into public.admin_settings (scope) values ('global')
on conflict (scope) do nothing;

delete from public.acesso_rapido  where titulo like 'T6.5 %';
delete from public.agenda_eventos where titulo like 'T6.5 %';
delete from public.arquivos       where nome   like 'T6.5 %';
delete from public.avisos         where titulo like 'T6.5 %';
delete from public.escala_ferias  where nome   like 'T6.5 %';
delete from public.funcionarios   where nome   like 'T6.5 %';
delete from public.info_juridico  where titulo like 'T6.5 %';
delete from public.info_municipio where titulo like 'T6.5 %';
delete from public.info_orgaos    where titulo like 'T6.5 %';
delete from public.manuais        where titulo like 'T6.5 %';
delete from public.processos      where titulo like 'T6.5 %';
delete from public.servicos       where nome   like 'T6.5 %';
delete from public.sistemas       where nome   like 'T6.5 %';
delete from public.veiculos       where nome   like 'T6.5 %';

insert into public.acesso_rapido  (titulo, publish_status) values ('T6.5 acesso publicado', 'published'), ('T6.5 acesso rascunho', 'draft');
insert into public.agenda_eventos (titulo, publish_status) values ('T6.5 agenda publicado', 'published'), ('T6.5 agenda rascunho', 'draft');
insert into public.arquivos       (nome,   publish_status) values ('T6.5 arquivo publicado', 'published'), ('T6.5 arquivo rascunho', 'draft');
insert into public.avisos         (titulo, publish_status) values ('T6.5 aviso publicado', 'published'), ('T6.5 aviso rascunho', 'draft');
insert into public.escala_ferias  (nome, cargo, publish_status) values ('T6.5 ferias publicado', 'cargo', 'published'), ('T6.5 ferias rascunho', 'cargo', 'draft');
insert into public.funcionarios   (nome,   publish_status) values ('T6.5 funcionario publicado', 'published'), ('T6.5 funcionario rascunho', 'draft');
insert into public.info_juridico  (titulo, publish_status) values ('T6.5 juridico publicado', 'published'), ('T6.5 juridico rascunho', 'draft');
insert into public.info_municipio (titulo, publish_status) values ('T6.5 municipio publicado', 'published'), ('T6.5 municipio rascunho', 'draft');
insert into public.info_orgaos    (titulo, publish_status) values ('T6.5 orgao publicado', 'published'), ('T6.5 orgao rascunho', 'draft');
insert into public.manuais        (titulo, publish_status) values ('T6.5 manual publicado', 'published'), ('T6.5 manual rascunho', 'draft');
insert into public.processos      (titulo, publish_status) values ('T6.5 processo publicado', 'published'), ('T6.5 processo rascunho', 'draft');
insert into public.servicos       (nome,   publish_status) values ('T6.5 servico publicado', 'published'), ('T6.5 servico rascunho', 'draft');
insert into public.sistemas       (nome,   publish_status) values ('T6.5 sistema publicado', 'published'), ('T6.5 sistema rascunho', 'draft');
insert into public.veiculos       (nome,   publish_status) values ('T6.5 veiculo publicado', 'published'), ('T6.5 veiculo rascunho', 'draft');
