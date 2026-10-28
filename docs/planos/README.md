# Planos do projeto

Esta pasta guarda os documentos de planejamento **vivos** e o histórico de
planos que continuam úteis para consulta. Planos soltos na raiz não são mais
aceitos.

## Índice

| Arquivo | Papel | Status |
|---|---|---|
| `plano-rascunho-admin.txt` | Handoff operacional entre agentes: estado da fase, pendências, provas e próximo passo | **Vigente** |
| `v2-plano-refatoracao.md` | Plano mestre de refatoração e robustez (blocos 0–13) e registro das etapas | **Vigente** |
| `plano-evolucao-2026-10.md` | Evolução aprovada: performance, admin/operação e PWA offline de leitura | **Vigente** |

## Documentos relacionados

- `../adr/` — decisões de arquitetura (hash routing, `publish_status`, Storage assinado, SEO).
- `../arquivo/` — planos superados, mantidos só para histórico. Índice em `../arquivo/README.md`.
- `../seguranca/` — auditoria de RLS e decisões de segurança.
- `../qualidade/` — linha de base de lint e qualidade.
- `../superpowers/specs/` — designs de RBAC e Storage.

## Convenções

- Nome de arquivo em ASCII, minúsculo, com hífens (`v2-plano-refatoracao.md`).
- Um plano por assunto; quando for superado, mover para `../arquivo/` com `git mv`.
- Plano local de trabalho (fora do repositório) fica em
  `C:\Users\PICHAU\.opencode\plan\` e não é versionado.
- Datas no formato `AAAA-MM-DD` dentro dos documentos.
