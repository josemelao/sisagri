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
| `css/` | estilos do app público em 9 camadas numeradas, carregadas na ordem `01`→`09` |
| `admin.html` | shell do painel administrativo |
| `admin.css` | estilos do painel administrativo (extraído do HTML no T13.4) |
| `admin.js` | login, CRUD, status e integração do admin |
| `dados.js` | snapshot de fallback em `window.DADOS_INICIAIS` |
| `db.js` | camada de persistência, Supabase, sessão e URLs assinadas |
| `js/core/utils.js` | `escapeHtml`, `escapeAttr` e utilitários compartilhados |
| `js/admin/list-controller.js` | controle reutilizável das listas do admin |
| `scripts/` | servidor local e guardas de qualidade |
| `tests/unit/` | testes unitários (`node:test`) |
| `tests/e2e/` | testes de navegador (Playwright) |
| `assets/` | imagens, logo e favicon |
| `robots.txt` | bloqueio de buscadores (o `noindex` das páginas é a garantia real) |
| `docs/` | segurança, qualidade, ADRs e planos arquivados |

As camadas do app público são carregadas nesta ordem, declarada no `index.html`
(não há `@import` entre elas):

1. `css/01-tokens-base.css` — tokens de design, reset e base
2. `css/02-shell.css` — boot, sidebar e conteúdo principal
3. `css/03-header-search.css` — barra de busca
4. `css/04-dashboard.css` — cards principais e grades de lista
5. `css/05-detail.css` — painel de detalhes e lightbox
6. `css/06-widgets.css` — dashboard inferior, calendário, eventos e Instagram
7. `css/07-pages.css` — avisos/agenda, serviços, sistemas e informações
8. `css/08-responsive.css` — responsivo e overlay do menu mobile
9. `css/09-forms-preview.css` — formulários, vínculos e preview de arquivos

Cada camada mantém os `@media` no lugar em que estavam: a ordem de carga é a
mesma do `style.css` original, então a cascata não mudou.

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
npm run icones      # regenera o subset de ícones (após adicionar um ícone novo)
npm run visual:diff -- <refA> <refB>   # compara CSS renderizado entre dois commits
```

`npm run visual:diff` serve para refactor de CSS sem mudança visual: compara
`getComputedStyle` de todos os elementos (inclusive `::before`/`::after`) e o
screenshot pixel a pixel entre duas refs do git. Aceita `--only=fingerprint`,
`--only=shots`, `--escopo=publico|admin`, `--rotas=` e `--viewports=`. As telas
logadas exigem as credenciais do admin no ambiente.

Os testes e2e de login/listagem do admin e o login do index (admin ou
servidor) são pulados sem credenciais. Para executá-los, defina
`SISAGRI_ADMIN_EMAIL` e `SISAGRI_ADMIN_PASSWORD` no ambiente.

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
- As coleções públicas de `dados.js` (funcionários, manuais, processos,
  arquivos e veículos) são geradas da produção:
  `node scripts/gerar-dados-fallback.mjs` (aceita `--dry-run`). O gerador lê a
  chave anon do `db.js`, importa só `published`, exclui os ids de teste e nunca
  grava PII (`cpf`, `matricula`, `chassi`, `renavam`). A escala de férias não
  entra no fallback: é staff-only.
- No index, o visitante anônimo vê a ficha pública (nome, cargo, matrícula e
  dados institucionais). CPF, telefone, e-mail, chassi e RENAVAM exigem login
  de admin/servidor. Relatórios, a escala de férias e o bloco Acesso Rápido do
  dashboard também ficam ocultos para o anônimo. A sessão é a mesma do painel
  admin (`dbInit({ escopo: 'publico' })`).
- A migration `0015_colunas_publicas.sql` revoga o SELECT de tabela do `anon`
  em `funcionarios`/`veiculos`, concede só as colunas públicas e fecha
  `escala_ferias`. Foi aplicada em produção em 2026-10-26, depois do deploy do
  código com `CAMPOS_PUBLICOS` (ordem documentada em `supabase/README.md`).
- A Edge Function do Instagram e as migrations ficam em `supabase/`.

## Deploy

- **Produção:** branch `main`, publicada pelo GitHub Pages em
  `https://josemelao.github.io/sisagri/`.
- **Homologação:** branch `codex/fase3` (a branch local de trabalho é `codex3`).
- Nada é enviado para `main` sem validação e autorização explícita.
- Em project site, o crawler lê o `robots.txt` da raiz do domínio; o arquivo em
  `/sisagri/robots.txt` não é autoritativo. A proteção efetiva do admin é o
  `noindex` em `admin.html`.
- **Site interno desde 2026-10-27:** o `index.html` também leva
  `noindex, nofollow, noarchive, nosnippet, noimageindex`, `robots.txt` responde
  `Disallow: /` e não há mais `sitemap.xml`, `canonical`, Open Graph nem Twitter
  Card. A remoção dos índices existentes depende do recrawl (ou de uma remoção
  manual no Search Console).

## Documentação

- `AGENTS.md` — regras de trabalho no repositório.
- `docs/planos/plano-rascunho-admin.txt` — handoff operacional vigente.
- `docs/planos/v2-plano-refatoracao.md` — plano mestre e registro das etapas.
- `docs/planos/README.md` — índice dos planos e convenções.
- `docs/adr/` — decisões de arquitetura.
- `docs/arquivo/` — planos antigos, mantidos apenas para histórico.
- `docs/seguranca/` — auditoria de RLS e decisões de segurança.
- `docs/superpowers/specs/` — especificações de RBAC e Storage.

## Pendências conhecidas

- Edge Function do Instagram ainda não publicada (widget mostra indisponível).
- Cobertura e2e do admin depende de credenciais reais.
- Bloco 13 concluído em 2026-10-23 (T13.1 a T13.7) e publicado em `main` em
  2026-10-27.
- Registros de teste publicados em produção aguardam limpeza pelo painel.

O plano detalhado de ações restantes fica, no ambiente local, em
`C:\Users\PICHAU\.opencode\plan\2026-10-22-plano-acoes-restantes.md`.
