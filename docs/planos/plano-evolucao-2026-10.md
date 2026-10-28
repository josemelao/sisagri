# Plano de evolução — performance, operação e offline

**Status:** vigente (2026-10-27)
**Escopo:** três blocos aprovados pelo dono — performance, admin/operação e PWA.
**Regra geral:** cada fase é um patch local, com teste antes da implementação,
`npm run check` + `npm run test:e2e` verdes e deploy só com autorização.

## Contexto

O app está estável (319 testes unitários e 35 e2e verdes, 0 falhas) e o Bloco 13
foi publicado em `main` em 2026-10-27. A medição de carga local, sem compressão,
mostrou desperdício concentrado em poucos pontos:

| Métrica | Valor medido (2026-10-27) |
|---|---|
| Requisições no 1º load | 40 |
| Peso total | 1275 KB |
| Boot até esconder a tela | ~1,66 s |
| JS | 562 KB (supabase 213 + `script.js` 199 + `dados.js` 82 + `db.js` 64) |
| CSS | 242 KB (Phosphor 160 + app 81) |
| Fontes | 249 KB |
| JSON do Supabase | 158 KB |
| Ícones | 121 classes usadas contra ~4.600 disponíveis |

Script de medição reutilizável: `%TEMP%\opencode\mede-carga.mjs` (Playwright,
conta bytes reais por resposta e o tempo até `#boot-screen.is-hidden`).

## Decisões travadas com o dono

1. **Auditoria:** registrar as 14 tabelas de `SUPABASE_TABLES`.
2. **PWA:** somente leitura offline; escrita offline continua bloqueada com
   mensagem clara. A fila de pendências existente em `db.js` não será ativada.
3. **Prévia de rascunho:** fidelidade total via iframe + `postMessage`.

## Bloco 1 — Performance

Meta: peso < 800 KB e boot < 1,2 s, medidos com o mesmo script, sem mudança
visual.

### Fase 1.1 — Subset de ícones

- `scripts/gerar-icones.mjs` varre `index.html`, `admin.html`, `script.js`,
  `admin.js`, `dados.js`, `js/**` e `css/*.css`, extrai as classes `ph-*`,
  lê os codepoints de `vendor/phosphor/bold/style.css` e gera
  `vendor/phosphor/subset/phosphor.css` + `phosphor-bold.woff2`.
- O peso `regular` é eliminado: a única ocorrência (`admin.js`, `ph ph-image`)
  passa a `ph-bold ph-image`.
- `index.html` e `admin.html` passam a referenciar só o subset.
- `preload` do woff2 do subset e do DM Sans.
- Teste-guarda `tests/unit/icones.test.mjs`: toda classe usada existe no
  subset; o CSS do subset fica abaixo do limite; nenhuma página referencia o
  Phosphor completo.

### Fase 1.2 — `dados.js` fora do caminho crítico

- Sai o `<script src="dados.js">` do `index.html`.
- `db.js` carrega o fallback sob demanda em `_initLocal()` e no `catch` do
  Supabase; `_initSupabase` deixa de clonar `DADOS_INICIAIS`.
- Aquecimento em `requestIdleCallback` após o primeiro paint.
- Cuidado: nenhum `_persistLocal()` pode rodar com `_db` vazio antes do load
  remoto.
- Aceite: com a rota do Supabase bloqueada, o app ainda abre com o fallback.

### Fase 1.3 — URLs assinadas sob demanda (opcional)

Assinar fotos/manuais/arquivos quando o módulo abre, não no boot. Só entra se o
boot ainda incomodar após 1.1 e 1.2.

### Fase 1.4 — Higiene

- `package.json` em `2.0.0` (hoje `1.0.0`, contra `v2.0` no rodapé).
- CI: secrets `SISAGRI_ADMIN_EMAIL`/`SISAGRI_ADMIN_PASSWORD` e descomentar o
  `env` em `.github/workflows/ci.yml` (ação do dono).
- Warnings de código morto no `admin.js` ficam para depois: é ruído, não risco.

## Bloco 2 — Admin e operação

### Fase 2.1 — Menu lateral responsivo

- Hambúrguer no `.admin-header` com `aria-expanded`/`aria-controls` e backdrop.
- Abaixo de 900px a `.admin-sidebar` vira off-canvas; desktop intocado.
- Fecha ao escolher seção, no Esc e devolve o foco.
- Aceite: 390px navegável; 1280px sem mudança visual.

### Fase 2.2 — Histórico de alterações

> **Concluída em 2026-10-28.** Aplicada em `supabase-teste` (versão
> `20261028144459`) e em produção (versão `20261028150742`), validada pelo
> dono na tela com login real. Registro completo em
> `docs/planos/plano-rascunho-admin.txt`.

- Migration `supabase/migrations/0016_audit_log.sql` com tabela `audit_log`
  (`tabela`, `registro_id`, `operacao`, `campos text[]`, `usuario_email`,
  `usuario_id`, `em`, `rotulo`).
- Trigger `after insert/update/delete` nas 14 tabelas de `SUPABASE_TABLES`.
- `usuario_email` a partir de `auth.jwt() ->> 'email'`.
- RLS ligada, sem policy para `anon`; `select` apenas para `pode_editar()`.
- **Privacidade:** guardar quais campos mudaram e um rótulo (`nome`/`titulo`),
  nunca o conteúdo de `funcionarios`/`veiculos` — o log não pode virar
  vazamento de CPF, telefone, chassi ou RENAVAM.
- Tela "Histórico" somente leitura no admin, usando o padrão de
  `js/admin/list-controller.js`, com filtro por tabela/usuário/período.
- Retenção sugerida: 12 meses. O histórico começa vazio na data da migration.
- Aplicar primeiro em `supabase-teste`; produção só com autorização.

### Fase 2.3 — Prévia de rascunho

> **Concluída em 2026-10-28**, validada pelo dono no navegador (modal
> "Editar Veículo" → botão Prévia → painel de detalhe). Registro completo em
> `docs/planos/plano-rascunho-admin.txt`.

- Botão **Prévia** no rodapé dos modais v2, entre Cancelar e Salvar, para as 12
  coleções com detalhe público; `escalaFerias` e `acessoRapido` não têm prévia.
  Registro novo (ainda sem `id`) nasce com o botão desabilitado.
- Iframe de `index.html?previa=1` **por cima** do modal (`z-index: 600`),
  mostrando só o painel de detalhe público; o resto da página fica oculto por
  `body.modo-previa`.
- `postMessage` com handshake: o iframe gera um nonce, avisa o pai
  (`sisagri-previa-pronta`) e só então recebe o payload. O público exige
  `origin`, `source === window.parent`, tipo, nonce e coleção na allowlist.
  Falha de render volta como `sisagri-previa-erro` com o mesmo nonce.
- O rascunho viaja no payload e vive **só na memória** do iframe
  (`DB.aplicarPrevia`): nada em URL, `localStorage` ou rede. O registro
  principal é promovido a `published` apenas na cópia; relacionados só entram
  se já estiverem `published`.
- A prévia mostra a **última versão salva** (edição não salva não aparece) e
  mantém os painéis filhos/netos navegáveis.
- Proibido abrir URL pública com rascunho: furaria o filtro `publish_status`.
- Sem fallback para a URL pública quando o iframe falha: timeout de 8 s até o
  handshake + "Tentar novamente".
- Aceite: rascunho visível na prévia e invisível para o anônimo — coberto por
  `tests/e2e/previa-rascunho.spec.mjs` (payload com rascunho e com irmão
  rascunho, que não aparece) e pelos testes unitários do seed.

## Bloco 3 — PWA (somente leitura)

### Fase 3.1 — Manifest

- `manifest.webmanifest` na raiz: `start_url: "./index.html"`, `scope: "./"`,
  `display: standalone`, `theme_color: #2d6a4f`, ícones 192/512 + maskable.
- `<link rel="manifest">` no `index.html`.

### Fase 3.2 — Service worker

- `sw.js` na raiz, cache versionado `sisagri-vN`.
- Shell em *stale-while-revalidate*; GET do Supabase em *network-first* com
  timeout curto e fallback para o último resultado bom; POST/PATCH/DELETE e
  assinatura de URLs sempre na rede.
- Aviso "sem conexão — mostrando dados de HH:MM"; escrita offline bloqueada.
- `updateViaCache: 'none'` e aviso de nova versão; teste unitário amarra
  `CACHE_VERSION` à versão do `package.json`.
- Aceite: Playwright com `context.setOffline(true)` após o primeiro load.

## Sequência

| Sessão | Conteúdo | Commit |
|---|---|---|
| 1 | 1.1 + 1.4 (versão) + re-medição | `perf(icones): subset dos icones usados` |
| 2 | 1.2 (+1.3 se necessário) | `perf(boot): fallback e URLs sob demanda` |
| 3 | 2.1 | `feat(admin): menu lateral responsivo` |
| 4 | 2.2 (migration + tela) | `feat(auditoria): registra alteracoes` |
| 5 | 2.3 | `feat(admin): previa de rascunho` |
| 6–7 | 3.1 e 3.2 | `feat(pwa): manifest` / `feat(pwa): offline` |

## Fora de escopo

Sem bundler/minify, sem modularizar `script.js`/`admin.js`, sem trocar
arquitetura, sem renomear chaves, sem alterar contratos de `DB.*`, sem expor
rascunho e sem refactor de passagem.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Ícone novo ficar fora do subset e sumir | Teste-guarda falha com instrução de rodar o gerador |
| `_db` vazio sobrescrever o cache local | Verificar todo `_persistLocal()` antes do load remoto |
| Migration de auditoria em produção | Aplicar em `supabase-teste` primeiro |
| Log de auditoria vazar PII | Nunca gravar valores; só nomes de campos + rótulo |
| PWA servir versão velha | `updateViaCache: 'none'`, cache versionado e aviso de atualização |

## Ações do dono

1. Criar os secrets do CI.
2. PENDENTE 11: limpeza dos 10 registros de teste e
   `node scripts/gerar-dados-fallback.mjs`.
3. Confirmar a retenção do log de auditoria (sugestão: 12 meses).
