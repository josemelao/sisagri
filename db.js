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
  ADMIN_PASS_KEY:  'smader_admin',  // chave da senha admin no localStorage
  ADMIN_PASSWORD:  'smader2026',   // ← altere esta senha antes de usar
};

/* ============================================================
   INICIALIZAÇÃO — carrega dados na memória
   ============================================================ */
let _db = null; // cache em memória
let _sb = null; // cliente Supabase

const SUPABASE_TABLES = {
  funcionarios: 'funcionarios',
  veiculos: 'veiculos',
  escalaFerias: 'escala_ferias',
  agendaEventos: 'agenda_eventos',
};

function _isSupabaseCollection(colecao) {
  return !!SUPABASE_TABLES[colecao];
}

function _createSupabaseClient() {
  const factory = window.supabase?.createClient;
  if (!factory || !DB_CONFIG.SUPABASE_URL || !DB_CONFIG.SUPABASE_KEY) return null;
  return factory(DB_CONFIG.SUPABASE_URL, DB_CONFIG.SUPABASE_KEY);
}

function _getInitialRecord(colecao, id) {
  const lista = window.DADOS_INICIAIS?.[colecao];
  if (!Array.isArray(lista)) return null;
  return lista.find(item => item.id === id) || null;
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
      const initialVeiculo = _getInitialRecord('veiculos', row.id);
      return {
        ...row,
        icone: row.icone || initialVeiculo?.icone || 'ph-truck',
        cor: row.cor || initialVeiculo?.cor || '#5c7a3d',
        cor_veiculo: row.cor_veiculo || initialVeiculo?.cor_veiculo || '',
        motorista: row.motorista || row.motoristas || '',
        motoristas: row.motoristas || row.motorista || '',
        obs: row.obs || row.observacoes || '',
        observacoes: row.observacoes || row.obs || '',
      };
    case 'agendaEventos':
      return {
        ...row,
        desc: row.desc || row.descricao || '',
        descricao: row.descricao || row.desc || '',
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
        marca: registro.marca || null,
        modelo: registro.modelo || null,
        ano: registro.ano || null,
        placa: registro.placa || null,
        patrimonio: registro.patrimonio || null,
        chassi: registro.chassi || null,
        renavam: registro.renavam || null,
        combustivel: registro.combustivel || null,
        situacao: registro.situacao || null,
        localizacao: registro.localizacao || null,
        motoristas: registro.motoristas || registro.motorista || null,
        observacoes: registro.observacoes || registro.obs || null,
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
    default:
      return { ...registro };
  }
}

async function _loadSupabaseCollection(colecao) {
  if (!_sb || !_isSupabaseCollection(colecao)) return;
  const tabela = SUPABASE_TABLES[colecao];
  const { data, error } = await _sb.from(tabela).select('*').order('id', { ascending: true });
  if (error) throw error;
  _db[colecao] = (data || []).map(row => _normalizeSupabaseRow(colecao, row));
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
  if (!_sb) {
    console.warn('[DB] Cliente Supabase indisponível. Usando localStorage como fallback.');
    return _initLocal();
  }

  _db = JSON.parse(JSON.stringify(window.DADOS_INICIAIS || {}));

  try {
    await Promise.all(Object.keys(SUPABASE_TABLES).map(_loadSupabaseCollection));
    _persistLocal();
    console.info('[DB] Dados carregados do Supabase.');
    return Promise.resolve();
  } catch (e) {
    console.warn('[DB] Falha ao carregar do Supabase. Usando fallback local.', e);
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
        if (error) console.error(`[DB] Falha ao inserir em ${SUPABASE_TABLES[colecao]}:`, error);
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
        if (error) console.error(`[DB] Falha ao atualizar ${SUPABASE_TABLES[colecao]}:${id}`, error);
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
        if (error) console.error(`[DB] Falha ao excluir de ${SUPABASE_TABLES[colecao]}:${id}`, error);
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

  /** Reseta para os dados iniciais de dados.js */
  resetToDefaults() {
    localStorage.removeItem(DB_CONFIG.LS_KEY);
    localStorage.removeItem(DB_CONFIG.LEGACY_LS_KEY);
    _db = JSON.parse(JSON.stringify(window.DADOS_INICIAIS));
    _persistLocal();
  },

  /* ---- Autenticação admin (simples, localStorage) ---- */

  /** Verifica se a sessão admin está ativa */
  isAdminLoggedIn() {
    return sessionStorage.getItem(DB_CONFIG.ADMIN_PASS_KEY) === 'ok';
  },

  /** Tenta fazer login com a senha fornecida */
  adminLogin(senha) {
    if (senha === DB_CONFIG.ADMIN_PASSWORD) {
      sessionStorage.setItem(DB_CONFIG.ADMIN_PASS_KEY, 'ok');
      return true;
    }
    return false;
  },

  adminLogout() {
    sessionStorage.removeItem(DB_CONFIG.ADMIN_PASS_KEY);
  },

  /** Gera o conteúdo do dados.js atualizado para download */
  exportarDadosJS() {
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
