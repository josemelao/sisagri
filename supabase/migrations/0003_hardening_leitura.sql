-- ============================================================================
-- 0003_hardening_leitura.sql
-- ----------------------------------------------------------------------------
-- Bloco 3 (parte 2) — fecha a LEITURA de rascunho por usuário autenticado.
--
-- Projeto : yiujxempodimegdoexqo (SisAgri / SMADER)
-- Escrito : 2026-10-19
-- Depende : 0002_admin_gate.sql (usa public.is_admin())
-- Status  : NÃO APLICADO.
--
-- ----------------------------------------------------------------------------
-- O FURO QUE ESTE ARQUIVO FECHA (medido)
-- ----------------------------------------------------------------------------
-- Depois do 0002, a escrita está fechada, mas a leitura não. Medido com um `sub`
-- de usuário inexistente, em transação revertida:
--
--   select count(*) from public.arquivos where publish_status = 'draft';
--   -> 1     (leitura de rascunho liberada para qualquer autenticado)
--
-- O 0002 mexeu nas 42 policies de escrita. As 15 policies de SELECT de
-- `authenticated` continuaram `using (true)`.
--
-- ----------------------------------------------------------------------------
-- A DECISÃO DE DESENHO — `or is_admin()`, e não só `is_admin()`
-- ----------------------------------------------------------------------------
-- O caminho óbvio seria trocar `using (true)` por `using (public.is_admin())`.
-- Não foi o que fiz, e a diferença importa:
--
--   usando (public.is_admin())                      -> só o admin lê QUALQUER coisa
--   usando (published OR public.is_admin())          -> qualquer autenticado lê o
--                                                      publicado; só o admin lê rascunho
--
-- A segunda forma é melhor por três motivos:
--
--   1. MUDANÇA MENOR. O que muda é apenas o rascunho: passa a ser exclusivo do
--      admin. O conteúdo publicado continua legível por um autenticado, igual
--      ao anônimo. Antes, um autenticado via tudo; agora vê o publicado.
--   2. EVITA ARMADILHA FUTURA. Se um dia existir um usuário autenticado que não
--      seja admin (Bloco 6, áreas/perfis), a forma `só is_admin()` faria o site
--      público aparecer VAZIO para ele — porque a policy `anon` é `to anon`, e
--      `authenticated` não é membro de `anon`. A forma com `or` não tem esse
--      problema.
--   3. MESMO EFEITO DE SEGURANÇA. Nenhum rascunho é exposto a não-admin em
--      nenhuma das duas formas.
--
-- Observação de comportamento, para não gerar susto: se o admin estiver logado
-- no mesmo navegador, o site público usa a sessão dele (papel `authenticated`) e
-- vê rascunhos — como já acontece hoje. O filtro por `publish_status` do
-- `script.js` continua sendo quem esconde o rascunho na tela. Nada muda aqui.
--
-- ----------------------------------------------------------------------------
-- `admin_settings` — caso à parte
-- ----------------------------------------------------------------------------
-- Não tem `publish_status`: a tabela inteira é interna. As 3 policies passam a
-- exigir `is_admin()`, mantendo as travas de `scope = 'global'` que já existiam.
-- Assim um autenticado não-admin perde leitura E escrita das configurações
-- globais — coerente com o resto.
--
-- ----------------------------------------------------------------------------
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- Aplicar 0001_baseline_policies.sql devolve TODAS as 73 policies de `public` ao
-- estado de 2026-10-19, incluindo as 15 de leitura liberadas.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. AS 14 POLICIES DE LEITURA DE `authenticated`
-- ----------------------------------------------------------------------------
-- Nome mantido de propósito: `drop` + `create` com o mesmo nome, sem policy órfã.
-- A policy `anon` de cada tabela NÃO é tocada — segue `to anon` com
-- `publish_status = 'published'`.

-- acesso_rapido
drop policy if exists "Leitura autenticada acesso_rapido" on public.acesso_rapido;
create policy "Leitura autenticada acesso_rapido" on public.acesso_rapido as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- agenda_eventos
drop policy if exists "Leitura autenticada agenda_eventos" on public.agenda_eventos;
create policy "Leitura autenticada agenda_eventos" on public.agenda_eventos as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- arquivos
drop policy if exists "Leitura autenticada arquivos" on public.arquivos;
create policy "Leitura autenticada arquivos" on public.arquivos as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- avisos
drop policy if exists "Leitura autenticada avisos" on public.avisos;
create policy "Leitura autenticada avisos" on public.avisos as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- escala_ferias
drop policy if exists "Leitura autenticada escala_ferias" on public.escala_ferias;
create policy "Leitura autenticada escala_ferias" on public.escala_ferias as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- funcionarios
drop policy if exists "Leitura autenticada funcionarios" on public.funcionarios;
create policy "Leitura autenticada funcionarios" on public.funcionarios as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- info_juridico
drop policy if exists "Leitura autenticada info_juridico" on public.info_juridico;
create policy "Leitura autenticada info_juridico" on public.info_juridico as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- info_municipio
drop policy if exists "Leitura autenticada info_municipio" on public.info_municipio;
create policy "Leitura autenticada info_municipio" on public.info_municipio as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- info_orgaos
drop policy if exists "Leitura autenticada info_orgaos" on public.info_orgaos;
create policy "Leitura autenticada info_orgaos" on public.info_orgaos as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- manuais
drop policy if exists "Leitura autenticada manuais" on public.manuais;
create policy "Leitura autenticada manuais" on public.manuais as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- processos
drop policy if exists "Leitura autenticada processos" on public.processos;
create policy "Leitura autenticada processos" on public.processos as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- servicos
drop policy if exists "Leitura autenticada servicos" on public.servicos;
create policy "Leitura autenticada servicos" on public.servicos as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- sistemas
drop policy if exists "Leitura autenticada sistemas" on public.sistemas;
create policy "Leitura autenticada sistemas" on public.sistemas as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());

-- veiculos
drop policy if exists "Leitura autenticada veiculos" on public.veiculos;
create policy "Leitura autenticada veiculos" on public.veiculos as permissive for select to authenticated using ((publish_status = 'published'::text) or public.is_admin());


-- ----------------------------------------------------------------------------
-- 2. AS 3 POLICIES DE `admin_settings`
-- ----------------------------------------------------------------------------
-- Mantém as travas de coluna que já existiam e soma `is_admin()`.
drop policy if exists "admin_settings_select" on public.admin_settings;
create policy "admin_settings_select" on public.admin_settings as permissive for select to authenticated using ((scope = 'global'::text) and public.is_admin());

drop policy if exists "admin_settings_insert" on public.admin_settings;
create policy "admin_settings_insert" on public.admin_settings as permissive for insert to authenticated with check (((scope = 'global'::text) AND (default_sort_mode = ANY (ARRAY['id'::text, 'nome'::text]))) and public.is_admin());

drop policy if exists "admin_settings_update" on public.admin_settings;
create policy "admin_settings_update" on public.admin_settings as permissive for update to authenticated using ((scope = 'global'::text) and public.is_admin()) with check (((scope = 'global'::text) AND (default_sort_mode = ANY (ARRAY['id'::text, 'nome'::text]))) and public.is_admin());
-- ============================================================================
