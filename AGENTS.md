# AGENTS.md

## Projeto / contexto
Aplicação **SisAgri / SMADER** em **frontend vanilla** (HTML + CSS + JavaScript), com:
- **SPA principal** em `index.html` + `script.js` + `style.css`
- **Painel administrativo** em `admin.html` + `admin.js`
- **Dados base** em `dados.js`
- **Camada de persistência / integração** em `db.js`
- **Supabase JS v2 via CDN** (carregado no browser)
- **Fallback local** (há evidências de uso de dados locais + persistência local)
- Documento operacional de handoff em `plano-rascunho-admin.txt`

**Objetivo deste AGENT:** executar mudanças pequenas, seguras, econômicas em tokens e com máxima compatibilidade.

---

## REGRA MESTRA (obrigatória)
**Sempre preferir a menor alteração possível, no menor número de arquivos possível, preservando comportamento atual.**

Ordem de prioridade:
1. Não quebrar o fluxo atual
2. Não alterar contratos implícitos entre HTML ↔ JS ↔ DB
3. Não alterar persistência sem necessidade
4. Não refatorar sem pedido explícito
5. Não “embelezar” código fora do escopo

---

## Protocolo obrigatório antes de qualquer mudança
Antes de implementar, o agente deve responder exatamente nesta ordem:

1. **Diagnóstico** (máx. 3 linhas)
2. **Arquivos que pretende abrir/alterar**
3. **Plano curto** (máx. 4 passos)
4. **Risco de regressão**: baixo / médio / alto

Se a tarefa for sensível (admin, persistência, publicação/rascunho, Supabase), usar **modo conservador**:
- patch local
- sem refactor estrutural
- sem renomear funções/IDs/chaves
- sem reorganizar fluxo

---

## Regras de economia de tokens (obrigatórias)
1. **Não escanear o projeto inteiro sem necessidade.**
2. Trabalhar **somente** nos arquivos citados pelo usuário.
3. Se precisar abrir arquivos extras, listar primeiro **quais** e **por quê**.
4. Não reler arquivos longos já analisados sem motivo.
5. Se a solução puder ser feita em 1 arquivo, **não expandir para 3**.
6. Não propor refactor amplo como primeira opção.
7. Não gerar diff gigante se o problema for localizado.
8. Em tarefas novas:
   - primeiro localizar ponto exato
   - depois aplicar patch mínimo
   - só depois sugerir melhoria opcional

---

## Estrutura real detectada do projeto

### Arquivos principais
- `index.html`
- `script.js`
- `style.css`
- `admin.html`
- `admin.js`
- `dados.js`
- `db.js`
- `plano-rascunho-admin.txt`

### Observações detectadas
- `index.html` carrega:
  - `dados.js`
  - `@supabase/supabase-js@2` via CDN
  - `db.js`
  - `script.js`
- `admin.html` carrega:
  - `dados.js`
  - `@supabase/supabase-js@2` via CDN
  - `db.js`
  - `admin.js`
- `script.js` usa navegação SPA e depende de dados populados por `db.js`
- `script.js` contém:
  - estado global de múltiplos módulos
  - boot screen
  - índice de busca global
  - filtro de itens publicados (`publish_status`)
- `admin.js` contém:
  - autenticação admin via `DB.*`
  - inicialização após `dbInit()`
  - CRUD e status do banco
- `dados.js` expõe `window.DADOS_INICIAIS`
- `dados.js` documenta claramente:
  - fallback local
  - exportação para atualizar `dados.js`
  - migração gradual para Supabase via `db.js`
- `plano-rascunho-admin.txt` é documento de handoff e deve ser tratado como fonte operacional entre agentes

---

## Arquitetura funcional (modelo mental obrigatório)

### Fluxo principal (app público / interno)
`index.html` → carrega scripts base → `db.js` inicializa dados → `script.js` popula variáveis globais e renderiza SPA

### Fluxo admin
`admin.html` → `dbInit()` → `DB.isAdminLoggedIn()` / `DB.adminLogin()` → `admin.js` renderiza painel → CRUD via `DB.*`

### Fonte de verdade de dados
**NÃO assumir que `dados.js` é sempre a fonte final em runtime.**

Ordem provável:
1. persistência local / estado salvo (via `db.js`)
2. fallback em `window.DADOS_INICIAIS`
3. potencial integração Supabase (quando configurado)

**Conclusão:** mudanças em `dados.js` nem sempre afetam dados já persistidos.

---

## Regras críticas por arquivo

# 1) index.html
### Papel
Shell da SPA principal, sidebar, páginas e boot screen.

### Regras
- Preservar:
  - IDs
  - `data-page`
  - classes usadas por JS
  - elementos do boot screen
- Não remover elementos sem checar referência em `script.js`
- Não renomear IDs de busca, navegação, módulos, páginas, cards, containers
- Evitar mover blocos grandes de markup

### Permitido sem pedir
- ajuste visual local
- inclusão de bloco pequeno de UI
- adicionar container específico para nova feature

### Proibido sem pedir
- reestruturar layout inteiro
- trocar navegação SPA
- remover hooks do JS

---

# 2) script.js
### Papel
Coração da SPA principal.

### Sinais detectados
- arrays globais por módulo
- filtro por `publish_status`
- boot/loading
- busca global indexada
- estado de busca persistido
- múltiplos módulos e navegação

### Regras obrigatórias
- Tratar como **arquivo crítico**
- Preferir **patches locais**
- Não reescrever blocos grandes
- Não mover grandes seções sem extrema necessidade
- Antes de criar nova lógica, procurar:
  1. função similar existente
  2. estado global já usado
  3. padrão já adotado no módulo

### Ao adicionar feature
Preferir:
- função nova pequena e isolada
- integração por chamada explícita
- reaproveitar renderizador/estado existente

### Ao alterar busca / filtros / paginação / dashboard
- preservar chaves persistidas (`MODULE_SEARCH_STATE_KEY` e similares)
- não resetar estados antigos sem fallback
- não quebrar indexação global
- evitar recriar índice completo sem necessidade

### Proibido sem autorização
- reescrever arquitetura da SPA
- migrar para módulos ES
- trocar toda a estrutura de estado global
- converter para framework

---

# 3) admin.html
### Papel
Interface do painel administrativo.

### Regras
- Tratar como **área sensível**
- Preservar:
  - IDs de login
  - telas `boot-screen`, `login-screen`, `admin-app`
  - IDs de formulários e botões
- Não alterar nomenclaturas sem revisar `admin.js`

### Proibido sem pedir
- redesenho total
- remoção de campos/ações existentes
- quebra de compatibilidade de CRUD

---

# 4) admin.js
### Papel
Autenticação admin + inicialização + CRUD + status de banco.

### Sinais detectados
- usa `DB.adminLogin`, `DB.adminLogout`, `DB.isAdminLoggedIn`
- depende de `dbInit()`
- trata status do banco e fallback Supabase/local
- possui lógica de overview e navegação admin

### Regras obrigatórias
- Tratar como **arquivo de alto risco**
- Qualquer mudança deve preservar:
  - fluxo de login
  - fluxo de sessão ativa
  - inicialização após `dbInit()`
  - fallback quando Supabase falhar
- Não remover chamadas de status sem entender efeito
- Não mudar assinatura de funções chamadas pelo HTML

### Ao tocar em CRUD
- manter compatibilidade com:
  - rascunho/publicado (`publish_status`)
  - exportação/serialização
  - persistência local
  - sincronização com Supabase, se existir

### Proibido sem autorização
- trocar mecanismo de auth
- reescrever CRUD completo
- remover fallback local
- alterar contratos de `DB.*`

---

# 5) dados.js
### Papel
Snapshot / dados de fábrica expostos em `window.DADOS_INICIAIS`.

### Regras obrigatórias
- Não tratar como única fonte de verdade em runtime
- Se adicionar campos novos:
  - manter compatibilidade retroativa
  - evitar quebrar objetos existentes
- Se o app já usa `publish_status`, preservar valor padrão coerente

### Permitido
- incluir novos registros
- incluir campos opcionais com fallback

### Proibido sem autorização
- alterar formato global de todas as coleções
- remover chaves existentes em massa
- “limpar” dados antigos sem migração

---

# 6) db.js
### Papel
Camada crítica de persistência e integração.

### Regras máximas de segurança
- Tratar como **camada mais sensível do projeto**
- Antes de mudar qualquer estrutura:
  - identificar quem consome
  - manter retrocompatibilidade
  - evitar mudança de chave persistida
- Se houver `localStorage` / `sessionStorage` / IndexedDB:
  - preservar nomes de chaves
  - criar fallback para formatos antigos

### Regras Supabase (obrigatórias)
- Nunca expor `service_role` no frontend
- Só usar **anon key** no browser
- Não colocar secrets reais em código
- Não assumir que Supabase está sempre disponível
- Sempre preservar fallback local se já existir
- Se falhar Supabase, não travar app/admin desnecessariamente

### Ao mexer em sync
- preferir “graceful fallback”
- não bloquear UI por indisponibilidade de rede
- preservar mensagens de status

### Proibido sem autorização
- trocar provedor de persistência
- remover fallback local
- reescrever toda a API `DB.*`

---

# 7) style.css
### Papel
Estilo global do app principal.

### Regras
- Alterações localizadas
- Preferir classes específicas
- Evitar efeitos colaterais em:
  - `body`
  - sidebar
  - layout principal
  - botões genéricos
  - inputs genéricos
- Se adicionar blocos novos, comentar se útil

### Proibido sem pedir
- refatorar CSS inteiro
- renomear classes amplamente usadas
- alterar variáveis globais de design sem necessidade

---

# 8) plano-rascunho-admin.txt
### Papel
**Documento operacional de handoff entre agentes.**

### Regras obrigatórias
- Ler antes de continuar tarefas relacionadas a:
  - rascunho/publicado
  - homologação
  - fluxo de etapas
  - continuidade entre agentes
- Tratar como **fonte principal de continuidade**
- Se a tarefa fizer parte do plano, seguir o protocolo descrito

### Instruções importantes detectadas
- Repositório esperado:
  - `C:\Users\Usuario\Desktop\SisAgri - Stable`
- Branch esperada:
  - `origin/codex/homologacao-rascunho-admin`
- Ao final de cada etapa validada:
  - fornecer comandos de commit
  - aguardar confirmação do usuário
  - só depois atualizar o TXT

### Proibido
- marcar fase como concluída sem confirmação explícita do usuário
- assumir que commit foi feito
- ignorar o status do handoff

---

## Regras especiais para sistema rascunho/publicado
Há forte evidência de que o projeto usa/está migrando para um fluxo de **rascunho vs publicado**.

### Ao tocar qualquer módulo com conteúdo publicável:
- Preservar `publish_status` se já existir
- No app principal (`script.js`):
  - itens públicos devem continuar respeitando filtro de publicados
- No admin (`admin.js`):
  - não quebrar edição de rascunho
  - não publicar automaticamente sem intenção explícita
- Em `dados.js` / `db.js`:
  - manter compatibilidade de serialização
  - não descartar itens sem status

### Regra de segurança
Se uma alteração puder expor rascunhos no frontend, **parar e avisar antes de implementar**.

---

## Padrões de implementação obrigatórios

### Ao corrigir bug
1. Identificar ponto exato
2. Explicar causa em 1–2 linhas
3. Aplicar patch local
4. Não “aproveitar” para refatorar

### Ao adicionar funcionalidade
1. Reutilizar estrutura existente
2. Evitar novo arquivo se 1 função resolver
3. Integrar no fluxo atual
4. Só criar abstração se houver repetição real

### Ao mexer em dados
1. Preservar formato antigo
2. Adicionar fallback
3. Não quebrar serialização/exportação

### Ao mexer em admin
1. Validar impacto no público
2. Validar impacto na persistência
3. Validar impacto no fluxo de publicação

---

## Convenções de estilo do projeto
- Manter **português** onde o projeto já usa português
- Manter nomes existentes
- Preservar estilo visual e organizacional atual
- Não introduzir build step / bundler / framework sem pedido explícito
- Não adicionar bibliotecas externas sem autorização

---

## O que PODE fazer sem pedir (se fizer sentido)
- bugfix local
- ajuste visual localizado
- checagens defensivas (`if`, null-check, fallback)
- pequena função utilitária
- pequena melhoria de UX sem alterar fluxo
- log temporário (se solicitado)
- ajuste de filtro/paginação/busca com compatibilidade

---

## O que NÃO PODE fazer sem autorização explícita
- reescrever `script.js`
- reescrever `admin.js`
- trocar arquitetura de persistência
- remover fallback local
- alterar contratos de `DB.*`
- migrar para framework
- modularizar tudo
- renomear IDs/classes/chaves em massa
- alterar fluxo de auth admin
- expor rascunhos no app principal
- alterar branch/plano sem respeitar `plano-rascunho-admin.txt`

---

## Checklist obrigatório antes de concluir
Antes de encerrar a tarefa, validar:

- [ ] Toquei só os arquivos necessários?
- [ ] Mantive IDs/classes/chaves compatíveis?
- [ ] Não quebrei o boot screen?
- [ ] Não quebrei login/admin?
- [ ] Não alterei contratos de `DB.*`?
- [ ] Preservei fallback local?
- [ ] Preservei fluxo rascunho/publicado?
- [ ] Não fiz refactor desnecessário?

---

## Formato obrigatório de entrega ao usuário
Ao concluir:

1. **Resumo curto** (máx. 5 linhas)
2. **Arquivos alterados**
3. **O que mudou**
4. **Risco de regressão** (baixo/médio/alto)
5. **Comandos de commit prontos** (se a tarefa for etapa validada)
6. **Aguardar confirmação do usuário antes de assumir commit**
7. Se a tarefa fizer parte do plano:
   - só então atualizar `plano-rascunho-admin.txt`

---

## Template de commit (seguir quando aplicável)
Usar sempre algo como:

```bash
git add ARQUIVOS
git commit -m "mensagem clara da etapa"
git push
```

**Nunca assumir que o usuário já executou.**
Sempre aguardar confirmação explícita.

---

## Regra final
**Neste repositório, o padrão correto é:**
- mudança mínima
- compatibilidade máxima
- segurança no admin e na persistência
- preservar rascunho/publicado
- respeitar handoff entre agentes
- economizar tokens sem perder confiabilidade
