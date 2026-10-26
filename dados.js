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
 * COLEÇÕES GERADAS:
 *  - funcionarios, manuais, processos, arquivos, veiculos e escalaFerias
 *    são geradas por scripts/gerar-dados-fallback.mjs a partir dos
 *    registros publicados na produção. Não edite à mão: rode o gerador.
 *    O gerador omite PII (cpf, matricula, chassi, renavam).
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
      nome: "João Victor Aragão da Silva",
      cargo: "Secretário de Agricultura",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Gabinete do Secretário",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1792502351870-foto-1.jpg"
    },
    {
      id: 2,
      nome: "Railson Rodrigues Do Nascimento",
      cargo: "Subsecretário de Agricultura",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Gabinete do Subsecretário",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1792502353083-foto-2.jpg"
    },
    {
      id: 3,
      nome: "Adson Botelho Junior",
      cargo: "Gerente de Cadastro do Sim",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Diretoria de Inspeção Municipal",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1792502353828-foto-3.jpg"
    },
    {
      id: 4,
      nome: "André Luiz Magalhães Del Sarto Melo",
      cargo: "Diretor de Desenvolvimento Rural",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Diretoria de Desenvolvimento Rural",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1792502354709-foto-4.jpg"
    },
    {
      id: 5,
      nome: "Caleb Garcês Araújo",
      cargo: "Assessor de Gabinete IV",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Gabinete do Secretário",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1792502355519-foto-5.jpg"
    },
    {
      id: 6,
      nome: "Felipe dos Santos Felix",
      cargo: "Diretor de Agricultura",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Diretoria de Agricultura",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1792502356367-foto-6.jpg"
    },
    {
      id: 7,
      nome: "Flávia Pereira Silva",
      cargo: "Supervisora de Serviços Administrativos I",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Gabinete do Secretário",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1792502357230-foto-7.jpg"
    },
    {
      id: 8,
      nome: "José Luiz Mendes Pereira",
      cargo: "Assessor de Extensão Rural",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Assessoria de Extensão Rural",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1792502358003-foto-8.jpg"
    },
    {
      id: 9,
      nome: "José Tadeu de Moraes Junior",
      cargo: "Agente Administrativo",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Gabinete do Secretário",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Estatutários",
      descricao: null,
      foto_storage_path: "funcionarios/1792502358770-foto-9.jpg"
    },
    {
      id: 10,
      nome: "Lizandra Renata Pereira Chrisostomo",
      cargo: "Assessora de Gabinete III",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Diretoria de Inspeção Municipal",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1792502359592-foto-10.jpg"
    },
    {
      id: 11,
      nome: "Nerisvaldo Pereira da Silva",
      cargo: "Tratorista",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Diretoria de Desenvolvimento Rural",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Estatutários",
      descricao: null,
      foto_storage_path: "funcionarios/1774659784148-nerisvaldo.jpeg"
    },
    {
      id: 12,
      nome: "Rogério Martins de Carvalho",
      cargo: "Assessor de Gabinete III",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Gabinete do Secretário",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1792502360406-foto-12.jpg"
    },
    {
      id: 13,
      nome: "Valter Lisboa da Costa",
      cargo: "Gerente de Capacitação Rural",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Diretoria de Desenvolvimento Rural",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1774659822155-valtinha.jpeg"
    },
    {
      id: 14,
      nome: "Elida Maria Alves de Miranda",
      cargo: "Assessora Legislativa",
      lotacao: "Secretaria Municipal de Governo",
      departamento: "Gabinete Do Secretário",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1792502361094-foto-14.jpg"
    },
    {
      id: 15,
      nome: "Marcio Aranha da Costa",
      cargo: "Supervisor de Serviços Administrativos I",
      lotacao: "Secretaria de Agricultura E Desenv Rural",
      departamento: "Gabinete do Secretário",
      orgao: "Governo Municipal de Cidade Ocidental",
      vinculo: "Comissão",
      descricao: null,
      foto_storage_path: "funcionarios/1777484157427-Maricio-Aranha.jpeg"
    },
  ],

  manuais: [
    {
      id: 1,
      titulo: "Manual de Ofícios - Geral",
      categoria: "Administrativo",
      descricao: null,
      observacoes: "Este manual serve para orientar, de forma geral, como fazer um ofício, cada ofício tem demandas diferentes, podem ter anexo, podem ser direcionados a um ou mais destinatários, etc",
      passos: [
        {
          texto: "Abra um ofício para usar como modelo, de preferência um que esteja relacionado com o mesmo tema para facilitar na adaptação.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/sign/manuais-imagens-smader/manuais/1775072817251-Screenshot_1.png?token=eyJraWQiOiIwYWI1ZDU3Zi04ZjQyLTQzMTEtODI0YS02MjYwYzVlYWJhMjYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtYW51YWlzLWltYWdlbnMtc21hZGVyL21hbnVhaXMvMTc3NTA3MjgxNzI1MS1TY3JlZW5zaG90XzEucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MjUyNDA2OCwiZXhwIjoxNzkyNTI3NjY4fQ.Tu0uUt1IkHNVPYM1bFI03_BbhEFQDUsg91XBJo-ISM4",
          imagem_storage_path: "manuais/1775072817251-Screenshot_1.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "No cabeçalho do ofício, altere o número sequencial do mesmo (verifique qual foi o último ofício gerado, se o último foi o 99, este será o 100). Atualize a data (dia/mês/ano).",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/sign/manuais-imagens-smader/manuais/1775072817749-Screenshot_2.png?token=eyJraWQiOiIwYWI1ZDU3Zi04ZjQyLTQzMTEtODI0YS02MjYwYzVlYWJhMjYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtYW51YWlzLWltYWdlbnMtc21hZGVyL21hbnVhaXMvMTc3NTA3MjgxNzc0OS1TY3JlZW5zaG90XzIucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MjUyNDA2OCwiZXhwIjoxNzkyNTI3NjY4fQ.FJfIngJsnO7SLuCZVxXMyrHvFYUBwZS7zitX7mAZuxA",
          imagem_storage_path: "manuais/1775072817749-Screenshot_2.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Ainda no cabeçalho, coloque o vocativo pertinente ao destinatário do documento, o nome do destinatário, o cargo do destinatário, e a cidade em que ele se situa.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/sign/manuais-imagens-smader/manuais/1775074170856-Screenshot_3.png?token=eyJraWQiOiIwYWI1ZDU3Zi04ZjQyLTQzMTEtODI0YS02MjYwYzVlYWJhMjYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtYW51YWlzLWltYWdlbnMtc21hZGVyL21hbnVhaXMvMTc3NTA3NDE3MDg1Ni1TY3JlZW5zaG90XzMucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MjUyNDA2OCwiZXhwIjoxNzkyNTI3NjY4fQ.uMCS2ndzAtv1W1kRAkhDriYapF_zMi_kBRiRQu13wpA",
          imagem_storage_path: "manuais/1775074170856-Screenshot_3.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "No 'Assunto', coloque um resumo geral do objetivo do ofício, pode ser 'encaminhamento', 'solicitação', 'resposta', etc. Exemplo: 'Encaminhamento de folhas de ponto - março/2026'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/sign/manuais-imagens-smader/manuais/1775074171744-Screenshot_4.png?token=eyJraWQiOiIwYWI1ZDU3Zi04ZjQyLTQzMTEtODI0YS02MjYwYzVlYWJhMjYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtYW51YWlzLWltYWdlbnMtc21hZGVyL21hbnVhaXMvMTc3NTA3NDE3MTc0NC1TY3JlZW5zaG90XzQucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MjUyNDA2OCwiZXhwIjoxNzkyNTI3NjY4fQ.CrTKfWBYTKcl17CvBlZ_9D-4Xpr4ZRNw64BLouui6_g",
          imagem_storage_path: "manuais/1775074171744-Screenshot_4.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "No corpo do ofício, indique novamente a quem o documento está sendo direcionado.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/sign/manuais-imagens-smader/manuais/1775074172091-Screenshot_5.png?token=eyJraWQiOiIwYWI1ZDU3Zi04ZjQyLTQzMTEtODI0YS02MjYwYzVlYWJhMjYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtYW51YWlzLWltYWdlbnMtc21hZGVyL21hbnVhaXMvMTc3NTA3NDE3MjA5MS1TY3JlZW5zaG90XzUucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MjUyNDA2OCwiZXhwIjoxNzkyNTI3NjY4fQ.-UqMsEjo82uQRbYCcViM0U6FTISPRD9pTHu6nwv5Ffc",
          imagem_storage_path: "manuais/1775074172091-Screenshot_5.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "O conteúdo do ofício para simplificar pode ser divido em 3 partes (Saudação com a demanda do ofício; justificativa/detalhes/especificações/informações complementares da demanda; e por último a conclusão da demanda com agradecimento)",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/sign/manuais-imagens-smader/manuais/1775074172398-Screenshot_6.png?token=eyJraWQiOiIwYWI1ZDU3Zi04ZjQyLTQzMTEtODI0YS02MjYwYzVlYWJhMjYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtYW51YWlzLWltYWdlbnMtc21hZGVyL21hbnVhaXMvMTc3NTA3NDE3MjM5OC1TY3JlZW5zaG90XzYucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MjUyNDA2OCwiZXhwIjoxNzkyNTI3NjY4fQ.OO0wgF8-gD9zgId0ZzJJ0jG8nbYyzoUn08ikGa3x6BQ",
          imagem_storage_path: "manuais/1775074172398-Screenshot_6.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Por fim, todo ofício deve ser assinado, na maioria das vezes será sempre o Secretário, mas em via de regra, o ofício é assinado por quem faz a demanda. Inserir nome, cargo e matrícula/decreto de nomeação",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/sign/manuais-imagens-smader/manuais/1775074172944-Screenshot_7.png?token=eyJraWQiOiIwYWI1ZDU3Zi04ZjQyLTQzMTEtODI0YS02MjYwYzVlYWJhMjYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtYW51YWlzLWltYWdlbnMtc21hZGVyL21hbnVhaXMvMTc3NTA3NDE3Mjk0NC1TY3JlZW5zaG90XzcucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MjUyNDA2OCwiZXhwIjoxNzkyNTI3NjY4fQ.s1ZjawGdr1xXpLyE1bSk5A_Spt8euCE8mUbb0QTVWnQ",
          imagem_storage_path: "manuais/1775074172944-Screenshot_7.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        }
      ],
      documentos: [
        {
          nome: "Modelo - Ofício",
          arquivo_id: 3
        }
      ]
    },
    {
      id: 2,
      titulo: "Manual de Ofício - ChatGPT",
      categoria: "Técnico",
      descricao: null,
      observacoes: "Manual de como criar ofícios usando o ChatGPT (chatgpt.com). Este manual serve como base para entender como solicitar ao ChatGPT para criar o conteúdo do ofício, caso use o Prefeitura Virtual, o procedimento é mesmo, mas o conteudo precisa ser inserido no documento diretamente no sistema do Prefeitura Virtual (Ver guia Manual de Ofício - Prefeitura Virtual)",
      passos: [
        {
          texto: "Abra um ofício para usar de modelo. (De preferência um ofício que tenha a ver com o novo). Caso não tenha acesso a nenhum, há um modelo na página 'Arquivos'",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587430618-Screenshot_0.png",
          imagem_storage_path: "manuais/1775587430618-Screenshot_0.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Abra o ChatGPT. (chatgpt.com)",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587447802-Screenshot_1.png",
          imagem_storage_path: "manuais/1775587447802-Screenshot_1.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Conforme Manual de Ofícios - Geral, o ofício é dividido em 3 'blocos': Saudação + Demanda, Corpo Geral do Oficio com a demanda detalhada, Conclusão da demanda.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587506578-Screenshot_2.png",
          imagem_storage_path: "manuais/1775587506578-Screenshot_2.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "O Ofício deve responder as seguintes perguntas: O que/Qual a demanda; Quantos; Para quem; Por que; Quando; Onde; e Como.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587507234-Screenshot_3.png",
          imagem_storage_path: "manuais/1775587507234-Screenshot_3.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Copie o conteúdo do ofício que você está usando como modelo. (apenas o que estiver entre a saudação, e a assinatura.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587507564-Screenshot_4.png",
          imagem_storage_path: "manuais/1775587507564-Screenshot_4.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Faça a solicitação ao ChatGPT respondendo às perguntas do passo 4, e cole o conteúdo que você copiou do ofício para o ChatGPT usar como modelo.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587508076-Screenshot_5.png",
          imagem_storage_path: "manuais/1775587508076-Screenshot_5.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Envie a mensagem para o ChatGPT.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587508388-Screenshot_6.png",
          imagem_storage_path: "manuais/1775587508388-Screenshot_6.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "O ChatGPT irá responder com o conteúdo do novo ofício, certifique-se que ele contempla todas as informações que você pediu para ele inserir, e copie o conteúdo.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587508797-Screenshot_7.png",
          imagem_storage_path: "manuais/1775587508797-Screenshot_7.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Vá até o documento que você está editando e clique com o botão direito ná área selecionada do texto antigo e depois selecione a opção 'Manter Somente Texto'. (conforme print)",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587509213-Screenshot_8.png",
          imagem_storage_path: "manuais/1775587509213-Screenshot_8.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "O novo texto será copiado com exatamente a mesma formatação original do documento, mas terá algumas linhas em branco que o ChatGPT cria. Apenas apague as linhas em branco.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587509731-Screenshot_9.png",
          imagem_storage_path: "manuais/1775587509731-Screenshot_9.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Atualize todos os dados do cabeçalho de acordo com o Manual de Ofícios - Geral. (Numero, data, destinatário e assunto). E o ofício estará pronto. Basta salvar com a nova numeração na pasta de ofícios. (Cuidado para não salvar por cima do ofício antigo)",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587510247-Screenshot_10.png",
          imagem_storage_path: "manuais/1775587510247-Screenshot_10.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Exemplo de outro ofício com assunto diferente.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587511032-Screenshot_11.png",
          imagem_storage_path: "manuais/1775587511032-Screenshot_11.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Adicionalmente, sempre que o ChatGPT te entregar um ofício, sempre leia e veja se está de acordo, se precisas modificar algo, e peça para ele. No exemplo da imagem, faltou informar 'Onde'. (Capela Nsa Sra Abadia no Mesquita)",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775587511466-Screenshot_12.png",
          imagem_storage_path: "manuais/1775587511466-Screenshot_12.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        }
      ],
      documentos: [
        {
          nome: "Modelo - Ofício",
          arquivo_id: 3
        }
      ]
    },
    {
      id: 3,
      titulo: "Manual de Ofício - Prefeitura Virtual",
      categoria: "Técnico",
      descricao: null,
      observacoes: "Manual para criação e envio de ofícios através do sistema Prefeitura Virtual.\nRecomendo deixar a opção 'Publicar ao Assinar' sempre marcada como 'Sim', pois após a assinatura, o documento é enviado automaticamente, caso essa opção esteja como 'Não', o usuário deve, após a assinatura do secretário, clicar no botão 'Publicar'.",
      passos: [
        {
          texto: "Acesse o sistema Prefeitura Virtual (https://cidadeocidental.prefeituravirtual.app.br/). Na página inicial vá para o menu 'Administração'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590258209-Screenshot_1.png",
          imagem_storage_path: "manuais/1775590258209-Screenshot_1.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Selecione 'Protocolo Eletrônico'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590259118-Screenshot_2.png",
          imagem_storage_path: "manuais/1775590259118-Screenshot_2.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Selecione 'Documento Eletrônico'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590259463-Screenshot_3.png",
          imagem_storage_path: "manuais/1775590259463-Screenshot_3.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Tipo de Documento: 'Ofício'. Publicar ao Assinar: 'Sim'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590260013-Screenshot_4.png",
          imagem_storage_path: "manuais/1775590260013-Screenshot_4.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Preencha o 'Nome do Interessado', 'Cargo do Interessado', 'Cidade' e 'Assunto' do ofício.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590260487-Screenshot_5.png",
          imagem_storage_path: "manuais/1775590260487-Screenshot_5.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Clique em 'Selecionar Modelos'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590931480-Screenshot_6.png",
          imagem_storage_path: "manuais/1775590931480-Screenshot_6.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Selecione o modelo de ofício da Agricultura.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590932276-Screenshot_7.png",
          imagem_storage_path: "manuais/1775590932276-Screenshot_7.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Clique em 'Editar documento'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590932494-Screenshot_8.png",
          imagem_storage_path: "manuais/1775590932494-Screenshot_8.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Selecione o conteúdo entre 'Senhor e Respeitosamente' e cole o conteúdo do ofício.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590932726-Screenshot_9.png",
          imagem_storage_path: "manuais/1775590932726-Screenshot_9.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Clique em 'Concluir e Fechar'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590933062-Screenshot_10.png",
          imagem_storage_path: "manuais/1775590933062-Screenshot_10.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Clique em 'Salvar' no final da página.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590933340-Screenshot_11.png",
          imagem_storage_path: "manuais/1775590933340-Screenshot_11.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Clique em 'Gerar número de Documento'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590933666-Screenshot_12.png",
          imagem_storage_path: "manuais/1775590933666-Screenshot_12.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Clique em 'Visualizar Documento' e confira se está tudo de acordo (cabeçaho, numeração, conteúdo do ofício, etc.).",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590933882-Screenshot_13.png",
          imagem_storage_path: "manuais/1775590933882-Screenshot_13.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Na aba 'Signatários do Documento', clique em 'Adicionar'",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590934190-Screenshot_14.png",
          imagem_storage_path: "manuais/1775590934190-Screenshot_14.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Clique em 'Adicionar Signatários'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590934458-Screenshot_15.png",
          imagem_storage_path: "manuais/1775590934458-Screenshot_15.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "No campo nome digite 'joão victor'. Clique em 'Aplicar Filtros'. Veja se apareceu o nome do João e clique no botão de clipe.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590934715-Screenshot_16.png",
          imagem_storage_path: "manuais/1775590934715-Screenshot_16.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Digite o cargo do João: 'Secretário de Agricultura'. Clique em 'Salvar'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775590935018-Screenshot_17.png",
          imagem_storage_path: "manuais/1775590935018-Screenshot_17.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Na aba 'Envio Eletrônico', clique em 'Adicionar'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775591065520-Screenshot_18.png",
          imagem_storage_path: "manuais/1775591065520-Screenshot_18.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Em 'Nome do Departamento' digite o nome do departamento de destino. Clique em 'Aplicar Filtros'. Procure na lista o departamento correto e clique em 'Selecionar', e por fim, clique em 'Vincular'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775591066195-Screenshot_19.png",
          imagem_storage_path: "manuais/1775591066195-Screenshot_19.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Clique em 'Enviar Assinatura'",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775591357344-Screenshot_20.png",
          imagem_storage_path: "manuais/1775591357344-Screenshot_20.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "O ofício está pronto e já foi para o Secretário Assinar. Assim que ele assinar o ofício será encaminhado automaticamente pois já configuramos a opção 'Publicar ao Assinar'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775591358168-Screenshot_21.png",
          imagem_storage_path: "manuais/1775591358168-Screenshot_21.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        }
      ],
      documentos: [
        {
          nome: "Modelo - Ofício",
          arquivo_id: 3
        }
      ]
    },
    {
      id: 4,
      titulo: "Manual para Visualizar/Editar Ofícios Criados - Prefeitura Virtual",
      categoria: "Técnico",
      descricao: null,
      observacoes: "Essa manual mostra como o usuário pode listar os ofícios criados pelo departamento de forma fácil e rápida.",
      passos: [
        {
          texto: "Acesse o sistema Prefeitura Virtual (https://cidadeocidental.prefeituravirtual.app.br/). Na página inicial vá para o menu 'Administração'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775658733994-Screenshot_1.png",
          imagem_storage_path: "manuais/1775658733994-Screenshot_1.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Acesse 'Protocolo Eletrônico'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775659613162-Screenshot_2.png",
          imagem_storage_path: "manuais/1775659613162-Screenshot_2.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Acesse 'Documento Eletrônico'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775659613671-Screenshot_3.png",
          imagem_storage_path: "manuais/1775659613671-Screenshot_3.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Clique na 'Lupa' da barra de pesquisa.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775659614012-Screenshot_3.png",
          imagem_storage_path: "manuais/1775659614012-Screenshot_3.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Caso queira filtrar os ofícios que aparecem, há várias opções, depois clique em 'Aplicar Filtros'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775659614315-Screenshot_4.png",
          imagem_storage_path: "manuais/1775659614315-Screenshot_4.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Os documentos listados aparecerão em baixo, com numeração de oficio, status atual, se ja foi assinado, se ja foi publicado, assunto, etc.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775659614798-Screenshot_5.png",
          imagem_storage_path: "manuais/1775659614798-Screenshot_5.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Caso queira editar ou excluir o ofício, basta clicar nos respectivos botões.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775659615186-Screenshot_6.png",
          imagem_storage_path: "manuais/1775659615186-Screenshot_6.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        }
      ],
      documentos: []
    },
    {
      id: 5,
      titulo: "Manual de Controle de Documentos Recebidos/Enviados - Prefeitura Virtual",
      categoria: "Técnico",
      descricao: null,
      observacoes: "Manual para ensinar o usuário a visualizar documentos recebidos e enviados pelo departamento.",
      passos: [
        {
          texto: "Acesse o sistema Prefeitura Virtual (https://cidadeocidental.prefeituravirtual.app.br/). Na página inicial vá para o menu 'Administração'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775659895185-Screenshot_1.png",
          imagem_storage_path: "manuais/1775659895185-Screenshot_1.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Acesse 'Protocolo Eletrônico'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775660150249-Screenshot_2.png",
          imagem_storage_path: "manuais/1775660150249-Screenshot_2.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Acesse 'Controle de Documentos Eletrônicos'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775660151136-Screenshot_1.png",
          imagem_storage_path: "manuais/1775660151136-Screenshot_1.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Nesta página voce pode selecionar se quer visualizar os documentos recebidos ou os documentos enviados.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775660151807-Screenshot_2.png",
          imagem_storage_path: "manuais/1775660151807-Screenshot_2.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Em ambos os casos você pode aplicar filtros para refinar a lista de documentos exibidos.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775660152138-Screenshot_3.png",
          imagem_storage_path: "manuais/1775660152138-Screenshot_3.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Os documentos são exibidos mais abaixo, de acordo com os filtros selecionados (se nao filtrar, mostrará todos).",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775660152539-Screenshot_4.png",
          imagem_storage_path: "manuais/1775660152539-Screenshot_4.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Por fim, voce pode clicar no botões de 'Visualizar', ou 'Fazer Download' do documento através dos respectivos botões.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775660152997-Screenshot_5.png",
          imagem_storage_path: "manuais/1775660152997-Screenshot_5.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        }
      ],
      documentos: []
    },
    {
      id: 6,
      titulo: "Manual de Preenchimento de Requerimento para Autorização de Corte ou Poda de Árvores",
      categoria: "Administrativo",
      descricao: null,
      observacoes: "É recomendado o preenchimento de todos os campos para facilitar o atendimento da equipe técnica. Se possível, preferir por informar um telefone que possua WhatsApp para melhor comunicação e envio de documentação pendente.",
      passos: [
        {
          texto: "Na seção 'Identificação do Solicitante' é necessário preencher os dados pessoais da pessoa que está fazendo a solicitação.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775672515038-Screenshot_1.png",
          imagem_storage_path: "manuais/1775672515038-Screenshot_1.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Na seção 'Localização da Área', é necessário preencher os dados de onde o serviço deverá ser efetuado.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775672516349-Screenshot_2.png",
          imagem_storage_path: "manuais/1775672516349-Screenshot_2.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Na seção 'Requer Atividade', é necessário informar que tipo de serviço está sendo solicitado (corte/poda/ambos), quantas árvores serão afetadas por cada serviço, e se elas estão em área particular ou área pública.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775672518013-Screenshot_3.png",
          imagem_storage_path: "manuais/1775672518013-Screenshot_3.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Na seção 'Justificativa', é necessário informar o motivo da solicitação (por que o serviço está sendo solicitado). É recomendado informar riscos de queda, riscos de acidentes, danos à propriedade, etc.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775672519392-Screenshot_4.png",
          imagem_storage_path: "manuais/1775672519392-Screenshot_4.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        },
        {
          texto: "Na seção 'Declaração de Responsabilidade', o servidor da Secretaria que está prestando atendimento preenche com seu nome e cargo, e o solicitante assina no campo de 'Assinatura'.",
          imagem: "https://yiujxempodimegdoexqo.supabase.co/storage/v1/object/public/manuais-imagens-smader/manuais/1775672520566-Screenshot_5.png",
          imagem_storage_path: "manuais/1775672520566-Screenshot_5.png",
          imagem_storage_bucket: "manuais-imagens-smader"
        }
      ],
      documentos: [
        {
          nome: "Requerimento de Corte/Poda de Árvore",
          arquivo_id: 46
        }
      ]
    },
  ],

  processos: [
    {
      id: 1,
      titulo: "Processo de Solicitação de Corte ou Poda de Árvore",
      categoria: "Meio Ambiente",
      descricao: null,
      etapas: [
        {
          titulo: "Recepção e triagem",
          descricao: "A pessoa solicitante vai até a Secretaria de Agricultura localizada na Subprefeitura do Jardim ABC munida dos seguintes documentos:\n- Documento com foto (CPF/RG/CNH/etc...);\n- Comprovante de Residência;\n- Foto das árvores a serem podadas/cortadas.",
          manuais_ids: []
        },
        {
          titulo: "Preenchimento do Requerimento",
          descricao: "A pessoa solicitante deve preencher o 'Requerimento para Autorização de Corte e/ou Poda de Árvores', fornecido pela Secretaria.",
          manuais_ids: [6]
        },
        {
          titulo: "Envio da Documentação",
          descricao: "Tendo em mãos as cópias do documento com foto, comprovante de residência, foto das árvores e requerimento preenchido, a Secretaria de Agricultura encaminha todos esses documentos para a Secretaria do Meio Ambiente, que então darão prosseguimento  ao pleito.",
          manuais_ids: []
        },
        {
          titulo: "Realização do Serviço",
          descricao: "Após análise por parte da equipe técnica da Secretaria do Meio \nAmbiente, é emitida uma Autorização de corte/poda que deve ser encaminhada ao setor responsável da Subprefeitura do Jardim ABC para realização do serviço",
          manuais_ids: []
        }
      ]
    },
    {
      id: 2,
      titulo: "Processo de Solicitação de Serviços de Trator e Implementos",
      categoria: "Administrativo",
      descricao: null,
      etapas: [
        {
          titulo: "Requerimento do Serviço",
          descricao: "O produtor rural solicitante pode ir até a Secretaria de Agricultura ou solicitar o serviço através do WhatsApp institucional da Secretaria. (61 99613-6573)",
          manuais_ids: []
        },
        {
          titulo: "Protocolar a Solicitação",
          descricao: "Ao solicitar o serviço, o produtor deve passar todas as informações necessárias para que a Secretaria possa emitir o boleto correspondente à quantidade de horas de prestação de serviço necessário.",
          manuais_ids: []
        },
        {
          titulo: "Emissão de Boleto",
          descricao: "Com todas as informações necessárias, a Secretaria irá emitir a GRU para o produtor pagar.",
          manuais_ids: []
        },
        {
          titulo: "Agendamento do Serviço",
          descricao: "Após pagamento da GRU, o produtor deve enviar o comprovante de pagamento da mesma para a Secretaria dar baixa no boleto e realizar o planejamento de realização do serviço.",
          manuais_ids: []
        },
        {
          titulo: "Realização do Serviço",
          descricao: "Após agendamento do serviço, a Secretaria entrará em contato com o produtor para confirmar a data de realização do serviço e proceder para o atendimento na data agendada.",
          manuais_ids: []
        }
      ]
    },
    {
      id: 3,
      titulo: "Processo de Realização de Eventos",
      categoria: "Administrativo",
      descricao: null,
      etapas: [
        {
          titulo: "Planejamento do Evento",
          descricao: "A Secretaria deve realizar o planejamento da execução do evento em questão.\nQuestões a serem planejadas: Quando? Quem? Onde? Como? Recursos Necessários? Apoio de outras Secretarias? Processos de contratação?",
          manuais_ids: []
        },
        {
          titulo: "Informações Básicas",
          descricao: "Definir nome do evento, data, horário, local definido, responsável geral.",
          manuais_ids: []
        },
        {
          titulo: "Estrutura do Evento",
          descricao: "Palco ou tenda, mesas e cadeiras, energia elétrica, iluminação, som (microfone, caixa), equipamentos (data show, telão), extensões e cabos",
          manuais_ids: []
        },
        {
          titulo: "Infraestrutura",
          descricao: "Banheiros (fixo ou químico), água (bebedouro ou galão), lixeiras, limpeza antes/durante/depois, tapumes ou isolamento, sinalização do local",
          manuais_ids: []
        },
        {
          titulo: "Alimentação",
          descricao: "Coffee break ou alimentação, água para equipe e participantes, apoio de cozinha ou servidores.",
          manuais_ids: []
        },
        {
          titulo: "Segurança e Apoio",
          descricao: "Segurança (guarda ou vigilância), apoio do trânsito, ambulância ou primeiros socorros, bombeiros (se necessário).",
          manuais_ids: []
        },
        {
          titulo: "Comunicação",
          descricao: "Convites, divulgação (redes sociais, grupos), lista de presença ou inscrições, cerimonial (ordem de falas).",
          manuais_ids: []
        },
        {
          titulo: "Equipe",
          descricao: "Responsável pela organização, recepção do público, apoio na estrutura, acompanhamento de autoridades.",
          manuais_ids: []
        },
        {
          titulo: "Enviar Ofícios",
          descricao: "Solicitação de espaço, solicitação de alimentação, solicitação de segurança, solicitação de trânsito, solicitação de estrutura (tendas, palco, som), solicitação de banheiros químicos, solicitação de limpeza, solicitação de iluminação, etc.",
          manuais_ids: [1, 2, 3]
        },
        {
          titulo: "No dia do evento",
          descricao: "Chegar com antecedência, conferir estrutura, testar som e energia, conferir alimentação, recepcionar participantes, registrar (fotos e lista)",
          manuais_ids: []
        }
      ]
    },
  ],

  arquivos: [
    {
      id: 3,
      nome: "Modelo - Ofício",
      tipo: "DOCX",
      tags: ["modelo", "ofício"],
      arquivo_nome: "Modelo - Ofício.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067093212-Modelo-Oficio.docx"
    },
    {
      id: 4,
      nome: "Modelo - Branco - Agricultura",
      tipo: "DOCX",
      tags: ["modelo"],
      arquivo_nome: "Modelo - Branco - Agricultura.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067110260-Modelo-Branco-Agricultura.docx"
    },
    {
      id: 5,
      nome: "Modelo - Branco - Prefeitura",
      tipo: "DOCX",
      tags: ["modelo"],
      arquivo_nome: "Modelo - Branco - Prefeitura.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067125275-Modelo-Branco-Prefeitura.docx"
    },
    {
      id: 6,
      nome: "Modelo - Carta de Referência",
      tipo: "DOCX",
      tags: ["modelo"],
      arquivo_nome: "Modelo - Carta de Referencia.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067140963-Modelo-Carta-de-Referencia.docx"
    },
    {
      id: 7,
      nome: "Modelo - Concessão - Seloart",
      tipo: "DOCX",
      tags: ["modelo", "outro"],
      arquivo_nome: "Modelo - Concessão-Seloart.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067152812-Modelo-Concessao-Seloart.docx"
    },
    {
      id: 8,
      nome: "Modelo - Controle de Combustível",
      tipo: "DOCX",
      tags: ["modelo", "planilha", "relatório", "veículos"],
      arquivo_nome: "Modelo - Controle Combustível.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067163715-Modelo-Controle-Combustivel.docx"
    },
    {
      id: 9,
      nome: "Modelo - DFD",
      tipo: "DOCX",
      tags: ["contrato", "modelo"],
      arquivo_nome: "Modelo - DFD.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067173588-Modelo-DFD.docx"
    },
    {
      id: 10,
      nome: "Modelo - ETP",
      tipo: "DOCX",
      tags: ["contrato", "modelo"],
      arquivo_nome: "Modelo - ETP.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067183635-Modelo-ETP.docx"
    },
    {
      id: 11,
      nome: "Modelo - TR",
      tipo: "DOCX",
      tags: ["contrato", "modelo"],
      arquivo_nome: "Modelo - TR.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067193452-Modelo-TR.docx"
    },
    {
      id: 12,
      nome: "Modelo - Prestação de Contas de Viagens",
      tipo: "DOCX",
      tags: ["financeiro", "formulário", "modelo", "rh"],
      arquivo_nome: "Modelo - Prestação de Contas.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067205124-Modelo-Prestacao-de-Contas.docx"
    },
    {
      id: 13,
      nome: "Modelo - Relatório de Viagem",
      tipo: "DOCX",
      tags: ["financeiro", "formulário", "modelo", "rh"],
      arquivo_nome: "Modelo - Relatório de Viagem.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067215260-Modelo-Relatorio-de-Viagem.docx"
    },
    {
      id: 14,
      nome: "Modelo - Solicitação de Diária",
      tipo: "DOCX",
      tags: ["financeiro", "formulário", "modelo", "ofício", "rh"],
      arquivo_nome: "Modelo - Solicitação de Diária.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067226140-Modelo-Solicitacao-de-Diaria.docx"
    },
    {
      id: 15,
      nome: "Logos (com e sem fundo)",
      tipo: "ZIP",
      tags: ["imagem"],
      arquivo_nome: "Logos.zip",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067243715-Logos.zip"
    },
    {
      id: 16,
      nome: "Logo Agricultura - com fundo",
      tipo: "JPG/JPEG",
      tags: ["imagem"],
      arquivo_nome: "Logo Agricultura - com fundo.jpg",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067265787-Logo-Agricultura-com-fundo.jpg"
    },
    {
      id: 17,
      nome: "Logo Agricultura - com fundo",
      tipo: "PDF",
      tags: ["imagem"],
      arquivo_nome: "Logo Agricultura - com fundo.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067274899-Logo-Agricultura-com-fundo.pdf"
    },
    {
      id: 18,
      nome: "Logo Agricultura - sem fundo",
      tipo: "PNG",
      tags: ["imagem"],
      arquivo_nome: "Logo Agricultura - sem fundo.png",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067283027-Logo-Agricultura-sem-fundo.png"
    },
    {
      id: 19,
      nome: "Logo Ocidental - com fundo",
      tipo: "PDF",
      tags: ["imagem"],
      arquivo_nome: "Logo Ocidental - com fundo.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067295947-Logo-Ocidental-com-fundo.pdf"
    },
    {
      id: 20,
      nome: "Logo Ocidental - sem fundo",
      tipo: "PNG",
      tags: ["imagem"],
      arquivo_nome: "Logo Ocidental - sem fundo.png",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067307100-Logo-Ocidental-sem-fundo.png"
    },
    {
      id: 21,
      nome: "Logo SIM - com fundo",
      tipo: "PNG",
      tags: ["imagem"],
      arquivo_nome: "Logo SIM - com fundo.png",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067319460-Logo-SIM-com-fundo.png"
    },
    {
      id: 22,
      nome: "Logo SIM - sem fundo",
      tipo: "PNG",
      tags: ["imagem"],
      arquivo_nome: "Logo SIM - sem fundo.png",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067328523-Logo-SIM-sem-fundo.png"
    },
    {
      id: 23,
      nome: "Logo João - sem fundo",
      tipo: "PNG",
      tags: ["imagem"],
      arquivo_nome: "Logo João - sem fundo.png",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067338524-Logo-Joao-sem-fundo.png"
    },
    {
      id: 24,
      nome: "Modelo - Formulário (usar como base)",
      tipo: "XLSX",
      tags: ["formulário", "modelo", "planilha"],
      arquivo_nome: "Modelo - Formulário (usar como base).xlsx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067358851-Modelo-Formulario-usar-como-base-.xlsx"
    },
    {
      id: 25,
      nome: "Modelo - Ordem de Serviço",
      tipo: "XLSX",
      tags: ["formulário", "modelo", "planilha"],
      arquivo_nome: "Modelo - Ordem de Serviço.xlsx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067370435-Modelo-Ordem-de-Servico.xlsx"
    },
    {
      id: 26,
      nome: "Modelo - Requerimento de serviço",
      tipo: "XLSX",
      tags: ["formulário", "modelo", "planilha"],
      arquivo_nome: "Modelo - Requerimento de serviço.xlsx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067381979-Modelo-Requerimento-de-servico.xlsx"
    },
    {
      id: 27,
      nome: "Modelo - Certificado SIM (Canva)",
      tipo: "Outro",
      tags: ["modelo", "outro"],
      arquivo_nome: null,
      storage_bucket: null,
      storage_path: null
    },
    {
      id: 28,
      nome: "Formulários - SIM",
      tipo: "ZIP",
      tags: ["formulário", "modelo"],
      arquivo_nome: "SIM.rar",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067405339-SIM.rar"
    },
    {
      id: 29,
      nome: "Aquisição de Peças de Manutenção de Grades e Arados",
      tipo: "ZIP",
      tags: ["contrato", "financeiro", "ofício"],
      arquivo_nome: "Aquisição de Peças de Manutenção de Grades e Arados.rar",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067430771-Aquisicao-de-Pecas-de-Manutencao-de-Grades-e-Arados.rar"
    },
    {
      id: 30,
      nome: "Aquisição de Trado Holandês",
      tipo: "ZIP",
      tags: ["contrato", "financeiro", "ofício"],
      arquivo_nome: "Aquisição de Trado Holandês.rar",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067465475-Aquisicao-de-Trado-Holandes.rar"
    },
    {
      id: 31,
      nome: "Contratação de Trio-Elétrico - Festa Marmelo 2026",
      tipo: "ZIP",
      tags: ["contrato", "financeiro", "ofício"],
      arquivo_nome: "Contratação de Trio-Elétrico - Festa Marmelo 2026.rar",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067483835-Contratacao-de-Trio-Eletrico-Festa-Marmelo-2026.rar"
    },
    {
      id: 32,
      nome: "Dados Secretaria Agricultura 2025",
      tipo: "XLSX",
      tags: ["planilha", "relatório"],
      arquivo_nome: "Dados Secretaria Agricultura 2025.xlsx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067515083-Dados-Secretaria-Agricultura-2025.xlsx"
    },
    {
      id: 33,
      nome: "DFD Predio Agricutura",
      tipo: "DOCX",
      tags: ["contrato", "modelo"],
      arquivo_nome: "DFD Predio Agricutura.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067523123-DFD-Predio-Agricutura.docx"
    },
    {
      id: 34,
      nome: "Estrutura de Cargos da Prefeitura",
      tipo: "XLSX",
      tags: ["planilha", "rh"],
      arquivo_nome: "Estrutura de Cargos da Prefeitura.xlsx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067533452-Estrutura-de-Cargos-da-Prefeitura.xlsx"
    },
    {
      id: 35,
      nome: "Formulário de Visita Técnica - MAPEA CAMPO",
      tipo: "PDF",
      tags: ["formulário"],
      arquivo_nome: "Formulário de Visita Técnica - MAPEA CAMPO.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067546099-Formulario-de-Visita-Tecnica-MAPEA-CAMPO.pdf"
    },
    {
      id: 36,
      nome: "Minuta - Declaração de Capacidade Técnica - PROMAQ",
      tipo: "DOCX",
      tags: ["minuta", "relatório"],
      arquivo_nome: "Minuta - Declaração de Capacidade Técnica - PROMAQ.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067561235-Minuta-Declaracao-de-Capacidade-Tecnica-PROMAQ.docx"
    },
    {
      id: 37,
      nome: "Minuta - Plano de Trabalho - Solicitação de kits de irrigação e mandiocultura",
      tipo: "DOCX",
      tags: ["minuta", "relatório"],
      arquivo_nome: "Minuta - Plano de Trabalho - Solicitação de kits de irrigação e mandiocultura.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067569284-Minuta-Plano-de-Trabalho-Solicitacao-de-kits-de-irrigacao-e-mandiocultura.docx"
    },
    {
      id: 38,
      nome: "PCA 2026 - Agricultura",
      tipo: "XLSX",
      tags: ["financeiro", "planilha"],
      arquivo_nome: "PCA 2026 - Agricultura.xlsx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067578731-PCA-2026-Agricultura.xlsx"
    },
    {
      id: 39,
      nome: "Projeto - MAPEA CAMPO",
      tipo: "DOCX",
      tags: ["relatório"],
      arquivo_nome: "Projeto - MAPEA CAMPO.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067588019-Projeto-MAPEA-CAMPO.docx"
    },
    {
      id: 40,
      nome: "Projeto de Lei - PORTEIRA DENTRO",
      tipo: "DOCX",
      tags: ["contrato", "minuta"],
      arquivo_nome: "Projeto de Lei - PORTEIRA DENTRO.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067599627-Projeto-de-Lei-PORTEIRA-DENTRO.docx"
    },
    {
      id: 41,
      nome: "Relatório Técnico - PROMAQ",
      tipo: "DOCX",
      tags: ["relatório"],
      arquivo_nome: "Relatório Técnico - PROMAQ.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067611675-Relatorio-Tecnico-PROMAQ.docx"
    },
    {
      id: 42,
      nome: "Termo Doação Mitsubishi L200",
      tipo: "PDF",
      tags: ["veículos"],
      arquivo_nome: "Veiculos - Termo Doação Mitsubishi L200.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067626931-Veiculos-Termo-Doacao-Mitsubishi-L200.pdf"
    },
    {
      id: 43,
      nome: "Manual CAF",
      tipo: "PDF",
      tags: ["manual"],
      arquivo_nome: "Manual CAF.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775067640435-Manual-CAF.pdf"
    },
    {
      id: 46,
      nome: "Requerimento de Corte/Poda de Árvore",
      tipo: "PDF",
      tags: ["formulário", "modelo"],
      arquivo_nome: "Requerimento de Corte ou Poda.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1775671751606-Requerimento-de-Corte-ou-Poda.pdf"
    },
    {
      id: 47,
      nome: "Modelo - Ordem de Serviço Trator - Antigo",
      tipo: "PDF",
      tags: ["formulário", "modelo"],
      arquivo_nome: "Ordem de Serviço - Trator.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787664358994-Ordem-de-Servico-Trator.pdf"
    },
    {
      id: 48,
      nome: "Modelo - Ordem de Serviço Trator - Antigo",
      tipo: "XLSX",
      tags: ["formulário", "modelo", "planilha"],
      arquivo_nome: "Modelo - Requerimento de serviço.xlsx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787663823060-Modelo-Requerimento-de-servico.xlsx"
    },
    {
      id: 49,
      nome: "Relatório de CAFs Emitidas - até 18-08-2026",
      tipo: "XLSX",
      tags: ["planilha", "relatório"],
      arquivo_nome: "CAFs Emitidas.xlsx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787664052252-CAFs-Emitidas.xlsx"
    },
    {
      id: 50,
      nome: "Controle de Abastecimento",
      tipo: "XLSX",
      tags: ["planilha", "relatório"],
      arquivo_nome: null,
      storage_bucket: "arquivos-smader",
      storage_path: null
    },
    {
      id: 51,
      nome: "Modelo - Autodeclaração de Renda  - CAF",
      tipo: "DOCX",
      tags: ["formulário", "modelo"],
      arquivo_nome: "MODELO - Autodeclaração de Renda Famliar.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787920551183-MODELO-Autodeclaracao-de-Renda-Famliar.docx"
    },
    {
      id: 52,
      nome: "MODELO - Autodeclaração de Identidade Ética - CAF",
      tipo: "PDF",
      tags: ["formulário", "modelo"],
      arquivo_nome: "AUTODECLARAÇÃO DE IDENTIDADE ÉTICA E DE PERTENCIMENTO ÉTNICO.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787920619062-AUTODECLARACAO-DE-IDENTIDADE-ETICA-E-DE-PERTENCIMENTO-ETNICO.pdf"
    },
    {
      id: 53,
      nome: "Termo de Responsabilidade - Microtrator",
      tipo: "DOCX",
      tags: ["formulário", "veículos"],
      arquivo_nome: "Termo Responsabilidade Microtrator.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787925071965-Termo-Responsabilidade-Microtrator.docx"
    },
    {
      id: 54,
      nome: "Plano de Trabalho - Kit de Mandiocultura",
      tipo: "DOCX",
      tags: ["minuta"],
      arquivo_nome: "Plano de Trabalho - Doação de Kit de Mandiocultura.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787925126037-Plano-de-Trabalho-Doacao-de-Kit-de-Mandiocultura.docx"
    },
    {
      id: 55,
      nome: "Autorização Retirada CONAB",
      tipo: "DOCX",
      tags: ["minuta", "modelo"],
      arquivo_nome: "Autorização Retirada - Osman.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787925308117-Autorizacao-Retirada-Osman.docx"
    },
    {
      id: 56,
      nome: "Termo de Responsabilidade - Microtrator",
      tipo: "PDF",
      tags: ["formulário", "veículos"],
      arquivo_nome: "Termo de Responsabilidade - Microtrator.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787925357229-Termo-de-Responsabilidade-Microtrator.pdf"
    },
    {
      id: 57,
      nome: "Termo de Doação - Kit de Mandiocultura - CODEVASF",
      tipo: "PDF",
      tags: ["contrato"],
      arquivo_nome: "Termo_de_Doacao_-_kit_Mandiocultura_-_Cidade_Ociental_-_Proc._888-2025_assinado_assinado.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787925440405-Termo_de_Doacao_-_kit_Mandiocultura_-_Cidade_Ociental_-_Proc._888-2025_assinado_assinado.pdf"
    },
    {
      id: 58,
      nome: "Relatório Técnico de Consumo de Combustível",
      tipo: "PDF",
      tags: ["relatório", "veículos"],
      arquivo_nome: "Relatorio Combustivel - SMADER.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787925520885-Relatorio-Combustivel-SMADER.pdf"
    },
    {
      id: 59,
      nome: "Relatório Técnico de Consumo de Combustível",
      tipo: "DOCX",
      tags: ["modelo", "relatório"],
      arquivo_nome: "Relatorio Combustivel - SMADER - 24-06.docx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787925548541-Relatorio-Combustivel-SMADER-24-06.docx"
    },
    {
      id: 60,
      nome: "Listagem DUAM Trator 1",
      tipo: "PDF",
      tags: ["planilha", "relatório"],
      arquivo_nome: "LISTAGEM DE BAIXA de serviço de trator janeiro a abril 2026 (1).pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787925614476-LISTAGEM-DE-BAIXA-de-servico-de-trator-janeiro-a-abril-2026-1-.pdf"
    },
    {
      id: 61,
      nome: "Listagem DUAM Trator 2",
      tipo: "PDF",
      tags: ["planilha", "relatório"],
      arquivo_nome: "TAXA DE SERVIÇO DE TRATOR - PERIODO 01-01-2025 A 17-03-2026.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787925654709-TAXA-DE-SERVICO-DE-TRATOR-PERIODO-01-01-2025-A-17-03-2026.pdf"
    },
    {
      id: 62,
      nome: "Aviso de Férias - 2025",
      tipo: "PDF",
      tags: ["modelo", "rh"],
      arquivo_nome: "AVISO DE FÉRIAS 2025 - AGRICULTURA.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787925704621-AVISO-DE-FERIAS-2025-AGRICULTURA.pdf"
    },
    {
      id: 63,
      nome: "Termo de Responsabilidade - Vale Transporte",
      tipo: "PDF",
      tags: ["formulário", "modelo", "rh"],
      arquivo_nome: "Termo de Responsabilidade Vales Transportes.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1787925776349-Termo-de-Responsabilidade-Vales-Transportes.pdf"
    },
    {
      id: 64,
      nome: "Ordem de Serviço - Trator",
      tipo: "PDF",
      tags: ["formulário", "relatório"],
      arquivo_nome: "Ordem de Serviço - Trator.pdf",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1792673782707-Ordem-de-Servico-Trator.pdf"
    },
    {
      id: 65,
      nome: "Modelo - Ordem de Serviço - Trator",
      tipo: "XLSX",
      tags: ["formulário", "modelo", "planilha", "relatório"],
      arquivo_nome: "Modelo - Requerimento de serviço.xlsx",
      storage_bucket: "arquivos-smader",
      storage_path: "arquivos/1792673817987-Modelo-Requerimento-de-servico.xlsx"
    },
  ],

  veiculos: [
    {
      id: 1,
      nome: "Trator YTO EX854",
      tipo: "Trator",
      marca: "YTO",
      modelo: "EX854",
      ano: "2025",
      placa: "YEX-8545",
      patrimonio: "054625",
      combustivel: "Diesel",
      situacao: "Em operação",
      localizacao: "Pátio da Secretaria",
      motoristas: "João Batista / Carlos Lima",
      observacoes: "Utilizado para gradagem, aragem e apoio em ações de mecanização rural.",
      arquivo_ids: [],
      motorista_ids: [11, 13],
      icone: "ph-tractor",
      cor: "#7a3d3d",
      cor_veiculo: "Vermelho"
    },
    {
      id: 2,
      nome: "Trator New Holland TT4.75",
      tipo: "Trator",
      marca: "New Holland",
      modelo: "TT4.75",
      ano: "2020",
      placa: "NEW-4750",
      patrimonio: "048890",
      combustivel: "Diesel",
      situacao: "Em operação",
      localizacao: "Operação",
      motoristas: "Marcos Silva",
      observacoes: "Usado no transporte de calcário, insumos e apoio logístico às operações rurais.",
      arquivo_ids: [],
      motorista_ids: [11, 13],
      icone: "ph-tractor",
      cor: "#3d5c7a",
      cor_veiculo: "Azul"
    },
    {
      id: 3,
      nome: "Caminhonete Mitsubishi L200",
      tipo: "Caminhonete",
      marca: "Mitsubishi",
      modelo: "L200",
      ano: "N/A",
      placa: "PRP9B34",
      patrimonio: "N/A",
      combustivel: "Diesel",
      situacao: "Em operação",
      localizacao: "Gabinete / uso em campo",
      motoristas: "Fernanda Braga / Equipe técnica",
      observacoes: "Veículo leve para visitas técnicas, fiscalização e deslocamento administrativo.",
      arquivo_ids: [42],
      motorista_ids: [1, 4, 6, 11, 13],
      icone: "ph-car",
      cor: "#7a5c3d",
      cor_veiculo: "Branco"
    },
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
    {
      id: 1,
      funcionario_id: 9,
      nome: "José Tadeu de Moraes Junior",
      cargo: "Agente Administrativo",
      periodo_inicio: "2026-05-04",
      periodo_fim: "2026-05-22",
      status: "agendado"
    },
    {
      id: 2,
      funcionario_id: 3,
      nome: "Adson Botelho Junior",
      cargo: "Gerente de Cadastro do Sim",
      periodo_inicio: "2026-09-02",
      periodo_fim: "2026-10-02",
      status: "agendado"
    },
    {
      id: 3,
      funcionario_id: 10,
      nome: "Lizandra Renata Pereira Chrisostomo",
      cargo: "Assessora de Gabinete III",
      periodo_inicio: "2026-08-10",
      periodo_fim: "2026-08-30",
      status: "em_curso"
    },
    {
      id: 4,
      funcionario_id: 9,
      nome: "José Tadeu de Moraes Junior",
      cargo: "Agente Administrativo",
      periodo_inicio: "2026-09-08",
      periodo_fim: "2026-09-18",
      status: "agendado"
    },
    {
      id: 5,
      funcionario_id: 5,
      nome: "Caleb Garcês Araújo",
      cargo: "Assessor de Gabinete IV",
      periodo_inicio: "2026-09-01",
      periodo_fim: "2026-09-30",
      status: "agendado"
    },
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
