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
| `tests/unit/db.test.mjs` | 12 testes de `db.js` |
| `tests/unit/script.test.mjs` | 9 testes de `script.js` |

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
21 testes, 21 passando
```

### Check completo

```
npm run check    ->  exit 0   (syntax + lint + test)
```

---

## Achados dos testes de characterization

Estes são comportamentos **reais de hoje** que divergem do que o plano supunha.
Ficaram travados em teste, com o nome `DIVERGENCIA CONHECIDA`. **Nenhuma linha de
`db.js` ou `script.js` foi alterada neste bloco** (é proibido pelo T4).

### 1. Status ausente vira `published`, não `draft`

```js
_normalizePublishStatus(undefined) // 'published'
_normalizePublishStatus(null)      // 'published'
_normalizePublishStatus('lixo')    // 'published'
```

O plano v2 dizia "default = rascunho". O código é **fail-open**: só o valor
exato `'draft'` mantém rascunho; todo o resto publica.

Impacto hoje: **nenhum medido** — a auditoria de 2026-10-19 achou 0 registros sem
`publish_status` nas 14 tabelas. Mas é uma direção perigosa para o futuro: uma
linha vinda do Supabase sem a coluna (ou com valor inesperado) aparece no site
público.

Decisão pendente: inverter para fail-closed (`'published'` só quando explicitamente
`'published'`). Isso é mudança de comportamento e precisa de bloco próprio.

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
