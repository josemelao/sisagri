-- ============================================================================
-- 0013_replace_collection.sql — Bloco 8 (T8.4)
-- ----------------------------------------------------------------------------
-- Substitui o padrao "delete tudo + insert" do importAll por UMA transacao no
-- banco: se o insert falhar, o delete tambem desfaz (nada de colecao vazia).
--
-- Seguranca:
--   - security invoker: a RLS continua valendo para o usuario chamador;
--   - allowlist fixa de tabelas (nao aceita nome arbitrario);
--   - payload precisa ser array JSON;
--   - sem `execute` para anon; so `authenticated` (admin/servidor com policy).
--
-- Rollback:
--   drop function if exists public.replace_collection(text, jsonb);
-- ============================================================================

create or replace function public.replace_collection(p_tabela text, p_payload jsonb)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_tabela   text := p_tabela;
  v_inseridos integer := 0;
begin
  if v_tabela is null or v_tabela not in (
    'acesso_rapido',
    'agenda_eventos',
    'arquivos',
    'avisos',
    'escala_ferias',
    'funcionarios',
    'info_juridico',
    'info_municipio',
    'info_orgaos',
    'manuais',
    'processos',
    'servicos',
    'sistemas',
    'veiculos'
  ) then
    raise exception 'Tabela nao permitida: %', coalesce(p_tabela, '(nula)')
      using errcode = '22023';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'array' then
    raise exception 'O payload precisa ser um array JSON'
      using errcode = '22023';
  end if;

  -- Mesma transacao: qualquer erro no insert devolve as linhas apagadas.
  execute format('delete from public.%I', v_tabela);

  execute format(
    'insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1)',
    v_tabela, v_tabela
  ) using p_payload;

  get diagnostics v_inseridos = row_count;
  return v_inseridos;
end;
$$;

revoke all on function public.replace_collection(text, jsonb) from public;
revoke all on function public.replace_collection(text, jsonb) from anon;
grant execute on function public.replace_collection(text, jsonb) to authenticated;
