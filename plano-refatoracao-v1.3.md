PLANO DE AÇÃO — REFATORAÇÃO SEGURA V1.3
SisAgri / SMADER
Data de abertura: 2026-03-26
Status geral: PLANEJADO

==================================================================
0. OBJETIVO
==================================================================
Consolidar os renderizadores de painéis filho e neto em `script.js`,
eliminando ~480 linhas de lógica 100% duplicada por meio de dois
helpers parametrizados.

Escopo restrito a:
  - `script.js` (único arquivo alterado)
  - 7 funções alvo (listadas na seção 3)
  - 2 helpers novos a criar (listados na seção 4)

Esta refatoração NÃO toca:
  - `admin.js`
  - `db.js`
  - `dados.js`
  - `index.html`, `style.css`
  - fluxo de `publish_status`
  - contratos de `DB.*`

Pré-requisito: v1.2 concluída e comitada na main. ✓

==================================================================
1. CONTEXTO — POR QUE ESTA REFATORAÇÃO
==================================================================
Durante a v1.2 foram identificados 7 renderizadores em `script.js`
com lógica funcionalmente idêntica. Por conterem callbacks inline
hardcoded (strings de `onclick` dentro de template literals), a
consolidação exigia parametrização — custo alto para a v1.2.

A v1.3 ataca exatamente isso: extrai dois helpers com assinatura
clara, substitui as 7 funções originais por chamadas a esses helpers,
e valida o comportamento de cada contexto (processo, sistema, serviço).

Resultado esperado: ~480 linhas → ~120 linhas. Zero perda funcional.

==================================================================
2. MAPEAMENTO DAS FUNÇÕES ALVO
==================================================================
Arquivo: `script.js`

GRUPO A — Renderizadores de manual em painel filho/neto (5 funções)
Cada uma renderiza o mesmo conteúdo (tabs resumido/completo,
paginação de passos, documentos, observações) com apenas 4 variáveis:

  Função                    | panelId             | self (fn recursiva)            | voltar()               | fechar()
  --------------------------|---------------------|-------------------------------|------------------------|------------------
  renderManualFilho         | manual-filho-panel  | renderManualFilho             | fecharManualFilho      | fecharProcessoCompleto
  renderSistemaFilhoManual  | sistema-filho-panel | renderSistemaFilhoManual      | fecharSistemaFilho     | fecharSistemaCompleto
  renderServicoFilhoManual  | servico-filho-panel | renderServicoFilhoManual      | fecharServicoFilho     | fecharServicoCompleto
  renderSistemaNetoManual   | sistema-neto-panel  | renderSistemaNetoManual       | fecharSistemaNetoFilho | fecharSistemaCompleto
  renderServicoNetoManual   | servico-neto-panel  | renderServicoNetoManual       | fecharServicoNetoFilho | fecharServicoCompleto

  Tamanho atual: ~96 linhas cada = ~480 linhas totais
  Tamanho após consolidação: ~5 linhas cada (chamada ao helper)

  Nota sobre renderManualFilho:
    - Recebe 3 parâmetros: (m, modo, passoAtivo)
    - Não tem processoId (diferente dos netos)
    - Texto do botão voltar: "Voltar ao processo"

  Nota sobre os netos (renderSistemaNetoManual, renderServicoNetoManual):
    - Recebem 4 parâmetros: (m, modo, processoId, passoAtivo)
    - processoId é passado nos callbacks dos botões de passo
    - Texto do botão voltar: "Voltar ao processo"

  Nota sobre os filhos de sistema/serviço:
    - Recebem 3 parâmetros: (m, modo, passoAtivo)
    - Texto do botão voltar: "Voltar ao sistema" / "Voltar ao serviço"

GRUPO B — Renderizadores de processo em painel filho (2 funções)
Cada uma renderiza a timeline de etapas com chips de manuais vinculados,
diferindo apenas em 3 pontos:

  Função                     | panelId              | chip onclick               | voltar()            | fechar()               | texto voltar
  ---------------------------|----------------------|---------------------------|---------------------|------------------------|------------------
  renderSistemaFilhoProcesso | sistema-filho-panel  | abrirManualNoSistemaFilho | fecharSistemaFilho  | fecharSistemaCompleto  | Voltar ao sistema
  renderServicoFilhoProcesso | servico-filho-panel  | abrirManualNoServicoFilho | fecharServicoFilho  | fecharServicoCompleto  | Voltar ao serviço

  Tamanho atual: ~45 linhas cada = ~90 linhas totais
  Tamanho após consolidação: ~5 linhas cada (chamada ao helper)

==================================================================
3. ESTRATÉGIA DE CONSOLIDAÇÃO
==================================================================
3.1. Helper para manuais: _renderManualEmPainel(m, modo, passoAtivo, cfg)

  Parâmetro cfg (objeto de configuração):
  {
    panelId:       string  — ID do elemento DOM do painel
    selfFn:        string  — nome da função para os callbacks de onclick
    voltarFn:      string  — nome da função chamada no botão Voltar
    fecharFn:      string  — nome da função chamada no botão X
    voltarLabel:   string  — texto do botão Voltar (ex: "Voltar ao processo")
    processoId:    number  — opcional, apenas para painéis neto
  }

  A função:
  1. Obtém o elemento pelo panelId
  2. Monta as tabs usando selfFn nos onclicks
  3. Monta o conteúdo (resumido ou completo) usando selfFn e processoId
  4. Monta os documentos
  5. Escreve o innerHTML com voltarFn, fecharFn, voltarLabel

3.2. Helper para processos: _renderProcessoEmPainel(p, cfg)

  Parâmetro cfg (objeto de configuração):
  {
    panelId:     string  — ID do elemento DOM do painel
    chipOnclick: string  — nome da função chamada no chip de manual
    voltarFn:    string  — nome da função chamada no botão Voltar
    fecharFn:    string  — nome da função chamada no botão X
    voltarLabel: string  — texto do botão Voltar
  }

  A função:
  1. Obtém o elemento pelo panelId
  2. Monta a timeline com etapas e chips usando chipOnclick
  3. Escreve o innerHTML com voltarFn, fecharFn, voltarLabel

3.3. Wrappers — as 7 funções originais viram wrappers de 3-5 linhas:

  function renderManualFilho(m, modo, passoAtivo) {
    _renderManualEmPainel(m, modo, passoAtivo, {
      panelId:     'manual-filho-panel',
      selfFn:      'renderManualFilho',
      voltarFn:    'fecharManualFilho',
      fecharFn:    'fecharProcessoCompleto',
      voltarLabel: 'Voltar ao processo',
    });
  }

  (idem para as demais 6)

==================================================================
4. ORDEM DE EXECUÇÃO — BLOCOS
==================================================================
Executar nesta ordem exata. Um bloco por vez. Não avançar sem commit.

BLOCO 1 — Criar _renderManualEmPainel (sem remover nada)
  - Inserir a nova função logo antes de renderManualFilho
  - Não alterar nenhuma das 5 funções existentes ainda
  - Validar: node --check + abrir um manual dentro de um processo

BLOCO 2 — Migrar renderManualFilho para usar o helper
  - Substituir o corpo da função pela chamada ao helper com cfg
  - Validar: abrir manual dentro de processo (painel filho de processo)

BLOCO 3 — Migrar renderSistemaFilhoManual
  - Validar: abrir manual dentro de sistema

BLOCO 4 — Migrar renderServicoFilhoManual
  - Validar: abrir manual dentro de serviço

BLOCO 5 — Migrar renderSistemaNetoManual
  - Validar: abrir sistema → processo → manual (painel neto)

BLOCO 6 — Migrar renderServicoNetoManual
  - Validar: abrir serviço → processo → manual (painel neto)

BLOCO 7 — Criar _renderProcessoEmPainel (sem remover nada)
  - Inserir a nova função logo antes de renderSistemaFilhoProcesso
  - Não alterar nenhuma das 2 funções existentes ainda
  - Validar: node --check

BLOCO 8 — Migrar renderSistemaFilhoProcesso
  - Validar: abrir processo dentro de sistema

BLOCO 9 — Migrar renderServicoFilhoProcesso
  - Validar: abrir processo dentro de serviço

BLOCO 10 — Limpeza final
  - Remover qualquer comentário residual
  - node --check final
  - Confirmar zero funções duplicadas

==================================================================
5. PROTOCOLO OBRIGATÓRIO POR BLOCO
==================================================================
Cada agente deve seguir esta ordem em cada bloco:

PASSO 1 — Ler o estado atual do arquivo antes de editar
  Nunca editar com base em contexto antigo. Sempre reler.

PASSO 2 — Localizar a função alvo com grep + número de linha
  Confirmar início e fim antes de qualquer alteração.

PASSO 3 — Para blocos de criação (1 e 7):
  Inserir a nova função em posição que não quebre o fluxo.
  Não remover nada. Validar sintaxe.

PASSO 4 — Para blocos de migração (2 a 6, 8 e 9):
  a) Confirmar que o helper do bloco anterior está presente
  b) Substituir apenas o corpo da função (manter assinatura idêntica)
  c) Manter o nome da função — não renomear
  d) Validar sintaxe com node --check
  e) Validar manualmente o fluxo afetado
  f) Commitar antes de avançar

PASSO 5 — Registrar no log antes de avançar
  Não pular o log mesmo que o bloco pareça simples.

REGRAS ADICIONAIS:
  - Nunca alterar a assinatura das funções públicas
  - Nunca renomear fecharManualFilho, fecharSistemaFilho etc.
  - Nunca alterar os IDs de painel (manual-filho-panel etc.)
  - Se qualquer teste visual falhar: parar, reportar, não avançar
  - Se node --check falhar: restaurar o backup antes de tentar novamente

==================================================================
6. VALIDAÇÃO POR BLOCO
==================================================================
6.1. Validação de sintaxe (todos os blocos)
  node --check script.js && echo "OK"

6.2. Validação visual — Grupo A (blocos 2 a 6)
  Para cada bloco migrado, testar o caminho completo:

  Bloco 2 (renderManualFilho):
    Processos → abrir qualquer processo → clicar em chip de manual →
    painel filho deve abrir com tabs Resumido/Completo →
    navegar entre passos → fechar com X e com botão Voltar

  Bloco 3 (renderSistemaFilhoManual):
    Sistemas → abrir qualquer sistema que tenha manuais vinculados →
    clicar no chip de manual → painel filho deve abrir →
    testar tabs e navegação entre passos

  Bloco 4 (renderServicoFilhoManual):
    Serviços → abrir qualquer serviço → (se tiver processo vinculado,
    abrir o processo) → clicar em chip de manual → painel deve abrir

  Bloco 5 (renderSistemaNetoManual):
    Sistemas → abrir sistema → abrir processo vinculado →
    clicar em chip de manual dentro de uma etapa →
    painel neto deve abrir com processoId correto nos callbacks

  Bloco 6 (renderServicoNetoManual):
    Serviços → abrir serviço → abrir processo vinculado →
    clicar em chip de manual dentro de uma etapa →
    painel neto deve abrir

6.3. Validação visual — Grupo B (blocos 8 e 9)
  Bloco 8 (renderSistemaFilhoProcesso):
    Sistemas → abrir sistema com processo vinculado →
    clicar no chip de processo → timeline deve aparecer →
    chips de manuais dentro das etapas devem funcionar →
    botão Voltar deve retornar ao painel do sistema

  Bloco 9 (renderServicoFilhoProcesso):
    Serviços → abrir serviço com processo vinculado →
    clicar no chip de processo → timeline → manuais nas etapas

6.4. Validação de regressão (bloco 10)
  Testar todos os caminhos de 6.2 e 6.3 novamente após a limpeza.
  Confirmar que nenhum painel abre em branco ou com erro no console.

==================================================================
7. ANTI-PADRÕES PROIBIDOS
==================================================================
1. Alterar a assinatura das 7 funções públicas
2. Renomear qualquer função fechar* ou abrir*
3. Remover função antes de validar que o helper funciona
4. Avançar para o próximo bloco sem commit do bloco atual
5. Combinar criação do helper + migração de todas as funções em 1 commit
6. Editar com base em contexto de conversa anterior sem reler o arquivo
7. Usar eval() ou Function() para parametrizar os callbacks
8. Passar funções como referência direta — usar sempre string com nome

==================================================================
8. CRITÉRIOS DE CONCLUSÃO DA V1.3
==================================================================
Esta frente pode ser considerada bem-sucedida quando:

1. _renderManualEmPainel existe e é a única implementação da lógica
2. _renderProcessoEmPainel existe e é a única implementação da lógica
3. As 7 funções públicas continuam existindo com a mesma assinatura
4. Cada uma delas é um wrapper de ≤5 linhas
5. node --check OK
6. Todos os caminhos de 6.2 e 6.3 validados manualmente
7. Todos os blocos registrados em log
8. Nenhuma regressão confirmada pelo usuário

==================================================================
9. QUANDO PARAR E ESCALAR
==================================================================
Parar imediatamente se:
1. Qualquer painel abrir em branco após migração
2. Erro de console ao navegar entre passos
3. Botão Voltar ou X não funcionar após migração
4. processoId não chegar corretamente nos callbacks dos netos
5. node --check falhar

Nesses casos:
  - não tentar corrigir no impulso
  - restaurar o arquivo do commit anterior
  - registrar a falha no log com o trecho exato que causou o problema
  - propor nova abordagem antes de reexecutar

==================================================================
10. CHECKLIST DE EXECUÇÃO POR BLOCO
==================================================================
[ ] Arquivo relido antes de editar
[ ] Função alvo localizada com grep (linha confirmada)
[ ] Para criação: posição de inserção definida
[ ] Para migração: cfg completo mapeado (panelId, selfFn, voltarFn, fecharFn, voltarLabel, processoId?)
[ ] Patch aplicado
[ ] node --check OK
[ ] Validação visual executada conforme seção 6
[ ] Log registrado
[ ] Commit feito
[ ] Próximo bloco iniciado somente após confirmação

==================================================================
11. MODELO DE LOG OPERACIONAL
==================================================================
[LOG XX]
Data:
Agente:
Arquivo:
Bloco:
Função migrada / criada:
cfg utilizado (para migração):
Linhas antes / depois:
node --check:
Validação visual:
Resultado:
Commit:
Observações:

==================================================================
12. ROTEIRO DE EXECUÇÃO
==================================================================
FASE 1 — GRUPO A (manual em painel)
1. [ ] BLOCO 1 — criar _renderManualEmPainel
2. [ ] BLOCO 2 — migrar renderManualFilho
3. [ ] BLOCO 3 — migrar renderSistemaFilhoManual
4. [ ] BLOCO 4 — migrar renderServicoFilhoManual
5. [ ] BLOCO 5 — migrar renderSistemaNetoManual
6. [ ] BLOCO 6 — migrar renderServicoNetoManual

FASE 2 — GRUPO B (processo em painel)
7. [ ] BLOCO 7 — criar _renderProcessoEmPainel
8. [ ] BLOCO 8 — migrar renderSistemaFilhoProcesso
9. [ ] BLOCO 9 — migrar renderServicoFilhoProcesso

FASE 3 — ENCERRAMENTO
10. [ ] BLOCO 10 — limpeza final e validação de regressão
11. [ ] Registro de conclusão

==================================================================
13. RECOMENDAÇÃO FINAL AOS PRÓXIMOS AGENTES
==================================================================
Esta refatoração é cirúrgica mas exige atenção aos callbacks inline.

O risco principal não é a lógica — é a string dos onclicks dentro dos
template literals. Cada função precisa referenciar a si mesma pelo nome
correto. Um erro de digitação no selfFn não quebra a sintaxe mas quebra
a navegação entre passos silenciosamente.

Antes de qualquer migração:
1. Confirmar o cfg completo lendo a função original
2. Checar o processoId — ele aparece APENAS nos netos (blocos 5 e 6)
3. Checar o voltarLabel — "Voltar ao processo" vs "Voltar ao sistema" vs "Voltar ao serviço"
4. Testar a navegação entre passos (não só a abertura do painel)

A validação mais importante é: navegar do passo 1 ao passo 3 e voltar
ao passo 1 dentro do painel filho/neto. Isso confirma que selfFn e
processoId estão corretos nos callbacks.

Sempre:
1. reler antes
2. mapear o cfg antes de escrever
3. validar a navegação entre passos
4. commitar bloco a bloco
5. não avançar sem confirmação do usuário

==================================================================
14. LOG DE ABERTURA
==================================================================
[LOG 00]
Data: 2026-03-26
Agente: Claude Sonnet 4.6
Arquivo: `plano-refatoracao-v1.3.md`
Bloco: abertura do plano
Função migrada / criada: não aplicável
cfg utilizado: não aplicável
Linhas antes / depois: não aplicável
node --check: não aplicável
Validação visual: não aplicável
Resultado: plano operacional criado com base no mapeamento da v1.2
Commit: pendente de validação do usuário
Observações:
  Funções alvo mapeadas com linhas exatas no estado pós-v1.2:
    renderManualFilho:         linhas 1194-1289 (96 linhas)
    renderSistemaFilhoManual:  linhas 3082-3178 (97 linhas)
    renderSistemaFilhoProcesso: linhas 3180-3224 (45 linhas)
    renderServicoFilhoProcesso: linhas 3431-3476 (46 linhas)
    renderServicoFilhoManual:  linhas 3478-3573 (96 linhas)
    renderSistemaNetoManual:   linhas 3594-3689 (96 linhas)
    renderServicoNetoManual:   linhas 3695-3790 (96 linhas)
  Total atual: ~572 linhas para ~480 linhas de lógica duplicada
  Total esperado após v1.3: ~120 linhas (helpers + wrappers)

[LOG 03]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 3 â€” migrar renderSistemaFilhoManual
Função migrada / criada: enderSistemaFilhoManual
cfg utilizado:
  panelId: sistema-filho-panel
  selfFn: enderSistemaFilhoManual
  voltarFn: echarSistemaFilho
  fecharFn: echarSistemaCompleto
  voltarLabel: Voltar ao sistema
Linhas antes / depois: ~97 linhas â†’ 9 linhas
node --check: OK
Validação visual: usuário validou abertura do painel filho em Sistemas, abas Resumido/Completo, navegação entre passos, botão Voltar e botão X
Resultado: bloco validado
Commit: confirmado pelo usuário
Observações:
  - assinatura pública preservada

[LOG 04]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 4 â€” migrar renderServicoFilhoManual
Função migrada / criada: enderServicoFilhoManual
cfg utilizado:
  panelId: servico-filho-panel
  selfFn: enderServicoFilhoManual
  voltarFn: echarServicoFilho
  fecharFn: echarServicoCompleto
  voltarLabel: Voltar ao serviço
Linhas antes / depois: ~96 linhas â†’ 9 linhas
node --check: OK
Validação visual: usuário validou pelo fluxo Serviços â†’ processo vinculado â†’ manual da etapa
Resultado: bloco validado
Commit: confirmado pelo usuário
Observações:
  - função é alcançável via processo do serviço
  - assinatura pública preservada

[LOG 05]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 5 â€” migrar renderSistemaNetoManual
Função migrada / criada: enderSistemaNetoManual
cfg utilizado:
  panelId: sistema-neto-panel
  selfFn: enderSistemaNetoManual
  voltarFn: echarSistemaNetoFilho
  fecharFn: echarSistemaCompleto
  voltarLabel: Voltar ao processo
  processoId: preservado
Linhas antes / depois: ~96 linhas â†’ 10 linhas
node --check: OK
Validação visual: usuário validou o fluxo Sistema â†’ processo â†’ manual da etapa
Resultado: bloco validado
Commit: confirmado pelo usuário
Observações:
  - processoId mantido no cfg do helper

[LOG 06]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 6 â€” migrar renderServicoNetoManual
Função migrada / criada: enderServicoNetoManual
cfg utilizado:
  panelId: servico-neto-panel
  selfFn: enderServicoNetoManual
  voltarFn: echarServicoNetoFilho
  fecharFn: echarServicoCompleto
  voltarLabel: Voltar ao processo
  processoId: preservado
Linhas antes / depois: ~96 linhas â†’ 10 linhas
node --check: OK
Validação visual: usuário validou o fluxo Serviços â†’ processo â†’ manual da etapa (painel neto)
Resultado: bloco validado
Commit: pendente de confirmação do usuário
Observações:
  - processoId mantido no cfg do helper