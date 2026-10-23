# SisAgri / SMADER

Portal público e painel administrativo da Secretaria Municipal de Agricultura
(SMADER) de **Cidade Ocidental / GO**.

O app é **frontend vanilla** (HTML + CSS + JavaScript), sem build e sem
framework. A persistência usa **Supabase** quando configurado e mantém
**fallback local** para desenvolvimento e contingência.

## Estrutura

| Caminho | Papel |
|---|---|
| `index.html` | shell da SPA pública (rotas por hash: `#/dashboard`, `#/funcionarios`, ...) |
| `script.js` | navegação, busca, filtros, paginação e renderização pública |
| `style.css` | estilo global do app público |
| `admin.html` | shell do painel administrativo |
| `admin.js` | login, CRUD, status e integração do admin |
| `dados.js` | snapshot de fallback em `window.DADOS_INICIAIS` |
| `db.js` | camada de persistência, Supabase, sessão e URLs assinadas |
| `js/core/utils.js` | `escapeHtml`, `escapeAttr` e utilitários compartilhados |
| `js/admin/list-controller.js` | controle reutilizável das listas do admin |
| `scripts/` | servidor local e guardas de qualidade |
| `tests/unit/` | testes unitários (`node:test`) |
| `tests/e2e/` | testes de navegador (Playwright) |
| `assets/` | imagens e card Open Graph |
| `robots.txt` / `sitemap.xml` | SEO do site público |
| `docs/` | segurança, qualidade, ADRs e planos arquivados |

## Rodar localmente

Requisitos: Node.js 20+ e npm.

```bash
npm install
npm run serve
```

O servidor sobe em `http://localhost:5173`.

Se a porta 5173 estiver ocupada (por exemplo, pelo SOST), use outra porta:

```powershell
# PowerShell
$env:PORT=5180; npm run serve
```

```bash
# bash
PORT=5180 npm run serve
```

O Playwright usa a porta 5173 por padrão (`playwright.config.mjs`).

## Testes e qualidade

```bash
npm run check       # sintaxe + lint + guarda de innerHTML + testes unitários
npm run test:e2e    # Playwright
```

Os testes e2e de login/listagem do admin são pulados sem credenciais. Para
executá-los, defina `SISAGRI_ADMIN_EMAIL` e `SISAGRI_ADMIN_PASSWORD` no ambiente.

O baseline atual de lint é **0 erros** e alguns avisos; ver
`docs/qualidade/linha-de-base-lint.md`.

## Supabase e dados

- O browser usa **apenas a chave pública (anon/publishable)**. Nunca coloque
  `service_role` no frontend.
- `db.js` decide entre Supabase e fallback local. O fallback de `dados.js` pode
  estar desatualizado; em runtime, o Supabase é a fonte prioritária.
- Conteúdo público só aparece com `publish_status = 'published'`. Itens sem
  status são tratados como rascunho.
- Buckets de arquivos e imagens são privados; o app usa URLs assinadas.
- A Edge Function do Instagram e as migrations ficam em `supabase/`.

## Deploy

- **Produção:** branch `main`, publicada pelo GitHub Pages em
  `https://josemelao.github.io/sisagri/`.
- **Homologação:** branch `codex/fase3` (a branch local de trabalho é `codex3`).
- Nada é enviado para `main` sem validação e autorização explícita.
- Em project site, o crawler lê o `robots.txt` da raiz do domínio; o arquivo em
  `/sisagri/robots.txt` não é autoritativo. A proteção efetiva do admin é o
  `noindex` em `admin.html`.

## Documentação

- `AGENTS.md` — regras de trabalho no repositório.
- `plano-rascunho-admin.txt` — handoff operacional vigente.
- `v2_plano_refatoração.md` — plano mestre e registro das etapas.
- `docs/adr/` — decisões de arquitetura.
- `docs/arquivo/` — planos antigos, mantidos apenas para histórico.
- `docs/seguranca/` — auditoria de RLS e decisões de segurança.
- `docs/superpowers/specs/` — especificações de RBAC e Storage.

## Pendências conhecidas

- Fallback de `dados.js` ainda com referências antigas a Luziânia; o Supabase de
  produção já está com Cidade Ocidental.
- Edge Function do Instagram ainda não publicada (widget mostra indisponível).
- Cobertura e2e do admin depende de credenciais reais.
- Acessibilidade pública (T13.3), CDN local (T13.5) e frescor ao entrar no
  módulo (T13.7) concluídas em 2026-10-22; resta T13.4 (CSS em camadas).

O plano detalhado de ações restantes fica, no ambiente local, em
`C:\Users\PICHAU\.opencode\plan\2026-10-22-plano-acoes-restantes.md`.
