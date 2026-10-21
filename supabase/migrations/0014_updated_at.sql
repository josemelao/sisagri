-- ============================================================================
-- 0014_updated_at.sql — Bloco 8 (T8.5)
-- ----------------------------------------------------------------------------
-- Adiciona `updated_at` + trigger nas 14 tabelas de conteudo.
--
-- Uso: o cliente manda `update ... eq('id', id).eq('updated_at', anterior)`.
-- Se outro editor salvou antes, o filtro nao encontra a linha (0 linhas) e o
-- painel avisa em vez de sobrescrever.
--
-- O trigger sempre carimba now() no UPDATE; o WHERE e avaliado antes do
-- trigger, entao a comparacao usa o valor anterior de verdade.
--
-- Idempotente: `add column if not exists` + `drop trigger if exists`.
--
-- Rollback:
--   drop trigger if exists set_updated_at on public.<tabela>;  (14x)
--   alter table public.<tabela> drop column if exists updated_at; (14x)
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
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
  ] loop
    execute format(
      'alter table public.%I add column if not exists updated_at timestamptz not null default now()',
      tabela
    );
    execute format('drop trigger if exists set_updated_at on public.%I', tabela);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      tabela
    );
  end loop;
end $$;
