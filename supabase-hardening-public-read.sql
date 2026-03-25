-- Hardening de leitura publica para o fluxo draft/published.
-- Objetivo:
-- 1. Remover policies SELECT de anon que permitam ler qualquer registro
-- 2. Recriar policies publicas limitando leitura a publish_status = 'published'
-- 3. Preservar leitura autenticada para o admin

do $$
declare
  alvo text;
  policy_row record;
  tabelas text[] := array[
    'funcionarios',
    'veiculos',
    'escala_ferias',
    'agenda_eventos',
    'info_juridico',
    'info_municipio',
    'info_orgaos',
    'servicos',
    'sistemas',
    'avisos',
    'acesso_rapido',
    'arquivos',
    'manuais',
    'processos'
  ];
begin
  foreach alvo in array tabelas loop
    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = alvo
        and cmd = 'SELECT'
        and 'anon' = any(roles)
    loop
      execute format('drop policy if exists %I on public.%I;', policy_row.policyname, alvo);
    end loop;

    execute format(
      'create policy %I on public.%I for select to anon using (publish_status = %L);',
      'Leitura publica published ' || alvo,
      alvo,
      'published'
    );
  end loop;
end $$;

drop policy if exists "Atualizacao publica ferias" on public.escala_ferias;
drop policy if exists "Exclusao publica ferias" on public.escala_ferias;
drop policy if exists "Insercao publica ferias" on public.escala_ferias;
