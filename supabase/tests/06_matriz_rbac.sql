-- ============================================================================
-- 06_matriz_rbac.sql — T6.5: 3 personas x 14 colecoes x 4 acoes
-- ----------------------------------------------------------------------------
-- Requer:
--   * migrations 0001 a 0007 aplicadas;
--   * 00a_seed_auth.sql rodado ANTES da 0002 (contas em auth.users);
--   * 00b_seed_dados.sql rodado DEPOIS da 0007 (1 published + 1 draft
--     em cada uma das 14 colecoes);
--   * contas em auth.users + app_admins:
--       admin    -> fc124783-4dc3-46ec-9677-3b15282a7220
--       servidor -> 11111111-1111-4111-8111-111111111111
--       sem papel-> 22222222-2222-4222-8222-222222222222
--
-- Personas: anon | authenticated sem papel | servidor | admin.
-- Acoes: SELECT (published/draft), INSERT, UPDATE, DELETE.
--
-- Roda inteiro em uma transacao e faz rollback no fim. As linhas criadas para
-- os testes de escrita sao removidas ainda dentro da transacao.
--
-- Resultado esperado: nenhuma linha com falhas > 0.
-- ============================================================================

begin;

create temp table _alvo (
  tabela   text primary key,
  coluna   text not null,
  id_pub   bigint not null,
  id_draft bigint not null
) on commit drop;

do $alvo$
declare
  t record;
  v_pub bigint;
  v_draft bigint;
begin
  for t in
    select * from (values
      ('acesso_rapido', 'titulo'),
      ('agenda_eventos', 'titulo'),
      ('arquivos', 'nome'),
      ('avisos', 'titulo'),
      ('escala_ferias', 'nome'),
      ('funcionarios', 'nome'),
      ('info_juridico', 'titulo'),
      ('info_municipio', 'titulo'),
      ('info_orgaos', 'titulo'),
      ('manuais', 'titulo'),
      ('processos', 'titulo'),
      ('servicos', 'nome'),
      ('sistemas', 'nome'),
      ('veiculos', 'nome')
    ) as x(tabela, coluna)
  loop
    execute format(
      'select id from public.%I where publish_status = ''published'' order by id limit 1',
      t.tabela
    ) into v_pub;

    execute format(
      'select id from public.%I where publish_status = ''draft'' order by id limit 1',
      t.tabela
    ) into v_draft;

    if v_pub is null or v_draft is null then
      raise exception 'Seed T6.5 incompleto em %', t.tabela;
    end if;

    insert into _alvo values (t.tabela, t.coluna, v_pub, v_draft);
  end loop;
end
$alvo$;

grant select on _alvo to anon, authenticated;

create temp table _r (
  persona  text,
  tabela   text,
  acao     text,
  esperado text,
  obtido   text,
  ok       boolean
) on commit drop;

do $matriz$
declare
  p record;
  t record;
  v_n_pub   int;
  v_n_draft int;
  v_new     bigint;
  v_upd     int;
  v_del     int;
  v_ins     text;
  v_ok      boolean;
begin
  for p in
    select * from (values
      ('anon',      'anon',          null::text),
      ('sem_papel', 'authenticated', '{"sub":"22222222-2222-4222-8222-222222222222"}'),
      ('servidor',  'authenticated', '{"sub":"11111111-1111-4111-8111-111111111111"}'),
      ('admin',     'authenticated', '{"sub":"fc124783-4dc3-46ec-9677-3b15282a7220"}')
    ) as x(nome, papel, claims)
  loop
    for t in select * from _alvo order by tabela loop

      -- SELECT ------------------------------------------------------------
      execute format('set local role %I', p.papel);
      perform set_config('request.jwt.claims', coalesce(p.claims, '{"role":"anon"}'), true);

      execute format(
        'select count(*) filter (where publish_status = ''published''), ' ||
        '       count(*) filter (where publish_status = ''draft'') ' ||
        'from public.%I where id in (%s, %s)',
        t.tabela, t.id_pub, t.id_draft
      ) into v_n_pub, v_n_draft;

      execute 'reset role';

      v_ok := (v_n_pub = 1)
          and (v_n_draft = case when p.nome in ('servidor', 'admin') then 1 else 0 end);

      insert into _r values (
        p.nome, t.tabela, 'select',
        '1 publicado, ' || case when p.nome in ('servidor', 'admin') then '1 rascunho' else '0 rascunho' end,
        v_n_pub || ' publicado, ' || v_n_draft || ' rascunho',
        v_ok
      );

      -- INSERT ------------------------------------------------------------
      v_new := null;
      execute format('set local role %I', p.papel);
      perform set_config('request.jwt.claims', coalesce(p.claims, '{"role":"anon"}'), true);

      begin
        execute format(
          'insert into public.%I (%I, publish_status) values (%L, ''draft'') returning id',
          t.tabela, t.coluna, 'T6.5 ' || p.nome || ' ' || t.tabela
        ) into v_new;
        v_ins := 'permitido';
      exception when others then
        v_ins := 'bloqueado';
        v_new := null;
      end;

      execute 'reset role';
      if v_new is not null then
        execute format('delete from public.%I where id = %s', t.tabela, v_new);
      end if;

      v_ok := v_ins = case when p.nome in ('servidor', 'admin') then 'permitido' else 'bloqueado' end;
      insert into _r values (
        p.nome, t.tabela, 'insert',
        case when p.nome in ('servidor', 'admin') then 'permitido' else 'bloqueado' end,
        v_ins, v_ok
      );

      -- UPDATE ------------------------------------------------------------
      v_upd := null;
      execute format('set local role %I', p.papel);
      perform set_config('request.jwt.claims', coalesce(p.claims, '{"role":"anon"}'), true);

      begin
        execute format(
          'update public.%I set publish_status = ''draft'' where id = %s',
          t.tabela, t.id_pub
        );
        get diagnostics v_upd = row_count;
      exception when others then
        v_upd := -1;
      end;

      execute 'reset role';
      if v_upd > 0 then
        execute format(
          'update public.%I set publish_status = ''published'' where id = %s',
          t.tabela, t.id_pub
        );
      end if;

      v_ok := v_upd = case when p.nome in ('servidor', 'admin') then 1 else 0 end;
      insert into _r values (
        p.nome, t.tabela, 'update',
        case when p.nome in ('servidor', 'admin') then '1 linha' else '0 linhas' end,
        v_upd || ' linha(s)', v_ok
      );

      -- DELETE ------------------------------------------------------------
      execute format(
        'insert into public.%I (%I, publish_status) values (%L, ''draft'') returning id',
        t.tabela, t.coluna, 'T6.5 alvo delete ' || p.nome || ' ' || t.tabela
      ) into v_new;

      execute format('set local role %I', p.papel);
      perform set_config('request.jwt.claims', coalesce(p.claims, '{"role":"anon"}'), true);

      begin
        execute format('delete from public.%I where id = %s', t.tabela, v_new);
        get diagnostics v_del = row_count;
      exception when others then
        v_del := -1;
      end;

      execute 'reset role';
      if v_del <= 0 then
        execute format('delete from public.%I where id = %s', t.tabela, v_new);
      end if;

      v_ok := v_del = case when p.nome = 'admin' then 1 else 0 end;
      insert into _r values (
        p.nome, t.tabela, 'delete',
        case when p.nome = 'admin' then '1 linha' else '0 linhas' end,
        v_del || ' linha(s)', v_ok
      );

    end loop;
  end loop;
end
$matriz$;

-- ---------------------------------------------------------------------------
-- admin_settings: tabela interna, sem publish_status. So admin le e escreve.
-- ---------------------------------------------------------------------------
do $settings$
declare
  p record;
  v_n int;
  v_upd int;
begin
  for p in
    select * from (values
      ('anon',      'anon',          null::text),
      ('sem_papel', 'authenticated', '{"sub":"22222222-2222-4222-8222-222222222222"}'),
      ('servidor',  'authenticated', '{"sub":"11111111-1111-4111-8111-111111111111"}'),
      ('admin',     'authenticated', '{"sub":"fc124783-4dc3-46ec-9677-3b15282a7220"}')
    ) as x(nome, papel, claims)
  loop
    execute format('set local role %I', p.papel);
    perform set_config('request.jwt.claims', coalesce(p.claims, '{"role":"anon"}'), true);
    execute 'select count(*) from public.admin_settings' into v_n;
    execute 'reset role';

    insert into _r values (
      p.nome, 'admin_settings', 'select',
      case when p.nome = 'admin' then '1' else '0' end,
      v_n::text,
      v_n = case when p.nome = 'admin' then 1 else 0 end
    );

    v_upd := null;
    execute format('set local role %I', p.papel);
    perform set_config('request.jwt.claims', coalesce(p.claims, '{"role":"anon"}'), true);

    begin
      update public.admin_settings
         set default_sort_mode = 'id'
       where scope = 'global';
      get diagnostics v_upd = row_count;
    exception when others then
      v_upd := -1;
    end;

    execute 'reset role';
    update public.admin_settings
       set default_sort_mode = 'nome'
     where scope = 'global';

    insert into _r values (
      p.nome, 'admin_settings', 'update',
      case when p.nome = 'admin' then '1 linha' else '0 linhas' end,
      v_upd || ' linha(s)',
      v_upd = case when p.nome = 'admin' then 1 else 0 end
    );
  end loop;
end
$settings$;

select persona, acao,
       count(*) as casos,
       count(*) filter (where ok) as ok,
       count(*) filter (where not ok) as falhas,
       string_agg(
         case when not ok then tabela || ' (' || obtido || ')' end, '; '
       ) as divergencias
from _r
group by persona, acao
order by persona, acao;

rollback;
