# v2 — Plano de Refatoração e Robustez do SisAgri / SMADER

> **Para agentes de IA executores:** este documento substitui `2026-10-19-plano-acao-robustez.md` (v1) como plano de execução. A v1 permanece como **histórico**. Leia o cabeçalho inteiro, o *Protocolo de execução* e o bloco que vai executar **antes** de tocar em qualquer arquivo. Execute **um bloco por vez** e não avance sem a validação aprovada.

**Data:** 2026-10-19
**Branch de trabalho:** `codex/fase2` (base `da655a0`)
**Commit de referência na criação deste plano:** `0d97cc0`
**Revisão 2 (2026-10-19):** incorpora os 5 achados dos Advisors de segurança (`N1`–`N5`) e os blocos **0.5**, **3b** e **3c**. O Bloco 0 foi executado e validado.
**Revisão 3 (2026-10-19):** situa a execução real. Blocos **0**, **0.5**, **1**, **2**, **3** (parte de tabela) e **3c** **concluídos**; Bloco **3b** está **parcial** (parte 1 = gate do Storage). `0002`, `0003` e `0004` estão **aplicadas em produção**. Os registros dentro dos Blocos 3 e 3c descrevem as divergências em relação ao previsto.
**`main`:** produção. **Nada** vai para `main` ou para o remoto sem validação explícita do dono.
**Origem:** correção da v1 a partir de auditoria real do banco executada em 2026-10-19 (somente leitura).

---

## 1. Estado verificado (auditoria de 2026-10-19)

Toda a evidência abaixo foi **medida**, não inferida. Método: MCP do Supabase (`list_tables`, `execute_sql`, `list_migrations`) + requisições PostgREST com a `anon key` pública do `db.js` + `GET /auth/v1/settings`.

| Verificação | Resultado medido |
|---|---|
| Tabelas em `public` | 15 |
| RLS habilitado | **15/15** (`relforcerowsecurity = false` em todas) |
| Tabelas com `publish_status` | 14 (`admin_settings` é a exceção) |
| Policies totais | 73 — 14 × (1 `anon` SELECT + 4 `authenticated`) + 3 em `admin_settings` |
| Policy `anon` de conteúdo | `roles={anon}`, `qual = (publish_status = 'published'::text)` |
| Policies `authenticated` de conteúdo | `SELECT/INSERT/UPDATE/DELETE` com `qual = true` / `with_check = true` |
| `admin_settings` | sem policy `anon`; `authenticated` com trava `scope='global'` |
| Registros nas tabelas | **123** + 1 em `admin_settings` |
| Rascunhos | **2** (1 em `arquivos`, 1 em `processos`) |
| Registros sem `publish_status` | **0** |
| Contas em `auth.users` | **1** |
| Migrations registradas | **0** |
| `disable_signup` | **`false` — cadastro público ABERTO** |
| `mailer_autoconfirm` | `false` (exige confirmação de e-mail) |
| `external.anonymous_users` | `false` |

### Teste de vazamento com a anon key (prova, não suposição)

| Teste | Resultado |
|---|---|
| `GET /rest/v1/arquivos?select=id,publish_status` como anon | `0-0/59` → **o rascunho não aparece** |
| `GET /rest/v1/arquivos?...&publish_status=eq.draft` como anon | `*/0` |
| `GET /rest/v1/processos?...&publish_status=eq.draft` como anon | `*/0` |
| `GET /rest/v1/admin_settings?select=*` como anon | `*/0` |
| `GET /rest/v1/funcionarios?...` como anon | 15/15, todos `published` |

**Conclusão:** a separação rascunho/publicado **já funciona para visitante anônimo**. O RLS é a única garantia e hoje ela está de pé.

### 1.1 Advisors de segurança (dashboard, 2026-10-19)

Cinco avisos, nenhum erro. **Quatro são achados novos** — o relatório de análise não olhou nem para `storage` nem para funções do banco.

| Advisor | Avisos | Achado | Bloco |
|---|---|---|---|
| `rls_policy_always_true` (0024) | 42 | policies `UPDATE`/`INSERT`/`DELETE` com `USING`/`WITH CHECK = true` para `authenticated` nas 14 tabelas | **3** (confirma a auditoria de forma independente) |
| `public_bucket_allows_listing` (0025) | 3 | 3 buckets públicos com policy `SELECT` ampla em `storage.objects` para `authenticated` | **3c** |
| `anon_security_definer_function_executable` (0028) | 1 | `public.rls_auto_enable()` é `SECURITY DEFINER` e executável pelo `anon` | **3** (T3.6) |
| `authenticated_security_definer_function_executable` (0029) | 1 | idem, executável por `authenticated` | **3** (T3.6) |
| `auth_leaked_password_protection` | 1 | proteção contra senha vazada (HaveIBeenPwned) desligada | **0.5** |

Sobre o `rls_auto_enable()`: é função de **event trigger do próprio Supabase** (auto-habilita RLS em tabela nova criada em `public`), dono `postgres`, `SET search_path TO 'pg_catalog'`. Fora do contexto de event trigger, `pg_event_trigger_ddl_commands()` falha — **não parece explorável**. O hardening ainda é barato e recomendado pelo próprio Advisor (T3.6).

### 1.2 Storage — a superfície que a análise não olhou

Os 3 buckets são **`public = true`**. Regra do Supabase: objeto em bucket público é servido por URL **sem passar por policy** — a policy só controla listagem (`SELECT` em `storage.objects`).

Prova executada (sem enviar credencial alguma, nem a anon key):

```
GET /storage/v1/object/public/arquivos-smader/arquivos/1774662485424-29012026171821_614-Remessa.pdf
→ 200 · content-type: application/pdf · content-length: 1460078 · primeiros bytes: %PDF-
```

Esse arquivo pertence ao registro **`arquivos.id = 45`, `publish_status = 'draft'`** (bucket `arquivos-smader`, path acima). Ou seja:

> **O RLS protege a linha do banco; não protege o arquivo.** O rascunho é invisível na API, mas o anexo responde `200` para qualquer pessoa que tenha a URL — sem login e **de forma permanente**: despublicar não remove o acesso.

Inventário medido:

| Bucket | Objetos | Tamanho | Público | Observação |
|---|---:|---:|---|---|
| `arquivos-smader` | 59 | 33 MB | **sim** | 58 referenciados por registros, **1 órfão** (nenhum registro aponta para ele) |
| `funcionarios-fotos-smader` | 3 | 348 kB | **sim** | fotos de servidores (dado pessoal — LGPD), 0 rascunhos |
| `manuais-imagens-smader` | 73 | 6,7 MB | **sim** | referenciadas dentro de `manuais.documentos` (JSON), **não** por coluna de storage |

Detalhe de `arquivos`: 60 registros, 58 com `storage_path`, 1 rascunho — **e esse rascunho tem arquivo**. Colunas de storage existentes: `arquivos(storage_bucket, storage_path)`, `funcionarios(foto, foto_storage_bucket, foto_storage_path)`. `manuais` e `processos` **não** têm coluna de storage.

Policies de `storage.objects` (medidas): `SELECT`/`INSERT`/`UPDATE`/`DELETE` para `authenticated`, com `qual`/`with_check = (bucket_id = '<bucket>')`. É o **mesmo padrão do C2**: qualquer conta autenticada lista, sobrescreve e apaga arquivos.

Atenuante honesta: a URL **não** é descobrível pela API (o RLS esconde a linha que a contém). O risco se materializa quando a URL já circulou — histórico/localStorage de máquina compartilhada, WhatsApp, e-mail, link colado — ou quando alguém com conta lista o bucket.

---

## 2. Correções em relação à v1 (o que mudou e por quê)

| # | v1 dizia | v2 corrige | Evidência |
|---|---|---|---|
| 1 | **C1 = Crítico**: rascunho vaza para o navegador de qualquer visitante; conter com política interina (T0.3) | **Rebaixado a "defesa em profundidade"**. O RLS **já bloqueia** rascunho para `anon`. A política interina da T0.3 **já existe** no banco; não há nada a criar. | testes anon acima |
| 2 | **C2 = "login não verifica papel"** (frontend), contido por T0.4 | **C2 é o achado nº 1 e é explorável hoje**: `disable_signup=false` **+** policies `authenticated` com `qual=true` em 14 tabelas. Qualquer pessoa cria conta e vira admin total (lê rascunhos, edita, apaga). A contenção real é **desligar o cadastro público** + **gate de admin no RLS**, não a checagem no frontend. | `/auth/v1/settings` + `pg_policies` |
| 3 | Fase 0 = "fechar sangramento" com T0.1–T0.6 | O sangramento **não é** o anon. É a porta de entrada (`disable_signup`). Bloco 0 novo, **ação humana de 5 minutos**, antes de tudo. | idem |
| 4 | T0.1 (auditoria) = pendente | **Concluída.** Resultados na seção 1. Falta apenas gravar a evidência em arquivo (Bloco 1). | seção 1 |
| 5 | B6/T0.2 = "banco não versionado" (intuição) | **Confirmado**: `list_migrations` = 0. Todas as policies foram criadas à mão no dashboard. Prioridade **elevada**, porque qualquer correção de RLS fica irreversível sem baseline. | `list_migrations` |
| 6 | Ordem: contenção → base de qualidade → RBAC | **Mantida a espinha**, com duas trocas: (a) **gate de admin no RLS vem antes** do RBAC completo, porque o problema é conter acesso, não desenhar papéis; (b) a **base de qualidade** (lint/testes/CI) vem antes dos blocos que alteram `db.js`/`script.js`/`admin.js`. | — |
| 7 | §7.2 passo 4 do documento de estado: `get_advisors` | **Indisponível**: esse método não existe no conjunto de ferramentas do MCP conectado. Usar a página **Advisors** do dashboard (ação humana). | catálogo do MCP |
| 8 | — | **Risco novo (baixo):** `escala_ferias` tem `publish_status` **e** `status`. Toda policy/consulta deve usar **`publish_status`**; confundir os dois quebra regra de publicação. | `information_schema.columns` |
| 9 | — | **Risco novo (latente):** `dados.js` não tem `publish_status` em nenhum registro (caminho de fallback local nasce publicado). No banco isso não ocorre (0 registros sem status). Tratar junto com o M6. | contagem = 0 |
| 10 | — | **A v1 e o relatório não olharam para `storage`.** Achado novo **N5**: arquivo de rascunho é publicamente acessível por URL (bucket público). Provado com `200` sem credencial. | seção 1.2 |
| 11 | — | **Achado novo N3:** `public.rls_auto_enable()` é `SECURITY DEFINER` executável por `anon`/`authenticated` (Advisor 0028/0029). | dashboard Advisors |
| 12 | — | **Achado novo N4:** proteção contra senha vazada desligada. | dashboard Advisors |
| 13 | Fase 0 apenas no banco | **Alcance do gate de admin ampliado**: o Bloco 3 passa a cobrir também `storage.objects` — hoje `authenticated` lista, sobrescreve e apaga arquivos de qualquer bucket. | `pg_policies` (schema `storage`) |

---

## 3. Restrições globais invioláveis (valem para todos os blocos)

1. **Nada vai para `main` nem para o remoto.** Trabalho em `codex/fase2`; push só com autorização explícita.
2. **Nunca expor `service_role`** em qualquer arquivo do front. Apenas `anon key` (pública por design). Segredos de servidor vivem em Supabase Secrets.
3. **Não renomear** IDs, classes, chaves persistidas (`smader_db_v1`, `MODULE_SEARCH_STATE_KEY`, `ARQUIVOS_UI_STATE_KEY`, `AGENDA_UI_STATE_KEY`, `ig_access_token`) nem assinaturas de `DB.*` sem tarefa explícita.
4. **Preservar o fluxo `publish_status`** em 100% das alterações. Rascunho nunca pode chegar a visitante anônimo.
5. **Não migrar** para framework, bundler ou módulos ES (`AGENTS.md` §9).
6. **Fallback local é feature**, não bug: o app precisa continuar funcionando com Supabase fora do ar.
7. **Toda DDL** (tabela, função, policy, trigger) entra por **migration versionada** a partir do Bloco 2. Nada de clicar no dashboard.
8. **Todo bloco termina com**: validação executada e registrada + checklist do bloco preenchido + `git status` limpo + **um commit próprio**.
9. **Nunca "consertar de passagem".** Achou outro problema? Registra no fim do bloco e segue.
10. **Antes de alterar policy**, ler o Bloco 3. Há uma ordem obrigatória (promover o admin atual **antes** de fechar as policies).

---

## 4. Foco de revisão (o que os testes de cada bloco precisam cobrir)

1. Registro **sem** `publish_status` (importado, legado, criado por script) — deve nascer **rascunho**, nunca público.
2. Sessão válida **sem papel** (`role` ausente/estranho em `app_metadata`) — deve ser **negada**, nunca promovida.
3. **Falha de rede** durante `insert/update/delete` — o dado não pode desaparecer nem a UI mentir "salvo".
4. Texto com `<`, `>`, `"`, `'`, `&` vindo de formulário ou de terceiros (Instagram) — não pode quebrar layout nem executar script.
5. **Dois editores** salvando o mesmo registro — sem ID duplicado e sem sobrescrita silenciosa.
6. **Anon** tentando `select` com `publish_status=eq.draft` em qualquer tabela — sempre `[]`.
7. **Autenticado sem papel de admin** tentando `insert/update/delete` — sempre negado pelo banco.
8. **Arquivo de rascunho** (ou de registro apagado) acessível por URL — não pode continuar público só porque o bucket é público.
9. **Autenticado sem papel de admin** listando, sobrescrevendo ou apagando arquivo em `storage.objects` — sempre negado.

---

## 5. Protocolo de execução obrigatório (agentes de IA)

```
1. LER: AGENTS.md → plano-rascunho-admin.txt → este doc (cabeçalho + bloco alvo).
2. CONFIRMAR: git branch --show-current == codex/fase2 ; git status limpo.
3. ANUNCIAR antes de editar: "Bloco N — tarefa X.Y".
4. EXECUTAR apenas as tarefas do bloco. Não antecipar o próximo bloco.
5. PROVAR: rodar o comando de validação do bloco e colar a saída.
6. PARAR: preencher o checklist, listar o que NÃO foi validado e aguardar o dono.
7. COMMITAR só o bloco validado, com a mensagem do template.
```

**Regra de parada dura:** se a validação falhar, **reverter o bloco** (`git checkout -- <arquivos>` + migration de rollback) e relatar. Não tentar "consertar na hora".

**Regra de escopo:** se o bloco exigir tocar arquivo não listado nele, **parar e perguntar**. Não expandir escopo por conta própria.

---

## 6. Como provar cada bloco (modelo de evidência)

Ao fechar um bloco, anexar no relatório ao dono:

```
BLOCO: <n> — <nome>
DATA: <aaaa-mm-dd>
COMMIT: <hash>
ARQUIVOS: <lista>
VALIDAÇÃO:
  comando: <comando exato>
  saída esperada: <texto>
  saída obtida: <colar>
CHECKLIST: <colar o checklist preenchido>
NÃO VALIDADO / LIMITAÇÕES: <o que ficou de fora>
ROLLBACK TESTADO: sim/não (e como)
```

Sem isso, o bloco **não** é considerado concluído.

### Template de commit

```bash
git add <arquivos do bloco>
git commit -m "<tipo>(<escopo>): <descrição curta>"
# tipos: fix | feat | refactor | chore | docs | test | security
```

---

## 7. Mapa de blocos

| Bloco | Nome | Tipo | Esforço | Depende de | Achados |
|---|---|---|---|---|---|
| **0** | Contenção: fechar o cadastro público | 🤝 humano | 5 min | — | C2 |
| **0.5** | Hardening de Auth (senha vazada) | 🤝 humano | 2 min | — | **N4** |
| **1** | Gravar a auditoria + suíte adversarial | 🤖 | 4h | B0 | C1, C2, B6 |
| **2** | Baseline versionado do schema/policies | 🤖 | 1 dia | B0 | B6 |
| **3** | **Gate de admin no RLS** (tabelas + `storage.objects` + revoke do N3) | 🤖 + 🤝 | 1–2 dias | B1, B2 | **C2, N1, N3** |
| **3c** | Storage: fechar listagem, órfão e arquivo de rascunho | 🤖 + 🤝 | 4h | B3 | **N2, N5** |
| **3b** | Storage: modelo de acesso (privado + *signed URL*) | 🤝 design + 🤖 | 2–3 dias | B4 | **N5** |
| **4** | Rede de segurança do código (lint/testes/CI) | 🤖 | 1–2 dias | — | A5 |
| **5** | Autorização no frontend | 🤖 | 1 dia | B3, B4 | C2 |
| **6** | RBAC por papel e por área | 🤝 design + 🤖 | 3–5 dias | B3, B5 | C2, M6 |
| **7** | Rascunho: defesa em profundidade + M6 | 🤖 | 1 dia | B3, B4 | C1, M6 |
| **8** | Escrita confiável | 🤖 | 2–3 dias | B4 | A2, A3, A4, M10, M11 |
| **9** | Saída segura (XSS, handlers, CSP) | 🤖 | 2–3 dias | B4 | A1, M2, M4 |
| **10** | Token do Instagram fora do navegador | 🤖 + 🤝 | 1 dia | B4 | C3 |
| **11** | Consolidação do admin (motor de listas) | 🤖 | 3–5 dias | B4 | M1, M3 |
| **12** | Repaginação de UX do admin | 🤝 design + 🤖 | 3–5 dias | B11 | relato do dono |
| **13** | Produto público e higiene | 🤖 | 3–5 dias | B4 | M5, M7, M8, M9, M12, B1–B5 |

Legenda de esforço: **S** ≤ 4h · **M** 1–2 dias · **G** 3–5 dias.

**Ordem recomendada:** 0 → 0.5 → 1 → 2 → 3 → 3c → 4 → 3b → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13.
Blocos 3c e 0.5 não dependem de código e podem ser feitos imediatamente.
Bloco 3b depende do Bloco 4 porque altera `script.js` (troca de URL pública por *signed URL*) e precisa de teste.
Blocos 10 e 13 podem correr em paralelo com 11/12 quando houver folga.
**Nunca** inverta 0 / 0.5 / 1 / 2 / 3 / 3c: é a contenção.

---
---

# BLOCO 0 — Contenção: fechar o cadastro público

**Tipo:** ação humana (dono), sem código.
**Por que primeiro:** hoje qualquer pessoa cria conta no projeto e, como as 14 tabelas de conteúdo concedem `authenticated` com `qual = true`, essa conta passa a **ler rascunhos, editar e apagar tudo**. É o único achado com exploração trivial em produção.
**Achados:** C2 (porta de entrada).

### Tarefas — ✅ executadas em 2026-10-19

- [x] **T0.1 — Desligar o cadastro público** (feito pelo dono no dashboard)
  Supabase Dashboard → **Authentication → Providers → Email** → desligar **"Allow new users to sign up"**.
- [x] **T0.2 — Manter a confirmação de e-mail ligada**
  Em **Authentication → Providers → Email**, garantir **"Confirm email" = ON** (`mailer_autoconfirm` já é `false`; não mudar).
- [x] **T0.3 — Conferir Advisors**
  Abrir **Advisors → Security** no dashboard e anotar o que aparecer (o método `get_advisors` não está disponível no MCP). Resultado: 5 avisos → seções 1.1, 1.2 e bloco 0.5.
- [x] **T0.4 — Conferir os usuários existentes**
  Authentication → Users: confirmar que só existe **1 conta** (a legítima).

### Validação (prova)

```bash
# 1) Cadastro deve estar fechado
curl -s "https://<proj>.supabase.co/auth/v1/settings" -H "apikey: <ANON_KEY>" | jq .disable_signup
# esperado: true

# 2) Tentativa de cadastro deve falhar
curl -s -X POST "https://<proj>.supabase.co/auth/v1/signup" \
  -H "apikey: <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"teste-contencao@example.com","password":"Teste!12345"}'
# esperado: erro "Signups not allowed for this instance"

# 3) Contas seguem sendo 1
# execute_sql: select count(*) from auth.users;   -> 1
```

### Resultado (executado em 2026-10-19)

| Verificação | Comando | Saída obtida |
|---|---|---|
| Cadastro fechado | `GET /auth/v1/settings` | `disable_signup: true` ✅ |
| Tentativa real de cadastro | `POST /auth/v1/signup` | `422 — {"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}` ✅ |
| Confirmação de e-mail mantida | `GET /auth/v1/settings` | `mailer_autoconfirm: false` ✅ |
| Contas no projeto | `select count(*) from auth.users` | `1` ✅ |
| Advisors consultados | dashboard | 5 avisos registrados (§1.1) ✅ |
| Código alterado | — | nenhum ✅ |

A conta `teste-contencao-bloco0@example.com` **não** foi criada — a requisição foi rejeitada antes de existir. Rollback não foi necessário.

### Checklist
- [x] `disable_signup = true` provado por HTTP
- [x] tentativa de signup rejeitada provada por HTTP
- [x] confirmação de e-mail continua ligada
- [x] Advisors de segurança consultados e anotados
- [x] nenhuma alteração de código feita

### Rollback
Reativar "Allow new users to sign up" no dashboard. **Não fazer** sem decidir junto do Bloco 3.

### Proibido neste bloco
- Não mexer em policies (é o Bloco 3).
- Não alterar `db.js` (é o Bloco 5).

---

# BLOCO 0.5 — Hardening de Auth: senha vazada

**Tipo:** ação humana (dono). **Esforço:** 2 min. **Achado:** N4.
**Objetivo:** ligar a checagem de senhas comprometidas (HaveIBeenPwned) — o Advisor `auth_leaked_password_protection` está disparando.

### Tarefas

- [ ] **T0.5.1 — Ligar a proteção**
  Dashboard → **Authentication** → seção de senha (**Settings** / **Policies** / **Password security**, depende da versão) → ligar **"Leaked password protection"**.
- [ ] **T0.5.2 — Anotar o mínimo de senha** vigente (comprimento/força) para o registro do bloco.

### Validação (prova)

- O aviso `auth_leaked_password_protection` **deixa de aparecer** em Advisors → Security (prova principal).
- Prova opcional: com o cadastro fechado, testar senha vazada exige uma conta existente ou um **projeto de teste**. Se fizer no projeto de teste, use algo como `Password123!` e confirme a rejeição.

### Checklist
- [ ] "Leaked password protection" ligada
- [ ] aviso N4 sumiu de Advisors → Security
- [ ] mínimo de senha anotado
- [ ] nenhuma alteração de código

### Rollback
Desligar o toggle. Sem impacto no app público ou no admin.

### Proibido neste bloco
- Não mexer em policies nem em código. É só configuração de Auth.

---

# BLOCO 1 — Gravar a auditoria + suíte adversarial

**Objetivo:** transformar a auditoria de 2026-10-19 em artefato versionado e em **teste executável**, para que qualquer regressão de RLS apareça sozinha.
**Achados:** C1, C2, B6.

**Arquivos:**
- Criar: `docs/seguranca/auditoria-rls-2026-10-19.md`
- Criar: `scripts/check-draft-leak.mjs`
- Criar: `scripts/check-anon-probe.mjs` (opcional, se `check-draft-leak.mjs` crescer)
- Criar: `supabase/tests/01_anon_policy.sql`

### Tarefas

- [ ] **T1.1 — Documentar a auditoria**
  Gravar `docs/seguranca/auditoria-rls-2026-10-19.md` com: método, a tabela da seção 1 deste plano, a tabela de testes anon, a saída de `/auth/v1/settings` e a data/hora. Registrar como **linha de base** ("estado antes dos blocos 3–7").

- [ ] **T1.2 — Script de vazamento de rascunho**
  Criar `scripts/check-draft-leak.mjs` (Node ≥ 20, `fetch` nativo, zero dependências):
  - Lê a `anon key` de `db.js` (regex no arquivo) — **não** duplicar a chave no script.
  - Descobre as tabelas via `GET /rest/v1/` ou lista fixa das 14.
  - Para cada tabela: pede `?select=id,publish_status&limit=1` com `Prefer: count=exact` e verifica que **nenhuma** linha retornada tem `publish_status = 'draft'`.
  - Também pede `?publish_status=eq.draft` e exige `content-range: */0`.
  - Sai com código `1` e mensagem clara na primeira violação.

- [ ] **T1.3 — Teste SQL da política anon**
  Criar `supabase/tests/01_anon_policy.sql` que, para cada tabela de conteúdo, verifica via `pg_policies` que existe exatamente **1 policy com `roles = {anon}` e `cmd = SELECT`** e que o `qual` contém `publish_status`.

- [ ] **T1.4 — Rodar e registrar**

### Validação (prova)

```bash
node scripts/check-draft-leak.mjs
# esperado: "OK — 14/14 tabelas sem rascunho exposto para anon" (exit 0)
```

```sql
-- execute_sql (leitura)
select tablename, count(*) filter (where roles::text like '%anon%') as pol_anon
from pg_policies where schemaname='public' group by tablename order by tablename;
-- esperado: 1 em cada uma das 14 tabelas de conteúdo; 0 em admin_settings
```

### Checklist
- [ ] `docs/seguranca/auditoria-rls-2026-10-19.md` criado com números medidos
- [ ] `node scripts/check-draft-leak.mjs` → exit 0
- [ ] script **falha de propósito** quando testado contra uma policy alterada em projeto de teste (prova de que o teste detecta regressão)
- [ ] nenhum arquivo de produção tocado

### Rollback
Remover os arquivos criados (são aditivos; não afetam runtime).

### Proibido neste bloco
- Não corrigir nada "já que estou aqui". Este bloco só **mede**.

---

# BLOCO 2 — Baseline versionado do schema e das policies

**Objetivo:** ter no repositório o estado exato do RLS antes de mudá-lo, com caminho de volta.
**Por que agora:** `list_migrations` = 0. As 73 policies foram criadas à mão. Sem baseline, o Bloco 3 é irreversível.
**Achados:** B6.

**Arquivos:**
- Criar: `supabase/migrations/0001_baseline_schema.sql`
- Criar: `supabase/migrations/0001_baseline_policies.sql`
- Criar: `supabase/README.md`

### Tarefas

- [ ] **T2.1 — Extrair o schema atual (somente leitura)**
  Via MCP `execute_sql`, gerar:
  - `CREATE TABLE` de cada uma das 15 tabelas (colunas, tipos, defaults, PK, FKs) — usar `information_schema` / `pg_catalog`.
  - Listas de `extension`s (`list_extensions`).
  - Índices e sequences.
- [ ] **T2.2 — Extrair as 73 policies**
  Gerar `drop policy if exists ... ; create policy ...` em `0001_baseline_policies.sql`, a partir de `pg_policies` (a mesma consulta da seção 1). Incluir `alter table ... enable row level security;` para cada tabela.
- [ ] **T2.3 — Cabeçalho de aviso**
  Cada arquivo começa com:
  ```sql
  -- ATENCAO: FOTOGRAFIA do banco em 2026-10-19. Estas policies JA EXISTEM em producao.
  -- NAO executar em producao. Serve como referencia e como rollback.
  ```
- [ ] **T2.4 — `supabase/README.md`**
  Explicar: como o schema foi descoberto, que a baseline **já está aplicada**, que **toda DDL futura** entra por `apply_migration`, e como fazer rollback usando este arquivo.

### Validação (prova)

```bash
# contagem de policies no arquivo == contagem no banco (73)
grep -c "create policy" supabase/migrations/0001_baseline_policies.sql
# esperado: 73
```
```sql
-- execute_sql
select count(*) from pg_policies where schemaname='public';   -- esperado: 73
select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';  -- esperado: 15
```
Prova forte (recomendada): aplicar a baseline em um **projeto Supabase de teste** e comparar `pg_policies` com produção.

### Checklist
- [ ] 15 tabelas presentes no arquivo de schema
- [ ] 73 policies presentes no arquivo de policies
- [ ] cabeçalho de aviso em ambos
- [ ] `supabase/README.md` escrito
- [ ] nenhuma DDL executada em produção

### Rollback
Nenhum efeito em produção (arquivos aditivos).

### Riscos
| Risco | Mitigação |
|---|---|
| Alguém rodar a baseline em produção | cabeçalho de aviso + README; as policies usam `drop if exists` + `create` (idempotente, mas não é para rodar) |
| Baseline incompleta (faltar índice/sequence) | validar por contagem + projeto de teste |

---

# BLOCO 3 — Gate de admin no RLS (correção real do C2)

**Objetivo:** parar de tratar "autenticado" como "admin". Toda escrita, toda leitura de rascunho **e todo acesso a arquivo** passa a exigir papel de admin, **verificado no banco**.
**Achados:** C2, N1, N3. **Este é o bloco de maior impacto do plano.**
**Decisão necessária:** confirmar o **Caminho A** (fechar agora com gate mínimo; catracas por área no Bloco 6).
**Status: ✅ APLICADO EM PRODUÇÃO em 2026-10-19** — parte de tabela concluída; a parte de Storage virou o Bloco 3b.

**Arquivos:**
- Criar: `supabase/migrations/0002_is_admin.sql`
- Criar: `supabase/migrations/0003_gate_admin_policies.sql`
- Criar: `supabase/migrations/0003b_storage_objects.sql`
- Criar: `supabase/migrations/0003_rollback.sql` (reversão das policies de tabela, a partir da baseline)
- Criar: `supabase/migrations/0003b_rollback.sql`
- Criar: `supabase/tests/02_admin_gate.sql`

> **Numeração:** os arquivos são numerados na ordem real de execução. Se o Bloco 6 rodar depois, suas migrations passam a ser `0004_profiles.sql` e `0005_rls_papeis.sql` — confira antes de aplicar.

### ✅ Executado em 2026-10-19 — o que foi feito de verdade

Este bloco saiu da forma **descrita abaixo** em dois pontos. Registrado aqui para o
plano não mentir sobre o código.

**Divergência 1 — `is_admin()` por tabela, não por JWT.**
O plano previa ler `auth.jwt() -> 'app_metadata' ->> 'role'`. Foi implementado com
a tabela `public.app_admins` + `public.is_admin()` (`security definer`,
`set search_path = public`). Motivo: a verdade fica no banco, e promover um admin
não depende de reescrever `raw_app_meta_data` de `auth.users` nem de esperar o
token renovar. Mesmo efeito, menos partes móveis. O seed da conta do dono está
dentro da própria `0002`, com uma trava `raise exception` que aborta a migration
se o admin não for encontrado — a ordem T3.2-antes-de-T3.3 virou garantia
estrutural, não disciplina.

**Divergência 2 — a leitura também foi fechada.**
O plano dizia "não tocar" nas policies de leitura. O dono autorizou fechar, então
as 14 policies de SELECT de conteúdo passaram a
`using (publish_status = 'published' OR public.is_admin())` — e **não**
`using (public.is_admin())` puro, de propósito: a forma com `OR` mantém o
publicado legível por um autenticado (evita o site público vazio no Bloco 6, já
que a policy `anon` é `to anon` e `authenticated` não é membro de `anon`) e fecha
só o rascunho. As 3 policies de `admin_settings` também passaram a exigir
`is_admin()`, mantendo as travas de `scope = 'global'`.

**Arquivos reais (nomes diferentes dos previstos):**

| Previsto no plano | O que existe de fato |
|---|---|
| `0002_is_admin.sql` + `0003_gate_admin_policies.sql` | `migrations/0002_admin_gate.sql` |
| (sem previsão no plano) | `migrations/0003_hardening_leitura.sql` |
| `0003_rollback.sql` | `migrations/0001_baseline_policies.sql` (já é a baseline completa, 73 policies) |
| `tests/02_admin_gate.sql` | `tests/02_admin_gate.sql` + `tests/03_hardening_leitura.sql` |
| `0003b_storage_objects.sql` / `0003b_rollback.sql` | **não feitos** — são o Bloco 3b |

**Migrations aplicadas** em `supabase_migrations.schema_migrations`, que estava
**vazia**: `20261019205209` = `0002_admin_gate` e `20261019205211` =
`0003_hardening_leitura`. Esta é a primeira DDL rastreável do projeto.

**Como foi validado** (nada foi clicado no dashboard): cada arquivo foi buscado
**literal** do disco via HTTP local, executado dentro de `begin … rollback` contra
produção para medir o estado **combinado** (é ele que vale), e só depois aplicado
por `apply_migration`. Depois de aplicar: `tests/03_hardening_leitura.sql` rodado
contra produção → 15/15 `ok`; `node scripts/check-draft-leak.mjs` com a anon key
real → exit 0 (15/15).

**Medido depois de aplicar:**

| Medição | anon | autenticado não-admin | admin |
|---|---|---|---|
| vê publicados | 59 | 59 | 59 |
| vê rascunhos | 0 | **0** (era 1) | 1 |
| vê `admin_settings` | n/a | 0 | 1 |
| escreve | — | bloqueado (`42501`) | ok |

73 policies = 59 exigindo `is_admin()` + 14 `anon` intactas. Zero policy de
`authenticated` com `using (true)`.

**Verificação humana obrigatória:** login no painel, listagem e edição de
registro confirmados pelo dono em 2026-10-19.

**Commits** (branch `codex/fase2`, sem push): `8b053d4` (auditoria + suíte),
`640c0b0` (baseline), `f49d477` (`0002`), `9ae6e1b` (`0003`).

**Pendências que saíram deste bloco:**
- gate no **Storage** (`storage.objects` dos 3 buckets) → Bloco 3b;
- advertências `rls_policy_always_true` (42): conferir no **dashboard** se
  sumiram — o MCP não tem `get_advisors`;
- rollback exercitado em projeto de teste: **não foi**, porque não existe projeto
  de teste. O rollback é aplicar `0001_baseline_policies.sql` e devolver o
  `grant execute on function public.rls_auto_enable() to public, anon, authenticated;`.

### Ordem obrigatória (não inverter)

```
T3.1 preparar a função is_admin()
T3.2 promover a conta admin ATUAL      <-- antes de fechar qualquer policy
T3.3 substituir as policies
T3.4 testar
```

> Se a T3.3 rodar antes da T3.2, o dono **perde o acesso ao painel**. Este é o erro mais provável do bloco.

### Tarefas

> As descrições abaixo são o **plano original**. Onde ele divergiu do que foi
> feito, vale o **registro de execução acima**. T3.5 é o Bloco 3b (pendente).

- [ ] **T3.1 — Função `is_admin()`**
  `supabase/migrations/0002_is_admin.sql`:
  ```sql
  create or replace function public.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select coalesce(
      (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor'),
      false
    );
  $$;
  revoke all on function public.is_admin() from public;
  grant execute on function public.is_admin() to authenticated, anon;
  ```
  **Regra dura:** `security definer` **com** `set search_path` (sem isso a função é vetor de escalada).
- [ ] **T3.2 — Promover a conta admin atual**
  `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb where email = '<e-mail do dono>';`
  Conferir com `select email, raw_app_meta_data from auth.users;`.
  Enquanto o Bloco 6 não chegar, este é o **único** admin. Não criar mais contas.
- [ ] **T3.3 — Substituir as policies `authenticated`**
  Para as **14 tabelas de conteúdo**, trocar as 4 policies antigas (`qual = true`) por versões com `is_admin()`:
  - `select` de rascunho/painel: `qual = public.is_admin()`
  - `insert` / `update` / `delete`: `qual/with_check = public.is_admin()`
  **Não tocar** na policy `anon` (`publish_status = 'published'`) de nenhuma tabela.
  **Não tocar** nas 3 policies de `admin_settings` (já têm trava própria) — registrar como pendência se ficarem inconsistentes.
  O `anon` continua exatamente como está: é isso que mantém o app público funcionando.

  **Executado assim:** as 42 de escrita viraram `is_admin()` puro (como previsto);
  as 14 de leitura viraram `publish_status = 'published' OR public.is_admin()`
  (com a autorização do dono — o plano original não previa mexer na leitura); as
  3 de `admin_settings` também passaram a exigir `is_admin()`. A policy `anon` não
  foi tocada, como previsto.
- [ ] **T3.4 — Rollback escrito antes do teste**
  `0003_rollback.sql` recria as policies antigas (copiadas do Bloco 2).
- [ ] **T3.5 — Gate no Storage (`storage.objects`)**
  `0003b_storage_objects.sql`: trocar as policies de `authenticated` nos 3 buckets (`SELECT`/`INSERT`/`UPDATE`/`DELETE`, hoje com `qual = bucket_id = '...'`) por versões com `public.is_admin()`.
  **Atenção 1:** `storage.objects` pertence à Supabase — **não** habilitar/desabilitar RLS nela, só substituir policies.
  **Atenção 2:** objetos com URL pública continuam legíveis por URL independentemente de policy (isso é o Bloco 3c/3b). Este passo fecha **listagem e escrita**.
  **Atenção 3:** confirmar que o admin **não** depende de listar bucket no upload (o fluxo atual envia direto pelo caminho).
- [ ] **T3.6 — Revogar o `EXECUTE` da função do N3**
  ```sql
  revoke execute on function public.rls_auto_enable() from anon, authenticated;
  ```
  Não afeta o event trigger (função de trigger dispara por privilégio do dono, não por `EXECUTE`). Conferir que a auto-habilitação de RLS continua funcionando criando uma tabela descartável em `public` e verificando `relrowsecurity = true`.

### Validação (prova)

```sql
-- 1) Policies antigas nao existem mais
select tablename, policyname, qual from pg_policies
where schemaname='public' and roles::text like '%authenticated%' and qual = 'true';
-- esperado: 0 linhas

-- 2) A policy anon continua intacta
select tablename, qual from pg_policies
where schemaname='public' and roles::text like '%anon%';
-- esperado: 14 linhas, todas com publish_status = 'published'

-- 3) Anon continua lendo publicado
select tablename, count(*) from pg_policies ...   -- (usar scripts/check-draft-leak.mjs)

-- 4) Simulacao de papel (matriz obrigatoria)
set local role authenticated;
set local request.jwt.claims = '{"app_metadata":{"role":"funcionario"}}';
select count(*) from avisos;      -- esperado: 0 (negado) ou erro
reset role;
```

**Matriz obrigatória de testes (todas as linhas precisam passar):**

| Persona | `avisos` (SELECT) | `avisos` (INSERT) | `arquivos` draft (SELECT) | `admin_settings` (SELECT) |
|---|---|---|---|---|
| `anon` | só `published` | negado | `[]` | `[]` |
| `authenticated` sem `role` | **negado** | **negado** | **negado** | negado |
| `authenticated` com `role='admin'` | tudo | permitido | tudo | permitido |
| `authenticated` com `role='editor'` | tudo | permitido | tudo | permitido |

E a prova de ponta a ponta:

```bash
node scripts/check-draft-leak.mjs        # exit 0 (anon nao ve rascunho)
```
```bash
# anon tentando escrever deve falhar
curl -s -X POST "https://<proj>.supabase.co/rest/v1/avisos" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" -d '{"titulo":"probe"}'
# esperado: 401/403 (permission denied)
```
**Verificação humana obrigatória:** abrir o painel admin com a conta real e confirmar login, listagem, criação e edição de um registro.

### Checklist
- [x] `is_admin()` criada com `security definer` + `set search_path`
- [x] conta do dono promovida **antes** das policies (virou trava estrutural na `0002`)
- [x] 0 policies `authenticated` com `qual = true` nas 14 tabelas
- [x] 14 policies `anon` intactas
- [x] matriz de personas × testes executada e registrada (versão em `tests/02` e `tests/03`)
- [x] `check-draft-leak.mjs` exit 0
- [x] login real no painel confirmado pelo dono **+ listagem e edição**
- [x] `EXECUTE` de `public.rls_auto_enable()` revogado de `anon`/`authenticated`
- [x] auto-habilitação de RLS em tabela nova continua funcionando
- [ ] Advisors: conferir **no dashboard** se `rls_policy_always_true` (42) e
      `anon/authenticated_security_definer_function_executable` sumiram
- [ ] rollback (`0001_baseline_policies.sql`) exercitado em **projeto de teste** — não existe projeto de teste ainda
- [ ] policies de `storage.objects` dos 3 buckets exigem `is_admin()` → **Bloco 3b**
- [ ] admin real consegue subir e apagar arquivo com o novo gate → **Bloco 3b**

### Rollback
Aplicar `0003_rollback.sql` (recria as policies da baseline). O `is_admin()` pode ficar (é inofensivo sem policy usando).
**Teste o rollback em projeto de teste antes de declarar o bloco concluído.**

### Proibido neste bloco
- Não criar tabela de perfis/papéis (é o Bloco 6).
- Não alterar `db.js`, `admin.js` nem `script.js` (é o Bloco 5).
- Não tocar nas policies `anon`.

> **Nota de ordem:** o Bloco **3c executa antes** do Bloco **3b** (3c não tem decisão de design e não mexe em código). A letra não é a ordem.

---

# BLOCO 3c — Storage: fechar listagem, órfão e arquivo de rascunho

**Tipo:** 🤖 + 🤝 (uma decisão destrutiva). **Esforço:** 4h. **Depende de:** B3. **Achados:** N2, N5.
**Objetivo:** reduzir a superfície imediata **sem mudar o modelo** — o bucket continua público neste bloco. Fecha-se a **listagem** e resolve-se o que já está exposto.

**Status: ✅ CONCLUÍDO em 2026-10-19** (com duas correções ao plano, abaixo).

**Correção 1 — a premissa de T3c.1/T3c.2 estava errada.** `anon` já **não tinha
policy nenhuma** em `storage.objects` (as 12 eram todas `{authenticated}`), então
a listagem **já estava fechada**. E `db.js` não usa `.list()` em lugar nenhum —
só `getPublicUrl`, `upload` e `remove`. Portanto "remover as policies de SELECT
ampla" era desnecessário e seria pior: tiraria do admin a capacidade de
inspecionar o bucket. A `0004` manteve as policies de SELECT, só com `is_admin()`.

**Correção 2 — não dá para apagar objeto por SQL.** Existe o trigger
`storage.protect_delete` ("Use the Storage API instead"). E a Storage API faz um
`SELECT` antes de apagar, para devolver os metadados. Então a exclusão exigiu
duas policies temporárias para `anon`, escopadas nesses dois nomes exatos
(SELECT + DELETE), chamada da API, e derrubada das duas no mesmo minuto.
Verificado depois: **0 policies `tmp_*`**.

**O que foi feito (com autorização explícita do dono):**

| Item | Ação |
|---|---|
| `arquivos.id=45` — rascunho "teste", PDF | **linha + objeto apagados** |
| órfão `arquivos/1774649141324-…pdf` (1,4 MB) | **apagado** |
| backup antes | os 2 PDFs em `Desktop\SisAgri-backup-storage\`; o órfão confere byte a byte com os 1.460.078 do metadata |

Depois: as duas URLs públicas passaram a responder **400**; `arquivos-smader`
caiu de 59 para 57 objetos; `tests/04_storage_rascunho_publico.sql` retorna
**0 linhas**; `check-draft-leak.mjs` continua exit 0; anexo publicado e imagem de
manual continuam **200**.

**T3c.4 — exposição histórica:** o objeto do rascunho esteve publicamente
acessível de 2026-03-27 até 2026-10-19. Isso não se desfaz; fica registrado aqui
e em `docs/seguranca/`.

**Aviso de Advisor `public_bucket_allows_listing` (se aparecer):** ele fala do
bucket ser público, não de policy — continua válido até o Bloco 3b.

### Tarefas

- [ ] **T3c.1 — Confirmar que ninguém lista bucket**
  `grep -n "\.list(\|object/list" db.js admin.js script.js` → se houver listagem, parar e reportar (a policy de `SELECT` seria necessária e o plano muda).
- [ ] **T3c.2 — Remover a policy de `SELECT` ampla**
  Para os 3 buckets: `drop policy if exists <bucket>_select_auth on storage.objects;`
  Bucket público **não precisa** dessa policy para servir objeto por URL — ela só permite **listar**.
- [ ] **T3c.3 — Decisão do dono sobre o já exposto (destrutiva)**
  Duas coisas precisam de decisão explícita, nada será feito sem autorização:
  1. **Arquivo do rascunho** `arquivos.id=45` → `arquivos/1774662485424-29012026171821_614-Remessa.pdf`.
  2. **Objeto órfão** em `arquivos-smader` (1 objeto que nenhum registro referencia).
  Opções por item: (a) mover para bucket privado no Bloco 3b; (b) apagar; (c) aceitar o risco.
- [ ] **T3c.4 — Registrar a exposição conhecida**
  Em `docs/seguranca/`, documentar que a URL do item 1 **já esteve publicamente acessível** e que isso **não tem como ser desfeito** — o registro fica como histórico.

### Validação (prova)

```bash
# listagem deve estar bloqueada para anon
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://<proj>.supabase.co/storage/v1/object/list/arquivos-smader" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" -d '{"prefix":"","limit":10}'
# esperado: 400/403 (ou lista vazia) — NÃO uma lista de arquivos
```
- Advisor `public_bucket_allows_listing`: **3 avisos devem sumir**.
- App público continua baixando os anexos dos registros publicados (verificação manual em 3 registros).
- Admin continua subindo e apagando arquivo.
- Esperado que `GET /storage/v1/object/public/...` **continue** retornando `200` — isso só muda no Bloco 3b.

### Checklist
- [x] nenhuma dependência de listagem encontrada (`db.js` usa só `getPublicUrl`/`upload`/`remove`)
- [x] policies de `SELECT` **mantidas, com gate `is_admin()`** — não removidas (decisão registrada acima)
- [x] listagem bloqueada: `anon` não tem policy em `storage.objects` (0 objetos visíveis, provado por `set local role`)
- [ ] avisos `public_bucket_allows_listing` — só somem no Bloco 3b (bucket segue público)
- [x] app público baixando anexo normalmente (anexo e imagem de manual → 200)
- [x] upload/delete do admin funcionando — **confirmado pelo dono em 2026-10-19**
- [x] decisão sobre rascunho e órfão registrada e executada (ambos apagados, com backup)
- [x] exposição documentada aqui e em `docs/seguranca/`

### Rollback
Recriar as 3 policies de `SELECT` (copiadas da baseline do Bloco 2). Nada de destrutivo acontece sem autorização, então o rollback é sempre seguro.

---

# BLOCO 3b — Storage: modelo de acesso (buckets privados + URL assinada)

**Tipo:** 🤝 design + 🤖. **Esforço:** 2–3 dias. **Depende de:** B4 (mexe em `script.js`). **Achados:** N5.
**Objetivo:** fazer o acesso a arquivo depender de **autorização**, e não de "conhecer a URL".

**Status: 🟡 PARCIAL.** A **parte 1** foi aplicada em 2026-10-19:
`migrations/0004_storage_gate.sql` fecha **quem** lista, sobrescreve e apaga — as
12 policies de `storage.objects` passaram a exigir `public.is_admin()`.

Medido: não-admin vê **0** objetos (era 133), DELETE devolve **0 linhas**; admin
vê **133** e apaga normalmente; `anon` nunca teve policy. Nada mudou para o site
público (URL direta não passa por policy) — anexo publicado e imagem de manual
seguem **200**. O dono confirmou **upload e exclusão** no painel em 2026-10-19.

**O que falta (parte 2, o mecanismo):** os 3 buckets continuam `public = true`.
URL pública **não consulta policy**, então todo upload novo em rascunho nasce
público. É exatamente o que as tarefas T3b.2–T3b.5 abaixo resolvem, e o motivo de
`tests/04_storage_rascunho_publico.sql` existir.

**Nota de viabilidade descoberta agora:** `arquivos` tem `storage_path` +
`storage_bucket` e `funcionarios` tem `foto_storage_path` + `foto_storage_bucket`
— ou seja, dá para escrever policy em `storage.objects` que consulta
`publish_status` por join. Isso torna a opção 1 melhor do que parecia: dá para
manter bucket privado **e** permitir que o `anon` assine URL apenas do que está
publicado. `manuais` é a exceção: não tem coluna de vínculo (as imagens são
embutidas no HTML de `passos`), então essa tabela precisa de convenção de caminho
ou de decisão explícita.

### Decisão de design (obrigatória antes do código)

| Opção | O que é | Custo | Resolve? |
|---|---|---|---|
| **1 — Buckets privados + *signed URL*** | `arquivos-smader` (e `funcionarios-fotos-smader`) passam a `public = false`. O app pede URL assinada de curta duração, só para registros publicados. | Muda `script.js` (hoje linka URL pública), o admin (preview) e o modelo de dados de `arquivos.url` / `funcionarios.foto` | ✅ arquivo de rascunho deixa de ser acessível |
| **2 — Bucket público com caminho opaco** | Trocar o path para UUID sem nome original | Baixo (não muda código) | ❌ não impede acesso por URL conhecida; só dificulta adivinhar |

**Recomendação:** opção **1**. A opção **2** não resolve o achado N5 — a URL do rascunho já existe e continuaria funcionando.

### Tarefas (assumindo opção 1)

- [ ] **T3b.1 — Design doc** em `docs/superpowers/specs/` cobrindo: como o app público obtém a URL assinada, tempo de expiração, cache, comportamento offline e o que acontece com `arquivos.url` (campo hoje persistido com URL pública).
- [ ] **T3b.2 — Tornar o bucket privado** (`arquivos-smader` primeiro; `funcionarios-fotos-smader` depois).
- [ ] **T3b.3 — Emissão de URL assinada** — Edge Function (só para `published`) ou `create_signed_url` no cliente com policy restrita. Avaliar com o dono qual caminho.
- [ ] **T3b.4 — Adaptar o frontend** — `script.js` (download/exibição) e admin (preview de anexo/foto).
- [ ] **T3b.5 — Migrar os dados** — `arquivos.url` / `funcionarios.foto` deixam de guardar URL pública; ler de `storage_path` e assinar em runtime (mantendo fallback para os valores antigos durante a transição).

### Validação (prova)

```bash
# URL pública deve parar de funcionar para o bucket privado
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://<proj>.supabase.co/storage/v1/object/public/arquivos-smader/arquivos/<arquivo>.pdf"
# esperado: 400/404 (não 200)
```
- Link assinado gerado funciona, e **expira** depois do tempo definido.
- App público abre anexo de registro **publicado** normalmente.
- Rascunho: **nenhum** caminho devolve URL sem papel de admin (prova pelo app e por API).
- `functions` habilitado no MCP se a opção for Edge Function (mesmo fluxo de `/mcps` do Bloco 10).

### Checklist
- [ ] design aprovado antes do código
- [ ] bucket privado: URL pública deixa de responder `200`
- [ ] URL assinada funciona e expira
- [ ] anexo publicado continua acessível no app público
- [ ] rascunho sem acesso por nenhum caminho
- [ ] dados migrados (`storage_path` como fonte) com fallback para os valores antigos

### Rollback
Voltar `public = true` no bucket (reverte o acesso por URL). O código tem que tolerar os dois modos durante a transição.

### Proibido neste bloco
- Não apagar objetos sem autorização explícita.
- Não quebrar o download dos registros publicados (é o que o cidadão usa).

---

# BLOCO 4 — Rede de segurança do código

**Objetivo:** criar a rede que permite mexer em `db.js` / `script.js` / `admin.js` sem fé.
**Achados:** A5.
**Pré-requisito dos blocos 5, 7, 8, 9, 10, 11, 13.**

**Arquivos:**
- Criar: `package.json` (`private: true`)
- Criar: `eslint.config.js`
- Criar: `tests/helpers/load-script.mjs`
- Criar: `tests/unit/*.test.mjs`
- Criar: `tests/e2e/*.spec.mjs`
- Criar: `.github/workflows/ci.yml`
- Criar/modificar: `.gitignore` (adicionar `node_modules/` se faltar)

### Tarefas

- [ ] **T4.1 — `package.json` e servidor local**
  Scripts: `lint`, `test`, `test:e2e`, `serve`, `check` (`node --check` nos 4 arquivos JS + lint + test).
  `npm run serve` → app em `http://localhost:5173` com boot funcionando.
- [ ] **T4.2 — ESLint (flat config)**
  Ambiente browser, `sourceType: 'script'`, `no-undef: error`, `no-redeclare: error`, `no-unused-vars: warn`.
  Medir e **registrar a linha de base** (esperado: zero erro de sintaxe, avisos de variáveis não usadas). Não corrigir código nesta tarefa.
- [ ] **T4.3 — Harness para scripts clássicos**
  `tests/helpers/load-script.mjs` carrega `db.js`/`script.js` em `node:vm` com `window`, `document`, `localStorage` e `supabase` falsos.
  Primeiros testes: `_normalizePublishStatus` (default = rascunho), `_normalizeSupabaseRow` (compat `setor`/`lotacao`), `DB.get` (cópia profunda), `escapeHtml` (não-string, `<`, `"`, `&`, `'`).
- [ ] **T4.4 — Playwright (6 fluxos)**
  boot do público; navegação entre 3 páginas; busca global; login admin; criar/editar registro; rascunho invisível no público.
- [ ] **T4.5 — CI**
  `.github/workflows/ci.yml`: `npm ci` → `lint` → `test` → `test:e2e`.

### Validação (prova)

```bash
npm run check     # esperado: node --check OK nos 4 arquivos + lint sem erros + testes verdes
npm test          # esperado: >= 10 testes, 0 falhas
npm run test:e2e  # esperado: 6 fluxos verdes
```
```bash
git status --short   # esperado: so arquivos do bloco
```
CI: workflow verde no push da branch (verificar na aba Actions).

### Checklist
- [x] `npm run serve` sobe o app e o boot funciona
- [x] `npm test` ≥ 10 testes verdes
- [~] `npm run test:e2e` **4 fluxos verdes + 2 pulados** (não 6 — ver registro)
- [x] linha de base do lint registrada
- [ ] CI verde — **não rodou**: branch sem remoto
- [x] nenhuma linha de `db.js`/`script.js`/`admin.js` alterada (só reportagem de lint)

### Rollback
Remover os arquivos de ferramenta. Nada disso entra no app em produção (não é referenciado pelos HTMLs).

### Registro de execução (2026-10-19)

**Commits:** `239a271` (eslint + harness + 21 testes) e `c00c64d` (playwright + CI).

**Medido, nesta máquina:**

```
npm run syntax   -> exit 0
npm run lint     -> exit 0    (0 erros, 124 avisos no-unused-vars)
npm test         -> exit 0    (29 testes, 29 passando)
npm run check    -> exit 0
npm run test:e2e -> exit 0    (5 passed, 2 skipped, 16s)
git diff --stat <antes do bloco>..HEAD -- db.js script.js admin.js dados.js
                 -> vazio (nenhuma linha do app mudou)
```

**Arquivos criados:** `package.json`, `package-lock.json`, `eslint.config.js`,
`scripts/serve.mjs`, `playwright.config.mjs`, `tests/helpers/load-script.mjs`,
`tests/unit/db.test.mjs`, `tests/unit/script.test.mjs`,
`tests/e2e/publico.spec.mjs`, `tests/e2e/admin.spec.mjs`,
`.github/workflows/ci.yml`, `docs/qualidade/linha-de-base-lint.md`.
`.gitignore` ganhou `test-results/` e `playwright-report/`.

#### Desvio 1 — o plano esperava "default = rascunho"; o código publicava (CORRIGIDO)

`_normalizePublishStatus` devolvia `'published'` para qualquer valor que não
fosse exatamente `'draft'`. Ou seja: **fail-open**.

Corrigido em seguida, em 2026-10-19, com autorização do dono — ver
**BLOCO 4.1** abaixo. Não ficou "pendente".

#### Desvio 2 — `escapeHtml` não escapa aspas e lança com não-string

Só trata `&`, `<`, `>`. Os usos atuais são todos em conteúdo de texto, onde
aspas não quebram nada. O risco só aparece se alguém usar a função dentro de
atributo. Fica para o Bloco 7 (XSS).

#### Desvio 3 — 4 fluxos e2e, não 6

Os dois fluxos de painel (login e listagem) existem e estão escritos, mas
**pulam** sem `SISAGRI_ADMIN_EMAIL` / `SISAGRI_ADMIN_PASSWORD`. E os fluxos de
**escrita** (criar/editar/apagar) foram deliberadamente **não** implementados:
`db.js` aponta para o Supabase real, então um teste de escrita criaria dado de
produção. Eles só entram junto com o projeto Supabase de teste — mesma
dependência do Bloco 3b parte 2.

#### Desvio 4 — CI escrito, ainda não validado

O workflow está no repositório, mas a branch `codex/fase2` não tem remoto. O
primeiro `git push` é que prova o verde na aba Actions.

---

# BLOCO 4.1 — publish_status fail-closed

**Origem:** achado do Bloco 4 (Desvio 1). Autorizado pelo dono em 2026-10-19:
"gosto da ideia de que status ausente vira rascunho".

**Objetivo:** só `publish_status = 'published'` explícito publica. Ausente,
nulo, vazio ou valor desconhecido fica em rascunho.

### O que mudou (2 funções, 1 migração)

| Arquivo | Função | Antes | Depois |
|---|---|---|---|
| `db.js` | `_normalizePublishStatus` | `'draft'` mantém; resto publica | só `'published'` publica |
| `script.js` | `isPublished` | `publish_status \|\| 'published'` | `=== 'published'` |
| `db.js` | `_migrarPublishStatusLegado` (nova) | — | marca `'published'` em registro **local** sem status |

A migração roda **só** nos 3 caminhos locais de `_initLocal`: `localStorage`
atual, `localStorage` legado `seagri_db_v1` e `dados.js`. Dado vindo do
Supabase **não** passa por ela.

### Por que a migração era obrigatória

`dados.js` tem **76 registros e nenhum com `publish_status`** — é um snapshot
anterior ao campo. Sem a migração, inverter o default deixaria o fallback local
inteiro em rascunho e o site apareceria **vazio** justamente quando o Supabase
falhasse.

### Prova (TDD: teste falhou antes da correção)

- `db.test.mjs`: 2 testes novos falharam com `actual: 'published', expected: 'draft'`
  antes da correção de `_normalizePublishStatus`.
- `script.test.mjs`: 2 testes novos falharam (`isPublished({})` dava `true`;
  `filterPublished` devolvia 2 em vez de 1) antes da correção de `isPublished`.
- Banco medido: só `published` e `draft`, 0 nulos (59 publicados + 1 rascunho).
- Fallback local com o `dados.js` real: 76/76 `published`, 0 sem status.
- Site público (Chromium): módulo processos mostra **3** cards; o rascunho
  "Compra por Dispensa de Licitação" **não** aparece.
- `npm run check` exit 0 (29/29); `npm run test:e2e` exit 0 (5 passed, 2 skipped).

### Efeito no painel

- Registro novo sem status explícito nasce **rascunho**.
- Edição não perde status (`DB.update` faz merge do registro atual).
- Na prática o admin sempre envia status explícito (`getModalPublishStatus`
  devolve `'draft'` só com o toggle desligado; sem toggle, `'published'`), então
  o fluxo normal do painel não muda.

### Riscos residuais

- `localStorage` de um navegador que já tenha dados locais **sem** o campo: a
  migração cobre. Se algum registro tiver valor estranho (não vazio), ele vira
  rascunho — comportamento desejado.
- `isPublished` agora exige o campo. Qualquer objeto público criado no futuro
  fora de `DB.get` precisa ter `publish_status` explícito.

---

# BLOCO 5 — Autorização no frontend

**Objetivo:** o painel não deve nem tentar abrir para quem não é admin. É **defesa em profundidade** — a garantia real é o Bloco 3.
**Achados:** C2.

**Arquivos:**
- Modificar: `db.js` (`isAdminLoggedIn`, ~linha 938)
- Modificar: `admin.js` (entrada do painel / `mostrarLogin`)

### Tarefas

- [x] **T5.1 — Checar papel, não só sessão**
  `isAdminLoggedIn()` passa a exigir `rpc('is_admin') === true`.
  Sessão sem permissão → `false` **e** `DB.adminLogout()` (não deixar sessão órfã).
- [x] **T5.2 — Mensagem clara**
  Sessão válida sem permissão → tela de login com "Sua conta não tem permissão de acesso ao painel. Fale com o administrador."
- [x] **T5.3 — Teste** (5 casos, `tests/unit/admin-auth.test.mjs`)

### ADAPTAÇÃO NECESSÁRIA (executada)

O plano original dizia `session.user.app_metadata.role in ('admin','editor')`.
Isso **nunca existiu** neste projeto: a autorização real é a tabela
`public.app_admins` + `public.is_admin()`, criadas no Bloco 3.

Decisão: `isAdminLoggedIn()` chama **`rpc('is_admin')`**. Vantagens:

- é a **mesma** função que as 59 policies de RLS usam — front e banco não podem
  divergir;
- não exige DDL nova nem policy de leitura em `app_admins` (que tem RLS ligado e
  **zero** policies, de propósito);
- `is_admin()` é `security definer` e executável por `anon`/`authenticated`
  (medido: `POST /rest/v1/rpc/is_admin` sem sessão devolve `200 false`).

### Validação (prova)

```bash
npm test -- -t "isAdminLoggedIn"
# 5 casos: sem sessão / sem permissão / admin / erro de rpc / erro de sessão
```
- RPC em produção com a anon key e sem sessão: `status=200 corpo=false`.
- `/admin.html` sem sessão (Chromium): tela de login visível, `#admin-app`
  escondido, sem erro de JS.
- Login real com a conta admin: **pendente de teste humano** (não há credenciais
  no ambiente de execução).

### Checklist
- [x] sessão sem permissão não entra no painel
- [x] sessão órfã é encerrada
- [x] conta admin continua entrando (mesma assinatura, mesma chamada)
- [x] `AGENTS.md` §6 respeitado (contrato de `DB.*` preservado; só o corpo de
      `isAdminLoggedIn`, mesma assinatura; `motivoUltimoAcesso` é campo novo)
- [x] fluxo público intocado

### Registro de execução (2026-10-19)

**Mudanças:**

| Arquivo | O que mudou |
|---|---|
| `db.js` | `isAdminLoggedIn` consulta `rpc('is_admin')`; expõe `motivoUltimoAcesso` (`sem_sessao` / `sem_permissao` / `erro` / `ok`) |
| `admin.js` | `fazerLogin()` só entra depois de confirmar permissão; login mostra a mensagem de recusa |
| `admin.js` | na carga da página, mostra a mensagem quando havia sessão sem permissão |

**Distinção importante:** erro de rede no `rpc` **não** derruba a sessão (não é
prova de falta de permissão); `is_admin = false` derruba.

**TDD:** 5 testes escritos antes; 3 falharam de início (qualquer sessão entrava,
`rpc` nem era chamado). Depois da correção: 34/34.

### Rollback
`git checkout -- db.js admin.js`.

### Proibido
- Não renomear `isAdminLoggedIn` nem mudar sua assinatura (é chamada pelo `admin.html`).
- Não mexer em policies (Bloco 3 já fez).

---

# BLOCO 6 — RBAC por papel e por área

**Objetivo:** público vê o público; funcionário vê o interno; editor edita a sua área; admin faz tudo — com garantia no banco.
**Achados:** C2, M6.
**Começa com design, não com código.** Requer decisão de negócio do dono.

### T6.0 — Design (obrigatório antes de qualquer SQL)

#### Decisão do dono — 2026-10-19 (papéis)

| Papel | Pode | Não pode |
|---|---|---|
| `admin` | tudo: criar, editar, excluir, publicar | — |
| `servidor` | criar e editar | **excluir** |
| público (sem login) | ver tudo que estiver **publicado** | ver rascunho |

- O público continua sendo o app atual, sem login. Bloqueio por página é
  possibilidade **futura**, fora deste bloco.
- `servidor` **pode** publicar (criar/editar inclui o `publish_status`), mas não
  excluir — a decisão não distingue rascunho de publicado.
- Consequência técnica: `is_admin()` (booleano) deixa de bastar. As policies de
  escrita precisam saber **qual operação** está sendo feita: `DELETE` exige
  `admin`, `INSERT`/`UPDATE` aceitam `servidor` ou `admin`.
- Consequência de segurança: um `servidor` pode escrever conteúdo que o público
  vê. É exatamente por isso que o Bloco 9 (escape na saída) vem antes do 6.

- [ ] **T6.0.1 — Matriz de classificação das 14 coleções**
  Para cada coleção: **pública** / **interna** / **restrita**. Nenhuma coleção pode ficar sem classificação.
- [ ] **T6.0.2 — Matriz papel × coleção × ação**
  Papéis: `anon`, `funcionario`, `editor(<área>)`, `admin`. Ações: SELECT / INSERT / UPDATE / DELETE.
- [ ] **T6.0.3 — Campos sensíveis**
  Existe CPF, telefone, e-mail ou dado pessoal que precise de mascaramento por papel? (`funcionarios` é o suspeito nº 1.)
- [ ] **T6.0.4 — Aprovação explícita do dono** (sem isso, nada de SQL)

**Validação do T6.0:** as duas matrizes escritas em `docs/superpowers/specs/2026-XX-XX-rbac-design.md` e aprovadas. Nenhuma linha de SQL antes disso.

### Tarefas de implementação (só depois do design aprovado)

- [ ] **T6.1 — `profiles` + papéis**
  `supabase/migrations/0004_profiles.sql`: tabela `profiles(id, role, nome, ativo)`, trigger em `auth.users insert` criando `role='funcionario'` por padrão, `role` espelhado em `app_metadata`.
  **Regra:** usuário novo nasce **sem** privilégio; promoção exige SQL explícito.
- [ ] **T6.2 — Políticas finais por papel e área**
  `supabase/migrations/0005_rls_papeis.sql` + função `auth_role()` / `has_area()` `security definer`.
  A "área" de cada editor vem de `profiles.areas text[]`.
- [ ] **T6.3 — Carregamento escopado**
  `db.js` (`_initSupabase`, `_loadSupabaseCollection`, `DB.get`): não baixar coleção que o papel não pode ler; `DB.get` de coleção proibida → `[]`; expor `DB.can(acao, colecao)`.
- [ ] **T6.4 — Guardas de UI**
  `admin.js` (`initNav`, `renderSection`, `novo*`, `salvar*`) consultam `DB.can`. Menu esconde o que não pode; ação proibida não aparece.
- [ ] **T6.5 — Suíte de acesso**
  `tests/security/access-matrix.spec.mjs`: 4 personas × 14 coleções × 4 ações. Roda na CI.

### Validação (prova)

- `tests/security/access-matrix.spec.mjs` verde (nenhuma célula fora da matriz aprovada)
- sessão anônima **não faz request** das tabelas internas (verificar no Network do navegador)
- tentativa de ação proibida via console do DevTools → **negada pelo banco** (prova de que a UI não é a garantia)
- `funcionarios`: campos sensíveis mascarados para as personas que a matriz define

### Checklist
- [ ] matriz aprovada e versionada
- [ ] nenhuma coleção sem classificação
- [ ] `profiles` criada e usuário novo nasce sem privilégio
- [ ] suíte de acesso verde
- [ ] UI esconde, banco nega (as duas coisas provadas separadamente)
- [ ] `publish_status` preservado em todas as políticas

### Rollback
Migration de reversão por arquivo; manter sempre a baseline (Bloco 2) como último recurso.

---

# BLOCO 7 — Rascunho: defesa em profundidade + M6

**Objetivo:** parar de baixar o que não é público. O RLS já protege (provado); este bloco reduz exposição e fecha o M6.
**Achados:** C1 (rebaixado), M6.

**Arquivos:**
- Modificar: `db.js` (`_loadSupabaseCollection`, `_normalizePublishStatus`/default)
- Modificar: `dados.js` (só se for adicionar o campo — ver T7.3)

### Tarefas

- [ ] **T7.1 — Filtro server-side para o público**
  Em `_loadSupabaseCollection`, quando a sessão **não** for admin, pedir `.eq('publish_status','published')`.
  Manter o filtro no cliente (`filterPublished`) como segunda camada — não remover.
  **Atenção:** o painel admin compartilha o mesmo `db.js`; a condição precisa ser por sessão, e não global, senão o admin deixa de ver rascunhos.
- [ ] **T7.2 — Default seguro de `publish_status`**
  `_normalizePublishStatus` passa a devolver `'draft'` quando o campo estiver ausente/nulo/desconhecido (hoje o default é publicado).
  Conferir também `isPublished` em `script.js`.
  **Prova obrigatória de que nada publicado desaparece:** hoje há **0 registros sem `publish_status`**; após a mudança, a contagem do que o app público exibe deve ser **idêntica**.
- [ ] **T7.3 — `status` vs `publish_status` em `escala_ferias`**
  Documentar e garantir que **todo** filtro de publicação usa `publish_status`. Adicionar teste que falha se alguém usar `status` como critério de publicação.
- [ ] **T7.4 — Teste**

### Validação (prova)

```bash
node scripts/check-draft-leak.mjs    # exit 0
npm test -- -t "filterPublished"     # verde, incluindo campos ausentes -> rascunho
```
Antes/depois, contagem idêntica do conteúdo público:
```bash
# anon, por tabela, antes e depois: os totais precisam ser iguais
# baseline medida em 2026-10-19: acesso_rapido 6, agenda_eventos 1, arquivos 59,
# avisos 1, escala_ferias 5, funcionarios 15, info_juridico 5, info_municipio 4,
# info_orgaos 3, manuais 6, processos 3, servicos 6, sistemas 4, veiculos 3
```
Network do navegador (sessão anônima): a resposta de cada coleção deve ter **apenas** `published`.

### Checklist
- [ ] consultas anônimas pedem `publish_status=eq.published`
- [ ] contagens públicas **idênticas** à baseline (0 regressão de conteúdo)
- [ ] admin **continua** vendo rascunhos
- [ ] campo ausente → rascunho (teste verde)
- [ ] `escala_ferias` usa `publish_status`
- [ ] filtro do cliente preservado

### Rollback
`git checkout -- db.js`.

---

# BLOCO 8 — Escrita confiável

**Objetivo:** nenhuma escrita pode mentir "salvo", colidir ID ou apagar tabela.
**Achados:** A2, A3, A4, M10, M11.

**Arquivos:**
- Modificar: `db.js` (`insert`/`update`/`delete` ~709/743/776, `_nextId` ~702, `replaceCollection` 802-818, `importAll` ~923, `DB.get`, `carregarDados`)
- Criar: `supabase/migrations/0006_ids.sql`
- Criar: `supabase/migrations/0007_replace_collection.sql`

### Tarefas

- [ ] **T8.1 — Estado real da escrita (A2)**
  `await` na chamada Supabase; emitir eventos `db:write-pending` / `db:write-ok` / `db:write-failed`; UI só confirma após resposta; falha mostra erro acionável.
  Manter o fallback local gravando (é feature), mas **marcar** o registro como pendente em vez de dizer "salvo".
- [ ] **T8.2 — Fila de escrita offline**
  Chave `smader_pending_writes_v1` + replay no boot e no evento `online`, sem duplicar.
- [ ] **T8.3 — ID gerado pelo banco (A3)**
  `0006_ids.sql`: `identity`/sequence nas 14 tabelas (nas colunas `id`).
  `db.js`: insert **sem** `id` + `select().single()` para recuperar; remover `Math.max(...ids) + 1`.
  **Risco:** o fallback local precisa continuar gerando IDs coerentes quando offline — manter o caminho local, só trocar a fonte de verdade quando houver banco.
- [ ] **T8.4 — `replaceCollection` transacional (A4)**
  `0007_replace_collection.sql`: RPC `replace_collection(tabela, payload)` numa transação única.
  `db.js:802-818` e `importAll` passam a chamar a RPC. **Nunca** `delete` antes de `insert`.
- [ ] **T8.5 — Conflito entre editores**
  Coluna `updated_at` + trigger; `update` envia o `updated_at` esperado; segundo editor recebe aviso em vez de sobrescrever.
- [ ] **T8.6 — Limpeza M10/M11**
  `_loadSupabaseCollection(colecao, options)`: implementar ou remover o `options` morto (decidir e documentar).
  `DB.get`: evitar o `JSON.parse(JSON.stringify())` duplo; `carregarDados` uma leitura por coleção (15 em vez de 28).

### Validação (prova)

```bash
npm test          # testes novos: escrita com falha de rede, replay sem duplicar, ID do banco, replace com payload invalido
```
```bash
# Prova de nao-destrutividade do replace (projeto de teste)
# 1) contar linhas antes:  select count(*) from arquivos;          -> N
# 2) chamar replace_collection com payload invalido (viola NOT NULL)
# 3) contar depois:        select count(*) from arquivos;          -> N (NAO 0)
```
```bash
# Prova de ID: dois inserts simultaneos -> ids distintos (sem colisao)
```
Manual: desligar a rede, salvar 2 registros, religar → ambos chegam **sem duplicar**; a UI mostrou "pendente" e depois "salvo".

### Checklist
- [ ] UI não confirma antes da resposta do banco
- [ ] falha de rede mostra erro acionável (não `console.error` silencioso)
- [ ] 2 inserts simultâneos sem colisão de ID
- [ ] `replace` com payload inválido **não** esvazia a tabela
- [ ] `importAll` não aplica 14 tabelas sem transação
- [ ] fallback local continua funcionando offline
- [ ] boot faz 15 leituras (não 28)
- [ ] `options` morto resolvido (implementado ou removido) e documentado

### Rollback
Migrations de reversão + `git checkout -- db.js`.

### Proibido
- Não trocar o provedor de persistência (AGENTS.md §6).
- Não remover o fallback local.

---

# BLOCO 9 — Saída segura (XSS, handlers, CSP)

**Objetivo:** dado de usuário nunca vira HTML executável.
**Achados:** A1, M2, M4.

**Arquivos:**
- Criar: `js/core/utils.js` (exposto como `window.SisUtils`)
- Modificar: `script.js`, `admin.js`, `index.html`, `admin.html`

### Tarefas

- [x] **T9.1 — `SisUtils` (mata M2)** — feito em 2026-10-19 (9a)
  `escapeHtml` (com `String()` + aspas) e `escapeAttr`, em `js/core/utils.js`.
  Carregado **antes de `dados.js`/`db.js`** nos dois HTMLs. `script.js`
  (`escapeHtml`, `escapeAttr`) e `admin.js` (`escHtml`) delegam para ele.
  **Não migrado:** `formatDateBR`, `getFeriasStatus`, `normalizeSearchText`,
  `debounce` continuam onde estavam — não têm defeito conhecido; mover seria
  churn sem ganho.
- [ ] **T9.2 — Escapar os pontos de A1**
  `script.js` (`avisoItemHTML`, `renderFuncionarios`, Instagram, etc.) e `admin.js` (renders de tabela): todo dado de usuário passa por `SisUtils.escapeHtml`; atributos por `escapeAttr`.
  Preferir `textContent`/`createElement` onde for simples.
- [x] **T9.3 — Guarda de CI contra `innerHTML` cru** — feito em 2026-10-19 (9a)
  `scripts/check-innerhtml.mjs` + `scripts/innerhtml-baseline.json`, no
  `npm run check`. Inventário medido: `script.js` 55 atribuições / **29 com
  interpolação**; `admin.js` 17 / **11**. Sobe só com `--atualizar` explícito.
- [ ] **T9.4 — Remover handlers inline (M4)**
  42 em `script.js` + 105 em `admin.js` + 18 no HTML → `data-action` + delegação.
  **Estratégia:** um módulo por commit, com teste após cada um. Inventário deve chegar a 0.
- [ ] **T9.5 — CSP**
  Só **depois** do T9.4. `meta` CSP em `index.html` e `admin.html`, começando com `Report-Only` e depois aplicando:
  `default-src 'self'; script-src 'self' <cdn exato>; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co`.

### Validação (prova)

```bash
npm test -- -t "escapeHtml"   # verde: Non-string, <, >, ", ', &
```
E2E: criar registro com `<img src=x onerror=alert(1)>` e com `"` no nome →
- não executa script
- renderiza o texto literal
- não quebra o layout

```bash
node scripts/check-innerhtml.mjs   # exit 0 (nenhum ponto novo fora da allowlist)
```
CSP: app funciona e o console **não** registra violações.

### Checklist
- [ ] zero definição duplicada de `escapeHtml`/`escHtml`
- [ ] teste de XSS armazenado verde no público **e** no admin
- [ ] `check-innerhtml.mjs` verde
- [ ] inventário de handlers inline = 0
- [ ] CSP aplicada sem violação no console
- [ ] Instagram com `<`, `"`, `&` no caption não quebra o grid

### Rollback
`git checkout -- <arquivos>`; CSP volta a Report-Only.

### Registro de execução — parte 9a (2026-10-19)

**Feito:**

| Arquivo | Mudança |
|---|---|
| `js/core/utils.js` (novo) | `SisUtils.escapeHtml` / `escapeAttr`: uma única implementação, escapa `& < > " '` e trata `null`/`0`/`false` |
| `script.js` | `escapeHtml` e `escapeAttr` delegam para `SisUtils` (nomes mantidos: 25 pontos de uso intactos) |
| `admin.js` | `escHtml` delega para `SisUtils` (173 pontos de uso intactos) |
| `index.html`, `admin.html` | `<script src="js/core/utils.js">` antes de `dados.js` |
| `scripts/check-innerhtml.mjs` (novo) | guarda de CI: conta `innerHTML`/`insertAdjacentHTML` com `${...}`, compara com baseline |
| `scripts/innerhtml-baseline.json` (novo) | `script.js: 29`, `admin.js: 11`, `utils.js: 0` |
| `package.json` | `npm run guard` dentro de `npm run check`; `syntax` cobre `utils.js` |

**Provas:**

```
npm run check   -> exit 0 (62 testes)
npm run guard   -> script.js 29 | admin.js 11 | utils.js 0
npm run test:e2e -> 5 passed, 2 skipped
```

TDD: 21 testes novos (`utils.test.mjs` 9, `innerhtml-guard.test.mjs` 12). Os 9
de `SisUtils` falharam antes do arquivo existir; os 2 testes de `script.test.mjs`
que travavam o defeito ("DIVERGENCIA CONHECIDA") foram reescritos para travar a
correção.

**Por que 9a para aqui:** os 40 pontos restantes de `innerHTML` interpolado não
são todos iguais. Alguns campos podem ser **HTML por desenho** — em especial
`manuais.passos`, que carrega `<img>` embutido no texto (Bloco 3b parte 2). Passar
`escapeHtml` em todos quebraria esse conteúdo. Classificar campo a campo é o 9b,
e exige decisão do dono sobre quais campos aceitam HTML.

**9b — proposta de fatiamento:**

1. `script.js` conteúdo de texto simples (título, nome, sigla, categoria, descrição curta): escapar.
2. `script.js` atributos (`href`, `src`, `alt`, `onclick`, `style`): `escapeAttr` ou remoção do handler.
3. `admin.js` tabelas e previews.
4. Campos HTML por desenho (`manuais.passos`): decidir entre sanitizar com
   allowlist ou converter para texto + imagens em campo próprio.
5. T9.4 (handlers inline) continua **depois** do 9b — 176 handlers é refactor de
   vários commits.

---

# BLOCO 10 — Token do Instagram fora do navegador

**Objetivo:** nenhum token de longa duração no `localStorage` nem na query string.
**Achados:** C3.

**Arquivos:**
- Criar: `supabase/functions/instagram/index.ts`
- Modificar: `script.js` (~751-799)

### Tarefas

- [ ] **T10.1 — Rotacionar o token (ação humana, 🤝)**
  Meta for Developers: gerar token novo e **invalidar o antigo**. O token atual já circulou em URL/localStorage — considerar comprometido.
- [ ] **T10.2 — Edge Function como proxy**
  `instagram/index.ts` lê o token de **Supabase Secrets**, com cache de 5 min e CORS restrito ao domínio do app.
- [ ] **T10.3 — Limpar o frontend**
  `script.js`: chamar a função em vez de `graph.instagram.com`; remover `ig_access_token` do `localStorage` e o campo de token da UI; **limpar** a chave antiga de quem já a tem.
- [ ] **T10.4 — Ativar o feature de functions no MCP**
  A URL do MCP hoje é `...&features=database,docs`. Para deploy da function, reconfigurar para incluir `functions` e reautenticar (mesmo fluxo do `/mcps`). Alternativa: deploy pelo CLI/dashboard.

### Validação (prova)

```bash
grep -rn "ig_access_token\|access_token=" script.js admin.js index.html admin.html
# esperado: 0 ocorrencias
```
Feed carrega para **visitante anônimo** (sem login, sem token digitado).
DevTools → Application → Local Storage: **nenhum** token.
Falha da function → o app degrada (não quebra a página).

### Checklist
- [ ] token rotacionado no Meta (antigo invalidado)
- [ ] token só em Supabase Secrets
- [ ] `grep` de token no front = 0
- [ ] feed funciona para anônimo
- [ ] chave antiga limpa do `localStorage` dos navegadores que a tinham

### Rollback
Reverter `script.js`; a function pode ficar.

### Registro de execução (2026-10-19) — parcial, por desenho

**Feito (código):**

| Arquivo | Mudança |
|---|---|
| `supabase/functions/instagram/index.ts` (novo) | proxy com cache de 5 min, CORS configurável, nunca loga a URL nem repassa o corpo de erro do Instagram |
| `script.js` `initInstagram` | **apaga** `ig_access_token` do `localStorage` e chama o proxy |
| `script.js` `fetchInstagramPosts` | chama `/functions/v1/instagram` com `apikey` + `Authorization`; não usa mais `graph.instagram.com` nem query string com token |
| `script.js` `getInstagramWidgetHTML` | removeu o campo de token e o botão "Salvar" que apareciam para o visitante |
| `script.js` `escapeAttr` (novo) | escapa `"` e `'` nos atributos do card (a legenda vem de fora) |

**Medido em Chromium, com `ig_access_token` plantado no `localStorage`:**

```
input de token      : 0
botao salvar token  : 0
grid do feed        : 1
token no localStorage: removido
estado do grid      : "Feed do Instagram indisponível no momento."
erros de JS         : nenhum
```

**TDD:** 7 testes em `tests/unit/instagram.test.mjs`, escritos antes. Falharam:
campo de token presente, token não removido, chamada ao `graph.instagram.com`
com `access_token` na URL, e injeção de atributo pela legenda.
Depois: 41/41.

#### PENDENTE — ações humanas (não dá para fazer daqui)

1. **T10.1 — Rotacionar o token no Meta.** O token atual circulou em URL e no
   `localStorage`: deve ser considerado comprometido. Gerar um novo e invalidar
   o antigo.
2. **T10.2 — Deploy da function.** Sem CLI do Supabase neste ambiente e sem a
   feature `functions` no MCP. Passos em `supabase/README.md`.
3. **T10.4 — Secret `IG_ACCESS_TOKEN`** no projeto.

Até o deploy, `GET /functions/v1/instagram` responde `404 NOT_FOUND` (medido) e
o widget mostra a mensagem de indisponibilidade. **O feed já não funcionava para
visitante anônimo** — só funcionava no navegador que tinha o token no
`localStorage` —, então não há regressão visível para o público; há ganho: o
visitante deixou de ver um campo pedindo token.

---

# BLOCO 11 — Consolidação do admin (motor de listas)

**Objetivo:** transformar 39 funções duplicadas em um motor. Pré-requisito da repaginação (Bloco 12).
**Achados:** M1, M3.

**Arquivos:**
- Criar: `js/admin/list-controller.js`
- Modificar: `admin.js`

### Tarefas

- [ ] **T11.1 — `createListController`**
  `createListController({ colecao, pageSize, filter, render, searchInputId, stateKey })` → `{ setQuery, setPage, getState, render }`.
  Com testes unitários: filtro, página, estado vazio, persistência.
- [ ] **T11.2 — 3 módulos piloto**
  Arquivos, Avisos, Funcionários passam a usar o controlador; funções antigas ficam mortas (não apagar ainda).
- [ ] **T11.3 — Os 10 restantes + apagar duplicatas**
  Remover 13 `filtrar*`, 13 `atualizarBusca*`, 13 `mudarPagina*`.
- [ ] **T11.4 — Registro de módulos**
  `MODULES = { arquivos: { render, form, save, delete, searchId } }` substituindo cadeias de `if`.

### Validação (prova)

```bash
npm test                      # controlador verde
npm run test:e2e              # os 3 modulos piloto com comportamento identico
```
```bash
# admin.js reduz pelo menos 25% de linhas
(Get-Content admin.js).Count
```
Busca e página **persistem** ao trocar de módulo e voltar (M3) — verificação manual no painel.
`grep -c "filtrar" admin.js` → 0 (ou só as que o plano documentar).

### Checklist
- [ ] controlador testado
- [ ] 13 módulos migrados
- [ ] duplicatas removidas
- [ ] `admin.js` −25% de linhas
- [ ] busca/página persistem
- [ ] nenhuma função órfã
- [ ] comportamento idêntico (E2E)

### Rollback
`git checkout -- admin.js` (+ remover arquivo novo).

---

# BLOCO 12 — Repaginação de UX do admin

**Objetivo:** resolver o relato do dono: "não sinto que algo está acontecendo".
**Começa com design, não com código.**

### T12.0 — Design (obrigatório)

- [ ] **T12.0.1 — Brainstorming + spec**
  Cobrir: abertura do modal, estados (`idle → salvando → salvo → erro`), anexos com progresso, selects dependentes, validação por campo, cancelar com alterações pendentes.
- [ ] **T12.0.2 — Protótipo HTML estático** aprovado pelo dono **antes** de tocar em `admin.js`.

### Tarefas de implementação (só depois da aprovação)

- [ ] **T12.1 — Modal com máquina de estados** — não permite duplo envio; progresso visível em < 200 ms; erro mantém o formulário com os dados.
- [ ] **T12.2 — Uploads com progresso e cancelamento** — arquivo de 10 MB mostra progresso real; cancelar libera o formulário; falha permite tentar de novo sem reescolher.
- [ ] **T12.3 — Feedback global de ação** — toda gravação emite estado visível em < 200 ms e resultado explícito (não depender de toast de 3 s).
- [ ] **T12.4 — Selects dependentes pesquisáveis** — sistema → processo → manual, com teclado e busca; trocar o pai limpa os filhos de forma previsível.
- [ ] **T12.5 — Acessibilidade do admin** — foco preso no modal, `Esc` fecha, `aria-live` nos toasts, labels associados, navegação completa por teclado.

### Validação (prova)
- roteiro de teste manual por tarefa, com captura antes/depois
- `npm run test:e2e` cobrindo os novos estados
- checklist de teclado (Tab/Shift+Tab/Esc/Enter) executado no formulário completo

### Checklist
- [ ] protótipo aprovado antes do código
- [ ] duplo envio bloqueado
- [ ] progresso de upload real
- [ ] erro preserva dados
- [ ] feedback em < 200 ms
- [ ] teclado completo

---

# BLOCO 13 — Produto público e higiene

**Objetivo:** SEO, acessibilidade, CSS, CDN e limpeza de repositório. Sem impacto em segurança; pode rodar por último ou em paralelo.

**Achados:** M5, M7, M8, M9, M12, B1–B5.

| Tarefa | Ação | Validação | Esforço |
|---|---|---|---|
| T13.1 | Roteamento por hash (`#/dashboard`…) | F5 mantém a página; botão voltar; 14 `href="#"` migrados | M |
| T13.2 | SEO: `description`, Open Graph, `sitemap.xml`, `robots.txt`, `canonical` | `curl` devolve conteúdo no HTML; Lighthouse SEO ≥ 90 | G |
| T13.3 | Acessibilidade pública | Lighthouse a11y ≥ 90; teclado em sidebar/cards/painéis | M |
| T13.4 | CSS em camadas + tokens | comparação por screenshot das 11 páginas (sem mudança visual não intencional) | G |
| T13.5 | CDN confiável | `supabase-js@2.x.y` fixo + SRI; Phosphor e fontes locais; app renderiza com CDN bloqueado | M |
| T13.6 | Higiene de repositório | `plano-refatoracao-v1.3.md` (mojibake real) regenerado/arquivado; branch fantasma `codex/fase1-...` e `origin/master` órfã **com confirmação do dono**; ADRs; `README.md` de setup | S |

### Checklist do bloco
- [ ] nenhuma mudança visual não intencional (screenshots)
- [ ] Lighthouse SEO ≥ 90 e a11y ≥ 90
- [ ] app funciona com CDN bloqueado
- [ ] `AGENTS.md` atualizado com a nova arquitetura
- [ ] nenhuma branch apagada sem autorização explícita

---

## 8. Rastreabilidade — todo achado tem dono

| Achado | Bloco |
|---|---|
| **C1** rascunho trafega para o visitante | 1, 3 (anon já bloqueado — provado), 7 |
| **C2** qualquer conta autenticada = admin | **0, 3**, 5, 6 |
| **C3** token do Instagram | 10 |
| **A1** XSS armazenado | 9 |
| **A2** escrita local-first silenciosa | 8 |
| **A3** ID gerado no cliente | 8 |
| **A4** `replaceCollection` destrutivo | 8 |
| **A5** sem testes/lint/CI | 4 |
| **M1** duplicação no admin | 11 |
| **M2** helpers duplicados | 9 |
| **M3** busca não persiste no admin | 11 |
| **M4** handlers inline | 9 |
| **M5** sem roteamento | 13 |
| **M6** `publish_status` fail-open | 7 |
| **M7** SEO | 13 |
| **M8** acessibilidade | 9, 12, 13 |
| **M9** CSS monolítico | 13 |
| **M10** `options` morto | 8 |
| **M11** clone duplo no boot | 8 |
| **M12** CDN frágil | 13 |
| **B1–B5** higiene de repositório | 13 |
| **B6** banco não versionado | **2** |
| **N1** 42 policies `always true` (Advisor 0024) | **3** |
| **N2** buckets públicos listáveis (Advisor 0025) | **3c** |
| **N3** `rls_auto_enable()` executável por anon/auth (Advisor 0028/0029) | **3** (T3.6) |
| **N4** senha vazada sem proteção | **0.5** |
| **N5** arquivo de rascunho público por URL | **3b, 3c** |

## 9. Mapa v1 → v2

| v1 | v2 | Observação |
|---|---|---|
| Fase 0 / T0.1 auditoria | **Bloco 1** | já executada |
| Fase 0 / T0.2 baseline | **Bloco 2** | prioridade elevada |
| Fase 0 / T0.3 política interina anon | **removida como tarefa** | **já existe e está provada**; virou teste de regressão no Bloco 1 |
| Fase 0 / T0.4 papel no login | **Bloco 5** | deixou de ser contenção e passou a defesa em profundidade |
| Fase 0 / T0.5 token Instagram | **Bloco 10** | mantido |
| Fase 0 / T0.6 backup | fundido no Bloco 2 | a baseline é o backup estrutural; o `pg_dump` continua recomendado |
| — | **Bloco 0 (novo)** | fechar `disable_signup` — contenção real do C2 |
| — | **Bloco 3 (novo)** | gate `is_admin()` no RLS — correção real do C2 |
| Fase 1 base de qualidade | **Bloco 4** | mesma função, posição reajustada |
| Fase 2 RBAC | **Bloco 6** | mantido; now reduzido ao que sobra após o Bloco 3 |
| Fase 3 escrita | **Bloco 8** | mantido |
| Fase 4 saída segura | **Bloco 9** | mantido |
| Fase 5 consolidação admin | **Bloco 11** | mantido |
| Fase 6 UX do admin | **Bloco 12** | mantido |
| Fase 7 produto público | **Bloco 13** | mantido |
| Fase 8 higiene | **Bloco 13** | fundido |
| — | **Bloco 7 (novo)** | defesa em profundidade do rascunho |
| — | **Bloco 0.5 (novo)** | hardening de Auth (N4) — a v1 não olhou Advisors |
| — | **Bloco 3b (novo)** | Storage: modelo de acesso com URL assinada (N5) |
| — | **Bloco 3c (novo)** | Storage: fechar listagem, órfão e arquivo de rascunho (N2, N5) |
| Fase 0 / T0.1 (Advisors) | **Bloco 0 / 0.5 / 3 / 3c** | o Advisor revelou 4 achados que a v1 não previa |

## 10. Decisões abertas (precisam do dono)

| # | Decisão | Trava | Recomendação |
|---|---|---|---|
| 1 | Executar o **Bloco 0** agora? | blocos 1–3 | **Sim.** Leva 5 min e é o único risco com exploração trivial hoje |
| 2 | **Caminho A** (fechar `authenticated` com gate mínimo agora; áreas no Bloco 6) ou **B** (modelo completo antes)? | bloque 3 e 6 | **A** |
| 3 | Método de execução: nativo nas Fases 0–4 e subagent da Fase 5 em diante, ou tudo nativo? | todos | nativo até o Bloco 5 |
| 4 | **Matriz de permissões** (T6.0.1/T6.0.2) | Bloco 6 | decisão de negócio |
| 5 | Existe campo sensível a mascarar em `funcionarios`? | Bloco 6 | decisão de negócio |
| 6 | Autorizar a rotação do token do Instagram (T10.1) e o redeploy do feed? | Bloco 10 | sim, o token atual circulou no browser |
| 7 | Autorizar a limpeza das branches fantasma (T13.6)? | Bloco 13 | sim, mas é irreversível no remoto |
| 8 | **Modelo de Storage**: opção 1 (bucket privado + URL assinada) ou opção 2 (path opaco)? | Bloco 3b | **opção 1** — a opção 2 não resolve o N5 |
| 9 | **O que fazer com o arquivo do rascunho `id=45` e com o objeto órfão** (apagar / mover para privado / aceitar)? | Bloco 3c | decisão sua; nada é apagado sem autorização |
| 10 | Autorizar **Edge Function** para emitir URL assinada (exige habilitar `functions` no MCP e reautenticar)? | Bloco 3b | sim, se a opção 1 for escolhida |

## 11. O que este plano não faz

- Não decide a matriz de permissões por você (Bloco 6 precisa da sua decisão).
- Não define o visual da repaginação (Bloco 12 precisa de design aprovado).
- Não faz push para `main` nem para o remoto em nenhum momento.
- Não promete que o app fica 100% seguro com o Bloco 0: o Bloco 0 apenas fecha a porta de entrada. A correção estrutural é o Bloco 3.
- Não resolve o **histórico**: a URL do arquivo do rascunho `id=45` já circulou como endereço público. Torna-la privada no Bloco 3b impede acesso futuro por um caminho novo, mas não apaga o conhecimento de quem já viu. Isso é registro, não tarefa.

## 12. Regras de ouro para o agente executor

1. **Um bloco, uma validação, um commit.** Nunca dois blocos no mesmo commit.
2. **A ordem 0 → 1 → 2 → 3 é intocável.** Sem baseline (2), não há rollback para o Bloco 3.
3. **No Bloco 3, promover o admin antes de fechar as policy.** Inverter isso derruba o painel.
4. **Nunca** remover a policy `anon` de `publish_status = 'published'`. É ela que mantém o site de pé.
5. **Provar, não supor:** toda afirmação de segurança precisa de saída de comando colada como evidência.
6. **Não "consertar de passagem".** Registre e siga.
7. **Nada em `main`.**
8. **Arquivo não é linha.** Toda regra de acesso a conteúdo vale também para `storage.objects` e para o bucket. Proteger a tabela e deixar o arquivo público é proteger metade.
