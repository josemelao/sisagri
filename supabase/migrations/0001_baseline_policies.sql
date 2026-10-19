-- ============================================================================
-- 0001_baseline_policies.sql
-- ----------------------------------------------------------------------------
-- LINHA DE BASE (SNAPSHOT) DAS POLICIES DE PRODUÇÃO — NÃO É UMA MIGRATION NOVA.
--
-- Projeto : yiujxempodegdoexqo (SisAgri / SMADER)
-- Capturado: 2026-10-19, de `pg_policies` (schemas `public` e `storage`)
-- Bloco   : 2 do v2_plano_refatoração.md
--
-- Conteúdo: 73 policies em `public` + 12 em `storage.objects` = 85.
--
-- ----------------------------------------------------------------------------
-- ESTE É O ARQUIVO DE ROLLBACK DO BLOCO 3
-- ----------------------------------------------------------------------------
-- Aplicar este arquivo devolve o RLS ao estado de 2026-10-19, inclusive as 42
-- policies liberadas (`using (true)`) que o Bloco 3 vai substituir por
-- `is_admin()`. É o caminho de volta caso o Bloco 3 precise ser revertido.
--
-- ----------------------------------------------------------------------------
-- NOTAS TÉCNICAS
-- ----------------------------------------------------------------------------
-- 1. O texto de `qual` / `with_check` vem do Postgres já normalizado
--    (`'published'::text`, `ANY (ARRAY[...])`). É semanticamente idêntico ao
--    original: ao recriar a policy, o banco guarda exatamente esta forma.
-- 2. `drop policy if exists` + `create policy` deixa o arquivo reaplicável e
--    garante que o nome da policy não colida com uma versão futura.
-- 3. Policies de INSERT não têm `USING` e policies de DELETE não têm
--    `WITH CHECK` — o gerador respeita isso (era o falso positivo corrigido
--    no Bloco 1).
-- 4. `admin_settings` NÃO tem policy para `anon`: é invisível ao visitante.
--    Tem 3 policies para `authenticated`, já restritas por `scope = 'global'`
--    — por isso não entra na dívida das 42.
-- 5. Todas as policies são `permissive` e não há nenhuma `restrictive` no banco.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. RLS
-- ----------------------------------------------------------------------------
alter table public.acesso_rapido  enable row level security;
alter table public.admin_settings enable row level security;
alter table public.agenda_eventos enable row level security;
alter table public.arquivos      enable row level security;
alter table public.avisos        enable row level security;
alter table public.escala_ferias enable row level security;
alter table public.funcionarios  enable row level security;
alter table public.info_juridico enable row level security;
alter table public.info_municipio enable row level security;
alter table public.info_orgaos   enable row level security;
alter table public.manuais       enable row level security;
alter table public.processos     enable row level security;
alter table public.servicos      enable row level security;
alter table public.sistemas      enable row level security;
alter table public.veiculos      enable row level security;


-- ----------------------------------------------------------------------------
-- 2. GRUPO A — 14 TABELAS DE CONTEÚDO (70 policies)
-- ----------------------------------------------------------------------------
-- Cada tabela tem exatamente as mesmas 5 policies:
--
--   1 anon          · SELECT · using (publish_status = 'published')  <- o gate
--   3 authenticated · SELECT / INSERT / UPDATE / DELETE · using (true)  <- DÍVIDA
--
-- A leitura anônima está CORRETA e é o que impede o rascunho de vazar pelo
-- banco. As 4 de `authenticated` com `true` são as 42 policies
-- (`SELECT`+`INSERT`+`UPDATE`+`DELETE` = 4 × 14 = 56, das quais o Advisor
-- marca 3 por tabela como always-true = 42; o `SELECT` não entra na conta
-- porque o Advisor 0024 só reporta escrita). O Bloco 3 troca as de escrita
-- por `is_admin()`.
--
-- NUNCA alterar a policy `anon`: é ela que protege o rascunho.

-- --- acesso_rapido ----------------------------------------------------------
drop policy if exists "Leitura autenticada acesso_rapido" on public.acesso_rapido;
create policy "Leitura autenticada acesso_rapido" on public.acesso_rapido as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published acesso_rapido" on public.acesso_rapido;
create policy "Leitura publica published acesso_rapido" on public.acesso_rapido as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada acesso_rapido" on public.acesso_rapido;
create policy "Insercao autenticada acesso_rapido" on public.acesso_rapido as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada acesso_rapido" on public.acesso_rapido;
create policy "Atualizacao autenticada acesso_rapido" on public.acesso_rapido as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada acesso_rapido" on public.acesso_rapido;
create policy "Exclusao autenticada acesso_rapido" on public.acesso_rapido as permissive for delete to authenticated using (true);

-- --- agenda_eventos ---------------------------------------------------------
drop policy if exists "Leitura autenticada agenda_eventos" on public.agenda_eventos;
create policy "Leitura autenticada agenda_eventos" on public.agenda_eventos as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published agenda_eventos" on public.agenda_eventos;
create policy "Leitura publica published agenda_eventos" on public.agenda_eventos as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada agenda_eventos" on public.agenda_eventos;
create policy "Insercao autenticada agenda_eventos" on public.agenda_eventos as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada agenda_eventos" on public.agenda_eventos;
create policy "Atualizacao autenticada agenda_eventos" on public.agenda_eventos as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada agenda_eventos" on public.agenda_eventos;
create policy "Exclusao autenticada agenda_eventos" on public.agenda_eventos as permissive for delete to authenticated using (true);

-- --- arquivos ---------------------------------------------------------------
drop policy if exists "Leitura autenticada arquivos" on public.arquivos;
create policy "Leitura autenticada arquivos" on public.arquivos as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published arquivos" on public.arquivos;
create policy "Leitura publica published arquivos" on public.arquivos as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada arquivos" on public.arquivos;
create policy "Insercao autenticada arquivos" on public.arquivos as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada arquivos" on public.arquivos;
create policy "Atualizacao autenticada arquivos" on public.arquivos as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada arquivos" on public.arquivos;
create policy "Exclusao autenticada arquivos" on public.arquivos as permissive for delete to authenticated using (true);

-- --- avisos -----------------------------------------------------------------
drop policy if exists "Leitura autenticada avisos" on public.avisos;
create policy "Leitura autenticada avisos" on public.avisos as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published avisos" on public.avisos;
create policy "Leitura publica published avisos" on public.avisos as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada avisos" on public.avisos;
create policy "Insercao autenticada avisos" on public.avisos as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada avisos" on public.avisos;
create policy "Atualizacao autenticada avisos" on public.avisos as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada avisos" on public.avisos;
create policy "Exclusao autenticada avisos" on public.avisos as permissive for delete to authenticated using (true);

-- --- escala_ferias ----------------------------------------------------------
drop policy if exists "Leitura autenticada escala_ferias" on public.escala_ferias;
create policy "Leitura autenticada escala_ferias" on public.escala_ferias as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published escala_ferias" on public.escala_ferias;
create policy "Leitura publica published escala_ferias" on public.escala_ferias as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada escala_ferias" on public.escala_ferias;
create policy "Insercao autenticada escala_ferias" on public.escala_ferias as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada escala_ferias" on public.escala_ferias;
create policy "Atualizacao autenticada escala_ferias" on public.escala_ferias as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada escala_ferias" on public.escala_ferias;
create policy "Exclusao autenticada escala_ferias" on public.escala_ferias as permissive for delete to authenticated using (true);

-- --- funcionarios -----------------------------------------------------------
drop policy if exists "Leitura autenticada funcionarios" on public.funcionarios;
create policy "Leitura autenticada funcionarios" on public.funcionarios as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published funcionarios" on public.funcionarios;
create policy "Leitura publica published funcionarios" on public.funcionarios as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada funcionarios" on public.funcionarios;
create policy "Insercao autenticada funcionarios" on public.funcionarios as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada funcionarios" on public.funcionarios;
create policy "Atualizacao autenticada funcionarios" on public.funcionarios as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada funcionarios" on public.funcionarios;
create policy "Exclusao autenticada funcionarios" on public.funcionarios as permissive for delete to authenticated using (true);

-- --- info_juridico ----------------------------------------------------------
drop policy if exists "Leitura autenticada info_juridico" on public.info_juridico;
create policy "Leitura autenticada info_juridico" on public.info_juridico as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published info_juridico" on public.info_juridico;
create policy "Leitura publica published info_juridico" on public.info_juridico as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada info_juridico" on public.info_juridico;
create policy "Insercao autenticada info_juridico" on public.info_juridico as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada info_juridico" on public.info_juridico;
create policy "Atualizacao autenticada info_juridico" on public.info_juridico as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada info_juridico" on public.info_juridico;
create policy "Exclusao autenticada info_juridico" on public.info_juridico as permissive for delete to authenticated using (true);

-- --- info_municipio ---------------------------------------------------------
drop policy if exists "Leitura autenticada info_municipio" on public.info_municipio;
create policy "Leitura autenticada info_municipio" on public.info_municipio as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published info_municipio" on public.info_municipio;
create policy "Leitura publica published info_municipio" on public.info_municipio as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada info_municipio" on public.info_municipio;
create policy "Insercao autenticada info_municipio" on public.info_municipio as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada info_municipio" on public.info_municipio;
create policy "Atualizacao autenticada info_municipio" on public.info_municipio as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada info_municipio" on public.info_municipio;
create policy "Exclusao autenticada info_municipio" on public.info_municipio as permissive for delete to authenticated using (true);

-- --- info_orgaos ------------------------------------------------------------
drop policy if exists "Leitura autenticada info_orgaos" on public.info_orgaos;
create policy "Leitura autenticada info_orgaos" on public.info_orgaos as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published info_orgaos" on public.info_orgaos;
create policy "Leitura publica published info_orgaos" on public.info_orgaos as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada info_orgaos" on public.info_orgaos;
create policy "Insercao autenticada info_orgaos" on public.info_orgaos as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada info_orgaos" on public.info_orgaos;
create policy "Atualizacao autenticada info_orgaos" on public.info_orgaos as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada info_orgaos" on public.info_orgaos;
create policy "Exclusao autenticada info_orgaos" on public.info_orgaos as permissive for delete to authenticated using (true);

-- --- manuais ----------------------------------------------------------------
drop policy if exists "Leitura autenticada manuais" on public.manuais;
create policy "Leitura autenticada manuais" on public.manuais as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published manuais" on public.manuais;
create policy "Leitura publica published manuais" on public.manuais as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada manuais" on public.manuais;
create policy "Insercao autenticada manuais" on public.manuais as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada manuais" on public.manuais;
create policy "Atualizacao autenticada manuais" on public.manuais as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada manuais" on public.manuais;
create policy "Exclusao autenticada manuais" on public.manuais as permissive for delete to authenticated using (true);

-- --- processos --------------------------------------------------------------
drop policy if exists "Leitura autenticada processos" on public.processos;
create policy "Leitura autenticada processos" on public.processos as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published processos" on public.processos;
create policy "Leitura publica published processos" on public.processos as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada processos" on public.processos;
create policy "Insercao autenticada processos" on public.processos as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada processos" on public.processos;
create policy "Atualizacao autenticada processos" on public.processos as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada processos" on public.processos;
create policy "Exclusao autenticada processos" on public.processos as permissive for delete to authenticated using (true);

-- --- servicos ---------------------------------------------------------------
drop policy if exists "Leitura autenticada servicos" on public.servicos;
create policy "Leitura autenticada servicos" on public.servicos as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published servicos" on public.servicos;
create policy "Leitura publica published servicos" on public.servicos as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada servicos" on public.servicos;
create policy "Insercao autenticada servicos" on public.servicos as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada servicos" on public.servicos;
create policy "Atualizacao autenticada servicos" on public.servicos as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada servicos" on public.servicos;
create policy "Exclusao autenticada servicos" on public.servicos as permissive for delete to authenticated using (true);

-- --- sistemas ---------------------------------------------------------------
drop policy if exists "Leitura autenticada sistemas" on public.sistemas;
create policy "Leitura autenticada sistemas" on public.sistemas as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published sistemas" on public.sistemas;
create policy "Leitura publica published sistemas" on public.sistemas as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada sistemas" on public.sistemas;
create policy "Insercao autenticada sistemas" on public.sistemas as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada sistemas" on public.sistemas;
create policy "Atualizacao autenticada sistemas" on public.sistemas as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada sistemas" on public.sistemas;
create policy "Exclusao autenticada sistemas" on public.sistemas as permissive for delete to authenticated using (true);

-- --- veiculos ---------------------------------------------------------------
drop policy if exists "Leitura autenticada veiculos" on public.veiculos;
create policy "Leitura autenticada veiculos" on public.veiculos as permissive for select to authenticated using (true);
drop policy if exists "Leitura publica published veiculos" on public.veiculos;
create policy "Leitura publica published veiculos" on public.veiculos as permissive for select to anon using ((publish_status = 'published'::text));
drop policy if exists "Insercao autenticada veiculos" on public.veiculos;
create policy "Insercao autenticada veiculos" on public.veiculos as permissive for insert to authenticated with check (true);
drop policy if exists "Atualizacao autenticada veiculos" on public.veiculos;
create policy "Atualizacao autenticada veiculos" on public.veiculos as permissive for update to authenticated using (true) with check (true);
drop policy if exists "Exclusao autenticada veiculos" on public.veiculos;
create policy "Exclusao autenticada veiculos" on public.veiculos as permissive for delete to authenticated using (true);


-- ----------------------------------------------------------------------------
-- 3. GRUPO B — admin_settings (3 policies, nenhuma para anon)
-- ----------------------------------------------------------------------------
-- Único caso já restrito por coluna. NÃO faz parte da dívida das 42.
-- Repare que `insert` não tem USING e `select` não tem WITH CHECK.
drop policy if exists "admin_settings_select" on public.admin_settings;
create policy "admin_settings_select" on public.admin_settings as permissive for select to authenticated using ((scope = 'global'::text));
drop policy if exists "admin_settings_insert" on public.admin_settings;
create policy "admin_settings_insert" on public.admin_settings as permissive for insert to authenticated with check (((scope = 'global'::text) AND (default_sort_mode = ANY (ARRAY['id'::text, 'nome'::text]))));
drop policy if exists "admin_settings_update" on public.admin_settings;
create policy "admin_settings_update" on public.admin_settings as permissive for update to authenticated using ((scope = 'global'::text)) with check (((scope = 'global'::text) AND (default_sort_mode = ANY (ARRAY['id'::text, 'nome'::text]))));


-- ----------------------------------------------------------------------------
-- 4. STORAGE — 12 policies em storage.objects
-- ----------------------------------------------------------------------------
-- 3 buckets × 4 comandos, TODAS para `authenticated`, TODAS liberadas por
-- `bucket_id`. NENHUMA policy para `anon` — mas isso NÃO impede o acesso
-- público, porque os 3 buckets estão marcados como `public = true`.
--
-- Estado dos buckets (referência, NÃO recriar aqui):
--   arquivos-smader            public=true  file_size_limit=10485760  mime=null
--   funcionarios-fotos-smader  public=true  file_size_limit=10485760  mime=null
--   manuais-imagens-smader     public=true  file_size_limit=10485760  mime=null
--
-- Objeto em bucket público é servido por /storage/v1/object/public/... SEM
-- passar por policy — provado no Bloco 1 (PDF 200 sem credencial nenhuma).
-- Tornar privado é decisão do Bloco 3b; limpar listagem/órfão é o Bloco 3c.

drop policy if exists "arquivos_smader_select_auth" on storage.objects;
create policy "arquivos_smader_select_auth" on storage.objects as permissive for select to authenticated using ((bucket_id = 'arquivos-smader'::text));
drop policy if exists "arquivos_smader_insert_auth" on storage.objects;
create policy "arquivos_smader_insert_auth" on storage.objects as permissive for insert to authenticated with check ((bucket_id = 'arquivos-smader'::text));
drop policy if exists "arquivos_smader_update_auth" on storage.objects;
create policy "arquivos_smader_update_auth" on storage.objects as permissive for update to authenticated using ((bucket_id = 'arquivos-smader'::text)) with check ((bucket_id = 'arquivos-smader'::text));
drop policy if exists "arquivos_smader_delete_auth" on storage.objects;
create policy "arquivos_smader_delete_auth" on storage.objects as permissive for delete to authenticated using ((bucket_id = 'arquivos-smader'::text));

drop policy if exists "funcionarios_fotos_select_auth" on storage.objects;
create policy "funcionarios_fotos_select_auth" on storage.objects as permissive for select to authenticated using ((bucket_id = 'funcionarios-fotos-smader'::text));
drop policy if exists "funcionarios_fotos_insert_auth" on storage.objects;
create policy "funcionarios_fotos_insert_auth" on storage.objects as permissive for insert to authenticated with check ((bucket_id = 'funcionarios-fotos-smader'::text));
drop policy if exists "funcionarios_fotos_update_auth" on storage.objects;
create policy "funcionarios_fotos_update_auth" on storage.objects as permissive for update to authenticated using ((bucket_id = 'funcionarios-fotos-smader'::text)) with check ((bucket_id = 'funcionarios-fotos-smader'::text));
drop policy if exists "funcionarios_fotos_delete_auth" on storage.objects;
create policy "funcionarios_fotos_delete_auth" on storage.objects as permissive for delete to authenticated using ((bucket_id = 'funcionarios-fotos-smader'::text));

drop policy if exists "manuais_imagens_select_auth" on storage.objects;
create policy "manuais_imagens_select_auth" on storage.objects as permissive for select to authenticated using ((bucket_id = 'manuais-imagens-smader'::text));
drop policy if exists "manuais_imagens_insert_auth" on storage.objects;
create policy "manuais_imagens_insert_auth" on storage.objects as permissive for insert to authenticated with check ((bucket_id = 'manuais-imagens-smader'::text));
drop policy if exists "manuais_imagens_update_auth" on storage.objects;
create policy "manuais_imagens_update_auth" on storage.objects as permissive for update to authenticated using ((bucket_id = 'manuais-imagens-smader'::text)) with check ((bucket_id = 'manuais-imagens-smader'::text));
drop policy if exists "manuais_imagens_delete_auth" on storage.objects;
create policy "manuais_imagens_delete_auth" on storage.objects as permissive for delete to authenticated using ((bucket_id = 'manuais-imagens-smader'::text));


-- ----------------------------------------------------------------------------
-- 5. O QUE **NÃO** ESTÁ AQUI (por decisão, não por esquecimento)
-- ----------------------------------------------------------------------------
-- · Policies de `auth`, `realtime`, `graphql` — são do Supabase, não do app.
-- · `public.rls_auto_enable()` e o event trigger `ensure_rls` — infraestrutura
--   do Supabase. O Bloco 3 apenas revoga o EXECUTE de anon/authenticated.
-- · Buckets e objetos — são DADOS, não esquema. O estado dos buckets está
--   registrado em comentário para comparação.
-- · `force row level security` — não é usado em nenhuma tabela.
-- ============================================================================
