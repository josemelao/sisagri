PLANO DE AÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â REFATORAÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O SEGURA V1.3
SisAgri / SMADER
Data de abertura: 2026-03-26
Status geral: PLANEJADO

==================================================================
0. OBJETIVO
==================================================================
Consolidar os renderizadores de painÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©is filho e neto em `script.js`,
eliminando ~480 linhas de lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³gica 100% duplicada por meio de dois
helpers parametrizados.

Escopo restrito a:
  - `script.js` (ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºnico arquivo alterado)
  - 7 funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes alvo (listadas na seÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o 3)
  - 2 helpers novos a criar (listados na seÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o 4)

Esta refatoraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O toca:
  - `admin.js`
  - `db.js`
  - `dados.js`
  - `index.html`, `style.css`
  - fluxo de `publish_status`
  - contratos de `DB.*`

PrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©-requisito: v1.2 concluÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­da e comitada na main. ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

==================================================================
1. CONTEXTO ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â POR QUE ESTA REFATORAÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O
==================================================================
Durante a v1.2 foram identificados 7 renderizadores em `script.js`
com lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³gica funcionalmente idÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âªntica. Por conterem callbacks inline
hardcoded (strings de `onclick` dentro de template literals), a
consolidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o exigia parametrizaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â custo alto para a v1.2.

A v1.3 ataca exatamente isso: extrai dois helpers com assinatura
clara, substitui as 7 funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes originais por chamadas a esses helpers,
e valida o comportamento de cada contexto (processo, sistema, serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o).

Resultado esperado: ~480 linhas ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ ~120 linhas. Zero perda funcional.

==================================================================
2. MAPEAMENTO DAS FUNÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ES ALVO
==================================================================
Arquivo: `script.js`

GRUPO A ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Renderizadores de manual em painel filho/neto (5 funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes)
Cada uma renderiza o mesmo conteÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºdo (tabs resumido/completo,
paginaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o de passos, documentos, observaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes) com apenas 4 variÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡veis:

  FunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o                    | panelId             | self (fn recursiva)            | voltar()               | fechar()
  --------------------------|---------------------|-------------------------------|------------------------|------------------
  renderManualFilho         | manual-filho-panel  | renderManualFilho             | fecharManualFilho      | fecharProcessoCompleto
  renderSistemaFilhoManual  | sistema-filho-panel | renderSistemaFilhoManual      | fecharSistemaFilho     | fecharSistemaCompleto
  renderServicoFilhoManual  | servico-filho-panel | renderServicoFilhoManual      | fecharServicoFilho     | fecharServicoCompleto
  renderSistemaNetoManual   | sistema-neto-panel  | renderSistemaNetoManual       | fecharSistemaNetoFilho | fecharSistemaCompleto
  renderServicoNetoManual   | servico-neto-panel  | renderServicoNetoManual       | fecharServicoNetoFilho | fecharServicoCompleto

  Tamanho atual: ~96 linhas cada = ~480 linhas totais
  Tamanho apÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³s consolidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o: ~5 linhas cada (chamada ao helper)

  Nota sobre renderManualFilho:
    - Recebe 3 parÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢metros: (m, modo, passoAtivo)
    - NÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o tem processoId (diferente dos netos)
    - Texto do botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o voltar: "Voltar ao processo"

  Nota sobre os netos (renderSistemaNetoManual, renderServicoNetoManual):
    - Recebem 4 parÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢metros: (m, modo, processoId, passoAtivo)
    - processoId ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© passado nos callbacks dos botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes de passo
    - Texto do botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o voltar: "Voltar ao processo"

  Nota sobre os filhos de sistema/serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o:
    - Recebem 3 parÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢metros: (m, modo, passoAtivo)
    - Texto do botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o voltar: "Voltar ao sistema" / "Voltar ao serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o"

GRUPO B ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Renderizadores de processo em painel filho (2 funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes)
Cada uma renderiza a timeline de etapas com chips de manuais vinculados,
diferindo apenas em 3 pontos:

  FunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o                     | panelId              | chip onclick               | voltar()            | fechar()               | texto voltar
  ---------------------------|----------------------|---------------------------|---------------------|------------------------|------------------
  renderSistemaFilhoProcesso | sistema-filho-panel  | abrirManualNoSistemaFilho | fecharSistemaFilho  | fecharSistemaCompleto  | Voltar ao sistema
  renderServicoFilhoProcesso | servico-filho-panel  | abrirManualNoServicoFilho | fecharServicoFilho  | fecharServicoCompleto  | Voltar ao serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o

  Tamanho atual: ~45 linhas cada = ~90 linhas totais
  Tamanho apÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³s consolidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o: ~5 linhas cada (chamada ao helper)

==================================================================
3. ESTRATÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°GIA DE CONSOLIDAÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O
==================================================================
3.1. Helper para manuais: _renderManualEmPainel(m, modo, passoAtivo, cfg)

  ParÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢metro cfg (objeto de configuraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o):
  {
    panelId:       string  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ID do elemento DOM do painel
    selfFn:        string  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â nome da funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o para os callbacks de onclick
    voltarFn:      string  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â nome da funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o chamada no botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o Voltar
    fecharFn:      string  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â nome da funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o chamada no botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o X
    voltarLabel:   string  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â texto do botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o Voltar (ex: "Voltar ao processo")
    processoId:    number  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â opcional, apenas para painÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©is neto
  }

  A funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o:
  1. ObtÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©m o elemento pelo panelId
  2. Monta as tabs usando selfFn nos onclicks
  3. Monta o conteÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºdo (resumido ou completo) usando selfFn e processoId
  4. Monta os documentos
  5. Escreve o innerHTML com voltarFn, fecharFn, voltarLabel

3.2. Helper para processos: _renderProcessoEmPainel(p, cfg)

  ParÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢metro cfg (objeto de configuraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o):
  {
    panelId:     string  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ID do elemento DOM do painel
    chipOnclick: string  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â nome da funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o chamada no chip de manual
    voltarFn:    string  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â nome da funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o chamada no botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o Voltar
    fecharFn:    string  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â nome da funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o chamada no botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o X
    voltarLabel: string  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â texto do botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o Voltar
  }

  A funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o:
  1. ObtÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©m o elemento pelo panelId
  2. Monta a timeline com etapas e chips usando chipOnclick
  3. Escreve o innerHTML com voltarFn, fecharFn, voltarLabel

3.3. Wrappers ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â as 7 funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes originais viram wrappers de 3-5 linhas:

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
4. ORDEM DE EXECUÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â BLOCOS
==================================================================
Executar nesta ordem exata. Um bloco por vez. NÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o avanÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ar sem commit.

BLOCO 1 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Criar _renderManualEmPainel (sem remover nada)
  - Inserir a nova funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o logo antes de renderManualFilho
  - NÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o alterar nenhuma das 5 funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes existentes ainda
  - Validar: node --check + abrir um manual dentro de um processo

BLOCO 2 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Migrar renderManualFilho para usar o helper
  - Substituir o corpo da funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o pela chamada ao helper com cfg
  - Validar: abrir manual dentro de processo (painel filho de processo)

BLOCO 3 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Migrar renderSistemaFilhoManual
  - Validar: abrir manual dentro de sistema

BLOCO 4 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Migrar renderServicoFilhoManual
  - Validar: abrir manual dentro de serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o

BLOCO 5 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Migrar renderSistemaNetoManual
  - Validar: abrir sistema ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ processo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ manual (painel neto)

BLOCO 6 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Migrar renderServicoNetoManual
  - Validar: abrir serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ processo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ manual (painel neto)

BLOCO 7 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Criar _renderProcessoEmPainel (sem remover nada)
  - Inserir a nova funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o logo antes de renderSistemaFilhoProcesso
  - NÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o alterar nenhuma das 2 funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes existentes ainda
  - Validar: node --check

BLOCO 8 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Migrar renderSistemaFilhoProcesso
  - Validar: abrir processo dentro de sistema

BLOCO 9 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Migrar renderServicoFilhoProcesso
  - Validar: abrir processo dentro de serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o

BLOCO 10 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Limpeza final
  - Remover qualquer comentÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio residual
  - node --check final
  - Confirmar zero funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes duplicadas

==================================================================
5. PROTOCOLO OBRIGATÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œRIO POR BLOCO
==================================================================
Cada agente deve seguir esta ordem em cada bloco:

PASSO 1 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Ler o estado atual do arquivo antes de editar
  Nunca editar com base em contexto antigo. Sempre reler.

PASSO 2 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Localizar a funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o alvo com grep + nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºmero de linha
  Confirmar inÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­cio e fim antes de qualquer alteraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o.

PASSO 3 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Para blocos de criaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o (1 e 7):
  Inserir a nova funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o em posiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o que nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o quebre o fluxo.
  NÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o remover nada. Validar sintaxe.

PASSO 4 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Para blocos de migraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o (2 a 6, 8 e 9):
  a) Confirmar que o helper do bloco anterior estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ presente
  b) Substituir apenas o corpo da funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o (manter assinatura idÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âªntica)
  c) Manter o nome da funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o renomear
  d) Validar sintaxe com node --check
  e) Validar manualmente o fluxo afetado
  f) Commitar antes de avanÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ar

PASSO 5 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Registrar no log antes de avanÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ar
  NÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o pular o log mesmo que o bloco pareÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§a simples.

REGRAS ADICIONAIS:
  - Nunca alterar a assinatura das funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes pÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºblicas
  - Nunca renomear fecharManualFilho, fecharSistemaFilho etc.
  - Nunca alterar os IDs de painel (manual-filho-panel etc.)
  - Se qualquer teste visual falhar: parar, reportar, nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o avanÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ar
  - Se node --check falhar: restaurar o backup antes de tentar novamente

==================================================================
6. VALIDAÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O POR BLOCO
==================================================================
6.1. ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o de sintaxe (todos os blocos)
  node --check script.js && echo "OK"

6.2. ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o visual ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Grupo A (blocos 2 a 6)
  Para cada bloco migrado, testar o caminho completo:

  Bloco 2 (renderManualFilho):
    Processos ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ abrir qualquer processo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ clicar em chip de manual ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    painel filho deve abrir com tabs Resumido/Completo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    navegar entre passos ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ fechar com X e com botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o Voltar

  Bloco 3 (renderSistemaFilhoManual):
    Sistemas ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ abrir qualquer sistema que tenha manuais vinculados ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    clicar no chip de manual ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ painel filho deve abrir ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    testar tabs e navegaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o entre passos

  Bloco 4 (renderServicoFilhoManual):
    ServiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§os ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ abrir qualquer serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ (se tiver processo vinculado,
    abrir o processo) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ clicar em chip de manual ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ painel deve abrir

  Bloco 5 (renderSistemaNetoManual):
    Sistemas ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ abrir sistema ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ abrir processo vinculado ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    clicar em chip de manual dentro de uma etapa ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    painel neto deve abrir com processoId correto nos callbacks

  Bloco 6 (renderServicoNetoManual):
    ServiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§os ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ abrir serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ abrir processo vinculado ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    clicar em chip de manual dentro de uma etapa ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    painel neto deve abrir

6.3. ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o visual ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Grupo B (blocos 8 e 9)
  Bloco 8 (renderSistemaFilhoProcesso):
    Sistemas ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ abrir sistema com processo vinculado ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    clicar no chip de processo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ timeline deve aparecer ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    chips de manuais dentro das etapas devem funcionar ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o Voltar deve retornar ao painel do sistema

  Bloco 9 (renderServicoFilhoProcesso):
    ServiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§os ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ abrir serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o com processo vinculado ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢
    clicar no chip de processo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ timeline ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ manuais nas etapas

6.4. ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o de regressÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o (bloco 10)
  Testar todos os caminhos de 6.2 e 6.3 novamente apÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³s a limpeza.
  Confirmar que nenhum painel abre em branco ou com erro no console.

==================================================================
7. ANTI-PADRÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ES PROIBIDOS
==================================================================
1. Alterar a assinatura das 7 funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes pÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºblicas
2. Renomear qualquer funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o fechar* ou abrir*
3. Remover funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o antes de validar que o helper funciona
4. AvanÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ar para o prÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ximo bloco sem commit do bloco atual
5. Combinar criaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do helper + migraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o de todas as funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes em 1 commit
6. Editar com base em contexto de conversa anterior sem reler o arquivo
7. Usar eval() ou Function() para parametrizar os callbacks
8. Passar funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes como referÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âªncia direta ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â usar sempre string com nome

==================================================================
8. CRITÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°RIOS DE CONCLUSÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O DA V1.3
==================================================================
Esta frente pode ser considerada bem-sucedida quando:

1. _renderManualEmPainel existe e ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© a ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºnica implementaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o da lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³gica
2. _renderProcessoEmPainel existe e ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© a ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºnica implementaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o da lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³gica
3. As 7 funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes pÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºblicas continuam existindo com a mesma assinatura
4. Cada uma delas ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© um wrapper de ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€šÃ‚Â¤5 linhas
5. node --check OK
6. Todos os caminhos de 6.2 e 6.3 validados manualmente
7. Todos os blocos registrados em log
8. Nenhuma regressÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o confirmada pelo usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio

==================================================================
9. QUANDO PARAR E ESCALAR
==================================================================
Parar imediatamente se:
1. Qualquer painel abrir em branco apÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³s migraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o
2. Erro de console ao navegar entre passos
3. BotÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o Voltar ou X nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o funcionar apÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³s migraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o
4. processoId nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o chegar corretamente nos callbacks dos netos
5. node --check falhar

Nesses casos:
  - nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o tentar corrigir no impulso
  - restaurar o arquivo do commit anterior
  - registrar a falha no log com o trecho exato que causou o problema
  - propor nova abordagem antes de reexecutar

==================================================================
10. CHECKLIST DE EXECUÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O POR BLOCO
==================================================================
[ ] Arquivo relido antes de editar
[ ] FunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o alvo localizada com grep (linha confirmada)
[ ] Para criaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o: posiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o de inserÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o definida
[ ] Para migraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o: cfg completo mapeado (panelId, selfFn, voltarFn, fecharFn, voltarLabel, processoId?)
[ ] Patch aplicado
[ ] node --check OK
[ ] ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o visual executada conforme seÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o 6
[ ] Log registrado
[ ] Commit feito
[ ] PrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ximo bloco iniciado somente apÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³s confirmaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o

==================================================================
11. MODELO DE LOG OPERACIONAL
==================================================================
[LOG XX]
Data:
Agente:
Arquivo:
Bloco:
FunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o migrada / criada:
cfg utilizado (para migraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o):
Linhas antes / depois:
node --check:
ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o visual:
Resultado:
Commit:
ObservaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes:

==================================================================
12. ROTEIRO DE EXECUÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O
==================================================================
FASE 1 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â GRUPO A (manual em painel)
1. [x] BLOCO 1 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â criar _renderManualEmPainel
2. [x] BLOCO 2 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â migrar renderManualFilho
3. [x] BLOCO 3 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â migrar renderSistemaFilhoManual
4. [x] BLOCO 4 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â migrar renderServicoFilhoManual
5. [x] BLOCO 5 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â migrar renderSistemaNetoManual
6. [x] BLOCO 6 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â migrar renderServicoNetoManual

FASE 2 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â GRUPO B (processo em painel)
7. [x] BLOCO 7 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â criar _renderProcessoEmPainel
8. [x] BLOCO 8 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â migrar renderSistemaFilhoProcesso
9. [x] BLOCO 9 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â migrar renderServicoFilhoProcesso

FASE 3 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ENCERRAMENTO
10. [x] BLOCO 10 Ã¢â‚¬â€ limpeza final e validaÃƒÂ§ÃƒÂ£o de regressÃƒÂ£o
11. [x] Registro de conclusão

==================================================================
13. RECOMENDAÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O FINAL AOS PRÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œXIMOS AGENTES
==================================================================
Esta refatoraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© cirÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºrgica, mas exige atenÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o aos callbacks inline.

O risco principal nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© a lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³gica em si, e sim as strings de onclick
dentro dos template literals. Cada funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o precisa referenciar a si
mesma pelo nome correto. Um erro no selfFn nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o quebra a sintaxe, mas
quebra a navegaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o entre passos silenciosamente.

Antes de qualquer migraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o:
1. Confirmar o cfg completo lendo a funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o original
2. Checar o processoId ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ele aparece apenas nos netos (blocos 5 e 6)
3. Checar o oltarLabel ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“Voltar ao processoÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â vs ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“Voltar ao sistemaÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â vs ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“Voltar ao serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§oÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â
4. Testar a navegaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o entre passos, nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ a abertura do painel

A validaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o mais importante ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©:
navegar do passo 1 ao passo 3 e voltar ao passo 1 dentro do painel
filho/neto. Isso confirma que selfFn e processoId estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o corretos.

Sempre:
1. reler antes
2. mapear o cfg antes de escrever
3. validar a navegaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o entre passos
4. commitar bloco a bloco
5. nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o avanÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ar sem confirmaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio

==================================================================
14. LOG DE EXECUÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢O
==================================================================
[LOG 00]
Data: 2026-03-26
Agente: Claude Sonnet 4.6
Arquivo: plano-refatoracao-v1.3.md
Bloco: abertura do plano
FunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o migrada / criada: nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o aplicÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡vel
cfg utilizado: nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o aplicÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡vel
Linhas antes / depois: nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o aplicÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡vel
node --check: nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o aplicÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡vel
ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o visual: nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o aplicÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡vel
Resultado: plano operacional criado com base no mapeamento da v1.2
Commit: pendente de validaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio
ObservaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes:
  FunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes alvo mapeadas com linhas exatas no estado pÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³s-v1.2:
    renderManualFilho: linhas 1194-1289 (96 linhas)
    renderSistemaFilhoManual: linhas 3082-3178 (97 linhas)
    renderSistemaFilhoProcesso: linhas 3180-3224 (45 linhas)
    renderServicoFilhoProcesso: linhas 3431-3476 (46 linhas)
    renderServicoFilhoManual: linhas 3478-3573 (96 linhas)
    renderSistemaNetoManual: linhas 3594-3689 (96 linhas)
    renderServicoNetoManual: linhas 3695-3790 (96 linhas)
  Total atual: ~572 linhas para ~480 linhas de lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³gica duplicada
  Total esperado apÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³s v1.3: ~120 linhas (helpers + wrappers)

[LOG 03]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 3 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â migrar renderSistemaFilhoManual
FunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o migrada / criada: enderSistemaFilhoManual
cfg utilizado:
  panelId: sistema-filho-panel
  selfFn: enderSistemaFilhoManual
  voltarFn: echarSistemaFilho
  fecharFn: echarSistemaCompleto
  voltarLabel: Voltar ao sistema
Linhas antes / depois: ~97 linhas ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ 9 linhas
node --check: OK
ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o visual: usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio validou abertura do painel filho em Sistemas, abas Resumido/Completo, navegaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o entre passos, botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o Voltar e botÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o X
Resultado: bloco validado
Commit: confirmado pelo usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio
ObservaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes:
  - assinatura pÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºblica preservada

[LOG 04]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 4 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â migrar renderServicoFilhoManual
FunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o migrada / criada: enderServicoFilhoManual
cfg utilizado:
  panelId: servico-filho-panel
  selfFn: enderServicoFilhoManual
  voltarFn: echarServicoFilho
  fecharFn: echarServicoCompleto
  voltarLabel: Voltar ao serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o
Linhas antes / depois: ~96 linhas ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ 9 linhas
node --check: OK
ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o visual: usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio validou pelo fluxo ServiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§os ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ processo vinculado ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ manual da etapa
Resultado: bloco validado
Commit: confirmado pelo usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio
ObservaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes:
  - funÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© alcanÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡vel via processo do serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o
  - assinatura pÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºblica preservada

[LOG 05]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 5 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â migrar renderSistemaNetoManual
FunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o migrada / criada: enderSistemaNetoManual
cfg utilizado:
  panelId: sistema-neto-panel
  selfFn: enderSistemaNetoManual
  voltarFn: echarSistemaNetoFilho
  fecharFn: echarSistemaCompleto
  voltarLabel: Voltar ao processo
  processoId: preservado
Linhas antes / depois: ~96 linhas ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ 10 linhas
node --check: OK
ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o visual: usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio validou o fluxo Sistema ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ processo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ manual da etapa
Resultado: bloco validado
Commit: confirmado pelo usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio
ObservaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes:
  - processoId mantido no cfg do helper

[LOG 06]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js
Bloco: BLOCO 6 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â migrar renderServicoNetoManual
FunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o migrada / criada: enderServicoNetoManual
cfg utilizado:
  panelId: servico-neto-panel
  selfFn: enderServicoNetoManual
  voltarFn: echarServicoNetoFilho
  fecharFn: echarServicoCompleto
  voltarLabel: Voltar ao processo
  processoId: preservado
Linhas antes / depois: ~96 linhas ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ 10 linhas
node --check: OK
ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o visual: usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio validou o fluxo ServiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§os ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ processo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ manual da etapa (painel neto)
Resultado: bloco validado
Commit: pendente de confirmaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio
ObservaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes:
  - processoId mantido no cfg do helper

[LOG 07]
Data: 2026-03-27
Agente: Codex
Arquivo: script.js`r
Bloco: BLOCO 7 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â criar _renderProcessoEmPainel
FunÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o migrada / criada: _renderProcessoEmPainel`r
cfg utilizado:
  panelId: parametrizado
  chipOnclick: parametrizado
  voltarFn: parametrizado
  fecharFn: parametrizado
  voltarLabel: parametrizado
  wrapScope: opcional
Linhas antes / depois: +49 linhas / -0 linhas
node --check: OK
ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o visual: nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o aplicÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡vel neste bloco (criaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o sem migraÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o)
Resultado: helper criado e pronto para os blocos 8 e 9
Commit: pendente de confirmaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do usuÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio
ObservaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes:
  - helper cobre os dois contextos de processo em painel filho
  - wrapScope foi incluÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­do para preservar o markup atual de sistema e serviÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§o


[LOG 08]
Data: 2026-03-27
Agente: Codex
Arquivo: `script.js`
Bloco: BLOCO 8 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â migrar `renderSistemaFilhoProcesso`
FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o migrada / criada: `renderSistemaFilhoProcesso`
cfg utilizado:
  panelId: `sistema-filho-panel`
  chipOnclick: `abrirManualNoSistemaFilho`
  voltarFn: `fecharSistemaFilho`
  fecharFn: `fecharSistemaCompleto`
  voltarLabel: `Voltar ao sistema`
  wrapScope: `false`
Linhas antes / depois: +9 linhas / -45 linhas
node --check: OK
ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o visual: usuÃƒÆ’Ã‚Â¡rio validou o fluxo Sistemas ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ processo vinculado ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ timeline ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ manual da etapa
Resultado: bloco validado
Commit: pendente de confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do usuÃƒÆ’Ã‚Â¡rio
ObservaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes:
  - helper `_renderProcessoEmPainel` reaproveitado sem alterar assinatura pÃƒÆ’Ã‚Âºblica

[LOG 09]
Data: 2026-03-27
Agente: Codex
Arquivo: `script.js`
Bloco: BLOCO 9 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â migrar `renderServicoFilhoProcesso`
FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o migrada / criada: `renderServicoFilhoProcesso`
cfg utilizado:
  panelId: `servico-filho-panel`
  chipOnclick: `abrirManualNoServicoFilho`
  voltarFn: `fecharServicoFilho`
  fecharFn: `fecharServicoCompleto`
  voltarLabel: `Voltar ao serviÃƒÆ’Ã‚Â§o`
  wrapScope: `true`
Linhas antes / depois: +9 linhas / -46 linhas
node --check: OK
ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o visual: usuÃƒÆ’Ã‚Â¡rio validou o fluxo ServiÃƒÆ’Ã‚Â§os ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ processo vinculado ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ timeline ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ manual da etapa
Resultado: bloco validado
Commit: pendente de confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do usuÃƒÆ’Ã‚Â¡rio
ObservaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes:
  - helper `_renderProcessoEmPainel` reaproveitado sem alterar assinatura pÃƒÆ’Ã‚Âºblica

[LOG 09-R]
Data: 2026-03-27
Agente: Codex
Arquivo: `script.js`
Bloco: correÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o pÃƒÆ’Ã‚Â³s-validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do BLOCO 9
FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o migrada / criada: `fecharServicoFilho`, `fecharServicoNetoFilho`, `fecharServicoCompleto`
cfg utilizado: nÃƒÆ’Ã‚Â£o aplicÃƒÆ’Ã‚Â¡vel
Linhas antes / depois: +11 linhas / -0 linhas
node --check: OK
ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o visual: usuÃƒÆ’Ã‚Â¡rio validou retorno e fechamento no fluxo ServiÃƒÆ’Ã‚Â§o ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ processo e no manual aberto dentro do processo
Resultado: regressÃƒÆ’Ã‚Â£o corrigida
Commit: pendente de confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do usuÃƒÆ’Ã‚Â¡rio
ObservaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes:
  - a migraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do bloco 9 expÃƒÆ’Ã‚Â´s a ausÃƒÆ’Ã‚Âªncia das funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de fechamento do fluxo de serviÃƒÆ’Ã‚Â§os
  - funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes restauradas sem alterar contratos pÃƒÆ’Ã‚Âºblicos
[LOG 10]
Data: 2026-03-27
Agente: Codex
Arquivo: `script.js`
Bloco: BLOCO 10 Ã¢â‚¬â€ limpeza final e validaÃƒÂ§ÃƒÂ£o de regressÃƒÂ£o
FunÃƒÂ§ÃƒÂ£o migrada / criada: nÃƒÂ£o aplicÃƒÂ¡vel
cfg utilizado: nÃƒÂ£o aplicÃƒÂ¡vel
Linhas antes / depois: +0 linhas / -0 linhas
node --check: OK
ValidaÃƒÂ§ÃƒÂ£o visual: validaÃƒÂ§ÃƒÂ£o estrutural final concluÃƒÂ­da; sem novos fluxos alterados neste bloco
Resultado: funÃƒÂ§ÃƒÂµes-alvo finais confirmadas como wrappers/helpers sem corpos duplicados remanescentes
Commit: pendente de confirmaÃƒÂ§ÃƒÂ£o do usuÃƒÂ¡rio
ObservaÃƒÂ§ÃƒÂµes:
  - checagem final nas funÃƒÂ§ÃƒÂµes alvo: `renderManualFilho`, `renderSistemaFilhoManual`, `renderServicoFilhoManual`, `renderSistemaNetoManual`, `renderServicoNetoManual`, `renderSistemaFilhoProcesso`, `renderServicoFilhoProcesso`
  - helpers finais confirmados: `_renderManualEmPainel` e `_renderProcessoEmPainel`
  - regressÃƒÂ£o do fluxo de serviÃƒÂ§os permaneceu corrigida apÃƒÂ³s validaÃƒÂ§ÃƒÂ£o final
[LOG 11]
Data: 2026-03-27
Agente: Codex
Arquivo: `plano-refatoracao-v1.3.md`
Bloco: encerramento da v1.3
FunÃ§Ã£o migrada / criada: nÃ£o aplicÃ¡vel
cfg utilizado: nÃ£o aplicÃ¡vel
Linhas antes / depois: nÃ£o aplicÃ¡vel
node --check: consolidado no BLOCO 10
ValidaÃ§Ã£o visual: concluÃ­da ao longo dos blocos validados pelo usuÃ¡rio
Resultado: plano v1.3 encerrado
Commit: pendente de confirmaÃ§Ã£o do usuÃ¡rio
ObservaÃ§Ãµes:
  - a v1.3 nÃ£o unificou todas as funÃ§Ãµes pÃºblicas em uma sÃ³; isso foi intencional para preservar compatibilidade e reduzir risco
  - o ganho principal foi remover a lÃ³gica pesada duplicada de dentro das funÃ§Ãµes especÃ­ficas e centralizar essa lÃ³gica em helpers reaproveitÃ¡veis
  - as funÃ§Ãµes especÃ­ficas por mÃ³dulo foram mantidas como wrappers finos para preservar contexto, callbacks, rÃ³tulos e contratos jÃ¡ usados pelo app
  - ganho real em manutenÃ§Ã£o: menos pontos para corrigir quando houver ajuste em painÃ©is de manual/processo
  - ganho real em prevenÃ§Ã£o de bugs: menor chance de um fluxo receber correÃ§Ã£o e outro equivalente ficar para trÃ¡s
  - ganho real em escalabilidade: novos painÃ©is do mesmo tipo podem reaproveitar `_renderManualEmPainel` e `_renderProcessoEmPainel`
  - ganho em performance existe, mas Ã© secundÃ¡rio; o foco principal desta etapa foi reduzir duplicaÃ§Ã£o e divergÃªncia de comportamento

Resumo leigo do que foi feito:
  - antes, o sistema tinha vÃ¡rias funÃ§Ãµes diferentes com trechos grandes quase iguais
  - agora, a parte repetida ficou centralizada em poucas funÃ§Ãµes internas reutilizÃ¡veis
  - as entradas especÃ­ficas de cada mÃ³dulo continuam existindo, mas sÃ³ para dizer qual painel abrir, para onde voltar e qual contexto usar
  - isso deixa o cÃ³digo mais previsÃ­vel, mais fÃ¡cil de manter e menos propenso a bugs silenciosos
