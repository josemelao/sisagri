/**
 * ============================================================
 * SMADER — admin.js
 * Lógica do painel de administração (CRUD completo).
 * ============================================================
 */

/* ============================================================
   AUTENTICAÇÃO
   ============================================================ */
function mostrarLogin() {
  document.getElementById('boot-screen').style.display = 'none';
  document.getElementById('admin-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

function mostrarAdmin() {
  document.getElementById('boot-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-app').style.display = 'block';
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  if (await DB.adminLogin(email, senha)) {
    // Autenticou, mas autenticação não é permissão: só entra quem o banco
    // confirma como admin ou servidor em app_admins.
    if (!(await DB.isStaff())) {
      document.getElementById('login-error').textContent =
        'Sua conta não tem permissão de acesso ao painel. Fale com o administrador.';
      return;
    }
    // Recarrega com a sessão ativa para o servidor enxergar rascunhos.
    await dbInit();
    mostrarAdmin();
    initAdmin();
  } else {
    document.getElementById('login-error').textContent = 'E-mail ou senha incorretos. Tente novamente.';
    document.getElementById('login-email').value = email;
    document.getElementById('login-senha').value = '';
  }
}

document.getElementById('login-email').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') fazerLogin();
});

document.getElementById('login-senha').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') fazerLogin();
});

async function fazerLogout() {
  await DB.adminLogout();
  location.reload();
}

// Verifica se já estava logado (sessão ativa)
document.addEventListener('DOMContentLoaded', () => {
  dbInit().then(async () => {
    instalarFeedbackAcoesAdmin();
    atualizarStatusBanco();
    window.addEventListener('db:status-changed', handleDbStatusChanged);
    if (await DB.isStaff()) {
      mostrarAdmin();
      initAdmin();
      return;
    }
    mostrarLogin();
    // Havia sessão válida, mas a conta não está em app_admins.
    if (DB.motivoUltimoAcesso === 'sem_permissao') {
      const erro = document.getElementById('login-error');
      if (erro) {
        erro.textContent = 'Sua conta não tem permissão de acesso ao painel. Fale com o administrador.';
      }
    }
  });
});

/* ============================================================
   INICIALIZAÇÃO DO ADMIN
   ============================================================ */
function initAdmin() {
  atualizarStatusBanco();
  initNav();
  renderOverview();
  aplicarPermissoesUI();
}

let ultimoStatusBanco = null;
let adminActionTimer = null;

function atualizarIndicadorAcaoAdmin(detail = {}) {
  const indicator = document.getElementById('admin-action-indicator');
  const text = document.getElementById('admin-action-text');
  if (!indicator || !text) return;

  const phase = detail.phase || 'idle';
  clearTimeout(adminActionTimer);

  if (phase !== 'pending') {
    indicator.classList.remove('show');
    return;
  }

  text.textContent = detail.message || 'Processando...';
  indicator.classList.add('show');
}


function iniciarAcaoAdmin(mensagem = 'Salvando alteracoes...') {
  atualizarIndicadorAcaoAdmin({ phase: 'pending', message: mensagem });
}

function concluirAcaoAdmin() {
  atualizarIndicadorAcaoAdmin({ phase: 'idle' });
}

function instalarFeedbackAcoesAdmin() {
  if (!window.DB || DB.__adminFeedbackWrapped) return;
  DB.__adminFeedbackWrapped = true;

  const wrapMap = {
    save: { pending: 'Salvando alteracao...' },
    remove: { pending: 'Excluindo registro...' },
  };

  Object.entries(wrapMap).forEach(([methodName, messages]) => {
    if (typeof DB[methodName] !== 'function') return;
    const original = DB[methodName].bind(DB);
    DB[methodName] = async (...args) => {
      iniciarAcaoAdmin(messages.pending);
      try {
        return await original(...args);
      } finally {
        concluirAcaoAdmin();
      }
    };
  });
}
function animateAdminTableReflow(section, renderFn) {
  if (!section) {
    renderFn();
    return;
  }

  const previousRows = Array.from(section.querySelectorAll('.admin-table-wrap tbody tr'));
  const previousCounts = new Map();
  const previousMap = new Map();

  previousRows.forEach((row) => {
    const baseKey = normalizeSearchText(Array.from(row.children || []).slice(0, 4).map(cell => (cell.textContent || '').trim()).join('|'));
    const occurrence = previousCounts.get(baseKey) || 0;
    previousCounts.set(baseKey, occurrence + 1);
    previousMap.set(baseKey + '::' + occurrence, row.getBoundingClientRect());
  });

  renderFn();

  const nextRows = Array.from(section.querySelectorAll('.admin-table-wrap tbody tr'));
  const nextCounts = new Map();
  nextRows.forEach((row, index) => {
    const baseKey = normalizeSearchText(Array.from(row.children || []).slice(0, 4).map(cell => (cell.textContent || '').trim()).join('|'));
    const occurrence = nextCounts.get(baseKey) || 0;
    nextCounts.set(baseKey, occurrence + 1);
    const prevRect = previousMap.get(baseKey + '::' + occurrence);

    if (prevRect) {
      const nextRect = row.getBoundingClientRect();
      const dx = prevRect.left - nextRect.left;
      const dy = prevRect.top - nextRect.top;
      if (dx || dy) {
        row.animate([
          { transform: 'translate(' + dx + 'px, ' + dy + 'px)' },
          { transform: 'translate(0, 0)' }
        ], {
          duration: 260,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
        });
      }
      return;
    }

    row.animate([
      { opacity: 0, transform: 'translateY(8px) scale(0.995)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], {
      duration: 220,
      delay: Math.min(index * 16, 80),
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both'
    });
  });
}

function renderAdminSectionWithTableAnimation(section, html) {
  animateAdminTableReflow(section, () => {
    section.innerHTML = html;
  });
}
function getDbStatusMessage(status) {
  if (status.provider === 'supabase' && status.writesReachSupabase) {
    return 'Supabase conectado. Leituras e gravações ativas.';
  }
  if (status.supabaseConfigured) {
    return `Fallback local ativo. Alterações podem não ir para o Supabase.${status.lastError ? ` Motivo: ${status.lastError}` : ''}`;
  }
  return 'Modo local ativo. Supabase não configurado.';
}

function atualizarStatusBanco() {
  const status = DB.getStatus ? DB.getStatus() : null;
  if (!status) return;

  const header = document.getElementById('admin-db-status');
  const headerText = document.getElementById('admin-db-status-text');
  const config = document.getElementById('config-db-status');
  const message = getDbStatusMessage(status);
  const pendentes = DB.getPendingWrites ? DB.getPendingWrites().length : 0;

  if (header && headerText) {
    header.classList.remove('is-ok', 'is-warn', 'is-offline');
    if (pendentes > 0) {
      header.classList.add('is-offline');
      headerText.textContent = `${pendentes} alteracao(oes) pendente(s)`;
    } else if (status.provider === 'supabase' && status.writesReachSupabase) {
      header.classList.add('is-ok');
      headerText.textContent = 'Supabase online';
    } else if (status.supabaseConfigured) {
      header.classList.add('is-offline');
      headerText.textContent = 'Fallback local';
    } else {
      header.classList.add('is-warn');
      headerText.textContent = 'Modo local';
    }
    header.title = message;
  }

  if (config) {
    config.textContent = message;
  }

  ultimoStatusBanco = status;
}

function handleDbStatusChanged() {
  const anterior = ultimoStatusBanco;
  atualizarStatusBanco();
  const atual = DB.getStatus ? DB.getStatus() : null;
  if (!atual) return;

  const caiuParaFallback =
    anterior &&
    anterior.provider === 'supabase' &&
    atual.provider !== 'supabase' &&
    atual.supabaseConfigured;

  if (caiuParaFallback) {
    toast('Supabase indisponível. O admin entrou em fallback local; novas alterações podem não persistir no banco.', 'error');
  }
}

/* ============================================================
   NAVEGAÇÃO
   ============================================================ */
function initNav() {
  document.querySelectorAll('.admin-nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      item.classList.add('active');
      const sec = document.getElementById('section-' + item.dataset.section);
      if (sec) {
        sec.classList.add('active');
        renderSection(item.dataset.section);
      }
    });
  });
}

/* ============================================================
   VISÃO GERAL
   ============================================================ */
function renderOverview() {
  const colecoes = [
    { key: 'funcionarios',  label: 'Funcionários' },
    { key: 'manuais',       label: 'Manuais' },
    { key: 'processos',     label: 'Processos' },
    { key: 'arquivos',      label: 'Arquivos' },
    { key: 'veiculos',      label: 'Veículos' },
    { key: 'sistemas',      label: 'Sistemas' },
    { key: 'servicos',      label: 'Serviços' },
    { key: 'avisos',        label: 'Avisos' },
    { key: 'agendaEventos', label: 'Eventos' },
    { key: 'escalaFerias',  label: 'Registros de Férias' },
  ];
  document.getElementById('overview-grid').innerHTML = colecoes.map(c => `
    <div class="overview-card">
      <div class="overview-num">${DB.get(c.key).length}</div>
      <div class="overview-label">${c.label}</div>
    </div>
  `).join('');
}

/* ============================================================
   ROTEADOR DE SEÇÕES
   ============================================================ */
/**
 * Registro dos modulos do painel: chave da secao -> render + id do campo
 * de busca. Substitui a cadeia de `case` do roteador; um modulo novo agora
 * e uma entrada aqui. Formulario/salvar/excluir seguem nas tabelas de acoes
 * (SALVAR_MODAL e ACOES_ADMIN_CLIQUE), que ja sao fechadas.
 */
const MODULES = {
  overview: { render: () => renderOverview() },
  funcionarios: { render: () => renderFuncionarios(), searchId: 'funcionarios-search' },
  manuais: { render: () => renderManuais(), searchId: 'manuais-search' },
  processos: { render: () => renderProcessos(), searchId: 'processos-search' },
  arquivos: { render: () => renderArquivos(), searchId: 'arquivos-search' },
  veiculos: { render: () => renderVeiculos(), searchId: 'veiculos-search' },
  sistemas: { render: () => renderSistemas(), searchId: 'sistemas-search' },
  servicos: { render: () => renderServicos(), searchId: 'servicos-search' },
  avisos: { render: () => renderAvisos(), searchId: 'avisos-search' },
  agendaEventos: { render: () => renderAgendaEventos(), searchId: 'agenda-search' },
  escalaFerias: { render: () => renderEscalaFerias(), searchId: 'escala-search' },
  acessoRapido: { render: () => renderAcessoRapido(), searchId: 'acesso-search' },
  infoJuridico: { render: () => renderInfoSimples('infoJuridico', 'Secretaria', 'Informações da Secretaria'), searchId: 'infosimples-search-infoJuridico' },
  infoMunicipio: { render: () => renderInfoSimples('infoMunicipio', 'Município e Prefeitura', 'Informações do Município'), searchId: 'infosimples-search-infoMunicipio' },
  infoOrgaos: { render: () => renderInfoOrgaos(), searchId: 'orgaos-search' },
  configuracoes: { render: () => carregarConfigDashboard() },
};

function renderSection(key) {
  const modulo = MODULES[key];
  if (modulo && typeof modulo.render === 'function') modulo.render();
  aplicarPermissoesUI();
}

/**
 * Esconde o que o papel não pode fazer. A garantia é do banco (RLS);
 * isto evita que a tela ofereça uma ação que vai falhar.
 */
function aplicarPermissoesUI() {
  const podeExcluir = DB.podeExcluir();
  // Classe no body cobre re-renders diretos (ex.: salvar no modal), que nao
  // passam por renderSection().
  document.body.classList.toggle('sem-excluir', !podeExcluir);
  if (podeExcluir) return;
  document.querySelectorAll('#admin-app [data-acao="confirmar-delecao"]')
    .forEach(btn => btn.remove());
  const navConfig = document.querySelector('.admin-nav-item[data-section="configuracoes"]');
  if (navConfig) navConfig.style.display = 'none';
}

function carregarConfigDashboard() {
  const select = document.getElementById('config-instagram-position');
  const sortSelect = document.getElementById('config-default-sort-mode');
  const config = DB.getLayoutConfig ? DB.getLayoutConfig() : {};
  if (select) {
    select.value = config.instagramPosition || 'belowQuickAccess';
  }
  if (sortSelect) {
    sortSelect.value = config.defaultSortMode === 'id' ? 'id' : 'nome';
  }
}
function salvarConfigDashboard() {
  const select = document.getElementById('config-instagram-position');
  const sortSelect = document.getElementById('config-default-sort-mode');
  if (!DB.updateLayoutConfig) return;
  DB.updateLayoutConfig({
    instagramPosition: select ? select.value : 'belowQuickAccess',
    defaultSortMode: sortSelect && sortSelect.value === 'id' ? 'id' : 'nome',
  });
  toast('Configuracoes salvas.');
}

/* ============================================================
   HELPERS
   ============================================================ */
function toast(msg, tipo = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${tipo} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

/**
 * Bloco 8 (T8.1): salva e so confirma depois da resposta do banco.
 * Em falha mostra o motivo real e mantem os dados na tela (nada de "salvo"
 * otimista).
 */
async function salvarComFeedback(colecao, id, dados, opcoes = {}) {
  try {
    await DB.save(colecao, id, dados);
    // Salvou: o formulario aberto deixa de ter pendencias. Sem isto, o
    // fecharModal() logo depois encontra _modalV2.sujo = true (marcado pelos
    // eventos de input/change) e deixa o modal aberto com a barra "Voce tem
    // alteracoes nao salvas" mesmo apos um salvamento bem-sucedido.
    if (_modalV2) _modalV2.sujo = false;
    return true;
  } catch (erro) {
    const mensagem = `Nao foi possivel salvar: ${erro?.message || 'falha desconhecida'}`;
    if (typeof opcoes.aoErro === 'function') opcoes.aoErro(mensagem);
    else toast(mensagem, 'error');
    return false;
  }
}

let _modalCloseOnBackdrop = false;
let _modalOpener = null;
let _modalV2 = null;
let _seqItemV2 = 0;

function novoIdItemV2() {
  _seqItemV2 += 1;
  return `i${_seqItemV2}`;
}

function abrirModal(html, options = {}) {
  _modalCloseOnBackdrop = !!options.closeOnBackdrop;
  _modalOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const box = document.getElementById('modal-box');
  const v2 = !!options.v2;
  box.classList.toggle('modal-box--v2', v2);
  document.getElementById('modal-content').innerHTML = html;
  const modalEl = document.getElementById('modal');
  modalEl.classList.add('open');
  if (v2) modalEl.setAttribute('aria-labelledby', 'modal-title');
  else modalEl.removeAttribute('aria-labelledby');
  _modalV2 = v2
    ? { sujo: false, itemPublicado: !!options.itemPublicado }
    : null;
  if (v2) inicializarModalV2();
}

function fecharModal(force = false) {
  if (!force && _modalV2 && _modalV2.sujo) {
    mostrarBarraAlteracoes();
    return;
  }
  const tinhaV2 = !!_modalV2;
  _modalCloseOnBackdrop = false;
  _modalV2 = null;
  document.getElementById('modal-box').classList.remove('modal-box--v2');
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modal-content').innerHTML = '';
  if (tinhaV2 && _modalOpener && document.contains(_modalOpener)) _modalOpener.focus();
  _modalOpener = null;
}

/**
 * Comportamentos exclusivos dos formularios v2 (Manuais/Processos na onda 1):
 * foco no titulo, acordeoes, estado "sujo" e barra de alteracoes.
 */
function inicializarModalV2() {
  document.querySelectorAll('#modal-content .step-list[data-acordeao]').forEach((list) => {
    iniciarAcordeaoV2(list);
  });
  setTimeout(() => {
    const titulo = document.getElementById('modal-title');
    if (titulo) titulo.focus();
  }, 0);
}

function marcarSujoV2() {
  if (!_modalV2) return;
  _modalV2.sujo = true;
}

function mostrarBarraAlteracoes() {
  const barra = document.getElementById('unsaved-bar');
  if (barra) barra.classList.add('visible');
}

function esconderBarraAlteracoes() {
  const barra = document.getElementById('unsaved-bar');
  if (barra) barra.classList.remove('visible');
}

function descartarAlteracoes() {
  fecharModal(true);
}

function salvarComoRascunho() {
  const toggle = document.getElementById('publish-status-toggle');
  if (toggle) {
    toggle.checked = false;
    handlePublishStatusToggle(toggle);
  }
  esconderBarraAlteracoes();
  const btn = document.querySelector('#modal-content [data-acao="salvar-modal"]');
  if (btn) btn.click();
}

function validarObrigatorioV2(inputId, mensagem) {
  const input = document.getElementById(inputId);
  if (!input) return true;
  const field = input.closest('.field, .form-group');
  if (!field) {
    input.focus();
    return Boolean(input.value.trim());
  }
  let msg = field.querySelector('.field-error-msg');
  if (!msg && mensagem) {
    msg = document.createElement('span');
    msg.className = 'field-error-msg';
    field.appendChild(msg);
  }
  if (msg && !msg.id) msg.id = `${inputId}-erro`;
  if (input.value.trim()) {
    field.classList.remove('field-error');
    input.removeAttribute('aria-invalid');
    if (msg) input.removeAttribute('aria-describedby');
    return true;
  }
  field.classList.add('field-error');
  if (msg) msg.textContent = mensagem;
  input.setAttribute('aria-invalid', 'true');
  if (msg) input.setAttribute('aria-describedby', msg.id);
  input.focus();
  return false;
}

function iniciarSalvamentoV2() {
  const btn = document.querySelector('#modal-content [data-acao="salvar-modal"]');
  if (!btn || btn.disabled) return null;
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('is-loading');
  btn.innerHTML = '<span class="spinner"></span> Salvando…';
  return {
    etapa(texto) {
      btn.innerHTML = `<span class="spinner"></span> ${escHtml(texto)}`;
    },
    restaurar() {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.innerHTML = original;
    },
  };
}

function mostrarErroSalvar(mensagem) {
  const box = document.getElementById('save-error');
  if (box) {
    box.textContent = mensagem;
    box.classList.add('visible');
  }
  toast(mensagem, 'error');
}

document.getElementById('modal').addEventListener('click', (e) => {
  if (_modalCloseOnBackdrop && e.target === document.getElementById('modal')) fecharModal();
});

const _modalContentEl = document.getElementById('modal-content');
if (_modalContentEl) {
  _modalContentEl.addEventListener('input', (e) => {
    if (!_modalV2) return;
    if (e.target.classList && e.target.classList.contains('doc-arquivo-busca')) {
      filtrarArquivosDoc(e.target);
      return;
    }
    if (e.target.classList && e.target.classList.contains('select-busca')) {
      filtrarOpcoesSelect(e.target);
      return;
    }
    if (e.target.classList && e.target.classList.contains('etapa-manuais-busca')) return;
    marcarSujoV2();
    const boxErro = document.getElementById('save-error');
    if (boxErro) boxErro.classList.remove('visible');
    const field = e.target.closest && e.target.closest('.field-error');
    if (field) {
      field.classList.remove('field-error');
      if (e.target.removeAttribute) {
        e.target.removeAttribute('aria-invalid');
        e.target.removeAttribute('aria-describedby');
      }
    }
  });

  _modalContentEl.addEventListener('change', (e) => {
    if (!_modalV2) return;
    if (e.target.classList && e.target.classList.contains('etapa-manuais-busca')) return;
    if (e.target.classList && e.target.classList.contains('doc-arquivo-busca')) return;
    marcarSujoV2();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (_modalV2 && _modalV2.sujo) {
      const barra = document.getElementById('unsaved-bar');
      if (barra && barra.classList.contains('visible')) esconderBarraAlteracoes();
      else mostrarBarraAlteracoes();
      return;
    }
    fecharModal();
    return;
  }

  if (e.key === 'Tab' && _modalV2) {
    const box = document.getElementById('modal-box');
    const focaveis = Array.from(box.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )).filter((el) => el.offsetParent !== null);
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  }
});

/* ---------- acordeao generico de passos/etapas ---------- */
const ACORDEAO_V2 = {
  passo: {
    rotulo: (n) => `Texto do passo ${n}`,
    resumo: '.step-texto',
    vazio: 'Passo sem texto',
    hint: 'passos-hint',
    empty: 'passos-empty',
    nome: 'passo',
  },
  etapa: {
    rotulo: (n) => `Título da etapa ${n}`,
    resumo: '.etapa-titulo',
    vazio: 'Etapa sem título',
    hint: 'etapas-hint',
    empty: 'etapas-empty',
    nome: 'etapa',
  },
};

function iniciarAcordeaoV2(list) {
  const cfg = ACORDEAO_V2[list.dataset.acordeao];
  if (!cfg) return;

  function itens() {
    return Array.from(list.querySelectorAll('.step'));
  }

  function atualizarHint() {
    const hint = document.getElementById(cfg.hint);
    if (!hint) return;
    const n = itens().length;
    hint.textContent = `${n} ${cfg.nome}${n === 1 ? '' : 's'} · arraste para reordenar`;
  }

  function renumerar() {
    itens().forEach((el, i) => {
      const num = el.querySelector('.step-num');
      if (num) num.textContent = i + 1;
      const rotulo = el.querySelector('.step-rotulo');
      if (rotulo) rotulo.textContent = cfg.rotulo(i + 1);
      const up = el.querySelector('[data-mover="-1"]');
      const down = el.querySelector('[data-mover="1"]');
      if (up) {
        up.disabled = i === 0;
        up.setAttribute('aria-label', `Mover ${cfg.nome} ${i + 1} para cima`);
      }
      if (down) {
        down.disabled = i === itens().length - 1;
        down.setAttribute('aria-label', `Mover ${cfg.nome} ${i + 1} para baixo`);
      }
      const rem = el.querySelector('[data-remover-item]');
      if (rem) rem.setAttribute('aria-label', `Remover ${cfg.nome} ${i + 1}`);
    });
    const empty = cfg.empty ? document.getElementById(cfg.empty) : null;
    if (empty) empty.hidden = itens().length > 0;
    atualizarHint();
  }

  function abrir(el, foco) {
    itens().forEach((outro) => {
      const aberto = outro === el;
      outro.classList.toggle('open', aberto);
      const head = outro.querySelector('.step-head');
      if (head) head.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
    if (foco) {
      const campo = el.querySelector(foco);
      if (campo) setTimeout(() => campo.focus(), 0);
    }
  }

  function alternar(el) {
    if (el.classList.contains('open')) {
      el.classList.remove('open');
      const head = el.querySelector('.step-head');
      if (head) head.setAttribute('aria-expanded', 'false');
      return;
    }
    abrir(el);
  }

  function mover(el, delta) {
    const lista = itens();
    const idx = lista.indexOf(el);
    const novo = idx + delta;
    if (idx < 0 || novo < 0 || novo >= lista.length) return;
    const referencia = delta < 0 ? lista[novo] : lista[novo].nextElementSibling;
    list.insertBefore(el, referencia);
    renumerar();
    marcarSujoV2();
  }

  function remover(el) {
    el.remove();
    renumerar();
    marcarSujoV2();
  }

  list.addEventListener('click', (e) => {
    if (e.target.closest('.drag-handle')) return;
    const moverBtn = e.target.closest('[data-mover]');
    if (moverBtn) {
      e.stopPropagation();
      mover(moverBtn.closest('.step'), Number(moverBtn.dataset.mover));
      return;
    }
    const removerBtn = e.target.closest('[data-remover-item]');
    if (removerBtn) {
      e.stopPropagation();
      remover(removerBtn.closest('.step'));
      return;
    }
    const head = e.target.closest('.step-head');
    if (head) alternar(head.closest('.step'));
  });

  list.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const head = e.target.closest('.step-head');
    if (!head || e.target !== head) return;
    e.preventDefault();
    alternar(head.closest('.step'));
  });

  list.addEventListener('input', (e) => {
    const busca = e.target.closest('.etapa-manuais-busca');
    if (busca) {
      const select = busca.closest('.field')?.querySelector('.etapa-manuais');
      const termo = normalizeSearchText(busca.value);
      if (select) {
        Array.from(select.options).forEach((opt) => {
          opt.hidden = !!termo && !normalizeSearchText(opt.textContent).includes(termo);
        });
      }
      return;
    }
    const campo = e.target.closest(cfg.resumo);
    if (!campo) return;
    const el = campo.closest('.step');
    const resumo = el.querySelector('.step-summary');
    const texto = campo.value.trim();
    resumo.textContent = texto || cfg.vazio;
    resumo.classList.toggle('empty', !texto);
    marcarSujoV2();
  });

  /* arraste: habilita apenas pela alca, para nao atrapalhar selecao de texto */
  list.addEventListener('mousedown', (e) => {
    const el = e.target.closest('.step');
    if (!el) return;
    el.draggable = !!e.target.closest('.drag-handle');
  });

  list.addEventListener('dragstart', (e) => {
    const el = e.target.closest('.step');
    if (!el) return;
    el.classList.add('dragging');
    el._ordemAntes = itens().map((item) => item.dataset.id).join(',');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', el.dataset.id || ''); } catch (erro) { /* ignore */ }
  });

  list.addEventListener('dragover', (e) => {
    const arrastado = list.querySelector('.step.dragging');
    if (!arrastado) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const cartoes = itens();
    if (!cartoes.length) return;
    let alvo = e.target.closest('.step');
    let depois;
    if (alvo) {
      const r = alvo.getBoundingClientRect();
      depois = (e.clientY - r.top) > r.height / 2;
    } else {
      let melhor = null;
      let dist = Infinity;
      cartoes.forEach((el) => {
        const box = el.getBoundingClientRect();
        const d = e.clientY < box.top ? box.top - e.clientY
          : (e.clientY > box.bottom ? e.clientY - box.bottom : 0);
        if (d < dist) { dist = d; melhor = el; }
      });
      alvo = melhor;
      if (!alvo) return;
      const rb = alvo.getBoundingClientRect();
      depois = e.clientY > rb.top + rb.height / 2;
    }
    if (alvo === arrastado) return;
    const referencia = depois ? alvo.nextElementSibling : alvo;
    if (referencia === arrastado) return;
    if (!depois && alvo.previousElementSibling === arrastado) return;

    const elementos = itens();
    const antes = elementos.map((el) => el.getBoundingClientRect().top);
    list.insertBefore(arrastado, referencia);
    elementos.forEach((el, i) => {
      if (el === arrastado) return;
      const dy = antes[i] - el.getBoundingClientRect().top;
      if (!dy) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform .16s ease';
        el.style.transform = '';
      });
    });
    renumerar();
  });

  list.addEventListener('drop', (e) => {
    if (list.querySelector('.step.dragging')) e.preventDefault();
  });

  list.addEventListener('dragend', () => {
    const arrastado = list.querySelector('.step.dragging');
    if (arrastado) {
      arrastado.classList.remove('dragging');
      const depois = itens().map((el) => el.dataset.id).join(',');
      if (arrastado._ordemAntes !== depois) marcarSujoV2();
      delete arrastado._ordemAntes;
    }
    itens().forEach((el) => { el.draggable = false; });
  });

  renumerar();
  list._renumerarV2 = renumerar;
}

document.addEventListener('mouseup', () => {
  document.querySelectorAll('#modal-content .step[draggable="true"]').forEach((el) => {
    if (!el.classList.contains('dragging')) el.draggable = false;
  });
});

function abrirNovoItemV2(listId, foco) {
  const list = document.getElementById(listId);
  if (!list) return;
  const cfg = ACORDEAO_V2[list.dataset.acordeao];
  list.querySelectorAll('.step.open').forEach((el) => {
    el.classList.remove('open');
    const head = el.querySelector('.step-head');
    if (head) head.setAttribute('aria-expanded', 'false');
  });
  const html = cfg && cfg.nome === 'etapa'
    ? etapaProcessoHTML({}, list.children.length)
    : manualPassoHTML({}, list.children.length);
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const el = wrap.firstElementChild;
  list.appendChild(el);
  el.classList.add('open');
  const head = el.querySelector('.step-head');
  if (head) head.setAttribute('aria-expanded', 'true');
  marcarSujoV2();
  if (typeof list._renumerarV2 === 'function') list._renumerarV2();
  if (foco) setTimeout(() => { const campo = el.querySelector(foco); if (campo) campo.focus(); }, 0);
}

function confirmarDelecao(colecao, id, nome, callback) {
  if (!DB.podeExcluir()) {
    toast('Sua conta não tem permissão para excluir.', 'error');
    return;
  }
  abrirModal(`
    <h2 class="modal-title">Confirmar exclusão</h2>
    <div class="confirm-box">
      <p class="confirm-msg">Tem certeza que deseja excluir <strong title="${escHtml(nome)}">${escHtml(nome)}</strong>? Esta ação não pode ser desfeita.</p>
      <div class="confirm-actions">
        <button class="btn btn-ghost" data-acao="fechar-modal">Cancelar</button>
        <button class="btn btn-danger" data-acao="executar-delecao" data-colecao="${colecao}" data-id="${id}">
          <i class="ph-bold ph-trash"></i> Excluir
        </button>
      </div>
    </div>
  `);
}

async function executarDelecao(colecao, id) {
  if (!DB.podeExcluir()) {
    toast('Sua conta não tem permissão para excluir.', 'error');
    fecharModal();
    return;
  }
  try {
    await DB.remove(colecao, id);
  } catch (erro) {
    toast(`Nao foi possivel excluir: ${erro?.message || 'falha desconhecida'}`, 'error');
    return;
  }
  fecharModal();
  toast('Registro excluído com sucesso.');
  renderSection(colecao);
  renderOverview();
}

/* Escape unico, definido em `js/core/utils.js` (carregado antes de db.js).
   A versao antiga nao escapava apostrofo e zerava 0/false. */
function escHtml(str) {
  return window.SisUtils.escapeHtml(str);
}

/** Devolve '' para URL com esquema executavel (javascript:, data:, vbscript:). */
function escUrl(valor) {
  return window.SisUtils.urlSegura(valor);
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function filtrarArquivosLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const tags = Array.isArray(item.tags) ? item.tags.join(' ') : '';
    const searchable = `${item.nome || ''} ${item.tipo || ''} ${tags}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

function getAdminItemSortLabel(item = {}) {
  const label = item.nome ?? item.titulo ?? item.nome_completo ?? item.sigla ?? '';
  return normalizeSearchText(label);
}
function getAdminDefaultSortMode() {
  const config = DB.getLayoutConfig ? DB.getLayoutConfig() : {};
  return config.defaultSortMode === 'id' ? 'id' : 'nome';
}
function ordenarListaAdminPorNome(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => getAdminItemSortLabel(a).localeCompare(getAdminItemSortLabel(b), 'pt-BR'));
}
function ordenarListaAdminPorId(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
}
/** Ordem usada pelas listas do admin: preferencia salva no layout (nome ou id). */
function ordenarListaAdminAtual(items) {
  return getAdminDefaultSortMode() === 'id'
    ? ordenarListaAdminPorId(items)
    : ordenarListaAdminPorNome(items);
}

const ARQUIVOS_LISTA = window.SisListas.createListController({
  colecao: 'arquivos',
  pageSize: 12,
  filter: filtrarArquivosLista,
  sort: ordenarListaAdminAtual,
  render: pintarArquivos,
  searchInputId: 'arquivos-search',
});

function atualizarBuscaArquivos(inputEl) {
  ARQUIVOS_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaArquivos(delta) {
  ARQUIVOS_LISTA.setPage(ARQUIVOS_LISTA.getState().pagina + Number(delta || 0));
}
function filtrarManuaisLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const passosCount = Array.isArray(item.passos) ? String(item.passos.length) : '0';
    const searchable = `${item.titulo || ''} ${item.categoria || ''} ${passosCount}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

const MANUAIS_LISTA = window.SisListas.createListController({
  colecao: 'manuais',
  pageSize: 12,
  filter: filtrarManuaisLista,
  sort: ordenarListaAdminAtual,
  render: pintarManuais,
  searchInputId: 'manuais-search',
});

function atualizarBuscaManuais(inputEl) {
  MANUAIS_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaManuais(delta) {
  MANUAIS_LISTA.setPage(MANUAIS_LISTA.getState().pagina + Number(delta || 0));
}
function filtrarProcessosLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const etapasCount = Array.isArray(item.etapas) ? String(item.etapas.length) : '0';
    const searchable = `${item.titulo || ''} ${item.categoria || ''} ${etapasCount}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

const PROCESSOS_LISTA = window.SisListas.createListController({
  colecao: 'processos',
  pageSize: 12,
  filter: filtrarProcessosLista,
  sort: ordenarListaAdminAtual,
  render: pintarProcessos,
  searchInputId: 'processos-search',
});

function atualizarBuscaProcessos(inputEl) {
  PROCESSOS_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaProcessos(delta) {
  PROCESSOS_LISTA.setPage(PROCESSOS_LISTA.getState().pagina + Number(delta || 0));
}
function filtrarFuncionariosLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const searchable = `${item.nome || ''} ${item.cargo || ''} ${item.lotacao || item.setor || ''} ${item.departamento || ''}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

const FUNCIONARIOS_LISTA = window.SisListas.createListController({
  colecao: 'funcionarios',
  pageSize: 12,
  filter: filtrarFuncionariosLista,
  sort: ordenarListaAdminAtual,
  render: pintarFuncionarios,
  searchInputId: 'funcionarios-search',
});

function atualizarBuscaFuncionarios(inputEl) {
  FUNCIONARIOS_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaFuncionarios(delta) {
  FUNCIONARIOS_LISTA.setPage(FUNCIONARIOS_LISTA.getState().pagina + Number(delta || 0));
}
function filtrarVeiculosLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const searchable = `${item.nome || ''} ${item.marca || ''} ${item.modelo || ''} ${item.placa || ''} ${item.patrimonio || ''} ${item.situacao || ''}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

const VEICULOS_LISTA = window.SisListas.createListController({
  colecao: 'veiculos',
  pageSize: 12,
  filter: filtrarVeiculosLista,
  sort: ordenarListaAdminAtual,
  render: pintarVeiculos,
  searchInputId: 'veiculos-search',
});

function atualizarBuscaVeiculos(inputEl) {
  VEICULOS_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaVeiculos(delta) {
  VEICULOS_LISTA.setPage(VEICULOS_LISTA.getState().pagina + Number(delta || 0));
}
function filtrarSistemasLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const searchable = `${item.nome || ''} ${item.nome_completo || ''} ${item.orgao || ''} ${item.url || ''}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

const SISTEMAS_LISTA = window.SisListas.createListController({
  colecao: 'sistemas',
  pageSize: 12,
  filter: filtrarSistemasLista,
  sort: ordenarListaAdminAtual,
  render: pintarSistemas,
  searchInputId: 'sistemas-search',
});

function atualizarBuscaSistemas(inputEl) {
  SISTEMAS_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaSistemas(delta) {
  SISTEMAS_LISTA.setPage(SISTEMAS_LISTA.getState().pagina + Number(delta || 0));
}
function filtrarServicosLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const searchable = `${item.nome || ''} ${item.categoria || ''} ${item.publico || ''}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

const SERVICOS_LISTA = window.SisListas.createListController({
  colecao: 'servicos',
  pageSize: 12,
  filter: filtrarServicosLista,
  sort: ordenarListaAdminAtual,
  render: pintarServicos,
  searchInputId: 'servicos-search',
});

function atualizarBuscaServicos(inputEl) {
  SERVICOS_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaServicos(delta) {
  SERVICOS_LISTA.setPage(SERVICOS_LISTA.getState().pagina + Number(delta || 0));
}
function filtrarAvisosLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const searchable = `${item.titulo || ''} ${item.tipo || ''} ${item.local || ''}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

const AVISOS_LISTA = window.SisListas.createListController({
  colecao: 'avisos',
  pageSize: 12,
  filter: filtrarAvisosLista,
  sort: ordenarListaAdminAtual,
  render: pintarAvisos,
  searchInputId: 'avisos-search',
});

function atualizarBuscaAvisos(inputEl) {
  AVISOS_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaAvisos(delta) {
  AVISOS_LISTA.setPage(AVISOS_LISTA.getState().pagina + Number(delta || 0));
}

function filtrarAgendaLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const searchable = `${item.titulo || ''} ${item.tipo || ''} ${item.local || ''} ${item.data || ''} ${item.data_fim || ''}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

const AGENDA_LISTA = window.SisListas.createListController({
  colecao: 'agendaEventos',
  pageSize: 12,
  filter: filtrarAgendaLista,
  sort: ordenarListaAdminAtual,
  render: pintarAgenda,
  searchInputId: 'agenda-search',
});

function atualizarBuscaAgenda(inputEl) {
  AGENDA_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaAgenda(delta) {
  AGENDA_LISTA.setPage(AGENDA_LISTA.getState().pagina + Number(delta || 0));
}
function filtrarEscalaLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const searchable = `${item.nome || ''} ${item.cargo || ''} ${item.periodo_inicio || ''} ${item.periodo_fim || ''} ${item.status || ''}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

const ESCALA_LISTA = window.SisListas.createListController({
  colecao: 'escalaFerias',
  pageSize: 12,
  filter: filtrarEscalaLista,
  sort: ordenarListaAdminAtual,
  render: pintarEscala,
  searchInputId: 'escala-search',
});

function atualizarBuscaEscala(inputEl) {
  ESCALA_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaEscala(delta) {
  ESCALA_LISTA.setPage(ESCALA_LISTA.getState().pagina + Number(delta || 0));
}

function filtrarAcessoLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const searchable = `${item.titulo || ''} ${item.url || ''} ${item.icone || ''}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

const ACESSO_LISTA = window.SisListas.createListController({
  colecao: 'acessoRapido',
  pageSize: 12,
  filter: filtrarAcessoLista,
  sort: ordenarListaAdminAtual,
  render: pintarAcesso,
  searchInputId: 'acesso-search',
});

function atualizarBuscaAcesso(inputEl) {
  ACESSO_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaAcesso(delta) {
  ACESSO_LISTA.setPage(ACESSO_LISTA.getState().pagina + Number(delta || 0));
}
const INFO_SIMPLES_CONTROLLERS = {};
const INFO_SIMPLES_HEADINGS = {};

/**
 * Um controlador por colecao (infoJuridico/infoMunicipio). O cabecalho vem do
 * call site, entao fica guardado num mapa e e lido no momento do render.
 */
function getInfoSimplesController(colecao) {
  if (!INFO_SIMPLES_CONTROLLERS[colecao]) {
    INFO_SIMPLES_CONTROLLERS[colecao] = window.SisListas.createListController({
      colecao,
      pageSize: 12,
      filter: filtrarInfoSimplesLista,
      sort: ordenarListaAdminAtual,
      render: (estado) => pintarInfoSimples(colecao, estado, INFO_SIMPLES_HEADINGS[colecao] || ''),
      searchInputId: `infosimples-search-${colecao}`,
    });
  }
  return INFO_SIMPLES_CONTROLLERS[colecao];
}

function filtrarInfoSimplesLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const searchable = `${item.titulo || ''} ${(item.campos||[]).map(c => `${c.label || ''} ${c.valor || ''}`).join(' ')}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

function atualizarBuscaInfoSimples(colecao, inputEl) {
  getInfoSimplesController(colecao).aplicarBusca(inputEl);
}

function mudarPaginaInfoSimples(colecao, delta) {
  const controlador = getInfoSimplesController(colecao);
  controlador.setPage(controlador.getState().pagina + Number(delta || 0));
}

function filtrarInfoOrgaosLista(items, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;
  return items.filter(item => {
    const searchable = `${item.titulo || ''} ${item.nome_completo || ''} ${(item.campos||[]).map(c => `${c.label || ''} ${c.valor || ''}`).join(' ')}`;
    return normalizeSearchText(searchable).includes(normalizedQuery);
  });
}

const INFO_ORGAOS_LISTA = window.SisListas.createListController({
  colecao: 'infoOrgaos',
  pageSize: 12,
  filter: filtrarInfoOrgaosLista,
  sort: ordenarListaAdminAtual,
  render: pintarInfoOrgaos,
  searchInputId: 'orgaos-search',
});

function atualizarBuscaInfoOrgaos(inputEl) {
  INFO_ORGAOS_LISTA.aplicarBusca(inputEl);
}

function mudarPaginaInfoOrgaos(delta) {
  INFO_ORGAOS_LISTA.setPage(INFO_ORGAOS_LISTA.getState().pagina + Number(delta || 0));
}
function formatDateBR(value) {
  if (!value || typeof value !== 'string') return value || '—';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function isDraftRecord(item) {
  return !!(item && item.publish_status === 'draft');
}

function withDraftSuffix(label, item) {
  return isDraftRecord(item) ? `${label} (Rascunho)` : label;
}

function isSelectedOptionValue(selectedValues, value) {
  const target = String(value);
  return Array.isArray(selectedValues) && selectedValues.some(item => String(item) === target);
}

function renderPublishStatusActions(saveAcao, item = {}, dadosExtras = {}) {
  const publishStatus = item.publish_status === 'draft' ? 'draft' : 'published';
  const isPublished = publishStatus === 'published';
  const dadosAttr = Object.entries(dadosExtras)
    .map(([chave, valor]) => `data-${chave}="${escHtml(valor)}"`)
    .join(' ');
  return `
    <div class="modal-actions-row">
      <div class="publish-status-control">
        <span class="publish-status-text" id="publish-status-label">${isPublished ? 'Publicado' : 'Rascunho'}</span>
        <label class="publish-status-switch" title="Alternar entre rascunho e publicado">
          <input
            type="checkbox"
            id="publish-status-toggle"
            ${isPublished ? 'checked' : ''}
            data-acao="toggle-publish-modal"
          />
          <span class="publish-status-slider"></span>
        </label>
      </div>
      <div class="modal-actions-buttons">
        <button class="btn btn-ghost" data-acao="fechar-modal">Cancelar</button>
        <button class="btn btn-primary" data-acao="salvar-modal" data-salvar="${escHtml(saveAcao)}" ${dadosAttr} data-id="${item.id || 0}"><i class="ph-bold ph-floppy-disk"></i> Salvar</button>
      </div>
    </div>`;
}

function renderInlinePublishStatusControl(colecao, item = {}) {
  const isPublished = item.publish_status !== 'draft';
  const titulo = isPublished
    ? 'Publicado - clique para mover para rascunho'
    : 'Rascunho - clique para publicar';
  return `
    <label class="inline-publish-toggle" title="${titulo}">
      <i class="ph-bold ${isPublished ? 'ph-eye' : 'ph-eye-closed'}" aria-hidden="true"></i>
      <span class="inline-publish-toggle__switch">
        <input
          type="checkbox"
          ${isPublished ? 'checked' : ''}
          data-acao="toggle-publish-inline" data-colecao="${colecao}" data-id="${item.id}"
          aria-label="${titulo}"
        />
        <span class="inline-publish-toggle__slider"></span>
      </span>
    </label>`;
}

async function toggleInlinePublishStatus(colecao, id, checked) {
  const publishStatus = checked ? 'published' : 'draft';
  if (!(await salvarComFeedback(colecao, id, { publish_status: publishStatus }))) {
    renderSection(colecao);
    return;
  }
  renderSection(colecao);
  renderOverview();
  toast(checked ? 'Item publicado.' : 'Item movido para rascunho.');
}

function handlePublishStatusToggle(input) {
  const label = document.getElementById('publish-status-label');
  if (label) {
    label.textContent = input.checked ? 'Publicado' : 'Rascunho';
  }
}

function getModalPublishStatus() {
  const input = document.getElementById('publish-status-toggle');
  return input && !input.checked ? 'draft' : 'published';
}

// Gera campo de lista dinâmica (passos, documentos, etc.)
function dynListHTML(items, fieldName, placeholder = 'Item...', isTextarea = false) {
  const tag = isTextarea ? 'textarea' : 'input';
  const rows = isTextarea ? 'rows="2"' : '';
  return `
    <div class="dyn-list" id="dyn-${fieldName}">
      ${(items || []).map((item, i) => `
        <div class="dyn-item">
          <${tag} name="${fieldName}_${i}" ${rows} placeholder="${escHtml(placeholder)}">${isTextarea ? escHtml(item) : ''}</${tag}>
          ${!isTextarea ? `<input style="display:none" value="${escHtml(item)}">` : ''}
          <button type="button" class="dyn-remove" data-acao="remover-dyn-item"><i class="ph-bold ph-minus"></i></button>
        </div>
      `).join('')}
    </div>
    <button type="button" class="dyn-add" data-acao="add-dyn-item" data-field="${fieldName}" data-placeholder="${escHtml(placeholder)}" data-textarea="${isTextarea}">
      <i class="ph-bold ph-plus"></i> Adicionar
    </button>
  `;
}

// Para input simples (valor no atributo value, não no innerHTML)
function dynListInputHTML(items, fieldName, placeholder = 'Item...') {
  return `
    <div class="dyn-list" id="dyn-${fieldName}">
      ${(items || []).map((item, i) => `
        <div class="dyn-item">
          <input name="${fieldName}_${i}" value="${escHtml(item)}" placeholder="${escHtml(placeholder)}" />
          <button type="button" class="dyn-remove" data-acao="remover-dyn-item"><i class="ph-bold ph-minus"></i></button>
        </div>
      `).join('')}
    </div>
    <button type="button" class="dyn-add" data-acao="add-dyn-item" data-field="${fieldName}" data-placeholder="${escHtml(placeholder)}" data-textarea="false">
      <i class="ph-bold ph-plus"></i> Adicionar
    </button>
  `;
}

function addDynItem(fieldName, placeholder, isTextarea) {
  const list = document.getElementById('dyn-' + fieldName);
  const i = list.children.length;
  const div = document.createElement('div');
  div.className = 'dyn-item';
  if (isTextarea) {
    div.innerHTML = `<textarea name="${fieldName}_${i}" rows="2" placeholder="${escHtml(placeholder)}"></textarea><button type="button" class="dyn-remove" data-acao="remover-dyn-item"><i class="ph-bold ph-minus"></i></button>`;
  } else {
    div.innerHTML = `<input name="${fieldName}_${i}" placeholder="${escHtml(placeholder)}" /><button type="button" class="dyn-remove" data-acao="remover-dyn-item"><i class="ph-bold ph-minus"></i></button>`;
  }
  list.appendChild(div);
}

function removeDynItem(btn) {
  btn.closest('.dyn-item').remove();
}

function getDynValues(fieldName) {
  const list = document.getElementById('dyn-' + fieldName);
  if (!list) return [];
  return Array.from(list.querySelectorAll('input, textarea'))
    .map(el => el.value.trim())
    .filter(Boolean);
}

// Tags fixas permitidas para arquivos
const TAGS_ARQUIVO = [
  'contrato', 'decreto', 'minuta', 'financeiro', 'formulário',
  'imagem', 'manual', 'modelo', 'ofício', 'planilha',
  'portaria', 'rh', 'relatório', 've\u00EDculos'
];

// Renderiza checkboxes de tags fixas (substitui o input livre)
function tagsInputHTML(tags, fieldName) {
  const selecionadas = tags || [];
  const tagsOrdenadas = [...TAGS_ARQUIVO, 'outro'];
  return `
    <div class="arquivo-tags-checkboxes" id="tags-wrap-${fieldName}">
      ${tagsOrdenadas.map(tag => `
        <label class="tag-checkbox-label">
          <input type="checkbox" value="${escHtml(tag)}" ${selecionadas.includes(tag) ? 'checked' : ''} />
          <span class="tag-checkbox-bullet"></span>
          <span class="tag-checkbox-text">${escHtml(tag.charAt(0).toUpperCase() + tag.slice(1))}</span>
        </label>
      `).join('')}
    </div>
    <p class="form-hint">Selecione uma ou mais tags.</p>
  `;
}

// Mantidas por compatibilidade (não fazem nada com o novo sistema)
function initTagsInput(fieldName) {}

function getTagsValues(fieldName) {
  const wrap = document.getElementById('tags-wrap-' + fieldName);
  if (!wrap) return [];
  return Array.from(wrap.querySelectorAll('input[type="checkbox"]:checked'))
    .map(cb => cb.value);
}

/* ============================================================
   COMPONENTE: SELETOR DE ÍCONE E COR
   ============================================================ */
const ICONES_DISPONIVEIS = [
  // Agricultura / natureza
  { icone: 'ph-leaf',            label: 'Folha' },
  { icone: 'ph-plant',           label: 'Planta' },
  { icone: 'ph-tree',            label: 'Árvore' },
  { icone: 'ph-flower',          label: 'Flor' },
  { icone: 'ph-sun',             label: 'Sol' },
  { icone: 'ph-drop',            label: 'Gota' },
  { icone: 'ph-tractor',         label: 'Trator' },
  { icone: 'ph-cow',             label: 'Bovino' },
  { icone: 'ph-package',         label: 'Pacote' },
  { icone: 'ph-flask',           label: 'Frasco' },
  { icone: 'ph-potted-plant',    label: 'Muda' },
  { icone: 'ph-grains',          label: 'Grãos' },
  { icone: 'ph-carrot',          label: 'Hortaliça' },
  { icone: 'ph-pepper',          label: 'Verdura' },
  { icone: 'ph-egg',             label: 'Ovos' },
  { icone: 'ph-cheese',          label: 'Leite e queijo' },
  { icone: 'ph-fish',            label: 'Peixe' },
  { icone: 'ph-bird',            label: 'Ave' },
  { icone: 'ph-horse',           label: 'Equino' },
  { icone: 'ph-barn',            label: 'Celeiro' },
  { icone: 'ph-trolley',         label: 'Carrinho' },
  { icone: 'ph-shovel',          label: 'Pá' },
  { icone: 'ph-basket',          label: 'Cesta' },
  { icone: 'ph-mountains',       label: 'Montanhas' },
  { icone: 'ph-cloud-sun',       label: 'Clima' },
  { icone: 'ph-thermometer',     label: 'Temperatura' },
  { icone: 'ph-scales',          label: 'Balança' },
  { icone: 'ph-recycle',         label: 'Sustentabilidade' },
  { icone: 'ph-road-horizon',    label: 'Estrada' },
  // Pessoas / organização
  { icone: 'ph-users',           label: 'Equipe' },
  { icone: 'ph-user-circle',     label: 'Usuário' },
  { icone: 'ph-buildings',       label: 'Prédios' },
  { icone: 'ph-bank',            label: 'Banco' },
  { icone: 'ph-graduation-cap',  label: 'Formatura' },
  { icone: 'ph-handshake',       label: 'Parceria' },
  // Documentos / admin
  { icone: 'ph-file-text',       label: 'Documento' },
  { icone: 'ph-book-open',       label: 'Manual' },
  { icone: 'ph-folder-open',     label: 'Pasta' },
  { icone: 'ph-clipboard-text',  label: 'Formulário' },
  { icone: 'ph-certificate',     label: 'Certificado' },
  { icone: 'ph-stamp',           label: 'Carimbo' },
  // Localização / mapa
  { icone: 'ph-map-pin',         label: 'Local' },
  { icone: 'ph-map-trifold',     label: 'Mapa' },
  { icone: 'ph-compass-tool',    label: 'Bússola' },
  { icone: 'ph-globe',           label: 'Globo' },
  // Tecnologia / sistemas
  { icone: 'ph-monitor',         label: 'Monitor' },
  { icone: 'ph-database',        label: 'Banco de dados' },
  { icone: 'ph-gear',            label: 'Engrenagem' },
  { icone: 'ph-wrench',          label: 'Ferramenta' },
  { icone: 'ph-shield-check',    label: 'Segurança' },
  // Transporte
  { icone: 'ph-truck',           label: 'Caminhão' },
  { icone: 'ph-car',             label: 'Carro' },
  // Comunicação / info
  { icone: 'ph-phone',           label: 'Telefone' },
  { icone: 'ph-envelope-simple', label: 'E-mail' },
  { icone: 'ph-megaphone',       label: 'Megafone' },
  { icone: 'ph-chat-text',       label: 'Chat' },
  { icone: 'ph-info',            label: 'Info' },
  { icone: 'ph-flag-banner',     label: 'Bandeira' },
  // Misc
  { icone: 'ph-star',            label: 'Estrela' },
  { icone: 'ph-lightning',       label: 'Raio' },
  { icone: 'ph-flow-arrow',      label: 'Fluxo' },
  { icone: 'ph-address-book',    label: 'Contatos' },
  { icone: 'ph-calendar-check',  label: 'Agenda' },
];

const CORES_DISPONIVEIS = [
  '#2d6a4f', '#3d7a5e', '#5c7a3d', '#3d5c7a',
  '#6b3d7a', '#7a3d5c', '#7a5c3d', '#7a3d3d',
  '#3d6a7a', '#5c3d7a', '#7a6b3d', '#3d4f6e',
];

function iconPickerHTML(iconeAtual, corAtual, fieldId) {
  const ic = iconeAtual || 'ph-leaf';
  const cor = corAtual  || '#2d6a4f';
  return `
    <div class="icon-picker-wrap" id="icon-picker-${fieldId}">
      <div class="icon-picker-preview" id="icon-preview-${fieldId}" style="background:color-mix(in srgb,${cor} 14%,transparent);color:${cor}">
        <i class="ph-bold ${ic}"></i>
      </div>
      <div class="icon-picker-right">
        <div class="icon-picker-grid">
          ${ICONES_DISPONIVEIS.map(o => `
            <button type="button"
              class="icon-opt ${o.icone === ic ? 'active' : ''}"
              title="${o.label}"
              aria-label="Selecionar ícone ${o.label}"
              data-acao="selecionar-icone" data-field="${fieldId}" data-valor="${o.icone}"
              style="${o.icone === ic ? `background:color-mix(in srgb,${cor} 18%,transparent);color:${cor};border-color:${cor}` : ''}">
              <i class="ph-bold ${o.icone}"></i>
            </button>
          `).join('')}
        </div>
        <div class="icon-cor-row">
          ${CORES_DISPONIVEIS.map(c => `
            <button type="button"
              class="cor-opt ${c === cor ? 'active' : ''}"
              title="${c}"
              aria-label="Selecionar cor ${c}"
              style="background:${c}"
              data-acao="selecionar-cor" data-field="${fieldId}" data-valor="${c}">
              ${c === cor ? '<i class="ph-bold ph-check" style="color:#fff;font-size:.7rem"></i>' : ''}
            </button>
          `).join('')}
        </div>
      </div>
      <input type="hidden" id="icon-val-${fieldId}"  value="${escHtml(ic)}" />
      <input type="hidden" id="cor-val-${fieldId}"   value="${escHtml(cor)}" />
    </div>
  `;
}

function selecionarIcone(fieldId, icone) {
  const cor = document.getElementById('cor-val-' + fieldId).value;
  document.getElementById('icon-val-' + fieldId).value = icone;
  marcarSujoV2();
  // Atualiza preview
  document.getElementById('icon-preview-' + fieldId).innerHTML = `<i class="ph-bold ${escHtml(icone)}"></i>`;
  const nomeEl = document.getElementById('icon-nome-' + fieldId);
  if (nomeEl) {
    const opcao = ICONES_DISPONIVEIS.find(o => o.icone === icone);
    if (opcao) nomeEl.textContent = opcao.label;
  }
  // Atualiza botões do grid
  document.querySelectorAll(`#icon-picker-${fieldId} .icon-opt`).forEach(btn => {
    const isActive = btn.querySelector('i').classList.contains(icone);
    btn.classList.toggle('active', isActive);
    btn.style.background = isActive ? `color-mix(in srgb,${cor} 18%,transparent)` : '';
    btn.style.color      = isActive ? cor : '';
    btn.style.borderColor = isActive ? cor : '';
  });
}

function toggleIconePanel(fieldId) {
  const panel = document.getElementById('icon-panel-' + fieldId);
  if (!panel) return;
  const aberto = panel.classList.toggle('open');
  const btn = document.querySelector(`[data-acao="toggle-icone-panel"][data-field="${fieldId}"]`);
  if (!btn) return;
  btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
  const label = btn.querySelector('.toggle-label');
  if (label) label.textContent = aberto ? 'Recolher' : 'Alterar';
}

function selecionarCor(fieldId, cor) {
  document.getElementById('cor-val-' + fieldId).value = cor;
  marcarSujoV2();
  // Atualiza preview
  const preview = document.getElementById('icon-preview-' + fieldId);
  preview.style.background = `color-mix(in srgb,${cor} 14%,transparent)`;
  preview.style.color = cor;
  // Atualiza botões de cor
  document.querySelectorAll(`#icon-picker-${fieldId} .cor-opt`).forEach(btn => {
    const isActive = btn.title === cor;
    btn.classList.toggle('active', isActive);
    btn.innerHTML = isActive ? '<i class="ph-bold ph-check" style="color:#fff;font-size:.7rem"></i>' : '';
  });
  // Atualiza cor do ícone ativo no grid
  document.querySelectorAll(`#icon-picker-${fieldId} .icon-opt.active`).forEach(btn => {
    btn.style.background  = `color-mix(in srgb,${cor} 18%,transparent)`;
    btn.style.color       = cor;
    btn.style.borderColor = cor;
  });
}

function getIconeCorValues(fieldId) {
  return {
    icone: document.getElementById('icon-val-' + fieldId)?.value || 'ph-leaf',
    cor:   document.getElementById('cor-val-' + fieldId)?.value  || '#2d6a4f',
  };
}

/* ============================================================
   FUNCIONÁRIOS
   ============================================================ */
function renderFuncionarios() {
  FUNCIONARIOS_LISTA.setItems(DB.get('funcionarios'));
}

function pintarFuncionarios(estado) {
  const sec = document.getElementById('section-funcionarios');
  renderAdminSectionWithTableAnimation(sec, `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Funcion&#225;rios</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input
          id="funcionarios-search"
          value="${escHtml(estado.query)}"
          data-acao="buscar-funcionarios"
          placeholder="Buscar por nome, cargo ou lotacao..."
          style="width:280px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem"
        />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-funcionarios" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-funcionarios" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-funcionario"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap">
      <table>
        <thead><tr><th>Nome</th><th>Cargo</th><th>Departamento</th><th>A&#231;&#245;es</th></tr></thead>
        <tbody>
          ${estado.itens.length ? estado.itens.map(f => `
            <tr>
              <td><strong title="${escHtml(f.nome)}">${escHtml(f.nome)}</strong></td>
              <td>${escHtml(f.cargo)}</td>
              <td>${escHtml(f.departamento || '')}</td>
              <td><div class="td-actions td-actions--with-status">
                ${renderInlinePublishStatusControl('funcionarios', f)}
                <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-funcionario" data-id="${f.id}" title="Editar" aria-label="Editar ${escHtml(f.nome)}"><i class="ph-bold ph-pencil"></i></button>
                <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(f.nome)}" data-acao="confirmar-delecao" data-colecao="funcionarios" data-id="${f.id}" title="Excluir" aria-label="Excluir ${escHtml(f.nome)}"><i class="ph-bold ph-trash"></i></button>
              </div></td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="4" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum funcionario encontrado para o filtro informado.</td>
            </tr>`}
        </tbody>
      </table>
    </div>
  `);
}
let funcionarioFotoUploadPendente = null;
function formFuncionario(f = {}) {
  funcionarioFotoUploadPendente = null;
  const foto = f.foto_url || f.foto;
  const fotoPreview = foto
    ? `<img src="${escHtml(foto)}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--border);margin-bottom:8px" />`
    : `<div style="width:80px;height:80px;border-radius:50%;background:var(--surface-2);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:1.8rem;margin-bottom:8px"><i class="ph-bold ph-user"></i></div>`;

  return modalV2HTML(`${f.id ? 'Editar' : 'Novo'} Funcionário`, `
    ${secaoV2('Identificação', `
      <div class="form-grid">
        <div class="form-group full" style="align-items:center">
          <label>Foto do funcionário</label>
          <div id="foto-preview">${fotoPreview}</div>
          <input type="file" id="f-foto-file" accept="image/*" style="display:none" data-acao="preview-foto" />
          <input type="hidden" id="f-foto" value="${escHtml(f.foto||'')}" />
          <input type="hidden" id="f-foto-storage-path" value="${escHtml(f.foto_storage_path||'')}" />
          <input type="hidden" id="f-foto-storage-bucket" value="${escHtml(f.foto_storage_bucket||'')}" />
          <input type="hidden" id="f-remover-foto" value="0" />
          <div style="display:flex;gap:8px;margin-top:4px">
            <button type="button" class="btn btn-ghost btn-sm" data-acao="abrir-input-arquivo" data-input="f-foto-file">
              <i class="ph-bold ph-upload-simple"></i> Escolher foto
            </button>
            ${foto ? `<button type="button" class="btn btn-danger btn-sm" data-acao="remover-foto"><i class="ph-bold ph-trash"></i> Remover</button>` : ''}
          </div>
          <span class="form-hint">JPG, PNG ou WebP. Recomendado: até 500kb.</span>
        </div>
        <div class="form-group full"><label>Nome completo</label><input id="f-nome" value="${escHtml(f.nome||'')}" /></div>
        <div class="form-group"><label>Matrícula</label><input id="f-matricula" value="${escHtml(f.matricula||'')}" /></div>
        <div class="form-group"><label>Cargo</label><input id="f-cargo" value="${escHtml(f.cargo||'')}" /></div>
        <div class="form-group"><label>Lotação</label><input id="f-lotacao" value="${escHtml(f.lotacao||f.setor||'')}" /></div>
        <div class="form-group"><label>Vínculo</label><input id="f-vinculo" value="${escHtml(f.vinculo||'')}" /></div>
        <div class="form-group"><label>Órgão</label><input id="f-orgao" value="${escHtml(f.orgao||'')}" /></div>
      </div>`, 'Foto e dados de identificação')}

    ${secaoV2('Dados funcionais', `
      <div class="form-grid">
        <div class="form-group"><label>Data de admissão</label><input type="date" id="f-data-admissao" value="${escHtml(f.data_admissao||'')}" /></div>
        <div class="form-group"><label>Telefone</label><input id="f-telefone" value="${escHtml(f.telefone||'')}" /></div>
        <div class="form-group"><label>E-mail</label><input id="f-email" value="${escHtml(f.email||'')}" /></div>
        <div class="form-group"><label>CPF</label><input id="f-cpf" value="${escHtml(f.cpf||'')}" /></div>
        <div class="form-group"><label>Departamento</label><input id="f-departamento" value="${escHtml(f.departamento||'')}" /></div>
      </div>`, 'Admissão e contato')}

    ${secaoV2('Atribuições', `
      <div class="form-grid">
        <div class="form-group full"><label>Descrição (o que essa pessoa faz)</label><textarea id="f-descricao">${escHtml(f.descricao||'')}</textarea></div>
      </div>`, 'Opcional')}`,
    publishFooterHTML('funcionario', f), f);
}

/** Lê o arquivo de imagem e converte para base64, exibindo preview */
function previewFoto(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) {
    toast('Imagem muito grande. Use uma imagem menor que 1MB.', 'error');
    return;
  }
  funcionarioFotoUploadPendente = file;
  document.getElementById('f-remover-foto').value = '0';
  const previewUrl = URL.createObjectURL(file);
  document.getElementById('foto-preview').innerHTML = `
      <img src="${escHtml(previewUrl)}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);margin-bottom:8px" />`;
}

function removerFoto() {
  funcionarioFotoUploadPendente = null;
  document.getElementById('f-foto').value = '';
  document.getElementById('f-foto-storage-path').value = '';
  document.getElementById('f-foto-storage-bucket').value = '';
  document.getElementById('f-remover-foto').value = '1';
  const fileInput = document.getElementById('f-foto-file');
  if (fileInput) fileInput.value = '';
  document.getElementById('foto-preview').innerHTML = `
    <div style="width:80px;height:80px;border-radius:50%;background:var(--surface-2);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:1.8rem;margin-bottom:8px"><i class="ph-bold ph-user"></i></div>`;
}

function novoFuncionario()    { abrirModalV2(formFuncionario()); }
function editarFuncionario(id){ const f = DB.getById('funcionarios', id); abrirModalV2(formFuncionario(f), f); }

async function salvarFuncionario(id) {
  if (!validarObrigatorioV2('f-nome', 'Informe o nome completo.')) return;
  const existente = id ? DB.getById('funcionarios', id) : null;
  const removeFoto = document.getElementById('f-remover-foto').value === '1';
  let fotoFinal = removeFoto ? '' : (existente?.foto || '');
  let fotoStoragePathFinal = removeFoto ? '' : (existente?.foto_storage_path || '');
  let fotoStorageBucketFinal = removeFoto ? '' : (existente?.foto_storage_bucket || '');

  const ui = iniciarSalvamentoV2();

  if (funcionarioFotoUploadPendente) {
    if (ui) ui.etapa('Enviando foto…');
    try {
      const upload = await DB.uploadFuncionarioFotoStorage(funcionarioFotoUploadPendente);
      fotoFinal = upload.url;
      fotoStoragePathFinal = upload.storage_path;
      fotoStorageBucketFinal = upload.storage_bucket;
    } catch (error) {
      if (ui) ui.restaurar();
      mostrarErroSalvar(`Falha no upload: ${error?.message || 'erro desconhecido'}`);
      return;
    }
  }

  const dados = {
    nome:          document.getElementById('f-nome').value.trim(),
    matricula:     document.getElementById('f-matricula').value.trim(),
    cargo:         document.getElementById('f-cargo').value.trim(),
    lotacao:       document.getElementById('f-lotacao').value.trim(),
    setor:         document.getElementById('f-lotacao').value.trim(),
    vinculo:       document.getElementById('f-vinculo').value.trim(),
    orgao:         document.getElementById('f-orgao').value.trim(),
    data_admissao: document.getElementById('f-data-admissao').value,
    telefone:      document.getElementById('f-telefone').value.trim(),
    email:         document.getElementById('f-email').value.trim(),
    cpf:           document.getElementById('f-cpf').value.trim(),
    departamento:  document.getElementById('f-departamento').value.trim(),
    foto:          fotoFinal,
    foto_storage_path: fotoStoragePathFinal,
    foto_storage_bucket: fotoStorageBucketFinal,
    descricao:     document.getElementById('f-descricao').value.trim(),
    publish_status: getModalPublishStatus(),
  };
  if (ui) ui.etapa('Salvando…');
  if (!(await salvarComFeedback('funcionarios', id, dados, { aoErro: mostrarErroSalvar }))) {
    if (ui) ui.restaurar();
    return;
  }
  if (existente?.foto_storage_path && (removeFoto || (fotoStoragePathFinal && fotoStoragePathFinal !== existente.foto_storage_path))) {
    DB.deleteFuncionarioFotoStorage(existente.foto_storage_path, existente.foto_storage_bucket).catch((error) => {
      console.warn('[Admin] Falha ao remover foto antiga do Storage:', error);
    });
  }
  funcionarioFotoUploadPendente = null;
  await DB.resolveStorageUrls('funcionarios').catch(() => {});
  fecharModal();
  toast('Funcionário salvo com sucesso.');
  renderFuncionarios();
  renderOverview();
}

/* ============================================================
   MANUAIS
   ============================================================ */
function renderManuais() {
  MANUAIS_LISTA.setItems(DB.get('manuais'));
}

function pintarManuais(estado) {
  const sec = document.getElementById('section-manuais');
  renderAdminSectionWithTableAnimation(sec, `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Manuais</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input
          id="manuais-search"
          value="${escHtml(estado.query)}"
          data-acao="buscar-manuais"
          placeholder="Buscar por titulo ou categoria..."
          style="width:260px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem"
        />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-manuais" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-manuais" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-manual"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap">
      <table>
        <thead><tr><th>T&#237;tulo</th><th>Categoria</th><th>Passos</th><th>A&#231;&#245;es</th></tr></thead>
        <tbody>
          ${estado.itens.length ? estado.itens.map(m => `
            <tr>
              <td><strong class="td-truncate" title="${escHtml(m.titulo)}">${escHtml(m.titulo)}</strong></td>
              <td><span class="badge">${escHtml(m.categoria)}</span></td>
              <td>${(m.passos||[]).length}</td>
              <td><div class="td-actions td-actions--with-status">
                ${renderInlinePublishStatusControl('manuais', m)}
                <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-manual" data-id="${m.id}" title="Editar" aria-label="Editar ${escHtml(m.titulo)}"><i class="ph-bold ph-pencil"></i></button>
                <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(m.titulo)}" data-acao="confirmar-delecao" data-colecao="manuais" data-id="${m.id}" title="Excluir" aria-label="Excluir ${escHtml(m.titulo)}"><i class="ph-bold ph-trash"></i></button>
              </div></td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="4" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum manual encontrado para o filtro informado.</td>
            </tr>`}
        </tbody>
      </table>
    </div>
  `);
}
function categoriasDe(colecao) {
  return [...new Set((DB.get(colecao) || [])
    .map(item => (item.categoria || '').trim())
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function publishFooterHTML(saveAcao, item = {}, dadosExtras = {}) {
  const publicado = item.publish_status !== 'draft';
  const dadosAttr = Object.entries(dadosExtras)
    .map(([chave, valor]) => `data-${chave}="${escHtml(valor)}"`)
    .join(' ');
  return `
    <div class="publish-status-control">
      <span class="publish-status-text" id="publish-status-label">${publicado ? 'Publicado' : 'Rascunho'}</span>
      <label class="publish-status-switch" title="Alternar entre rascunho e publicado">
        <input type="checkbox" id="publish-status-toggle" ${publicado ? 'checked' : ''} data-acao="toggle-publish-modal" />
        <span class="publish-status-slider"></span>
      </label>
    </div>
    <div class="save-error" id="save-error" role="alert"></div>
    <div class="footer-actions">
      <button class="btn btn-ghost" type="button" data-acao="fechar-modal">Cancelar</button>
      <button class="btn btn-primary" type="button" data-acao="salvar-modal" data-salvar="${saveAcao}" data-id="${item.id || 0}" ${dadosAttr}><i class="ph-bold ph-floppy-disk"></i> Salvar</button>
    </div>`;
}

/* ---------- modal v2: casca, secoes e abertura (Onda 2) ---------- */

/** Abre um formulario no modo v2 (foco preso, barra de alteracoes, etc.). */
function abrirModalV2(html, item = {}) {
  abrirModal(html, { v2: true, itemPublicado: !!(item.id && item.publish_status !== 'draft') });
}

function barraAlteracoesHTML(item = {}) {
  const sairDoAr = !!(item.id && item.publish_status !== 'draft');
  return `
    <div class="unsaved-bar" id="unsaved-bar" role="status" aria-live="polite">
      <p>Você tem alterações não salvas.</p>
      <button class="btn btn-ghost" type="button" data-acao="descartar-alteracoes">Descartar</button>
      <button class="btn btn-ghost" type="button" data-acao="salvar-rascunho">Salvar como rascunho${sairDoAr ? ' (sai do ar)' : ''}</button>
      <button class="btn btn-primary" type="button" data-acao="continuar-editando">Continuar editando</button>
    </div>`;
}

function secaoV2(titulo, conteudo, hint = '') {
  return `
    <section class="form-section">
      <div class="form-section-head">
        <span class="form-section-title">${escHtml(titulo)}</span>
        ${hint ? `<span class="form-section-hint">${escHtml(hint)}</span>` : ''}
      </div>
      ${conteudo}
    </section>`;
}

/** Casca completa do modal v2: titulo, corpo em secoes, barra e rodape. */
function modalV2HTML(titulo, corpo, rodape, item = {}) {
  return `
    <div class="modal-v2">
      <div class="modal-head">
        <h2 class="modal-title" id="modal-title" tabindex="-1">${escHtml(titulo)}</h2>
      </div>
      <div class="modal-body">${corpo}</div>
      ${barraAlteracoesHTML(item)}
      <div class="modal-footer">${rodape}</div>
    </div>`;
}

function iconPickerCompactoHTML(iconeAtual, corAtual, fieldId) {
  const ic = iconeAtual || 'ph-leaf';
  const cor = corAtual || '#2d6a4f';
  const atual = ICONES_DISPONIVEIS.find(o => o.icone === ic) || ICONES_DISPONIVEIS[0];
  return `
    <div class="icon-picker-wrap icon-picker-wrap--compact" id="icon-picker-${fieldId}">
      <div class="icon-compact-row">
        <div class="icon-picker-preview" id="icon-preview-${fieldId}" style="background:color-mix(in srgb,${cor} 14%,transparent);color:${cor}">
          <i class="ph-bold ${ic}"></i>
        </div>
        <div class="icon-meta">
          <strong id="icon-nome-${fieldId}">${escHtml(atual.label)}</strong>
          <span>Ícone e cor usados no card público</span>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-acao="toggle-icone-panel" data-field="${fieldId}" aria-expanded="false" aria-controls="icon-panel-${fieldId}">
          <span class="toggle-label">Alterar</span> <i class="ph-bold ph-caret-down caret"></i>
        </button>
      </div>
      <div class="icon-panel" id="icon-panel-${fieldId}">
        <div class="icon-panel-inner">
          <div class="icon-picker-grid">
            ${ICONES_DISPONIVEIS.map(o => `
              <button type="button"
                class="icon-opt ${o.icone === ic ? 'active' : ''}"
                title="${o.label}"
                aria-label="Selecionar ícone ${o.label}"
                data-acao="selecionar-icone" data-field="${fieldId}" data-valor="${o.icone}"
                style="${o.icone === ic ? `background:color-mix(in srgb,${cor} 18%,transparent);color:${cor};border-color:${cor}` : ''}">
                <i class="ph-bold ${o.icone}"></i>
              </button>
            `).join('')}
          </div>
          <div class="icon-cor-row">
            ${CORES_DISPONIVEIS.map(c => `
              <button type="button"
                class="cor-opt ${c === cor ? 'active' : ''}"
                title="${c}"
                aria-label="Selecionar cor ${c}"
                style="background:${c}"
                data-acao="selecionar-cor" data-field="${fieldId}" data-valor="${c}">
                ${c === cor ? '<i class="ph-bold ph-check" style="color:#fff;font-size:.7rem"></i>' : ''}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
      <input type="hidden" id="icon-val-${fieldId}" value="${escHtml(ic)}" />
      <input type="hidden" id="cor-val-${fieldId}" value="${escHtml(cor)}" />
    </div>`;
}

function manualPassoHTML(p = {}, i = 0) {
  const texto = typeof p === 'string' ? p : (p.texto || '');
  const imagem = typeof p === 'object' ? (p.imagem_url_assinada || p.imagem || '') : '';
  const imagemPath = typeof p === 'object' ? (p.imagem_storage_path || '') : '';
  const imagemBucket = typeof p === 'object' ? (p.imagem_storage_bucket || '') : '';
  const limpo = texto.trim();
  const id = novoIdItemV2();
  const thumb = imagem
    ? `<img src="${escHtml(imagem)}" alt="" />`
    : '<i class="ph ph-image"></i>';
  return `
    <div class="step" data-id="${id}">
      <div class="step-head" role="button" tabindex="0" aria-expanded="false">
        <span class="drag-handle" title="Arrastar para reordenar"><i class="ph-bold ph-dots-six-vertical"></i></span>
        <span class="step-num">${i + 1}</span>
        <span class="step-thumb">${thumb}</span>
        <span class="step-summary${limpo ? '' : ' empty'}">${limpo ? escHtml(limpo) : 'Passo sem texto'}</span>
        <span class="step-tools">
          <button class="step-tool" type="button" data-mover="-1" ${i === 0 ? 'disabled' : ''} title="Mover para cima" aria-label="Mover passo ${i + 1} para cima"><i class="ph-bold ph-arrow-up"></i></button>
          <button class="step-tool" type="button" data-mover="1" title="Mover para baixo" aria-label="Mover passo ${i + 1} para baixo"><i class="ph-bold ph-arrow-down"></i></button>
          <button class="step-tool danger" type="button" data-remover-item title="Remover passo" aria-label="Remover passo ${i + 1}"><i class="ph-bold ph-trash"></i></button>
        </span>
      </div>
      <div class="step-content">
        <div class="step-content-inner">
          <div class="field">
            <label class="step-rotulo" for="step-texto-${id}">Texto do passo ${i + 1}</label>
            <textarea id="step-texto-${id}" class="step-texto" rows="2" placeholder="Descreva o passo...">${escHtml(texto)}</textarea>
          </div>
          <div class="field">
            <label for="step-imagem-${id}">Imagem (opcional)</label>
            <div class="step-img-row">
              <div class="step-img-preview">${thumb}</div>
              <input id="step-imagem-${id}" type="file" accept="image/*" data-acao="preview-passo-imagem" />
              <input type="hidden" data-campo="imagem" value="${escHtml(imagem)}" />
              <input type="hidden" data-campo="imagem_path" value="${escHtml(imagemPath)}" />
              <input type="hidden" data-campo="imagem_bucket" value="${escHtml(imagemBucket)}" />
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function manualDocHTML(d) {
  const isObj = typeof d === 'object' && d !== null;
  const nome = isObj ? (d.nome || '') : (d || '');
  const arquivoId = isObj ? d.arquivo_id : null;
  const vinculado = arquivoId !== null && arquivoId !== undefined;
  return `
    <div class="doc-item">
      <div class="doc-top">
        <select class="doc-tipo doc-tipo-select" data-acao="toggle-doc-tipo" aria-label="Tipo do documento">
          <option value="texto" ${!vinculado ? 'selected' : ''}>Texto</option>
          <option value="arquivo" ${vinculado ? 'selected' : ''}>Arquivo</option>
        </select>
        <input class="doc-nome doc-nome-input" value="${escHtml(nome)}" placeholder="Nome do documento..." aria-label="Nome do documento" ${vinculado ? 'hidden' : ''} />
        <div class="doc-arquivo-atual" ${vinculado ? '' : 'hidden'}>${docChipHTML(vinculado ? nome : '')}</div>
        <button type="button" class="doc-remove" data-acao="remover-doc-item" title="Remover documento" aria-label="Remover documento"><i class="ph-bold ph-trash"></i></button>
      </div>
      <div class="doc-arquivo doc-arquivo-selector ${vinculado ? 'visible' : ''}" style="display:${vinculado ? 'flex' : 'none'}">
        ${arquivoPickerHTML(arquivoId)}
      </div>
    </div>`;
}

/**
 * Previa do arquivo escolhido, exibida na mesma linha do select de tipo.
 * Sem arquivo, devolve o texto discreto para a linha nao colapsar.
 */
function docChipHTML(nome) {
  if (!nome) return '<span class="doc-arquivo-atual-vazio">Nenhum arquivo selecionado</span>';
  return `
    <span class="doc-chip" title="${escHtml(nome)}">
      <i class="ph-bold ph-file-text"></i>
      <span class="doc-chip-nome">${escHtml(nome)}</span>
      <button type="button" class="doc-chip-remove" data-acao="limpar-arquivo-doc" title="Remover arquivo selecionado" aria-label="Remover arquivo selecionado"><i class="ph-bold ph-x"></i></button>
    </span>`;
}

/**
 * Seletor de arquivo dos documentos do manual, no mesmo padrao do filtro de
 * manuais das etapas (busca + lista rolavel). Guarda o id em input oculto.
 */
function arquivoPickerHTML(arquivoId) {
  const arquivos = DB.get ? DB.get('arquivos') : [];
  const atualId = arquivoId !== null && arquivoId !== undefined && arquivoId !== ''
    ? Number(arquivoId)
    : null;
  const opcoes = arquivos.map(a => {
    const label = withDraftSuffix(`${a.nome || 'Arquivo'} (${a.tipo || 'Arquivo'})`, a);
    const ativo = atualId === a.id;
    return `
      <button type="button"
        class="doc-arquivo-opcao ${ativo ? 'active' : ''}"
        role="option" aria-selected="${ativo}"
        data-acao="escolher-arquivo-doc"
        data-id="${a.id}"
        data-nome="${escHtml(a.nome || '')}"
        data-tipo="${escHtml(a.tipo || '')}"
        title="${escHtml(label)}">
        <span class="doc-arquivo-nome">${escHtml(withDraftSuffix(a.nome || 'Arquivo', a))}</span>
        <span class="badge">${escHtml(a.tipo || 'Arquivo')}</span>
      </button>`;
  }).join('');
  return `
    <div class="doc-arquivo-picker">
      <input class="doc-arquivo-busca" placeholder="Buscar arquivo por nome ou tipo..." aria-label="Buscar arquivo" autocomplete="off" />
      <div class="doc-arquivo-lista" role="listbox" aria-label="Arquivos disponíveis" ${opcoes ? '' : 'hidden'}>${opcoes}</div>
      <p class="doc-arquivo-vazio" ${opcoes ? 'hidden' : ''}>${arquivos.length
        ? 'Nenhum arquivo corresponde à busca.'
        : 'Nenhum arquivo cadastrado. Cadastre em Arquivos.'}</p>
      <input type="hidden" class="doc-arquivo-id" value="${atualId !== null ? atualId : ''}" />
    </div>`;
}

function filtrarArquivosDoc(input) {
  const picker = input.closest('.doc-arquivo-picker');
  if (!picker) return;
  const termo = normalizeSearchText(input.value).trim();
  let visiveis = 0;
  picker.querySelectorAll('.doc-arquivo-opcao').forEach(opcao => {
    const alvo = normalizeSearchText(`${opcao.dataset.nome || ''} ${opcao.dataset.tipo || ''}`);
    const mostra = !termo || alvo.includes(termo);
    opcao.hidden = !mostra;
    if (mostra) visiveis += 1;
  });
  const vazio = picker.querySelector('.doc-arquivo-vazio');
  const lista = picker.querySelector('.doc-arquivo-lista');
  if (lista) lista.hidden = visiveis === 0;
  if (vazio) {
    vazio.hidden = visiveis > 0;
    if (!visiveis) {
      vazio.textContent = picker.querySelector('.doc-arquivo-opcao')
        ? 'Nenhum arquivo corresponde à busca.'
        : 'Nenhum arquivo cadastrado. Cadastre em Arquivos.';
    }
  }
}

function escolherArquivoDoc(botao) {
  const picker = botao.closest('.doc-arquivo-picker');
  if (!picker) return;
  picker.querySelectorAll('.doc-arquivo-opcao').forEach(opcao => {
    const ativo = opcao === botao;
    opcao.classList.toggle('active', ativo);
    opcao.setAttribute('aria-selected', String(ativo));
  });
  const idInput = picker.querySelector('.doc-arquivo-id');
  if (idInput) idInput.value = botao.dataset.id || '';

  const atual = botao.closest('.doc-item')?.querySelector('.doc-arquivo-atual');
  if (atual) {
    const nome = botao.querySelector('.doc-arquivo-nome')?.textContent || botao.dataset.nome || '';
    atual.innerHTML = docChipHTML(nome.trim());
  }
  marcarSujoV2();
}

/** Remove so o arquivo vinculado, mantendo o documento no formulario. */
function limparArquivoDoc(botao) {
  const item = botao.closest('.doc-item');
  if (!item) return;
  const picker = item.querySelector('.doc-arquivo-picker');
  if (picker) {
    const idInput = picker.querySelector('.doc-arquivo-id');
    if (idInput) idInput.value = '';
    picker.querySelectorAll('.doc-arquivo-opcao').forEach(opcao => {
      opcao.classList.remove('active');
      opcao.setAttribute('aria-selected', 'false');
    });
  }
  const atual = item.querySelector('.doc-arquivo-atual');
  if (atual) atual.innerHTML = docChipHTML('');
  marcarSujoV2();
}

function formManual(m = {}) {
  const passosHTML = (m.passos || []).map((p, i) => manualPassoHTML(p, i)).join('');
  const docsHTML = (m.documentos || []).map((d) => manualDocHTML(d)).join('');
  const categorias = categoriasDe('manuais');
  const sairDoAr = !!(m.id && m.publish_status !== 'draft');
  const totalPassos = (m.passos || []).length;

  return `
    <div class="modal-v2">
      <div class="modal-head">
        <h2 class="modal-title" id="modal-title" tabindex="-1">${m.id ? 'Editar' : 'Novo'} Manual</h2>
      </div>
      <div class="modal-body">
        <section class="form-section">
          <div class="form-section-head"><span class="form-section-title">Identificação</span></div>
          <div class="field field-primary">
            <label for="m-titulo">Título</label>
            <input id="m-titulo" value="${escHtml(m.titulo || '')}" />
            <span class="field-error-msg">Informe o título.</span>
          </div>
          <div class="field">
            <label for="m-categoria">Categoria</label>
            <input id="m-categoria" list="m-categorias" value="${escHtml(m.categoria || '')}" placeholder="Ex: Administrativo, Técnico..." />
            <datalist id="m-categorias">${categorias.map(c => `<option value="${escHtml(c)}"></option>`).join('')}</datalist>
            <span class="hint">Digite livremente ou escolha uma categoria existente.</span>
          </div>
        </section>

        <section class="form-section">
          <div class="form-section-head">
            <span class="form-section-title">Aparência do card</span>
            <span class="form-section-hint">opcional</span>
          </div>
          ${iconPickerCompactoHTML(m.icone, m.cor, 'manual')}
        </section>

        <section class="form-section">
          <div class="form-section-head">
            <span class="form-section-title">Passos</span>
            <span class="form-section-hint" id="passos-hint">${totalPassos} passo${totalPassos === 1 ? '' : 's'} · arraste para reordenar</span>
          </div>
          <p class="step-empty" id="passos-empty" ${totalPassos ? 'hidden' : ''}>Nenhum passo ainda. Clique em "Adicionar passo" para começar.</p>
          <div class="step-list" id="dyn-passos" data-acordeao="passo">${passosHTML}</div>
          <button type="button" class="dyn-add" data-acao="add-manual-passo"><i class="ph-bold ph-plus"></i> Adicionar passo</button>
        </section>

        <section class="form-section">
          <div class="form-section-head">
            <span class="form-section-title">Documentos necessários</span>
            <span class="form-section-hint">opcional</span>
          </div>
          <div class="dyn-list" id="dyn-documentos">${docsHTML}</div>
          <button type="button" class="dyn-add" data-acao="add-documento"><i class="ph-bold ph-plus"></i> Adicionar documento</button>
        </section>

        <section class="form-section">
          <div class="form-section-head"><span class="form-section-title">Observações</span></div>
          <div class="field"><textarea id="m-observacoes" rows="3" aria-label="Observações">${escHtml(m.observacoes || '')}</textarea></div>
        </section>
      </div>

      <div class="unsaved-bar" id="unsaved-bar" role="status" aria-live="polite">
        <p>Você tem alterações não salvas.</p>
        <button class="btn btn-ghost" type="button" data-acao="descartar-alteracoes">Descartar</button>
        <button class="btn btn-ghost" type="button" data-acao="salvar-rascunho">Salvar como rascunho${sairDoAr ? ' (sai do ar)' : ''}</button>
        <button class="btn btn-primary" type="button" data-acao="continuar-editando">Continuar editando</button>
      </div>

      <div class="modal-footer">
        ${publishFooterHTML('manual', m)}
      </div>
    </div>`;
}

function getArquivosOptions(selectedId) {
  const arquivos = DB.get ? DB.get('arquivos') : [];
  const selectedIds = Array.isArray(selectedId)
    ? selectedId
    : (selectedId ? [selectedId] : []);
  return arquivos.map(a => {
    const label = withDraftSuffix(`${a.nome} (${a.tipo})`, a);
    return `<option value="${escHtml(a.id)}" ${isSelectedOptionValue(selectedIds, a.id) ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
}

function addDocumento() {
  const list = document.getElementById('dyn-documentos');
  if (!list) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = manualDocHTML(null);
  const item = wrap.firstElementChild;
  list.appendChild(item);
  marcarSujoV2();
  const nome = item.querySelector('.doc-nome-input');
  if (nome) nome.focus();
}

function toggleDocTipo(select) {
  const item = select.closest('.doc-item');
  const nomeInput = item.querySelector('.doc-nome-input');
  const arquivoSelector = item.querySelector('.doc-arquivo-selector');

  if (select.value === 'arquivo') {
    if (nomeInput) {
      nomeInput.hidden = true;
      nomeInput.disabled = false;
      nomeInput.value = '';
    }
    if (arquivoSelector) {
      arquivoSelector.classList.add('visible');
      arquivoSelector.style.display = 'flex';
    }
    const atual = item.querySelector('.doc-arquivo-atual');
    if (atual) atual.hidden = false;
  } else {
    if (nomeInput) {
      nomeInput.hidden = false;
      nomeInput.disabled = false;
    }
    if (arquivoSelector) {
      arquivoSelector.classList.remove('visible');
      arquivoSelector.style.display = 'none';
    }
    const arquivoSelect = arquivoSelector ? arquivoSelector.querySelector('select') : null;
    if (arquivoSelect) arquivoSelect.value = '';
    const picker = arquivoSelector ? arquivoSelector.querySelector('.doc-arquivo-picker') : null;
    if (picker) {
      const idInput = picker.querySelector('.doc-arquivo-id');
      if (idInput) idInput.value = '';
      picker.querySelectorAll('.doc-arquivo-opcao').forEach(opcao => {
        opcao.classList.remove('active');
        opcao.setAttribute('aria-selected', 'false');
      });
      const busca = picker.querySelector('.doc-arquivo-busca');
      if (busca && busca.value) {
        busca.value = '';
        filtrarArquivosDoc(busca);
      }
    }
    const atual = item.querySelector('.doc-arquivo-atual');
    if (atual) {
      atual.hidden = true;
      atual.innerHTML = docChipHTML('');
    }
  }
}

function addManualPasso() {
  abrirNovoItemV2('dyn-passos', '.step-texto');
}

function previewPassoImagem(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) {
    toast('Imagem muito grande (máx 1MB)', 'error');
    return;
  }
  const step = input.closest('.step');
  const reader = new FileReader();
  const preview = step ? step.querySelector('.step-img-preview') : null;
  const thumb = step ? step.querySelector('.step-thumb') : null;
  const hiddenImagem = step ? step.querySelector('[data-campo="imagem"]') : null;
  const hiddenPath = step ? step.querySelector('[data-campo="imagem_path"]') : null;
  const hiddenBucket = step ? step.querySelector('[data-campo="imagem_bucket"]') : null;
  input._pendingManualImageFile = file;

  reader.onload = (e) => {
    if (hiddenImagem) hiddenImagem.value = e.target.result;
    if (hiddenPath) hiddenPath.value = '';
    if (hiddenBucket) hiddenBucket.value = '';
    const img = `<img src="${escHtml(e.target.result)}" style="width:100%;height:100%;object-fit:cover" />`;
    if (preview) preview.innerHTML = img;
    if (thumb) thumb.innerHTML = img;
  };
  reader.readAsDataURL(file);
}

function novoManual() {
  abrirModal(formManual(), { v2: true, itemPublicado: false });
}
function editarManual(id) {
  const m = DB.getById('manuais', id) || {};
  abrirModal(formManual(m), { v2: true, itemPublicado: !!(m.id && m.publish_status !== 'draft') });
}

async function salvarManual(id) {
  if (!validarObrigatorioV2('m-titulo', 'Informe o título.')) return;

  const existente = id ? DB.getById('manuais', id) : null;
  const oldStorageRefs = new Set(
    ((existente?.passos) || [])
      .filter(p => p && typeof p === 'object' && p.imagem_storage_path)
      .map(p => `${p.imagem_storage_bucket || 'manuais-imagens-smader'}::${p.imagem_storage_path}`)
  );
  const ui = iniciarSalvamentoV2();
  const passos = [];

  try {
    for (const div of Array.from(document.getElementById('dyn-passos').children)) {
      const texto = (div.querySelector('.step-texto')?.value || '').trim();
      if (!texto) continue;

      const fileInput = div.querySelector('input[type="file"]');
      const imagemInput = div.querySelector('[data-campo="imagem"]');
      const pathInput = div.querySelector('[data-campo="imagem_path"]');
      const bucketInput = div.querySelector('[data-campo="imagem_bucket"]');

      let imagem = imagemInput ? imagemInput.value : '';
      let imagemStoragePath = pathInput ? pathInput.value.trim() : '';
      let imagemStorageBucket = bucketInput ? bucketInput.value.trim() : '';

      if (fileInput && fileInput._pendingManualImageFile) {
        if (ui) ui.etapa('Enviando arquivo…');
        try {
          const upload = await DB.uploadManualImageStorage(fileInput._pendingManualImageFile);
          imagem = upload.url;
          imagemStoragePath = upload.storage_path;
          imagemStorageBucket = upload.storage_bucket;
        } catch (error) {
          if (ui) ui.restaurar();
          mostrarErroSalvar(`Falha no upload da imagem: ${error?.message || 'erro desconhecido'}`);
          return;
        }
      }

      const passo = { texto, imagem };
      if (imagemStoragePath) passo.imagem_storage_path = imagemStoragePath;
      if (imagemStorageBucket) passo.imagem_storage_bucket = imagemStorageBucket;
      passos.push(passo);
    }
  } catch (error) {
    if (ui) ui.restaurar();
    mostrarErroSalvar(`Não foi possível preparar os passos: ${error?.message || 'falha desconhecida'}`);
    return;
  }

  const docsList = document.getElementById('dyn-documentos');
  const documentos = Array.from(docsList.children).map(div => {
    const tipoSelect = div.querySelector('.doc-tipo');
    const nomeInput = div.querySelector('.doc-nome');
    const arquivoIdInput = div.querySelector('.doc-arquivo-id');
    const arquivoSelect = div.querySelector('.doc-arquivo select');

    if (tipoSelect && tipoSelect.value === 'arquivo') {
      const valorArquivo = (arquivoIdInput && arquivoIdInput.value)
        || (arquivoSelect && arquivoSelect.value)
        || '';
      const arquivoId = parseInt(valorArquivo, 10) || null;
      if (arquivoId) {
        const arquivos = DB.get ? DB.get('arquivos') : [];
        const arquivo = arquivos.find(a => a.id === arquivoId);
        return {
          nome: arquivo ? arquivo.nome : 'Arquivo',
          arquivo_id: arquivoId,
        };
      }
      return '';
    }
    return nomeInput ? nomeInput.value.trim() : '';
  }).filter(Boolean);

  const { icone, cor } = getIconeCorValues('manual');
  const dados = {
    titulo: document.getElementById('m-titulo').value.trim(),
    categoria: document.getElementById('m-categoria').value.trim(),
    passos,
    documentos,
    observacoes: document.getElementById('m-observacoes').value.trim(),
    icone, cor,
    publish_status: getModalPublishStatus(),
  };

  if (ui) ui.etapa('Salvando…');
  const ok = await salvarComFeedback('manuais', id, dados, { aoErro: mostrarErroSalvar });
  if (!ok) {
    if (ui) ui.restaurar();
    return;
  }

  const currentStorageRefs = new Set(
    passos
      .filter(p => p.imagem_storage_path)
      .map(p => `${p.imagem_storage_bucket || 'manuais-imagens-smader'}::${p.imagem_storage_path}`)
  );
  for (const ref of oldStorageRefs) {
    if (currentStorageRefs.has(ref)) continue;
    const [bucket, path] = ref.split('::');
    try {
      await DB.deleteManualImageStorage(path, bucket);
    } catch (error) {
      console.warn('[admin] Falha ao remover imagem antiga de manual no storage:', error);
    }
  }

  fecharModal(true);
  toast('Manual salvo.');
  renderManuais();
}

/* ============================================================
   PROCESSOS
   ============================================================ */
function renderProcessos() {
  PROCESSOS_LISTA.setItems(DB.get('processos'));
}

function pintarProcessos(estado) {
  renderAdminSectionWithTableAnimation(document.getElementById('section-processos'), `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Processos</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input
          id="processos-search"
          value="${escHtml(estado.query)}"
          data-acao="buscar-processos"
          placeholder="Buscar por titulo ou categoria..."
          style="width:260px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem"
        />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-processos" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-processos" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-processo"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>T&#237;tulo</th><th>Categoria</th><th>Etapas</th><th>A&#231;&#245;es</th></tr></thead>
      <tbody>${estado.itens.length ? estado.itens.map(p => `
        <tr>
          <td><strong class="td-truncate" title="${escHtml(p.titulo)}">${escHtml(p.titulo)}</strong></td>
          <td><span class="badge">${escHtml(p.categoria)}</span></td>
          <td>${(p.etapas||[]).length}</td>
              <td><div class="td-actions td-actions--with-status">
                ${renderInlinePublishStatusControl('processos', p)}
                <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-processo" data-id="${p.id}" title="Editar" aria-label="Editar ${escHtml(p.titulo)}"><i class="ph-bold ph-pencil"></i></button>
                <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(p.titulo)}" data-acao="confirmar-delecao" data-colecao="processos" data-id="${p.id}" title="Excluir" aria-label="Excluir ${escHtml(p.titulo)}"><i class="ph-bold ph-trash"></i></button>
              </div></td>
        </tr>`).join('') : `
        <tr>
          <td colspan="4" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum processo encontrado para o filtro informado.</td>
        </tr>`}
      </tbody>
    </table></div>`);
}
function getManuaisOptions(selectedIds = []) {
  const lista = DB.get('manuais');
  if (!lista.length) return '<option value="" disabled>Nenhum manual cadastrado</option>';
  return lista.map(m => {
    const label = withDraftSuffix(m.titulo, m);
    return `<option value="${m.id}" ${isSelectedOptionValue(selectedIds, m.id) ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
}


function etapaProcessoHTML(e = {}, i = 0) {
  const titulo = e.titulo || '';
  const descricao = e.descricao || '';
  const manuaisIds = e.manuais_ids || [];
  const id = novoIdItemV2();
  const limpo = titulo.trim();
  return `
    <div class="step" data-id="${id}">
      <div class="step-head" role="button" tabindex="0" aria-expanded="false">
        <span class="drag-handle" title="Arrastar para reordenar"><i class="ph-bold ph-dots-six-vertical"></i></span>
        <span class="step-num">${i + 1}</span>
        <span class="step-thumb"><i class="ph-bold ph-flag"></i></span>
        <span class="step-summary${limpo ? '' : ' empty'}">${limpo ? escHtml(limpo) : 'Etapa sem título'}</span>
        <span class="step-tools">
          <button class="step-tool" type="button" data-mover="-1" ${i === 0 ? 'disabled' : ''} title="Mover para cima" aria-label="Mover etapa ${i + 1} para cima"><i class="ph-bold ph-arrow-up"></i></button>
          <button class="step-tool" type="button" data-mover="1" title="Mover para baixo" aria-label="Mover etapa ${i + 1} para baixo"><i class="ph-bold ph-arrow-down"></i></button>
          <button class="step-tool danger" type="button" data-remover-item title="Remover etapa" aria-label="Remover etapa ${i + 1}"><i class="ph-bold ph-trash"></i></button>
        </span>
      </div>
      <div class="step-content">
        <div class="step-content-inner">
          <div class="field">
            <label class="step-rotulo" for="etapa-titulo-${id}">Título da etapa ${i + 1}</label>
            <input id="etapa-titulo-${id}" class="etapa-titulo" value="${escHtml(titulo)}" placeholder="Título da etapa..." />
          </div>
          <div class="field">
            <label for="etapa-desc-${id}">Descrição (opcional)</label>
            <textarea id="etapa-desc-${id}" class="etapa-desc" rows="2" placeholder="Descrição da etapa...">${escHtml(descricao)}</textarea>
          </div>
          <div class="field">
            <label for="etapa-manuais-${id}">Manuais vinculados <span style="font-weight:400;opacity:.7">(opcional)</span></label>
            <input class="etapa-manuais-busca" aria-label="Filtrar manuais" placeholder="Filtrar manuais..." />
            <select id="etapa-manuais-${id}" class="etapa-manuais" multiple aria-label="Manuais vinculados">${getManuaisOptions(manuaisIds)}</select>
            <span class="hint">Segure Ctrl (ou Cmd) para selecionar vários. Use o filtro para achar mais rápido.</span>
          </div>
        </div>
      </div>
    </div>`;
}

function formProcesso(p = {}) {
  const etapasHTML = (p.etapas || []).map((e, i) => etapaProcessoHTML(e, i)).join('');
  const categorias = categoriasDe('processos');
  const sairDoAr = !!(p.id && p.publish_status !== 'draft');
  const totalEtapas = (p.etapas || []).length;

  return `
    <div class="modal-v2">
      <div class="modal-head">
        <h2 class="modal-title" id="modal-title" tabindex="-1">${p.id ? 'Editar' : 'Novo'} Processo</h2>
      </div>
      <div class="modal-body">
        <section class="form-section">
          <div class="form-section-head"><span class="form-section-title">Identificação</span></div>
          <div class="field field-primary">
            <label for="p-titulo">Título</label>
            <input id="p-titulo" value="${escHtml(p.titulo || '')}" />
            <span class="field-error-msg">Informe o título.</span>
          </div>
          <div class="field">
            <label for="p-categoria">Categoria</label>
            <input id="p-categoria" list="p-categorias" value="${escHtml(p.categoria || '')}" placeholder="Ex: Administrativo, Técnico..." />
            <datalist id="p-categorias">${categorias.map(c => `<option value="${escHtml(c)}"></option>`).join('')}</datalist>
            <span class="hint">Digite livremente ou escolha uma categoria existente.</span>
          </div>
        </section>

        <section class="form-section">
          <div class="form-section-head">
            <span class="form-section-title">Aparência do card</span>
            <span class="form-section-hint">opcional</span>
          </div>
          ${iconPickerCompactoHTML(p.icone, p.cor, 'processo')}
        </section>

        <section class="form-section">
          <div class="form-section-head">
            <span class="form-section-title">Etapas</span>
            <span class="form-section-hint" id="etapas-hint">${totalEtapas} etapa${totalEtapas === 1 ? '' : 's'} · arraste para reordenar</span>
          </div>
          <p class="step-empty" id="etapas-empty" ${totalEtapas ? 'hidden' : ''}>Nenhuma etapa ainda. Clique em "Adicionar etapa" para começar.</p>
          <div class="step-list" id="dyn-etapas" data-acordeao="etapa">${etapasHTML}</div>
          <button type="button" class="dyn-add" data-acao="add-etapa"><i class="ph-bold ph-plus"></i> Adicionar etapa</button>
        </section>
      </div>

      <div class="unsaved-bar" id="unsaved-bar" role="status" aria-live="polite">
        <p>Você tem alterações não salvas.</p>
        <button class="btn btn-ghost" type="button" data-acao="descartar-alteracoes">Descartar</button>
        <button class="btn btn-ghost" type="button" data-acao="salvar-rascunho">Salvar como rascunho${sairDoAr ? ' (sai do ar)' : ''}</button>
        <button class="btn btn-primary" type="button" data-acao="continuar-editando">Continuar editando</button>
      </div>

      <div class="modal-footer">
        ${publishFooterHTML('processo', p)}
      </div>
    </div>`;
}

function addEtapa() {
  abrirNovoItemV2('dyn-etapas', '.etapa-titulo');
}

function novoProcesso() {
  abrirModal(formProcesso(), { v2: true, itemPublicado: false });
}
function editarProcesso(id) {
  const p = DB.getById('processos', id) || {};
  abrirModal(formProcesso(p), { v2: true, itemPublicado: !!(p.id && p.publish_status !== 'draft') });
}

async function salvarProcesso(id) {
  if (!validarObrigatorioV2('p-titulo', 'Informe o título.')) return;

  const list = document.getElementById('dyn-etapas');
  const etapas = Array.from(list.children).map(div => ({
    titulo: (div.querySelector('.etapa-titulo')?.value || '').trim(),
    descricao: (div.querySelector('.etapa-desc')?.value || '').trim(),
    manuais_ids: Array.from(div.querySelector('.etapa-manuais')?.selectedOptions || [])
      .map(o => parseInt(o.value))
      .filter(Boolean),
  })).filter(e => e.titulo);

  const { icone, cor } = getIconeCorValues('processo');
  const dados = {
    titulo: document.getElementById('p-titulo').value.trim(),
    categoria: document.getElementById('p-categoria').value.trim(),
    etapas,
    icone, cor,
    publish_status: getModalPublishStatus(),
  };

  const ui = iniciarSalvamentoV2();
  if (ui) ui.etapa('Salvando…');
  const ok = await salvarComFeedback('processos', id, dados, { aoErro: mostrarErroSalvar });
  if (!ok) {
    if (ui) ui.restaurar();
    return;
  }
  fecharModal(true);
  toast('Processo salvo.');
  renderProcessos();
}

/* ============================================================
   ARQUIVOS
   ============================================================ */
function renderArquivos() {
  ARQUIVOS_LISTA.setItems(DB.get('arquivos'));
}

function pintarArquivos(estado) {
  renderAdminSectionWithTableAnimation(document.getElementById('section-arquivos'), `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Arquivos</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input
          id="arquivos-search"
          value="${escHtml(estado.query)}"
          data-acao="buscar-arquivos"
          placeholder="Buscar por nome, tipo ou tag..."
          style="width:260px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem"
        />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-arquivos" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-arquivos" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-arquivo"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table class="admin-table-arquivos">
      <thead><tr><th>Nome</th><th>Tipo</th><th>Tags</th><th>Ações</th></tr></thead>
      <tbody>${estado.itens.length ? estado.itens.map(a => `
        <tr>
          <td class="admin-col-arquivo-nome"><strong class="arquivo-nome-wrap" title="${escHtml(a.nome)}">${escHtml(a.nome)}</strong></td>
          <td><span class="badge">${escHtml(a.tipo)}</span></td>
          <td class="admin-col-arquivo-tags">${(a.tags||[]).map(t => `<span class="badge">${escHtml(t)}</span>`).join(' ')}</td>
              <td><div class="td-actions td-actions--with-status">
                ${renderInlinePublishStatusControl('arquivos', a)}
                <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-arquivo" data-id="${a.id}" title="Editar" aria-label="Editar ${escHtml(a.nome)}"><i class="ph-bold ph-pencil"></i></button>
                <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(a.nome)}" data-acao="confirmar-delecao" data-colecao="arquivos" data-id="${a.id}" title="Excluir" aria-label="Excluir ${escHtml(a.nome)}"><i class="ph-bold ph-trash"></i></button>
              </div></td>
        </tr>`).join('') : `
        <tr>
          <td colspan="4" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum arquivo encontrado para o filtro informado.</td>
        </tr>`}
      </tbody>
    </table></div>`);
}

let arquivoUploadPendente = null;

function formArquivo(a = {}) {
  arquivoUploadPendente = null;
  const urlAtual = a.storage_path ? '' : (a.url || '');
  const temArquivo = !!(a.arquivo_data || a.storage_path);
  const nomeArquivoAtual = a.arquivo_nome || '';

  const arquivoStatus = temArquivo
    ? `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--accent-light);border-radius:var(--radius-sm);font-size:.8rem;color:var(--accent)">
         <i class="ph-bold ph-file-check"></i>
         <span>${escHtml(nomeArquivoAtual)}</span>
         <button type="button" class="btn btn-danger btn-sm" style="margin-left:auto" data-acao="remover-arquivo-upload"><i class="ph-bold ph-trash"></i></button>
       </div>`
    : `<div style="font-size:.8rem;color:var(--text-muted);padding:4px 0">Nenhum arquivo carregado.</div>`;

  const corpo = `
    ${secaoV2('Identificação', `
      <div class="form-grid">
        <div class="form-group full"><label>Nome de exibição</label><input id="a-nome" value="${escHtml(a.nome||'')}" placeholder="Ex: Manual de Procedimentos" /></div>
        <div class="form-group">
          <label>Tipo</label>
          <select id="a-tipo">
            ${['PDF','DOCX','XLSX','PPTX','JPG/JPEG','PNG','TXT','ZIP','Outro'].map(t => `<option ${(a.tipo||'')=== t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>`, 'Como o arquivo aparece na lista')}

    ${secaoV2('Arquivo', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Upload de arquivo <span style="font-weight:400;color:var(--text-muted)">(recomendado)</span></label>
          ${arquivoStatus}
          <input type="file" id="a-file-input" style="display:none" data-acao="processar-arquivo-upload" />
          <input type="hidden" id="a-arquivo-data" value="${escHtml(a.arquivo_data || '')}" />
          <input type="hidden" id="a-arquivo-nome" value="${escHtml(nomeArquivoAtual)}" />
          <input type="hidden" id="a-storage-path" value="${escHtml(a.storage_path || '')}" />
          <input type="hidden" id="a-storage-bucket" value="${escHtml(a.storage_bucket || '')}" />
          <input type="hidden" id="a-remover-arquivo" value="0" />
          <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" data-acao="abrir-input-arquivo" data-input="a-file-input">
            <i class="ph-bold ph-upload-simple"></i> ${temArquivo ? 'Substituir arquivo' : 'Escolher arquivo'}
          </button>
          <span class="form-hint">O arquivo ficará disponível para download. Máx. recomendado: 10MB.</span>
        </div>

        <div class="form-group full">
          <label>Ou use URL / Link externo <span style="font-weight:400;color:var(--text-muted)">(Google Drive, etc.)</span></label>
          <input id="a-url" value="${escHtml(urlAtual)}" placeholder="https://drive.google.com/..." />
          <span class="form-hint">Se um arquivo foi carregado acima, o link externo é ignorado.</span>
        </div>
      </div>`, 'Envie um arquivo ou informe um link')}

    ${secaoV2('Organização', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Tags</label>
          ${tagsInputHTML(a.tags||[], 'arquivo')}
        </div>
      </div>`, 'Opcional')}`;

  return modalV2HTML(`${a.id ? 'Editar' : 'Novo'} Arquivo`, corpo, publishFooterHTML('arquivo', a), a);
}

function processarArquivoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const maxMB = 10;
  if (file.size > maxMB * 1024 * 1024) {
    toast(`Arquivo muito grande. Máximo ${maxMB}MB.`, 'error');
    input.value = '';
    return;
  }

  arquivoUploadPendente = file;
  document.getElementById('a-arquivo-nome').value = file.name;
  document.getElementById('a-remover-arquivo').value = '0';

  const status = document.querySelector('#a-file-input').closest('.form-group').querySelector('div:first-of-type');
  if (status) {
    status.outerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--accent-light);border-radius:var(--radius-sm);font-size:.8rem;color:var(--accent)">
      <i class="ph-bold ph-file-check"></i>
      <span>${escHtml(file.name)}</span>
      <button type="button" class="btn btn-danger btn-sm" style="margin-left:auto" data-acao="remover-arquivo-upload"><i class="ph-bold ph-trash"></i></button>
    </div>`;
  }
  toast('Arquivo selecionado. Clique em Salvar para enviar.');
}

function removerArquivoUpload() {
  arquivoUploadPendente = null;
  document.getElementById('a-arquivo-data').value = '';
  document.getElementById('a-arquivo-nome').value = '';
  document.getElementById('a-storage-path').value = '';
  document.getElementById('a-storage-bucket').value = '';
  document.getElementById('a-remover-arquivo').value = '1';
  const fileInput = document.getElementById('a-file-input');
  fileInput.value = '';
  const statusDiv = fileInput.closest('.form-group').querySelector('div:first-of-type');
  if (statusDiv) statusDiv.outerHTML = `<div style="font-size:.8rem;color:var(--text-muted);padding:4px 0">Nenhum arquivo carregado.</div>`;
}

function novoArquivo()     {
  abrirModalV2(formArquivo());
}
function editarArquivo(id) {
  const a = DB.getById('arquivos', id);
  abrirModalV2(formArquivo(a), a);
}

async function salvarArquivo(id) {
  const nome = document.getElementById('a-nome').value.trim();
  if (!validarObrigatorioV2('a-nome', 'Informe o nome de exibição.')) return;

  const existente = id ? DB.getById('arquivos', id) : null;
  const removeArquivo = document.getElementById('a-remover-arquivo').value === '1';
  const urlManual = document.getElementById('a-url').value.trim();
  let finalUrl = arquivoUploadPendente ? '' : (urlManual || (removeArquivo ? '' : (existente?.url || '')));
  let finalArquivoData = removeArquivo ? '' : (existente?.arquivo_data || '');
  let finalArquivoNome = removeArquivo ? '' : (existente?.arquivo_nome || '');
  let finalStoragePath = removeArquivo ? '' : (existente?.storage_path || '');
  let finalStorageBucket = removeArquivo ? '' : (existente?.storage_bucket || '');

  const ui = iniciarSalvamentoV2();

  if (arquivoUploadPendente) {
    if (ui) ui.etapa('Enviando arquivo…');
    try {
      const upload = await DB.uploadArquivoStorage(arquivoUploadPendente);
      finalUrl = upload.url;
      finalArquivoData = '';
      finalArquivoNome = upload.arquivo_nome;
      finalStoragePath = upload.storage_path;
      finalStorageBucket = upload.storage_bucket;
    } catch (error) {
      if (ui) ui.restaurar();
      mostrarErroSalvar(`Falha no upload: ${error?.message || 'erro desconhecido'}`);
      return;
    }
  }

  const dados = {
    nome:          nome,
    tipo:          document.getElementById('a-tipo').value,
    url:           finalUrl,
    tags:          getTagsValues('arquivo'),
    arquivo_data:  finalArquivoData,
    arquivo_nome:  finalArquivoNome,
    storage_path:  finalStoragePath,
    storage_bucket: finalStorageBucket,
    publish_status: getModalPublishStatus(),
  };

  if (ui) ui.etapa('Salvando…');
  if (!(await salvarComFeedback('arquivos', id, dados, { aoErro: mostrarErroSalvar }))) {
    if (ui) ui.restaurar();
    return;
  }
  if (existente?.storage_path && (removeArquivo || (finalStoragePath && finalStoragePath !== existente.storage_path))) {
    DB.deleteArquivoStorage(existente.storage_path, existente.storage_bucket).catch((error) => {
      console.warn('[Admin] Falha ao remover arquivo antigo do Storage:', error);
    });
  }
  arquivoUploadPendente = null;
  await DB.resolveStorageUrls('arquivos').catch(() => {});
  fecharModal(); toast('Arquivo salvo.'); renderArquivos();
}

/* ============================================================
   VEÍCULOS
   ============================================================ */
function renderVeiculos() {
  VEICULOS_LISTA.setItems(DB.get('veiculos'));
}

function pintarVeiculos(estado) {
  renderAdminSectionWithTableAnimation(document.getElementById('section-veiculos'), `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Ve&#237;culos</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input
          id="veiculos-search"
          value="${escHtml(estado.query)}"
          data-acao="buscar-veiculos"
          placeholder="Buscar por nome, modelo, placa..."
          style="width:280px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem"
        />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-veiculos" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-veiculos" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-veiculo"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Nome</th><th>Marca/Modelo</th><th>Placa</th><th>Patrim&#244;nio</th><th>Situa&#231;&#227;o</th><th>A&#231;&#245;es</th></tr></thead>
      <tbody>${estado.itens.length ? estado.itens.map(v => `
        <tr>
          <td><strong title="${escHtml(v.nome)}">${escHtml(v.nome)}</strong></td>
          <td>${escHtml(v.marca)} ${escHtml(v.modelo)} (${escHtml(v.ano)})</td>
          <td>${escHtml(v.placa)}</td>
          <td>${escHtml(v.patrimonio)}</td>
          <td><span class="badge" style="${v.situacao==='Em operação'?'background:#e6f4ea;color:#2d6a4f':'background:#fff3e0;color:#7a4f00'}">${escHtml(v.situacao)}</span></td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('veiculos', v)}
            <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-veiculo" data-id="${v.id}" title="Editar" aria-label="Editar ${escHtml(v.nome)}"><i class="ph-bold ph-pencil"></i></button>
            <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(v.nome)}" data-acao="confirmar-delecao" data-colecao="veiculos" data-id="${v.id}" title="Excluir" aria-label="Excluir ${escHtml(v.nome)}"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('') : `
        <tr>
          <td colspan="6" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum veiculo encontrado para o filtro informado.</td>
        </tr>`}
      </tbody>
    </table></div>`);
}


function getMotoristaOptions(selectedIds = []) {
  const lista = DB.get('funcionarios');
  return lista.map(f => {
    const label = withDraftSuffix(`${f.nome} \u2014 ${f.cargo}`, f);
    return `<option value="${f.id}" ${isSelectedOptionValue(selectedIds, f.id) ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
}

function getArquivosVeiculoOptions(selectedIds = []) {
  const lista = DB.get('arquivos').filter(a => (a.tags || []).includes('ve\u00EDculos'));
  if (!lista.length) return '<option value="" disabled>Nenhum arquivo com tag "ve\u00EDculos" cadastrado</option>';
  return lista.map(a => {
    const label = withDraftSuffix(`${a.nome} (${a.tipo})`, a);
    return `<option value="${escHtml(a.id)}" ${isSelectedOptionValue(selectedIds, a.id) ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
}

function formVeiculo(v = {}) {
  return modalV2HTML(`${v.id ? 'Editar' : 'Novo'} Veículo`, `
    ${secaoV2('Identificação', `
      <div class="form-grid">
        <div class="form-group full"><label>Nome</label><input id="v-nome" value="${escHtml(v.nome||'')}" placeholder="Ex: Trator Agrícola I" /></div>
        <div class="form-group"><label>Tipo</label><input id="v-tipo" value="${escHtml(v.tipo||'')}" placeholder="Trator, Caminhonete..." /></div>
        <div class="form-group"><label>Marca</label><input id="v-marca" value="${escHtml(v.marca||'')}" /></div>
        <div class="form-group"><label>Modelo</label><input id="v-modelo" value="${escHtml(v.modelo||'')}" /></div>
        <div class="form-group"><label>Ano</label><input id="v-ano" value="${escHtml(v.ano||'')}" /></div>
        <div class="form-group"><label>Cor</label><input id="v-cor" value="${escHtml(v.cor_veiculo||'')}" /></div>
        <div class="form-group"><label>Placa</label><input id="v-placa" value="${escHtml(v.placa||'')}" /></div>
        <div class="form-group"><label>Nº Patrimônio</label><input id="v-patrimonio" value="${escHtml(v.patrimonio||'')}" /></div>
        <div class="form-group"><label>Nº Série/Chassi</label><input id="v-chassi" value="${escHtml(v.chassi||'')}" /></div>
        <div class="form-group"><label>RENAVAM</label><input id="v-renavam" value="${escHtml(v.renavam||'')}" /></div>
        <div class="form-group"><label>Combustível</label><input id="v-combustivel" value="${escHtml(v.combustivel||'')}" /></div>
        <div class="form-group">
          <label>Situação</label>
          <select id="v-situacao">
            <option ${v.situacao==='Em operação'?'selected':''}>Em operação</option>
            <option ${v.situacao==='Em manutenção'?'selected':''}>Em manutenção</option>
            <option ${v.situacao==='Inativo'?'selected':''}>Inativo</option>
          </select>
        </div>
      </div>`, 'Nome, marca, placa e situação')}

    ${secaoV2('Aparência', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Ícone e cor do card</label>
          ${iconPickerCompactoHTML(v.icone, v.cor, 'veiculo')}
        </div>
      </div>`, 'Ícone e destaque do card')}

    ${secaoV2('Vínculos', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Motorista(s) habilitado(s)</label>
          <select id="v-motorista-ids" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.82rem;outline:none;min-height:72px;max-height:120px">
            ${getMotoristaOptions(v.motorista_ids || [])}
          </select>
          <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" data-acao="limpar-multi-select" data-alvo="v-motorista-ids">Limpar seleção</button>
          <p class="form-hint">Segure Ctrl (ou Cmd) para selecionar múltiplos motoristas.</p>
        </div>
        <div class="form-group full"><label>Localização atual</label><input id="v-localizacao" value="${escHtml(v.localizacao||'')}" /></div>
        <div class="form-group full">
          <label>Documentos vinculados <span style="font-weight:400;color:var(--text-muted)">(arquivos com tag "ve\u00EDculos")</span></label>
          <select id="v-arquivo-ids" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.82rem;outline:none;min-height:72px;max-height:120px">
            ${getArquivosVeiculoOptions(v.arquivo_ids || [])}
          </select>
          <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" data-acao="limpar-multi-select" data-alvo="v-arquivo-ids">Limpar seleção</button>
          <p class="form-hint">Segure Ctrl (ou Cmd) para selecionar múltiplos. Cadastre arquivos com tag "ve\u00EDculos" na seção Arquivos.</p>
        </div>
      </div>`, 'Motoristas e documentos')}

    ${secaoV2('Observações', `
      <div class="form-grid">
        <div class="form-group full"><label>Observações</label><textarea id="v-obs">${escHtml(v.obs||v.observacoes||'')}</textarea></div>
      </div>`, 'Opcional')}`,
    publishFooterHTML('veiculo', v), v);
}

function novoVeiculo()     { abrirModalV2(formVeiculo()); }
function editarVeiculo(id) { const v = DB.getById('veiculos', id); abrirModalV2(formVeiculo(v), v); }

function clearAdminMultiSelect(selectRef) {
  const select = typeof selectRef === 'string'
    ? document.getElementById(selectRef)
    : selectRef;
  if (!select) return;
  Array.from(select.options).forEach(option => { option.selected = false; });
}

function clearVeiculoMultiSelect(selectId) {
  clearAdminMultiSelect(selectId);
}

async function salvarVeiculo(id) {
  const motoristaIds = Array.from(
    document.getElementById('v-motorista-ids').selectedOptions
  ).map(o => parseInt(o.value)).filter(Boolean);

  const arquivoIds = Array.from(
    document.getElementById('v-arquivo-ids').selectedOptions
  ).map(o => parseInt(o.value)).filter(Boolean);

  const motoristaNomes = motoristaIds.map(mid => {
    const f = DB.getById('funcionarios', mid);
    return f ? f.nome : '';
  }).filter(Boolean).join(', ');

  const observacoes = document.getElementById('v-obs').value.trim();
  const { icone, cor } = getIconeCorValues('veiculo');
  const dados = {
    nome:          document.getElementById('v-nome').value.trim(),
    tipo:          document.getElementById('v-tipo').value.trim(),
    marca:         document.getElementById('v-marca').value.trim(),
    modelo:        document.getElementById('v-modelo').value.trim(),
    ano:           document.getElementById('v-ano').value.trim(),
    cor_veiculo:   document.getElementById('v-cor').value.trim(),
    placa:         document.getElementById('v-placa').value.trim(),
    patrimonio:    document.getElementById('v-patrimonio').value.trim(),
    chassi:        document.getElementById('v-chassi').value.trim(),
    renavam:       document.getElementById('v-renavam').value.trim(),
    combustivel:   document.getElementById('v-combustivel').value.trim(),
    situacao:      document.getElementById('v-situacao').value,
    motorista:     motoristaNomes,
    motorista_ids: motoristaIds,
    arquivo_ids:   arquivoIds,
    localizacao:   document.getElementById('v-localizacao').value.trim(),
    obs:           observacoes,
    observacoes,
    icone, cor,
    publish_status: getModalPublishStatus(),
  };
  if (!validarObrigatorioV2('v-nome', 'Informe o nome do veículo.')) return;
  if (!(await salvarComFeedback('veiculos', id, dados))) return;
  fecharModal(); toast('Veículo salvo.'); renderVeiculos();
}

/* ============================================================
   SISTEMAS
   ============================================================ */
function renderSistemas() {
  SISTEMAS_LISTA.setItems(DB.get('sistemas'));
}

function pintarSistemas(estado) {
  renderAdminSectionWithTableAnimation(document.getElementById('section-sistemas'), `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Sistemas</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input
          id="sistemas-search"
          value="${escHtml(estado.query)}"
          data-acao="buscar-sistemas"
          placeholder="Buscar por nome, orgao ou url..."
          style="width:280px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem"
        />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-sistemas" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-sistemas" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-sistema"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Nome</th><th>&#211;rg&#227;o</th><th>URL</th><th>A&#231;&#245;es</th></tr></thead>
      <tbody>${estado.itens.length ? estado.itens.map(s => `
        <tr>
          <td><strong title="${escHtml(s.nome)}">${escHtml(s.nome)}</strong><br><small style="color:var(--text-muted)">${escHtml(s.nome_completo)}</small></td>
          <td>${escHtml(s.orgao)}</td>
          <td><div class="td-truncate td-truncate--curto"><a href="${escHtml(escUrl(s.url))}" target="_blank" style="color:var(--accent)">${escHtml(s.url)}</a></div></td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('sistemas', s)}
            <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-sistema" data-id="${s.id}" title="Editar" aria-label="Editar ${escHtml(s.nome)}"><i class="ph-bold ph-pencil"></i></button>
            <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(s.nome)}" data-acao="confirmar-delecao" data-colecao="sistemas" data-id="${s.id}" title="Excluir" aria-label="Excluir ${escHtml(s.nome)}"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('') : `
        <tr>
          <td colspan="4" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum sistema encontrado para o filtro informado.</td>
        </tr>`}
      </tbody>
    </table></div>`);
}

function getSistemaLinksOptions(colecao, selectedIds = []) {
  const lista = DB.get(colecao);
  if (!lista.length) return `<option value="" disabled>Nenhum ${colecao === 'manuais' ? 'manual' : 'processo'} cadastrado</option>`;
  return lista.map(item => {
    const label = withDraftSuffix(item.titulo, item);
    return `<option value="${item.id}" ${isSelectedOptionValue(selectedIds, item.id) ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
}

/**
 * Filtra as opcoes de um <select multiple> pela busca acima dele.
 * Regras: nao altera a selecao, e opcao ja marcada continua visivel mesmo
 * sem casar com o termo (para o usuario nao "perder" o que escolheu).
 */
function filtrarOpcoesSelect(input) {
  const select = document.getElementById(input.dataset.alvo);
  if (!select) return;
  const termo = normalizeSearchText(input.value);
  let visiveis = 0;
  Array.from(select.options).forEach((opcao) => {
    const alvo = normalizeSearchText(opcao.textContent);
    const mostra = !termo || opcao.selected || alvo.includes(termo);
    opcao.hidden = !mostra;
    if (mostra) visiveis += 1;
  });
  const grupo = input.parentElement;
  const vazio = grupo ? grupo.querySelector('.select-busca-vazio') : null;
  if (vazio) {
    vazio.textContent = (visiveis > 0 || !termo)
      ? ''
      : (vazio.dataset.vazio || 'Nenhum resultado corresponde à busca.');
  }
}

function renderServicoDocumentosFields(documentos = []) {
  const lista = documentos.length ? documentos : [''];
  return `
    <div class="dyn-list" id="dyn-servico-documentos">
      ${lista.map((doc, i) => {
        const isObj = typeof doc === 'object' && doc !== null;
        const arquivoId = isObj ? doc.arquivo_id : null;
        const nome = isObj ? (doc.nome || '') : (doc || '');
        const tipo = arquivoId ? 'arquivo' : 'texto';
        return `
          <div class="dyn-item doc-item" style="flex-direction:column;gap:6px;padding:10px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)">
            <div style="display:flex;gap:8px;align-items:center;width:100%">
              <select name="sv_doc_tipo_${i}" class="doc-tipo-select" data-acao="toggle-doc-tipo" style="width:120px;padding:6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem">
                <option value="texto" ${tipo === 'texto' ? 'selected' : ''}>Texto</option>
                <option value="arquivo" ${tipo === 'arquivo' ? 'selected' : ''}>Arquivo</option>
              </select>
              <div style="flex:1;min-width:0;width:100%">
                <input name="sv_doc_nome_${i}" value="${escHtml(nome)}" placeholder="Nome do documento..." style="width:100%;min-width:0;padding:6px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem" class="doc-nome-input" ${tipo === 'arquivo' ? 'disabled' : ''} />
              </div>
              <button type="button" class="dyn-remove" data-acao="remover-dyn-item"><i class="ph-bold ph-minus"></i></button>
            </div>
            <div class="doc-arquivo-selector" style="display:${tipo === 'arquivo' ? 'flex' : 'none'};gap:8px;align-items:center;width:100%">
              <label style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap">Vincular:</label>
              <div style="flex:1;min-width:0;width:100%">
                <select name="sv_doc_arquivo_${i}" style="width:100%;min-width:0;padding:6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem">
                  <option value="">Selecione um arquivo...</option>
                  ${getArquivosOptions(arquivoId)}
                </select>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>
    <button type="button" class="dyn-add" data-acao="add-servico-documento"><i class="ph-bold ph-plus"></i> Adicionar documento</button>
  `;
}

function addServicoDocumento() {
  const list = document.getElementById('dyn-servico-documentos');
  const i = list.children.length;
  const div = document.createElement('div');
  div.className = 'dyn-item doc-item';
  div.style.cssText = 'flex-direction:column;gap:6px;padding:10px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)';
  div.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;width:100%">
      <select name="sv_doc_tipo_${i}" class="doc-tipo-select" data-acao="toggle-doc-tipo" style="width:120px;padding:6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem">
        <option value="texto" selected>Texto</option>
        <option value="arquivo">Arquivo</option>
      </select>
      <div style="flex:1;min-width:0;width:100%">
        <input name="sv_doc_nome_${i}" value="" placeholder="Nome do documento..." style="width:100%;min-width:0;padding:6px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem" class="doc-nome-input" />
      </div>
      <button type="button" class="dyn-remove" data-acao="remover-dyn-item"><i class="ph-bold ph-minus"></i></button>
    </div>
    <div class="doc-arquivo-selector" style="display:none;gap:8px;align-items:center;width:100%">
      <label style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap">Vincular:</label>
      <div style="flex:1;min-width:0;width:100%">
        <select name="sv_doc_arquivo_${i}" style="width:100%;min-width:0;padding:6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem">
          <option value="">Selecione um arquivo...</option>
          ${getArquivosOptions(null)}
        </select>
      </div>
    </div>`;
  list.appendChild(div);
}

const SERVICO_CATEGORIAS_PADRAO = ['Trator', 'Capacitação', 'Insumos', 'Administrativo', 'Outro'];

function getServicoCategoriaState(categoria = '') {
  if (!categoria) return { categoriaSelect: 'Trator', categoriaOutra: '' };
  if (SERVICO_CATEGORIAS_PADRAO.includes(categoria)) {
    return { categoriaSelect: categoria, categoriaOutra: '' };
  }
  return { categoriaSelect: 'Outro', categoriaOutra: categoria };
}

function toggleServicoCategoriaOutro() {
  const select = document.getElementById('sv-categoria');
  const wrap = document.getElementById('sv-categoria-outra-wrap');
  const input = document.getElementById('sv-categoria-outra');
  if (!select || !wrap) return;

  const mostrar = select.value === 'Outro';
  wrap.style.display = mostrar ? 'flex' : 'none';
  if (input) {
    input.disabled = !mostrar;
    if (!mostrar) input.value = '';
  }
}

function formSistema(s = {}) {
  return modalV2HTML(`${s.id ? 'Editar' : 'Novo'} Sistema`, `
    ${secaoV2('Identificação', `
      <div class="form-grid">
        <div class="form-group"><label>Nome (sigla)</label><input id="s-nome" value="${escHtml(s.nome||'')}" /></div>
        <div class="form-group"><label>Órgão responsável</label><input id="s-orgao" value="${escHtml(s.orgao||'')}" /></div>
        <div class="form-group full"><label>Nome completo</label><input id="s-nome-completo" value="${escHtml(s.nome_completo||'')}" /></div>
        <div class="form-group full"><label>URL de acesso</label><input id="s-url" value="${escHtml(s.url||'')}" placeholder="https://..." /></div>
        <div class="form-group full"><label>Instrução de acesso</label><input id="s-acesso" value="${escHtml(s.acesso||'')}" placeholder="Ex: Login com CPF..." /></div>
      </div>`, 'Sigla, órgão e link')}

    ${secaoV2('Descrição', `
      <div class="form-grid">
        <div class="form-group full"><label>Descrição</label><textarea id="s-descricao">${escHtml(s.descricao||'')}</textarea></div>
      </div>`, 'O que o sistema faz')}

    ${secaoV2('Aparência', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Ícone e cor do card</label>
          ${iconPickerCompactoHTML(s.icone, s.cor, 'sistema')}
        </div>
      </div>`, 'Ícone e destaque do card')}

    ${secaoV2('Vínculos', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Manuais relacionados <span style="font-weight:400;color:var(--text-muted)">(opcional)</span></label>
          <input type="search" class="select-busca" data-alvo="s-manuais" aria-label="Filtrar manuais" placeholder="Filtrar manuais..." />
          <select id="s-manuais" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.82rem;outline:none;min-height:64px;max-height:110px">
            ${getSistemaLinksOptions('manuais', s.manuais_ids || [])}
          </select>
          <p class="form-hint select-busca-vazio" aria-live="polite" data-vazio="Nenhum manual corresponde à busca."></p>
          <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" data-acao="limpar-multi-select" data-alvo="s-manuais">Limpar seleção</button>
          <p class="form-hint">Segure Ctrl (ou Cmd) para selecionar múltiplos. Use o filtro para achar mais rápido.</p>
        </div>
        <div class="form-group full">
          <label>Processos relacionados <span style="font-weight:400;color:var(--text-muted)">(opcional)</span></label>
          <input type="search" class="select-busca" data-alvo="s-processos" aria-label="Filtrar processos" placeholder="Filtrar processos..." />
          <select id="s-processos" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.82rem;outline:none;min-height:64px;max-height:110px">
            ${getSistemaLinksOptions('processos', s.processos_ids || [])}
          </select>
          <p class="form-hint select-busca-vazio" aria-live="polite" data-vazio="Nenhum processo corresponde à busca."></p>
          <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" data-acao="limpar-multi-select" data-alvo="s-processos">Limpar seleção</button>
          <p class="form-hint">Segure Ctrl (ou Cmd) para selecionar múltiplos. Use o filtro para achar mais rápido.</p>
        </div>
      </div>`, 'Opcional')}`,
    publishFooterHTML('sistema', s), s);
}

function novoSistema()     { abrirModalV2(formSistema()); }
function editarSistema(id) { const s = DB.getById('sistemas', id); abrirModalV2(formSistema(s), s); }

async function salvarSistema(id) {
  const manuaisIds   = Array.from(document.getElementById('s-manuais').selectedOptions).map(o => parseInt(o.value)).filter(Boolean);
  const processosIds = Array.from(document.getElementById('s-processos').selectedOptions).map(o => parseInt(o.value)).filter(Boolean);
  const { icone, cor } = getIconeCorValues('sistema');
  const dados = {
    nome:          document.getElementById('s-nome').value.trim(),
    orgao:         document.getElementById('s-orgao').value.trim(),
    nome_completo: document.getElementById('s-nome-completo').value.trim(),
    url:           document.getElementById('s-url').value.trim(),
    descricao:     document.getElementById('s-descricao').value.trim(),
    acesso:        document.getElementById('s-acesso').value.trim(),
    manuais_ids:   manuaisIds,
    processos_ids: processosIds,
    icone, cor,
    publish_status: getModalPublishStatus(),
  };
  if (!validarObrigatorioV2('s-nome', 'Informe o nome (sigla) do sistema.')) return;
  if (!(await salvarComFeedback('sistemas', id, dados))) return;
  fecharModal(); toast('Sistema salvo.'); renderSistemas();
}

/* ============================================================
   SERVIÇOS
   ============================================================ */
function renderServicos() {
  SERVICOS_LISTA.setItems(DB.get('servicos'));
}

function pintarServicos(estado) {
  renderAdminSectionWithTableAnimation(document.getElementById('section-servicos'), `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Servi&#231;os</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input
          id="servicos-search"
          value="${escHtml(estado.query)}"
          data-acao="buscar-servicos"
          placeholder="Buscar por nome, categoria ou publico..."
          style="width:300px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem"
        />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-servicos" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-servicos" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-servico"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Nome</th><th>Categoria</th><th>P&#250;blico</th><th>A&#231;&#245;es</th></tr></thead>
      <tbody>${estado.itens.length ? estado.itens.map(s => `
        <tr>
          <td><strong class="td-truncate" title="${escHtml(s.nome)}">${escHtml(s.nome)}</strong></td>
          <td><span class="badge">${escHtml(s.categoria)}</span></td>
          <td><div class="td-truncate" title="${escHtml(s.publico)}">${escHtml(s.publico)}</div></td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('servicos', s)}
            <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-servico" data-id="${s.id}" title="Editar" aria-label="Editar ${escHtml(s.nome)}"><i class="ph-bold ph-pencil"></i></button>
            <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(s.nome)}" data-acao="confirmar-delecao" data-colecao="servicos" data-id="${s.id}" title="Excluir" aria-label="Excluir ${escHtml(s.nome)}"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('') : `
        <tr>
          <td colspan="4" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum servico encontrado para o filtro informado.</td>
        </tr>`}
      </tbody>
    </table></div>`);
}

function novoServico()     { abrirModalV2(formServico()); }
function editarServico(id) { const s = DB.getById('servicos', id); abrirModalV2(formServico(s), s); }


/* ============================================================
   AVISOS
   ============================================================ */
function formServico(s = {}) {
  const { categoriaSelect, categoriaOutra } = getServicoCategoriaState(s.categoria || '');
  return modalV2HTML(`${s.id ? 'Editar' : 'Novo'} Serviço`, `
    ${secaoV2('Identificação', `
      <div class="form-grid">
        <div class="form-group full"><label>Nome</label><input id="sv-nome" value="${escHtml(s.nome||'')}" /></div>
        <div class="form-group">
          <label>Categoria</label>
          <select id="sv-categoria" data-acao="toggle-servico-categoria">${SERVICO_CATEGORIAS_PADRAO.map(c => `<option ${categoriaSelect === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        </div>
        <div class="form-group" id="sv-categoria-outra-wrap" style="display:${categoriaSelect === 'Outro' ? 'flex' : 'none'};flex-direction:column">
          <label>Qual categoria?</label>
          <input id="sv-categoria-outra" value="${escHtml(categoriaOutra)}" placeholder="Digite a categoria personalizada" ${categoriaSelect === 'Outro' ? '' : 'disabled'} />
        </div>
      </div>`, 'Nome e categoria do serviço')}

    ${secaoV2('Aparência', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Ícone e cor do card</label>
          ${iconPickerCompactoHTML(s.icone, s.cor, 'servico')}
        </div>
      </div>`, 'Ícone e destaque do card')}

    ${secaoV2('Conteúdo', `
      <div class="form-grid">
        <div class="form-group full"><label>Descrição</label><textarea id="sv-descricao">${escHtml(s.descricao||'')}</textarea></div>
        <div class="form-group full"><label>Público-alvo</label><input id="sv-publico" value="${escHtml(s.publico||'')}" /></div>
        <div class="form-group full"><label>Como solicitar</label><textarea id="sv-como">${escHtml(s.como_solicitar||'')}</textarea></div>
      </div>`, 'O que é e como pedir')}

    ${secaoV2('Documentos', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Documentos necessários</label>
          ${renderServicoDocumentosFields(s.documentos || [])}
        </div>
        <div class="form-group full">
          <label>Processos relacionados <span style="font-weight:400;color:var(--text-muted)">(opcional)</span></label>
          <input type="search" class="select-busca" data-alvo="sv-processos" aria-label="Filtrar processos" placeholder="Filtrar processos..." />
          <select id="sv-processos" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.82rem;outline:none;min-height:64px;max-height:110px">
            ${getSistemaLinksOptions('processos', s.processos_ids || [])}
          </select>
          <p class="form-hint select-busca-vazio" aria-live="polite" data-vazio="Nenhum processo corresponde à busca."></p>
          <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" data-acao="limpar-multi-select" data-alvo="sv-processos">Limpar seleção</button>
          <p class="form-hint">Segure Ctrl (ou Cmd) para selecionar múltiplos. Use o filtro para achar mais rápido.</p>
        </div>
      </div>`, 'Anexos e vínculos')}

    ${secaoV2('Prazos e observações', `
      <div class="form-grid">
        <div class="form-group full"><label>Prazo estimado</label><input id="sv-prazo" value="${escHtml(s.prazo||'')}" /></div>
        <div class="form-group full"><label>Observações</label><textarea id="sv-obs">${escHtml(s.obs||'')}</textarea></div>
      </div>`, 'Opcional')}`,
    publishFooterHTML('servico', s), s);
}

async function salvarServico(id) {
  const docsList = document.getElementById('dyn-servico-documentos');
  const documentos = Array.from(docsList.children).map(div => {
    const tipoSelect = div.querySelector('select[name^="sv_doc_tipo_"]');
    const nomeInput = div.querySelector('input[name^="sv_doc_nome_"]');
    const arquivoSelect = div.querySelector('select[name^="sv_doc_arquivo_"]');

    if (tipoSelect && tipoSelect.value === 'arquivo') {
      const arquivoId = arquivoSelect ? parseInt(arquivoSelect.value) : null;
      if (arquivoId) {
        const arquivo = DB.get('arquivos').find(a => a.id === arquivoId);
        return {
          nome: arquivo ? arquivo.nome : 'Arquivo',
          arquivo_id: arquivoId
        };
      }
      return null;
    }

    return nomeInput ? nomeInput.value.trim() : '';
  }).filter(Boolean);

  const { icone, cor } = getIconeCorValues('servico');
  const categoriaSelecionada = document.getElementById('sv-categoria').value;
  const categoriaOutraInput = document.getElementById('sv-categoria-outra');
  const categoriaFinal = categoriaSelecionada === 'Outro'
    ? (categoriaOutraInput ? categoriaOutraInput.value.trim() : '')
    : categoriaSelecionada;

  const dados = {
    nome:           document.getElementById('sv-nome').value.trim(),
    categoria:      categoriaFinal,
    descricao:      document.getElementById('sv-descricao').value.trim(),
    publico:        document.getElementById('sv-publico').value.trim(),
    como_solicitar: document.getElementById('sv-como').value.trim(),
    documentos,
    processos_ids:  Array.from(document.getElementById('sv-processos').selectedOptions).map(o => parseInt(o.value)).filter(Boolean),
    prazo:          document.getElementById('sv-prazo').value.trim(),
    obs:            document.getElementById('sv-obs').value.trim(),
    icone, cor,
    publish_status: getModalPublishStatus(),
  };
  if (!validarObrigatorioV2('sv-nome', 'Informe o nome do serviço.')) return;
  if (!validarObrigatorioV2('sv-categoria', 'Selecione uma categoria.')) return;
  if (!(await salvarComFeedback('servicos', id, dados))) return;
  fecharModal(); toast('Serviço salvo.'); renderServicos();
}

function renderAvisos() {
  AVISOS_LISTA.setItems(DB.get('avisos'));
}

function pintarAvisos(estado) {
  renderAdminSectionWithTableAnimation(document.getElementById('section-avisos'), `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Avisos</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input
          id="avisos-search"
          value="${escHtml(estado.query)}"
          data-acao="buscar-avisos"
          placeholder="Buscar por titulo, tipo ou local..."
          style="width:300px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem"
        />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-avisos" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-avisos" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-aviso"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>T&#237;tulo</th><th>Tipo</th><th>Local</th><th>A&#231;&#245;es</th></tr></thead>
      <tbody>${estado.itens.length ? estado.itens.map(a => `
        <tr>
          <td><strong class="td-truncate" title="${escHtml(a.titulo)}">${escHtml(a.titulo)}</strong></td>
          <td><span class="badge">${escHtml(a.tipo)}</span></td>
          <td>${escHtml(a.local||'—')}</td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('avisos', a)}
            <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-aviso" data-id="${a.id}" title="Editar" aria-label="Editar ${escHtml(a.titulo)}"><i class="ph-bold ph-pencil"></i></button>
            <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(a.titulo)}" data-acao="confirmar-delecao" data-colecao="avisos" data-id="${a.id}" title="Excluir" aria-label="Excluir ${escHtml(a.titulo)}"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('') : `
        <tr>
          <td colspan="4" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum aviso encontrado para o filtro informado.</td>
        </tr>`}
      </tbody>
    </table></div>`);
}
function formAviso(a = {}) {
  return modalV2HTML(`${a.id ? 'Editar' : 'Novo'} Aviso`, `
    ${secaoV2('Identificação', `
      <div class="form-grid">
        <div class="form-group full"><label>Título</label><input id="av-titulo" value="${escHtml(a.titulo||'')}" /></div>
        <div class="form-group">
          <label>Tipo</label>
          <select id="av-tipo">
            ${['aviso','urgente','comunicado'].map(t=>`<option ${(a.tipo||'')=== t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Local</label><input id="av-local" value="${escHtml(a.local||'')}" /></div>
      </div>`, 'Título, tipo e local')}

    ${secaoV2('Mensagem', `
      <div class="form-grid">
        <div class="form-group full"><label>Descrição</label><textarea id="av-desc">${escHtml(a.desc||a.descricao||'')}</textarea></div>
      </div>`, 'Texto exibido no app')}`,
    publishFooterHTML('aviso', a), a);
}

function novoAviso()     { abrirModalV2(formAviso()); }
function editarAviso(id) { const a = DB.getById('avisos', id); abrirModalV2(formAviso(a), a); }

async function salvarAviso(id) {
  const descricao = document.getElementById('av-desc').value.trim();
  const dados = {
    titulo: document.getElementById('av-titulo').value.trim(),
    tipo:   document.getElementById('av-tipo').value,
    local:  document.getElementById('av-local').value.trim(),
    desc:   descricao,
    descricao,
    publish_status: getModalPublishStatus(),
  };
  if (!validarObrigatorioV2('av-titulo', 'Informe o título do aviso.')) return;
  if (!(await salvarComFeedback('avisos', id, dados))) return;
  fecharModal(); toast('Aviso salvo.'); renderAvisos();
}

/* ============================================================
   AGENDA / EVENTOS
   ============================================================ */

/* ============================================================
   ESCALA DE FÉRIAS
   ============================================================ */
function renderAgendaEventos() {
  AGENDA_LISTA.setItems(DB.get('agendaEventos'));
}

function pintarAgenda(estado) {
  renderAdminSectionWithTableAnimation(document.getElementById('section-agendaEventos'), `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Eventos</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input
          id="agenda-search"
          value="${escHtml(estado.query)}"
          data-acao="buscar-agenda"
          placeholder="Buscar por titulo, tipo, local..."
          style="width:300px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem"
        />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-agenda" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-agenda" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-evento"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>T&#237;tulo</th><th>Tipo</th><th>Per&#237;odo</th><th>Local</th><th>A&#231;&#245;es</th></tr></thead>
      <tbody>${estado.itens.length ? estado.itens.map(e => {
        const periodo = e.tipo === 'prazo' && !e.data
          ? `${escHtml(formatDateBR(e.data_fim || '—'))}${e.hora_fim ? ` ${escHtml(e.hora_fim)}` : ''}`
          : `${escHtml(formatDateBR(e.data || '—'))}${e.hora ? ` ${escHtml(e.hora)}` : ''}${e.data_fim ? ` ? ${escHtml(formatDateBR(e.data_fim))}` : ''}${e.hora_fim ? ` ${escHtml(e.hora_fim)}` : ''}`;
        return `
        <tr>
          <td><strong class="td-truncate" title="${escHtml(e.titulo)}">${escHtml(e.titulo)}</strong></td>
          <td><span class="badge">${escHtml(e.tipo)}</span></td>
          <td>${periodo}</td>
          <td>${escHtml(e.local||'—')}</td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('agendaEventos', e)}
            <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-evento" data-id="${e.id}" title="Editar" aria-label="Editar ${escHtml(e.titulo)}"><i class="ph-bold ph-pencil"></i></button>
            <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(e.titulo)}" data-acao="confirmar-delecao" data-colecao="agendaEventos" data-id="${e.id}" title="Excluir" aria-label="Excluir ${escHtml(e.titulo)}"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`;
      }).join('') : `
        <tr>
          <td colspan="5" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum evento encontrado para o filtro informado.</td>
        </tr>`}
      </tbody>
    </table></div>`);
}
function formEvento(e = {}) {
  const tipos = ['reuniao','evento','prazo','capacitacao','operacao'];
  return modalV2HTML(`${e.id ? 'Editar' : 'Novo'} Evento`, `
    ${secaoV2('Identificação', `
      <div class="form-grid">
        <div class="form-group full"><label>Título</label><input id="ev-titulo" value="${escHtml(e.titulo||'')}" /></div>
        <div class="form-group">
          <label>Tipo</label>
          <select id="ev-tipo" data-acao="toggle-evento-tipo">${tipos.map(t=>`<option ${(e.tipo||'')=== t?'selected':''}>${t}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Local</label><input id="ev-local" value="${escHtml(e.local||'')}" /></div>
      </div>`, 'Título, tipo e local')}

    ${secaoV2('Período', `
      <div class="form-grid">
        <div class="form-group" id="ev-data-group"><label>Data início</label><input type="date" id="ev-data" value="${escHtml(e.data||'')}" /></div>
        <div class="form-group" id="ev-data-fim-group"><label id="ev-data-fim-label">Data fim</label><input type="date" id="ev-data-fim" value="${escHtml(e.data_fim||'')}" /></div>
        <div class="form-group" id="ev-hora-group"><label>Hora inicial</label><input type="time" id="ev-hora" value="${escHtml(e.hora||'')}" /></div>
        <div class="form-group"><label id="ev-hora-fim-label">Hora final</label><input type="time" id="ev-hora-fim" value="${escHtml(e.hora_fim||'')}" /></div>
        <div class="form-group full" id="ev-prazo-hint" style="display:none">
          <p class="form-hint">Para o tipo prazo, use apenas data final e hora final. O evento ficará "em andamento" até esse momento e depois passará para "encerrado".</p>
        </div>
      </div>`, 'Datas e horários')}

    ${secaoV2('Descrição', `
      <div class="form-grid">
        <div class="form-group full"><label>Descrição</label><textarea id="ev-desc">${escHtml(e.desc||e.descricao||'')}</textarea></div>
      </div>`, 'Opcional')}`,
    publishFooterHTML('evento', e), e);
}

function toggleEventoTipoFields() {
  const tipo = document.getElementById('ev-tipo')?.value;
  const isPrazo = tipo === 'prazo';
  const dataGroup = document.getElementById('ev-data-group');
  const horaGroup = document.getElementById('ev-hora-group');
  const dataFimLabel = document.getElementById('ev-data-fim-label');
  const horaFimLabel = document.getElementById('ev-hora-fim-label');
  const prazoHint = document.getElementById('ev-prazo-hint');
  const dataInput = document.getElementById('ev-data');
  const horaInput = document.getElementById('ev-hora');

  if (dataGroup) dataGroup.style.display = isPrazo ? 'none' : '';
  if (horaGroup) horaGroup.style.display = isPrazo ? 'none' : '';
  if (prazoHint) prazoHint.style.display = isPrazo ? '' : 'none';
  if (dataFimLabel) dataFimLabel.textContent = isPrazo ? 'Data final' : 'Data fim';
  if (horaFimLabel) horaFimLabel.textContent = isPrazo ? 'Hora final' : 'Hora final';

  if (isPrazo) {
    if (dataInput) dataInput.value = '';
    if (horaInput) horaInput.value = '';
  }
}

function novoEvento() {
  abrirModalV2(formEvento());
  setTimeout(toggleEventoTipoFields, 0);
}

function editarEvento(id) {
  const e = DB.getById('agendaEventos', id);
  abrirModalV2(formEvento(e), e);
  setTimeout(toggleEventoTipoFields, 0);
}

async function salvarEvento(id) {
  const tipo = document.getElementById('ev-tipo').value;
  const isPrazo = tipo === 'prazo';
  const dataFim = document.getElementById('ev-data-fim').value.trim();
  const descricao = document.getElementById('ev-desc').value.trim();
  const dados = {
    titulo:   document.getElementById('ev-titulo').value.trim(),
    tipo,
    data:     isPrazo ? null : (document.getElementById('ev-data').value || null),
    data_fim: dataFim || null,
    hora:     isPrazo ? null : (document.getElementById('ev-hora').value || null),
    hora_fim: document.getElementById('ev-hora-fim').value || null,
    local:    document.getElementById('ev-local').value.trim(),
    desc:     descricao,
    descricao,
    publish_status: getModalPublishStatus(),
  };

  if (!validarObrigatorioV2('ev-titulo', 'Informe o título do evento.')) return;
  if (isPrazo) {
    if (!validarObrigatorioV2('ev-data-fim', 'Informe a data final do prazo.')) return;
  } else if (!validarObrigatorioV2('ev-data', 'Informe a data inicial.')) {
    return;
  }

  if (!(await salvarComFeedback('agendaEventos', id, dados))) return;
  fecharModal(); toast('Evento salvo.'); renderAgendaEventos();
}


function preencherDadosFunc() {
  const sel = document.getElementById('fer-func');
  const opt = sel.options[sel.selectedIndex];
  if (opt) document.getElementById('fer-cargo').value = opt.dataset.cargo || '';
}

function novaFerias()     { abrirModalV2(formFerias()); }
function editarFerias(id) { const f = DB.getById('escalaFerias', id); abrirModalV2(formFerias(f), f); }


/* ============================================================
   ACESSO RÁPIDO
   ============================================================ */
function getFeriasStatus(periodoInicio, periodoFim) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicio = new Date(periodoInicio + "T00:00:00");
  const fim = new Date(periodoFim + "T00:00:00");

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return 'agendado';
  if (hoje < inicio) return 'agendado';
  if (hoje > fim) return 'concluido';
  return 'em_curso';
}

function renderEscalaFerias() {
  ESCALA_LISTA.setItems(DB.get('escalaFerias'));
}

function pintarEscala(estado) {
  renderAdminSectionWithTableAnimation(document.getElementById('section-escalaFerias'), `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Escala de F&#233;rias</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="escala-search" value="${escHtml(estado.query)}" data-acao="buscar-escala" placeholder="Buscar por funcionario, cargo..." style="width:300px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem" />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-escala" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-escala" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-escala"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Funcion&#225;rio</th><th>Cargo</th><th>In&#237;cio</th><th>Fim</th><th>Status</th><th>A&#231;&#245;es</th></tr></thead>
      <tbody>${estado.itens.length ? estado.itens.map(f => {
        const status = getFeriasStatus(f.periodo_inicio, f.periodo_fim);
        return `
        <tr>
          <td><strong title="${escHtml(f.nome)}">${escHtml(f.nome)}</strong></td>
          <td>${escHtml(f.cargo)}</td>
          <td>${escHtml(formatDateBR(f.periodo_inicio))}</td>
          <td>${escHtml(formatDateBR(f.periodo_fim))}</td>
          <td><span class="badge" style="${status==='em_curso'?'background:#e6f4ea;color:#2d6a4f':''}">${escHtml(status)}</span></td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('escalaFerias', f)}
            <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-ferias" data-id="${f.id}" title="Editar" aria-label="Editar ${escHtml(f.nome)}"><i class="ph-bold ph-pencil"></i></button>
            <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(f.nome)}" data-acao="confirmar-delecao" data-colecao="escalaFerias" data-id="${f.id}" title="Excluir" aria-label="Excluir ${escHtml(f.nome)}"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`;
      }).join('') : `
        <tr><td colspan="6" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum registro encontrado para o filtro informado.</td></tr>`}
      </tbody>
    </table></div>`);
}
function formFerias(f = {}) {
  const funcionarios = DB.get('funcionarios');
  return modalV2HTML(`${f.id ? 'Editar' : 'Nova'} Entrada de Férias`, `
    ${secaoV2('Identificação', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Funcionário</label>
          <select id="fer-func" data-acao="preencher-dados-func">
            <option value="">— Selecione —</option>
            ${funcionarios.map(fn=>`<option value="${fn.id}" data-cargo="${escHtml(fn.cargo)}" ${String(f.funcionario_id)===String(fn.id)?'selected':''}>${escHtml(withDraftSuffix(fn.nome, fn))}</option>`).join('')}
          </select>
        </div>
        <div class="form-group full"><label>Cargo (preenchido automaticamente)</label><input id="fer-cargo" value="${escHtml(f.cargo||'')}" /></div>
      </div>`, 'Quem entra de férias')}

    ${secaoV2('Período', `
      <div class="form-grid">
        <div class="form-group"><label>Início das férias</label><input type="date" id="fer-inicio" value="${escHtml(f.periodo_inicio||'')}" /></div>
        <div class="form-group"><label>Fim das férias</label><input type="date" id="fer-fim" value="${escHtml(f.periodo_fim||'')}" /></div>
        <div class="form-group full">
          <label>Status</label>
          <div style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:var(--surface-2);font-size:0.84rem;color:var(--text-secondary)">
            Calculado automaticamente pelas datas: antes do início = <strong>agendado</strong>, durante o período = <strong>em_curso</strong>, após o fim = <strong>concluido</strong>.
          </div>
        </div>
      </div>`, 'Datas e situação')}`,
    publishFooterHTML('ferias', f), f);
}

async function salvarFerias(id) {
  const sel = document.getElementById('fer-func');
  const funcId = parseInt(sel.value);
  const func = DB.getById('funcionarios', funcId);
  const periodoInicio = document.getElementById('fer-inicio').value;
  const periodoFim = document.getElementById('fer-fim').value;
  const dados = {
    funcionario_id:  funcId,
    nome:            func ? func.nome : '',
    cargo:           document.getElementById('fer-cargo').value.trim(),
    periodo_inicio:  periodoInicio,
    periodo_fim:     periodoFim,
    status:          getFeriasStatus(periodoInicio, periodoFim),
    publish_status: getModalPublishStatus(),
  };
  if (!validarObrigatorioV2('fer-func', 'Selecione o funcionário.')) return;
  if (!validarObrigatorioV2('fer-inicio', 'Informe o início das férias.')) return;
  if (!validarObrigatorioV2('fer-fim', 'Informe o fim das férias.')) return;
  if (dados.periodo_fim < dados.periodo_inicio) { toast('A data final não pode ser anterior à data inicial.','error'); return; }
  if (!(await salvarComFeedback('escalaFerias', id, dados))) return;
  fecharModal(); toast('Escala de férias salva.'); renderEscalaFerias();
}

function renderAcessoRapido() {
  ACESSO_LISTA.setItems(DB.get('acessoRapido'));
}

function pintarAcesso(estado) {
  renderAdminSectionWithTableAnimation(document.getElementById('section-acessoRapido'), `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Acesso R&#225;pido</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="acesso-search" value="${escHtml(estado.query)}" data-acao="buscar-acesso" placeholder="Buscar por titulo, url ou icone..." style="width:300px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem" />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-acesso" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-acesso" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-acesso"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:16px">Configure os bot&#245;es de acesso r&#225;pido do dashboard. M&#225;ximo recomendado: 6 bot&#245;es.</p>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>T&#237;tulo</th><th>URL</th><th>&#205;cone</th><th>A&#231;&#245;es</th></tr></thead>
      <tbody>${estado.itens.length ? estado.itens.map(a => `
        <tr>
          <td><strong title="${escHtml(a.titulo)}">${escHtml(a.titulo)}</strong></td>
          <td><div class="td-truncate td-truncate--curto"><a href="${escHtml(escUrl(a.url))}" target="_blank" style="color:var(--accent)">${escHtml(a.url)}</a></div></td>
          <td>${escHtml(a.icone)}</td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('acessoRapido', a)}
            <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-acesso" data-id="${a.id}" title="Editar" aria-label="Editar ${escHtml(a.titulo)}"><i class="ph-bold ph-pencil"></i></button>
            <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(a.titulo)}" data-acao="confirmar-delecao" data-colecao="acessoRapido" data-id="${a.id}" title="Excluir" aria-label="Excluir ${escHtml(a.titulo)}"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('') : `
        <tr><td colspan="4" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum atalho encontrado para o filtro informado.</td></tr>`}
      </tbody>
    </table></div>`);
}


/* ============================================================
   INFO SIMPLES (infoJuridico, infoMunicipio) — edição de campos
   ============================================================ */
function formAcesso(a = {}) {
  return modalV2HTML(`${a.id ? 'Editar' : 'Novo'} Acesso Rápido`, `
    ${secaoV2('Identificação', `
      <div class="form-grid">
        <div class="form-group full"><label>Título</label><input id="ac-titulo" value="${escHtml(a.titulo||'')}" /></div>
        <div class="form-group full"><label>URL</label><input id="ac-url" value="${escHtml(a.url||'')}" placeholder="https://..." /></div>
      </div>`, 'Como o atalho aparece no app')}

    ${secaoV2('Aparência', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Ícone e cor do botão</label>
          ${iconPickerCompactoHTML(a.icone, a.cor, 'acesso')}
        </div>
      </div>`, 'Ícone e destaque do atalho')}`,
    publishFooterHTML('acesso', a), a);
}

function novoAcesso()     { abrirModalV2(formAcesso()); }
function editarAcesso(id) { const a = DB.getById('acessoRapido', id); abrirModalV2(formAcesso(a), a); }

async function salvarAcesso(id) {
  const { icone, cor } = getIconeCorValues('acesso');
  const dados = {
    titulo:  document.getElementById('ac-titulo').value.trim(),
    url:     document.getElementById('ac-url').value.trim(),
    icone,
    cor,
    coringa: false,
    publish_status: getModalPublishStatus(),
  };
  if (!validarObrigatorioV2('ac-titulo', 'Informe o título do atalho.')) return;
  if (!(await salvarComFeedback('acessoRapido', id, dados))) return;
  fecharModal(); toast('Acesso rápido salvo.'); renderAcessoRapido();
}

function renderInfoSimples(colecao, titulo, heading) {
  INFO_SIMPLES_HEADINGS[colecao] = heading;
  getInfoSimplesController(colecao).setItems(DB.get(colecao));
}

function pintarInfoSimples(colecao, estado, heading) {
  renderAdminSectionWithTableAnimation(document.getElementById('section-' + colecao), `
    <div class="admin-section-header">
      <h1 class="admin-section-title">${heading}</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="infosimples-search-${colecao}" value="${escHtml(estado.query)}" data-acao="buscar-info-simples" data-colecao="${colecao}" placeholder="Buscar por titulo ou campos..." style="width:300px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem" />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-info-simples" data-colecao="${colecao}" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-info-simples" data-colecao="${colecao}" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-info-simples" data-colecao="${colecao}"><i class="ph-bold ph-plus"></i> Novo bloco</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>T&#237;tulo</th><th>Campos</th><th>A&#231;&#245;es</th></tr></thead>
      <tbody>${estado.itens.length ? estado.itens.map(item => `
        <tr>
          <td><strong title="${escHtml(item.titulo)}">${escHtml(item.titulo)}</strong></td>
          <td>${(item.campos||[]).length} campos</td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl(colecao, item)}
            <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-info-simples" data-colecao="${colecao}" data-id="${item.id}" title="Editar" aria-label="Editar ${escHtml(item.titulo)}"><i class="ph-bold ph-pencil"></i></button>
            <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(item.titulo)}" data-acao="confirmar-delecao" data-colecao="${colecao}" data-id="${item.id}" title="Excluir" aria-label="Excluir ${escHtml(item.titulo)}"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('') : `
        <tr><td colspan="3" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum bloco encontrado para o filtro informado.</td></tr>`}
      </tbody>
    </table></div>`);
}
function formInfoSimples(colecao, item = {}) {
  const camposHTML = (item.campos || []).map((c, i) => `
    <div class="dyn-item" style="gap:6px">
      <input class="js-campo-label" name="campo_label_${i}" value="${escHtml(c.label)}" placeholder="Label..." style="width:40%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
      <input class="js-campo-valor js-valor-input" name="campo_valor_${i}" value="${escHtml(c.valor)}" placeholder="Valor..." style="${c.full_width || c.fullWidth || c.linha_inteira ? 'display:none;' : ''}flex:1;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
      <textarea class="js-campo-valor-multi js-valor-textarea" placeholder="Valor..." style="${c.full_width || c.fullWidth || c.linha_inteira ? '' : 'display:none;'}flex:1;min-height:72px;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none;resize:vertical">${escHtml(c.valor)}</textarea>
      <label style="display:flex;align-items:center;gap:6px;font-size:.74rem;color:var(--text-muted);white-space:nowrap"><input type="checkbox" class="js-campo-full" data-acao="toggle-dyn-valor" ${c.full_width || c.fullWidth || c.linha_inteira ? 'checked' : ''} /> Linha inteira</label>
      <button type="button" class="dyn-remove" data-acao="remover-dyn-item"><i class="ph-bold ph-minus"></i></button>
    </div>`).join('');

  return modalV2HTML(`${item.id ? 'Editar' : 'Novo'} Bloco`, `
    ${secaoV2('Identificação', `
      <div class="form-grid">
        <div class="form-group full"><label>Título do bloco</label><input id="info-titulo" value="${escHtml(item.titulo||'')}" /></div>
        <div class="form-group full">
          <label>Badge <span style="font-weight:400;color:var(--text-muted)">(etiqueta no painel de detalhes)</span></label>
            <input id="info-badge" value="${escHtml(item.badge||item.tag||'')}" placeholder="Ex: SMADER, Município, Prefeitura..." />
          <span class="form-hint">Aparece como etiqueta colorida no topo do painel de detalhes.</span>
        </div>
      </div>`, 'Título e etiqueta')}

    ${secaoV2('Aparência', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Ícone e cor do card</label>
          ${iconPickerCompactoHTML(item.icone, item.cor, 'info')}
        </div>
      </div>`, 'Ícone e destaque do card')}

    ${secaoV2('Conteúdo', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Campos (label → valor)</label>
          <div class="dyn-list" id="dyn-campos">${camposHTML}</div>
          <button type="button" class="dyn-add" data-acao="add-campo"><i class="ph-bold ph-plus"></i> Adicionar campo</button>
        </div>
      </div>`, 'Cada linha vira uma informação no app')}`,
    publishFooterHTML('infoSimples', item, { colecao }), item);
}

function addCampo() {
  const list = document.getElementById('dyn-campos');
  const i = list.children.length;
  const div = document.createElement('div');
  div.className = 'dyn-item';
  div.style.gap = '6px';
  div.innerHTML = `
    <input class="js-campo-label" name="campo_label_${i}" placeholder="Label..." style="width:40%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
    <input class="js-campo-valor js-valor-input" name="campo_valor_${i}" placeholder="Valor..." style="flex:1;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
    <textarea class="js-campo-valor-multi js-valor-textarea" placeholder="Valor..." style="display:none;flex:1;min-height:72px;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none;resize:vertical"></textarea>
    <label style="display:flex;align-items:center;gap:6px;font-size:.74rem;color:var(--text-muted);white-space:nowrap"><input type="checkbox" class="js-campo-full" data-acao="toggle-dyn-valor" /> Linha inteira</label>
    <button type="button" class="dyn-remove" data-acao="remover-dyn-item"><i class="ph-bold ph-minus"></i></button>`;
  list.appendChild(div);
}

function toggleDynValorInput(checkboxEl) {
  const row = checkboxEl?.closest('.dyn-item');
  if (!row) return;
  const input = row.querySelector('.js-valor-input');
  const textarea = row.querySelector('.js-valor-textarea');
  if (!input || !textarea) return;
  if (checkboxEl.checked) {
    textarea.value = input.value || textarea.value || '';
    input.style.display = 'none';
    textarea.style.display = '';
  } else {
    input.value = textarea.value || input.value || '';
    textarea.style.display = 'none';
    input.style.display = '';
  }
}

function novoInfoSimples(colecao)    { abrirModalV2(formInfoSimples(colecao)); }
function editarInfoSimples(col, id)  { const item = DB.getById(col, id); abrirModalV2(formInfoSimples(col, item), item); }

async function salvarInfoSimples(colecao, id) {
  const list = document.getElementById('dyn-campos');
  const campos = Array.from(list.children).map(div => {
    const label = div.querySelector('.js-campo-label')?.value.trim() || '';
    const fullWidth = !!div.querySelector('.js-campo-full')?.checked;
    const valor = fullWidth
      ? (div.querySelector('.js-campo-valor-multi')?.value.trim() || '')
      : (div.querySelector('.js-campo-valor')?.value.trim() || '');
    return {
      label,
      valor,
      ...(fullWidth ? { full_width: true } : {}),
    };
  }).filter(c => c.label || c.valor);

  const badge = document.getElementById('info-badge').value.trim();
  const { icone, cor } = getIconeCorValues('info');
  const dados = {
    titulo: document.getElementById('info-titulo').value.trim(),
    campos,
    badge,
    tag: badge,
    icone, cor,
    publish_status: getModalPublishStatus(),
  };
  if (!validarObrigatorioV2('info-titulo', 'Informe o título do bloco.')) return;
  if (!(await salvarComFeedback(colecao, id, dados))) return;
  fecharModal(); toast('Bloco salvo.');
  renderInfoSimples(colecao, '', colecao === 'infoJuridico' ? 'Informações da Secretaria' : 'Informações do Município');
}

/* ============================================================
   ÓRGÃOS EXTERNOS
   ============================================================ */
function renderInfoOrgaos() {
  INFO_ORGAOS_LISTA.setItems(DB.get('infoOrgaos'));
}

function pintarInfoOrgaos(estado) {
  renderAdminSectionWithTableAnimation(document.getElementById('section-infoOrgaos'), `
    <div class="admin-section-header">
      <h1 class="admin-section-title">&#211;rg&#227;os Externos</h1>
      <div class="admin-section-header-spacer"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="orgaos-search" value="${escHtml(estado.query)}" data-acao="buscar-info-orgaos" placeholder="Buscar por sigla, nome ou campos..." style="width:320px;max-width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.82rem" />
        <span class="badge">${estado.total} de ${estado.totalColecao}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-info-orgaos" data-delta="-1" ${estado.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
        <span style="font-size:.8rem;color:var(--text-muted);min-width:95px;text-align:center">Pagina ${estado.pagina} de ${estado.totalPaginas}</span>
        <button class="btn btn-ghost btn-sm" data-acao="pagina-info-orgaos" data-delta="1" ${estado.pagina >= estado.totalPaginas ? 'disabled' : ''}>Proxima</button>
      </div>
      <button class="btn btn-primary" data-acao="novo-orgao"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>T&#237;tulo (sigla)</th><th>Nome completo</th><th>Campos</th><th>A&#231;&#245;es</th></tr></thead>
      <tbody>${estado.itens.length ? estado.itens.map(o => `
        <tr>
          <td><strong title="${escHtml(o.titulo)}">${escHtml(o.titulo)}</strong></td>
          <td><div class="td-truncate" title="${escHtml(o.nome_completo)}">${escHtml(o.nome_completo)}</div></td>
          <td>${(o.campos||[]).length}</td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('infoOrgaos', o)}
            <button class="btn btn-ghost btn-sm btn-icon" data-acao="editar-orgao" data-id="${o.id}" title="Editar" aria-label="Editar ${escHtml(o.titulo)}"><i class="ph-bold ph-pencil"></i></button>
            <button class="btn btn-danger btn-sm btn-icon" data-nome="${escHtml(o.titulo)}" data-acao="confirmar-delecao" data-colecao="infoOrgaos" data-id="${o.id}" title="Excluir" aria-label="Excluir ${escHtml(o.titulo)}"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('') : `
        <tr><td colspan="4" style="padding:14px;color:var(--text-muted);text-align:center">Nenhum orgao encontrado para o filtro informado.</td></tr>`}
      </tbody>
    </table></div>`);
}
function formOrgao(o = {}) {
  const camposHTML = (o.campos || []).map((c, i) => `
    <div class="dyn-item" style="gap:6px">
      <input class="js-org-label" name="oc_label_${i}" value="${escHtml(c.label)}" placeholder="Label..." style="width:35%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
      <input class="js-org-valor js-valor-input" name="oc_valor_${i}" value="${escHtml(c.valor)}" placeholder="Valor..." style="${c.full_width || c.fullWidth || c.linha_inteira ? 'display:none;' : ''}flex:1;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
      <textarea class="js-org-valor-multi js-valor-textarea" placeholder="Valor..." style="${c.full_width || c.fullWidth || c.linha_inteira ? '' : 'display:none;'}flex:1;min-height:72px;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none;resize:vertical">${escHtml(c.valor)}</textarea>
      <label style="display:flex;align-items:center;gap:6px;font-size:.74rem;color:var(--text-muted);white-space:nowrap"><input type="checkbox" class="js-org-full" data-acao="toggle-dyn-valor" ${c.full_width || c.fullWidth || c.linha_inteira ? 'checked' : ''} /> Linha inteira</label>
      <button type="button" class="dyn-remove" data-acao="remover-dyn-item"><i class="ph-bold ph-minus"></i></button>
    </div>`).join('');

  return modalV2HTML(`${o.id ? 'Editar' : 'Novo'} Órgão`, `
    ${secaoV2('Identificação', `
      <div class="form-grid">
        <div class="form-group"><label>Título / Sigla</label><input id="org-titulo" value="${escHtml(o.titulo||'')}" /></div>
        <div class="form-group full"><label>Nome completo</label><input id="org-nome-completo" value="${escHtml(o.nome_completo||'')}" /></div>
        <div class="form-group full"><label>Atribuição</label><textarea id="org-atribuicao">${escHtml(o.atribuicao||'')}</textarea></div>
      </div>`, 'Sigla, nome e o que o órgão faz')}

    ${secaoV2('Aparência', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Ícone e cor do card</label>
          ${iconPickerCompactoHTML(o.icone, o.cor, 'orgao')}
        </div>
      </div>`, 'Ícone e destaque do card')}

    ${secaoV2('Contato', `
      <div class="form-grid">
        <div class="form-group full">
          <label>Campos de contato</label>
          <div class="dyn-list" id="dyn-orgcampos">${camposHTML}</div>
          <button type="button" class="dyn-add" data-acao="add-org-campo"><i class="ph-bold ph-plus"></i> Adicionar campo</button>
        </div>
      </div>`, 'Telefone, e-mail, endereço...')}`,
    publishFooterHTML('orgao', o), o);
}

function addOrgCampo() {
  const list = document.getElementById('dyn-orgcampos');
  const i = list.children.length;
  const div = document.createElement('div');
  div.className = 'dyn-item'; div.style.gap = '6px';
  div.innerHTML = `
    <input class="js-org-label" name="oc_label_${i}" placeholder="Label..." style="width:35%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
    <input class="js-org-valor js-valor-input" name="oc_valor_${i}" placeholder="Valor..." style="flex:1;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
    <textarea class="js-org-valor-multi js-valor-textarea" placeholder="Valor..." style="display:none;flex:1;min-height:72px;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none;resize:vertical"></textarea>
    <label style="display:flex;align-items:center;gap:6px;font-size:.74rem;color:var(--text-muted);white-space:nowrap"><input type="checkbox" class="js-org-full" data-acao="toggle-dyn-valor" /> Linha inteira</label>
    <button type="button" class="dyn-remove" data-acao="remover-dyn-item"><i class="ph-bold ph-minus"></i></button>`;
  list.appendChild(div);
}

function novoOrgao()     { abrirModalV2(formOrgao()); }
function editarOrgao(id) { const o = DB.getById('infoOrgaos', id); abrirModalV2(formOrgao(o), o); }

async function salvarOrgao(id) {
  const list = document.getElementById('dyn-orgcampos');
  const campos = Array.from(list.children).map(div => {
    const label = div.querySelector('.js-org-label')?.value.trim() || '';
    const fullWidth = !!div.querySelector('.js-org-full')?.checked;
    const valor = fullWidth
      ? (div.querySelector('.js-org-valor-multi')?.value.trim() || '')
      : (div.querySelector('.js-org-valor')?.value.trim() || '');
    return {
      label,
      valor,
      ...(fullWidth ? { full_width: true } : {}),
    };
  }).filter(c => c.label || c.valor);

  const { icone, cor } = getIconeCorValues('orgao');
  const dados = {
    titulo:        document.getElementById('org-titulo').value.trim(),
    nome_completo: document.getElementById('org-nome-completo').value.trim(),
    atribuicao:    document.getElementById('org-atribuicao').value.trim(),
    campos,
    icone, cor,
    publish_status: getModalPublishStatus(),
  };
  if (!validarObrigatorioV2('org-titulo', 'Informe o título ou a sigla do órgão.')) return;
  if (!(await salvarComFeedback('infoOrgaos', id, dados))) return;
  fecharModal(); toast('Órgão salvo.'); renderInfoOrgaos();
}




/* ============================================================
   ACOES DELEGADAS — um unico listener para os templates do admin
   ------------------------------------------------------------
   Os botoes/inputs das tabelas carregam `data-acao` + `data-*` e
   nenhum handler inline e emitido. A acao e resolvida por tabela
   fechada, entao dado de usuario nunca vira codigo executavel.
   ============================================================ */

/* De-para do botao Salvar dos modais: a chave vai em `data-salvar` e os
   dados do registro nos `data-*`. Mantem a tabela fechada (nada de codigo). */
const SALVAR_MODAL = {
  funcionario: salvarFuncionario,
  manual: salvarManual,
  processo: salvarProcesso,
  arquivo: salvarArquivo,
  veiculo: salvarVeiculo,
  sistema: salvarSistema,
  servico: salvarServico,
  aviso: salvarAviso,
  evento: salvarEvento,
  ferias: salvarFerias,
  acesso: salvarAcesso,
  infoSimples: salvarInfoSimples,
  orgao: salvarOrgao,
};

const ACOES_ADMIN_CLIQUE = {
  'pagina-funcionarios': (el) => mudarPaginaFuncionarios(Number(el.dataset.delta)),
  'novo-funcionario': () => novoFuncionario(),
  'editar-funcionario': (el) => editarFuncionario(Number(el.dataset.id)),

  'pagina-manuais': (el) => mudarPaginaManuais(Number(el.dataset.delta)),
  'novo-manual': () => novoManual(),
  'editar-manual': (el) => editarManual(Number(el.dataset.id)),

  'pagina-processos': (el) => mudarPaginaProcessos(Number(el.dataset.delta)),
  'novo-processo': () => novoProcesso(),
  'editar-processo': (el) => editarProcesso(Number(el.dataset.id)),

  'pagina-arquivos': (el) => mudarPaginaArquivos(Number(el.dataset.delta)),
  'novo-arquivo': () => novoArquivo(),
  'editar-arquivo': (el) => editarArquivo(Number(el.dataset.id)),

  'pagina-veiculos': (el) => mudarPaginaVeiculos(Number(el.dataset.delta)),
  'novo-veiculo': () => novoVeiculo(),
  'editar-veiculo': (el) => editarVeiculo(Number(el.dataset.id)),

  'pagina-sistemas': (el) => mudarPaginaSistemas(Number(el.dataset.delta)),
  'novo-sistema': () => novoSistema(),
  'editar-sistema': (el) => editarSistema(Number(el.dataset.id)),

  'pagina-servicos': (el) => mudarPaginaServicos(Number(el.dataset.delta)),
  'novo-servico': () => novoServico(),
  'editar-servico': (el) => editarServico(Number(el.dataset.id)),

  'pagina-avisos': (el) => mudarPaginaAvisos(Number(el.dataset.delta)),
  'novo-aviso': () => novoAviso(),
  'editar-aviso': (el) => editarAviso(Number(el.dataset.id)),

  'pagina-agenda': (el) => mudarPaginaAgenda(Number(el.dataset.delta)),
  'novo-evento': () => novoEvento(),
  'editar-evento': (el) => editarEvento(Number(el.dataset.id)),

  'pagina-escala': (el) => mudarPaginaEscala(Number(el.dataset.delta)),
  'novo-escala': () => novaFerias(),
  'editar-ferias': (el) => editarFerias(Number(el.dataset.id)),

  'pagina-acesso': (el) => mudarPaginaAcesso(Number(el.dataset.delta)),
  'novo-acesso': () => novoAcesso(),
  'editar-acesso': (el) => editarAcesso(Number(el.dataset.id)),

  'pagina-info-simples': (el) => mudarPaginaInfoSimples(el.dataset.colecao, Number(el.dataset.delta)),
  'novo-info-simples': (el) => novoInfoSimples(el.dataset.colecao),
  'editar-info-simples': (el) => editarInfoSimples(el.dataset.colecao, Number(el.dataset.id)),

  'pagina-info-orgaos': (el) => mudarPaginaInfoOrgaos(Number(el.dataset.delta)),
  'novo-orgao': () => novoOrgao(),
  'editar-orgao': (el) => editarOrgao(Number(el.dataset.id)),

  'confirmar-delecao': (el) => confirmarDelecao(el.dataset.colecao, Number(el.dataset.id), el.dataset.nome),

  // Modais e formularios (grupo 3)
  'fechar-modal': () => fecharModal(),
  'executar-delecao': (el) => executarDelecao(el.dataset.colecao, Number(el.dataset.id)),
  'salvar-modal': (el) => {
    const salvar = SALVAR_MODAL[el.dataset.salvar];
    if (!salvar) return;
    const id = Number(el.dataset.id) || 0;
    if (el.dataset.colecao) salvar(el.dataset.colecao, id);
    else salvar(id);
  },
  'remover-dyn-item': (el) => removeDynItem(el),
  'add-dyn-item': (el) => addDynItem(el.dataset.field, el.dataset.placeholder, el.dataset.textarea === 'true'),
  'add-manual-passo': () => addManualPasso(),
  'add-documento': () => addDocumento(),
  'add-etapa': () => addEtapa(),
  'add-servico-documento': () => addServicoDocumento(),
  'add-campo': () => addCampo(),
  'add-org-campo': () => addOrgCampo(),
  'limpar-multi-select': (el) => {
    const alvo = el.dataset.alvo ? document.getElementById(el.dataset.alvo) : el.previousElementSibling;
    clearAdminMultiSelect(alvo);
  },
  'abrir-input-arquivo': (el) => {
    const input = document.getElementById(el.dataset.input);
    if (input) input.click();
  },
  'remover-foto': () => removerFoto(),
  'remover-arquivo-upload': () => removerArquivoUpload(),
  'selecionar-icone': (el) => selecionarIcone(el.dataset.field, el.dataset.valor),
  'selecionar-cor': (el) => selecionarCor(el.dataset.field, el.dataset.valor),
  'toggle-icone-panel': (el) => toggleIconePanel(el.dataset.field),
  'escolher-arquivo-doc': (el) => escolherArquivoDoc(el),
  'limpar-arquivo-doc': (el) => limparArquivoDoc(el),
  'remover-doc-item': (el) => {
    const item = el.closest('.doc-item');
    if (item) item.remove();
    marcarSujoV2();
  },
  'descartar-alteracoes': () => descartarAlteracoes(),
  'salvar-rascunho': () => salvarComoRascunho(),
  'continuar-editando': () => esconderBarraAlteracoes(),

  // Acoes do HTML (grupo 4)
  'fazer-login': () => fazerLogin(),
  'fazer-logout': () => fazerLogout(),
  'exportar-dados': () => DB.exportarDadosJS(),
  'salvar-config-dashboard': () => salvarConfigDashboard(),
};

const ACOES_ADMIN_INPUT = {
  'buscar-funcionarios': (el) => atualizarBuscaFuncionarios(el),
  'buscar-manuais': (el) => atualizarBuscaManuais(el),
  'buscar-processos': (el) => atualizarBuscaProcessos(el),
  'buscar-arquivos': (el) => atualizarBuscaArquivos(el),
  'buscar-veiculos': (el) => atualizarBuscaVeiculos(el),
  'buscar-sistemas': (el) => atualizarBuscaSistemas(el),
  'buscar-servicos': (el) => atualizarBuscaServicos(el),
  'buscar-avisos': (el) => atualizarBuscaAvisos(el),
  'buscar-agenda': (el) => atualizarBuscaAgenda(el),
  'buscar-escala': (el) => atualizarBuscaEscala(el),
  'buscar-acesso': (el) => atualizarBuscaAcesso(el),
  'buscar-info-simples': (el) => atualizarBuscaInfoSimples(el.dataset.colecao, el),
  'buscar-info-orgaos': (el) => atualizarBuscaInfoOrgaos(el),
};

const ACOES_ADMIN_CHANGE = {
  'toggle-publish-inline': (el) => toggleInlinePublishStatus(el.dataset.colecao, Number(el.dataset.id), el.checked),

  // Modais e formularios (grupo 3)
  'toggle-publish-modal': (el) => handlePublishStatusToggle(el),
  'preview-foto': (el) => previewFoto(el),
  'preview-passo-imagem': (el) => previewPassoImagem(el),
  'processar-arquivo-upload': (el) => processarArquivoUpload(el),
  'toggle-doc-tipo': (el) => toggleDocTipo(el),
  'toggle-dyn-valor': (el) => toggleDynValorInput(el),
  'toggle-evento-tipo': () => toggleEventoTipoFields(),
  'toggle-servico-categoria': () => toggleServicoCategoriaOutro(),
  'preencher-dados-func': () => preencherDadosFunc(),
};

function despacharAcaoAdmin(evento, tabela) {
  const alvo = evento.target && typeof evento.target.closest === 'function'
    ? evento.target.closest('[data-acao]')
    : null;
  if (!alvo || alvo.disabled) return;
  const acao = tabela[alvo.dataset.acao];
  if (acao) acao(alvo, evento);
}

function initAcoesDelegadasAdmin() {
  document.addEventListener('click', (evento) => despacharAcaoAdmin(evento, ACOES_ADMIN_CLIQUE));
  document.addEventListener('input', (evento) => despacharAcaoAdmin(evento, ACOES_ADMIN_INPUT));
  document.addEventListener('change', (evento) => despacharAcaoAdmin(evento, ACOES_ADMIN_CHANGE));
}

initAcoesDelegadasAdmin();
