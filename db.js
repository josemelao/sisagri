/**
 * ============================================================
 * SMADER — db.js
 * Camada de abstração de dados.
 *
 * MODO LOCAL (padrão):
 *   Lê de window.DADOS_INICIAIS (dados.js) e persiste no
 *   localStorage. Todas as edições feitas pelo Admin ficam
 *   salvas no browser até o usuário exportar e substituir dados.js.
 *
 * MIGRAÇÃO PARA SUPABASE:
 *   1. Adicionar <script src="supabase-js CDN"></script> no HTML
 *   2. Preencher SUPABASE_URL e SUPABASE_ANON_KEY abaixo
 *   3. Mudar USE_SUPABASE para true
 *   As funções públicas (DB.get, DB.save, DB.delete) não mudam —
 *   o script.js e o admin.js não precisam de nenhuma alteração.
 * ============================================================
 */

const DB_CONFIG = {
  USE_SUPABASE:    true,           // → true para ativar Supabase
  SUPABASE_URL:    'https://yiujxempodimegdoexqo.supabase.co',              // 'https://xxxx.supabase.co'
  SUPABASE_KEY:    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdWp4ZW1wb2RpbWVnZG9leHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjY2MzEsImV4cCI6MjA4OTk0MjYzMX0.D4cFcM50yJoxGohOfKQ4P7BoJVF60EVZUFMjjPsQZ8o',              // anon public key
  LS_KEY:          'smader_db_v1', // chave principal do localStorage
  LEGACY_LS_KEY:   'seagri_db_v1', // chave antiga para migração segura
};

/* ============================================================
   INICIALIZAÇÃO — carrega dados na memória
   ============================================================ */
let _db = null; // cache em memória
let _sb = null; // cliente Supabase
let _dbStatus = {
  provider: 'local',
  supabaseConfigured: false,
  supabaseConnected: false,
  writesReachSupabase: false,
  lastError: '',
};

function _notifyCollectionUpdated(colecao) {
  window.dispatchEvent(new CustomEvent('db:collection-updated', { detail: { colecao } }));
}

function _emitStatusChanged() {
  window.dispatchEvent(new CustomEvent('db:status-changed', { detail: DB.getStatus() }));
}

function _setDbStatus(patch) {
  _dbStatus = { ..._dbStatus, ...patch };
  _emitStatusChanged();
}

const SUPABASE_TABLES = {
  funcionarios: 'funcionarios',
  veiculos: 'veiculos',
  escalaFerias: 'escala_ferias',
  agendaEventos: 'agenda_eventos',
  infoJuridico: 'info_juridico',
  infoMunicipio: 'info_municipio',
  infoOrgaos: 'info_orgaos',
  servicos: 'servicos',
  sistemas: 'sistemas',
  avisos: 'avisos',
  acessoRapido: 'acesso_rapido',
  arquivos: 'arquivos',
  manuais: 'manuais',
  processos: 'processos',
};

function _isSupabaseCollection(colecao) {
  return !!SUPABASE_TABLES[colecao];
}

function _createSupabaseClient() {
  const factory = window.supabase?.createClient;
  if (!factory || !DB_CONFIG.SUPABASE_URL || !DB_CONFIG.SUPABASE_KEY) return null;
  return factory(DB_CONFIG.SUPABASE_URL, DB_CONFIG.SUPABASE_KEY);
}

function _normalizeSupabaseRow(colecao, row) {
  if (!row) return row;
  switch (colecao) {
    case 'funcionarios':
      return {
        ...row,
        setor: row.setor || row.lotacao || '',
        lotacao: row.lotacao || row.setor || '',
      };
    case 'veiculos':
      return {
        ...row,
        icone: row.icone || 'ph-truck',
        cor: row.cor || '#5c7a3d',
        cor_veiculo: row.cor_veiculo || '',
        motorista: row.motorista || row.motoristas || '',
        motoristas: row.motoristas || row.motorista || '',
        motorista_ids: Array.isArray(row.motorista_ids) ? row.motorista_ids : [],
        obs: row.obs || row.observacoes || '',
        observacoes: row.observacoes || row.obs || '',
        arquivo_ids: Array.isArray(row.arquivo_ids) ? row.arquivo_ids : [],
      };
    case 'agendaEventos':
      return {
        ...row,
        desc: row.desc || row.descricao || '',
        descricao: row.descricao || row.desc || '',
      };
    case 'avisos':
      return {
        ...row,
        desc: row.desc || row.descricao || '',
        descricao: row.descricao || row.desc || '',
      };
    case 'infoJuridico':
    case 'infoMunicipio':
      return {
        ...row,
        badge: row.badge || row.tag || '',
        tag: row.tag || row.badge || '',
        campos: Array.isArray(row.campos) ? row.campos : [],
      };
    case 'infoOrgaos':
      return {
        ...row,
        campos: Array.isArray(row.campos) ? row.campos : [],
      };
    case 'servicos':
      return {
        ...row,
        categoria_outro: row.categoria_outro || '',
        documentos: Array.isArray(row.documentos) ? row.documentos : [],
        obs: row.obs || '',
        processos_ids: Array.isArray(row.processos_ids) ? row.processos_ids : [],
      };
    case 'sistemas':
      return {
        ...row,
        manuais_ids: Array.isArray(row.manuais_ids) ? row.manuais_ids : [],
        processos_ids: Array.isArray(row.processos_ids) ? row.processos_ids : [],
      };
    case 'acessoRapido':
      return {
        ...row,
        descricao: row.descricao || '',
        coringa: !!row.coringa,
      };
    case 'arquivos':
      return {
        ...row,
        tags: Array.isArray(row.tags) ? row.tags : [],
        url: row.url || '',
        arquivo_data: row.arquivo_data || '',
        arquivo_nome: row.arquivo_nome || '',
      };
    case 'manuais':
      return {
        ...row,
        descricao: row.descricao || '',
        observacoes: row.observacoes || '',
        passos: Array.isArray(row.passos) ? row.passos : [],
        documentos: Array.isArray(row.documentos) ? row.documentos : [],
      };
    case 'processos':
      return {
        ...row,
        descricao: row.descricao || '',
        etapas: Array.isArray(row.etapas) ? row.etapas : [],
      };
    default:
      return { ...row };
  }
}

function _toSupabasePayload(colecao, registro) {
  switch (colecao) {
    case 'funcionarios':
      return {
        id: registro.id,
        nome: registro.nome || null,
        matricula: registro.matricula || null,
        cargo: registro.cargo || null,
        lotacao: registro.lotacao || registro.setor || null,
        vinculo: registro.vinculo || null,
        orgao: registro.orgao || null,
        data_admissao: registro.data_admissao || null,
        telefone: registro.telefone || null,
        email: registro.email || null,
        cpf: registro.cpf || null,
        departamento: registro.departamento || null,
        descricao: registro.descricao || null,
        foto: registro.foto || null,
      };
    case 'veiculos':
      return {
        id: registro.id,
        nome: registro.nome || null,
        tipo: registro.tipo || null,
        icone: registro.icone || null,
        cor: registro.cor || null,
        marca: registro.marca || null,
        modelo: registro.modelo || null,
        ano: registro.ano || null,
        cor_veiculo: registro.cor_veiculo || null,
        placa: registro.placa || null,
        patrimonio: registro.patrimonio || null,
        chassi: registro.chassi || null,
        renavam: registro.renavam || null,
        combustivel: registro.combustivel || null,
        situacao: registro.situacao || null,
        localizacao: registro.localizacao || null,
        motoristas: registro.motoristas || registro.motorista || null,
        motorista_ids: Array.isArray(registro.motorista_ids) ? registro.motorista_ids : [],
        observacoes: registro.observacoes || registro.obs || null,
        arquivo_ids: Array.isArray(registro.arquivo_ids) ? registro.arquivo_ids : [],
      };
    case 'escalaFerias':
      return {
        id: registro.id,
        funcionario_id: registro.funcionario_id || null,
        nome: registro.nome || null,
        cargo: registro.cargo || null,
        periodo_inicio: registro.periodo_inicio || null,
        periodo_fim: registro.periodo_fim || null,
        status: registro.status || null,
      };
    case 'agendaEventos':
      return {
        id: registro.id,
        titulo: registro.titulo || null,
        data: registro.data || null,
        data_fim: registro.data_fim || null,
        hora: registro.hora || null,
        hora_fim: registro.hora_fim || null,
        tipo: registro.tipo || null,
        local: registro.local || null,
        descricao: registro.descricao || registro.desc || null,
      };
    case 'infoJuridico':
    case 'infoMunicipio':
      return {
        id: registro.id,
        titulo: registro.titulo || null,
        icone: registro.icone || null,
        cor: registro.cor || null,
        badge: registro.badge || null,
        tag: registro.tag || null,
        campos: Array.isArray(registro.campos) ? registro.campos : [],
      };
    case 'infoOrgaos':
      return {
        id: registro.id,
        titulo: registro.titulo || null,
        nome_completo: registro.nome_completo || null,
        atribuicao: registro.atribuicao || null,
        icone: registro.icone || null,
        cor: registro.cor || null,
        campos: Array.isArray(registro.campos) ? registro.campos : [],
      };
    case 'servicos':
      return {
        id: registro.id,
        nome: registro.nome || null,
        categoria: registro.categoria || null,
        categoria_outro: registro.categoria_outro || null,
        icone: registro.icone || null,
        cor: registro.cor || null,
        descricao: registro.descricao || null,
        publico: registro.publico || null,
        como_solicitar: registro.como_solicitar || null,
        prazo: registro.prazo || null,
        obs: registro.obs || null,
        documentos: Array.isArray(registro.documentos) ? registro.documentos : [],
        processos_ids: Array.isArray(registro.processos_ids) ? registro.processos_ids : [],
      };
    case 'sistemas':
      return {
        id: registro.id,
        nome: registro.nome || null,
        nome_completo: registro.nome_completo || null,
        icone: registro.icone || null,
        cor: registro.cor || null,
        descricao: registro.descricao || null,
        url: registro.url || null,
        acesso: registro.acesso || null,
        orgao: registro.orgao || null,
        manuais_ids: Array.isArray(registro.manuais_ids) ? registro.manuais_ids : [],
        processos_ids: Array.isArray(registro.processos_ids) ? registro.processos_ids : [],
      };
    case 'avisos':
      return {
        id: registro.id,
        titulo: registro.titulo || null,
        tipo: registro.tipo || null,
        local: registro.local || null,
        descricao: registro.descricao || registro.desc || null,
      };
    case 'acessoRapido':
      return {
        id: registro.id,
        titulo: registro.titulo || null,
        url: registro.url || null,
        descricao: registro.descricao || null,
        icone: registro.icone || null,
        cor: registro.cor || null,
        coringa: !!registro.coringa,
      };
    case 'arquivos':
      return {
        id: registro.id,
        nome: registro.nome || null,
        tipo: registro.tipo || null,
        tags: Array.isArray(registro.tags) ? registro.tags : [],
        url: registro.url || null,
        arquivo_data: registro.arquivo_data || null,
        arquivo_nome: registro.arquivo_nome || null,
      };
    case 'manuais':
      return {
        id: registro.id,
        titulo: registro.titulo || null,
        categoria: registro.categoria || null,
        descricao: registro.descricao || null,
        observacoes: registro.observacoes || null,
        passos: Array.isArray(registro.passos) ? registro.passos : [],
        documentos: Array.isArray(registro.documentos) ? registro.documentos : [],
      };
    case 'processos':
      return {
        id: registro.id,
        titulo: registro.titulo || null,
        categoria: registro.categoria || null,
        descricao: registro.descricao || null,
        etapas: Array.isArray(registro.etapas) ? registro.etapas : [],
      };
    default:
      return { ...registro };
  }
}

async function _loadSupabaseCollection(colecao, options = {}) {
  if (!_sb || !_isSupabaseCollection(colecao)) return;
  const tabela = SUPABASE_TABLES[colecao];
  const columns = (colecao === 'arquivos' && options.metadataOnly)
    ? 'id,nome,tipo,tags,url,arquivo_nome'
    : '*';
  const { data, error } = await _sb.from(tabela).select(columns).order('id', { ascending: true });
  if (error) throw error;
  _db[colecao] = (data || []).map(row => _normalizeSupabaseRow(colecao, row));
}

async function _refreshSupabaseCollectionsForExport() {
  if (!_sb) return;
  await Promise.all(Object.keys(SUPABASE_TABLES).map(colecao => _loadSupabaseCollection(colecao)));
  _persistLocal();
  _notifyCollectionUpdated('arquivos');
}

/**
 * Inicializa o banco.
 * Retorna uma Promise que resolve quando os dados estão prontos.
 * O script.js chama DB.init().then(() => renderApp()).
 */
async function dbInit() {
  if (DB_CONFIG.USE_SUPABASE) {
    return _initSupabase();
  }
  return _initLocal();
}

function _initLocal() {
  // 1. Tenta a chave atual do localStorage
  const saved = localStorage.getItem(DB_CONFIG.LS_KEY);
  if (saved) {
    try {
      _db = JSON.parse(saved);
      console.info('[DB] Dados carregados do localStorage (SMADER).');
      return Promise.resolve();
    } catch (e) {
      console.warn('[DB] localStorage atual corrompido. Tentando migração/backup.');
    }
  }

  // 2. Compatibilidade: migra a chave antiga, se existir
  const legacySaved = localStorage.getItem(DB_CONFIG.LEGACY_LS_KEY);
  if (legacySaved) {
    try {
      _db = JSON.parse(legacySaved);
      _persistLocal();
      localStorage.removeItem(DB_CONFIG.LEGACY_LS_KEY);
      console.info('[DB] Dados migrados de seagri_db_v1 para smader_db_v1.');
      return Promise.resolve();
    } catch (e) {
      console.warn('[DB] localStorage legado corrompido. Usando dados padrão.');
    }
  }

  // 3. Fallback: dados iniciais de dados.js
  if (!window.DADOS_INICIAIS) {
    console.error('[DB] dados.js não encontrado! Inclua <script src="dados.js"> antes de db.js.');
    _db = {};
    return Promise.resolve();
  }
  _db = JSON.parse(JSON.stringify(window.DADOS_INICIAIS)); // deep clone
  console.info('[DB] Dados carregados de dados.js (padrão).');
  return Promise.resolve();
}

async function _initSupabase() {
  _sb = _createSupabaseClient();
  _setDbStatus({
    provider: 'local',
    supabaseConfigured: !!(DB_CONFIG.SUPABASE_URL && DB_CONFIG.SUPABASE_KEY),
    supabaseConnected: false,
    writesReachSupabase: false,
    lastError: '',
  });
  if (!_sb) {
    console.warn('[DB] Cliente Supabase indisponível. Usando localStorage como fallback.');
    _setDbStatus({
      provider: 'local',
      supabaseConnected: false,
      writesReachSupabase: false,
      lastError: 'Cliente Supabase indisponível.',
    });
    return _initLocal();
  }

  _db = JSON.parse(JSON.stringify(window.DADOS_INICIAIS || {}));

  try {
    const colecoes = Object.keys(SUPABASE_TABLES);
    await Promise.all(colecoes.filter(c => c !== 'arquivos').map(_loadSupabaseCollection));
    await _loadSupabaseCollection('arquivos', { metadataOnly: true });
    _persistLocal();
    _setDbStatus({
      provider: 'supabase',
      supabaseConnected: true,
      writesReachSupabase: true,
      lastError: '',
    });
    console.info('[DB] Dados carregados do Supabase.');

    _loadSupabaseCollection('arquivos')
      .then(() => {
        _persistLocal();
        _notifyCollectionUpdated('arquivos');
        console.info('[DB] Arquivos completos carregados em segundo plano.');
      })
      .catch((e) => {
        console.warn('[DB] Falha ao carregar arquivos completos em segundo plano.', e);
      });

    return Promise.resolve();
  } catch (e) {
    console.warn('[DB] Falha ao carregar do Supabase. Usando fallback local.', e);
    _setDbStatus({
      provider: 'local',
      supabaseConnected: false,
      writesReachSupabase: false,
      lastError: e?.message || 'Falha ao carregar dados do Supabase.',
    });
    return _initLocal();
  }
}

/* ============================================================
   API PÚBLICA — usada pelo script.js e admin.js
   ============================================================ */
const DB = {

  /** Retorna uma cópia de uma coleção */
  get(colecao) {
    if (!_db || !_db[colecao]) return [];
    return JSON.parse(JSON.stringify(_db[colecao]));
  },

  /** Retorna um registro pelo id */
  getById(colecao, id) {
    const lista = DB.get(colecao);
    return lista.find(r => r.id === id) || null;
  },

  /** Insere um novo registro (gera id automático) */
  insert(colecao, registro) {
    if (!_db[colecao]) _db[colecao] = [];
    const ids = _db[colecao].map(r => r.id || 0);
    const novoId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
    const novoRegistro = _normalizeSupabaseRow(colecao, { ...registro, id: novoId });
    _db[colecao].push(novoRegistro);
    _persistLocal();
    if (_sb && _isSupabaseCollection(colecao)) {
      _sb.from(SUPABASE_TABLES[colecao]).insert(_toSupabasePayload(colecao, novoRegistro)).then(({ error }) => {
        if (error) {
          _setDbStatus({
            provider: 'local',
            supabaseConnected: false,
            writesReachSupabase: false,
            lastError: error.message || `Falha ao inserir em ${SUPABASE_TABLES[colecao]}.`,
          });
          console.error(`[DB] Falha ao inserir em ${SUPABASE_TABLES[colecao]}:`, error);
          return;
        }
        _setDbStatus({
          provider: 'supabase',
          supabaseConnected: true,
          writesReachSupabase: true,
          lastError: '',
        });
      });
    }
    return novoRegistro;
  },

  /** Atualiza um registro existente pelo id */
  update(colecao, id, dados) {
    if (!_db[colecao]) return null;
    const idx = _db[colecao].findIndex(r => r.id === id);
    if (idx === -1) return null;
    _db[colecao][idx] = _normalizeSupabaseRow(colecao, { ..._db[colecao][idx], ...dados, id });
    _persistLocal();
    if (_sb && _isSupabaseCollection(colecao)) {
      _sb.from(SUPABASE_TABLES[colecao]).update(_toSupabasePayload(colecao, _db[colecao][idx])).eq('id', id).then(({ error }) => {
        if (error) {
          _setDbStatus({
            provider: 'local',
            supabaseConnected: false,
            writesReachSupabase: false,
            lastError: error.message || `Falha ao atualizar ${SUPABASE_TABLES[colecao]}:${id}.`,
          });
          console.error(`[DB] Falha ao atualizar ${SUPABASE_TABLES[colecao]}:${id}`, error);
          return;
        }
        _setDbStatus({
          provider: 'supabase',
          supabaseConnected: true,
          writesReachSupabase: true,
          lastError: '',
        });
      });
    }
    return _db[colecao][idx];
  },

  /** Remove um registro pelo id */
  delete(colecao, id) {
    if (!_db[colecao]) return false;
    const antes = _db[colecao].length;
    _db[colecao] = _db[colecao].filter(r => r.id !== id);
    _persistLocal();
    if (_sb && _isSupabaseCollection(colecao)) {
      _sb.from(SUPABASE_TABLES[colecao]).delete().eq('id', id).then(({ error }) => {
        if (error) {
          _setDbStatus({
            provider: 'local',
            supabaseConnected: false,
            writesReachSupabase: false,
            lastError: error.message || `Falha ao excluir de ${SUPABASE_TABLES[colecao]}:${id}.`,
          });
          console.error(`[DB] Falha ao excluir de ${SUPABASE_TABLES[colecao]}:${id}`, error);
          return;
        }
        _setDbStatus({
          provider: 'supabase',
          supabaseConnected: true,
          writesReachSupabase: true,
          lastError: '',
        });
      });
    }
    return _db[colecao].length < antes;
  },

  /** Substitui uma coleção inteira (usado pelo admin ao importar) */
  replaceCollection(colecao, lista) {
    _db[colecao] = JSON.parse(JSON.stringify(lista)).map(item => _normalizeSupabaseRow(colecao, item));
    _persistLocal();
    if (_sb && _isSupabaseCollection(colecao)) {
      const tabela = SUPABASE_TABLES[colecao];
      const payload = _db[colecao].map(item => _toSupabasePayload(colecao, item));
      _sb.from(tabela).delete().gte('id', 0).then(({ error }) => {
        if (error) {
          console.error(`[DB] Falha ao limpar ${tabela} antes de replaceCollection:`, error);
          return;
        }
        _sb.from(tabela).insert(payload).then(({ error: insertError }) => {
          if (insertError) console.error(`[DB] Falha ao repor ${tabela}:`, insertError);
        });
      });
    }
  },

  /** Retorna o banco completo (para exportação) */
  exportAll() {
    return JSON.parse(JSON.stringify(_db));
  },

  /** Retorna o status atual da conexão/persistência */
  getStatus() {
    return JSON.parse(JSON.stringify(_dbStatus));
  },

  /** Importa um banco completo (substitui tudo, usado no admin) */
  importAll(dados) {
    _db = JSON.parse(JSON.stringify(dados));
    _persistLocal();
    if (_sb) {
      Object.keys(SUPABASE_TABLES).forEach(colecao => {
        DB.replaceCollection(colecao, _db[colecao] || []);
      });
    }
  },

  /* ---- Autenticação admin (Supabase Auth) ---- */

  /** Verifica se a sessão admin está ativa */
  async isAdminLoggedIn() {
    if (!_sb) return false;
    const { data, error } = await _sb.auth.getSession();
    if (error) {
      console.error('[DB] Falha ao verificar sessão admin:', error);
      return false;
    }
    return !!data.session;
  },

  /** Tenta fazer login com email e senha */
  async adminLogin(email, senha) {
    if (!_sb) return false;
    const { error } = await _sb.auth.signInWithPassword({ email, password: senha });
    if (error) {
      console.error('[DB] Falha no login admin:', error);
      return false;
    }
    return true;
  },

  async adminLogout() {
    if (!_sb) return;
    const { error } = await _sb.auth.signOut();
    if (error) {
      console.error('[DB] Falha no logout admin:', error);
    }
  },

  /** Gera o conteúdo do dados.js atualizado para download */
  async exportarDadosJS() {
    try {
      if (_sb) {
        await _refreshSupabaseCollectionsForExport();
      }
    } catch (e) {
      console.error('[DB] Falha ao atualizar dados do Supabase antes da exportacao.', e);
      if (!confirm('Falha ao atualizar os dados direto do Supabase antes da exportacao. Deseja exportar mesmo assim com os dados em memoria?')) {
        return;
      }
    }

    const dados = DB.exportAll();
    const conteudo = `/**\n * SMADER — dados.js (exportado em ${new Date().toLocaleString('pt-BR')})\n * Gerado automaticamente pelo painel Admin. Substitua o dados.js original por este arquivo.\n */\n\nwindow.DADOS_INICIAIS = ${JSON.stringify(dados, null, 2)};\n`;
    const blob = new Blob([conteudo], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dados.js';
    a.click();
    URL.revokeObjectURL(a.href);
  },

};

/* ============================================================
   INTERNO — persiste no localStorage
   ============================================================ */
function _persistLocal() {
  try {
    localStorage.setItem(DB_CONFIG.LS_KEY, JSON.stringify(_db));
  } catch (e) {
    console.error('[DB] Falha ao salvar no localStorage:', e);
  }
}

/* Expõe globalmente */
window.DB     = DB;
window.dbInit = dbInit;
