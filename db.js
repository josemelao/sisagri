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
  USE_SUPABASE:    false,           // → true para ativar Supabase
  SUPABASE_URL:    '',              // 'https://xxxx.supabase.co'
  SUPABASE_KEY:    '',              // anon public key
  LS_KEY:          'smader_db_v1', // chave principal do localStorage
  LEGACY_LS_KEY:   'seagri_db_v1', // chave antiga para migração segura
  ADMIN_PASS_KEY:  'smader_admin',  // chave da senha admin no localStorage
  ADMIN_PASSWORD:  'smader2026',   // ← altere esta senha antes de usar
};

/* ============================================================
   INICIALIZAÇÃO — carrega dados na memória
   ============================================================ */
let _db = null; // cache em memória

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
  // Stub para migração futura.
  // Implementar aqui: const { data } = await supabase.from('tabela').select()
  // e popular _db com os resultados.
  console.warn('[DB] Supabase não configurado. Usando localStorage como fallback.');
  return _initLocal();
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
    const novoRegistro = { ...registro, id: novoId };
    _db[colecao].push(novoRegistro);
    _persistLocal();
    return novoRegistro;
  },

  /** Atualiza um registro existente pelo id */
  update(colecao, id, dados) {
    if (!_db[colecao]) return null;
    const idx = _db[colecao].findIndex(r => r.id === id);
    if (idx === -1) return null;
    _db[colecao][idx] = { ..._db[colecao][idx], ...dados, id };
    _persistLocal();
    return _db[colecao][idx];
  },

  /** Remove um registro pelo id */
  delete(colecao, id) {
    if (!_db[colecao]) return false;
    const antes = _db[colecao].length;
    _db[colecao] = _db[colecao].filter(r => r.id !== id);
    _persistLocal();
    return _db[colecao].length < antes;
  },

  /** Substitui uma coleção inteira (usado pelo admin ao importar) */
  replaceCollection(colecao, lista) {
    _db[colecao] = JSON.parse(JSON.stringify(lista));
    _persistLocal();
  },

  /** Retorna o banco completo (para exportação) */
  exportAll() {
    return JSON.parse(JSON.stringify(_db));
  },

  /** Importa um banco completo (substitui tudo, usado no admin) */
  importAll(dados) {
    _db = JSON.parse(JSON.stringify(dados));
    _persistLocal();
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
  if (DB_CONFIG.USE_SUPABASE) return; // Supabase persiste na nuvem
  try {
    localStorage.setItem(DB_CONFIG.LS_KEY, JSON.stringify(_db));
  } catch (e) {
    console.error('[DB] Falha ao salvar no localStorage:', e);
  }
}

/* Expõe globalmente */
window.DB     = DB;
window.dbInit = dbInit;
