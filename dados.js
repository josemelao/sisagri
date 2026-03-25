/**
 * ============================================================
 * SMADER — dados.js
 * Banco de dados local da aplicação.
 *
 * COMO FUNCIONA:
 *  - Localmente: este arquivo é carregado via <script> e expõe
 *    window.DADOS_INICIAIS com os dados de fábrica.
 *  - O sistema verifica o localStorage na inicialização:
 *    se houver dados salvos, usa-os; caso contrário usa este arquivo.
 *  - O painel Admin permite editar tudo e salvar no localStorage.
 *  - O botão "Exportar dados.js" gera este arquivo atualizado para
 *    substituição permanente (quando quiser "commitar" os dados).
 *
 * MIGRAÇÃO PARA SUPABASE:
 *  - Substituir a leitura de window.DADOS_INICIAIS por chamadas
 *    ao Supabase Client em db.js. A interface da aplicação não muda.
 * ============================================================
 */

window.DADOS_INICIAIS = {

  funcionarios: [
    {
      id: 1,
      nome: "Ana Paula Ferreira",
      cargo: "Engenheira Agrônoma",
      setor: "Fiscalização e Defesa Agropecuária",
      telefone: "(62) 3311-2001",
      email: "ana.ferreira@smader.go.gov.br",
      foto: "",
      descricao: "Responsável pela fiscalização de insumos agrícolas, aplicação de normas sanitárias em propriedades rurais e emissão de laudos técnicos. Coordena vistorias de campo e atende produtores no Escritório Regional."
    },
    {
      id: 2,
      nome: "Carlos Eduardo Lima",
      cargo: "Engenheiro Agrônomo Sênior",
      setor: "Fiscalização e Defesa Agropecuária",
      telefone: "(62) 3311-2003",
      email: "carlos.lima@smader.go.gov.br",
      foto: "",
      descricao: "Coordena a equipe de fiscalização, elabora relatórios gerenciais e responde à chefia pelo setor. Atua como substituto da chefia quando necessário. Especialista em agrotóxicos e certificação de sementes."
    },
    {
      id: 3,
      nome: "Márcia Oliveira Santos",
      cargo: "Técnica Administrativa",
      setor: "Administração e Finanças",
      telefone: "(62) 3311-2010",
      email: "marcia.santos@smader.go.gov.br",
      foto: "",
      descricao: "Responsável pelo protocolo e tramitação de documentos, controle de ponto, gestão de contratos de fornecedores e suporte administrativo geral da secretaria. Ponto focal para solicitações de materiais."
    },
    {
      id: 4,
      nome: "Roberto Alves Nascimento",
      cargo: "Analista de TI",
      setor: "Infraestrutura e Tecnologia",
      telefone: "(62) 3311-2030",
      email: "roberto.nascimento@smader.go.gov.br",
      foto: "",
      descricao: "Gerencia a infraestrutura de TI da secretaria, oferece suporte técnico aos servidores, administra os sistemas internos e controla os equipamentos patrimoniais de informática."
    },
    {
      id: 5,
      nome: "Fernanda Costa Braga",
      cargo: "Agente de Desenvolvimento Rural",
      setor: "Extensão Rural e Assistência Técnica",
      telefone: "(62) 3311-2040",
      email: "fernanda.braga@smader.go.gov.br",
      foto: "",
      descricao: "Presta assistência técnica a agricultores familiares, coordena programas de extensão rural, elabora projetos para captação de recursos junto ao governo federal e realiza cadastramento no Pronaf."
    },
    {
      id: 6,
      nome: "José Antônio Pereira",
      cargo: "Chefe de Departamento",
      setor: "Gabinete e Gestão",
      telefone: "(62) 3311-2000",
      email: "jose.pereira@smader.go.gov.br",
      foto: "",
      descricao: "Chefia o Departamento Técnico, coordena as equipes de fiscalização e extensão, assina documentos oficiais e representa a secretaria em reuniões externas. Ponto de escalonamento para demandas complexas."
    }
  ],

  manuais: [
    {
      id: 1,
      titulo: "Manual de Protocolo de Documentos",
      categoria: "Administrativo",
      passos: [
        { texto: "Receber o documento físico ou digital na recepção ou e-mail institucional.", imagem: "https://images.unsplash.com/photo-1586769852044-692d6e3703a0?q=80&w=400&auto=format&fit=crop" },
        { texto: "Registrar no sistema SEI com tipo, assunto e interessado.", imagem: "https://images.unsplash.com/photo-1568667256549-094345857637?q=80&w=400&auto=format&fit=crop" },
        { texto: "Atribuir número de protocolo e imprimir o recibo para o solicitante.", imagem: "https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=400&auto=format&fit=crop" },
        { texto: "Encaminhar o processo ao setor responsável via SEI ou fisicamente.", imagem: "https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=400&auto=format&fit=crop" },
        { texto: "Registrar a tramitação na planilha de controle mensal do setor.", imagem: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400&auto=format&fit=crop" }
      ],
      documentos: ["Documento original ou cópia autenticada", "Formulário de requerimento preenchido", "CPF/CNPJ do solicitante", "Comprovante de endereço (quando exigido)"],
      observacoes: "Documentos recebidos após as 17h são protocolados no próximo dia útil. Documentos incompletos devem ser devolvidos com justificativa escrita."
    },
    {
      id: 2,
      titulo: "Manual de Emissão de ART",
      categoria: "Técnico",
      passos: [
        { texto: "O profissional deve acessar o portal do CREA-GO e preencher o formulário de ART.", imagem: "" },
        { texto: "Recolher a taxa de ART via GRU no banco conveniado.", imagem: "" },
      { texto: "Protocolizar a ART assinada e o comprovante de pagamento na SMADER.", imagem: "" },
        { texto: "O setor técnico realiza a análise documental em até 5 dias úteis.", imagem: "" },
        { texto: "Após aprovação, a ART registrada é emitida e entregue ao solicitante.", imagem: "" }
      ],
      documentos: ["Formulário ART preenchido e assinado", "Comprovante de pagamento da taxa (GRU)", "Cópia do registro profissional (CREA)", "Projeto técnico detalhado (quando aplicável)"],
      observacoes: "A ART deve ser registrada antes do início de qualquer obra ou serviço técnico."
    },
    {
      id: 3,
      titulo: "Manual de Solicitação de Defesa Sanitária Animal",
      categoria: "Sanitário",
      passos: [
        { texto: "Produtor rural entra em contato pelo telefone (62) 3311-2001 ou comparece pessoalmente.", imagem: "" },
        { texto: "Preencher o formulário de solicitação de vistoria sanitária.", imagem: "" },
        { texto: "Aguardar agendamento pelo setor (prazo médio: 3 dias úteis).", imagem: "" },
        { texto: "Receber o Médico Veterinário designado na propriedade na data agendada.", imagem: "" },
        { texto: "Após vistoria, receber o relatório sanitário e atestado, quando aprovado.", imagem: "" }
      ],
      documentos: ["RG e CPF do produtor", "Documento de posse ou propriedade do imóvel rural", "Cadastro de Imóvel Rural (CAR)", "Nota fiscal dos animais (quando aplicável)"],
      observacoes: "Em casos de suspeita de doença de notificação obrigatória, a vistoria é emergencial. Ligar para o plantão (62) 99999-0000."
    },
    {
      id: 4,
      titulo: "Manual de Férias e Licenças",
      categoria: "Recursos Humanos",
      passos: [
        { texto: "Servidor preenche o formulário de solicitação com 30 dias de antecedência.", imagem: "" },
        { texto: "Chefia imediata valida e assina o formulário.", imagem: "" },
        { texto: "Processo é encaminhado ao Departamento de RH via SEI.", imagem: "" },
        { texto: "RH confere direito e lança no sistema de folha de pagamento.", imagem: "" },
        { texto: "Servidor recebe confirmação por e-mail com as datas homologadas.", imagem: "" }
      ],
      documentos: ["Formulário de solicitação assinado pela chefia", "Documentação comprobatória (para licenças médicas)", "Laudo médico com CID (para afastamentos por saúde)"],
      observacoes: "O gozo de férias deve ocorrer preferencialmente entre janeiro e março. Licenças médicas superiores a 15 dias são encaminhadas para perícia pelo IPASGO."
    }
  ],

  processos: [
    {
      id: 1,
      titulo: "Processo de Cadastramento de Produtor Rural",
      categoria: "Extensão Rural",
      etapas: [
        { titulo: "Recepção e triagem", descricao: "Servidor recebe o produtor, verifica documentação básica e orienta sobre os requisitos do cadastro." },
        { titulo: "Abertura de processo no SEI", descricao: "Técnico abre processo digital com todos os documentos digitalizados e número de protocolo gerado." },
        { titulo: "Análise técnica", descricao: "Engenheiro agrônomo responsável analisa a documentação e realiza visita à propriedade, se necessário." },
        { titulo: "Aprovação e emissão de cadastro", descricao: "Chefia aprova e o sistema emite o Cadastro de Produtor Rural com número de registro." },
        { titulo: "Entrega ao produtor", descricao: "Produtor é notificado e retira o documento no balcão ou recebe por correio." }
      ]
    },
    {
      id: 2,
      titulo: "Processo de Fiscalização de Agrotóxicos",
      categoria: "Fiscalização",
      etapas: [
        { titulo: "Planejamento da operação", descricao: "Equipe define cronograma mensal de vistorias por região, priorizando denúncias e estabelecimentos de alto risco." },
        { titulo: "Notificação prévia (quando aplicável)", descricao: "Estabelecimentos são notificados com antecedência mínima de 48h, exceto em operações investigativas." },
        { titulo: "Vistoria in loco", descricao: "Fiscais verificam laudos, validade, armazenamento e receituário agronômico dos produtos." },
        { titulo: "Lavratura de Auto de Infração", descricao: "Irregularidades documentadas em formulário padronizado, com prazo de defesa de 20 dias úteis." },
        { titulo: "Encaminhamento e penalidade", descricao: "Processo administrativo segue para julgamento. Penalidades podem incluir advertência, multa ou apreensão." }
      ]
    },
    {
      id: 3,
      titulo: "Processo de Aprovação de Projeto para Financiamento Rural",
      categoria: "Crédito e Fomento",
      etapas: [
        { titulo: "Orientação ao produtor", descricao: "Agente de extensão rural orienta o produtor sobre linhas de crédito disponíveis e documentação exigida." },
      { titulo: "Elaboração do projeto técnico", descricao: "Engenheiro ou técnico da SMADER elabora o projeto com memorial descritivo, orçamento e cronograma." },
      { titulo: "Análise da SMADER", descricao: "Departamento técnico revisa o projeto em até 10 dias úteis, podendo solicitar ajustes." },
      { titulo: "Encaminhamento à instituição financeira", descricao: "Projeto aprovado é encaminhado ao banco credenciado com parecer técnico da SMADER." },
        { titulo: "Liberação de recursos", descricao: "Instituição financeira realiza análise de crédito e libera os recursos na conta do produtor." }
      ]
    }
  ],

  arquivos: [
    { id: 1,  nome: "Formulário de Requerimento Geral",   tipo: "PDF",  tags: ["formulário", "modelo"],            url: "" },
    { id: 2,  nome: "Planilha de Controle de Ponto",      tipo: "XLSX", tags: ["planilha", "rh"],                  url: "" },
    { id: 3,  nome: "Modelo de Ofício Interno",           tipo: "DOCX", tags: ["ofício", "modelo", "outro"],     url: "" },
    { id: 4,  nome: "Manual SEI — Guia Rápido",           tipo: "PDF",  tags: ["manual"],                          url: "" },
    { id: 5,  nome: "Relatório Mensal de Fiscalização",   tipo: "PDF",  tags: ["relatório"],                       url: "" },
    { id: 6,  nome: "Planilha de Controle de Veículos",   tipo: "XLSX", tags: ["planilha", "veículos"],            url: "" },
    { id: 7,  nome: "Ata de Reunião — Modelo Padrão",     tipo: "DOCX", tags: ["modelo"],                          url: "" },
    { id: 8,  nome: "Contrato de Prestação de Serviços",  tipo: "PDF",  tags: ["contrato", "modelo"],              url: "" },
    { id: 9,  nome: "Laudo Técnico Agronômico — Modelo",  tipo: "DOCX", tags: ["modelo"],                          url: "" },
    { id: 10, nome: "Portaria Interna nº 001/2024",       tipo: "PDF",  tags: ["portaria", "decreto"],             url: "" },
    { id: 11, nome: "Planilha de Orçamento Anual",        tipo: "XLSX", tags: ["planilha", "financeiro"],          url: "" },
    { id: 12, nome: "Comunicado Interno — Modelo",        tipo: "DOCX", tags: ["outro", "modelo"],                url: "" }
  ],

  veiculos: [
    {
      id: 1, nome: "Trator Agrícola I", tipo: "Trator", icone: "ph-tractor", cor: "#5c7a3d",
      marca: "New Holland", modelo: "TL 75E", ano: "2018", cor_veiculo: "Azul",
      placa: "ABC-1234", patrimonio: "PAT-0042", chassi: "9BWZZZ377VT004251",
      renavam: "00123456789", combustivel: "Diesel", situacao: "Em operação",
      motorista: "Carlos Eduardo Lima (CNH Cat. E)", localizacao: "Pátio da Secretaria — Setor Técnico",
      obs: "Utilizado em atividades de mecanização agrícola. Manutenção preventiva semestral. Última revisão: março/2024."
    },
    {
      id: 2, nome: "Trator Agrícola II", tipo: "Trator", icone: "ph-tractor", cor: "#7a5c3d",
      marca: "Massey Ferguson", modelo: "MF 275", ano: "2015", cor_veiculo: "Vermelho",
      placa: "DEF-5678", patrimonio: "PAT-0028", chassi: "9BWZZZ377VT008831",
      renavam: "00987654321", combustivel: "Diesel", situacao: "Em manutenção",
      motorista: "Roberto Alves Nascimento (CNH Cat. E)", localizacao: "Oficina Municipal — aguardando peça",
      obs: "Em manutenção corretiva desde abril/2024. Previsão de retorno: maio/2024. Contato da oficina: (62) 3311-3500."
    },
    {
      id: 3, nome: "Caminhonete Oficial", tipo: "Caminhonete", icone: "ph-truck", cor: "#3d5c7a",
      marca: "Chevrolet", modelo: "S10 LT 4x4", ano: "2021", cor_veiculo: "Branca",
      placa: "GHI-9012", patrimonio: "PAT-0071", chassi: "9BGJSK19BJB123456",
      renavam: "01122334455", combustivel: "Flex", situacao: "Em operação",
      motorista: "Fernanda Costa Braga (CNH Cat. B)", localizacao: "Garagem da Prefeitura — Vaga 07",
      obs: "Uso exclusivo para visitas técnicas e extensão rural. Saídas devem ser registradas no livro de bordo."
    }
  ],

  sistemas: [
    { id: 1, nome: "CAF", nome_completo: "Cadastro Ambiental Familiar", icone: "ph-leaf", cor: "#3d7a5e", descricao: "Sistema de cadastro de produtores rurais e imóveis para fins de assistência técnica e políticas públicas.", url: "https://caf.senar.org.br", acesso: "Login individual por CPF do técnico responsável", orgao: "SENAR" },
    { id: 2, nome: "PRODATA", nome_completo: "Sistema PRODATA — Gestão Municipal", icone: "ph-database", cor: "#3d5c7a", descricao: "Sistema integrado de gestão pública da Prefeitura de Luziânia para controle financeiro, folha de pagamento e patrimônio.", url: "https://prodata.luziania.go.gov.br", acesso: "Login com matrícula funcional + senha fornecida pela TI", orgao: "Prefeitura Municipal" },
    { id: 3, nome: "Prefeitura Virtual", nome_completo: "Portal de Serviços Online — Prefeitura de Luziânia", icone: "ph-globe", cor: "#6b3d7a", descricao: "Portal online para acesso a serviços ao cidadão, emissão de documentos e acompanhamento de processos.", url: "https://virtual.luziania.go.gov.br", acesso: "Acesso público — alguns serviços requerem login com CPF", orgao: "Prefeitura Municipal" },
    { id: 4, nome: "SEI", nome_completo: "Sistema Eletrônico de Informações", icone: "ph-file-text", cor: "#7a5c3d", descricao: "Plataforma de gestão de processos e documentos administrativos eletrônicos.", url: "https://sei.luziania.go.gov.br", acesso: "Login com usuário e senha cadastrados pela TI", orgao: "Prefeitura Municipal" },
    { id: 5, nome: "GTA Online", nome_completo: "Guia de Trânsito Animal — MAPA", icone: "ph-cow", cor: "#5c7a3d", descricao: "Sistema federal para emissão eletrônica de Guias de Trânsito Animal.", url: "https://gta.agricultura.gov.br", acesso: "Acesso via login gov.br do servidor habilitado", orgao: "MAPA — Ministério da Agricultura" },
    { id: 6, nome: "CAR — SICAR", nome_completo: "Sistema Nacional de Cadastro Ambiental Rural", icone: "ph-map-trifold", cor: "#3d6a7a", descricao: "Registro público eletrônico de imóveis rurais. Obrigatório para acesso a crédito rural.", url: "https://car.gov.br", acesso: "Acesso público para consulta — cadastro pelo proprietário ou técnico credenciado", orgao: "MMA — Ministério do Meio Ambiente" }
  ],

  servicos: [
    { id: 1, nome: "Mecanização Agrícola — Gradagem", categoria: "Trator", icone: "ph-tractor", cor: "#5c7a3d", descricao: "Preparo do solo com grade aradora ou niveladora para eliminação de torrões e ervas daninhas.", publico: "Pequenos e médios produtores rurais do município", como_solicitar: "Comparecer à sede da SMADER com documentação ou ligar para o ramal 2040.", documentos: ["RG e CPF do produtor", "Comprovante de endereço", "CAR ou escritura da propriedade", "Descrição da área a ser trabalhada"], prazo: "Agendamento em até 5 dias úteis. Execução conforme cronograma da equipe.", obs: "Serviço gratuito para agricultores familiares cadastrados. Área mínima: 0,5 ha." },
    { id: 2, nome: "Mecanização Agrícola — Aragem", categoria: "Trator", icone: "ph-tractor", cor: "#5c7a3d", descricao: "Revolvimento profundo do solo com arado de discos ou aivecas, incorporando matéria orgânica e rompendo camadas compactadas.", publico: "Produtores rurais do município de Luziânia", como_solicitar: "Solicitar na sede da SMADER com antecedência mínima de 10 dias úteis.", documentos: ["RG e CPF do produtor", "Documento de posse ou propriedade do imóvel", "CAR do imóvel rural"], prazo: "Visita técnica em até 3 dias. Execução conforme fila de espera.", obs: "Recomenda-se combinar a aragem com aplicação de calcário. Período ideal: início da entressafra." },
    { id: 3, nome: "Mecanização Agrícola — Ensilagem", categoria: "Trator", icone: "ph-tractor", cor: "#5c7a3d", descricao: "Apoio ao processo de ensilagem de forragens para alimentação animal na entressafra.", publico: "Pecuaristas e produtores de gado do município", como_solicitar: "Agendar com a SMADER com pelo menos 15 dias de antecedência.", documentos: ["RG e CPF do produtor", "Comprovante de endereço rural", "Informação sobre a cultura e área estimada"], prazo: "Confirmação do agendamento em até 5 dias úteis.", obs: "Disponibilidade sujeita à época de safra e fila de agendamentos." },
    { id: 4, nome: "Poda e Corte de Árvores", categoria: "Arborização", icone: "ph-tree", cor: "#3d7a5e", descricao: "Serviço de poda técnica e corte de árvores em vias públicas, propriedades rurais e área urbana.", publico: "Moradores e produtores do município de Luziânia", como_solicitar: "Solicitar via Prefeitura Virtual ou presencialmente na SMADER.", documentos: ["RG e CPF do solicitante", "Endereço completo do local da árvore", "Fotos do local (quando possível)"], prazo: "Vistoria técnica em até 7 dias úteis. Execução em até 30 dias após autorização.", obs: "Corte de árvores nativas pode exigir autorização prévia da SEMA." },
    { id: 5, nome: "Cursos e Capacitações Rurais", categoria: "Capacitação", icone: "ph-graduation-cap", cor: "#3d5c7a", descricao: "Oferta de cursos técnicos para produtores rurais em parceria com SENAR, EMATER e outros órgãos.", publico: "Produtores rurais, agricultores familiares e trabalhadores rurais", como_solicitar: "Acompanhar o calendário no mural da SMADER ou ligar para o ramal 2040.", documentos: ["RG e CPF", "Comprovante de vínculo rural (quando exigido pelo curso)"], prazo: "Conforme calendário anual. Turmas com vagas limitadas.", obs: "Cursos em parceria com SENAR têm certificação reconhecida." },
    { id: 6, nome: "Fornecimento de Calcário", categoria: "Insumos", icone: "ph-package", cor: "#7a6b3d", descricao: "Distribuição subsidiada de calcário agrícola para correção de acidez do solo.", publico: "Agricultores familiares e pequenos produtores rurais do município", como_solicitar: "Solicitar na sede da SMADER com documentação completa.", documentos: ["RG e CPF do produtor", "CAR do imóvel rural", "DAP/CAF atualizado", "Análise de solo recente"], prazo: "Análise da solicitação em até 10 dias úteis. Entrega conforme disponibilidade de estoque.", obs: "Prioridade para agricultores familiares com DAP ativa." }
  ],

  infoJuridico: [
    { id: 1, titulo: "Identificação Institucional", icone: "ph-buildings", cor: "#3d6a7a", campos: [{ label: "Nome completo", valor: "Secretaria Municipal de Agricultura, Desenvolvimento Rural e Abastecimento" }, { label: "Sigla", valor: "SMADER" }, { label: "CNPJ", valor: "00.000.000/0001-00" }, { label: "Natureza jurídica", valor: "Órgão da Administração Pública Municipal Direta" }, { label: "Esfera", valor: "Municipal" }, { label: "Município", valor: "Luziânia — GO" }] },
    { id: 2, titulo: "Endereço e Localização", icone: "ph-map-pin", cor: "#5c7a3d", campos: [{ label: "Logradouro", valor: "Av. Central, nº 500, Sala 201" }, { label: "Bairro", valor: "Centro" }, { label: "Cidade / Estado", valor: "Luziânia — GO" }, { label: "CEP", valor: "72.800-000" }, { label: "Referência", valor: "Sede da Prefeitura Municipal, 2º andar" }] },
    { id: 3, titulo: "Contatos Oficiais", icone: "ph-phone", cor: "#7a5c3d", campos: [{ label: "Telefone principal", valor: "(62) 3311-2000" }, { label: "Ramal da chefia", valor: "2000" }, { label: "Telefone da fiscalização", valor: "(62) 3311-2001" }, { label: "Plantão sanitário (24h)", valor: "(62) 99999-0000" }, { label: "E-mail institucional", valor: "smader@luziania.go.gov.br" }, { label: "E-mail da chefia", valor: "jose.pereira@smader.go.gov.br" }, { label: "Horário de atendimento", valor: "Segunda a sexta, 08h às 17h" }] },
    { id: 4, titulo: "Gestão e Liderança", icone: "ph-user-circle", cor: "#3d7a5e", campos: [{ label: "Secretário(a) Municipal", valor: "Dr. João Batista Rodrigues" }, { label: "Secretário(a) Adjunto(a)", valor: "Dra. Maria Aparecida Gomes" }, { label: "Chefe de Departamento", valor: "José Antônio Pereira" }, { label: "Mandato atual", valor: "2021 – 2024" }, { label: "Ato de nomeação", valor: "Decreto nº 4.521/2021" }] }
  ],

  infoMunicipio: [
    { id: 1, titulo: "Dados do Município", icone: "ph-map-trifold", cor: "#3d5c7a", tag: "Município", campos: [{ label: "Nome oficial", valor: "Município de Luziânia" }, { label: "Estado", valor: "Goiás — GO" }, { label: "Área territorial", valor: "3.961,45 km²" }, { label: "População estimada (IBGE 2022)", valor: "215.731 habitantes" }, { label: "IDH (2010)", valor: "0,699 — Médio" }, { label: "Código IBGE", valor: "5212501" }, { label: "Gentílico", valor: "Luzianiense" }, { label: "Fundação", valor: "1746 (Vila de Santa Luzia)" }] },
    { id: 2, titulo: "Estrutura Municipal", icone: "ph-tree-structure", cor: "#3d5c7a", tag: "Município", campos: [{ label: "Distritos", valor: "Alexânia de Luziânia, Engenheiro Dolabela, Olhos d'Água, São José do Burity" }, { label: "Bioma", valor: "Cerrado" }, { label: "Principal bacia hidrográfica", valor: "Rio Corumbá / Rio Paraná" }, { label: "Altitude média", valor: "1.020 metros" }, { label: "Clima", valor: "Tropical de savana (Aw)" }] },
    { id: 3, titulo: "Prefeitura Municipal — Dados Jurídicos", icone: "ph-bank", cor: "#5c3d7a", tag: "Prefeitura", campos: [{ label: "Denominação oficial", valor: "Prefeitura Municipal de Luziânia" }, { label: "CNPJ", valor: "01.131.196/0001-68" }, { label: "Endereço sede", valor: "Praça Coronel Gomes, s/nº — Centro, Luziânia — GO" }, { label: "Telefone geral", valor: "(61) 3621-1000" }, { label: "Site oficial", valor: "www.luziania.go.gov.br" }, { label: "Prefeito(a)", valor: "Prof. Júnior Friboi" }] },
    { id: 4, titulo: "Contatos Internos — Outros Departamentos", icone: "ph-address-book", cor: "#3d7a5e", tag: "Contatos", campos: [{ label: "Secretaria de Saúde (SMS)", valor: "(61) 3621-2200 · sms@luziania.go.gov.br" }, { label: "Secretaria de Educação (SME)", valor: "(61) 3621-2300 · sme@luziania.go.gov.br" }, { label: "Secretaria de Obras (SMO)", valor: "(61) 3621-2400 · obras@luziania.go.gov.br" }, { label: "Secretaria de Finanças (SMF)", valor: "(61) 3621-2600 · financas@luziania.go.gov.br" }, { label: "Procuradoria Geral (PGM)", valor: "(61) 3621-1200 · pgm@luziania.go.gov.br" }, { label: "Departamento de RH", valor: "(61) 3621-1400 · rh@luziania.go.gov.br" }, { label: "TI / Tecnologia", valor: "(61) 3621-1500 · ti@luziania.go.gov.br" }] }
  ],

  infoOrgaos: [
    { id: 1, titulo: "EMATER-GO", nome_completo: "Agência Goiana de Assistência Técnica, Extensão Rural e Pesquisa Agropecuária", icone: "ph-plant", cor: "#3d7a5e", atribuicao: "Presta assistência técnica e extensão rural aos produtores do estado, apoia o acesso ao crédito rural e capacitação de agricultores familiares.", campos: [{ label: "Site", valor: "www.emater.go.gov.br" }, { label: "Telefone sede", valor: "(62) 3269-0600" }, { label: "Escritório regional", valor: "Unidade Luziânia — (61) 3621-4400" }, { label: "E-mail regional", valor: "luziania@emater.go.gov.br" }] },
    { id: 2, titulo: "SEAPA-GO", nome_completo: "Secretaria de Estado de Agricultura, Pecuária e Abastecimento de Goiás", icone: "ph-cow", cor: "#5c7a3d", atribuicao: "Órgão estadual responsável pela política agrícola e pecuária de Goiás.", campos: [{ label: "Site", valor: "www.seapa.go.gov.br" }, { label: "Telefone sede", valor: "(62) 3201-8700" }, { label: "E-mail geral", valor: "seapa@goias.gov.br" }] },
    { id: 3, titulo: "AGRODEFESA", nome_completo: "Agência Goiana de Defesa Agropecuária", icone: "ph-shield-check", cor: "#7a5c3d", atribuicao: "Responsável pela defesa sanitária animal e vegetal em Goiás. Emite GTA e certificados fitossanitários.", campos: [{ label: "Site", valor: "www.agrodefesa.go.gov.br" }, { label: "Telefone sede", valor: "(62) 3269-5200" }, { label: "Unidade regional", valor: "Luziânia — (61) 3621-4500" }, { label: "GTA online", valor: "www.gta.agricultura.gov.br" }] },
    { id: 4, titulo: "SENAR-GO", nome_completo: "Serviço Nacional de Aprendizagem Rural — Goiás", icone: "ph-graduation-cap", cor: "#3d5c7a", atribuicao: "Promove formação profissional rural e capacitações em boas práticas agrícolas, mecanização e gestão rural.", campos: [{ label: "Site", valor: "www.senar-go.com.br" }, { label: "Telefone", valor: "(62) 3243-1250" }, { label: "E-mail", valor: "senar@sistemafaeg.com.br" }] },
    { id: 5, titulo: "MAPA — Ministério da Agricultura", nome_completo: "Ministério da Agricultura e Pecuária", icone: "ph-flag-banner", cor: "#6b3d7a", atribuicao: "Define a política agrícola federal. Responsável por registro de agrotóxicos, defesa agropecuária nacional e crédito rural.", campos: [{ label: "Site", valor: "www.gov.br/agricultura" }, { label: "Superintendência em GO", valor: "(62) 3240-3800" }, { label: "E-mail GO", valor: "sfa.go@agro.gov.br" }] },
    { id: 6, titulo: "INCRA — Regional GO/TO", nome_completo: "Instituto Nacional de Colonização e Reforma Agrária", icone: "ph-compass-tool", cor: "#7a3d3d", atribuicao: "Responsável pela reforma agrária, regularização fundiária e certificação de imóveis rurais (CCIR).", campos: [{ label: "Site", valor: "www.incra.gov.br" }, { label: "Superintendência Regional", valor: "(62) 3240-3100" }, { label: "E-mail", valor: "sr04@incra.gov.br" }] },
    { id: 7, titulo: "EMBRAPA Cerrados", nome_completo: "Empresa Brasileira de Pesquisa Agropecuária — Unidade Cerrados", icone: "ph-flask", cor: "#3d6a7a", atribuicao: "Desenvolve pesquisas agropecuárias para o bioma Cerrado. Referência em tecnologias para grãos, horticultura e pastagens.", campos: [{ label: "Site", valor: "www.embrapa.br/cerrados" }, { label: "Telefone", valor: "(61) 3388-9898" }, { label: "Endereço", valor: "BR 020, km 18 — Planaltina — DF" }, { label: "E-mail", valor: "cnpac.sac@embrapa.br" }] }
  ],

  avisos: [
    { id: 1, titulo: "Recadastramento de Produtores Rurais em Andamento", tipo: "aviso", local: "Sede SMADER", desc: "Todos os produtores que utilizam serviços de mecanização devem recadastrar-se para manter acesso aos serviços em 2026. Comparecer com RG, CPF e CAR." },
    { id: 2, titulo: "Uso obrigatório do SEI para todos os documentos", tipo: "comunicado", local: "Interno", desc: "A partir desta data, todos os documentos oficiais devem ser tramitados exclusivamente pelo sistema SEI. Processos em papel não serão mais aceitos." },
    { id: 3, titulo: "Atenção: prazo para entrega de relatórios de campo", tipo: "urgente", local: "Setor Técnico", desc: "Todos os técnicos de campo devem entregar os relatórios mensais até o último dia útil de cada mês. Atrasos impactam o planejamento orçamentário." }
  ],

  agendaEventos: [
    { id: 1, titulo: "Reunião de Planejamento Mensal", data: "2026-03-20", data_fim: null, hora: "09:00", tipo: "reuniao", local: "Sala de reuniões — 2º andar", desc: "Reunião de alinhamento das atividades do mês com toda a equipe técnica." },
    { id: 2, titulo: "Entrega do Relatório de Fiscalização", data: "2026-03-25", data_fim: null, hora: "17:00", tipo: "prazo", local: "SMADER / SEI", desc: "Prazo final para envio do relatório mensal de fiscalização de agrotóxicos ao departamento." },
    { id: 3, titulo: "Curso: Boas Práticas Agrícolas", data: "2026-03-27", data_fim: "2026-03-28", hora: "08:00", tipo: "capacitacao", local: "Auditório da Prefeitura", desc: "Capacitação em parceria com SENAR-GO. Vagas limitadas — confirmar participação com Fernanda Braga." },
    { id: 4, titulo: "Distribuição de Calcário — Zona Rural Norte", data: "2026-04-03", data_fim: "2026-04-05", hora: "07:30", tipo: "operacao", local: "Pátio da SMADER", desc: "Início da distribuição de calcário para produtores da zona rural norte. Produtores devem apresentar CAF e CPF." },
    { id: 5, titulo: "Vistoria de Defesa Sanitária — Macroregião Sul", data: "2026-04-15", data_fim: null, hora: "08:00", tipo: "operacao", local: "Saída da sede SMADER", desc: "Operação de fiscalização sanitária em propriedades da região sul do município." },
    { id: 6, titulo: "Semana do Agricultor Familiar", data: "2026-05-19", data_fim: "2026-05-23", hora: "08:00", tipo: "evento", local: "Centro de Eventos de Luziânia", desc: "Evento anual com exposições, palestras e homenagens aos agricultores familiares do município." }
  ],

  escalaFerias: [
    { id: 1, funcionario_id: 3, nome: "Márcia Oliveira Santos",   cargo: "Técnica Administrativa",          periodo_inicio: "2026-03-10", periodo_fim: "2026-03-28", status: "em_curso" },
    { id: 2, funcionario_id: 5, nome: "Fernanda Costa Braga",     cargo: "Agente de Desenvolvimento Rural", periodo_inicio: "2026-04-07", periodo_fim: "2026-04-25", status: "agendado" },
    { id: 3, funcionario_id: 1, nome: "Ana Paula Ferreira",       cargo: "Engenheira Agrônoma",             periodo_inicio: "2026-06-02", periodo_fim: "2026-06-20", status: "agendado" },
    { id: 4, funcionario_id: 4, nome: "Roberto Alves Nascimento", cargo: "Analista de TI",                  periodo_inicio: "2026-07-14", periodo_fim: "2026-08-01", status: "agendado" },
    { id: 5, funcionario_id: 2, nome: "Carlos Eduardo Lima",      cargo: "Engenheiro Agrônomo Sênior",      periodo_inicio: "2026-09-08", periodo_fim: "2026-09-26", status: "agendado" },
    { id: 6, funcionario_id: 6, nome: "José Antônio Pereira",     cargo: "Chefe de Departamento",           periodo_inicio: "2026-11-03", periodo_fim: "2026-11-21", status: "agendado" }
  ],

  acessoRapido: [
    { id: 1, titulo: "Gmail",                url: "https://mail.google.com",               icone: "ph-google-logo",     cor: "#EA4335", coringa: false },
    { id: 2, titulo: "E-mail Institucional", url: "https://webmail.luziania.go.gov.br",    icone: "ph-envelope-simple", cor: "#3d5c7a", coringa: false },
    { id: 3, titulo: "Prefeitura Virtual",   url: "https://virtual.luziania.go.gov.br",    icone: "ph-globe",           cor: "#2d6a4f", coringa: false },
    { id: 4, titulo: "PRODATA",              url: "https://prodata.luziania.go.gov.br",    icone: "ph-database",        cor: "#6b3d7a", coringa: false },
    { id: 5, titulo: "—",                   url: "#",                                      icone: "ph-placeholder",     cor: "#8a9482", coringa: true  },
    { id: 6, titulo: "—",                   url: "#",                                      icone: "ph-placeholder",     cor: "#8a9482", coringa: true  }
  ],

  layoutConfig: {
    instagramPosition: "belowQuickAccess"
  }

}; // fim window.DADOS_INICIAIS
