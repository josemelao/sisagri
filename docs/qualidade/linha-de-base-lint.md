# Linha de base da qualidade — Bloco 4

**Data:** 2026-10-19
**Branch:** `codex/fase2`
**Objetivo:** ter o número do "hoje" para que qualquer piora seja visível. Este
documento **não** propõe correção nenhuma.

---

## Ferramentas instaladas

| Arquivo | O que faz |
|---|---|
| `package.json` | scripts `serve`, `syntax`, `lint`, `test`, `test:e2e`, `check` |
| `eslint.config.js` | flat config; scripts clássicos no navegador, `sourceType: 'script'` |
| `scripts/serve.mjs` | servidor estático sem dependência, `http://localhost:5173` |
| `tests/helpers/load-script.mjs` | carrega `db.js`/`script.js` em `node:vm` com window/document/localStorage falsos |
| `tests/unit/db.test.mjs` | 18 testes de `db.js` |
| `tests/unit/script.test.mjs` | 11 testes de `script.js` |
| `tests/unit/admin-auth.test.mjs` | 5 testes de `DB.isAdminLoggedIn` |
| `tests/unit/instagram.test.mjs` | 7 testes do widget/proxy do Instagram |
| `playwright.config.mjs` | sobe o servidor e roda o Chromium |
| `tests/e2e/publico.spec.mjs` | 5 fluxos do site, somente leitura |
| `tests/e2e/admin.spec.mjs` | 2 fluxos do painel, somente leitura, com credenciais |
| `.github/workflows/ci.yml` | `check` + `e2e` em toda branch e PR |

O app **não** é compilado. Nada aqui é referenciado pelos HTMLs.

---

## Números medidos

### Sintaxe

```
npm run syntax   ->  exit 0
```

`node --check` nos 4 arquivos: `db.js`, `script.js`, `admin.js`, `dados.js`.

### Lint

```
npm run lint     ->  exit 0
124 problemas: 0 erros, 124 avisos
```

- **0 erro** de `no-undef` e `no-redeclare`.
- **124 avisos** de `no-unused-vars` — funções declaradas e não chamadas (várias
  são handlers de `onclick` no HTML, que o ESLint não enxerga).

Config relevante: `DB` e `dbInit` entram como globais **só** em `script.js` e
`admin.js` (declará-los em `db.js` dispara `no-redeclare`). Se o lint voltar a
acusar `'DB' is not defined`, a config foi quebrada, não o código.

### Testes de unidade

```
npm test         ->  exit 0
41 testes, 41 passando
```

### Check completo

```
npm run check    ->  exit 0   (syntax + lint + test)
```

### E2E (Playwright + Chromium)

```
npm run test:e2e ->  exit 0
5 passed, 2 skipped   (16s)
```

**5 fluxos verdes** no site público, todos somente leitura:

1. boot carrega, `#boot-screen` recebe `is-hidden` e o dashboard fica ativo;
2. clicar no menu troca a página ativa e o item de menu;
3. busca global só abre com 2+ letras (o `input` tem debounce de 300 ms);
4. **conteúdo publicado aparece** (`#processos-list` tem card) — guarda do
   fail-closed: se o filtro ficar restritivo demais, o site abre vazio;
5. **todos os módulos** abrem sem exceção de JavaScript — este é o teste que
   pega regressão de verdade (um `initXxx()` quebrado aparece aqui).

**2 fluxos pulados** porque não há projeto de teste nem credenciais no
ambiente: login no painel e abertura de um módulo do painel. Para rodar:

```bash
SISAGRI_ADMIN_EMAIL=... SISAGRI_ADMIN_PASSWORD=... npm run test:e2e
```

### Por que os e2e não criam nem editam nada

`db.js` tem `USE_SUPABASE: true` apontando para o projeto **real**. Um teste
"criar registro" gravaria dado de produção e poderia publicar algo por acidente.
Enquanto não existir projeto Supabase de teste, os fluxos de escrita ficam
**fora**. Isso está anotado como pendência junto do Bloco 3b parte 2 (que
também precisa do projeto de teste).

### CI

`.github/workflows/ci.yml` roda em toda branch e em PR:

- job `check`: `npm ci` → `npm run check`;
- job `e2e`: `npm ci` → `npx playwright install --with-deps chromium` → `npm run test:e2e`;
- em falha, sobe `playwright-report/` como artefato.

Ainda **não rodou no GitHub** — a branch `codex/fase2` não tem remoto. O
primeiro push é que valida o workflow.

---

## Achados dos testes de characterization

Estes eram comportamentos **reais** que divergiam do que o plano supunha. O
achado 1 foi corrigido em seguida (mesma data, autorização do dono). O achado 2
continua aberto e fica para o Bloco 7.

### 1. Status ausente publicava — CORRIGIDO (fail-closed)

**Antes** (medido em 2026-10-19):

```js
_normalizePublishStatus(undefined) // 'published'
_normalizePublishStatus(null)      // 'published'
_normalizePublishStatus('lixo')    // 'published'
```

Só o valor exato `'draft'` mantinha rascunho. Todo o resto publicava — inclusive
uma linha vinda do Supabase com a coluna ausente ou com valor inesperado.

**Agora:**

```js
_normalizePublishStatus('published') // 'published'
_normalizePublishStatus('draft')     // 'draft'
_normalizePublishStatus(undefined)   // 'draft'
_normalizePublishStatus(null)        // 'draft'
_normalizePublishStatus('lixo')      // 'draft'
```

Duas camadas mudaram, as duas com teste que falhou antes:

| Arquivo | Função | Antes | Depois |
|---|---|---|---|
| `db.js` | `_normalizePublishStatus` | `'draft'` mantém, resto publica | só `'published'` publica |
| `script.js` | `isPublished` | `publish_status \|\| 'published'` | `=== 'published'` |

#### O detalhe que quase virou site vazio

`dados.js` é um snapshot **anterior** ao campo: **76 registros, 0 com
`publish_status`**. Inverter o default sem tratar isso deixaria o fallback local
inteiro em rascunho — o site apareceria vazio justamente quando o Supabase
falhasse.

Por isso `db.js` ganhou `_migrarPublishStatusLegado()`, chamada **só** nos três
caminhos locais (`localStorage` atual, `localStorage` legado `seagri_db_v1` e
`dados.js`): registro sem status vira `'published'` **uma vez**, preservando o
que o usuário já via. Linha vinda do Supabase **não** passa por essa migração.

#### Prova executada

```
fallback local com o dados.js real: 76 registros, 76 published, 0 sem status
site público, módulo processos: 3 cards (os 3 publicados)
rascunho "Compra por Dispensa de Licitação" visível? NÃO
admin: getModalPublishStatus() sempre devolve 'draft' ou 'published' explícito
npm test: 29/29    npm run test:e2e: 5 passed, 2 skipped
```

#### O que isso muda no dia a dia do painel

- Registro **novo** sem status explícito nasce rascunho (era publicado).
- Edição de registro existente **não** perde o status: `DB.update` faz merge.
- O admin sempre envia status explícito (`getModalPublishStatus`), então na
  prática nada muda no fluxo normal.

### 2. `escapeHtml` não escapa aspas e lança com não-string

```js
escapeHtml('"x"')   // '"x"'    <- não escapa
escapeHtml("it's")  // "it's"   <- não escapa
escapeHtml(null)    // TypeError
```

Só escapa `&`, `<` e `>`. Todos os usos observados caem em **conteúdo de texto**
de `innerHTML`, onde aspas são inofensivas. O risco aparece se alguém usar
`escapeHtml` dentro de um atributo (`title="${...}"`, `value="${...}"`).

Não é exploração conhecida hoje. Fica registrado para quando houver teste de XSS
(Bloco 7).

---

## Como reproduzir

```bash
npm install
npm run check
npm run serve     # http://localhost:5173
```

## Regra daqui para frente

`npm run check` precisa continuar **exit 0**. Aviso novo de `no-unused-vars` é
aceitável; **erro** novo não. Se o número de avisos cair, ótimo — atualize este
documento para que a linha de base acompanhe.
