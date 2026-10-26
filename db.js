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
  CONFIG_LS_KEY:   'smader_layout_config_v1',
  PENDING_WRITES_KEY: 'smader_pending_writes_v1', // Bloco 8 (T8.2): fila offline
};

const STORAGE_CONFIG = {
  ARQUIVOS_BUCKET: 'arquivos-smader',
  MANUAIS_IMAGENS_BUCKET: 'manuais-imagens-smader',
  FUNCIONARIOS_FOTOS_BUCKET: 'funcionarios-fotos-smader',
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

function _sanitizeStorageFileName(nome = 'arquivo') {
  return (nome || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'arquivo';
}

/* ============================================================
   URL assinada (Bloco 3b parte 2)
   ------------------------------------------------------------
   Cache SOMENTE em memoria. URL assinada nunca vai para _db,
   localStorage ou dados.js: ela expira e viraria lixo persistido.
   ============================================================ */
const SIGNED_URL_TTL = 3600;
const SIGNED_URL_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const _signedUrlCache = new Map();

function _signedUrlCacheKey(bucket, path) {
  return `${bucket}/${path}`;
}

function _getCachedSignedUrl(bucket, path) {
  if (!bucket || !path) return '';
  const item = _signedUrlCache.get(_signedUrlCacheKey(bucket, path));
  if (!item) return '';
  if (item.expiresAt - Date.now() <= SIGNED_URL_REFRESH_MARGIN_MS) return '';
  return item.url;
}

function _storeSignedUrl(bucket, path, url, expiresIn) {
  if (!bucket || !path || !url) return;
  _signedUrlCache.set(_signedUrlCacheKey(bucket, path), {
    url,
    expiresAt: Date.now() + (Number(expiresIn) || SIGNED_URL_TTL) * 1000,
  });
}

function _absoluteSignedUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = (_sb && _sb.supabaseUrl) || DB_CONFIG.SUPABASE_URL || '';
  if (!base) return url;
  return `${String(base).replace(/\/+$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
}

function _decorateRuntimeUrls(colecao, item) {
  if (!item || typeof item !== 'object') return item;
  if (colecao === 'funcionarios' && item.foto_storage_path) {
    const bucket = item.foto_storage_bucket || STORAGE_CONFIG.FUNCIONARIOS_FOTOS_BUCKET;
    const url = _getCachedSignedUrl(bucket, item.foto_storage_path);
    if (url) item.foto_url = url;
  }
  if (colecao === 'arquivos' && item.storage_path) {
    const bucket = item.storage_bucket || STORAGE_CONFIG.ARQUIVOS_BUCKET;
    const url = _getCachedSignedUrl(bucket, item.storage_path);
    if (url) item.url_assinada = url;
  }
  if (colecao === 'manuais' && Array.isArray(item.passos)) {
    item.passos = item.passos.map((passo) => {
      if (!passo || typeof passo !== 'object') return passo;
      const path = passo.imagem_storage_path;
      if (!path) return passo;
      const bucket = passo.imagem_storage_bucket || STORAGE_CONFIG.MANUAIS_IMAGENS_BUCKET;
      const url = _getCachedSignedUrl(bucket, path);
      if (!url) return passo;
      return { ...passo, imagem_url_assinada: url };
    });
  }
  return item;
}

function _ensureAppConfig() {
  if (!_db || typeof _db !== 'object') _db = {};
  if (!_db.layoutConfig || typeof _db.layoutConfig !== 'object' || Array.isArray(_db.layoutConfig)) {
    _db.layoutConfig = {};
  }
  if (!_db.layoutConfig.instagramPosition) {
    _db.layoutConfig.instagramPosition = 'belowQuickAccess';
  }
  if (_db.layoutConfig.defaultSortMode !== 'id' && _db.layoutConfig.defaultSortMode !== 'nome') {
    _db.layoutConfig.defaultSortMode = 'nome';
  }
}

function _loadLocalAppConfig() {
  try {
    const saved = localStorage.getItem(DB_CONFIG.CONFIG_LS_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    console.warn('[DB] Falha ao ler layoutConfig do localStorage:', e);
    return {};
  }
}

function _applyLocalAppConfig() {
  _ensureAppConfig();
  _db.layoutConfig = {
    ..._db.layoutConfig,
    ..._loadLocalAppConfig(),
  };
  _ensureAppConfig();
}

function _persistLocalAppConfig() {
  try {
    _ensureAppConfig();
    localStorage.setItem(DB_CONFIG.CONFIG_LS_KEY, JSON.stringify(_db.layoutConfig));
  } catch (e) {
    console.error('[DB] Falha ao salvar layoutConfig no localStorage:', e);
  }
}

function _normalizeRemoteLayoutConfig(payload = {}) {
  const normalized = {};
  if (payload.default_sort_mode === 'id' || payload.default_sort_mode === 'nome') {
    normalized.defaultSortMode = payload.default_sort_mode;
  }
  return normalized;
}

async function _loadSupabaseLayoutConfig() {
  if (!_sb) return {};
  try {
    const { data, error } = await _sb
      .from('admin_settings')
      .select('default_sort_mode')
      .eq('scope', 'global')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return _normalizeRemoteLayoutConfig(data || {});
  } catch (e) {
    console.warn('[DB] Falha ao carregar admin_settings do Supabase. Mantendo fallback local.', e);
    return {};
  }
}

function _persistSupabaseLayoutConfig() {
  if (!_sb) return;
  _ensureAppConfig();
  const payload = {
    scope: 'global',
    default_sort_mode: _db.layoutConfig.defaultSortMode === 'id' ? 'id' : 'nome',
    updated_at: new Date().toISOString(),
  };

  _sb
    .from('admin_settings')
    .update({
      default_sort_mode: payload.default_sort_mode,
      updated_at: payload.updated_at,
    })
    .eq('scope', payload.scope)
    .select('scope')
    .then(({ data, error }) => {
      if (error) throw error;
      if (Array.isArray(data) && data.length > 0) {
        _setDbStatus({
          provider: 'supabase',
          supabaseConnected: true,
          writesReachSupabase: true,
          lastError: '',
        });
        return;
      }

      return _sb
        .from('admin_settings')
        .insert(payload)
        .select('scope')
        .then(({ error: insertError }) => {
          if (insertError) throw insertError;
          _setDbStatus({
            provider: 'supabase',
            supabaseConnected: true,
            writesReachSupabase: true,
            lastError: '',
          });
        });
    })
    .catch((e) => {
      _setDbStatus({
        provider: 'local',
        supabaseConnected: false,
        writesReachSupabase: false,
        lastError: e?.message || 'Falha ao salvar admin_settings no Supabase.',
      });
      console.warn('[DB] Falha ao sincronizar admin_settings no Supabase. Mantendo fallback local.', e);
    });
}
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

/**
 * Colunas que o visitante anonimo pode ler.
 *
 * A RLS continua sendo a barreira principal; esta lista e a segunda camada e
 * existe porque a partir da migration 0015 o papel `anon` perde o SELECT de
 * tabela em `funcionarios` e `veiculos` e passa a ter apenas estas colunas.
 * Nunca incluir cpf, telefone, email, chassi ou renavam aqui.
 */
const CAMPOS_PUBLICOS = {
  funcionarios:
    'id,nome,cargo,matricula,lotacao,departamento,orgao,vinculo,data_admissao,' +
    'descricao,foto,foto_storage_path,foto_storage_bucket,publish_status,updated_at',
  veiculos:
    'id,nome,tipo,marca,modelo,ano,placa,patrimonio,combustivel,situacao,' +
    'localizacao,motoristas,observacoes,arquivo_ids,motorista_ids,icone,cor,' +
    'cor_veiculo,publish_status,updated_at',
};

/** Colecoes que so existem para quem tem login interno (admin/servidor). */
const COLECOES_INTERNAS = new Set(['escalaFerias']);


function _isSupabaseCollection(colecao) {
  return !!SUPABASE_TABLES[colecao];
}

/**
 * Bloco 7 (T7.1): decide, uma vez por boot, se a sessao atual pode ver rascunho.
 * Sem sessao -> nao. Sessao sem `pode_editar` -> nao. Erro de rede/RPC -> nao
 * (fail-closed). O painel admin chama `dbInit()` de novo apos o login, entao a
 * mesma resolucao passa a devolver `true` para admin/servidor.
 */
let _podeVerRascunhos = false;

/** True quando ha sessao com `pode_editar()` (admin ou servidor). */
let _acessoInterno = false;

/** True quando a pagina e o index publico (nunca mostra rascunho). */
let _modoPublico = false;

/** Dados basicos do usuario logado: { id, email } ou null. */
let _usuarioAtual = null;

async function _resolverAcessoInterno() {
  _usuarioAtual = null;
  if (!_sb) return false;
  try {
    const { data: sessao, error: erroSessao } = await _sb.auth.getSession();
    if (erroSessao || !sessao?.session) return false;
    _usuarioAtual = {
      id: sessao.session.user?.id || null,
      email: sessao.session.user?.email || '',
    };
    const { data: podeEditar, error: erroRpc } = await _sb.rpc('pode_editar');
    if (erroRpc) return false;
    return podeEditar === true;
  } catch (e) {
    console.warn('[DB] Falha ao verificar acesso interno; aplicando visao publica.', e);
    return false;
  }
}

async function _resolverPodeVerRascunhos() {
  return _resolverAcessoInterno();
}

function _createSupabaseClient() {
  const factory = window.supabase?.createClient;
  if (!factory || !DB_CONFIG.SUPABASE_URL || !DB_CONFIG.SUPABASE_KEY) return null;
  return factory(DB_CONFIG.SUPABASE_URL, DB_CONFIG.SUPABASE_KEY);
}

const PUBLISH_STATUS = {
  PUBLISHED: 'published',
  DRAFT: 'draft',
};

function _normalizePublishStatus(value) {
  // Fail-closed: só 'published' explícito publica. Ausente, vazio ou valor
  // desconhecido fica em rascunho — nunca aparece no site público por engano.
  return value === PUBLISH_STATUS.PUBLISHED
    ? PUBLISH_STATUS.PUBLISHED
    : PUBLISH_STATUS.DRAFT;
}

function _withPublishStatus(registro) {
  if (!registro || typeof registro !== 'object' || Array.isArray(registro)) return registro;
  return {
    ...registro,
    publish_status: _normalizePublishStatus(registro.publish_status),
  };
}

function _normalizeCollectionRecord(colecao, row) {
  return _normalizeSupabaseRow(colecao, _withPublishStatus(row));
}

function _normalizeCollectionData(colecao, lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(item => _normalizeCollectionRecord(colecao, item));
}

function _normalizeDbCollections() {
  if (!_db || typeof _db !== 'object') return;
  Object.keys(SUPABASE_TABLES).forEach((colecao) => {
    _db[colecao] = _normalizeCollectionData(colecao, _db[colecao]);
  });
}

/**
 * Migração de formato antigo.
 *
 * `dados.js` e localStorage gravados ANTES de `publish_status` existir não têm
 * o campo. Esses registros já eram exibidos no site, então a migração os marca
 * como 'published' uma vez, preservando o que o usuário já via.
 *
 * Isto vale SOMENTE para dados locais (dados.js / localStorage). Linha vinda do
 * Supabase não passa por aqui: se vier sem status, é rascunho.
 */
function _migrarPublishStatusLegado(colecoes) {
  if (!colecoes || typeof colecoes !== 'object') return;
  Object.keys(SUPABASE_TABLES).forEach((colecao) => {
    const lista = colecoes[colecao];
    if (!Array.isArray(lista)) return;
    lista.forEach((registro) => {
      if (!registro || typeof registro !== 'object' || Array.isArray(registro)) return;
      const status = registro.publish_status;
      if (status === undefined || status === null || status === '') {
        registro.publish_status = PUBLISH_STATUS.PUBLISHED;
      }
    });
  });
}

function _normalizeSupabaseRow(colecao, row) {
  if (!row) return row;
  const normalizado = _normalizarCamposSupabase(colecao, row);
  // Bloco 8 (T8.5): preserva updated_at mesmo nos casos que montam o objeto
  // campo a campo (sem spread), para a deteccao de conflito funcionar.
  if (normalizado && typeof normalizado === 'object' && !Array.isArray(normalizado) && 'updated_at' in row) {
    return { ...normalizado, updated_at: row.updated_at };
  }
  return normalizado;
}

function _normalizarCamposSupabase(colecao, row) {
  switch (colecao) {
    case 'funcionarios':
      return {
        ...row,
        setor: row.setor || row.lotacao || '',
        lotacao: row.lotacao || row.setor || '',
        foto: row.foto || '',
        foto_storage_path: row.foto_storage_path || '',
        foto_storage_bucket: row.foto_storage_bucket || STORAGE_CONFIG.FUNCIONARIOS_FOTOS_BUCKET,
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
        storage_path: row.storage_path || '',
        storage_bucket: row.storage_bucket || STORAGE_CONFIG.ARQUIVOS_BUCKET,
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
        foto_storage_path: registro.foto_storage_path || null,
        foto_storage_bucket: registro.foto_storage_bucket || null,
        publish_status: _normalizePublishStatus(registro.publish_status),
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
        publish_status: _normalizePublishStatus(registro.publish_status),
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
        publish_status: _normalizePublishStatus(registro.publish_status),
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
        publish_status: _normalizePublishStatus(registro.publish_status),
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
        publish_status: _normalizePublishStatus(registro.publish_status),
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
        publish_status: _normalizePublishStatus(registro.publish_status),
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
        publish_status: _normalizePublishStatus(registro.publish_status),
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
        publish_status: _normalizePublishStatus(registro.publish_status),
      };
    case 'avisos':
      return {
        id: registro.id,
        titulo: registro.titulo || null,
        tipo: registro.tipo || null,
        local: registro.local || null,
        descricao: registro.descricao || registro.desc || null,
        publish_status: _normalizePublishStatus(registro.publish_status),
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
        publish_status: _normalizePublishStatus(registro.publish_status),
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
        storage_path: registro.storage_path || null,
        storage_bucket: registro.storage_bucket || null,
        publish_status: _normalizePublishStatus(registro.publish_status),
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
        publish_status: _normalizePublishStatus(registro.publish_status),
      };
    case 'processos':
      return {
        id: registro.id,
        titulo: registro.titulo || null,
        categoria: registro.categoria || null,
        descricao: registro.descricao || null,
        etapas: Array.isArray(registro.etapas) ? registro.etapas : [],
        publish_status: _normalizePublishStatus(registro.publish_status),
      };
    default:
      return _withPublishStatus(registro);
  }
}

/** Colunas do SELECT conforme o perfil. `arquivos` mantem a lista historica. */
function _colunasDaColecao(colecao, interno) {
  if (colecao === 'arquivos') {
    return 'id,nome,tipo,tags,url,arquivo_nome,storage_path,storage_bucket,publish_status';
  }
  if (interno) return '*';
  return CAMPOS_PUBLICOS[colecao] || '*';
}

async function _loadSupabaseCollection(colecao) {
  if (!_sb || !_isSupabaseCollection(colecao)) return;

  // Colecao interna (escala) nao e buscada no modo publico. Zera para nao
  // herdar o snapshot do dados.js/localStorage.
  if (!_acessoInterno && COLECOES_INTERNAS.has(colecao)) {
    _db[colecao] = [];
    return;
  }

  const tabela = SUPABASE_TABLES[colecao];
  const columns = _colunasDaColecao(colecao, _acessoInterno);
  let consulta = _sb.from(tabela).select(columns);
  // Bloco 7 (T7.1): segunda camada do gate de rascunho. A RLS ja bloqueia o
  // anonimo; aqui evitamos ate o download do rascunho. Fail-closed: na duvida
  // (_podeVerRascunhos=false), filtra por publicado.
  if (!_podeVerRascunhos) consulta = consulta.eq('publish_status', 'published');
  const { data, error } = await consulta.order('id', { ascending: true });
  if (error) throw error;
  _db[colecao] = _normalizeCollectionData(colecao, data || []);
}

/**
 * Carrega varias colecoes sem que uma falha derrube as demais.
 *
 * Caso tipico: o anon recebe 403 em uma colecao restrita. O boot segue com as
 * outras. So rejeita quando TODAS falham, o que indica Supabase fora do ar e
 * justifica o fallback local.
 */
async function _carregarColecoesSupabase(colecoes) {
  const resultados = await Promise.allSettled(
    colecoes.map((colecao) => _loadSupabaseCollection(colecao))
  );
  const falhas = resultados.filter((resultado) => resultado.status === 'rejected');
  if (resultados.length > 0 && falhas.length === resultados.length) {
    throw falhas[0].reason;
  }
  resultados.forEach((resultado, indice) => {
    if (resultado.status !== 'rejected') return;
    // Colecao negada/indisponivel fica vazia; o renderer nunca ve `undefined`.
    _db[colecoes[indice]] = [];
    console.warn(
      '[DB] Colecao indisponivel para este perfil:',
      resultado.reason?.message || resultado.reason
    );
  });
  return resultados;
}

async function _refreshSupabaseCollectionsForExport() {
  if (!_sb) return;
  await Promise.all(Object.keys(SUPABASE_TABLES).map(colecao => _loadSupabaseCollection(colecao)));
  _persistLocal();
  _notifyCollectionUpdated('arquivos');
}

async function _refreshSupabaseCollection(colecao) {
  if (!_sb || !_isSupabaseCollection(colecao)) return;
  await _loadSupabaseCollection(colecao);
  _persistLocal();
  _notifyCollectionUpdated(colecao);
}

/**
 * Bloco 8 (T8.1): rastreia cada escrita remota para que a UI possa esperar a
 * resposta real do banco antes de dizer "salvo".
 */
const _escritasPendentes = new Map();

function _chaveEscrita(colecao, id) {
  return `${colecao}:${id}`;
}

function _registrarEscrita(colecao, id, promessa) {
  const chave = _chaveEscrita(colecao, id);
  _escritasPendentes.set(chave, promessa);
  promessa.finally(() => {
    if (_escritasPendentes.get(chave) === promessa) _escritasPendentes.delete(chave);
  });
  return promessa;
}

function _confirmacaoDaEscrita(colecao, id) {
  return _escritasPendentes.get(_chaveEscrita(colecao, id)) || Promise.resolve({ ok: true });
}

/**
 * Bloco 8 (T8.2): fila de escrita offline.
 * Guarda a operacao que falhou por motivo transitorio (rede/5xx) e tenta de
 * novo no boot e quando o navegador volta a ficar online, sem duplicar.
 */
function _erroTransiente(error) {
  const codigo = String(error?.code || '');
  if (!codigo) return true; // erro de rede/timeout nao tem code
  if (codigo.startsWith('22') || codigo.startsWith('23')) return false; // dados invalidos
  if (codigo === '42501' || codigo === 'PGRST301' || codigo === 'PGRST204') return false; // permissao/coluna
  return true;
}

/** Identidade dona do cache local. Visitante anonimo usa "anon". */
function _uidCache() {
  return _usuarioAtual?.id || 'anon';
}

/** Chave do snapshot local, separada por identidade. */
function _chaveCacheDb() {
  return `${DB_CONFIG.LS_KEY}:${_uidCache()}`;
}

/** Chave da fila de escritas pendentes, separada por identidade. */
function _chavePendentes() {
  return `${DB_CONFIG.PENDING_WRITES_KEY}:${_uidCache()}`;
}

/** Remove o cache (e a fila) de uma identidade, inclusive chaves antigas. */
function _limparCacheIdentidade(uid) {
  try {
    const identidade = uid || 'anon';
    [
      `${DB_CONFIG.LS_KEY}:${identidade}`,
      `${DB_CONFIG.PENDING_WRITES_KEY}:${identidade}`,
      DB_CONFIG.LS_KEY,
      DB_CONFIG.PENDING_WRITES_KEY,
      DB_CONFIG.LEGACY_LS_KEY,
    ].forEach((chave) => localStorage.removeItem(chave));
  } catch (e) {
    console.warn('[DB] Falha ao limpar o cache local:', e);
  }
}

function _lerPendentes() {
  try {
    const lista = JSON.parse(localStorage.getItem(_chavePendentes()) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function _gravarPendentes(lista) {
  try {
    localStorage.setItem(_chavePendentes(), JSON.stringify(lista));
  } catch (e) {
    console.warn('[DB] Nao foi possivel gravar a fila de escritas pendentes:', e);
  }
  _emitStatusChanged();
}

function _enfileirarPendente(item) {
  if (!item || !_isSupabaseCollection(item.colecao)) return;
  const lista = _lerPendentes();
  const chave = `${item.op}:${item.colecao}:${item.id ?? ''}`;
  const existente = lista.findIndex(x => `${x.op}:${x.colecao}:${x.id ?? ''}` === chave);
  if (existente >= 0) lista[existente] = item;
  else lista.push(item);
  _gravarPendentes(lista);
}

async function _executarPendente(item) {
  if (!_sb || !_isSupabaseCollection(item.colecao)) return { ok: false, transiente: true };
  const tabela = SUPABASE_TABLES[item.colecao];
  let requisicao;
  if (item.op === 'delete') {
    requisicao = _sb.from(tabela).delete().eq('id', item.id);
  } else if (item.op === 'update') {
    requisicao = _sb.from(tabela).update(item.payload).eq('id', item.id);
  } else if (item.payload && item.payload.id != null) {
    requisicao = _sb.from(tabela).upsert(item.payload, { onConflict: 'id' });
  } else {
    requisicao = _sb.from(tabela).insert(item.payload);
  }
  try {
    const { error } = await Promise.resolve(requisicao);
    if (error) return { ok: false, transiente: _erroTransiente(error), error };
    return { ok: true };
  } catch (error) {
    return { ok: false, transiente: true, error };
  }
}

async function _reprocessarPendentes() {
  if (!_sb) return;
  const pendentes = _lerPendentes();
  if (!pendentes.length) return;
  const restantes = [];
  const colecoes = new Set();
  for (const item of pendentes) {
    const resultado = await _executarPendente(item);
    if (resultado.ok) {
      colecoes.add(item.colecao);
    } else if (resultado.transiente) {
      restantes.push(item);
    } else {
      console.warn('[DB] Escrita pendente descartada (erro permanente):', item, resultado.error);
    }
  }
  _gravarPendentes(restantes);
  for (const colecao of colecoes) {
    await _refreshSupabaseCollection(colecao).catch((e) => {
      console.warn(`[DB] Falha ao recarregar ${colecao} apos replay da fila:`, e);
    });
  }
  if (colecoes.size) _persistLocal();
}

/**
 * Envia uma operacao ao Supabase e devolve `{ ok, error }` (nunca rejeita).
 * O status do banco e a recarga da colecao continuam centralizados aqui.
 */
function _enviarParaSupabase(colecao, tipo, id, registro, opcoes = {}) {
  if (!_sb || !_isSupabaseCollection(colecao)) return Promise.resolve({ ok: true, skipped: true });
  const tabela = SUPABASE_TABLES[colecao];
  const payload = tipo === 'delete' ? null : _toSupabasePayload(colecao, registro);
  // Na fila offline o insert carrega o id temporario para o replay ser
  // idempotente (upsert); no envio online o id e gerado pelo banco.
  const payloadFila = (tipo === 'insert' && opcoes.idTemporario != null && payload)
    ? { ...payload, id: opcoes.idTemporario }
    : payload;
  let requisicao;

  if (tipo === 'insert') {
    const { id: _idIgnorado, ...semId } = payload;
    requisicao = _sb.from(tabela).insert(semId).select('id').single();
  } else if (tipo === 'update') {
    requisicao = _sb.from(tabela).update(payload).eq('id', id);
    if (opcoes.updatedAtAnterior) {
      requisicao = requisicao.eq('updated_at', opcoes.updatedAtAnterior);
    }
    requisicao = requisicao.select('id');
  } else {
    requisicao = _sb.from(tabela).delete().eq('id', id);
  }

  return Promise.resolve(requisicao)
    .then(({ data, error }) => {
      if (error) {
        _setDbStatus({
          provider: 'local',
          supabaseConnected: false,
          writesReachSupabase: false,
          lastError: error.message || `Falha ao gravar em ${tabela}.`,
        });
        console.error(`[DB] Falha ao gravar em ${tabela} (${tipo} ${id}):`, error);
        if (_erroTransiente(error)) {
          _enfileirarPendente({ op: tipo, colecao, id, payload: payloadFila, ts: Date.now() });
          return { ok: false, error, enfileirado: true };
        }
        return { ok: false, error };
      }

      // T8.5: update filtrado pelo updated_at esperado nao achou a linha =
      // outro editor salvou antes. Nao enfileira (nao adianta repetir).
      if (tipo === 'update' && opcoes.updatedAtAnterior && Array.isArray(data) && data.length === 0) {
        const conflito = {
          code: 'CONFLITO',
          message: 'O registro foi alterado por outro usuario. Recarregue e edite novamente.',
        };
        _setDbStatus({ provider: 'local', lastError: conflito.message });
        console.warn(`[DB] Conflito de edicao em ${tabela}:${id}`);
        _refreshSupabaseCollection(colecao).catch((refreshError) => {
          console.warn(`[DB] Falha ao recarregar ${tabela} apos conflito:`, refreshError);
        });
        return { ok: false, error: conflito, conflito: true };
      }

      _setDbStatus({
        provider: 'supabase',
        supabaseConnected: true,
        writesReachSupabase: true,
        lastError: '',
      });
      _refreshSupabaseCollection(colecao).catch((refreshError) => {
        console.warn(`[DB] Falha ao recarregar ${tabela} apos ${tipo}:`, refreshError);
      });
      return { ok: true, id: tipo === 'insert' ? data?.id : null };
    })
    .catch((error) => {
      _setDbStatus({
        provider: 'local',
        supabaseConnected: false,
        writesReachSupabase: false,
        lastError: error?.message || `Falha ao gravar em ${tabela}.`,
      });
      console.error(`[DB] Erro inesperado ao gravar em ${tabela} (${tipo} ${id}):`, error);
      _enfileirarPendente({ op: tipo, colecao, id, payload: payloadFila, ts: Date.now() });
      return { ok: false, error, enfileirado: true };
    });
}

/**
 * Inicializa o banco.
 * Retorna uma Promise que resolve quando os dados estão prontos.
 * O script.js chama DB.init().then(() => renderApp()).
 */
async function dbInit(opcoes = {}) {
  const escopo = opcoes.escopo === 'publico' ? 'publico' : 'admin';
  _modoPublico = escopo === 'publico';
  const pronto = DB_CONFIG.USE_SUPABASE
    ? await _initSupabase(escopo)
    : await _initLocal();

  // No fallback local o _initSupabase nao chega a assinar as URLs do Storage.
  // Sem isso, manual/arquivo carregam do localStorage com path, mas sem
  // imagem_url_assinada/url_assinada (bucket privado) e o publico nao ve
  // imagem nem preview. Assinar aqui cobre os dois caminhos; no caminho
  // Supabase as URLs ja estao no cache e a chamada e praticamente gratuita.
  if (_sb) {
    try {
      await DB.resolveStorageUrls();
    } catch (erro) {
      console.warn('[DB] Falha ao assinar URLs do Storage no boot:', erro);
    }
  }

  return pronto;
}

function _initLocal() {
  _acessoInterno = false;
  _podeVerRascunhos = false;
  _usuarioAtual = null;

  // Index publico nunca le a chave global antiga: ela pode conter dados de uma
  // sessao admin. O cache publico fica em smader_db_v1:anon.
  if (_modoPublico) {
    localStorage.removeItem(DB_CONFIG.LS_KEY);
    localStorage.removeItem(DB_CONFIG.LEGACY_LS_KEY);
  }

  // 1. Tenta a chave atual, escopada por identidade
  const saved = localStorage.getItem(_chaveCacheDb());
  if (saved) {
    try {
      _db = JSON.parse(saved);
      _migrarPublishStatusLegado(_db);
      _ensureAppConfig();
      _normalizeDbCollections();
      _applyLocalAppConfig();
      // Apos a primeira leitura escopada, a chave global antiga nao e mais
      // necessaria (e pode conter PII).
      localStorage.removeItem(DB_CONFIG.LS_KEY);
      localStorage.removeItem(DB_CONFIG.LEGACY_LS_KEY);
      console.info('[DB] Dados carregados do localStorage (identidade).');
      return Promise.resolve();
    } catch (e) {
      console.warn('[DB] localStorage atual corrompido. Tentando migração/backup.');
    }
  }

  // 2. Compatibilidade: migra a chave global/antiga para a chave por identidade
  const legacySaved = localStorage.getItem(DB_CONFIG.LS_KEY)
    || localStorage.getItem(DB_CONFIG.LEGACY_LS_KEY);
  if (legacySaved) {
    try {
      _db = JSON.parse(legacySaved);
      _migrarPublishStatusLegado(_db);
      _ensureAppConfig();
      _normalizeDbCollections();
      _applyLocalAppConfig();
      _persistLocal();
      localStorage.removeItem(DB_CONFIG.LEGACY_LS_KEY);
      localStorage.removeItem(DB_CONFIG.LS_KEY);
      console.info('[DB] Dados migrados para a chave por identidade.');
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
  _migrarPublishStatusLegado(_db);
  _ensureAppConfig();
  _normalizeDbCollections();
  _applyLocalAppConfig();
  console.info('[DB] Dados carregados de dados.js (padrão).');
  return Promise.resolve();
}

async function _initSupabase(escopo = 'admin') {
  _sb = _createSupabaseClient();
  // Reinit (ex.: apos login) nao pode anunciar fallback antes de tentar
  // carregar: mantem o status atual se a conexao ja estava provada.
  if (_dbStatus.provider !== 'supabase') {
    _setDbStatus({
      provider: 'local',
      supabaseConfigured: !!(DB_CONFIG.SUPABASE_URL && DB_CONFIG.SUPABASE_KEY),
      supabaseConnected: false,
      writesReachSupabase: false,
      lastError: '',
    });
  }
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
  _ensureAppConfig();
  _normalizeDbCollections();
  _applyLocalAppConfig();

  _acessoInterno = await _resolverAcessoInterno();
  // Rascunho so no painel. No index publico, mesmo logado, o filtro de
  // `published` continua valendo.
  _podeVerRascunhos = escopo === 'admin' ? _acessoInterno : false;

  try {
    const colecoes = Object.keys(SUPABASE_TABLES).filter(
      (colecao) => _acessoInterno || !COLECOES_INTERNAS.has(colecao)
    );
    await _carregarColecoesSupabase(colecoes.filter((colecao) => colecao !== 'arquivos'));
    await _carregarColecoesSupabase(['arquivos']);
    const remoteLayoutConfig = await _loadSupabaseLayoutConfig();
    if (Object.keys(remoteLayoutConfig).length) {
      _db.layoutConfig = { ..._db.layoutConfig, ...remoteLayoutConfig };
      _ensureAppConfig();
      _persistLocalAppConfig();
    }
    // Buckets privados: assina em memoria o que a sessao pode ler. Se falhar,
    // o app cai no fallback legado (foto/url) ou no placeholder; nunca quebra o boot.
    try {
      await DB.resolveStorageUrls();
    } catch (e) {
      console.warn('[DB] Falha ao assinar URLs do Storage:', e);
    }
    // Apos o Supabase carregar, a chave global antiga nao e mais necessaria e
    // pode conter PII de sessoes anteriores.
    try {
      localStorage.removeItem(DB_CONFIG.LS_KEY);
      localStorage.removeItem(DB_CONFIG.LEGACY_LS_KEY);
    } catch (e) {
      console.warn('[DB] Falha ao remover chaves antigas do cache:', e);
    }
    _persistLocal();
    _setDbStatus({
      provider: 'supabase',
      supabaseConnected: true,
      writesReachSupabase: true,
      lastError: '',
    });
    console.info('[DB] Dados carregados do Supabase.');

    // T8.2: tenta enviar o que ficou pendente de sessoes offline.
    _reprocessarPendentes().catch((e) => {
      console.warn('[DB] Falha ao reprocessar escritas pendentes:', e);
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

  /** True quando ha sessao com `pode_editar()` (admin ou servidor). */
  temAcessoInterno() {
    return _acessoInterno === true;
  },

  /** Dados basicos do usuario logado: { id, email } ou null. */
  usuarioAtual() {
    return _usuarioAtual ? { ..._usuarioAtual } : null;
  },

  /** Retorna uma cópia de uma coleção */
  get(colecao) {
    // Defesa em profundidade: no index publico, colecao interna nao existe.
    if (COLECOES_INTERNAS.has(colecao) && _modoPublico && !_acessoInterno) return [];
    if (!_db || !_db[colecao]) return [];
    const lista = JSON.parse(JSON.stringify(_normalizeCollectionData(colecao, _db[colecao])));
    return lista.map(item => _decorateRuntimeUrls(colecao, item));
  },

  /** Retorna um registro pelo id */
  getById(colecao, id) {
    const lista = DB.get(colecao);
    return lista.find(r => r.id === id) || null;
  },

  /** Cria (ou reutiliza do cache) uma URL assinada de um objeto do Storage. */
  async createSignedUrl(bucket, path, expiresIn = SIGNED_URL_TTL) {
    if (!_sb || !bucket || !path) return '';
    const cached = _getCachedSignedUrl(bucket, path);
    if (cached) return cached;
    try {
      const { data, error } = await _sb.storage.from(bucket).createSignedUrl(path, expiresIn);
      if (error || !data?.signedUrl) return '';
      const url = _absoluteSignedUrl(data.signedUrl);
      _storeSignedUrl(bucket, path, url, expiresIn);
      return url;
    } catch (erro) {
      console.warn('[DB] Falha ao assinar URL do Storage:', erro);
      return '';
    }
  },

  /** Cria URLs assinadas em lote (ate 100 por chamada). */
  async createSignedUrls(bucket, paths, expiresIn = SIGNED_URL_TTL) {
    const resultado = {};
    if (!_sb || !bucket || !Array.isArray(paths)) return resultado;

    const unicos = [...new Set(paths.filter(Boolean))];
    const faltando = [];
    unicos.forEach((path) => {
      const cached = _getCachedSignedUrl(bucket, path);
      if (cached) resultado[path] = cached;
      else faltando.push(path);
    });

    try {
      for (let i = 0; i < faltando.length; i += 100) {
        const lote = faltando.slice(i, i + 100);
        const { data, error } = await _sb.storage.from(bucket).createSignedUrls(lote, expiresIn);
        if (error || !Array.isArray(data)) continue;
        data.forEach((item) => {
          if (!item?.path || !item?.signedUrl) return;
          const url = _absoluteSignedUrl(item.signedUrl);
          _storeSignedUrl(bucket, item.path, url, expiresIn);
          resultado[item.path] = url;
        });
      }
    } catch (erro) {
      console.warn('[DB] Falha ao assinar URLs do Storage em lote:', erro);
    }

    return resultado;
  },

  /**
   * Preenche o cache de URLs assinadas para as colecoes com Storage.
   * Sem `colecao`, resolve funcionarios, arquivos e manuais.
   */
  async resolveStorageUrls(colecao) {
    if (!_sb || !_db) return;
    const colecoes = colecao ? [colecao] : ['funcionarios', 'arquivos', 'manuais'];

    await Promise.all(colecoes.map(async (nome) => {
      const lista = Array.isArray(_db[nome]) ? _db[nome] : [];
      const porBucket = new Map();
      const adicionarPath = (bucket, path) => {
        if (!bucket || !path) return;
        if (!porBucket.has(bucket)) porBucket.set(bucket, []);
        porBucket.get(bucket).push(path);
      };

      lista.forEach((registro) => {
        if (!registro) return;
        if (nome === 'manuais') {
          const passos = Array.isArray(registro.passos) ? registro.passos : [];
          passos.forEach((passo) => {
            if (!passo || typeof passo !== 'object' || !passo.imagem_storage_path) return;
            adicionarPath(
              passo.imagem_storage_bucket || STORAGE_CONFIG.MANUAIS_IMAGENS_BUCKET,
              passo.imagem_storage_path
            );
          });
          return;
        }
        const path = nome === 'funcionarios'
          ? registro.foto_storage_path
          : registro.storage_path;
        if (!path) return;
        const bucket = nome === 'funcionarios'
          ? (registro.foto_storage_bucket || STORAGE_CONFIG.FUNCIONARIOS_FOTOS_BUCKET)
          : (registro.storage_bucket || STORAGE_CONFIG.ARQUIVOS_BUCKET);
        adicionarPath(bucket, path);
      });

      await Promise.all(
        [...porBucket.entries()].map(([bucket, paths]) => DB.createSignedUrls(bucket, paths))
      );
    }));
  },

  /** Insere um novo registro (gera id automático) */
  insert(colecao, registro) {
    if (!_db[colecao]) _db[colecao] = [];
    const ids = _db[colecao].map(r => r.id || 0);
    const novoId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
    const novoRegistro = _normalizeCollectionRecord(colecao, { ...registro, id: novoId });
    _db[colecao].push(novoRegistro);
    _persistLocal();
    _notifyCollectionUpdated(colecao);
    if (_sb && _isSupabaseCollection(colecao)) {
      const idTemporario = novoRegistro.id;
      const promessa = _enviarParaSupabase(
        colecao,
        'insert',
        idTemporario,
        novoRegistro,
        { idTemporario }
      ).then((resultado) => {
        // T8.3: o id definitivo vem do banco. O temporario so existiu para a
        // UI responder na hora.
        if (resultado?.ok && resultado.id != null) {
          novoRegistro.id = resultado.id;
          _persistLocal();
        }
        return resultado;
      });
      _registrarEscrita(colecao, idTemporario, promessa);
    }
    return novoRegistro;
  },

  /** Atualiza um registro existente pelo id */
  update(colecao, id, dados) {
    if (!_db[colecao]) return null;
    const idx = _db[colecao].findIndex(r => r.id === id);
    if (idx === -1) return null;
    // T8.5: guarda o updated_at ANTERIOR antes de sobrescrever o registro.
    const updatedAtAnterior = _db[colecao][idx]?.updated_at || null;
    _db[colecao][idx] = _normalizeCollectionRecord(colecao, { ..._db[colecao][idx], ...dados, id });
    _persistLocal();
    _notifyCollectionUpdated(colecao);
    if (_sb && _isSupabaseCollection(colecao)) {
      _registrarEscrita(
        colecao,
        id,
        _enviarParaSupabase(colecao, 'update', id, _db[colecao][idx], { updatedAtAnterior })
      );
    }
    return _db[colecao][idx];
  },

  /** Remove um registro pelo id */
  delete(colecao, id) {
    if (!_db[colecao]) return false;
    const antes = _db[colecao].length;
    _db[colecao] = _db[colecao].filter(r => r.id !== id);
    _persistLocal();
    _notifyCollectionUpdated(colecao);
    if (_sb && _isSupabaseCollection(colecao)) {
      _registrarEscrita(colecao, id, _enviarParaSupabase(colecao, 'delete', id, null));
    }
    return _db[colecao].length < antes;
  },

  /**
   * Bloco 8 (T8.1): salva e espera a resposta real do banco.
   * `insert`/`update` continuam sincronos (compatibilidade); a UI do painel
   * usa `save` para so confirmar depois do Supabase responder.
   */
  async save(colecao, id, dados) {
    if (!_db[colecao]) _db[colecao] = [];
    const registro = id ? DB.update(colecao, id, dados) : DB.insert(colecao, dados);
    if (!registro) throw new Error('Registro nao encontrado.');
    const resultado = await _confirmacaoDaEscrita(colecao, registro.id);
    if (!resultado.ok) {
      const erro = new Error(resultado.error?.message || `Falha ao salvar em ${colecao}.`);
      erro.cause = resultado.error;
      throw erro;
    }
    return registro;
  },

  /** Bloco 8 (T8.1): exclui aguardando o banco e devolve o registro ao cache se falhar. */
  async remove(colecao, id) {
    const antes = _db[colecao] ? _db[colecao].find(r => r.id === id) : null;
    const removido = DB.delete(colecao, id);
    if (!removido) return false;
    const resultado = await _confirmacaoDaEscrita(colecao, id);
    if (!resultado.ok) {
      if (antes) {
        _db[colecao].push(antes);
        _persistLocal();
        _notifyCollectionUpdated(colecao);
      }
      const erro = new Error(resultado.error?.message || `Falha ao excluir de ${colecao}.`);
      erro.cause = resultado.error;
      throw erro;
    }
    return true;
  },

  /**
   * Substitui uma coleção inteira (usado pelo admin ao importar).
   * Bloco 8 (T8.4): usa a RPC `replace_collection`, que faz delete + insert
   * numa transação. Nunca apaga antes pelo cliente.
   */
  async replaceCollection(colecao, lista) {
    _db[colecao] = _normalizeCollectionData(colecao, JSON.parse(JSON.stringify(lista || [])));
    _persistLocal();
    _notifyCollectionUpdated(colecao);
    if (!_sb || !_isSupabaseCollection(colecao)) return DB.get(colecao);

    const tabela = SUPABASE_TABLES[colecao];
    const payload = _db[colecao].map(item => _toSupabasePayload(colecao, item));
    const { data, error } = await _sb.rpc('replace_collection', {
      p_tabela: tabela,
      p_payload: payload,
    });
    if (error) {
      _setDbStatus({
        provider: 'local',
        supabaseConnected: false,
        writesReachSupabase: false,
        lastError: error.message || `Falha ao substituir ${tabela}.`,
      });
      console.error(`[DB] Falha ao substituir ${tabela}:`, error);
      throw error;
    }
    _setDbStatus({
      provider: 'supabase',
      supabaseConnected: true,
      writesReachSupabase: true,
      lastError: '',
    });
    await _refreshSupabaseCollection(colecao);
    return DB.get(colecao);
  },

  /** Retorna o banco completo (para exportação) */
  exportAll() {
    return JSON.parse(JSON.stringify(_db));
  },

  getLayoutConfig() {
    _ensureAppConfig();
    return JSON.parse(JSON.stringify(_db.layoutConfig));
  },

  updateLayoutConfig(patch = {}) {
    _ensureAppConfig();
    _db.layoutConfig = { ..._db.layoutConfig, ...patch };
    _ensureAppConfig();
    _persistLocalAppConfig();
    _persistLocal();
    _persistSupabaseLayoutConfig();
    _notifyCollectionUpdated('layoutConfig');
    return DB.getLayoutConfig();
  },

  /** Retorna o status atual da conexão/persistência */
  getStatus() {
    return JSON.parse(JSON.stringify(_dbStatus));
  },

  /** Bloco 8 (T8.2): operacoes aguardando reconexao. */
  getPendingWrites() {
    return _lerPendentes();
  },

  /** Bloco 8 (T8.2): tenta enviar a fila agora e devolve o que restou. */
  async flushPendingWrites() {
    await _reprocessarPendentes();
    return _lerPendentes();
  },

  async refreshCollection(colecao) {
    if (!_isSupabaseCollection(colecao) || !_sb) return DB.get(colecao);
    await _refreshSupabaseCollection(colecao);
    return DB.get(colecao);
  },

  async uploadArquivoStorage(file) {
    if (!_sb) throw new Error('Supabase indisponivel.');
    if (!file) throw new Error('Arquivo invalido.');
    const bucket = STORAGE_CONFIG.ARQUIVOS_BUCKET;
    const path = `arquivos/${Date.now()}-${_sanitizeStorageFileName(file.name)}`;
    const { error } = await _sb.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    return {
      url: '',
      storage_path: path,
      storage_bucket: bucket,
      arquivo_nome: file.name || 'arquivo',
    };
  },

  async uploadManualImageStorage(file) {
    if (!_sb) throw new Error('Supabase indisponivel.');
    if (!file) throw new Error('Imagem invalida.');
    const bucket = STORAGE_CONFIG.MANUAIS_IMAGENS_BUCKET;
    const path = `manuais/${Date.now()}-${_sanitizeStorageFileName(file.name || 'imagem')}`;
    const { error } = await _sb.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    return {
      url: '',
      storage_path: path,
      storage_bucket: bucket,
    };
  },

  async uploadFuncionarioFotoStorage(file) {
    if (!_sb) throw new Error('Supabase indisponivel.');
    if (!file) throw new Error('Imagem invalida.');
    const bucket = STORAGE_CONFIG.FUNCIONARIOS_FOTOS_BUCKET;
    const path = `funcionarios/${Date.now()}-${_sanitizeStorageFileName(file.name || 'foto')}`;
    const { error } = await _sb.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    return {
      url: '',
      storage_path: path,
      storage_bucket: bucket,
    };
  },

  async deleteArquivoStorage(path, bucket = STORAGE_CONFIG.ARQUIVOS_BUCKET) {
    if (!_sb || !path) return;
    const { error } = await _sb.storage.from(bucket || STORAGE_CONFIG.ARQUIVOS_BUCKET).remove([path]);
    if (error) throw error;
  },

  async deleteManualImageStorage(path, bucket = STORAGE_CONFIG.MANUAIS_IMAGENS_BUCKET) {
    if (!_sb || !path) return;
    const { error } = await _sb.storage.from(bucket || STORAGE_CONFIG.MANUAIS_IMAGENS_BUCKET).remove([path]);
    if (error) throw error;
  },

  async deleteFuncionarioFotoStorage(path, bucket = STORAGE_CONFIG.FUNCIONARIOS_FOTOS_BUCKET) {
    if (!_sb || !path) return;
    const { error } = await _sb.storage.from(bucket || STORAGE_CONFIG.FUNCIONARIOS_FOTOS_BUCKET).remove([path]);
    if (error) throw error;
  },

  /** Importa um banco completo (substitui tudo, usado no admin) */
  async importAll(dados) {
    _db = JSON.parse(JSON.stringify(dados));
    _ensureAppConfig();
    _normalizeDbCollections();
    _persistLocal();
    if (!_sb) return DB.exportAll();

    // T8.4: cada colecao e trocada numa transacao (RPC), em paralelo.
    await Promise.all(
      Object.keys(SUPABASE_TABLES).map(colecao => DB.replaceCollection(colecao, _db[colecao] || []))
    );
    return DB.exportAll();
  },

  /* ---- Autenticação admin (Supabase Auth) ---- */

  /** Verifica se a sessão admin está ativa */
  /**
   * Só é admin quem o BANCO disser que é.
   *
   * Estar autenticado NÃO basta: a resposta vem de `public.is_admin()`, que
   * consulta `public.app_admins` com security definer. É a mesma função que as
   * policies de RLS usam, então front e banco concordam.
   *
   * `motivoUltimoAcesso` fica disponível para o painel explicar a recusa.
   */
  motivoUltimoAcesso: 'sem_sessao',

  /** Papel do usuário logado: 'admin', 'servidor' ou null (Bloco 6). */
  papel: null,

  async isAdminLoggedIn() {
    if (!_sb) {
      DB.motivoUltimoAcesso = 'sem_sessao';
      return false;
    }

    const { data, error } = await _sb.auth.getSession();
    if (error) {
      console.error('[DB] Falha ao verificar sessão admin:', error);
      DB.motivoUltimoAcesso = 'erro';
      return false;
    }
    if (!data.session) {
      DB.motivoUltimoAcesso = 'sem_sessao';
      return false;
    }

    let resposta;
    try {
      resposta = await _sb.rpc('is_admin');
    } catch (e) {
      console.error('[DB] Falha ao consultar permissão de admin:', e);
      DB.motivoUltimoAcesso = 'erro';
      return false;
    }

    const { data: ehAdmin, error: erroPermissao } = resposta || {};
    if (erroPermissao) {
      console.error('[DB] Falha ao consultar permissão de admin:', erroPermissao);
      DB.motivoUltimoAcesso = 'erro';
      return false;
    }

    if (ehAdmin !== true) {
      // Sessão válida, mas sem permissão: não deixa sessão órfã no navegador.
      DB.motivoUltimoAcesso = 'sem_permissao';
      await DB.adminLogout();
      return false;
    }

    DB.motivoUltimoAcesso = 'ok';
    return true;
  },

  /**
   * Lê o papel do usuário logado direto do banco (`rpc('meu_papel')`).
   * Fonte de verdade é `public.app_admins`, a mesma das policies.
   * Erro de rede NÃO derruba a sessão; sessão sem papel é 'sem_permissao'.
   */
  async carregarPapel() {
    DB.papel = null;
    if (!_sb) {
      DB.motivoUltimoAcesso = 'sem_sessao';
      return null;
    }

    const { data: sessao, error } = await _sb.auth.getSession();
    if (error) {
      console.error('[DB] Falha ao verificar sessão:', error);
      DB.motivoUltimoAcesso = 'erro';
      return null;
    }
    if (!sessao?.session) {
      DB.motivoUltimoAcesso = 'sem_sessao';
      return null;
    }

    let resposta;
    try {
      resposta = await _sb.rpc('meu_papel');
    } catch (e) {
      console.error('[DB] Falha ao consultar o papel:', e);
      DB.motivoUltimoAcesso = 'erro';
      return null;
    }

    const { data, error: erroPapel } = resposta || {};
    if (erroPapel) {
      console.error('[DB] Falha ao consultar o papel:', erroPapel);
      DB.motivoUltimoAcesso = 'erro';
      return null;
    }

    DB.papel = (data === 'admin' || data === 'servidor') ? data : null;
    DB.motivoUltimoAcesso = DB.papel ? 'ok' : 'sem_permissao';
    return DB.papel;
  },

  /** true para admin e servidor. Sessão válida sem papel é encerrada. */
  async isStaff() {
    const papel = await DB.carregarPapel();
    if (papel) return true;
    if (DB.motivoUltimoAcesso === 'sem_permissao') await DB.adminLogout();
    return false;
  },

  /** Só admin exclui; o banco garante o mesmo (DELETE usa is_admin()). */
  podeExcluir() {
    return DB.papel === 'admin';
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

  /**
   * Login do index publico (mesma sessao do admin).
   * Devolve { ok, erro } para a UI mostrar a mensagem sem logar PII.
   */
  async entrar(email, senha) {
    if (!_sb) return { ok: false, erro: 'Banco de dados indisponível.' };
    try {
      const { data, error } = await _sb.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        return { ok: false, erro: error.message || 'Não foi possível entrar.' };
      }
      if (data?.user) {
        _usuarioAtual = {
          id: data.user.id || null,
          email: data.user.email || email,
        };
      }
      return { ok: true };
    } catch (e) {
      console.error('[DB] Falha no login:', e);
      return { ok: false, erro: 'Falha de conexão. Tente novamente.' };
    }
  },

  /** Assina mudancas de sessao. Devolve a funcao de cancelamento. */
  aoMudarSessao(cb) {
    if (!_sb?.auth?.onAuthStateChange) return () => {};
    const { data } = _sb.auth.onAuthStateChange((evento, sessao) => cb(evento, sessao));
    return () => data?.subscription?.unsubscribe?.();
  },

  async adminLogout() {
    const uid = _usuarioAtual?.id || null;
    DB.papel = null;
    _acessoInterno = false;
    _limparCacheIdentidade(uid);
    _usuarioAtual = null;
    if (!_sb) return;
    const { error } = await _sb.auth.signOut();
    if (error) {
      console.error('[DB] Falha no logout admin:', error);
    }
  },

  /** Logout do index publico (alias do logout da sessao compartilhada). */
  async sair() {
    return DB.adminLogout();
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
    _persistLocalAppConfig();
    localStorage.setItem(_chaveCacheDb(), JSON.stringify(_db));
  } catch (e) {
    console.error('[DB] Falha ao salvar no localStorage:', e);
  }
}

/* Bloco 8 (T8.2): ao voltar a conexao, tenta a fila de novo. */
window.addEventListener('online', () => {
  _reprocessarPendentes().catch((e) => {
    console.warn('[DB] Falha ao reprocessar escritas pendentes ao reconectar:', e);
  });
});

window.addEventListener('storage', (event) => {
  if (event.key === _chaveCacheDb() && event.newValue) {
    try {
      _db = JSON.parse(event.newValue);
      _ensureAppConfig();
      _normalizeDbCollections();
      _applyLocalAppConfig();
      _notifyCollectionUpdated('sync');
    } catch (e) {
      console.warn('[DB] Falha ao sincronizar dados via storage event:', e);
    }
    return;
  }

  if (event.key === DB_CONFIG.CONFIG_LS_KEY) {
    try {
      _applyLocalAppConfig();
      _notifyCollectionUpdated('layoutConfig');
    } catch (e) {
      console.warn('[DB] Falha ao sincronizar layoutConfig via storage event:', e);
    }
  }
});

/* Expõe globalmente */
window.DB     = DB;
window.dbInit = dbInit;
