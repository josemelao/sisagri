-- ============================================================================
-- 0015_colunas_publicas.sql — mascaramento de PII para o papel anon
--
-- ORDEM DE DEPLOY: aplicar DEPOIS do codigo que usa listas explicitas
-- (CAMPOS_PUBLICOS em db.js). O codigo antigo usava select('*') e, se esta
-- migration vier primeiro, o anon perde o SELECT de tabela e o boot quebra.
--
-- anon:
--   funcionarios  -> sem cpf, telefone, email (matricula continua publica)
--   veiculos      -> sem chassi, renavam
--   escala_ferias -> sem SELECT (staff-only)
-- authenticated (admin/servidor): sem mudanca.
-- ============================================================================

revoke select on public.funcionarios from anon;
grant select (
  id, nome, cargo, matricula, lotacao, departamento, orgao, vinculo,
  data_admissao, descricao, foto, foto_storage_path, foto_storage_bucket,
  publish_status, updated_at
) on public.funcionarios to anon;

revoke select on public.veiculos from anon;
grant select (
  id, nome, tipo, marca, modelo, ano, placa, patrimonio, combustivel,
  situacao, localizacao, motoristas, observacoes, arquivo_ids, motorista_ids,
  icone, cor, cor_veiculo, publish_status, updated_at
) on public.veiculos to anon;

-- Escala de ferias: nao e mais publica. So admin/servidor (pode_editar()).
revoke select on public.escala_ferias from anon;
drop policy if exists "Leitura publica published escala_ferias" on public.escala_ferias;
alter policy "Leitura autenticada escala_ferias" on public.escala_ferias
  using (public.pode_editar());

-- Documentacao viva no proprio banco.
comment on table public.escala_ferias is
  'Staff-only: SELECT de anon revogado na 0015. Index publico nao carrega esta tabela.';
