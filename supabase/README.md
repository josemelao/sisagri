# `supabase/` — esquema, políticas e testes do banco

Este diretório guarda a parte do projeto que **não** roda no navegador: o esquema
do Postgres, as políticas de RLS e os testes adversariais.

Projeto Supabase: `yiujxempodimegdoexqo` (SisAgri / SMADER).

---

## Estado atual — leia isto primeiro

| Fato | Valor |
|---|---|
| Migrations aplicadas em produção | **0** |
| `supabase_migrations.schema_migrations` | **vazia** |
| Arquivos aqui | snapshots, **não aplicados** |
| DDL em produção até agora | feita **à mão**, pelo dashboard |

Ou seja: o projeto **nunca usou migrations versionadas**. Nada neste diretório
foi executado contra o banco de produção. Tudo aqui foi **gerado por
introspecção** do catálogo do Postgres em **2026-10-19**.

> A partir do Bloco 3 do `v2_plano_refatoração.md`, toda mudança de banco passa a
> ser migration versionada e revisada. Estes dois arquivos `0001_*` são o
> retrato do ponto de partida.

---

## Arquivos

| Arquivo | O que é | Seguro rodar em produção? |
|---|---|---|
| `migrations/0001_baseline_schema.sql` | 15 tabelas, 30 constraints, extensões, flags de RLS | **Não sem autorização** |
| `migrations/0001_baseline_policies.sql` | 73 policies em `public` + 12 em `storage.objects` | **Não sem autorização** |
| `tests/01_anon_policy.sql` | 4 consultas de verificação de política anon | Sim — **só leitura** |

Os números acima foram conferidos: 73 + 12 = **85 `create policy`**.

### Por que "não sem autorização", se é só o estado atual?

Porque reaplicar o baseline recria policies — e recriar policy **é** alterar
permissão. Mesmo sendo idênticas, existe risco de transcrição. O baseline serve
para:

1. **documentar** o esquema em texto versionado no Git;
2. **reconstruir um projeto de teste** idêntico ao de produção (é o que permite
   validar o Bloco 3 sem tocar no banco real);
3. **ser o rollback** do Bloco 3 — se o gate `is_admin()` der problema, aplicar
   `0001_baseline_policies.sql` devolve as 42 policies liberadas.

---

## `0001_baseline_policies.sql` é o rollback do Bloco 3

O Bloco 3 vai substituir, nas 14 tabelas de conteúdo, as policies de escrita de
`authenticated` — hoje `using (true)` — por um gate `is_admin()`.

Se algo der errado, o caminho de volta é este arquivo. Ele é reaplicável
(`drop policy if exists` antes de cada `create policy`).

**A policy `anon` de leitura NUNCA é alterada por nenhum bloco.** É ela —
`using (publish_status = 'published'::text)` — que impede o rascunho de vazar.
Ela é o mecanismo que faz o sistema funcionar corretamente hoje.

---

## Como usar

### Verificar a política anon (seguro, só leitura)

```bash
node scripts/check-draft-leak.mjs
# ✔ OK — 15/15 tabelas sem rascunho exposto para anon
```

O script lê a URL e a `anon key` direto de `db.js`, deriva as tabelas de
`SUPABASE_TABLES` e falha (exit 1) se qualquer rascunho aparecer. É a rede de
regressão dos Blocos 3, 3c e 7 — rode antes e depois de cada mudança de RLS.

As consultas SQL equivalentes estão em `tests/01_anon_policy.sql`.

### Reconstruir um projeto de teste

Em um projeto Supabase **de teste** (nunca o de produção), na ordem:

1. `migrations/0001_baseline_schema.sql`
2. `migrations/0001_baseline_policies.sql`

Depois disso, aponte `db.js` para o projeto de teste e rode o script. É assim
que se valida que o Bloco 3 fecha o acesso sem quebrar a leitura pública.

---

## Convenções para as próximas migrations

1. **Um bloco do plano, uma migration.** Nada de juntar assuntos.
2. Nome: `NNNN_descricao_curta.sql` (4 dígitos, minúsculas, `_`).
3. DDL sempre versionada. Botão do dashboard não é rastreável.
4. Toda migration que mexe em policy vem acompanhada da consulta de verificação
   correspondente e da rodada de `check-draft-leak.mjs`.
5. Nunca usar `service_role` no frontend — só `anon key`.
6. Nunca remover o fallback local de `db.js`.

---

## Referências

- `docs/seguranca/auditoria-rls-2026-10-19.md` — auditoria completa, números
  medidos, provas de acesso anon.
- `v2_plano_refatoração.md` — plano em blocos, com validação e checklist por
  bloco.
