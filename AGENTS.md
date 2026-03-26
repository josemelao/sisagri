# AGENTS.md

## 1. Objetivo
Aplicação **SisAgri / SMADER** em frontend vanilla (`HTML + CSS + JavaScript`), com:
- app público em `index.html`, `script.js` e `style.css`
- painel administrativo em `admin.html` e `admin.js`
- dados base em `dados.js`
- persistência e integração em `db.js`
- Supabase JS v2 via CDN
- fallback local

Objetivo deste agente: executar mudanças **pequenas, seguras, econômicas em tokens e com máxima compatibilidade**.

---

## 2. Prioridade de decisão
Em caso de conflito, seguir esta ordem:

1. instrução direta do usuário
2. segurança do sistema e dos dados
3. este `AGENTS.md`
4. plano operacional/handoff vigente

Regra mestra:
**sempre preferir a menor alteração possível, no menor número de arquivos possível, preservando o comportamento atual.**

---

## 3. Protocolo obrigatório antes de mudar código
Antes de implementar, responder exatamente nesta ordem:

1. **Demanda**
2. **Arquivos que pretende abrir/alterar**
3. **Plano curto**

Limites:
- `Demanda`: até 3 linhas
- `Plano curto`: até 4 passos

Se a tarefa for sensível (`admin`, persistência, Supabase, rascunho/publicado), usar modo conservador:
- patch local
- sem refactor estrutural
- sem renomear funções, IDs ou chaves
- sem reorganizar fluxo

---

## 4. Regras gerais de execução
- Não escanear o projeto inteiro sem necessidade.
- Trabalhar primeiro nos arquivos citados pelo usuário.
- Se precisar abrir arquivos extras, dizer antes quais e por quê.
- Não reler arquivos longos já analisados sem motivo.
- Se a solução couber em 1 arquivo, não expandir para vários sem necessidade real.
- Não propor refactor amplo como primeira opção.
- Não gerar diff grande para problema localizado.
- Em tarefa nova: localizar ponto exato → aplicar patch mínimo → só depois sugerir melhoria opcional.

Quando assumir sem perguntar:
- em bugfix local
- em ajuste visual localizado
- em fallback defensivo
- em correção de texto, responsividade ou UX pequena

Quando parar e alinhar antes:
- risco de expor rascunhos no app público
- risco de alterar contrato de `DB.*`
- risco de quebrar login/admin
- necessidade de refactor grande ou mudança estrutural
- dúvida real sobre fonte de verdade dos dados

---

## 5. Estrutura do projeto
### Arquivos principais
- `index.html`
- `script.js`
- `style.css`
- `admin.html`
- `admin.js`
- `dados.js`
- `db.js`

### Arquivo operacional
- `plano-rascunho-admin.txt` (se existir, tratar como handoff vigente)

### Modelo mental do sistema
**Fluxo público:** `index.html` → `dados.js` / Supabase / `db.js` → `script.js`

**Fluxo admin:** `admin.html` → `dbInit()` → `DB.isAdminLoggedIn()` / `DB.adminLogin()` → `admin.js`

**Fonte de verdade em runtime:** não assumir que `dados.js` é a fonte final. A ordem provável é:
1. persistência local / estado salvo via `db.js`
2. fallback em `window.DADOS_INICIAIS`
3. Supabase, quando configurado

Conclusão: mudar `dados.js` nem sempre altera o que o sistema já persistiu.

---

## 6. Regras por arquivo

### `index.html`
Papel: shell da SPA pública.

Preservar:
- IDs
- `data-page`
- classes usadas por JS
- boot screen e hooks de navegação

Evitar:
- mover grandes blocos de markup
- remover elementos sem checar uso em `script.js`

Permitido sem pedir:
- ajuste visual local
- bloco pequeno de UI
- container novo para feature pontual

Proibido sem pedir:
- reestruturar layout inteiro
- trocar navegação SPA
- remover hooks do JS

### `script.js`
Papel: coração da SPA principal.

Tratar como arquivo crítico.

Preservar:
- estado global existente
- filtro por `publish_status`
- busca global e paginação
- chaves persistidas (`MODULE_SEARCH_STATE_KEY` e similares)

Ao alterar:
- preferir patch local
- procurar função/estado/padrão existente antes de criar novo
- evitar reindexação total sem necessidade

Proibido sem autorização:
- reescrever arquitetura da SPA
- migrar para módulos ES
- trocar estrutura global inteira
- converter para framework

### `admin.html`
Papel: interface do painel administrativo.

Preservar:
- `boot-screen`, `login-screen`, `admin-app`
- IDs de login, formulários e botões

Proibido sem pedir:
- redesenho total
- remoção de ações existentes
- quebra de compatibilidade de CRUD

### `admin.js`
Papel: autenticação admin, inicialização, CRUD e status.

Tratar como arquivo de alto risco.

Preservar:
- fluxo de login
- sessão ativa
- inicialização após `dbInit()`
- fallback quando Supabase falhar
- assinaturas chamadas pelo HTML

Ao tocar em CRUD:
- manter compatibilidade com `publish_status`
- manter exportação/serialização
- manter persistência local
- manter sincronização com Supabase, se existir

Proibido sem autorização:
- trocar auth
- reescrever CRUD completo
- remover fallback local
- alterar contratos de `DB.*`

### `dados.js`
Papel: snapshot de dados exposto em `window.DADOS_INICIAIS`.

Regras:
- não tratar como única fonte de verdade em runtime
- manter compatibilidade retroativa ao adicionar campos
- preservar coerência com `publish_status`

Permitido:
- novos registros
- campos opcionais com fallback

Proibido sem autorização:
- alterar formato global das coleções
- remover chaves em massa
- “limpar” dados antigos sem migração

### `db.js`
Papel: camada crítica de persistência e integração.

Tratar como camada mais sensível do projeto.

Preservar:
- retrocompatibilidade
- nomes de chaves persistidas
- fallback para formatos antigos
- fallback local se Supabase falhar

Regras Supabase:
- nunca expor `service_role` no frontend
- usar apenas `anon key` no browser
- não colocar secrets reais em código
- não assumir disponibilidade constante da rede

Proibido sem autorização:
- trocar provedor de persistência
- remover fallback local
- reescrever toda a API `DB.*`

### `style.css`
Papel: estilo global do app público.

Regras:
- alterações localizadas
- preferir classes específicas
- evitar efeito colateral em `body`, sidebar, layout principal, botões e inputs genéricos

Proibido sem pedir:
- refatorar CSS inteiro
- renomear classes amplamente usadas
- alterar variáveis globais sem necessidade

### `plano-rascunho-admin.txt`
Papel: documento operacional de handoff entre agentes.

Regras:
- ler antes de continuar tarefas relacionadas a homologação, rascunho/publicado ou continuidade de etapas
- não marcar fase como concluída sem confirmação explícita do usuário
- não assumir commit feito
- só atualizar o plano depois da validação/commit confirmados

---

## 7. Regra crítica de rascunho/publicado
Há forte evidência de uso de fluxo **rascunho vs publicado**.

Ao tocar conteúdo publicável:
- preservar `publish_status`
- garantir que o app público continue exibindo apenas o que deve ser público
- não publicar automaticamente no admin
- não descartar itens sem status em `dados.js` ou `db.js`

Se houver risco de expor rascunhos no frontend, **parar e avisar antes de implementar**.

---

## 8. Padrões obrigatórios de implementação
### Ao corrigir bug
1. identificar o ponto exato
2. explicar a causa em 1–2 linhas
3. aplicar patch local
4. não aproveitar para refatorar

### Ao adicionar funcionalidade
1. reutilizar estrutura existente
2. evitar arquivo novo se 1 função resolver
3. integrar no fluxo atual
4. só criar abstração se houver repetição real

### Ao mexer em dados/persistência
1. preservar formato antigo
2. adicionar fallback
3. não quebrar serialização/exportação

### Ao mexer em admin
1. validar impacto no público
2. validar impacto na persistência
3. validar impacto no fluxo de publicação

---

## 9. O que pode e o que não pode
### Pode fazer sem pedir
- bugfix local
- ajuste visual localizado
- checagem defensiva (`if`, null-check, fallback)
- pequena função utilitária
- pequena melhoria de UX sem mudar fluxo
- log temporário, se solicitado
- ajuste de filtro, paginação ou busca com compatibilidade

### Não pode fazer sem autorização explícita
- reescrever `script.js`
- reescrever `admin.js`
- trocar arquitetura de persistência
- remover fallback local
- alterar contratos de `DB.*`
- migrar para framework
- modularizar tudo
- renomear IDs, classes ou chaves em massa
- alterar fluxo de auth admin
- expor rascunhos no app principal
- ignorar o plano/handoff vigente quando ele se aplicar

---

## 10. Checklist antes de concluir
- [ ] Toquei só os arquivos necessários?
- [ ] Mantive IDs, classes e chaves compatíveis?
- [ ] Não quebrei o boot screen?
- [ ] Não quebrei login/admin?
- [ ] Não alterei contratos de `DB.*`?
- [ ] Preservei fallback local?
- [ ] Preservei fluxo rascunho/publicado?
- [ ] Evitei refactor desnecessário?

---

## 11. Formato obrigatório de entrega
Ao concluir:

1. **Resumo curto**
2. **Arquivos alterados**
3. **O que mudou**
4. **Comandos de commit prontos** (quando a tarefa for etapa validada)
5. aguardar confirmação do usuário antes de assumir commit
6. se a tarefa fizer parte do plano, só então atualizar `plano-rascunho-admin.txt`

Template de commit:

```bash
git add ARQUIVOS
git commit -m "mensagem clara da etapa"
git push
```

Nunca assumir que o usuário já executou.

---

## 12. Regra final
Neste repositório, o padrão correto é:
- mudança mínima
- compatibilidade máxima
- segurança no admin e na persistência
- preservação de rascunho/publicado
- respeito ao handoff entre agentes
- economia de tokens sem perder confiabilidade
