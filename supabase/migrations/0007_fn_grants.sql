-- 0007_fn_grants.sql
-- Fecha o EXECUTE anonimo das funcoes de papel (advisors 0028/0029).
--
-- anon NAO precisa dessas funcoes: as 14 policies de anon sao apenas
-- publish_status = 'published' e storage nao tem policy para anon.
-- authenticated PRECISA manter EXECUTE: as policies chamam is_admin() e
-- pode_editar() em nome do usuario logado, e o painel chama meu_papel().
-- Revogar de authenticated quebraria a RLS.

revoke execute on function public.is_admin()    from public, anon;
revoke execute on function public.pode_editar() from public, anon;
revoke execute on function public.meu_papel()   from public, anon;

grant execute on function public.is_admin()    to authenticated, service_role;
grant execute on function public.pode_editar() to authenticated, service_role;
grant execute on function public.meu_papel()   to authenticated, service_role;
