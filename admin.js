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
    atualizarStatusBanco();
    window.addEventListener('db:status-changed', handleDbStatusChanged);
    if (await DB.isAdminLoggedIn()) {
      mostrarAdmin();
      initAdmin();
      return;
    }
    mostrarLogin();
  });
});

/* ============================================================
   INICIALIZAÇÃO DO ADMIN
   ============================================================ */
function initAdmin() {
  atualizarStatusBanco();
  initNav();
  renderOverview();
}

let ultimoStatusBanco = null;

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

  if (header && headerText) {
    header.classList.remove('is-ok', 'is-warn', 'is-offline');
    if (status.provider === 'supabase' && status.writesReachSupabase) {
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
function renderSection(key) {
  switch (key) {
    case 'overview':       renderOverview(); break;
    case 'funcionarios':   renderFuncionarios(); break;
    case 'manuais':        renderManuais(); break;
    case 'processos':      renderProcessos(); break;
    case 'arquivos':       renderArquivos(); break;
    case 'veiculos':       renderVeiculos(); break;
    case 'sistemas':       renderSistemas(); break;
    case 'servicos':       renderServicos(); break;
    case 'avisos':         renderAvisos(); break;
    case 'agendaEventos':  renderAgendaEventos(); break;
    case 'escalaFerias':   renderEscalaFerias(); break;
    case 'acessoRapido':   renderAcessoRapido(); break;
    case 'infoJuridico':   renderInfoSimples('infoJuridico', 'Secretaria', 'Informações da Secretaria'); break;
    case 'infoMunicipio':  renderInfoSimples('infoMunicipio', 'Município e Prefeitura', 'Informações do Município'); break;
    case 'infoOrgaos':     renderInfoOrgaos(); break;
    case 'configuracoes':  carregarConfigDashboard(); break;
  }
}

function carregarConfigDashboard() {
  const select = document.getElementById('config-instagram-position');
  if (!select) return;
  const config = DB.getLayoutConfig ? DB.getLayoutConfig() : {};
  select.value = config.instagramPosition || 'belowQuickAccess';
}

function salvarConfigDashboard() {
  const select = document.getElementById('config-instagram-position');
  if (!select || !DB.updateLayoutConfig) return;
  DB.updateLayoutConfig({ instagramPosition: select.value });
  toast('Configuração do dashboard salva.');
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

let _modalCloseOnBackdrop = false;

function abrirModal(html, options = {}) {
  _modalCloseOnBackdrop = !!options.closeOnBackdrop;
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal').classList.add('open');
}

function fecharModal() {
  _modalCloseOnBackdrop = false;
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modal-content').innerHTML = '';
}

document.getElementById('modal').addEventListener('click', (e) => {
  if (_modalCloseOnBackdrop && e.target === document.getElementById('modal')) fecharModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharModal();
});

function confirmarDelecao(colecao, id, nome, callback) {
  abrirModal(`
    <h2 class="modal-title">Confirmar exclusão</h2>
    <div class="confirm-box">
      <p class="confirm-msg">Tem certeza que deseja excluir <strong>${escHtml(nome)}</strong>? Esta ação não pode ser desfeita.</p>
      <div class="confirm-actions">
        <button class="btn btn-ghost" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-danger" onclick="executarDelecao('${colecao}',${id})">
          <i class="ph-bold ph-trash"></i> Excluir
        </button>
      </div>
    </div>
  `);
}

function executarDelecao(colecao, id) {
  DB.delete(colecao, id);
  fecharModal();
  toast('Registro excluído com sucesso.');
  renderSection(colecao);
  renderOverview();
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

function renderPublishStatusActions(saveAction, item = {}) {
  const publishStatus = item.publish_status === 'draft' ? 'draft' : 'published';
  const isPublished = publishStatus === 'published';
  return `
    <div class="modal-actions-row">
      <div class="publish-status-control">
        <span class="publish-status-text" id="publish-status-label">${isPublished ? 'Publicado' : 'Rascunho'}</span>
        <label class="publish-status-switch" title="Alternar entre rascunho e publicado">
          <input
            type="checkbox"
            id="publish-status-toggle"
            ${isPublished ? 'checked' : ''}
            onchange="handlePublishStatusToggle(this)"
          />
          <span class="publish-status-slider"></span>
        </label>
      </div>
      <div class="modal-actions-buttons">
        <button class="btn btn-ghost" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="${saveAction}"><i class="ph-bold ph-floppy-disk"></i> Salvar</button>
      </div>
    </div>`;
}

function renderInlinePublishStatusControl(colecao, item = {}) {
  const publishStatus = item.publish_status === 'draft' ? 'draft' : 'published';
  const isPublished = publishStatus === 'published';
  return `
    <label class="inline-publish-toggle" title="${isPublished ? 'Publicado' : 'Rascunho'}">
      <span class="inline-publish-toggle__label">${isPublished ? 'Publicado' : 'Rascunho'}</span>
      <span class="inline-publish-toggle__switch">
        <input
          type="checkbox"
          ${isPublished ? 'checked' : ''}
          onchange="toggleInlinePublishStatus('${colecao}', ${item.id}, this.checked)"
        />
        <span class="inline-publish-toggle__slider"></span>
      </span>
    </label>`;
}

function toggleInlinePublishStatus(colecao, id, checked) {
  const publishStatus = checked ? 'published' : 'draft';
  const atualizado = DB.update(colecao, id, { publish_status: publishStatus });
  if (!atualizado) {
    toast('Nao foi possivel atualizar o status de publicacao.', 'error');
    renderSection(colecao);
    return;
  }
  setTimeout(() => {
    renderSection(colecao);
    renderOverview();
  }, 220);
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
          <button type="button" class="dyn-remove" onclick="removeDynItem(this)"><i class="ph-bold ph-minus"></i></button>
        </div>
      `).join('')}
    </div>
    <button type="button" class="dyn-add" onclick="addDynItem('${fieldName}','${escHtml(placeholder)}',${isTextarea})">
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
          <button type="button" class="dyn-remove" onclick="removeDynItem(this)"><i class="ph-bold ph-minus"></i></button>
        </div>
      `).join('')}
    </div>
    <button type="button" class="dyn-add" onclick="addDynItem('${fieldName}','${escHtml(placeholder)}',false)">
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
    div.innerHTML = `<textarea name="${fieldName}_${i}" rows="2" placeholder="${escHtml(placeholder)}"></textarea><button type="button" class="dyn-remove" onclick="removeDynItem(this)"><i class="ph-bold ph-minus"></i></button>`;
  } else {
    div.innerHTML = `<input name="${fieldName}_${i}" placeholder="${escHtml(placeholder)}" /><button type="button" class="dyn-remove" onclick="removeDynItem(this)"><i class="ph-bold ph-minus"></i></button>`;
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
  'contrato', 'decreto', 'documentação', 'financeiro', 'formulário',
  'manual', 'modelo', 'ofício', 'planilha',
  'portaria', 'rh', 'relatório', 'veículos'
];

// Renderiza checkboxes de tags fixas (substitui o input livre)
function tagsInputHTML(tags, fieldName) {
  const selecionadas = tags || [];
  const tagsOrdenadas = [...TAGS_ARQUIVO, 'outro'];
  return `
    <div class="arquivo-tags-checkboxes" id="tags-wrap-${fieldName}">
      ${tagsOrdenadas.map(tag => `
        <label class="tag-checkbox-label">
          <input type="checkbox" value="${tag}" ${selecionadas.includes(tag) ? 'checked' : ''} />
          <span class="tag-checkbox-bullet"></span>
          <span class="tag-checkbox-text">${tag.charAt(0).toUpperCase() + tag.slice(1)}</span>
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
              onclick="selecionarIcone('${fieldId}','${o.icone}')"
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
              style="background:${c}"
              onclick="selecionarCor('${fieldId}','${c}')">
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
  // Atualiza preview
  document.getElementById('icon-preview-' + fieldId).innerHTML = `<i class="ph-bold ${icone}"></i>`;
  // Atualiza botões do grid
  document.querySelectorAll(`#icon-picker-${fieldId} .icon-opt`).forEach(btn => {
    const isActive = btn.querySelector('i').classList.contains(icone);
    btn.classList.toggle('active', isActive);
    btn.style.background = isActive ? `color-mix(in srgb,${cor} 18%,transparent)` : '';
    btn.style.color      = isActive ? cor : '';
    btn.style.borderColor = isActive ? cor : '';
  });
}

function selecionarCor(fieldId, cor) {
  const icone = document.getElementById('icon-val-' + fieldId).value;
  document.getElementById('cor-val-' + fieldId).value = cor;
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
  const lista = DB.get('funcionarios');
  const sec = document.getElementById('section-funcionarios');
  sec.innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Funcionários</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoFuncionario()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap">
      <table>
        <thead><tr><th>Nome</th><th>Cargo</th><th>Lotação</th><th>Departamento</th><th>Ações</th></tr></thead>
        <tbody>
          ${lista.map(f => `
            <tr>
              <td><strong>${escHtml(f.nome)}</strong></td>
              <td>${escHtml(f.cargo)}</td>
              <td>${escHtml(f.lotacao || f.setor || '')}</td>
              <td>${escHtml(f.departamento || '')}</td>
              <td><div class="td-actions td-actions--with-status">
                ${renderInlinePublishStatusControl('funcionarios', f)}
                <button class="btn btn-ghost btn-sm" onclick="editarFuncionario(${f.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
                <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('funcionarios',${f.id},'${escHtml(f.nome)}')"><i class="ph-bold ph-trash"></i></button>
              </div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function formFuncionario(f = {}) {
  const fotoPreview = f.foto
    ? `<img src="${escHtml(f.foto)}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--border);margin-bottom:8px" />`
    : `<div style="width:80px;height:80px;border-radius:50%;background:var(--surface-2);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:1.8rem;margin-bottom:8px"><i class="ph-bold ph-user"></i></div>`;

  return `
    <h2 class="modal-title">${f.id ? 'Editar' : 'Novo'} Funcionário</h2>
    <div class="form-grid">
      <div class="form-group full" style="align-items:center">
        <label>Foto do funcionário</label>
        <div id="foto-preview">${fotoPreview}</div>
        <input type="file" id="f-foto-file" accept="image/*" style="display:none" onchange="previewFoto(this)" />
        <input type="hidden" id="f-foto" value="${escHtml(f.foto||'')}" />
        <div style="display:flex;gap:8px;margin-top:4px">
          <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('f-foto-file').click()">
            <i class="ph-bold ph-upload-simple"></i> Escolher foto
          </button>
          ${f.foto ? `<button type="button" class="btn btn-danger btn-sm" onclick="removerFoto()"><i class="ph-bold ph-trash"></i> Remover</button>` : ''}
        </div>
        <span class="form-hint">JPG, PNG ou WebP. Recomendado: até 500kb.</span>
      </div>
      <div class="form-group full"><label>Nome completo</label><input id="f-nome" value="${escHtml(f.nome||'')}" /></div>
      <div class="form-group"><label>Matrícula</label><input id="f-matricula" value="${escHtml(f.matricula||'')}" /></div>
      <div class="form-group"><label>Cargo</label><input id="f-cargo" value="${escHtml(f.cargo||'')}" /></div>
      <div class="form-group"><label>Lotação</label><input id="f-lotacao" value="${escHtml(f.lotacao||f.setor||'')}" /></div>
      <div class="form-group"><label>Vínculo</label><input id="f-vinculo" value="${escHtml(f.vinculo||'')}" /></div>
      <div class="form-group"><label>Órgão</label><input id="f-orgao" value="${escHtml(f.orgao||'')}" /></div>
      <div class="form-group"><label>Data de admissão</label><input type="date" id="f-data-admissao" value="${escHtml(f.data_admissao||'')}" /></div>
      <div class="form-group"><label>Telefone</label><input id="f-telefone" value="${escHtml(f.telefone||'')}" /></div>
      <div class="form-group"><label>E-mail</label><input id="f-email" value="${escHtml(f.email||'')}" /></div>
      <div class="form-group"><label>CPF</label><input id="f-cpf" value="${escHtml(f.cpf||'')}" /></div>
      <div class="form-group"><label>Departamento</label><input id="f-departamento" value="${escHtml(f.departamento||'')}" /></div>
      <div class="form-group full"><label>Descrição (o que essa pessoa faz)</label><textarea id="f-descricao">${escHtml(f.descricao||'')}</textarea></div>
    </div>
    ${renderPublishStatusActions(`salvarFuncionario(${f.id||0})`, f)}
  `;
}

/** Lê o arquivo de imagem e converte para base64, exibindo preview */
function previewFoto(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) {
    toast('Imagem muito grande. Use uma imagem menor que 1MB.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    document.getElementById('f-foto').value = base64;
    document.getElementById('foto-preview').innerHTML = `
      <img src="${base64}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);margin-bottom:8px" />`;
  };
  reader.readAsDataURL(file);
}

function removerFoto() {
  document.getElementById('f-foto').value = '';
  document.getElementById('foto-preview').innerHTML = `
    <div style="width:80px;height:80px;border-radius:50%;background:var(--surface-2);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:1.8rem;margin-bottom:8px"><i class="ph-bold ph-user"></i></div>`;
}

function novoFuncionario()    { abrirModal(formFuncionario()); }
function editarFuncionario(id){ abrirModal(formFuncionario(DB.getById('funcionarios', id))); }

function salvarFuncionario(id) {
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
    foto:          document.getElementById('f-foto').value,
    descricao:     document.getElementById('f-descricao').value.trim(),
    publish_status: getModalPublishStatus(),
  };
  if (!dados.nome) { toast('Nome é obrigatório.','error'); return; }
  id ? DB.update('funcionarios', id, dados) : DB.insert('funcionarios', dados);
  fecharModal();
  toast('Funcionário salvo com sucesso.');
  renderFuncionarios();
  renderOverview();
}

/* ============================================================
   MANUAIS
   ============================================================ */
function renderManuais() {
  const lista = DB.get('manuais');
  const sec = document.getElementById('section-manuais');
  sec.innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Manuais</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoManual()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap">
      <table>
        <thead><tr><th>Título</th><th>Categoria</th><th>Passos</th><th>Ações</th></tr></thead>
        <tbody>
          ${lista.map(m => `
            <tr>
              <td><strong class="td-truncate">${escHtml(m.titulo)}</strong></td>
              <td><span class="badge">${escHtml(m.categoria)}</span></td>
              <td>${(m.passos||[]).length}</td>
              <td><div class="td-actions td-actions--with-status">
                ${renderInlinePublishStatusControl('manuais', m)}
                <button class="btn btn-ghost btn-sm" onclick="editarManual(${m.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
                <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('manuais',${m.id},'${escHtml(m.titulo)}')"><i class="ph-bold ph-trash"></i></button>
              </div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function formManual(m = {}) {
  const passosHTML = (m.passos || []).map((p, i) => {
    const texto = typeof p === 'string' ? p : p.texto;
    const imagem = typeof p === 'object' ? p.imagem : '';
    return `
      <div class="dyn-item" style="flex-direction:column;gap:8px;padding:12px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div style="display:flex;gap:8px;width:100%">
          <div style="flex:1">
            <label style="font-size:0.65rem;margin-bottom:4px;display:block">TEXTO DO PASSO ${i+1}</label>
            <textarea name="passo_texto_${i}" placeholder="Descreva o passo..." rows="2" style="width:100%">${escHtml(texto)}</textarea>
          </div>
          <button type="button" class="dyn-remove" onclick="removeDynItem(this.closest('.dyn-item'))" style="align-self:flex-start"><i class="ph-bold ph-trash"></i></button>
        </div>
        <div style="width:100%">
          <label style="font-size:0.65rem;margin-bottom:4px;display:block">IMAGEM (OPCIONAL)</label>
          <div style="display:flex;gap:10px;align-items:center">
            <div class="passo-img-preview" style="width:60px;height:40px;background:var(--surface-2);border:1px solid var(--border);border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center">
              ${imagem ? `<img src="${imagem}" style="width:100%;height:100%;object-fit:cover" />` : `<i class="ph ph-image" style="opacity:0.3"></i>`}
            </div>
            <input type="file" accept="image/*" onchange="previewPassoImagem(this)" style="font-size:0.7rem;flex:1" />
            <input type="hidden" name="passo_imagem_${i}" value="${escHtml(imagem)}" />
          </div>
        </div>
      </div>`;
  }).join('');

  // Gera HTML dos documentos existentes (texto ou vinculado a arquivo)
  const docsList = m.documentos || [];
  const docsHTML = docsList.map((d, i) => {
    const isObj = typeof d === 'object' && d !== null;
    const nome = isObj ? d.nome : d;
    const arquivoId = isObj ? d.arquivo_id : null;
    const isVinculado = arquivoId !== null && arquivoId !== undefined;
    return `
      <div class="dyn-item doc-item" style="flex-direction:column;gap:6px;padding:10px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div style="display:flex;gap:8px;align-items:center">
          <select name="doc_tipo_${i}" class="doc-tipo-select" onchange="toggleDocTipo(this)" style="width:120px;padding:6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem">
            <option value="texto" ${!isVinculado ? 'selected' : ''}>Texto</option>
            <option value="arquivo" ${isVinculado ? 'selected' : ''}>Arquivo</option>
          </select>
          <input name="doc_nome_${i}" value="${escHtml(nome)}" placeholder="Nome do documento..." style="flex:1;padding:6px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem" ${isVinculado ? 'disabled' : ''} class="doc-nome-input" />
          <button type="button" class="dyn-remove" onclick="removeDynItem(this.closest('.dyn-item'))"><i class="ph-bold ph-minus"></i></button>
        </div>
        <div class="doc-arquivo-selector" style="display:${isVinculado ? 'flex' : 'none'};gap:8px;align-items:center">
          <label style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap">Vincular:</label>
          <select name="doc_arquivo_${i}" style="flex:1;padding:6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem">
            <option value="">Selecione um arquivo...</option>
            ${getArquivosOptions(arquivoId)}
          </select>
        </div>
      </div>`;
  }).join('');

  const html = `
    <h2 class="modal-title">${m.id ? 'Editar' : 'Novo'} Manual</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Título</label><input id="m-titulo" value="${escHtml(m.titulo||'')}" /></div>
      <div class="form-group full"><label>Categoria</label><input id="m-categoria" value="${escHtml(m.categoria||'')}" placeholder="Ex: Administrativo, Técnico..." /></div>
      <div class="form-group full">
        <label>Ícone e cor do card</label>
        ${iconPickerHTML(m.icone, m.cor, 'manual')}
      </div>
      <div class="form-group full">
        <label>Passos (Texto + Imagem)</label>
        <div class="dyn-list" id="dyn-passos">${passosHTML}</div>
        <button type="button" class="dyn-add" onclick="addManualPasso()"><i class="ph-bold ph-plus"></i> Adicionar passo</button>
      </div>
      <div class="form-group full">
        <label>Documentos necessários</label>
        <div class="dyn-list" id="dyn-documentos">${docsHTML}</div>
        <button type="button" class="dyn-add" onclick="addDocumento()"><i class="ph-bold ph-plus"></i> Adicionar documento</button>
        <p class="form-hint" style="margin-top:8px">Escolha "Texto" para digitar manualmente ou "Arquivo" para vincular um arquivo já cadastrado.</p>
      </div>
      <div class="form-group full"><label>Observações</label><textarea id="m-observacoes">${escHtml(m.observacoes||'')}</textarea></div>
    </div>
    ${renderPublishStatusActions(`salvarManual(${m.id||0})`, m)}
  `;
  return html;
}

function getArquivosOptions(selectedId) {
  const arquivos = DB.get ? DB.get('arquivos') : [];
  const selectedIds = Array.isArray(selectedId)
    ? selectedId
    : (selectedId ? [selectedId] : []);
  return arquivos.map(a => {
    const label = withDraftSuffix(`${a.nome} (${a.tipo})`, a);
    return `<option value="${a.id}" ${isSelectedOptionValue(selectedIds, a.id) ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
}

function addDocumento() {
  const list = document.getElementById('dyn-documentos');
  const i = list.children.length;
  const div = document.createElement('div');
  div.className = 'dyn-item doc-item';
  div.style.cssText = 'flex-direction:column;gap:6px;padding:10px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)';
  div.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center">
      <select name="doc_tipo_${i}" class="doc-tipo-select" onchange="toggleDocTipo(this)" style="width:120px;padding:6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem">
        <option value="texto" selected>Texto</option>
        <option value="arquivo">Arquivo</option>
      </select>
      <input name="doc_nome_${i}" value="" placeholder="Nome do documento..." style="flex:1;padding:6px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem" class="doc-nome-input" />
      <button type="button" class="dyn-remove" onclick="removeDynItem(this.closest('.dyn-item'))"><i class="ph-bold ph-minus"></i></button>
    </div>
    <div class="doc-arquivo-selector" style="display:none;gap:8px;align-items:center">
      <label style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap">Vincular:</label>
      <select name="doc_arquivo_${i}" style="flex:1;padding:6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem">
        <option value="">Selecione um arquivo...</option>
        ${getArquivosOptions(null)}
      </select>
    </div>`;
  list.appendChild(div);
}

function toggleDocTipo(select) {
  const item = select.closest('.doc-item');
  const nomeInput = item.querySelector('.doc-nome-input');
  const arquivoSelector = item.querySelector('.doc-arquivo-selector');
  
  if (select.value === 'arquivo') {
    nomeInput.disabled = true;
    nomeInput.value = '';
    arquivoSelector.style.display = 'flex';
  } else {
    nomeInput.disabled = false;
    arquivoSelector.style.display = 'none';
    const arquivoSelect = arquivoSelector.querySelector('select');
    arquivoSelect.value = '';
  }
}

function addManualPasso() {
  const list = document.getElementById('dyn-passos');
  const i = list.children.length;
  const div = document.createElement('div');
  div.className = 'dyn-item';
  div.style.cssText = 'flex-direction:column;gap:8px;padding:12px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)';
  div.innerHTML = `
    <div style="display:flex;gap:8px;width:100%">
      <div style="flex:1">
        <label style="font-size:0.65rem;margin-bottom:4px;display:block">TEXTO DO PASSO ${i+1}</label>
        <textarea name="passo_texto_${i}" placeholder="Descreva o passo..." rows="2" style="width:100%"></textarea>
      </div>
      <button type="button" class="dyn-remove" onclick="removeDynItem(this.closest('.dyn-item'))" style="align-self:flex-start"><i class="ph-bold ph-trash"></i></button>
    </div>
    <div style="width:100%">
      <label style="font-size:0.65rem;margin-bottom:4px;display:block">IMAGEM (OPCIONAL)</label>
      <div style="display:flex;gap:10px;align-items:center">
        <div class="passo-img-preview" style="width:60px;height:40px;background:var(--surface-2);border:1px solid var(--border);border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center">
          <i class="ph ph-image" style="opacity:0.3"></i>
        </div>
        <input type="file" accept="image/*" onchange="previewPassoImagem(this)" style="font-size:0.7rem;flex:1" />
        <input type="hidden" name="passo_imagem_${i}" value="" />
      </div>
    </div>`;
  list.appendChild(div);
}

function previewPassoImagem(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) {
    toast('Imagem muito grande (máx 1MB)', 'error');
    return;
  }
  const reader = new FileReader();
  const previewDiv = input.parentElement.querySelector('.passo-img-preview');
  const hiddenInput = input.parentElement.querySelector('input[type="hidden"]');
  
  reader.onload = (e) => {
    hiddenInput.value = e.target.result;
    previewDiv.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover" />`;
  };
  reader.readAsDataURL(file);
}

function novoManual()     { abrirModal(formManual()); }
function editarManual(id) { abrirModal(formManual(DB.getById('manuais', id))); }

function salvarManual(id) {
  const list = document.getElementById('dyn-passos');
  const passos = Array.from(list.children).map(div => ({
    texto:  div.querySelector('textarea').value.trim(),
    imagem: div.querySelector('input[type="hidden"]').value
  })).filter(p => p.texto);

  // Processa documentos: texto simples ou objeto com arquivo_id
  const docsList = document.getElementById('dyn-documentos');
  const documentos = Array.from(docsList.children).map(div => {
    const tipoSelect = div.querySelector('select[name^="doc_tipo_"]');
    const nomeInput = div.querySelector('input[name^="doc_nome_"]');
    const arquivoSelect = div.querySelector('select[name^="doc_arquivo_"]');
    
    if (tipoSelect && tipoSelect.value === 'arquivo') {
      const arquivoId = arquivoSelect ? parseInt(arquivoSelect.value) : null;
      if (arquivoId) {
        // Buscar o nome do arquivo selecionado
        const arquivos = DB.get ? DB.get('arquivos') : [];
        const arquivo = arquivos.find(a => a.id === arquivoId);
        return {
          nome: arquivo ? arquivo.nome : 'Arquivo',
          arquivo_id: arquivoId
        };
      }
    }
    return nomeInput ? nomeInput.value.trim() : '';
  }).filter(Boolean);

  const { icone, cor } = getIconeCorValues('manual');
  const dados = {
    titulo:      document.getElementById('m-titulo').value.trim(),
    categoria:   document.getElementById('m-categoria').value.trim(),
    passos:      passos,
    documentos:  documentos,
    observacoes: document.getElementById('m-observacoes').value.trim(),
    icone, cor,
    publish_status: getModalPublishStatus(),
  };
  if (!dados.titulo) { toast('Título é obrigatório.','error'); return; }
  id ? DB.update('manuais', id, dados) : DB.insert('manuais', dados);
  fecharModal(); toast('Manual salvo.'); renderManuais();
}

/* ============================================================
   PROCESSOS
   ============================================================ */
function renderProcessos() {
  const lista = DB.get('processos');
  document.getElementById('section-processos').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Processos</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoProcesso()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Título</th><th>Categoria</th><th>Etapas</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(p => `
        <tr>
          <td><strong class="td-truncate">${escHtml(p.titulo)}</strong></td>
          <td><span class="badge">${escHtml(p.categoria)}</span></td>
          <td>${(p.etapas||[]).length}</td>
              <td><div class="td-actions td-actions--with-status">
                ${renderInlinePublishStatusControl('processos', p)}
                <button class="btn btn-ghost btn-sm" onclick="editarProcesso(${p.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
                <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('processos',${p.id},'${escHtml(p.titulo)}')"><i class="ph-bold ph-trash"></i></button>
              </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function getManuaisOptions(selectedIds = []) {
  const lista = DB.get('manuais');
  if (!lista.length) return '<option value="" disabled>Nenhum manual cadastrado</option>';
  return lista.map(m => {
    const label = withDraftSuffix(m.titulo, m);
    return `<option value="${m.id}" ${isSelectedOptionValue(selectedIds, m.id) ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
}

function _etapaItemHTML(i, titulo = '', descricao = '', manuais_ids = []) {
  return `
    <div class="dyn-item etapa-item" style="flex-direction:column;gap:6px;padding:12px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)">
      <div style="display:flex;gap:6px">
        <input name="etapa_titulo_${i}" value="${escHtml(titulo)}" placeholder="Título da etapa..." style="flex:1;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
        <button type="button" class="dyn-remove" onclick="removeDynItem(this.closest('.dyn-item'))"><i class="ph-bold ph-minus"></i></button>
      </div>
      <textarea name="etapa_desc_${i}" placeholder="Descrição da etapa..." rows="2" style="border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none;resize:vertical">${escHtml(descricao)}</textarea>
      <div>
        <label style="font-size:0.65rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px">Manuais vinculados <span style="font-weight:400;opacity:.7">(opcional)</span></label>
        <select name="etapa_manuais_${i}" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.8rem;outline:none;min-height:60px;max-height:100px">
          ${getManuaisOptions(manuais_ids)}
        </select>
        <p style="font-size:0.68rem;color:var(--text-muted);margin-top:3px">Segure Ctrl (ou Cmd) para selecionar múltiplos manuais.</p>
      </div>
    </div>`;
}

function formProcesso(p = {}) {
  const etapasHTML = (p.etapas || []).map((e, i) =>
    _etapaItemHTML(i, e.titulo, e.descricao, e.manuais_ids || [])
  ).join('');

  return `
    <h2 class="modal-title">${p.id ? 'Editar' : 'Novo'} Processo</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Título</label><input id="p-titulo" value="${escHtml(p.titulo||'')}" /></div>
      <div class="form-group full"><label>Categoria</label><input id="p-categoria" value="${escHtml(p.categoria||'')}" /></div>
      <div class="form-group full">
        <label>Ícone e cor do card</label>
        ${iconPickerHTML(p.icone, p.cor, 'processo')}
      </div>
      <div class="form-group full">
        <label>Etapas</label>
        <div class="dyn-list" id="dyn-etapas">${etapasHTML}</div>
        <button type="button" class="dyn-add" onclick="addEtapa()"><i class="ph-bold ph-plus"></i> Adicionar etapa</button>
      </div>
    </div>
    ${renderPublishStatusActions(`salvarProcesso(${p.id||0})`, p)}`;
}

function addEtapa() {
  const list = document.getElementById('dyn-etapas');
  const i = list.children.length;
  const div = document.createElement('div');
  div.innerHTML = _etapaItemHTML(i);
  list.appendChild(div.firstElementChild);
}

function novoProcesso()     { abrirModal(formProcesso()); }
function editarProcesso(id) { abrirModal(formProcesso(DB.getById('processos', id))); }

function salvarProcesso(id) {
  const list = document.getElementById('dyn-etapas');
  const etapas = Array.from(list.children).map(div => {
    const sel = div.querySelector('select[name^="etapa_manuais_"]');
    const manuais_ids = sel
      ? Array.from(sel.selectedOptions).map(o => parseInt(o.value)).filter(Boolean)
      : [];
    return {
      titulo:      div.querySelector('input').value.trim(),
      descricao:   div.querySelector('textarea').value.trim(),
      manuais_ids,
    };
  }).filter(e => e.titulo);

  const { icone, cor } = getIconeCorValues('processo');
  const dados = {
    titulo:    document.getElementById('p-titulo').value.trim(),
    categoria: document.getElementById('p-categoria').value.trim(),
    etapas,
    icone, cor,
    publish_status: getModalPublishStatus(),
  };
  if (!dados.titulo) { toast('Título é obrigatório.','error'); return; }
  id ? DB.update('processos', id, dados) : DB.insert('processos', dados);
  fecharModal(); toast('Processo salvo.'); renderProcessos();
}

// Sobrescreve o template das etapas para usar a largura total disponivel no modal.
function _etapaItemHTML(i, titulo = '', descricao = '', manuais_ids = []) {
  return `
    <div class="dyn-item etapa-item" style="flex-direction:column;gap:6px;padding:12px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)">
      <div style="display:flex;gap:6px;width:100%;align-items:flex-start">
        <div style="flex:1;min-width:0;width:100%">
          <input name="etapa_titulo_${i}" value="${escHtml(titulo)}" placeholder="Título da etapa..." style="width:100%;min-width:0;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
        </div>
        <button type="button" class="dyn-remove" onclick="removeDynItem(this.closest('.dyn-item'))"><i class="ph-bold ph-minus"></i></button>
      </div>
      <textarea name="etapa_desc_${i}" placeholder="Descrição da etapa..." rows="2" style="width:100%;min-width:0;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none;resize:vertical">${escHtml(descricao)}</textarea>
      <div style="width:100%;min-width:0">
        <label style="font-size:0.65rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px">Manuais vinculados <span style="font-weight:400;opacity:.7">(opcional)</span></label>
        <select name="etapa_manuais_${i}" multiple style="width:100%;min-width:0;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.8rem;outline:none;min-height:60px;max-height:100px">
          ${getManuaisOptions(manuais_ids)}
        </select>
        <p style="font-size:0.68rem;color:var(--text-muted);margin-top:3px">Segure Ctrl (ou Cmd) para selecionar múltiplos manuais.</p>
      </div>
    </div>`;
}

/* ============================================================
   ARQUIVOS
   ============================================================ */
function renderArquivos() {
  const lista = DB.get('arquivos');
  document.getElementById('section-arquivos').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Arquivos</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoArquivo()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table class="admin-table-arquivos">
      <thead><tr><th>Nome</th><th>Tipo</th><th>Tags</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(a => `
        <tr>
          <td class="admin-col-arquivo-nome"><strong class="arquivo-nome-wrap" title="${escHtml(a.nome)}">${escHtml(a.nome)}</strong></td>
          <td><span class="badge">${escHtml(a.tipo)}</span></td>
          <td class="admin-col-arquivo-tags">${(a.tags||[]).map(t => `<span class="badge">${escHtml(t)}</span>`).join(' ')}</td>
              <td><div class="td-actions td-actions--with-status">
                ${renderInlinePublishStatusControl('arquivos', a)}
                <button class="btn btn-ghost btn-sm" onclick="editarArquivo(${a.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
                <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('arquivos',${a.id},'${escHtml(a.nome)}')"><i class="ph-bold ph-trash"></i></button>
              </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function formArquivo(a = {}) {
  // Detectar se é base64 (upload local) ou URL externa
  const isBase64 = (a.arquivo_data || '').startsWith('data:');
  const temArquivo = !!a.arquivo_data;
  const nomeArquivoAtual = a.arquivo_nome || '';

  const arquivoStatus = temArquivo
    ? `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--accent-light);border-radius:var(--radius-sm);font-size:.8rem;color:var(--accent)">
         <i class="ph-bold ph-file-check"></i>
         <span>${escHtml(nomeArquivoAtual)}</span>
         <button type="button" class="btn btn-danger btn-sm" style="margin-left:auto" onclick="removerArquivoUpload()"><i class="ph-bold ph-trash"></i></button>
       </div>`
    : `<div style="font-size:.8rem;color:var(--text-muted);padding:4px 0">Nenhum arquivo carregado.</div>`;

  const html = `
    <h2 class="modal-title">${a.id ? 'Editar' : 'Novo'} Arquivo</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Nome de exibição</label><input id="a-nome" value="${escHtml(a.nome||'')}" placeholder="Ex: Manual de Procedimentos" /></div>
      <div class="form-group">
        <label>Tipo</label>
        <select id="a-tipo">
          ${['PDF','DOCX','XLSX','PPTX','TXT','ZIP','Outro'].map(t => `<option ${(a.tipo||'')=== t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>

      <div class="form-group full">
        <label>Upload de arquivo <span style="font-weight:400;color:var(--text-muted)">(recomendado)</span></label>
        ${arquivoStatus}
        <input type="file" id="a-file-input" style="display:none" onchange="processarArquivoUpload(this)" />
        <input type="hidden" id="a-arquivo-data" value="" />
        <input type="hidden" id="a-arquivo-nome" value="${escHtml(nomeArquivoAtual)}" />
        <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="document.getElementById('a-file-input').click()">
          <i class="ph-bold ph-upload-simple"></i> ${temArquivo ? 'Substituir arquivo' : 'Escolher arquivo'}
        </button>
        <span class="form-hint">O arquivo ficará disponível para download. Máx. recomendado: 5MB.</span>
      </div>

      <div class="form-group full">
        <label>Ou use URL / Link externo <span style="font-weight:400;color:var(--text-muted)">(Google Drive, etc.)</span></label>
        <input id="a-url" value="${escHtml(a.url||'')}" placeholder="https://drive.google.com/..." />
        <span class="form-hint">Se um arquivo foi carregado acima, o link externo é ignorado.</span>
      </div>

      <div class="form-group full">
        <label>Tags</label>
        ${tagsInputHTML(a.tags||[], 'arquivo')}
      </div>
    </div>
    ${renderPublishStatusActions(`salvarArquivo(${a.id||0})`, a)}`;
  return html;
}

/** Converte o arquivo selecionado para base64 e armazena nos hidden inputs */
function processarArquivoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const maxMB = 5;
  if (file.size > maxMB * 1024 * 1024) {
    toast(`Arquivo muito grande. Máximo ${maxMB}MB.`, 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('a-arquivo-data').value = e.target.result;
    document.getElementById('a-arquivo-nome').value = file.name;

    // Atualiza o status visual sem recriar o modal
    const status = document.querySelector('#a-file-input').closest('.form-group').querySelector('div:first-of-type');
    if (status) {
      status.outerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--accent-light);border-radius:var(--radius-sm);font-size:.8rem;color:var(--accent)">
        <i class="ph-bold ph-file-check"></i>
        <span>${escHtml(file.name)}</span>
        <button type="button" class="btn btn-danger btn-sm" style="margin-left:auto" onclick="removerArquivoUpload()"><i class="ph-bold ph-trash"></i></button>
      </div>`;
    }
    toast('Arquivo carregado. Clique em Salvar para confirmar.');
  };
  reader.readAsDataURL(file);
}

function removerArquivoUpload() {
  document.getElementById('a-arquivo-data').value = '';
  document.getElementById('a-arquivo-nome').value = '';
  const fileInput = document.getElementById('a-file-input');
  fileInput.value = '';
  const statusDiv = fileInput.closest('.form-group').querySelector('div:first-of-type');
  if (statusDiv) statusDiv.outerHTML = `<div style="font-size:.8rem;color:var(--text-muted);padding:4px 0">Nenhum arquivo carregado.</div>`;
}

function novoArquivo()     {
  abrirModal(formArquivo());
}
function editarArquivo(id) {
  const a = DB.getById('arquivos', id);
  abrirModal(formArquivo(a));
  // Restaura os dados do arquivo existente nos hidden inputs
  setTimeout(() => {
    if (a.arquivo_data) document.getElementById('a-arquivo-data').value = a.arquivo_data;
    if (a.arquivo_nome) document.getElementById('a-arquivo-nome').value = a.arquivo_nome;
  }, 50);
}

function salvarArquivo(id) {
  const arquivoData = document.getElementById('a-arquivo-data').value;
  const arquivoNome = document.getElementById('a-arquivo-nome').value;

  // Se editando e não fez novo upload, preserva os dados existentes
  const existente = id ? DB.getById('arquivos', id) : null;
  const finalArquivoData = arquivoData || (existente?.arquivo_data || '');
  const finalArquivoNome = arquivoNome || (existente?.arquivo_nome || '');

  const dados = {
    nome:          document.getElementById('a-nome').value.trim(),
    tipo:          document.getElementById('a-tipo').value,
    url:           document.getElementById('a-url').value.trim(),
    tags:          getTagsValues('arquivo'),
    arquivo_data:  finalArquivoData,   // base64 do arquivo (se upload local)
    arquivo_nome:  finalArquivoNome,   // nome original do arquivo
    publish_status: getModalPublishStatus(),
  };
  if (!dados.nome) { toast('Nome é obrigatório.','error'); return; }
  id ? DB.update('arquivos', id, dados) : DB.insert('arquivos', dados);
  fecharModal(); toast('Arquivo salvo.'); renderArquivos();
}

/* ============================================================
   VEÍCULOS
   ============================================================ */
function renderVeiculos() {
  const lista = DB.get('veiculos');
  document.getElementById('section-veiculos').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Veículos</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoVeiculo()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Nome</th><th>Marca/Modelo</th><th>Placa</th><th>Patrimônio</th><th>Situação</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(v => `
        <tr>
          <td><strong>${escHtml(v.nome)}</strong></td>
          <td>${escHtml(v.marca)} ${escHtml(v.modelo)} (${escHtml(v.ano)})</td>
          <td>${escHtml(v.placa)}</td>
          <td>${escHtml(v.patrimonio)}</td>
          <td><span class="badge" style="${v.situacao==='Em operação'?'background:#e6f4ea;color:#2d6a4f':'background:#fff3e0;color:#7a4f00'}">${escHtml(v.situacao)}</span></td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('veiculos', v)}
            <button class="btn btn-ghost btn-sm" onclick="editarVeiculo(${v.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
            <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('veiculos',${v.id},'${escHtml(v.nome)}')"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function getMotoristaOptions(selectedIds = []) {
  const lista = DB.get('funcionarios');
  return lista.map(f =>
    `<option value="${f.id}" ${selectedIds.includes(f.id) ? 'selected' : ''}>${escHtml(f.nome)} — ${escHtml(f.cargo)}</option>`
  ).join('');
}

function getArquivosVeiculoOptions(selectedIds = []) {
  const lista = DB.get('arquivos').filter(a => (a.tags || []).includes('veículos'));
  if (!lista.length) return '<option value="" disabled>Nenhum arquivo com tag "veículos" cadastrado</option>';
  return lista.map(a =>
    `<option value="${a.id}" ${selectedIds.includes(a.id) ? 'selected' : ''}>${escHtml(a.nome)} (${a.tipo})</option>`
  ).join('');
}

function getMotoristaOptions(selectedIds = []) {
  const lista = DB.get('funcionarios');
  return lista.map(f => {
    const label = withDraftSuffix(`${f.nome} â€” ${f.cargo}`, f);
    return `<option value="${f.id}" ${isSelectedOptionValue(selectedIds, f.id) ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
}

function getArquivosVeiculoOptions(selectedIds = []) {
  const lista = DB.get('arquivos').filter(a => (a.tags || []).includes('veÃ­culos'));
  if (!lista.length) return '<option value="" disabled>Nenhum arquivo com tag "veÃ­culos" cadastrado</option>';
  return lista.map(a => {
    const label = withDraftSuffix(`${a.nome} (${a.tipo})`, a);
    return `<option value="${a.id}" ${isSelectedOptionValue(selectedIds, a.id) ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
}

function formVeiculo(v = {}) {
  return `
    <h2 class="modal-title">${v.id ? 'Editar' : 'Novo'} Veículo</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Nome</label><input id="v-nome" value="${escHtml(v.nome||'')}" placeholder="Ex: Trator Agrícola I" /></div>
      <div class="form-group"><label>Tipo</label><input id="v-tipo" value="${escHtml(v.tipo||'')}" placeholder="Trator, Caminhonete..." /></div>
      <div class="form-group"><label>Marca</label><input id="v-marca" value="${escHtml(v.marca||'')}" /></div>
      <div class="form-group"><label>Modelo</label><input id="v-modelo" value="${escHtml(v.modelo||'')}" /></div>
      <div class="form-group"><label>Ano</label><input id="v-ano" value="${escHtml(v.ano||'')}" /></div>
      <div class="form-group"><label>Cor</label><input id="v-cor" value="${escHtml(v.cor_veiculo||'')}" /></div>
      <div class="form-group"><label>Placa</label><input id="v-placa" value="${escHtml(v.placa||'')}" /></div>
      <div class="form-group"><label>Nº Patrimônio</label><input id="v-patrimonio" value="${escHtml(v.patrimonio||'')}" /></div>
      <div class="form-group"><label>Chassi</label><input id="v-chassi" value="${escHtml(v.chassi||'')}" /></div>
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
      <div class="form-group full">
        <label>Ícone e cor do card</label>
        ${iconPickerHTML(v.icone, v.cor, 'veiculo')}
      </div>
      <div class="form-group full">
        <label>Motorista(s) habilitado(s)</label>
        <select id="v-motorista-ids" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.82rem;outline:none;min-height:72px;max-height:120px">
          ${getMotoristaOptions(v.motorista_ids || [])}
        </select>
        <p class="form-hint">Segure Ctrl (ou Cmd) para selecionar múltiplos motoristas.</p>
      </div>
      <div class="form-group full"><label>Localização atual</label><input id="v-localizacao" value="${escHtml(v.localizacao||'')}" /></div>
      <div class="form-group full">
        <label>Documentos vinculados <span style="font-weight:400;color:var(--text-muted)">(arquivos com tag "veículos")</span></label>
        <select id="v-arquivo-ids" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.82rem;outline:none;min-height:72px;max-height:120px">
          ${getArquivosVeiculoOptions(v.arquivo_ids || [])}
        </select>
        <p class="form-hint">Segure Ctrl (ou Cmd) para selecionar múltiplos. Cadastre arquivos com tag "veículos" na seção Arquivos.</p>
      </div>
      <div class="form-group full"><label>Observações</label><textarea id="v-obs">${escHtml(v.obs||'')}</textarea></div>
    </div>
    ${renderPublishStatusActions(`salvarVeiculo(${v.id||0})`, v)}`;
}

function novoVeiculo()     { abrirModal(formVeiculo()); }
function editarVeiculo(id) { abrirModal(formVeiculo(DB.getById('veiculos', id))); }

function salvarVeiculo(id) {
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
    obs:           document.getElementById('v-obs').value.trim(),
    icone, cor,
    publish_status: getModalPublishStatus(),
  };
  if (!dados.nome) { toast('Nome é obrigatório.','error'); return; }
  id ? DB.update('veiculos', id, dados) : DB.insert('veiculos', dados);
  fecharModal(); toast('Veículo salvo.'); renderVeiculos();
}

/* ============================================================
   SISTEMAS
   ============================================================ */
function renderSistemas() {
  const lista = DB.get('sistemas');
  document.getElementById('section-sistemas').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Sistemas</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoSistema()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Nome</th><th>Órgão</th><th>URL</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(s => `
        <tr>
          <td><strong>${escHtml(s.nome)}</strong><br><small style="color:var(--text-muted)">${escHtml(s.nome_completo)}</small></td>
          <td>${escHtml(s.orgao)}</td>
          <td class="td-truncate"><a href="${escHtml(s.url)}" target="_blank" style="color:var(--accent)">${escHtml(s.url)}</a></td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('sistemas', s)}
            <button class="btn btn-ghost btn-sm" onclick="editarSistema(${s.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
            <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('sistemas',${s.id},'${escHtml(s.nome)}')"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function getSistemaLinksOptions(colecao, selectedIds = []) {
  const lista = DB.get(colecao);
  if (!lista.length) return `<option value="" disabled>Nenhum ${colecao === 'manuais' ? 'manual' : 'processo'} cadastrado</option>`;
  return lista.map(item =>
    `<option value="${item.id}" ${selectedIds.includes(item.id) ? 'selected' : ''}>${escHtml(item.titulo)}</option>`
  ).join('');
}

function getSistemaLinksOptions(colecao, selectedIds = []) {
  const lista = DB.get(colecao);
  if (!lista.length) return `<option value="" disabled>Nenhum ${colecao === 'manuais' ? 'manual' : 'processo'} cadastrado</option>`;
  return lista.map(item => {
    const label = withDraftSuffix(item.titulo, item);
    return `<option value="${item.id}" ${isSelectedOptionValue(selectedIds, item.id) ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
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
              <select name="sv_doc_tipo_${i}" class="doc-tipo-select" onchange="toggleDocTipo(this)" style="width:120px;padding:6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem">
                <option value="texto" ${tipo === 'texto' ? 'selected' : ''}>Texto</option>
                <option value="arquivo" ${tipo === 'arquivo' ? 'selected' : ''}>Arquivo</option>
              </select>
              <div style="flex:1;min-width:0;width:100%">
                <input name="sv_doc_nome_${i}" value="${escHtml(nome)}" placeholder="Nome do documento..." style="width:100%;min-width:0;padding:6px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem" class="doc-nome-input" ${tipo === 'arquivo' ? 'disabled' : ''} />
              </div>
              <button type="button" class="dyn-remove" onclick="removeDynItem(this.closest('.dyn-item'))"><i class="ph-bold ph-minus"></i></button>
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
    <button type="button" class="dyn-add" onclick="addServicoDocumento()"><i class="ph-bold ph-plus"></i> Adicionar documento</button>
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
      <select name="sv_doc_tipo_${i}" class="doc-tipo-select" onchange="toggleDocTipo(this)" style="width:120px;padding:6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem">
        <option value="texto" selected>Texto</option>
        <option value="arquivo">Arquivo</option>
      </select>
      <div style="flex:1;min-width:0;width:100%">
        <input name="sv_doc_nome_${i}" value="" placeholder="Nome do documento..." style="width:100%;min-width:0;padding:6px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:0.8rem" class="doc-nome-input" />
      </div>
      <button type="button" class="dyn-remove" onclick="removeDynItem(this.closest('.dyn-item'))"><i class="ph-bold ph-minus"></i></button>
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
  return `
    <h2 class="modal-title">${s.id ? 'Editar' : 'Novo'} Sistema</h2>
    <div class="form-grid">
      <div class="form-group"><label>Nome (sigla)</label><input id="s-nome" value="${escHtml(s.nome||'')}" /></div>
      <div class="form-group"><label>Órgão responsável</label><input id="s-orgao" value="${escHtml(s.orgao||'')}" /></div>
      <div class="form-group full"><label>Nome completo</label><input id="s-nome-completo" value="${escHtml(s.nome_completo||'')}" /></div>
      <div class="form-group full"><label>URL de acesso</label><input id="s-url" value="${escHtml(s.url||'')}" placeholder="https://..." /></div>
      <div class="form-group full"><label>Descrição</label><textarea id="s-descricao">${escHtml(s.descricao||'')}</textarea></div>
      <div class="form-group full"><label>Instrução de acesso</label><input id="s-acesso" value="${escHtml(s.acesso||'')}" placeholder="Ex: Login com CPF..." /></div>
      <div class="form-group full">
        <label>Ícone e cor do card</label>
        ${iconPickerHTML(s.icone, s.cor, 'sistema')}
      </div>
      <div class="form-group full">
        <label>Manuais relacionados <span style="font-weight:400;color:var(--text-muted)">(opcional)</span></label>
        <select id="s-manuais" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.82rem;outline:none;min-height:64px;max-height:110px">
          ${getSistemaLinksOptions('manuais', s.manuais_ids || [])}
        </select>
        <p class="form-hint">Segure Ctrl (ou Cmd) para selecionar múltiplos.</p>
      </div>
      <div class="form-group full">
        <label>Processos relacionados <span style="font-weight:400;color:var(--text-muted)">(opcional)</span></label>
        <select id="s-processos" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.82rem;outline:none;min-height:64px;max-height:110px">
          ${getSistemaLinksOptions('processos', s.processos_ids || [])}
        </select>
        <p class="form-hint">Segure Ctrl (ou Cmd) para selecionar múltiplos.</p>
      </div>
    </div>
    ${renderPublishStatusActions(`salvarSistema(${s.id||0})`, s)}`;
}

function novoSistema()     { abrirModal(formSistema()); }
function editarSistema(id) { abrirModal(formSistema(DB.getById('sistemas', id))); }

function salvarSistema(id) {
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
  if (!dados.nome) { toast('Nome é obrigatório.','error'); return; }
  id ? DB.update('sistemas', id, dados) : DB.insert('sistemas', dados);
  fecharModal(); toast('Sistema salvo.'); renderSistemas();
}

/* ============================================================
   SERVIÇOS
   ============================================================ */
function renderServicos() {
  const lista = DB.get('servicos');
  document.getElementById('section-servicos').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Serviços</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoServico()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Nome</th><th>Categoria</th><th>Público</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(s => `
        <tr>
          <td><strong class="td-truncate">${escHtml(s.nome)}</strong></td>
          <td><span class="badge">${escHtml(s.categoria)}</span></td>
          <td class="td-truncate">${escHtml(s.publico)}</td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('servicos', s)}
            <button class="btn btn-ghost btn-sm" onclick="editarServico(${s.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
            <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('servicos',${s.id},'${escHtml(s.nome)}')"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function formServico(s = {}) {
  const cats = ['Trator','Arborização','Capacitação','Insumos','Outro'];
  return `
    <h2 class="modal-title">${s.id ? 'Editar' : 'Novo'} Serviço</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Nome</label><input id="sv-nome" value="${escHtml(s.nome||'')}" /></div>
      <div class="form-group">
        <label>Categoria</label>
        <select id="sv-categoria">${cats.map(c=>`<option ${(s.categoria||'')=== c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="form-group full">
        <label>Ícone e cor do card</label>
        ${iconPickerHTML(s.icone, s.cor, 'servico')}
      </div>
      <div class="form-group full"><label>Descrição</label><textarea id="sv-descricao">${escHtml(s.descricao||'')}</textarea></div>
      <div class="form-group full"><label>Público-alvo</label><input id="sv-publico" value="${escHtml(s.publico||'')}" /></div>
      <div class="form-group full"><label>Como solicitar</label><textarea id="sv-como">${escHtml(s.como_solicitar||'')}</textarea></div>
      <div class="form-group full">
        <label>Documentos necessários</label>
        ${renderServicoDocumentosFields(s.documentos || [])}
      </div>
      <div class="form-group full">
        <label>Processos relacionados <span style="font-weight:400;color:var(--text-muted)">(opcional)</span></label>
        <select id="sv-processos" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.82rem;outline:none;min-height:64px;max-height:110px">
          ${getSistemaLinksOptions('processos', s.processos_ids || [])}
        </select>
        <p class="form-hint">Segure Ctrl (ou Cmd) para selecionar múltiplos.</p>
      </div>
      <div class="form-group full"><label>Prazo estimado</label><input id="sv-prazo" value="${escHtml(s.prazo||'')}" /></div>
      <div class="form-group full"><label>Observações</label><textarea id="sv-obs">${escHtml(s.obs||'')}</textarea></div>
    </div>
    ${renderPublishStatusActions(`salvarServico(${s.id||0})`, s)}`;
}

function novoServico()     { abrirModal(formServico()); }
function editarServico(id) { abrirModal(formServico(DB.getById('servicos', id))); }

function salvarServico(id) {
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
  const dados = {
    nome:           document.getElementById('sv-nome').value.trim(),
    categoria:      document.getElementById('sv-categoria').value,
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
  if (!dados.nome) { toast('Nome é obrigatório.','error'); return; }
  id ? DB.update('servicos', id, dados) : DB.insert('servicos', dados);
  fecharModal(); toast('Serviço salvo.'); renderServicos();
}

/* ============================================================
   AVISOS
   ============================================================ */
// Sobrescreve o CRUD de servicos para suportar categoria personalizada.
function formServico(s = {}) {
  const { categoriaSelect, categoriaOutra } = getServicoCategoriaState(s.categoria || '');
  return `
    <h2 class="modal-title">${s.id ? 'Editar' : 'Novo'} Serviço</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Nome</label><input id="sv-nome" value="${escHtml(s.nome||'')}" /></div>
      <div class="form-group">
        <label>Categoria</label>
        <select id="sv-categoria" onchange="toggleServicoCategoriaOutro()">${SERVICO_CATEGORIAS_PADRAO.map(c => `<option ${categoriaSelect === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      </div>
      <div class="form-group" id="sv-categoria-outra-wrap" style="display:${categoriaSelect === 'Outro' ? 'flex' : 'none'};flex-direction:column">
        <label>Qual categoria?</label>
        <input id="sv-categoria-outra" value="${escHtml(categoriaOutra)}" placeholder="Digite a categoria personalizada" ${categoriaSelect === 'Outro' ? '' : 'disabled'} />
      </div>
      <div class="form-group full">
        <label>Ícone e cor do card</label>
        ${iconPickerHTML(s.icone, s.cor, 'servico')}
      </div>
      <div class="form-group full"><label>Descrição</label><textarea id="sv-descricao">${escHtml(s.descricao||'')}</textarea></div>
      <div class="form-group full"><label>Público-alvo</label><input id="sv-publico" value="${escHtml(s.publico||'')}" /></div>
      <div class="form-group full"><label>Como solicitar</label><textarea id="sv-como">${escHtml(s.como_solicitar||'')}</textarea></div>
      <div class="form-group full">
        <label>Documentos necessários</label>
        ${renderServicoDocumentosFields(s.documentos || [])}
      </div>
      <div class="form-group full">
        <label>Processos relacionados <span style="font-weight:400;color:var(--text-muted)">(opcional)</span></label>
        <select id="sv-processos" multiple style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:6px 8px;font-size:0.82rem;outline:none;min-height:64px;max-height:110px">
          ${getSistemaLinksOptions('processos', s.processos_ids || [])}
        </select>
        <p class="form-hint">Segure Ctrl (ou Cmd) para selecionar múltiplos.</p>
      </div>
      <div class="form-group full"><label>Prazo estimado</label><input id="sv-prazo" value="${escHtml(s.prazo||'')}" /></div>
      <div class="form-group full"><label>Observações</label><textarea id="sv-obs">${escHtml(s.obs||'')}</textarea></div>
    </div>
    ${renderPublishStatusActions(`salvarServico(${s.id||0})`, s)}`;
}

function salvarServico(id) {
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
  if (!dados.nome) { toast('Nome é obrigatório.','error'); return; }
  if (!dados.categoria) { toast('Categoria é obrigatória.','error'); return; }
  id ? DB.update('servicos', id, dados) : DB.insert('servicos', dados);
  fecharModal(); toast('Serviço salvo.'); renderServicos();
}

function renderAvisos() {
  const lista = DB.get('avisos');
  document.getElementById('section-avisos').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Avisos</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoAviso()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Título</th><th>Tipo</th><th>Local</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(a => `
        <tr>
          <td><strong class="td-truncate">${escHtml(a.titulo)}</strong></td>
          <td><span class="badge">${escHtml(a.tipo)}</span></td>
          <td>${escHtml(a.local||'—')}</td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('avisos', a)}
            <button class="btn btn-ghost btn-sm" onclick="editarAviso(${a.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
            <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('avisos',${a.id},'${escHtml(a.titulo)}')"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function formAviso(a = {}) {
  return `
    <h2 class="modal-title">${a.id ? 'Editar' : 'Novo'} Aviso</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Título</label><input id="av-titulo" value="${escHtml(a.titulo||'')}" /></div>
      <div class="form-group">
        <label>Tipo</label>
        <select id="av-tipo">
          ${['aviso','urgente','comunicado'].map(t=>`<option ${(a.tipo||'')=== t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Local</label><input id="av-local" value="${escHtml(a.local||'')}" /></div>
      <div class="form-group full"><label>Descrição</label><textarea id="av-desc">${escHtml(a.desc||'')}</textarea></div>
    </div>
    ${renderPublishStatusActions(`salvarAviso(${a.id||0})`, a)}`;
}

function novoAviso()     { abrirModal(formAviso()); }
function editarAviso(id) { abrirModal(formAviso(DB.getById('avisos', id))); }

function salvarAviso(id) {
  const dados = {
    titulo: document.getElementById('av-titulo').value.trim(),
    tipo:   document.getElementById('av-tipo').value,
    local:  document.getElementById('av-local').value.trim(),
    desc:   document.getElementById('av-desc').value.trim(),
    publish_status: getModalPublishStatus(),
  };
  if (!dados.titulo) { toast('Título é obrigatório.','error'); return; }
  id ? DB.update('avisos', id, dados) : DB.insert('avisos', dados);
  fecharModal(); toast('Aviso salvo.'); renderAvisos();
}

/* ============================================================
   AGENDA / EVENTOS
   ============================================================ */
function renderAgendaEventos() {
  const lista = DB.get('agendaEventos');
  document.getElementById('section-agendaEventos').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Eventos</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoEvento()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Título</th><th>Tipo</th><th>Data</th><th>Local</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(e => `
        <tr>
          <td><strong class="td-truncate">${escHtml(e.titulo)}</strong></td>
          <td><span class="badge">${escHtml(e.tipo)}</span></td>
          <td>${escHtml(formatDateBR(e.data))}${e.data_fim?` → ${escHtml(formatDateBR(e.data_fim))}`:''}</td>
          <td>${escHtml(e.local||'—')}</td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('agendaEventos', e)}
            <button class="btn btn-ghost btn-sm" onclick="editarEvento(${e.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
            <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('agendaEventos',${e.id},'${escHtml(e.titulo)}')"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function formEvento(e = {}) {
  const tipos = ['reuniao','evento','prazo','capacitacao','operacao'];
  return `
    <h2 class="modal-title">${e.id ? 'Editar' : 'Novo'} Evento</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Título</label><input id="ev-titulo" value="${escHtml(e.titulo||'')}" /></div>
      <div class="form-group">
        <label>Tipo</label>
        <select id="ev-tipo">${tipos.map(t=>`<option ${(e.tipo||'')=== t?'selected':''}>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Data início</label><input type="date" id="ev-data" value="${escHtml(e.data||'')}" /></div>
      <div class="form-group"><label>Data fim (opcional)</label><input type="date" id="ev-data-fim" value="${escHtml(e.data_fim||'')}" /></div>
      <div class="form-group"><label>Horário</label><input type="time" id="ev-hora" value="${escHtml(e.hora||'')}" /></div>
      <div class="form-group"><label>Local</label><input id="ev-local" value="${escHtml(e.local||'')}" /></div>
      <div class="form-group full"><label>Descrição</label><textarea id="ev-desc">${escHtml(e.desc||'')}</textarea></div>
    </div>
    ${renderPublishStatusActions(`salvarEvento(${e.id||0})`, e)}`;
}

function novoEvento()     { abrirModal(formEvento()); }
function editarEvento(id) { abrirModal(formEvento(DB.getById('agendaEventos', id))); }

function salvarEvento(id) {
  const dataFim = document.getElementById('ev-data-fim').value.trim();
  const dados = {
    titulo:   document.getElementById('ev-titulo').value.trim(),
    tipo:     document.getElementById('ev-tipo').value,
    data:     document.getElementById('ev-data').value,
    data_fim: dataFim || null,
    hora:     document.getElementById('ev-hora').value || null,
    local:    document.getElementById('ev-local').value.trim(),
    desc:     document.getElementById('ev-desc').value.trim(),
    publish_status: getModalPublishStatus(),
  };
  if (!dados.titulo || !dados.data) { toast('Título e data são obrigatórios.','error'); return; }
  id ? DB.update('agendaEventos', id, dados) : DB.insert('agendaEventos', dados);
  fecharModal(); toast('Evento salvo.'); renderAgendaEventos();
}

/* ============================================================
   ESCALA DE FÉRIAS
   ============================================================ */
function renderAgendaEventos() {
  const lista = DB.get('agendaEventos');
  document.getElementById('section-agendaEventos').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Eventos</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoEvento()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Título</th><th>Tipo</th><th>Período</th><th>Local</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(e => {
        const periodo = e.tipo === 'prazo' && !e.data
          ? `${escHtml(formatDateBR(e.data_fim || '—'))}${e.hora_fim ? ` ${escHtml(e.hora_fim)}` : ''}`
          : `${escHtml(formatDateBR(e.data || '—'))}${e.hora ? ` ${escHtml(e.hora)}` : ''}${e.data_fim ? ` → ${escHtml(formatDateBR(e.data_fim))}` : ''}${e.hora_fim ? ` ${escHtml(e.hora_fim)}` : ''}`;
        return `
        <tr>
          <td><strong class="td-truncate">${escHtml(e.titulo)}</strong></td>
          <td><span class="badge">${escHtml(e.tipo)}</span></td>
          <td>${periodo}</td>
          <td>${escHtml(e.local||'—')}</td>
          <td><div class="td-actions">
            <button class="btn btn-ghost btn-sm" onclick="editarEvento(${e.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
            <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('agendaEventos',${e.id},'${escHtml(e.titulo)}')"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table></div>`;
}

function formEvento(e = {}) {
  const tipos = ['reuniao','evento','prazo','capacitacao','operacao'];
  return `
    <h2 class="modal-title">${e.id ? 'Editar' : 'Novo'} Evento</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Título</label><input id="ev-titulo" value="${escHtml(e.titulo||'')}" /></div>
      <div class="form-group">
        <label>Tipo</label>
        <select id="ev-tipo" onchange="toggleEventoTipoFields()">${tipos.map(t=>`<option ${(e.tipo||'')=== t?'selected':''}>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group" id="ev-data-group"><label>Data início</label><input type="date" id="ev-data" value="${escHtml(e.data||'')}" /></div>
      <div class="form-group" id="ev-data-fim-group"><label id="ev-data-fim-label">Data fim</label><input type="date" id="ev-data-fim" value="${escHtml(e.data_fim||'')}" /></div>
      <div class="form-group" id="ev-hora-group"><label>Hora inicial</label><input type="time" id="ev-hora" value="${escHtml(e.hora||'')}" /></div>
      <div class="form-group"><label id="ev-hora-fim-label">Hora final</label><input type="time" id="ev-hora-fim" value="${escHtml(e.hora_fim||'')}" /></div>
      <div class="form-group"><label>Local</label><input id="ev-local" value="${escHtml(e.local||'')}" /></div>
      <div class="form-group full"><label>Descrição</label><textarea id="ev-desc">${escHtml(e.desc||'')}</textarea></div>
      <div class="form-group full" id="ev-prazo-hint" style="display:none">
        <p class="form-hint">Para o tipo prazo, use apenas data final e hora final. O evento ficará "em andamento" até esse momento e depois passará para "encerrado".</p>
      </div>
    </div>
    ${renderPublishStatusActions(`salvarEvento(${e.id||0})`, e)}`;
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
  abrirModal(formEvento());
  setTimeout(toggleEventoTipoFields, 0);
}

function editarEvento(id) {
  abrirModal(formEvento(DB.getById('agendaEventos', id)));
  setTimeout(toggleEventoTipoFields, 0);
}

function salvarEvento(id) {
  const tipo = document.getElementById('ev-tipo').value;
  const isPrazo = tipo === 'prazo';
  const dataFim = document.getElementById('ev-data-fim').value.trim();
  const dados = {
    titulo:   document.getElementById('ev-titulo').value.trim(),
    tipo,
    data:     isPrazo ? null : (document.getElementById('ev-data').value || null),
    data_fim: dataFim || null,
    hora:     isPrazo ? null : (document.getElementById('ev-hora').value || null),
    hora_fim: document.getElementById('ev-hora-fim').value || null,
    local:    document.getElementById('ev-local').value.trim(),
    desc:     document.getElementById('ev-desc').value.trim(),
    publish_status: getModalPublishStatus(),
  };

  if (!dados.titulo) { toast('Título é obrigatório.','error'); return; }
  if (isPrazo) {
    if (!dados.data_fim) { toast('Data final é obrigatória para prazo.','error'); return; }
  } else if (!dados.data) {
    toast('Data inicial é obrigatória.','error');
    return;
  }

  id ? DB.update('agendaEventos', id, dados) : DB.insert('agendaEventos', dados);
  fecharModal(); toast('Evento salvo.'); renderAgendaEventos();
}

function renderEscalaFerias() {
  const lista = DB.get('escalaFerias');
  document.getElementById('section-escalaFerias').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Escala de Férias</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novaFerias()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Funcionário</th><th>Cargo</th><th>Início</th><th>Fim</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(f => `
        <tr>
          <td><strong>${escHtml(f.nome)}</strong></td>
          <td>${escHtml(f.cargo)}</td>
          <td>${escHtml(formatDateBR(f.periodo_inicio))}</td>
          <td>${escHtml(formatDateBR(f.periodo_fim))}</td>
          <td><span class="badge" style="${f.status==='em_curso'?'background:#e6f4ea;color:#2d6a4f':''}">${escHtml(f.status)}</span></td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('escalaFerias', f)}
            <button class="btn btn-ghost btn-sm" onclick="editarFerias(${f.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
            <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('escalaFerias',${f.id},'${escHtml(f.nome)}')"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function formFerias(f = {}) {
  const funcionarios = DB.get('funcionarios');
  return `
    <h2 class="modal-title">${f.id ? 'Editar' : 'Nova'} Entrada de Férias</h2>
    <div class="form-grid">
      <div class="form-group full">
        <label>Funcionário</label>
        <select id="fer-func" onchange="preencherDadosFunc()">
          <option value="">— Selecione —</option>
          ${funcionarios.map(fn=>`<option value="${fn.id}" data-cargo="${escHtml(fn.cargo)}" ${String(f.funcionario_id)===String(fn.id)?'selected':''}>${escHtml(withDraftSuffix(fn.nome, fn))}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label>Cargo (preenchido automaticamente)</label><input id="fer-cargo" value="${escHtml(f.cargo||'')}" /></div>
      <div class="form-group"><label>Início das férias</label><input type="date" id="fer-inicio" value="${escHtml(f.periodo_inicio||'')}" /></div>
      <div class="form-group"><label>Fim das férias</label><input type="date" id="fer-fim" value="${escHtml(f.periodo_fim||'')}" /></div>
      <div class="form-group">
        <label>Status</label>
        <select id="fer-status">
          ${['agendado','em_curso','concluido'].map(s=>`<option ${(f.status||'')=== s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    ${renderPublishStatusActions(`salvarFerias(${f.id||0})`, f)}`;
}

function preencherDadosFunc() {
  const sel = document.getElementById('fer-func');
  const opt = sel.options[sel.selectedIndex];
  if (opt) document.getElementById('fer-cargo').value = opt.dataset.cargo || '';
}

function novaFerias()     { abrirModal(formFerias()); }
function editarFerias(id) { abrirModal(formFerias(DB.getById('escalaFerias', id))); }

function salvarFerias(id) {
  const sel = document.getElementById('fer-func');
  const funcId = parseInt(sel.value);
  const func = DB.getById('funcionarios', funcId);
  const dados = {
    funcionario_id:  funcId,
    nome:            func ? func.nome : '',
    cargo:           document.getElementById('fer-cargo').value.trim(),
    periodo_inicio:  document.getElementById('fer-inicio').value,
    periodo_fim:     document.getElementById('fer-fim').value,
    status:          document.getElementById('fer-status').value,
    publish_status: getModalPublishStatus(),
  };
  if (!dados.funcionario_id || !dados.periodo_inicio || !dados.periodo_fim) { toast('Preencha todos os campos obrigatórios.','error'); return; }
  id ? DB.update('escalaFerias', id, dados) : DB.insert('escalaFerias', dados);
  fecharModal(); toast('Escala de férias salva.'); renderEscalaFerias();
}

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
  const lista = DB.get('escalaFerias');
  document.getElementById('section-escalaFerias').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Escala de Férias</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novaFerias()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Funcionário</th><th>Cargo</th><th>Início</th><th>Fim</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(f => {
        const status = getFeriasStatus(f.periodo_inicio, f.periodo_fim);
        return `
        <tr>
          <td><strong>${escHtml(f.nome)}</strong></td>
          <td>${escHtml(f.cargo)}</td>
          <td>${escHtml(formatDateBR(f.periodo_inicio))}</td>
          <td>${escHtml(formatDateBR(f.periodo_fim))}</td>
          <td><span class="badge" style="${status==='em_curso'?'background:#e6f4ea;color:#2d6a4f':''}">${escHtml(status)}</span></td>
          <td><div class="td-actions">
            <button class="btn btn-ghost btn-sm" onclick="editarFerias(${f.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
            <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('escalaFerias',${f.id},'${escHtml(f.nome)}')"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table></div>`;
}

function formFerias(f = {}) {
  const funcionarios = DB.get('funcionarios');
  return `
    <h2 class="modal-title">${f.id ? 'Editar' : 'Nova'} Entrada de Férias</h2>
    <div class="form-grid">
      <div class="form-group full">
        <label>Funcionário</label>
        <select id="fer-func" onchange="preencherDadosFunc()">
          <option value="">— Selecione —</option>
          ${funcionarios.map(fn=>`<option value="${fn.id}" data-cargo="${escHtml(fn.cargo)}" ${String(f.funcionario_id)===String(fn.id)?'selected':''}>${escHtml(withDraftSuffix(fn.nome, fn))}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label>Cargo (preenchido automaticamente)</label><input id="fer-cargo" value="${escHtml(f.cargo||'')}" /></div>
      <div class="form-group"><label>Início das férias</label><input type="date" id="fer-inicio" value="${escHtml(f.periodo_inicio||'')}" /></div>
      <div class="form-group"><label>Fim das férias</label><input type="date" id="fer-fim" value="${escHtml(f.periodo_fim||'')}" /></div>
      <div class="form-group full">
        <label>Status</label>
        <div style="padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:var(--surface-2);font-size:0.84rem;color:var(--text-secondary)">
          Calculado automaticamente pelas datas: antes do início = <strong>agendado</strong>, durante o período = <strong>em_curso</strong>, após o fim = <strong>concluido</strong>.
        </div>
      </div>
    </div>
    ${renderPublishStatusActions(`salvarFerias(${f.id||0})`, f)}`;
}

function salvarFerias(id) {
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
  if (!dados.funcionario_id || !dados.periodo_inicio || !dados.periodo_fim) { toast('Preencha todos os campos obrigatórios.','error'); return; }
  if (dados.periodo_fim < dados.periodo_inicio) { toast('A data final não pode ser anterior à data inicial.','error'); return; }
  id ? DB.update('escalaFerias', id, dados) : DB.insert('escalaFerias', dados);
  fecharModal(); toast('Escala de férias salva.'); renderEscalaFerias();
}

function renderAcessoRapido() {
  const lista = DB.get('acessoRapido');
  document.getElementById('section-acessoRapido').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Acesso Rápido</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoAcesso()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:16px">Configure os botões de acesso rápido do dashboard. Máximo recomendado: 6 botões.</p>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Título</th><th>URL</th><th>Ícone</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(a => `
        <tr>
          <td><strong>${escHtml(a.titulo)}</strong></td>
          <td class="td-truncate"><a href="${escHtml(a.url)}" target="_blank" style="color:var(--accent)">${escHtml(a.url)}</a></td>
          <td>${escHtml(a.icone)}</td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('acessoRapido', a)}
            <button class="btn btn-ghost btn-sm" onclick="editarAcesso(${a.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
            <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('acessoRapido',${a.id},'${escHtml(a.titulo)}')"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function formAcesso(a = {}) {
  return `
    <h2 class="modal-title">${a.id ? 'Editar' : 'Novo'} Acesso Rápido</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Título</label><input id="ac-titulo" value="${escHtml(a.titulo||'')}" /></div>
      <div class="form-group full"><label>URL</label><input id="ac-url" value="${escHtml(a.url||'')}" placeholder="https://..." /></div>
      <div class="form-group"><label>Ícone Phosphor</label><input id="ac-icone" value="${escHtml(a.icone||'ph-link')}" placeholder="Ex: ph-globe" /><span class="form-hint">Veja ícones em: phosphoricons.com</span></div>
      <div class="form-group"><label>Cor (hex)</label><input type="color" id="ac-cor" value="${a.cor||'#2d6a4f'}" style="height:38px;padding:2px" /></div>
    </div>
    ${renderPublishStatusActions(`salvarAcesso(${a.id||0})`, a)}`;
}

function novoAcesso()     { abrirModal(formAcesso()); }
function editarAcesso(id) { abrirModal(formAcesso(DB.getById('acessoRapido', id))); }

function salvarAcesso(id) {
  const dados = {
    titulo:  document.getElementById('ac-titulo').value.trim(),
    url:     document.getElementById('ac-url').value.trim(),
    icone:   document.getElementById('ac-icone').value.trim(),
    cor:     document.getElementById('ac-cor').value,
    coringa: false,
    publish_status: getModalPublishStatus(),
  };
  if (!dados.titulo) { toast('Título é obrigatório.','error'); return; }
  id ? DB.update('acessoRapido', id, dados) : DB.insert('acessoRapido', dados);
  fecharModal(); toast('Acesso rápido salvo.'); renderAcessoRapido();
}

/* ============================================================
   INFO SIMPLES (infoJuridico, infoMunicipio) — edição de campos
   ============================================================ */
function formAcesso(a = {}) {
  return `
    <h2 class="modal-title">${a.id ? 'Editar' : 'Novo'} Acesso Rápido</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Título</label><input id="ac-titulo" value="${escHtml(a.titulo||'')}" /></div>
      <div class="form-group full"><label>URL</label><input id="ac-url" value="${escHtml(a.url||'')}" placeholder="https://..." /></div>
      <div class="form-group full">
        <label>Ícone e cor do botão</label>
        ${iconPickerHTML(a.icone, a.cor, 'acesso')}
      </div>
    </div>
    ${renderPublishStatusActions(`salvarAcesso(${a.id||0})`, a)}`;
}

function salvarAcesso(id) {
  const { icone, cor } = getIconeCorValues('acesso');
  const dados = {
    titulo:  document.getElementById('ac-titulo').value.trim(),
    url:     document.getElementById('ac-url').value.trim(),
    icone,
    cor,
    coringa: false,
    publish_status: getModalPublishStatus(),
  };
  if (!dados.titulo) { toast('Título é obrigatório.','error'); return; }
  id ? DB.update('acessoRapido', id, dados) : DB.insert('acessoRapido', dados);
  fecharModal(); toast('Acesso rápido salvo.'); renderAcessoRapido();
}

function renderInfoSimples(colecao, titulo, heading) {
  const lista = DB.get(colecao);
  document.getElementById('section-' + colecao).innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">${heading}</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoInfoSimples('${colecao}')"><i class="ph-bold ph-plus"></i> Novo bloco</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Título</th><th>Campos</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(item => `
        <tr>
          <td><strong>${escHtml(item.titulo)}</strong></td>
          <td>${(item.campos||[]).length} campos</td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl(colecao, item)}
            <button class="btn btn-ghost btn-sm" onclick="editarInfoSimples('${colecao}',${item.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
            <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('${colecao}',${item.id},'${escHtml(item.titulo)}')"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function formInfoSimples(colecao, item = {}) {
  const camposHTML = (item.campos || []).map((c, i) => `
    <div class="dyn-item" style="gap:6px">
      <input name="campo_label_${i}" value="${escHtml(c.label)}" placeholder="Label..." style="width:40%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
      <input name="campo_valor_${i}" value="${escHtml(c.valor)}" placeholder="Valor..." style="flex:1;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
      <button type="button" class="dyn-remove" onclick="removeDynItem(this)"><i class="ph-bold ph-minus"></i></button>
    </div>`).join('');

  return `
    <h2 class="modal-title">${item.id ? 'Editar' : 'Novo'} Bloco</h2>
    <div class="form-grid">
      <div class="form-group full"><label>Título do bloco</label><input id="info-titulo" value="${escHtml(item.titulo||'')}" /></div>
      <div class="form-group full">
        <label>Badge <span style="font-weight:400;color:var(--text-muted)">(etiqueta no painel de detalhes)</span></label>
          <input id="info-badge" value="${escHtml(item.badge||item.tag||'')}" placeholder="Ex: SMADER, Município, Prefeitura..." />
        <span class="form-hint">Aparece como etiqueta colorida no topo do painel de detalhes.</span>
      </div>
      <div class="form-group full">
        <label>Ícone e cor do card</label>
        ${iconPickerHTML(item.icone, item.cor, 'info')}
      </div>
      <div class="form-group full">
        <label>Campos (label → valor)</label>
        <div class="dyn-list" id="dyn-campos">${camposHTML}</div>
        <button type="button" class="dyn-add" onclick="addCampo()"><i class="ph-bold ph-plus"></i> Adicionar campo</button>
      </div>
    </div>
    ${renderPublishStatusActions(`salvarInfoSimples('${colecao}',${item.id||0})`, item)}`;
}

function addCampo() {
  const list = document.getElementById('dyn-campos');
  const i = list.children.length;
  const div = document.createElement('div');
  div.className = 'dyn-item';
  div.style.gap = '6px';
  div.innerHTML = `
    <input name="campo_label_${i}" placeholder="Label..." style="width:40%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
    <input name="campo_valor_${i}" placeholder="Valor..." style="flex:1;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
    <button type="button" class="dyn-remove" onclick="removeDynItem(this)"><i class="ph-bold ph-minus"></i></button>`;
  list.appendChild(div);
}

function novoInfoSimples(colecao)    { abrirModal(formInfoSimples(colecao)); }
function editarInfoSimples(col, id)  { abrirModal(formInfoSimples(col, DB.getById(col, id))); }

function salvarInfoSimples(colecao, id) {
  const list = document.getElementById('dyn-campos');
  const campos = Array.from(list.children).map(div => {
    const inputs = div.querySelectorAll('input');
    return { label: inputs[0]?.value.trim(), valor: inputs[1]?.value.trim() };
  }).filter(c => c.label);

  const badge = document.getElementById('info-badge').value.trim();
  const { icone, cor } = getIconeCorValues('info');
  const dados = {
    titulo: document.getElementById('info-titulo').value.trim(),
    campos,
    badge,
    icone, cor,
    publish_status: getModalPublishStatus(),
  };
  if (!dados.titulo) { toast('Título é obrigatório.','error'); return; }
  id ? DB.update(colecao, id, dados) : DB.insert(colecao, dados);
  fecharModal(); toast('Bloco salvo.');
  renderInfoSimples(colecao, '', colecao === 'infoJuridico' ? 'Informações da Secretaria' : 'Informações do Município');
}

/* ============================================================
   ÓRGÃOS EXTERNOS
   ============================================================ */
function renderInfoOrgaos() {
  const lista = DB.get('infoOrgaos');
  document.getElementById('section-infoOrgaos').innerHTML = `
    <div class="admin-section-header">
      <h1 class="admin-section-title">Órgãos Externos</h1>
      <div class="admin-section-header-spacer"></div>
      <button class="btn btn-primary" onclick="novoOrgao()"><i class="ph-bold ph-plus"></i> Novo</button>
    </div>
    <div class="admin-table-wrap"><table>
      <thead><tr><th>Título (sigla)</th><th>Nome completo</th><th>Campos</th><th>Ações</th></tr></thead>
      <tbody>${lista.map(o => `
        <tr>
          <td><strong>${escHtml(o.titulo)}</strong></td>
          <td class="td-truncate">${escHtml(o.nome_completo)}</td>
          <td>${(o.campos||[]).length}</td>
          <td><div class="td-actions td-actions--with-status">
            ${renderInlinePublishStatusControl('infoOrgaos', o)}
            <button class="btn btn-ghost btn-sm" onclick="editarOrgao(${o.id})"><i class="ph-bold ph-pencil"></i> Editar</button>
            <button class="btn btn-danger btn-sm" onclick="confirmarDelecao('infoOrgaos',${o.id},'${escHtml(o.titulo)}')"><i class="ph-bold ph-trash"></i></button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function formOrgao(o = {}) {
  const camposHTML = (o.campos || []).map((c, i) => `
    <div class="dyn-item" style="gap:6px">
      <input name="oc_label_${i}" value="${escHtml(c.label)}" placeholder="Label..." style="width:35%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
      <input name="oc_valor_${i}" value="${escHtml(c.valor)}" placeholder="Valor..." style="flex:1;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
      <button type="button" class="dyn-remove" onclick="removeDynItem(this)"><i class="ph-bold ph-minus"></i></button>
    </div>`).join('');

  return `
    <h2 class="modal-title">${o.id ? 'Editar' : 'Novo'} Órgão</h2>
    <div class="form-grid">
      <div class="form-group"><label>Título / Sigla</label><input id="org-titulo" value="${escHtml(o.titulo||'')}" /></div>
      <div class="form-group full"><label>Nome completo</label><input id="org-nome-completo" value="${escHtml(o.nome_completo||'')}" /></div>
      <div class="form-group full"><label>Atribuição</label><textarea id="org-atribuicao">${escHtml(o.atribuicao||'')}</textarea></div>
      <div class="form-group full">
        <label>Ícone e cor do card</label>
        ${iconPickerHTML(o.icone, o.cor, 'orgao')}
      </div>
      <div class="form-group full">
        <label>Campos de contato</label>
        <div class="dyn-list" id="dyn-orgcampos">${camposHTML}</div>
        <button type="button" class="dyn-add" onclick="addOrgCampo()"><i class="ph-bold ph-plus"></i> Adicionar campo</button>
      </div>
    </div>
    ${renderPublishStatusActions(`salvarOrgao(${o.id||0})`, o)}`;
}

function addOrgCampo() {
  const list = document.getElementById('dyn-orgcampos');
  const i = list.children.length;
  const div = document.createElement('div');
  div.className = 'dyn-item'; div.style.gap = '6px';
  div.innerHTML = `
    <input name="oc_label_${i}" placeholder="Label..." style="width:35%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
    <input name="oc_valor_${i}" placeholder="Valor..." style="flex:1;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;font-size:.82rem;outline:none" />
    <button type="button" class="dyn-remove" onclick="removeDynItem(this)"><i class="ph-bold ph-minus"></i></button>`;
  list.appendChild(div);
}

function novoOrgao()     { abrirModal(formOrgao()); }
function editarOrgao(id) { abrirModal(formOrgao(DB.getById('infoOrgaos', id))); }

function salvarOrgao(id) {
  const list = document.getElementById('dyn-orgcampos');
  const campos = Array.from(list.children).map(div => {
    const inputs = div.querySelectorAll('input');
    return { label: inputs[0]?.value.trim(), valor: inputs[1]?.value.trim() };
  }).filter(c => c.label);

  const { icone, cor } = getIconeCorValues('orgao');
  const dados = {
    titulo:        document.getElementById('org-titulo').value.trim(),
    nome_completo: document.getElementById('org-nome-completo').value.trim(),
    atribuicao:    document.getElementById('org-atribuicao').value.trim(),
    campos,
    icone, cor,
    publish_status: getModalPublishStatus(),
  };
  if (!dados.titulo) { toast('Título é obrigatório.','error'); return; }
  id ? DB.update('infoOrgaos', id, dados) : DB.insert('infoOrgaos', dados);
  fecharModal(); toast('Órgão salvo.'); renderInfoOrgaos();
}
