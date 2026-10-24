# `supabase/` — esquema, políticas e testes do banco

Este diretório guarda a parte do projeto que **não** roda no navegador: o esquema
do Postgres, as políticas de RLS e os testes adversariais.

Projeto Supabase: `yiujxempodimegdoexqo` (SisAgri / SMADER).

---

## Estado atual — leia isto primeiro

| Fato | Valor |
|---|---|
| Migrations aplicadas em produção | **13** (`0002` a `0014`) |
| Migrations criadas e ainda **não aplicadas** em produção | **0** |
| `supabase_migrations.schema_migrations` | **13** linhas, uma por migration (`0002` a `0014`) |
| `0001_*` | snapshots do ponto de partida, **não aplicados** |
| DDL em produção antes disso | feita **à mão**, pelo dashboard |
| Achado C2 | **fechado** em 2026-10-19 (tabelas **e** Storage) |

O projeto não usava migrations versionadas. O Bloco 3 é a primeira DDL
rastreável: `0002` (escrita em tabela), `0003` (leitura em tabela) e `0004`
(Storage) foram aplicadas em produção pelo próprio MCP e ficaram registradas na
tabela de histórico — que estava vazia.

Os `0001_*` continuam sendo **snapshots por introspecção** do catálogo do
Postgres em **2026-10-19**, e não foram executados contra produção.

---

## Arquivos

| Arquivo | O que é | Seguro rodar em produção? |
|---|---|---|
| `migrations/0001_baseline_schema.sql` | 15 tabelas, 30 constraints, extensões, flags de RLS | **Não sem autorização** |
| `migrations/0001_baseline_policies.sql` | 73 policies em `public` + 12 em `storage.objects` | **Não sem autorização** |
| `migrations/0002_admin_gate.sql` | Bloco 3: `is_admin()` + 42 policies de escrita fechadas + fix N1 | **Aplicado em 2026-10-19** |
| `migrations/0003_hardening_leitura.sql` | Bloco 3 (parte 2): 14 SELECT de conteúdo + 3 de `admin_settings` fechadas | **Aplicado em 2026-10-19** |
| `migrations/0004_storage_gate.sql` | Bloco 3b (parte 1): 12 policies de `storage.objects` com `is_admin()` | **Aplicado em 2026-10-19** |
| `migrations/0005_rbac_papel.sql` | Bloco 6: `app_admins.role`, `pode_editar()`, `meu_papel()` | **Aplicado em 2026-10-20** |
| `migrations/0006_rls_papeis.sql` | Bloco 6: 42 policies de conteúdo + 9 de Storage por operação | **Aplicado em 2026-10-20** |
| `migrations/0007_fn_grants.sql` | Bloco 6: revoga EXECUTE de `anon` nas funções de papel | **Aplicado em 2026-10-20** |
| `migrations/0008_storage_policies_assinatura.sql` | Bloco 3b2: 2 SELECT de Storage para objeto publicado | **Aplicada em produção em 2026-10-20** |
| `migrations/0009_storage_buckets_privados.sql` | Bloco 3b2: `public=false` em arquivos/funcionários | **Aplicada em produção em 2026-10-20** |
| `migrations/0010_manuais_imagens_policy.sql` | Bloco 3c/13: `SELECT` de Storage para imagem de manual publicado | **Aplicada em produção em 2026-10-20** |
| `migrations/0011_manuais_imagens_bucket_privado.sql` | Bloco 3c/13: `public=false` em `manuais-imagens-smader` | **Aplicada em produção em 2026-10-20** |
| `migrations/0012_sync_identity_sequences.sql` | Bloco 8 (T8.3): sincroniza as sequences de identity das 14 tabelas de conteúdo | **Aplicada em produção** |
| `migrations/0013_replace_collection.sql` | Bloco 8 (T8.4): RPC `replace_collection` (transação única, allowlist de tabelas, `security invoker`) | **Aplicada em produção** |
| `migrations/0014_updated_at.sql` | Bloco 8 (T8.5): `updated_at` + trigger nas 14 tabelas de conteúdo | **Aplicada em produção** |
| `tests/00a_seed_auth.sql` | contas de teste do T6.5 (rodar antes da `0002`) | Só projeto de teste |
| `tests/00b_seed_dados.sql` | papel servidor, buckets e seed do T6.5 (rodar após a `0007`) | Só projeto de teste |
| `tests/01_anon_policy.sql` | 4 consultas de verificação de política anon | Sim — **só leitura** |
| `tests/02_admin_gate.sql` | 7 consultas de verificação do Bloco 3 | Sim — **só leitura** |
| `tests/03_hardening_leitura.sql` | 15 medições do estado final (por papel) | Sim — **transação revertida** |
| `tests/04_storage_rascunho_publico.sql` | objetos públicos que não deveriam existir (N5) | Sim — **só leitura** |
| `tests/05_rbac.sql` | 10 verificações do Bloco 6 (papel e policies) | Sim — **só leitura** |
| `tests/06_matriz_rbac.sql` | T6.5: 4 personas × 14 coleções × 4 ações | Só projeto de teste (transação revertida) |
| `functions/instagram/index.ts` | Bloco 10: proxy do feed; token só em Secrets | **Deploy pendente** |

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

O Bloco 3 substituiu, nas 14 tabelas de conteúdo, as policies de escrita de
`authenticated` — que eram `using (true)` — por um gate `is_admin()`.

Se algo der errado, o caminho de volta é este arquivo. Ele é reaplicável
(`drop policy if exists` antes de cada `create policy`) e devolve as 73 policies
ao estado de 2026-10-19, incluindo as 15 de leitura.

**A policy `anon` de leitura NUNCA é alterada por nenhum bloco.** É ela —
`using (publish_status = 'published'::text)` — que impede o rascunho de vazar.
Ela é o mecanismo que faz o sistema funcionar corretamente hoje.

---

## Bloco 3 — o gate `is_admin()`

Duas migrations, aplicadas em sequência:

### `0002_admin_gate.sql` — escrita

Fecha o achado C2: as **42 policies de escrita** (14 tabelas × INSERT/UPDATE/
DELETE) deixam de ser `using (true)` e passam a exigir `public.is_admin()`.
Também cria a tabela `app_admins`, semeia a conta do dono e revoga o EXECUTE de
`rls_auto_enable()` (N1).

### `0003_hardening_leitura.sql` — leitura

Fecha as **14 policies de SELECT de conteúdo** e as **3 de `admin_settings`**.

Decisão de desenho que vale registrar: as de conteúdo usam
`using (publish_status = 'published' OR public.is_admin())`, e **não**
`using (public.is_admin())`. A forma com `OR` foi escolhida porque:

1. é a **mudança menor** — o que muda é só o rascunho, que vira exclusivo do
   admin; o publicado continua legível por um autenticado, igual ao anon;
2. evita uma **armadilha futura**: com só `is_admin()`, um usuário autenticado
   que não fosse admin (Bloco 6) veria o site público **vazio**, porque a policy
   `anon` é `to anon` e `authenticated` não é membro de `anon`;
3. o efeito de segurança é o mesmo: nenhum rascunho exposto a não-admin.

`admin_settings` não tem `publish_status` — é tabela interna, então as 3 policies
passam a exigir `is_admin()`, mantendo as travas de `scope = 'global'`.

### Estado depois das duas (medido em produção)

| Medição | anon | autenticado não-admin | admin |
|---|---|---|---|
| Vê publicados | 59 | 59 | 59 |
| Vê rascunhos | 0 | **0** (era 1) | 1 |
| Vê `admin_settings` | n/a | 0 | 1 |
| Escreve | não | **bloqueado** (`42501`) | ok |

Policies: **73** no total = 59 exigindo `is_admin()` + 14 `anon` intactas.
Zero policy de `authenticated` com `using (true)`.

### O que o Bloco 3 (tabelas) NÃO fechava — e como ficou

| Furo | Situação |
|---|---|
| Objeto do rascunho `id=45` servido por URL pública | **resolvido em 2026-10-19** — rascunho e objeto apagados (backup local antes) |
| Objeto órfão em `arquivos-smader` (1,4 MB) | **resolvido** — apagado, com backup local |
| Qualquer autenticado lista/sobrescreve/apaga arquivo | **resolvido pela `0004`** |
| Buckets `public = true` (3) | **em aberto** — mecanismo real, é o Bloco 3b parte 2 |

O banco está fechado e o Storage está fechado para escrita. O que resta é o
**mecanismo**: bucket público não consulta policy, então um upload novo em
rascunho nasce público. Fechar isso exige bucket privado + URL assinada.

### Aplicar e reverter

Aplicadas via MCP (`apply_migration`), cada uma em sua própria transação, com o
estado combinado validado antes em transação revertida.

Rollback: aplicar `migrations/0001_baseline_policies.sql` devolve as 42 policies
de escrita liberadas; para devolver também as 15 de leitura, ele já é o arquivo
completo (73 policies). A ACL de `rls_auto_enable()` volta com
`grant execute on function public.rls_auto_enable() to public, anon, authenticated;`.
As 12 de `storage.objects` também voltam ao formato antigo por esse arquivo.

---

## `0004_storage_gate.sql` — Storage, parte 1

Fecha quem pode **listar, sobrescrever e apagar** arquivos. As 12 policies de
`storage.objects` eram `to authenticated` só com `bucket_id = '...'` — ou seja,
qualquer conta autenticada mandava nos 3 buckets. Agora exigem `is_admin()`.

Medido, em transação revertida e depois de aplicar:

| Persona | Objetos visíveis | DELETE |
|---|---|---|
| `anon` | 0 | negado |
| não-admin | 0 (era 133) | **0 linhas** |
| admin | 133 | 57 (revertido) |

Detalhe técnico que custou uma rodada: **não dá para apagar objeto por SQL**. Há
o trigger `storage.protect_delete`, que exige a Storage API. A API, por sua vez,
faz um `SELECT` antes de apagar (para devolver os metadados) — então apagar exige
policy de leitura **e** de escrita. Foi assim que o objeto do `id=45` e o órfão
saíram: policy temporária para esses dois nomes exatos, chamada da API, policy
derrubada. Nada permanente ficou.

**O que a `0004` não fecha:** o bucket continua `public = true`. URL pública não
consulta policy, então qualquer objeto segue alcançável por
`/storage/v1/object/public/...`. Limpeza de registro não resolve o mecanismo —
por isso `tests/04_storage_rascunho_publico.sql` existe e precisa continuar
retornando 0 linhas.

---

## `0005` + `0006` — Bloco 6: papel `servidor`

Design aprovado: `docs/superpowers/specs/2026-10-19-rbac-design.md`.

| Papel | SELECT | INSERT/UPDATE | DELETE | Storage subir/trocar | Storage DELETE |
|---|---|---|---|---|---|
| `anon` | published | não | não | não (URL pública) | não |
| `servidor` | published + rascunho | sim | **não** | sim | **não** |
| `admin` | tudo | sim | sim | sim | sim |

`0005` adiciona `app_admins.role` (`admin`/`servidor`, **sem default**) e as
funções `pode_editar()` e `meu_papel()`. A conta existente foi migrada para
`admin` antes do `NOT NULL`.

`0006` troca o conteúdo de **42 policies** de conteúdo (INSERT/UPDATE →
`pode_editar()`, SELECT `authenticated` → `published OR pode_editar()`) e de
**9 de Storage**, preservando nomes e contagem (73 em `public`, 12 em
`storage.objects`). DELETE de conteúdo e de Storage continua `is_admin()`.

Provas (`tests/05_rbac.sql`): 14 INSERT + 14 UPDATE com `pode_editar()` e zero
com `is_admin()`; 14 DELETE intactos; 14 SELECT `anon` intactos; 14 SELECT
`authenticated` com `pode_editar()`; `admin_settings` com 3 `is_admin()`.
Simulação de JWT: conta admin → `is_admin=true`, `pode_editar=true`,
`meu_papel='admin'`; UUID sem linha → `false/false/null`.

### Promover ou rebaixar

```sql
insert into public.app_admins (user_id, role)
values ('<uuid-do-usuario>', 'servidor')
on conflict (user_id) do update set role = excluded.role;
```

Conta nova nasce **sem acesso**; promoção é SQL manual (painel é futuro).
`app_admins` tem RLS e zero policies: ninguém lê nem se autopromove pelo browser.

**Pendências:** conta `servidor` para o teste humano; suíte 3 personas × 14 × 4
(T6.5) exige projeto de teste. Campos sensíveis (`cpf`, `telefone`, `email`,
`placa` etc.) continuam expostos a `anon` via `select('*')` — registrado como
pendência, fora do Bloco 6.

---

## `0008` + `0009` — Bloco 3b parte 2: URL assinada

Design: `docs/superpowers/specs/2026-10-20-storage-url-assinada.md`.

O problema: URL pública (`/object/public/...`) não consulta RLS. Todo upload em
rascunho nascia acessível (achado N5). A solução é bucket privado + URL assinada
de 1 h, com policy que só libera o objeto cujo registro está `published`.

| Migration | O que faz | Quando aplicar |
|---|---|---|
| `0008_storage_policies_assinatura.sql` | 2 policies `SELECT` aditivas (`arquivos`, `funcionarios`) | **Aplicada em produção em 2026-10-20** |
| `0009_storage_buckets_privados.sql` | `public=false` nos 2 buckets | **Aplicada em produção em 2026-10-20**, após validar o código |

`createSignedUrl` exige `SELECT` em `storage.objects` **mesmo com o bucket
público**. Por isso a `0008` vem antes: sem ela, o código novo cairia no
fallback legado. A `0008` não muda nada visível (é aditiva). A `0009` é a única
que quebra a URL antiga; o rollback é imediato:

```sql
update storage.buckets set public = true
 where id in ('arquivos-smader', 'funcionarios-fotos-smader');
```

**Estado em 2026-10-20:** `0008` e `0009` aplicadas em produção (versões
`20261020151915` e `20261020152424`). Código deployado em `3cc260e`. Validação
real no site (`https://josemelao.github.io/sisagri/`): 15/15 fotos carregadas,
assinatura de foto e download de arquivo com 200, download `Modelo - Ofício.docx`
sem falha; path sem registro não é assinado. A URL pública antiga pode continuar
respondendo por cache de CDN/browser; com cache-busting retorna 400.
`manuais-imagens-smader` foi fechado no 3c/13 (`0010`/`0011`).

No código, `DB.createSignedUrl(s)` mantém cache **em memória** (1 h, margem de
5 min) e `DB.get` injeta `foto_url`/`url_assinada` na cópia devolvida. A URL
assinada **nunca** vai para `_db`, `localStorage` ou `dados.js`. Uploads novos
gravam `foto=''`/`url=''` e dependem do path; registros legados mantêm os
campos antigos gravados, mas a interface usa `foto_url`/`url_assinada`.

`manuais-imagens-smader` foi fechado no 3c/13 (`0010`/`0011`). A Opção A usa
`manuais.passos[].imagem_storage_path` como vínculo, sem tabela nova; a tabela
`manuais_imagens` segue adiada.

### `0010` + `0011` — Bloco 3c/13: imagens de manuais

Aplicadas em produção em 2026-10-20 (`0010` versão `20261020183947`, `0011`
`20261020184951`). A `0010` é aditiva: o `anon` só assina imagem referenciada
por manual `published`; `servidor`/`admin` mantêm acesso a rascunho. A `0011`
torna o bucket privado. Validação real: 6 manuais, 60/60 imagens via
`/object/sign/`, 0 `/object/public/`, URL pública antiga 400 e assinatura
anônima de imagem de rascunho 400. Rollback da `0011`:

```sql
update storage.buckets set public = true
 where id = 'manuais-imagens-smader';
```

---

## `functions/instagram/` — proxy do Instagram (Bloco 10)

Arquivo: `functions/instagram/index.ts`.

**Por que:** o token de longa duração do Instagram ficava no `localStorage` do
navegador e viajava na query string (`...&access_token=...`). Agora ele fica em
Supabase Secrets e nunca chega ao cliente.

**O frontend manda:** `GET /functions/v1/instagram` com `apikey` +
`Authorization: Bearer <anon key>`.

**A function devolve:** `{ "data": [ ...postagens... ] }` — mesmo formato da API
antiga, para o frontend não traduzir nada.

| Config | Onde | Valor |
|---|---|---|
| `IG_ACCESS_TOKEN` | Supabase Secrets | token de longa duração (obrigatório) |
| `IG_ALLOWED_ORIGINS` | Supabase Secrets | `https://dominio,http://localhost:5173` (opcional; vazio = qualquer origem) |

**Cache:** 5 minutos em memória da instância (`x-cache: hit|miss`).
**Falha:** o widget mostra "Feed do Instagram indisponível no momento." — a
página não quebra.

### Deploy — **ainda não feito**

O MCP deste ambiente está configurado sem a feature `functions` e o CLI do
Supabase não está instalado. Caminho mais curto:

```bash
supabase login
supabase link --project-ref yiujxempodimegdoexqo
supabase secrets set IG_ACCESS_TOKEN=...
supabase functions deploy instagram
```

Alternativa sem CLI: Dashboard → Edge Functions → Deploy new function → colar
`functions/instagram/index.ts` → adicionar o secret `IG_ACCESS_TOKEN`.

O `verify_jwt` padrão (`true`) está correto: o frontend envia a anon key.

Enquanto não for deployada, `GET /functions/v1/instagram` responde
`404 {"code":"NOT_FOUND"}` — medido em 2026-10-19.

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

### Verificar o Storage (seguro, só leitura)

Rode `tests/04_storage_rascunho_publico.sql` pelo MCP. Esperado: **0 linhas** na
segunda consulta. Qualquer linha é um arquivo público pertencente a registro não
publicado (ou sem registro). Ele **não** cobre `manuais`: cada passo guarda
`imagem_storage_path`/`imagem_storage_bucket` em campo próprio (auditoria
2026-10-19: 60/60 passos com imagem), mas a consulta ainda não faz esse join.

### Reconstruir um projeto de teste

Em um projeto Supabase **de teste** (nunca o de produção), na ordem:

1. `tests/00a_seed_auth.sql` — 3 contas em `auth.users` (a do admin usa o UUID
   de produção, porque a `0002` semeia `app_admins` a partir dele)
2. `migrations/0001_baseline_schema.sql`
3. `migrations/0001_baseline_policies.sql`
4. `migrations/0002_admin_gate.sql`
5. `migrations/0003_hardening_leitura.sql`
6. `migrations/0004_storage_gate.sql`
7. `migrations/0005_rbac_papel.sql`
8. `migrations/0006_rls_papeis.sql`
9. `migrations/0007_fn_grants.sql`
10. `migrations/0008_storage_policies_assinatura.sql` — policies da URL assinada
11. `tests/00b_seed_dados.sql` — papel `servidor`, os 3 buckets e 1 published
    + 1 draft em cada uma das 14 coleções
12. `migrations/0009_storage_buckets_privados.sql` — **depois** da `00b`, que
    cria os buckets; deixa `arquivos` e `funcionarios` privados
13. `migrations/0010_manuais_imagens_policy.sql` — policy de imagem de manual
    publicado
14. `migrations/0011_manuais_imagens_bucket_privado.sql` — deixa o bucket de
    manuais privado; no teste atual foi aplicada em 2026-10-20
15. `migrations/0012_sync_identity_sequences.sql` — sincroniza as sequences
    com o maior id de cada tabela (rodar **depois** do seed)
16. `migrations/0013_replace_collection.sql` — RPC de importação em transação única
17. `migrations/0014_updated_at.sql` — `updated_at` + trigger nas 14 tabelas
18. `tests/06_matriz_rbac.sql` — T6.5 (4 personas × 14 coleções × 4 ações)
19. `tests/07_manuais_imagens_storage.sql` — policy de imagem de manual

**Pré-requisito da `0002`:** ela revoga EXECUTE de `public.rls_auto_enable()`,
que existe em produção mas não em projeto novo. Crie a função com a definição
de produção antes de aplicar a `0002`; caso contrário a migration falha com
`42883` e é revertida por inteiro.

O projeto de teste em uso (2026-10-20) é `zoywmvuswyosehlddmma`. As migrations
`0001`–`0014` foram aplicadas; os **3 buckets** estão privados, e o
teste tem 0 objetos reais. O T6.5 fechou verde: **232 casos, 0 falhas**; o
teste 07 também fechou com **0 falhas** após a `0011`. Produção tem
`0002`–`0014`; código deployado (`c3f1c90`) e validado em 2026-10-20.

Depois disso, para ensaiar os Blocos 3b e 3c (Storage com URL assinada), aponte
`db.js` para o projeto de teste em uma cópia local. O T6.5 em si não precisa de
`db.js`: ele simula os JWT no SQL.

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
