PLANO DE AÃ‡ÃƒO â€” REFATORAÃ‡ÃƒO SEGURA V1.3
SisAgri / SMADER
Data de abertura: 2026-03-26
Status geral: PLANEJADO

==================================================================
0. OBJETIVO
==================================================================
Consolidar os renderizadores de painÃ©is filho e neto em `script.js`,
eliminando ~480 linhas de lÃ³gica 100% duplicada por meio de dois
helpers parametrizados.

Escopo restrito a:
  - `script.js` (Ãºnico arquivo alterado)
  - 7 funÃ§Ãµes alvo (listadas na seÃ§Ã£o 3)
  - 2 helpers novos a criar (listados na seÃ§Ã£o 4)

Esta refatoraÃ§Ã£o NÃƒO toca:
  - `admin.js`
  - `db.js`
  - `dados.js`
  - `index.html`, `style.css`
  - fluxo de `publish_status`
  - contratos de `DB.*`

PrÃ©-requisito: v1.2 concluÃ­da e comitada na main. âœ“

==================================================================
1. CONTEXTO â€” POR QUE ESTA REFATORAÃ‡ÃƒO
==================================================================
Durante a v1.2 foram identificados 7 renderizadores em `script.js`
com lÃ³gica funcionalmente idÃªntica. Por conterem callbacks inline
hardcoded (strings de `onclick` dentro de template literals), a
consolidaÃ§Ã£o exigia parametrizaÃ§Ã£o â€” custo alto para a v1.2.

A v1.3 ataca exatamente isso: extrai dois helpers com assinatura
clara, substitui as 7 funÃ§Ãµes originais por chamadas a esses helpers,
e valida o comportamento de cada contexto (processo, sistema, serviÃ§o).

Resultado esperado: ~480 linhas â†’ ~120 linhas. Zero perda funcional.

==================================================================
2. MAPEAMENTO DAS FUNÃ‡Ã•ES ALVO
==================================================================
Arquivo: `script.js`

GRUPO A â€” Renderizadores de manual em painel filho/neto (5 funÃ§Ãµes)
Cada uma renderiza o mesmo conteÃºdo (tabs resumido/completo,
paginaÃ§Ã£o de passos, documentos, observaÃ§Ãµes) com apenas 4 variÃ¡veis:

  FunÃ§Ã£o                    | panelId             | self (fn recursiva)            | voltar()               | fechar()
  --------------------------|---------------------|-------------------------------|------------------------|------------------
  renderManualFilho         | manual-filho-panel  | renderManualFilho             | fecharManualFilho      | fecharProcessoCompleto
  renderSistemaFilhoManual  | sistema-filho-panel | renderSistemaFilhoManual      | fecharSistemaFilho     | fecharSistemaCompleto
  renderServicoFilhoManual  | servico-filho-panel | renderServicoFilhoManual      | fecharServicoFilho     | fecharServicoCompleto
  renderSistemaNetoManual   | sistema-neto-panel  | renderSistemaNetoManual       | fecharSistemaNetoFilho | fecharSistemaCompleto
  renderServicoNetoManual   | servico-neto-panel  | renderServicoNetoManual       | fecharServicoNetoFilho | fecharServicoCompleto

  Tamanho atual: ~96 linhas cada = ~480 linhas totais
  Tamanho apÃ³s consolidaÃ§Ã£o: ~5 linhas cada (chamada ao helper)

  Nota sobre renderManualFilho:
    - Recebe 3 parÃ¢metros: (m, modo, passoAtivo)
    - NÃ£o tem processoId (diferente dos netos)
    - Texto do botÃ£o voltar: "Voltar ao processo"

  Nota sobre os netos (renderSistemaNetoManual, renderServicoNetoManual):
    - Recebem 4 parÃ¢metros: (m, modo, processoId, passoAtivo)
    - processoId Ã© passado nos callbacks dos botÃµes de passo
    - Texto do botÃ£o voltar: "Voltar ao processo"

  Nota sobre os filhos de sistema/serviÃ§o:
    - Recebem 3 parÃ¢metros: (m, modo, passoAtivo)
    - Texto do botÃ£o voltar: "Voltar ao sistema" / "Voltar ao serviÃ§o"

GRUPO B â€” Renderizadores de processo em painel filho (2 funÃ§Ãµes)
Cada uma renderiza a timeline de etapas com chips de manuais vinculados,
diferindo apenas em 3 pontos:

  FunÃ§Ã£o                     | panelId              | chip onclick               | voltar()            | fechar()               | texto voltar
  ---------------------------|----------------------|---------------------------|---------------------|------------------------|------------------
  renderSistemaFilhoProcesso | sistema-filho-panel  | abrirManualNoSistemaFilho | fecharSistemaFilho  | fecharSistemaCompleto  | Voltar ao sistema
  renderServicoFilhoProcesso | servico-filho-panel  | abrirManualNoServicoFilho | fecharServicoFilho  | fecharServicoCompleto  | Voltar ao serviÃ§o

  Tamanho atual: ~45 linhas cada = ~90 linhas totais
  Tamanho apÃ³s consolidaÃ§Ã£o: ~5 linhas cada (chamada ao helper)

==================================================================
3. ESTRATÃ‰GIA DE CONSOLIDAÃ‡ÃƒO
==================================================================
3.1. Helper para manuais: _renderManualEmPainel(m, modo, passoAtivo, cfg)

  ParÃ¢metro cfg (objeto de configuraÃ§Ã£o):
  {
    panelId:       string  â€” ID do elemento DOM do painel
    selfFn:        string  â€” nome da funÃ§Ã£o para os callbacks de onclick
    voltarFn:      string  â€” nome da funÃ§Ã£o chamada no botÃ£o Voltar
    fecharFn:      string  â€” nome da funÃ§Ã£o chamada no botÃ£o X
    voltarLabel:   string  â€” texto do botÃ£o Voltar (ex: "Voltar ao processo")
    processoId:    number  â€” opcional, apenas para painÃ©is neto
  }

  A funÃ§Ã£o:
  1. ObtÃ©m o elemento pelo panelId
  2. Monta as tabs usando selfFn nos onclicks
  3. Monta o conteÃºdo (resumido ou completo) usando selfFn e processoId
  4. Monta os documentos
  5. Escreve o innerHTML com voltarFn, fecharFn, voltarLabel

3.2. Helper para processos: _renderProcessoEmPainel(p, cfg)

  ParÃ¢metro cfg (objeto de configuraÃ§Ã£o):
  {
    panelId:     string  â€” ID do elemento DOM do painel
    chipOnclick: string  â€” nome da funÃ§Ã£o chamada no chip de manual
    voltarFn:    string  â€” nome da funÃ§Ã£o chamada no botÃ£o Voltar
    fecharFn:    string  â€” nome da funÃ§Ã£o chamada no botÃ£o X
    voltarLabel: string  â€” texto do botÃ£o Voltar
  }

  A funÃ§Ã£o:
  1. ObtÃ©m o elemento pelo panelId
  2. Monta a timeline com etapas e chips usando chipOnclick
  3. Escreve o innerHTML com voltarFn, fecharFn, voltarLabel

3.3. Wrappers â€” as 7 funÃ§Ãµes originais viram wrappers de 3-5 linhas:

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
4. ORDEM DE EXECUÃ‡ÃƒO â€” BLOCOS
==================================================================
Executar nesta ordem exata. Um bloco por vez. NÃ£o avanÃ§ar sem commit.

BLOCO 1 â€” Criar _renderManualEmPainel (sem remover nada)
  - Inserir a nova funÃ§Ã£o logo antes de renderManualFilho
  - NÃ£o alterar nenhuma das 5 funÃ§Ãµes existentes ainda
  - Validar: node --check + abrir um manual dentro de um processo

BLOCO 2 â€” Migrar renderManualFilho para usar o helper
  - Substituir o corpo da funÃ§Ã£o pela chamada ao helper com cfg
  - Validar: abrir manual dentro de processo (painel filho de processo)

BLOCO 3 â€” Migrar renderSistemaFilhoManual
  - Validar: abrir manual dentro de sistema

BLOCO 4 â€” Migrar renderServicoFilhoManual
  - Validar: abrir manual dentro de serviÃ§o

BLOCO 5 â€” Migrar renderSistemaNetoManual
  - Validar: abrir sistema â†’ processo â†’ manual (painel neto)

BLOCO 6 â€” Migrar renderServicoNetoManual
  - Validar: abrir serviÃ§o â†’ processo â†’ manual (painel neto)

BLOCO 7 â€” Criar _renderProcessoEmPainel (sem remover nada)
  - Inserir a nova funÃ§Ã£o logo antes de renderSistemaFilhoProcesso
  - NÃ£o alterar nenhuma das 2 funÃ§Ãµes existentes ainda
  - Validar: node --check

BLOCO 8 â€” Migrar renderSistemaFilhoProcesso
  - Validar: abrir processo dentro de sistema

BLOCO 9 â€” Migrar renderServicoFilhoProcesso
  - Validar: abrir processo dentro de serviÃ§o

BLOCO 10 â€” Limpeza final
  - Remover qualquer comentÃ¡rio residual
  - node --check final
  - Confirmar zero funÃ§Ãµes duplicadas

==================================================================
5. PROTOCOLO OBRIGATÃ“RIO POR BLOCO
==================================================================
Cada agente deve seguir esta ordem em cada bloco:

PASSO 1 â€” Ler o estado atual do arquivo antes de editar
  Nunca editar com base em contexto antigo. Sempre reler.

PASSO 2 â€” Localizar a funÃ§Ã£o alvo com grep + nÃºmero de linha
  Confirmar inÃ­cio e fim antes de qualquer alteraÃ§Ã£o.

PASSO 3 â€” Para blocos de criaÃ§Ã£o (1 e 7):
  Inserir a nova funÃ§Ã£o em posiÃ§Ã£o que nÃ£o quebre o fluxo.
  NÃ£o remover nada. Validar sintaxe.

PASSO 4 â€” Para blocos de migraÃ§Ã£o (2 a 6, 8 e 9):
  a) Confirmar que o helper do bloco anterior estÃ¡ presente
  b) Substituir apenas o corpo da funÃ§Ã£o (manter assinatura idÃªntica)
  c) Manter o nome da funÃ§Ã£o â€” nÃ£o renomear
  d) Validar sintaxe com node --check
  e) Validar manualmente o fluxo afetado
  f) Commitar antes de avanÃ§ar

PASSO 5 â€” Registrar no log antes de avanÃ§ar
  NÃ£o pular o log mesmo que o bloco pareÃ§a simples.

REGRAS ADICIONAIS:
  - Nunca alterar a assinatura das funÃ§Ãµes pÃºblicas
  - Nunca renomear fecharManualFilho, fecharSistemaFilho etc.
  - Nunca alterar os IDs de painel (manual-filho-panel etc.)
  - Se qualquer teste visual falhar: parar, reportar, nÃ£o avanÃ§ar
  - Se node --check falhar: restaurar o backup antes de tentar novamente

==================================================================
6. VALIDAÃ‡ÃƒO POR BLOCO
==================================================================
6.1. ValidaÃ§Ã£o de sintaxe (todos os blocos)
  node --check script.js && echo "OK"

6.2. ValidaÃ§Ã£o visual â€” Grupo A (blocos 2 a 6)
  Para cada bloco migrado, testar o caminho completo:

  Bloco 2 (renderManualFilho):
    Processos â†’ abrir qualquer processo â†’ clicar em chip de manual â†’
    painel filho deve abrir com tabs Resumido/Completo â†’
    navegar entre passos â†’ fechar com X e com botÃ£o Voltar

  Bloco 3 (renderSistemaFilhoManual):
    Sistemas â†’ abrir qualquer sistema que tenha manuais vinculados â†’
    clicar no chip de manual â†’ painel filho deve abrir â†’
    testar tabs e navegaÃ§Ã£o entre passos

  Bloco 4 (renderServicoFilhoManual):
    ServiÃ§os â†’ abrir qualquer serviÃ§o â†’ (se tiver processo vinculado,
    abrir o processo) â†’ clicar em chip de manual â†’ painel deve abrir

  Bloco 5 (renderSistemaNetoManual):
    Sistemas â†’ abrir sistema â†’ abrir processo vinculado â†’
    clicar em chip de manual dentro de uma etapa â†’
    painel neto deve abrir com processoId correto nos callbacks

  Bloco 6 (renderServicoNetoManual):
    ServiÃ§os â†’ abrir serviÃ§o â†’ abrir processo vinculado â†’
    clicar em chip de manual dentro de uma etapa â†’
    painel neto deve abrir

6.3. ValidaÃ§Ã£o visual â€” Grupo B (blocos 8 e 9)
  Bloco 8 (renderSistemaFilhoProcesso):
    Sistemas â†’ abrir sistema com processo vinculado â†’
    clicar no chip de processo â†’ timeline deve aparecer â†’
    chips de manuais dentro das etapas devem funcionar â†’
    botÃ£o Voltar deve retornar ao painel do sistema

  Bloco 9 (renderServicoFilhoProcesso):
    ServiÃ§os â†’ abrir serviÃ§o com processo vinculado â†’
    clicar no chip de processo â†’ timeline â†’ manuais nas etapas

6.4. ValidaÃ§Ã£o de regressÃ£o (bloco 10)
  Testar todos os caminhos de 6.2 e 6.3 novamente apÃ³s a limpeza.
  Confirmar que nenhum painel abre em branco ou com erro no console.

==================================================================
7. ANTI-PADRÃ•ES PROIBIDOS
==================================================================
1. Alterar a assinatura das 7 funÃ§Ãµes pÃºblicas
2. Renomear qualquer funÃ§Ã£o fechar* ou abrir*
3. Remover funÃ§Ã£o antes de validar que o helper funciona
4. AvanÃ§ar para o prÃ³ximo bloco sem commit do bloco atual
5. Combinar criaÃ§Ã£o do helper + migraÃ§Ã£o de todas as funÃ§Ãµes em 1 commit
6. Editar com base em contexto de conversa anterior sem reler o arquivo
7. Usar eval() ou Function() para parametrizar os callbacks
8. Passar funÃ§Ãµes como referÃªncia direta â€” usar sempre string com nome

==================================================================
8. CRITÃ‰RIOS DE CONCLUSÃƒO DA V1.3
==================================================================
Esta frente pode ser considerada bem-sucedida quando:

1. _renderManualEmPainel existe e Ã© a Ãºnica implementaÃ§Ã£o da lÃ³gica
2. _renderProcessoEmPainel existe e Ã© a Ãºnica implementaÃ§Ã£o da lÃ³gica
3. As 7 funÃ§Ãµes pÃºblicas continuam existindo com a mesma assinatura
4. Cada uma delas Ã© um wrapper de â‰¤5 linhas
5. node --check OK
6. Todos os caminhos de 6.2 e 6.3 validados manualmente
7. Todos os blocos registrados em log
8. Nenhuma regressÃ£o confirmada pelo usuÃ¡rio

==================================================================
9. QUANDO PARAR E ESCALAR
==================================================================
Parar imediatamente se:
1. Qualquer painel abrir em branco apÃ³s migraÃ§Ã£o
2. Erro de console ao navegar entre passos
3. BotÃ£o Voltar ou X nÃ£o funcionar apÃ³s migraÃ§Ã£o
4. processoId nÃ£o chegar corretamente nos callbacks dos netos
5. node --check falhar

Nesses casos:
  - nÃ£o tentar corrigir no impulso
  - restaurar o arquivo do commit anterior
  - registrar a falha no log com o trecho exato que causou o problema
  - propor nova abordagem antes de reexecutar

==================================================================
10. CHECKLIST DE EXECUÃ‡ÃƒO POR BLOCO
==================================================================
[ ] Arquivo relido antes de editar
[ ] FunÃ§Ã£o alvo localizada com grep (linha confirmada)
[ ] Para criaÃ§Ã£o: posiÃ§Ã£o de inserÃ§Ã£o definida
[ ] Para migraÃ§Ã£o: cfg completo mapeado (panelId, selfFn, voltarFn, fecharFn, voltarLabel, processoId?)
[ ] Patch aplicado
[ ] node --check OK
[ ] ValidaÃ§Ã£o visual executada conforme seÃ§Ã£o 6
[ ] Log registrado
[ ] Commit feito
[ ] PrÃ³ximo bloco iniciado somente apÃ³s confirmaÃ§Ã£o

==================================================================
11. MODELO DE LOG OPERACIONAL
==================================================================
[LOG XX]
Data:
Agente:
Arquivo:
Bloco:
FunÃ§Ã£o migrada / criada:
cfg utilizado (para migraÃ§Ã£o):
Linhas antes / depois:
node --check:
ValidaÃ§Ã£o visual:
Resultado:
Commit:
ObservaÃ§Ãµes:

==================================================================
12. ROTEIRO DE EXECUÃ‡ÃƒO
==================================================================
FASE 1 â€” GRUPO A (manual em painel)
1. [x] BLOCO 1 â€” criar _renderManualEmPainel
2. [x] BLOCO 2 â€” migrar renderManualFilho
3. [x] BLOCO 3 â€” migrar renderSistemaFilhoManual
4. [x] BLOCO 4 â€” migrar renderServicoFilhoManual
5. [x] BLOCO 5 â€” migrar renderSistemaNetoManual
6. [x] BLOCO 6 â€” migrar renderServicoNetoManual

FASE 2 â€” GRUPO B (processo em painel)
7. [x] BLOCO 7 â€” criar _renderProcessoEmPainel
8. [x] BLOCO 8 â€” migrar renderSistemaFilhoProcesso
9. [x] BLOCO 9 â€” migrar renderServicoFilhoProcesso

FASE 3 â€” ENCERRAMENTO
10. [ ] BLOCO 10 â€” limpeza final e validaÃ§Ã£o de regressÃ£o
11. [ ] Registro de conclusÃ£o

==================================================================
13. RECOMENDAÃ‡ÃƒO FINAL AOS PRÃ“XIMOS AGENTES
==================================================================
Esta refatoraÃ§Ã£o Ã© cirÃºrgica, mas exige atenÃ§Ã£o aos callbacks inline.

O risco principal nÃ£o Ã© a lÃ³gica em si, e sim as strings de onclick
dentro dos template literals. Cada funÃ§Ã£o precisa referenciar a si
mesma pelo nome correto. Um erro no selfFn nÃ£o quebra a sintaxe, mas
quebra a navegaÃ§Ã£o entre passos silenciosamente.

Antes de qualquer migraÃ§Ã£o:
1. Confirmar o cfg completo lendo a funÃ§Ã£o original
2. Checar o processoId â€” ele aparece apenas nos netos (blocos 5 e 6)
3. Checar o oltarLabel â€” â€œVoltar ao processoâ€ vs â€œVoltar ao sistemaâ€ vs â€œVoltar ao serviÃ§oâ€
4. Testar a navegaÃ§Ã£o entre passos, nÃ£o sÃ³ a abertura do painel

A validaÃ§Ã£o mais importante Ã©:
navegar do passo 1 ao passo 3 e voltar ao passo 1 dentro do painel
filho/neto. Isso confirma que selfFn e processoId estÃ£o corretos.

Sempre:
1. reler antes
2. mapear o cfg antes de escrever
3. validar a navegaÃ§Ã£o entre passos
4. commitar bloco a bloco
5. nÃ£o avanÃ§ar sem confirmaÃ§Ã£o do usuÃ¡rio

==================================================================
14. LOG DE EXECUÃ‡ÃƒO
==================================================================
[LOG 00]
Data: 2026-03-26
Agente: Claude Sonnet 4.6
Arquivo: plano-refatoracao-v1.3.md
Bloco: abertura do plano
FunÃ§Ã£o migrada / criada: nÃ£o aplicÃ¡vel
cfg utilizado: nÃ£o aplicÃ¡vel
Linhas antes / depois: nÃ£o aplicÃ¡vel
node --check: nÃ£o aplicÃ¡vel
ValidaÃ§Ã£o visual: nÃ£o aplicÃ¡vel
Resultado: plano operacional criado com base no mapeamento da v1.2
Commit: pendente de validaÃ§Ã£o do usuÃ¡rio
ObservaÃ§Ãµes:
  FunÃ§Ãµes alvo mapeadas com linhas exatas no estado pÃ³s-v1.2:
    renderManualFilho: linhas 1194-1289 (96 linhas)
    renderSistemaFilhoManual: linhas 3082-3178 (97 linhas)
    renderSistemaFilhoProcesso: linhas 3180-3224 (45 linhas)
    renderServicoFilhoProcesso: linhas 3431-3476 (46 linhas)
    renderServicoFilhoManual: linhas 3478-3573 (96 linhas)
    renderSistemaNetoManual: linhas 3594-3689 (96 linhas)
    renderServicoNetoManual: linhas 3695-3790 (96 linhas)
  Total atual: ~572 linhas para ~480 linhas de lÃ³gica duplicada
  Total esperado apÃ³s v1.3: ~120 linhas (helpers + wrappers)

[LOG 03]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 3 â€” migrar renderSistemaFilhoManual
FunÃ§Ã£o migrada / criada: enderSistemaFilhoManual
cfg utilizado:
  panelId: sistema-filho-panel
  selfFn: enderSistemaFilhoManual
  voltarFn: echarSistemaFilho
  fecharFn: echarSistemaCompleto
  voltarLabel: Voltar ao sistema
Linhas antes / depois: ~97 linhas â†’ 9 linhas
node --check: OK
ValidaÃ§Ã£o visual: usuÃ¡rio validou abertura do painel filho em Sistemas, abas Resumido/Completo, navegaÃ§Ã£o entre passos, botÃ£o Voltar e botÃ£o X
Resultado: bloco validado
Commit: confirmado pelo usuÃ¡rio
ObservaÃ§Ãµes:
  - assinatura pÃºblica preservada

[LOG 04]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 4 â€” migrar renderServicoFilhoManual
FunÃ§Ã£o migrada / criada: enderServicoFilhoManual
cfg utilizado:
  panelId: servico-filho-panel
  selfFn: enderServicoFilhoManual
  voltarFn: echarServicoFilho
  fecharFn: echarServicoCompleto
  voltarLabel: Voltar ao serviÃ§o
Linhas antes / depois: ~96 linhas â†’ 9 linhas
node --check: OK
ValidaÃ§Ã£o visual: usuÃ¡rio validou pelo fluxo ServiÃ§os â†’ processo vinculado â†’ manual da etapa
Resultado: bloco validado
Commit: confirmado pelo usuÃ¡rio
ObservaÃ§Ãµes:
  - funÃ§Ã£o Ã© alcanÃ§Ã¡vel via processo do serviÃ§o
  - assinatura pÃºblica preservada

[LOG 05]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 5 â€” migrar renderSistemaNetoManual
FunÃ§Ã£o migrada / criada: enderSistemaNetoManual
cfg utilizado:
  panelId: sistema-neto-panel
  selfFn: enderSistemaNetoManual
  voltarFn: echarSistemaNetoFilho
  fecharFn: echarSistemaCompleto
  voltarLabel: Voltar ao processo
  processoId: preservado
Linhas antes / depois: ~96 linhas â†’ 10 linhas
node --check: OK
ValidaÃ§Ã£o visual: usuÃ¡rio validou o fluxo Sistema â†’ processo â†’ manual da etapa
Resultado: bloco validado
Commit: confirmado pelo usuÃ¡rio
ObservaÃ§Ãµes:
  - processoId mantido no cfg do helper

[LOG 06]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 6 â€” migrar renderServicoNetoManual
FunÃ§Ã£o migrada / criada: enderServicoNetoManual
cfg utilizado:
  panelId: servico-neto-panel
  selfFn: enderServicoNetoManual
  voltarFn: echarServicoNetoFilho
  fecharFn: echarServicoCompleto
  voltarLabel: Voltar ao processo
  processoId: preservado
Linhas antes / depois: ~96 linhas â†’ 10 linhas
node --check: OK
ValidaÃ§Ã£o visual: usuÃ¡rio validou o fluxo ServiÃ§os â†’ processo â†’ manual da etapa (painel neto)
Resultado: bloco validado
Commit: pendente de confirmaÃ§Ã£o do usuÃ¡rio
ObservaÃ§Ãµes:
  - processoId mantido no cfg do helper

[LOG 07]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js`r
Bloco: BLOCO 7 â€” criar _renderProcessoEmPainel
FunÃ§Ã£o migrada / criada: _renderProcessoEmPainel`r
cfg utilizado:
  panelId: parametrizado
  chipOnclick: parametrizado
  voltarFn: parametrizado
  fecharFn: parametrizado
  voltarLabel: parametrizado
  wrapScope: opcional
Linhas antes / depois: +49 linhas / -0 linhas
node --check: OK
ValidaÃ§Ã£o visual: nÃ£o aplicÃ¡vel neste bloco (criaÃ§Ã£o sem migraÃ§Ã£o)
Resultado: helper criado e pronto para os blocos 8 e 9
Commit: pendente de confirmaÃ§Ã£o do usuÃ¡rio
ObservaÃ§Ãµes:
  - helper cobre os dois contextos de processo em painel filho
  - wrapScope foi incluÃ­do para preservar o markup atual de sistema e serviÃ§o


[LOG 08]
Data: 2026-03-27
Agente: Codex
Arquivo: `script.js`
Bloco: BLOCO 8 — migrar `renderSistemaFilhoProcesso`
Função migrada / criada: `renderSistemaFilhoProcesso`
cfg utilizado:
  panelId: `sistema-filho-panel`
  chipOnclick: `abrirManualNoSistemaFilho`
  voltarFn: `fecharSistemaFilho`
  fecharFn: `fecharSistemaCompleto`
  voltarLabel: `Voltar ao sistema`
  wrapScope: `false`
Linhas antes / depois: +9 linhas / -45 linhas
node --check: OK
Validação visual: usuário validou o fluxo Sistemas → processo vinculado → timeline → manual da etapa
Resultado: bloco validado
Commit: pendente de confirmação do usuário
Observações:
  - helper `_renderProcessoEmPainel` reaproveitado sem alterar assinatura pública

[LOG 09]
Data: 2026-03-27
Agente: Codex
Arquivo: `script.js`
Bloco: BLOCO 9 — migrar `renderServicoFilhoProcesso`
Função migrada / criada: `renderServicoFilhoProcesso`
cfg utilizado:
  panelId: `servico-filho-panel`
  chipOnclick: `abrirManualNoServicoFilho`
  voltarFn: `fecharServicoFilho`
  fecharFn: `fecharServicoCompleto`
  voltarLabel: `Voltar ao serviço`
  wrapScope: `true`
Linhas antes / depois: +9 linhas / -46 linhas
node --check: OK
Validação visual: usuário validou o fluxo Serviços → processo vinculado → timeline → manual da etapa
Resultado: bloco validado
Commit: pendente de confirmação do usuário
Observações:
  - helper `_renderProcessoEmPainel` reaproveitado sem alterar assinatura pública

[LOG 09-R]
Data: 2026-03-27
Agente: Codex
Arquivo: `script.js`
Bloco: correção pós-validação do BLOCO 9
Função migrada / criada: `fecharServicoFilho`, `fecharServicoNetoFilho`, `fecharServicoCompleto`
cfg utilizado: não aplicável
Linhas antes / depois: +11 linhas / -0 linhas
node --check: OK
Validação visual: usuário validou retorno e fechamento no fluxo Serviço → processo e no manual aberto dentro do processo
Resultado: regressão corrigida
Commit: pendente de confirmação do usuário
Observações:
  - a migração do bloco 9 expôs a ausência das funções de fechamento do fluxo de serviços
  - funções restauradas sem alterar contratos públicos