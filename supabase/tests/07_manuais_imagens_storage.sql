-- ============================================================================
-- 07_manuais_imagens_storage.sql — Bloco 3c/13
-- ----------------------------------------------------------------------------
-- Prova a policy storage_manuais_imagens_select_publico no projeto de teste.
--
-- Requer:
--   * migrations 0001 a 0010 aplicadas;
--   * 00a_seed_auth.sql e 00b_seed_dados.sql rodados;
--   * ao menos 1 manual published e 1 manual draft em public.manuais.
--
-- Personas:
--   anon        -> so imagem de manual published
--   sem_papel   -> so imagem de manual published
--   servidor    -> published + draft + orfao (pode_editar)
--   admin       -> published + draft + orfao (pode_editar)
--
-- Roda inteiro em uma transacao e faz rollback. Resultado esperado: 0 falhas.
-- ============================================================================

begin;

create temp table _r07 (
  persona text,
  esperado int,
  obtido int,
  ok boolean
) on commit drop;

do $t07$
declare
  p record;
  v_pub bigint;
  v_draft bigint;
  v_n int;
begin
  select id into v_pub
    from public.manuais
   where publish_status = 'published'
   order by id
   limit 1;

  select id into v_draft
    from public.manuais
   where publish_status = 'draft'
   order by id
   limit 1;

  if v_pub is null or v_draft is null then
    raise exception '07: seed precisa de 1 manual published e 1 draft';
  end if;

  -- Vinculos temporarios: publicado, rascunho e um manual published com passos
  -- malformado (a policy nao pode quebrar).
  update public.manuais
     set passos = jsonb_build_array(jsonb_build_object(
       'texto', 'T6.5 publicado',
       'imagem_storage_path', 'manuais/t6.5-pub.jpg',
       'imagem_storage_bucket', 'manuais-imagens-smader'
     ))
   where id = v_pub;

  update public.manuais
     set passos = jsonb_build_array(jsonb_build_object(
       'texto', 'T6.5 rascunho',
       'imagem_storage_path', 'manuais/t6.5-draft.jpg',
       'imagem_storage_bucket', 'manuais-imagens-smader'
     ))
   where id = v_draft;

  insert into public.manuais (id, titulo, passos, publish_status)
  values (900007, 'T6.5 malformado', '{"foo":"bar"}'::jsonb, 'published')
  on conflict (id) do update
    set titulo = excluded.titulo,
        passos = excluded.passos,
        publish_status = excluded.publish_status;

  insert into storage.objects (id, bucket_id, name, metadata)
  values
    (gen_random_uuid(), 'manuais-imagens-smader', 'manuais/t6.5-pub.jpg', '{}'::jsonb),
    (gen_random_uuid(), 'manuais-imagens-smader', 'manuais/t6.5-draft.jpg', '{}'::jsonb),
    (gen_random_uuid(), 'manuais-imagens-smader', 'manuais/t6.5-orphan.jpg', '{}'::jsonb);

  for p in
    select * from (values
      ('anon',      'anon',          '{"role":"anon"}'::text, 1),
      ('sem_papel', 'authenticated', '{"sub":"22222222-2222-4222-8222-222222222222"}', 1),
      ('servidor',  'authenticated', '{"sub":"11111111-1111-4111-8111-111111111111"}', 3),
      ('admin',     'authenticated', '{"sub":"fc124783-4dc3-46ec-9677-3b15282a7220"}', 3)
    ) as x(nome, papel, claims, esperado)
  loop
    execute format('set local role %I', p.papel);
    perform set_config('request.jwt.claims', p.claims, true);

    select count(*) into v_n
      from storage.objects
     where bucket_id = 'manuais-imagens-smader'
       and name in (
         'manuais/t6.5-pub.jpg',
         'manuais/t6.5-draft.jpg',
         'manuais/t6.5-orphan.jpg'
       );

    execute 'reset role';

    insert into _r07 values (p.nome, p.esperado, v_n, v_n = p.esperado);
  end loop;
end
$t07$;

select persona, esperado, obtido, ok
  from _r07
 order by persona;

select count(*) filter (where not ok) as falhas
  from _r07;

rollback;
