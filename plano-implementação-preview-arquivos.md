# Plano de Implementação — Preview de Arquivos no Painel de Detalhes

## 1. Objetivo
Implementar preview de arquivos no painel de detalhes do módulo **Arquivos** no app público (`index.html` / `script.js`), com foco em:

- mudança mínima
- compatibilidade máxima
- fallback seguro
- validação por blocos pequenos
- zero impacto estrutural fora do fluxo de detalhes de arquivos

O objetivo **não** é redesenhar o painel, refatorar a SPA, nem alterar contratos de persistência.

---

## 2. Escopo exato
O preview será considerado **apenas** dentro do painel aberto ao selecionar um item em:

- `index.html` → módulo `Arquivos`

Fluxo alvo:

1. usuário abre o módulo `Arquivos`
2. usuário seleciona um arquivo
3. o painel de detalhes abre
4. o painel mostra, quando possível, uma pré-visualização do arquivo

Fora do escopo:

- upload/admin
- mudança em `db.js`
- mudança em `admin.js`
- mudança em Storage
- preview em outros módulos
- OCR, conversão de formato, renderização externa

---

## 3. Regra mestra de implementação
Neste plano, o padrão correto é:

1. tocar **somente** `script.js`
2. opcionalmente tocar `style.css` apenas se o preview precisar de ajuste visual mínimo
3. não alterar o contrato dos objetos de `arquivos`
4. não mexer em `db.js`
5. não quebrar os botões já existentes de download / link externo
6. não remover nenhuma ação atual do painel

Se a solução exigir algo fora disso, **parar e registrar no log antes de seguir**.

---

## 4. Comportamento esperado

### 4.1 Tipos com preview na v1
Implementar preview apenas para:

- `pdf`
- imagens:
  - `png`
  - `jpg`
  - `jpeg`
  - `webp`
  - `gif`

### 4.2 Tipos sem preview na v1
Manter sem embed visual:

- `doc`
- `docx`
- `xls`
- `xlsx`
- `ppt`
- `pptx`
- `zip`
- `rar`
- `7z`
- `txt` (opcional futuro)
- qualquer outro tipo não suportado

### 4.3 Fallback obrigatório
Quando não houver preview:

- manter os botões existentes
- mostrar mensagem simples:
  - `Pré-visualização não disponível para este tipo de arquivo.`

### 4.4 Condições obrigatórias para mostrar preview
Só renderizar preview quando:

- existir `url` válida
- o tipo/extensão for suportado
- não houver erro óbvio de renderização no navegador

Se qualquer uma dessas condições falhar:

- usar fallback textual
- nunca quebrar a abertura do painel

---

## 5. Estratégia técnica recomendada

### 5.1 Abordagem mínima
Criar um helper local no `script.js`, por exemplo:

- `getArquivoPreviewHTML(a)`

Responsabilidade:

- receber o registro do arquivo
- detectar tipo suportado
- devolver o HTML do preview ou do fallback

### 5.2 Onde integrar
Localizar a função que monta o painel de detalhes de arquivos.

No estado atual, o alvo esperado é o bloco que escreve em:

- `arquivo-detail-content`

Adicionar o preview **dentro do painel existente**, sem mudar a arquitetura de navegação.

### 5.3 Regras de renderização

#### PDF
Usar embed leve, por exemplo:

- `iframe`
ou
- `embed`

com altura fixa/modesta e container próprio.

#### Imagem
Usar:

- `<img>`

com:

- largura total do container
- borda leve
- raio compatível com a UI atual
- sem distorção

#### Tipos não suportados
Mostrar bloco textual de fallback.

---

## 6. Riscos conhecidos

### 6.1 PDFs
Risco:

- alguns navegadores podem tratar `iframe`/`embed` de PDF de forma diferente

Tratamento:

- o painel deve continuar funcional mesmo sem renderizar o documento
- os botões de abrir/baixar continuam sendo a rota principal de segurança

### 6.2 Links externos
Risco:

- URLs externas podem bloquear embed por `X-Frame-Options` / CSP

Tratamento:

- não tentar forçar preview externo se a origem não permitir
- usar fallback textual nesses casos

### 6.3 Storage / acessibilidade da URL
Risco:

- URL pode existir mas não estar acessível

Tratamento:

- preview é complementar
- nunca substituir os botões atuais

---

## 7. Arquivos permitidos por fase

### Fase principal
- `script.js`

### Fase opcional de acabamento visual
- `style.css`

**Proibido nesta implementação:**

- `db.js`
- `admin.js`
- `dados.js`
- `index.html`

exceto se surgir bloqueio real e isso for registrado antes no log.

---

## 8. Plano de execução por blocos

## 8.1 BLOCO 1 — Mapeamento do painel atual
Objetivo:

- localizar a função exata que monta o painel de detalhes de arquivos
- identificar onde o bloco de preview deve entrar

Fazer:

1. localizar `arquivo-detail-content`
2. localizar função que monta botões/metadata
3. identificar se já existe helper de tipo/link reutilizável

Validação:

- nenhuma alteração ainda
- apenas mapeamento confirmado

Critério de conclusão:

- ponto exato de inserção documentado no log

---

## 8.2 BLOCO 2 — Helper de detecção
Objetivo:

- criar helper local e pequeno para decidir se há preview e de qual tipo

Fazer:

1. criar helper para detectar extensão/tipo
2. classificar:
   - `pdf`
   - `imagem`
   - `sem_preview`

Validação:

- `node --check script.js`

Critério de conclusão:

- helper criado sem afetar o fluxo atual

---

## 8.3 BLOCO 3 — Preview de imagem
Objetivo:

- suportar preview visual para arquivos de imagem

Fazer:

1. renderizar `<img>` no painel
2. manter botões existentes abaixo ou junto do bloco
3. não quebrar o layout atual

Validação visual:

1. abrir um arquivo de imagem
2. verificar se o preview aparece
3. verificar se o download ainda funciona
4. verificar se o painel continua abrindo/fechando normalmente

Critério de conclusão:

- preview de imagem funcional e sem regressão visual evidente

---

## 8.4 BLOCO 4 — Preview de PDF
Objetivo:

- suportar preview embutido de PDF

Fazer:

1. renderizar `iframe` ou `embed`
2. limitar o tamanho visual
3. manter fallback se o navegador não exibir bem

Validação visual:

1. abrir um PDF
2. verificar se o documento carrega
3. verificar se os botões continuam disponíveis
4. verificar que o painel não quebra se o preview falhar

Critério de conclusão:

- preview de PDF funcional ou fallback limpo

---

## 8.5 BLOCO 5 — Fallback para tipos sem preview
Objetivo:

- garantir comportamento coerente para tipos não suportados

Fazer:

1. mostrar mensagem padrão
2. manter botões de ação atuais
3. não exibir área quebrada/vazia

Validação visual:

1. abrir `docx`, `zip`, `rar` ou outro tipo não suportado
2. confirmar mensagem de fallback
3. confirmar que baixar/abrir continua disponível

Critério de conclusão:

- fallback coerente e estável

---

## 8.6 BLOCO 6 — Acabamento visual mínimo
Objetivo:

- ajustar espaçamento, borda e altura do preview apenas se necessário

Fazer:

1. tocar `style.css` somente se o layout realmente exigir
2. adicionar classes específicas
3. evitar impacto global

Validação:

- desktop
- mobile
- nenhum impacto em outros painéis

Critério de conclusão:

- preview legível e integrado à UI

---

## 8.7 BLOCO 7 — Varredura de regressão
Objetivo:

- garantir que o detalhe de arquivos continua estável

Validar:

1. abrir item com preview de imagem
2. abrir item com preview de PDF
3. abrir item sem preview
4. baixar arquivo
5. abrir link externo, se existir
6. fechar/reabrir painel
7. navegar entre itens diferentes

Critério de conclusão:

- sem erro de sintaxe
- sem painel quebrado
- sem perda das ações anteriores

---

## 9. Critérios de parada
Parar e alinhar antes de seguir se ocorrer qualquer um destes:

1. necessidade de alterar `db.js`
2. necessidade de alterar estrutura HTML do painel fora do bloco local
3. quebra de download existente
4. preview exigir conversão remota ou biblioteca externa
5. embed externo bloquear o painel de forma não contornável

---

## 10. Regras de validação

### 10.1 Validação técnica obrigatória
Ao fim de cada bloco com código:

```bash
node --check "C:\Users\PICHAU\Desktop\SisAgri\script.js"
```

Se `style.css` for tocado, não precisa ferramenta extra, mas o bloco deve ter validação visual.

### 10.2 Validação manual obrigatória
O usuário deve validar no navegador antes de marcar bloco como concluído.

### 10.3 Commit
Só gerar commit depois da validação explícita do usuário.

---

## 11. Regras de implementação para agentes

### Fazer
- patch pequeno
- helper local
- reaproveitar lógica atual
- preservar download e link externo
- documentar cada bloco no log

### Não fazer
- refatorar módulo inteiro de arquivos
- criar sistema novo de preview global
- mover lógica para vários arquivos
- alterar contratos de `DB.*`
- alterar dados persistidos

---

## 12. Modelo obrigatório de log
Todo agente que atuar neste plano deve registrar um log ao final de cada bloco validado:

```md
[LOG XX]
Data:
Agente:
Arquivo:
Bloco:
Função migrada / criada:
Linhas antes / depois:
node --check:
Validação visual:
Resultado:
Commit:
Observações:
```

---

## 13. Sequência recomendada
Executar nesta ordem:

1. bloco 1
2. bloco 2
3. bloco 3
4. bloco 4
5. bloco 5
6. bloco 6
7. bloco 7

Não pular do mapeamento direto para acabamento visual.

---

## 14. Registro de Logs - após cada validação do usuário, inserir log

[LOG 00]
Data: 2026-03-27
Agente: GPT-5.2
Arquivo: `plano-implementação-preview-arquivos.md`
Bloco: abertura do plano
Função migrada / criada: não aplicável
Linhas antes / depois: não aplicável
node --check: não aplicável
Validação visual: não aplicável
Resultado: plano operacional criado para implementar preview de arquivos com baixo risco no painel de detalhes
Commit: pendente
Observações:
  - Escopo inicial limitado a `pdf` + imagens
  - Fallback obrigatório para tipos não suportados
  - Implementação pensada para ocorrer preferencialmente só em `script.js`
  - `style.css` só entra se o preview realmente exigir ajuste visual mínimo

