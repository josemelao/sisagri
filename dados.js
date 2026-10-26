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
    { id: 1, nome: "CAF", nome_completo: "Cadastro Nacional de Agricultura Familiar", icone: "ph-leaf", cor: "#3d7a5e", descricao: "Sistema de cadastro de produtores rurais e imóveis para fins de assistência técnica e políticas públicas.", url: "https://caf.mda.gov.br/", acesso: "Login individual através da conta GOV.BR", orgao: "MAPA" },
    { id: 2, nome: "PRODATA", nome_completo: "Sistema Integrado de Gestão PRODATA — Gestão Municipal", icone: "ph-database", cor: "#3d5c7a", descricao: "Sistema integrado de gestão pública da Prefeitura de Cidade Ocidental para controle financeiro, folha de pagamento e patrimônio.", url: "https://gestao.cidadeocidental.go.gov.br/sig/", acesso: "Login por CPF + senha (apenas para usuários liberados)", orgao: "Prefeitura Municipal" },
    { id: 3, nome: "Prefeitura Virtual", nome_completo: "Portal de Serviços Online — Prefeitura de Cidade Ocidental", icone: "ph-globe", cor: "#6b3d7a", descricao: "Portal online para acesso a serviços ao cidadão, emissão de documentos e acompanhamento de processos.", url: "https://cidadeocidental.prefeituravirtual.app.br/", acesso: "Login por CPF/Email + senha (cadastro individual, necessita vinculação com Secretaria)", orgao: "Prefeitura Municipal" },
    { id: 4, nome: "CECAF", nome_completo: "Cadastro de Entidades Emissoras do CAF", icone: "ph-user-circle", cor: "#7a5c3d", descricao: "Sistema utilizado para cadastrar entidades emissoras no CAF. Através do login do Secretário, é possível habilitar novos cadastradores responsáveis por emitir CAF para os agricultores.", url: "https://smap4.mda.gov.br/recad/", acesso: "", orgao: "MAPA" }
  ],

  servicos: [
    { id: 1, nome: "Serviços de Mecanização Agrícola", categoria: "Trator", icone: "ph-tractor", cor: "#3d6a7a", descricao: "Prestação de serviços com maquinário agrícola, incluindo gradagem, aração, ensiladeira, plantio e adubação, para apoio ao preparo e manejo do solo.", publico: "Produtores rurais do município", como_solicitar: "Comparecer à sede da SMADER ou entrar em contato via WhatsApp da secretaria para solicitação.", documentos: ["Documento oficial com foto (CPF, RG ou CNH)", "Comprovante de Endereço"], prazo: "Execução em até 30 dias após confirmação do pagamento.", obs: "Taxa de R$60,00 por hora, limitada a 6 horas por produtor." },
    { id: 4, nome: "Serviço de Poda e Corte de Árvores", categoria: "Corte/Poda", icone: "ph-tree", cor: "#3d7a5e", descricao: "Prestação de serviços com maquinário agrícola, incluindo gradagem, aração, ensiladeira, plantio e adubação, para apoio ao preparo e manejo do solo.", publico: "Moradores de Cidade Ocidental", como_solicitar: "Preencher o formulário de solicitação de poda e protocolar junto à prefeitura.", documentos: ["Documento oficial com foto (CPF, RG ou CNH)", "Comprovante de Residência", "Fotos da(s) Árvore(s))"], prazo: "Não há prazo definido (sujeito à análise técnica)", obs: "Serviço gratuito. Execução condicionada à autorização da Secretaria de Meio Ambiente" },
    { id: 5, nome: "Cursos e Capacitações Rurais", categoria: "Capacitação", icone: "ph-graduation-cap", cor: "#3d5c7a", descricao: "Oferta de cursos e capacitações em parceria com SENAR-GO e EMATER-GO, voltados ao desenvolvimento técnico e profissional no meio rural, com emissão de certificado.", publico: "Público em geral (conforme disponibilidade de vagas)", como_solicitar: "Acompanhar divulgações da secretaria e preencher a ficha de inscrição quando disponibilizada em meio digital.", documentos: ["Preenchimento de Formulário Digital"], prazo: "Duração média de 1 a 3 dias por curso", obs: "Cursos gratuitos. Vagas limitadas e datas divulgadas previamente" },
    { id: 6, nome: "Fornecimento e Frete de Calcário", categoria: "Insumos", icone: "ph-package", cor: "#7a6b3d", descricao: "Disponibilização de calcário a preço subsidiado, em parceria com a empresa BRITACAL, com transporte até a propriedade do solicitante.", publico: "Público em geral", como_solicitar: "Entrar em contato com a secretaria e solicitar o fornecimento.", documentos: [], prazo: "Até 2 semanas após solicitação", obs: "Valor de R$120,00 por tonelada, limitado a 6 toneladas por solicitante" },
    { id: 7, nome: "Emissão de CAF (Cadastro da Agricultura Familiar)", categoria: "Administrativo", icone: "ph-monitor", cor: "#5c3d7a", descricao: "Realização do Cadastro da Agricultura Familiar (CAF), permitindo ao agricultor acesso a programas e políticas públicas governamentais.", publico: "Agricultores familiares", como_solicitar: "Comparecer à sede da secretaria e solicitar o cadastro.", documentos: ["Documentação"], prazo: "Atendimento imediato (no ato, mediante documentação completa)", obs: "Serviço gratuito. Cadastro realizado na hora, desde que toda a documentação esteja correta" },
    { id: 8, nome: "Emissão do SIM (Serviço de Inspeção Municipal)", categoria: "Administrativo", icone: "ph-cow", cor: "#7a3d5c", descricao: "Registro e inspeção de estabelecimentos que produzem alimentos de origem animal, permitindo sua comercialização dentro do município conforme normas sanitárias.", publico: "Produtores rurais e empresas do setor alimentício", como_solicitar: "Entrar em contato com a secretaria, preencher os formulários exigidos e protocolar a documentação para análise da equipe técnica do SIM.", documentos: [], prazo: "Processo administrativo conforme análise técnica (sem prazo fixo)", obs: "Serviço gratuito pela secretaria. Podem ocorrer custos externos (cartório, licenças, documentos técnicos). O Selo de Inspeção Municipal (SIM) é uma certificação concedida pela Secretaria Municipal de Agricultura e Desenvolvimento Rural a produtos de origem animal que atendem às normas de segurança alimentar e sanitária. Este selo permite que os produtos comercializados pelos agricultores e produtores rurais sejam reconhecidos pela qualidade e segurança que oferecem aos consumidores. A concessão do selo é uma forma de valorizar a produção local, garantir a saúde pública e ampliar as possibilidades de comercialização dos produtos no mercado municipal e regional, criando uma cadeia produtiva mais eficiente e com maior competitividade." }
  ],

  infoJuridico: [
    { id: 1, titulo: "Identificação Institucional", icone: "ph-buildings", cor: "#3d6a7a", campos: [{ label: "Nome Completo", valor: "Secretaria Municipal de Agricultura e Desenvolvimento Rural" }, { label: "Sigla", valor: "SMADER" }, { label: "Esfera Administrativa", valor: "Municipal" }, { label: "Natureza Jurídica", valor: "Órgão da Administração Pública Direta" }, { label: "Vinculação", valor: "Prefeitura Municipal de Cidade Ocidental" }, { label: "Município", valor: "Cidade Ocidental - GO" }] },
    { id: 2, titulo: "Endereço e Localização", icone: "ph-map-pin", cor: "#5c7a3d", campos: [{ label: "Logradouro", valor: "Quadra 02- Lote i, Parque das Américas" }, { label: "Bairro", valor: "Jardim ABC" }, { label: "Cidade / Estado", valor: "Cidade Ocidental - GO" }, { label: "CEP", valor: "72.899-000" }, { label: "Referência", valor: "Sede da Subprefeitura do Jardim ABC" }, { label: "Maps", valor: '<a href="https://maps.app.goo.gl/zxGTkSYDfREaqjHTA">LINK</a>' }, { label: "Latitude", valor: "-160.504.371" }, { label: "Longitude", valor: "-478.152.696" }] },
    { id: 3, titulo: "Contatos Oficiais", icone: "ph-phone", cor: "#7a5c3d", campos: [{ label: "Telefone Principal", valor: "61 99613-6573" }, { label: "E-mail Institucional", valor: "agricultura@cidadeocidental.go.gov.br" }, { label: "WhatsApp Institucional", valor: "61 99613-6573" }, { label: "Gmail", valor: "agriculturacidadeocidental@gmail.com" }, { label: "Link Oficial Secretaria", valor: '<a href="https://cidadeocidental.go.gov.br/estrutura/secretaria-municipal-de-agricultura-e-desenvolvimento-rural/">LINK</a>' }, { label: "Horário de Atendimento", valor: "Seg a Sex - 08h às 12h e 14h às 18h" }] },
    { id: 4, titulo: "Gestão e Liderança", icone: "ph-users", cor: "#7a3d5c", campos: [{ label: "Secretário(a) Municipal", valor: "João Victor Aragão da Silva" }, { label: "Subsecretário(a) Municipal", valor: "Railson Rodrigues Do Nascimento" }, { label: "Chefe de Gabinete", valor: "-" }, { label: "Diretor(a) de Agricultura", valor: "Felipe dos Santos Felix" }, { label: "Diretor(a) de Inspeção Municipal", valor: "-" }, { label: "Diretor(a) de Desenvolvimento Rural", valor: "André Luiz Magalhães Del Sarto Melo" }, { label: "Mandato Atual", valor: "2025 - 2028" }, { label: "Ato de Nomeação do(a) Secretário(a)", valor: "Decreto Nº 019/2025" }] },
    { id: 5, titulo: "Competências", icone: "ph-star", cor: "#7a3d3d", campos: [{ label: "Competências", valor: "LEI Nº 1.470/2025\n\n\nArt. 33. A Secretaria Municipal de Agricultura e Desenvolvimento Rural, dirigida pelo ocupante do respectivo cargo de Secretário Municipal, é o órgão responsável pela formulação e execução das políticas de agricultura e desenvolvimento rural e tem dentre outras competências regimentais, as seguintes:\n\nI – a articulação com órgãos e entidades do Estado e da União para formulação de diretrizes e execução de programas e projetos de apoio ao desenvolvimento da produção familiar, do abastecimento alimentar e do desenvolvimento técnico-econômico dos agricultores familiares em geral e da organização das comunidades rurais;\n\nII – a promoção de serviços e ações de extensão rural, de assistência técnica especializada e de incentivo à agricultura familiar, bem como a promoção de políticas de comercialização de seus produtos;\n\nIII – a organização social e econômica dos agricultores com vistas ao desenvolvimento local sustentável e a melhoria da qualidade de vida por meio da modernização da produção, a agregação de valor aos produtos e a geração de renda no campo;\n\nIV – o apoio na execução dos serviços de interesse coletivo em melhorias na infraestrutura das propriedades rurais, de forma subsidiada, priorizando os agricultores de baixa renda;\n\nV – o desenvolvimento de atividades, ações, projetos e programas em parceria com organismos estaduais e federais públicos juntamente com cooperativas agrícolas e empresas de fomento visando incentivar a produção agropecuária;\n\nVI – a articulação junto à Secretaria Municipal de Infraestrutura e Serviços Urbanos e Rurais para execução de obras e serviços de infraestrutura rural;\n\nVII – a execução dos serviços de inspeção municipal de produtos de origem animal.", full_width: true }] }
  ],

  infoMunicipio: [
    { id: 1, titulo: "Dados do Município", icone: "ph-globe", cor: "#3d5c7a", tag: "Município", campos: [{ label: "Nome oficial", valor: "Município de Cidade Ocidental" }, { label: "Estado", valor: "Goiás — GO" }, { label: "Região", valor: "Centro-Oeste (Brasil)" }, { label: "País", valor: "Brasil" }, { label: "Código IBGE", valor: "5205497" }, { label: "Gentílico", valor: "Ocidentalense" }, { label: "Fundação", valor: "15 de dezembro de 1976" }, { label: "População (IBGE 2022)", valor: "91.767 hab" }, { label: "Área Territorial", valor: "389,985 km²" }, { label: "Densidade Demográfica", valor: "235,31 hab/km²" }, { label: "Bioma", valor: "Cerrado" }, { label: "Latitude", valor: "~ -16.11363" }, { label: "Longitude", valor: "~ -47.93792" }, { label: "Altitude Média", valor: "~910 m" }] },
    { id: 3, titulo: "Prefeitura Municipal — Dados Jurídicos", icone: "ph-bank", cor: "#5c3d7a", tag: "Prefeitura", campos: [{ label: "Denominação Oficial", valor: "Prefeitura Municipal de Cidade Ocidental" }, { label: "CNPJ", valor: "36.862.621/0001-21" }, { label: "Endereço sede", valor: "SQ 19, Quadra 21, Lote 75/79, Centro, Cidade Ocidental-GO — CEP: 72880-690" }, { label: "Telefone da Prefeitura", valor: "(61) 99956-2448 (WhatsApp)" }, { label: "Site oficial", valor: '<a href="https://cidadeocidental.go.gov.br">https://cidadeocidental.go.gov.br</a>' }, { label: "Prefeito(a)", valor: "Luiz Gonzaga Viana Filho" }, { label: "E-mail da Prefeitura", valor: "prefeito@cidadeocidental.go.gov.br" }] },
    { id: 4, titulo: "Contatos Internos — Outros Departamentos", icone: "ph-address-book", cor: "#3d6a7a", tag: "Contatos", campos: [{ label: "Subprefeito Jardim ABC - Marcio Veras", valor: "61 99238-5398" }, { label: "Chefe de Gabinete Jardim ABC - Fidalga", valor: "61 99612-9287" }, { label: "Recursos Humanos - Jefferson", valor: "61 99512-0057" }, { label: "Adminsitração - Keli", valor: "61 99609-0834" }, { label: "Adminsitração - Milena", valor: "61 99239-5112" }, { label: "Administração - Conceição", valor: "61 98598-9505" }, { label: "Patrimônio - Jean Mota", valor: "61 99540-0420" }, { label: "Convênios - Narayane", valor: "61 99551-2570" }, { label: "Convênios - Caroline", valor: "61 99521-3488" }, { label: "Infraestrutura - Christina", valor: "61 99877-2612" }, { label: "Licitações - Samantha", valor: "61 99532-2878" }, { label: "Tesouraria - Jussara", valor: "61 98256-2461" }, { label: "Prefeitura Virtual - Ingrid", valor: "61 99427-2287" }, { label: "Prefeitura Virtual - Bruna", valor: "61 99590-8172" }] },
    { id: 5, titulo: "Links Institucionais", icone: "ph-flow-arrow", cor: "#6b3d7a", tag: "Prefeitura", campos: [{ label: "Legislação", valor: '<a href="https://leis.cidadeocidental.go.gov.br/leis">Acessar</a>' }, { label: "Diário Oficial", valor: '<a href="https://dom.cidadeocidental.go.gov.br/">Acessar</a>' }, { label: "Licitações", valor: '<a href="https://acessoainformacao.cidadeocidental.go.gov.br/informacao/licitacoes">Acessar</a>' }, { label: "Contratos", valor: '<a href="https://acessoainformacao.cidadeocidental.go.gov.br/informacao/contratos">Acessar</a>' }, { label: "Folha de Pagamento", valor: '<a href="https://acessoainformacao.cidadeocidental.go.gov.br/cidadao/transparencia/sgservidores">Acessar</a>' }] }
  ],

  infoOrgaos: [
    { id: 1, titulo: "EMATER-GO", nome_completo: "Empresa de Assistência Técnica e Extensão Rural", icone: "ph-plant", cor: "#3d7a5e", atribuicao: "Presta assistência técnica e extensão rural aos produtores do estado, apoia o acesso ao crédito rural e capacitação de agricultores familiares.", campos: [{ label: "Site", valor: "www.emater.go.gov.br" }, { label: "Telefone", valor: "" }, { label: "Escritório regional", valor: "" }, { label: "E-mail", valor: "atendimento@emater.go.gov.br" }] },
    { id: 4, titulo: "SENAR-GO", nome_completo: "Serviço Nacional de Aprendizagem Rural — Goiás", icone: "ph-graduation-cap", cor: "#2d6a4f", atribuicao: "Promove formação profissional rural e capacitações em boas práticas agrícolas, mecanização e gestão rural.", campos: [{ label: "Site", valor: "www.senar-go.com.br" }, { label: "Telefone", valor: "(62) 3243-1250" }, { label: "E-mail", valor: "senar@senar-go.com.br" }] },
    { id: 5, titulo: "MAPA — Ministério da Agricultura", nome_completo: "Ministério da Agricultura e Pecuária", icone: "ph-flag-banner", cor: "#6b3d7a", atribuicao: "Define a política agrícola federal. Responsável por registro de agrotóxicos, defesa agropecuária nacional e crédito rural.", campos: [{ label: "Site", valor: "www.gov.br/agricultura" }, { label: "Telefone Geral", valor: "0800 704 1995" }, { label: "E-mail Institucional", valor: "ouvidoria@agro.gov.br" }] }
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
    { id: 6, titulo: "Semana do Agricultor Familiar", data: "2026-05-19", data_fim: "2026-05-23", hora: "08:00", tipo: "evento", local: "Centro de Eventos de Cidade Ocidental", desc: "Evento anual com exposições, palestras e homenagens aos agricultores familiares do município." }
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
    { id: 2, titulo: "E-mail Institucional", url: "https://sh-pro92.hostgator.com.br:2096/", icone: "ph-envelope-simple", cor: "#3d5c7a", coringa: false },
    { id: 3, titulo: "Prefeitura Virtual",   url: "https://cidadeocidental.prefeituravirtual.app.br/admin", icone: "ph-globe",           cor: "#2d6a4f", coringa: false },
    { id: 4, titulo: "PRODATA",              url: "https://gestao.cidadeocidental.go.gov.br/sig/", icone: "ph-database",        cor: "#6b3d7a", coringa: false },
    { id: 5, titulo: "CAF",                  url: "https://caf.mda.gov.br/",               icone: "ph-plant",           cor: "#6b3d7a", coringa: false },
    { id: 6, titulo: "Controle de Abastecimento", url: "https://drive.google.com/drive/folders/1l0vKxiQIK8UhrvlZD__pyxpbhh3679Ye", icone: "ph-clipboard-text", cor: "#3d7a5e", coringa: false }
  ],

  layoutConfig: {
    instagramPosition: "belowQuickAccess"
  }

}; // fim window.DADOS_INICIAIS
