PLANO DE AÇÃO — REFATORAÇÃO SEGURA V1.2
SisAgri / SMADER
Data de abertura: 2026-03-25
Status geral: EM EXECUÇÃO — Fase 1 concluída (script.js ✓ | admin.js ✓) | Fase 2 pendente de mapeamento

==================================================================
0. OBJETIVO
==================================================================
Este documento define o plano operacional para análise, varredura,
mapeamento e remoção segura de duplicidades no código, com foco em:

1. Reduzir risco de bugs silenciosos causados por funções duplicadas
2. Evitar sobrescritas acidentais por segunda definição
3. Melhorar legibilidade e manutenção sem quebrar o fluxo atual
4. Preservar compatibilidade com:
   - frontend público (`index.html`, `script.js`, `style.css`)
   - admin (`admin.html`, `admin.js`)
   - persistência (`db.js`)
   - dados base (`dados.js`)
   - fluxo de rascunho/publicado (`publish_status`)
   - fallback local e Supabase

Este plano deve ser executado com máxima cautela, em blocos pequenos,
com validação contínua e sem refatoração estrutural ampla.

==================================================================
1. PRINCÍPIOS OBRIGATÓRIOS
==================================================================
1.1. Regra mestra
- Sempre preferir a menor alteração possível.
- Sempre mexer no menor número de arquivos possível.
- Nunca misturar limpeza ampla com correção funcional no mesmo passo.

1.2. Escopo
- O foco desta refatoração é duplicidade real, não “embelezamento”.
- Não converter arquitetura.
- Não modularizar tudo.
- Não renomear funções/IDs/chaves em massa.

1.3. Segurança
- Não tocar em `db.js` sem mapear todos os consumidores do trecho.
- Não tocar em fluxo de login/admin sem necessidade explícita.
- Não alterar contrato de `DB.*`.
- Não alterar `publish_status` sem validação cruzada.
- Não expor rascunhos no app público.

1.4. Estratégia
- Trabalhar por blocos pequenos.
- Cada bloco deve ser isolado, validável e reversível.
- Cada bloco precisa terminar com evidência objetiva:
  - arquivo afetado
  - função afetada
  - risco avaliado
  - validação executada
  - resultado

==================================================================
2. ARQUIVOS E NÍVEL DE RISCO
==================================================================
2.1. Alto risco
- `script.js`
- `admin.js`
- `db.js`

2.2. Médio risco
- `index.html`
- `admin.html`
- `style.css`

2.3. Baixo risco
- `dados.js`
- arquivos `.txt` de plano/handoff

==================================================================
3. O QUE CONTA COMO DUPLICIDADE
==================================================================
Tratar como duplicidade relevante:

3.1. Duplicidade crítica
- duas funções com o mesmo nome
- segunda definição sobrescrevendo a primeira
- dois handlers competindo pelo mesmo evento
- dois fluxos para o mesmo comportamento com resultados diferentes

3.2. Duplicidade funcional
- funções diferentes com lógica quase idêntica
- geração repetida de HTML/tabelas/cards com mesmas regras
- validações repetidas com pequenas variações
- fallbacks repetidos em múltiplos pontos

3.3. Duplicidade de risco baixo
- texto repetido
- estilos repetidos
- helpers pequenos repetidos sem impacto funcional

Regra: sempre atacar primeiro a duplicidade crítica.

==================================================================
4. ORDEM DE PRIORIDADE
==================================================================
FASE 1 — MAPEAMENTO CRÍTICO
1. `script.js`
2. `admin.js`
3. `db.js`

FASE 2 — DUPLICIDADES FUNCIONAIS
4. renderizadores
5. helpers de UI
6. filtros/buscas/paginação

FASE 3 — LIMPEZA CONTROLADA
7. HTML com hooks repetidos
8. CSS redundante localizado
9. textos/labels repetidos, somente se seguro

==================================================================
5. PROTOCOLO DE ANÁLISE E VARREDURA
==================================================================
Cada agente deve seguir exatamente esta ordem:

PASSO 1 — Delimitar o alvo
1. Escolher apenas 1 arquivo ou 1 subsistema por vez.
2. Declarar explicitamente o escopo:
   - exemplo: “mapear duplicidades de renderizadores em `script.js`”
3. Não abrir arquivos extras sem justificar.

PASSO 2 — Levantar duplicidades
1. Procurar:
   - funções com mesmo nome
   - blocos repetidos com mesma assinatura
   - listeners repetidos
   - renderizadores quase idênticos
2. Registrar cada ocorrência no log do plano.
3. Não alterar nada ainda nesta etapa.
4. OBRIGATÓRIO: antes de definir o corte, inspecionar se há funções
   únicas intercaladas dentro do bloco morto (ex: novoX, editarX,
   helpers de UI). Se houver, listá-las explicitamente como "preservar".

PASSO 3 — Classificar risco
Para cada ocorrência encontrada, marcar:
- risco alto / médio / baixo
- impacto provável
- consumidores conhecidos
- se há risco para:
  - login/admin
  - DB/persistência
  - `publish_status`
  - render público

PASSO 4 — Escolher o bloco mínimo
1. Selecionar apenas 1 duplicidade por vez.
2. Priorizar:
   - sobrescrita real
   - bug já observado
   - trecho fácil de validar
3. Se a alteração exigir mexer em muitos pontos, dividir antes.

PASSO 5 — Confirmar estratégia de correção
Antes de editar, definir qual será o método:
- remoção da duplicata
- consolidação em função única
- extração de helper pequeno
- redirecionamento de chamadas para função canônica

PASSO 6 — Aplicar patch mínimo
1. Alterar apenas o trecho necessário.
2. Não aproveitar para reorganizar arquivo.
3. Não renomear em cascata sem necessidade.

PASSO 7 — Validar localmente
Executar validação proporcional ao risco do bloco:
- sintaxe (`node --check`) quando for JS
- verificação visual/local para UI
- validação manual do fluxo afetado

PASSO 8 — Registrar resultado
Anotar no log:
- o que foi alterado
- qual duplicidade foi resolvida
- como foi validado
- se a etapa está pronta para commit

==================================================================
6. MAPEAMENTO OBRIGATÓRIO POR ÁREA
==================================================================
6.1. Em `script.js`
Mapear:
1. funções com nome repetido
2. renderizadores de módulos com dupla definição
3. helpers repetidos de tabela/card/listagem
4. handlers de busca/filtro/paginação repetidos
5. trechos que possam sobrescrever estado global

Risco principal:
- quebra de navegação SPA
- quebra de busca global
- exposição de rascunhos

6.2. Em `admin.js`
Mapear:
1. renderizadores de seções com comportamento repetido
2. fluxos de salvar/editar/excluir similares
3. wrappers repetidos de loading/toast/status
4. listeners duplicados de UI

Risco principal:
- quebra de login/admin
- perda de feedback visual
- inconsistência de CRUD

6.3. Em `db.js`
Mapear apenas com extrema cautela:
1. normalizações repetidas
2. fallbacks repetidos
3. persistências repetidas
4. caminhos de sincronização redundantes

Risco principal:
- quebrar compatibilidade de dados
- quebrar Supabase
- quebrar fallback local

Regra adicional:
- `db.js` só deve entrar em execução após concluir ao menos 1 ciclo bem-sucedido em `script.js` ou `admin.js`.

==================================================================
7. CRITÉRIOS PARA ESCOLHER O PRÓXIMO BLOCO
==================================================================
Escolher sempre o item que combine:
1. alto risco funcional
2. baixo custo de mudança
3. validação simples
4. pouco acoplamento externo

Boa ordem prática:
1. função duplicada com mesmo nome
2. renderizador duplicado com comportamento igual
3. helper repetido usado em poucos lugares
4. listener duplicado
5. repetição estética/organizacional

==================================================================
8. VALIDAÇÃO POR TIPO DE ALTERAÇÃO
==================================================================
8.1. Se mexer em `script.js`
Validar:
1. `node --check`
2. navegação entre páginas principais
3. busca no módulo afetado
4. renderização da seção afetada
5. confirmação de que itens publicados continuam corretos

8.2. Se mexer em `admin.js`
Validar:
1. `node --check`
2. login/admin
3. carregamento da seção afetada
4. ação principal do bloco alterado
5. feedback visual (toast/loading) se aplicável

8.3. Se mexer em `db.js`
Validar:
1. `node --check`
2. leitura de dados
3. gravação do fluxo alterado
4. fallback local
5. Supabase, se disponível

8.4. Se mexer em HTML/CSS
Validar:
1. integridade visual do trecho
2. responsividade do breakpoint afetado
3. manutenção de IDs/classes/hook de JS

==================================================================
9. REGRAS DE COMMIT
==================================================================
1. Um commit por bloco pequeno.
2. Não juntar várias refatorações independentes.
3. A mensagem deve indicar claramente a duplicidade removida.

Exemplos:
- `refactor: remove duplicidade de renderizador de relatorios`
- `refactor: consolida helper repetido de listagem no admin`
- `fix: remove sobrescrita por funcao duplicada em script`

==================================================================
10. QUANDO PARAR E ESCALAR
==================================================================
Parar imediatamente se:
1. a duplicidade tocar `publish_status` e houver risco de expor rascunho
2. a mudança exigir reescrever bloco grande
3. a origem da verdade do dado ficar incerta
4. houver dependência cruzada entre `script.js`, `admin.js` e `db.js`
5. a função tiver muitos consumidores desconhecidos

Nesses casos:
- não implementar no impulso
- registrar no log
- propor subdivisão do bloco

==================================================================
11. ANTI-PADRÕES PROIBIDOS NESTE PLANO
==================================================================
1. “Aproveitar” a etapa para limpar arquivo inteiro
2. Renomear dezenas de funções sem rastreio
3. Reordenar arquivo grande sem necessidade
4. Misturar bugfix, melhoria e refatoração ampla no mesmo commit
5. Mexer simultaneamente em `script.js`, `admin.js` e `db.js` sem motivo forte
6. Remover função aparentemente duplicada sem localizar consumidores

==================================================================
12. CHECKLIST DE EXECUÇÃO POR BLOCO
==================================================================
[ ] Escopo definido
[ ] Arquivo alvo definido
[ ] Duplicidade encontrada e descrita
[ ] Risco classificado
[ ] Consumidores mapeados
[ ] Estratégia de correção definida
[ ] Patch mínimo aplicado
[ ] Validação executada
[ ] Resultado registrado no log
[ ] Commit preparado

==================================================================
13. MODELO DE LOG OPERACIONAL
==================================================================
Usar este modelo ao final de cada microetapa:

[LOG XX]
Data:
Agente:
Arquivo:
Escopo:
Duplicidade identificada:
Classificação de risco:
Consumidores impactados:
Estratégia adotada:
Arquivos alterados:
Validação executada:
Resultado:
Commit:
Observações:

==================================================================
14. ROTEIRO RECOMENDADO DE EXECUÇÃO
==================================================================
ETAPA A — LEVANTAMENTO
1. [✓] Mapear duplicidades críticas em `script.js` — concluído 2026-03-25
2. [✓] Mapear duplicidades críticas em `admin.js` — concluído 2026-03-25
3. [✓] Registrar tudo, sem editar — ver LOG 01 (mapeamento formal)

ETAPA B — PRIMEIROS BLOCOS (script.js)
4. [✓] D-S01 renderFuncionarios (3 def.) — removidas v1 e v2
5. [✓] D-S02 openFuncionario (2 def.) — removida v1
6. [✓] D-S03 initFuncSearch (2 def.) — removida v1
7. [✓] D-S04 renderRelatorioVeiculos (2 def.) — removida v1
8. [✓] D-S05 renderRelatorioFerias (2 def.) — removida v1
9. [✓] Validado e comitado — ver LOG 02

ETAPA C — SEGUNDO CICLO (admin.js)
10. [✓] D-A09 getMotoristaOptions (2 def.) — removida v1
11. [✓] D-A10 getArquivosVeiculoOptions (2 def.) — removida v1
12. [✓] D-A11 getSistemaLinksOptions (2 def.) — removida v1
13. [✓] Validado e comitado — ver LOG 03
14. [✓] D-A07/A08 formServico + salvarServico — removidas v1 — ver LOG 04
15. [✓] D-A01/A02 renderAgendaEventos + formEvento — removidas v1 — ver LOG 05
16. [✓] D-A03/A04 formFerias + salvarFerias — removidas v1 — ver LOG 05
17. [✓] D-A05/A06 formAcesso + salvarAcesso — removidas v1 — ver LOG 05
18. [✓] D-A12 renderEscalaFerias — removida v1 — ver LOG 05
19. [~] D-A13 renderVeiculos — já estava com 1 definição (falso positivo no mapeamento)

CORREÇÕES PÓS-REMOÇÃO (Bloco C)
20. [✓] novoAcesso + editarAcesso reinseridas (estavam só na v1 removida) — ver LOG 06
21. [✓] renderInlinePublishStatusControl adicionado em renderAgendaEventos (ausente na v2) — ver LOG 06
22. [✓] renderInlinePublishStatusControl adicionado em renderEscalaFerias (ausente na v2) — ver LOG 06
23. [✓] Validado e comitado

ETAPA D — DUPLICIDADES FUNCIONAIS
24. [ ] Mapear duplicidades funcionais em script.js e admin.js
25. [ ] Consolidar renderizadores muito parecidos
26. [ ] Consolidar helpers repetidos de baixo risco
27. [ ] Validar por bloco

ETAPA E — CAMADA SENSÍVEL
28. [ ] Só então avaliar `db.js`
29. [ ] Atacar apenas redundâncias realmente problemáticas
30. [ ] Exigir validação extra de compatibilidade

==================================================================
15. CRITÉRIOS DE CONCLUSÃO DA V1.2
==================================================================
Esta frente pode ser considerada bem-sucedida quando:

1. não houver mais função duplicada crítica conhecida
2. não houver mais sobrescrita acidental conhecida
3. os blocos mais arriscados tiverem sido resolvidos com validação
4. a aplicação seguir estável em:
   - app público
   - admin
   - persistência
5. todos os passos relevantes estiverem registrados em log

==================================================================
16. RECOMENDAÇÃO FINAL AOS PRÓXIMOS AGENTES
==================================================================
Não tratar esta refatoração como “limpeza geral”.
Tratar como operação de risco controlado.

O objetivo não é deixar o arquivo bonito.
O objetivo é remover vulnerabilidades práticas causadas por duplicidade,
sem perder estabilidade, sem quebrar contrato e sem alterar o que já foi
homologado na v1.1.

Sempre:
1. mapear antes
2. mexer pouco
3. validar logo
4. registrar no log
5. seguir para o próximo bloco somente após confirmação

==================================================================
17. LOG DE ABERTURA
==================================================================
[LOG 00]
Data: 2026-03-25
Agente: Codex
Arquivo: `plano-refatoracao-v1.2.txt`
Escopo: abertura do plano de refatoração segura v1.2
Duplicidade identificada: ainda não mapeada nesta etapa
Classificação de risco: planejamento
Consumidores impactados: não aplicável
Estratégia adotada: definir protocolo completo antes de qualquer edição de código
Arquivos alterados: este plano
Validação executada: revisão estrutural do documento
Resultado: plano operacional criado
Commit: pendente de validação do usuário
Observações: iniciar execução sempre pela fase de mapeamento

==================================================================
18. LOGS DE EXECUÇÃO
==================================================================
[LOG 01]
Data: 2026-03-25
Agente: Claude Sonnet 4.6
Arquivo: `script.js`, `admin.js` (leitura apenas)
Escopo: mapeamento formal de todas as duplicidades críticas — Fase 1
Duplicidade identificada: 18 ocorrências em 2 arquivos (5 em script.js, 13 em admin.js)
Classificação de risco: ver tabela completa no mapeamento formal da conversa
Consumidores impactados: não aplicável (etapa de leitura)
Estratégia adotada: varredura por grep + inspeção manual de cada bloco
Arquivos alterados: nenhum
Validação executada: revisão estrutural das ocorrências
Resultado: mapeamento completo entregue — padrão universal identificado:
  em todos os 18 casos a segunda definição é a correta, a primeira está morta
Commit: não aplicável
Observações: script.js tinha 3 definições de renderFuncionarios (caso único)

------------------------------------------------------------------
[LOG 02]
Data: 2026-03-25
Agente: Claude Sonnet 4.6
Arquivo: `script.js`
Escopo: remoção das definições mortas D-S01, D-S02, D-S03, D-S04, D-S05
Duplicidade identificada:
  D-S01 renderFuncionarios — 3 definições (linhas 772, 852, 956 originais)
  D-S02 openFuncionario — 2 definições (linhas 803, 883 originais)
  D-S03 initFuncSearch — 2 definições (linhas 837, 946 originais)
  D-S04 renderRelatorioVeiculos — 2 definições (linhas 4421, 4624 originais)
  D-S05 renderRelatorioFerias — 2 definições (linhas 4606, 4658 originais)
Classificação de risco: alto (D-S01, D-S02, D-S03, D-S05) / médio (D-S04)
Consumidores impactados:
  renderFuncionarios: chamada por initFuncionarios, applyFuncionariosSearch
  openFuncionario: chamada por onclick nos cards e busca global
  initFuncSearch: chamada por initFuncionarios
  renderRelatorioVeiculos: chamada por openRelatorio
  renderRelatorioFerias: chamada por openRelatorio
Estratégia adotada: remoção das versões mortas (v1 e v2 de renderFuncionarios,
  v1 de openFuncionario, v1 de initFuncSearch, v1 de renderRelatorioVeiculos,
  v1 de renderRelatorioFerias)
Arquivos alterados: `script.js` — 155 linhas removidas (4878 → 4723)
Validação executada: node --check OK + validação manual pelo usuário
Resultado: CONCLUÍDO — todas as funções com definição única
Commit: confirmado pelo usuário
Observações: openFuncionario v2 estava dentro do bloco removido na primeira
  tentativa; backup restaurado e corte recalculado com precisão

------------------------------------------------------------------
[LOG 03]
Data: 2026-03-25
Agente: Claude Sonnet 4.6
Arquivo: `admin.js`
Escopo: remoção das definições mortas D-A09, D-A10, D-A11
Duplicidade identificada:
  D-A09 getMotoristaOptions — 2 definições (linhas 2050, 2065 originais)
  D-A10 getArquivosVeiculoOptions — 2 definições (linhas 2057, 2073 originais)
  D-A11 getSistemaLinksOptions — 2 definições (linhas 2220, 2228 originais)
Classificação de risco: baixo (apenas label visual, sem impacto em dados)
Consumidores impactados:
  getMotoristaOptions: formVeiculo
  getArquivosVeiculoOptions: formVeiculo
  getSistemaLinksOptions: formSistema, formServico
Estratégia adotada: remoção das v1 (sem withDraftSuffix, sem isSelectedOptionValue)
Arquivos alterados: `admin.js` — 20 linhas removidas (3365 → 3345)
Validação executada: node --check OK + validação manual pelo usuário
Resultado: CONCLUÍDO — todas as funções com definição única
Commit: confirmado pelo usuário
Observações: corte feito do fim para o início do arquivo para evitar
  deslocamento de índices entre os três blocos removidos

------------------------------------------------------------------
[LOG 04]
Data: 2026-03-26
Agente: Claude Sonnet 4.6
Arquivo: `admin.js`
Escopo: remoção das definições mortas D-A07, D-A08 (Bloco B)
Duplicidade identificada:
  D-A07 formServico — 2 definições (linhas 2430, 2512 pós-LOG03)
  D-A08 salvarServico — 2 definições (linhas 2467, 2550 pós-LOG03)
Classificação de risco: alto
  v1 sem suporte a categoria personalizada ("Outro")
  v1 de salvarServico salvaria "Outro" como categoria literal
Consumidores impactados:
  formServico: novoServico, editarServico
  salvarServico: chamado via onclick no modal
Estratégia adotada: remoção de formServico v1 e salvarServico v1
  comentário '// Sobrescreve...' também removido
Arquivos alterados: `admin.js` — 74 linhas removidas (3345 → 3271)
Validação executada: node --check OK + validação manual pelo usuário
Resultado: CONCLUÍDO
Commit: confirmado pelo usuário
Observações: novoServico e editarServico sobreviveram (estavam entre v1 e v2)

------------------------------------------------------------------
[LOG 05]
Data: 2026-03-26
Agente: Claude Sonnet 4.6
Arquivo: `admin.js`
Escopo: remoção das definições mortas D-A01, D-A02, D-A03, D-A04,
  D-A05, D-A06, D-A12 (Bloco C)
Duplicidade identificada:
  D-A01 renderAgendaEventos — 2 def. (sem paginação vs com paginação)
  D-A02 formEvento — 2 def. (sem toggleEventoTipoFields vs com)
  D-A03 formFerias — 2 def. (select status manual vs cálculo automático)
  D-A04 salvarFerias — 2 def. (lê fer-status inexistente vs getFeriasStatus)
  D-A05 formAcesso — 2 def. (inputs manuais vs iconPickerHTML)
  D-A06 salvarAcesso — 2 def. (lê ac-icone/ac-cor vs getIconeCorValues)
  D-A12 renderEscalaFerias — 2 def. (sem paginação vs com paginação)
  D-A13 renderVeiculos — FALSO POSITIVO (já tinha 1 definição)
Classificação de risco: alto (D-A01 a D-A04, D-A12) / baixo (D-A05, D-A06)
Consumidores impactados: todos via renderSection e onclick nos modais
Estratégia adotada: cortes cirúrgicos separados por função, do fim para
  o início para não deslocar índices. Funções únicas intercaladas
  (preencherDadosFunc, novaFerias, editarFerias, getFeriasStatus,
  toggleEventoTipoFields, novoEvento, editarEvento) preservadas.
Arquivos alterados: `admin.js` — 159 linhas removidas (3271 → 3112)
Validação executada: node --check OK + validação parcial pelo usuário
Resultado: CONCLUÍDO COM REGRESSÕES — ver LOG 06
Commit: não aplicável (regressões detectadas antes do commit)
Observações: novoAcesso/editarAcesso eram únicas e estavam só na v1 removida.
  renderInlinePublishStatusControl ausente nas v2 de agenda e férias.

------------------------------------------------------------------
[LOG 06]
Data: 2026-03-26
Agente: Claude Sonnet 4.6
Arquivo: `admin.js`
Escopo: correção de regressões introduzidas no LOG 05
Regressão 1: novoAcesso + editarAcesso removidas junto com formAcesso v1
  Causa: eram únicas e estavam definidas dentro do bloco da v1
  Correção: reinseridas após formAcesso v2, antes de salvarAcesso
Regressão 2: switch inline de publish_status ausente em renderAgendaEventos
  Causa: v2 vencedora não tinha renderInlinePublishStatusControl
  Correção: adicionado renderInlinePublishStatusControl('agendaEventos', e)
    + classe td-actions--with-status na célula de ações
Regressão 3: switch inline de publish_status ausente em renderEscalaFerias
  Causa: v2 vencedora não tinha renderInlinePublishStatusControl
  Correção: adicionado renderInlinePublishStatusControl('escalaFerias', f)
    + classe td-actions--with-status na célula de ações
Arquivos alterados: `admin.js` — 3 linhas inseridas (3112 → 3115)
Validação executada: node --check OK + validação manual pelo usuário
Resultado: CONCLUÍDO — todas as regressões corrigidas
Commit: confirmado pelo usuário
Observações: lição aprendida — ao remover bloco v1, verificar se contém
  funções únicas intercaladas antes de cortar. Adicionar este passo
  ao protocolo de análise (seção 5, Passo 2).
