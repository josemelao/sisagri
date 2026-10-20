# Auditoria de RLS, Auth e Storage — SisAgri / SMADER

**Data da execução:** 2026-10-19
**Projeto Supabase:** `yiujxempodimegdoexqo`
**Branch:** `codex/fase2`
**Método:** MCP do Supabase (`list_tables`, `execute_sql`, `list_migrations`, `list_extensions`) + requisições PostgREST e Storage com a `anon key` pública de `db.js` + `GET /auth/v1/settings` + Advisors (dashboard).
**Natureza:** 100% leitura. Nenhuma DDL, nenhum `write`, nenhum arquivo do app alterado.

> Este documento é a **linha de base** do Bloco 1 do `v2_plano_refatoração.md`. Toda correção dos Blocos 3, 3b e 3c deve ser comparada com os números abaixo.
>
> **Atualização (2026-10-19, pós-correção):** o Bloco 3 foi **aplicado em
> produção** (`0002_admin_gate`, `0003_hardening_leitura`) e o Storage recebeu a
> `0004_storage_gate`. O achado **C2 está fechado** (tabelas **e** Storage) e o
> **N1** também. Os números desta auditoria refletem o *antes* e continuam válidos
> como linha de base. O *depois* está em `supabase/README.md`.
>
> **N5 — parcialmente resolvido.** O rascunho `arquivos.id = 45` e o objeto órfão
> de 1,4 MB foram **apagados** (com backup local antes) e as duas URLs passaram a
> responder **400**. O objeto do rascunho, porém, **esteve publicamente acessível
> de 2026-03-27 a 2026-10-19** — isso não se desfaz. E o **mecanismo continua
> aberto**: os 3 buckets seguem `public = true`, então um upload novo em rascunho
> nasce público. Fechar isso é o Bloco 3b parte 2.
>
> Guarda de regressão: `supabase/tests/04_storage_rascunho_publico.sql`
> (esperado: 0 linhas).

---

## 1. Inventário do banco

| Item | Valor |
|---|---|
| Tabelas em `public` | 15 |
| RLS habilitado | 15/15 (`relforcerowsecurity = false` em todas) |
| Tabelas com `publish_status` | 14 (`admin_settings` é a exceção) |
| Policies totais | 73 |
| Migrations registradas | **0** |
| Registros | 123 + 1 em `admin_settings` |
| Rascunhos | 2 |
| Registros sem `publish_status` | 0 |
| Contas em `auth.users` | 1 |

### Composição das policies

- 14 tabelas de conteúdo × 5 = 70
  - 1 `anon` `SELECT` com `qual = (publish_status = 'published'::text)`
  - 4 `authenticated` (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) com `qual`/`with_check = true`
- `admin_settings`: 3 (`SELECT`/`INSERT`/`UPDATE` para `authenticated`, com trava `scope = 'global'`), sem policy `anon`

  > **Nuance medida:** a policy `admin_settings_insert` tem `with_check` restritivo
  > (`scope = 'global' AND default_sort_mode IN ('id','nome')`) e `qual = NULL`.
  > Por isso ela **não** faz parte da dívida do Bloco 3. Consultas que usam
  > `coalesce(qual,'true')` contam 43 em vez de 42 e produzem falso positivo.
  > A contagem correta é **42** — igual à do Advisor.

---

## 2. Contagem por tabela (linha de base)

| Tabela | Total | Rascunhos | Publicados | Sem status |
|---|---:|---:|---:|---:|
| acesso_rapido | 6 | 0 | 6 | 0 |
| agenda_eventos | 1 | 0 | 1 | 0 |
| arquivos | 60 | 1 | 59 | 0 |
| avisos | 1 | 0 | 1 | 0 |
| escala_ferias | 5 | 0 | 5 | 0 |
| funcionarios | 15 | 0 | 15 | 0 |
| info_juridico | 5 | 0 | 5 | 0 |
| info_municipio | 4 | 0 | 4 | 0 |
| info_orgaos | 3 | 0 | 3 | 0 |
| manuais | 6 | 0 | 6 | 0 |
| processos | 4 | 1 | 3 | 0 |
| servicos | 6 | 0 | 6 | 0 |
| sistemas | 4 | 0 | 4 | 0 |
| veiculos | 3 | 0 | 3 | 0 |
| **Total** | **123** | **2** | **121** | **0** |

`admin_settings`: 1 registro.

---

## 3. Teste de exposição com a `anon key`

| Requisição | Resultado | Veredito |
|---|---|---|
| `GET /rest/v1/arquivos?select=id,publish_status&limit=1` | `content-range: 0-0/59` | ✅ rascunho não aparece |
| `GET /rest/v1/arquivos?...&publish_status=eq.draft` | `content-range: */0`, corpo `[]` | ✅ |
| `GET /rest/v1/processos?...&publish_status=eq.draft` | `content-range: */0`, corpo `[]` | ✅ |
| `GET /rest/v1/admin_settings?select=*` | `content-range: */0`, corpo `[]` | ✅ |
| `GET /rest/v1/funcionarios?select=id,nome,publish_status&limit=100` | `0-14/15`, todos `published` | ✅ |

**Conclusão:** a separação rascunho/publicado **funciona** para visitante anônimo. Não há vazamento de rascunho pelo banco na data desta auditoria.

---

## 4. Autenticação

| Verificação | Antes (2026-10-19) | Depois do Bloco 0 |
|---|---|---|
| `disable_signup` | **`false`** (cadastro público aberto) | **`true`** |
| `mailer_autoconfirm` | `false` (exige confirmação) | `false` (mantido) |
| `external.email` | `true` | `true` |
| `external.anonymous_users` | `false` | `false` |
| Tentativa de `POST /auth/v1/signup` | — | `422 signup_disabled` |
| Contas em `auth.users` | 1 | 1 |

### Achado C2 e por que ele era explorável

`disable_signup = false` **combinado** com 14 tabelas que concedem `authenticated` com `qual = true` significava: qualquer pessoa cria conta (e-mail próprio), entra e passa a **ler rascunhos, editar e apagar todo o conteúdo**. Fechar o cadastro (Bloco 0) remove a porta de entrada; o **Bloco 3** remove a permissão (gate `is_admin()`).

---

## 5. Advisors de segurança (dashboard, 2026-10-19)

| Advisor | Avisos | Natureza |
|---|---:|---|
| `rls_policy_always_true` (0024) | 42 | Confirmado: `UPDATE`/`INSERT`/`DELETE` `authenticated` com `true` |
| `public_bucket_allows_listing` (0025) | 3 | 3 buckets públicos com `SELECT` amplo em `storage.objects` |
| `anon_security_definer_function_executable` (0028) | 1 | `public.rls_auto_enable()` |
| `authenticated_security_definer_function_executable` (0029) | 1 | idem |
| `auth_leaked_password_protection` | 1 | Proteção de senha vazada |

### Função `public.rls_auto_enable()`

```sql
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
-- dono: postgres
-- ACL: {=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}
```

É função de **event trigger do próprio Supabase** (auto-habilita RLS em tabela nova criada em `public`). Fora do contexto de event trigger, `pg_event_trigger_ddl_commands()` falha — **não parece explorável**. Correção: `revoke execute ... from anon, authenticated` (T3.6). Isso **não** quebra o event trigger.

---

## 6. Storage

> **Atualização 2026-10-20:** `arquivos-smader` e `funcionarios-fotos-smader`
> foram fechados no 3b2 (`0008`/`0009`); `manuais-imagens-smader` foi fechado no
> 3c/13 (`0010`/`0011`). A tabela abaixo é o retrato de 2026-10-19.

Os 3 buckets são **`public = true`**. Objeto em bucket público é servido por URL **sem passar por policy**; a policy só controla listagem.

| Bucket | Objetos | Tamanho | Público | Políticas em `storage.objects` |
|---|---:|---:|---|---|
| `arquivos-smader` | 59 | 33 MB | sim | SELECT/INSERT/UPDATE/DELETE para `authenticated` |
| `funcionarios-fotos-smader` | 3 | 348 kB | sim | idem |
| `manuais-imagens-smader` | 73 | 6,7 MB | sim | idem |

### Prova de acesso sem credencial

```
GET /storage/v1/object/public/arquivos-smader/arquivos/1774662485424-29012026171821_614-Remessa.pdf
→ 200 · content-type: application/pdf · content-length: 1460078 · primeiros bytes: %PDF-
```

Nenhuma credencial foi enviada — nem a `anon key`.

### O arquivo pertence a um rascunho

```
arquivos.id = 45
publish_status = 'draft'
storage_bucket = 'arquivos-smader'
storage_path   = arquivos/1774662485424-29012026171821_614-Remessa.pdf
```

### Detalhamento de `arquivos`

| Métrica | Valor |
|---|---:|
| Registros | 60 |
| Com `storage_path` | 58 |
| Rascunhos | 1 |
| **Rascunhos com arquivo** | **1** |
| Objetos no bucket | 59 |
| **Objetos órfãos** (nenhum registro referencia) | **1** |

### Colunas de storage existentes

- `arquivos(storage_bucket, storage_path, url)`
- `funcionarios(foto, foto_storage_bucket, foto_storage_path)` — 3 registros com foto, 0 rascunhos
- `manuais`: **sem** coluna de storage — os 73 objetos são referenciados dentro de `manuais.documentos` (JSON)
- `processos`: **sem** coluna de storage

**Consequência registrada:** o RLS protege a linha; **não** protege o arquivo. Despublicar não remove o acesso a uma URL já conhecida. Corrigir no Bloco 3c (listagem/órfão) e Bloco 3b (modelo de acesso).

---

## 7. Riscos aceitos / pendências conhecidas

| Item | Situação |
|---|---|
| URL do arquivo do rascunho `id=45` | **Já esteve publicamente acessível.** Não há como "desexpor" o conhecimento de quem já viu. Registro histórico, não tarefa. |
| Objeto órfão em `arquivos-smader` | Aguarda decisão do dono (Bloco 3c). |
| `auth_leaked_password_protection` | Bloco 0.5 executado — pendente confirmação do aviso removido no dashboard. |
| `get_advisors` via MCP | Indisponível no conjunto de ferramentas do MCP conectado. Consulta feita manualmente no dashboard. |

---

## 8. Como reproduzir

```bash
node scripts/check-draft-leak.mjs
```

Lê a `anon key` e a URL direto de `db.js` e falha se qualquer tabela expuser rascunho para anônimo.

Validação da política anon (SQL): `supabase/tests/01_anon_policy.sql`.
