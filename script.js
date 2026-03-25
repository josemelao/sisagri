/* ============================================================
   SMADER — script.js
   Lógica principal e navegação SPA.
   Os dados vêm de dados.js (via db.js) — não edite dados aqui.
   Para editar dados, use o painel Admin (/admin.html).
   ============================================================ */

/* ============================================================
   VARIÁVEIS DE DADOS — populadas pelo db.js na inicialização
   Estas variáveis são usadas em todo o script como antes,
   mas agora vêm do DB (localStorage ou Supabase no futuro).
   ============================================================ */
let funcionarios  = [];
let manuais       = [];
let processos     = [];
let arquivos      = [];
let veiculos      = [];
let sistemas      = [];
let servicos      = [];
let infoJuridico  = [];
let infoMunicipio = [];
let infoOrgaos    = [];
let avisos        = [];
let agendaEventos = [];
let escalaFerias  = [];
let acessoRapido  = [];
const modulosInicializados = new Set();
let globalSearchIndex = [];
let globalSearchIndexReady = false;
let globalSearchIndexBuilding = false;
let bootHideTimer = null;
const MODULE_SEARCH_STATE_KEY = "smader_module_search_state_v1";

function isPublished(item) {
  if (!item || typeof item !== "object") return false;
  return (item.publish_status || "published") === "published";
}

function filterPublished(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(isPublished);
}

const bootState = {
  screen: null,
  title: null,
  sub: null,
  progressBar: null,
};

function initBootScreen() {
  bootState.screen = document.getElementById("boot-screen");
  bootState.title = document.getElementById("boot-title");
  bootState.sub = document.getElementById("boot-sub");
  bootState.progressBar = document.getElementById("boot-progress-bar");
}

function setBootProgress(percent, title, sub) {
  if (!bootState.screen) return;
  if (title && bootState.title) bootState.title.textContent = title;
  if (sub && bootState.sub) bootState.sub.textContent = sub;
  if (bootState.progressBar) {
    bootState.progressBar.style.width = `${Math.max(8, Math.min(100, percent))}%`;
  }
}

function hideBootScreen() {
  if (!bootState.screen) return;
  if (bootHideTimer) clearTimeout(bootHideTimer);
  bootHideTimer = setTimeout(() => {
    bootState.screen.classList.add("is-hidden");
    document.body.classList.remove("app-loading");
    document.body.style.overflow = "";
  }, 260);
}

async function waitForInitialPaint() {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch (_) {}
  }
}

/** Carrega todas as coleções do DB para as variáveis locais */
function carregarDados() {
  funcionarios  = filterPublished(DB.get('funcionarios'));
  manuais       = filterPublished(DB.get('manuais'));
  processos     = filterPublished(DB.get('processos'));
  arquivos      = filterPublished(DB.get('arquivos'));
  veiculos      = filterPublished(DB.get('veiculos'));
  sistemas      = filterPublished(DB.get('sistemas'));
  servicos      = filterPublished(DB.get('servicos'));
  infoJuridico  = filterPublished(DB.get('infoJuridico'));
  infoMunicipio = filterPublished(DB.get('infoMunicipio'));
  infoOrgaos    = filterPublished(DB.get('infoOrgaos'));
  avisos        = filterPublished(DB.get('avisos'));
  agendaEventos = filterPublished(DB.get('agendaEventos'));
  escalaFerias  = filterPublished(DB.get('escalaFerias'));
  acessoRapido  = filterPublished(DB.get('acessoRapido'));
}

window.addEventListener('db:collection-updated', () => {
  carregarDados();
  invalidateGlobalSearchIndex();
  scheduleGlobalSearchIndexBuild();
});

function invalidateGlobalSearchIndex() {
  globalSearchIndex = [];
  globalSearchIndexReady = false;
  globalSearchIndexBuilding = false;
}

function scheduleGlobalSearchIndexBuild() {
  if (globalSearchIndexReady || globalSearchIndexBuilding) return;
  globalSearchIndexBuilding = true;

  const run = () => rebuildGlobalSearchIndex();
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 150);
  }
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initBootScreen();
  setBootProgress(12, "Carregando sistema", "Conectando ao banco e preparando a página inicial.");
  // dbInit() carrega os dados (localStorage ou dados.js)
  // e só então renderiza a aplicação
  dbInit().then(() => {
    setBootProgress(52, "Dados carregados", "Organizando os módulos e sincronizando as informações iniciais.");
    carregarDados();
    initDate();
    initNavigation();
    initDashboardSide();
    initDashBottom();
    initSearch();
    initMobile();
    initLightbox();
    modulosInicializados.add("dashboard");
    setBootProgress(82, "Renderizando interface", "Montando o dashboard inicial e finalizando a experiência.");
    return waitForInitialPaint();
  }).then(() => {
    if (bootState.screen) {
      bootState.screen.classList.add("is-complete");
      bootState.screen.setAttribute("aria-busy", "false");
    }
    setBootProgress(100, "Sistema pronto", "Tudo foi carregado com sucesso. Você já pode usar a página.");
    hideBootScreen();
  }).catch((error) => {
    console.error("[App] Falha ao inicializar a aplicação.", error);
    if (bootState.screen) {
      bootState.screen.classList.remove("is-complete");
      bootState.screen.setAttribute("aria-busy", "false");
    }
    setBootProgress(100, "Falha ao carregar", "O carregamento não foi concluído corretamente. Atualize a página para tentar novamente.");
    document.body.classList.remove("app-loading");
    document.body.style.overflow = "";
  });
});


/* ============================================================
   DASHBOARD — Escala de Férias + Acesso Rápido
   ============================================================ */
function initDashBottom() {
  renderFerias();
  renderAcessoRapido();
}

/* ---------- ESCALA DE FÉRIAS ---------- */
function getFeriasStatus(periodoInicio, periodoFim) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicio = new Date(periodoInicio + "T00:00:00");
  const fim = new Date(periodoFim + "T00:00:00");

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return "agendado";
  if (hoje < inicio) return "agendado";
  if (hoje > fim) return "concluido";
  return "em_curso";
}

function formatDateBR(value) {
  if (!value || typeof value !== "string") return value || "—";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function renderFerias() {
  const container = document.getElementById("ferias-list");
  if (!container) return;

  const hoje = new Date(); hoje.setHours(0,0,0,0);

  // Ordena por data de início, exclui concluídos já passados
  const lista = escalaFerias
    .filter(f => {
      const fim = new Date(f.periodo_fim + "T00:00:00");
      return fim >= hoje || getFeriasStatus(f.periodo_inicio, f.periodo_fim) === "em_curso";
    })
    .sort((a, b) => new Date(a.periodo_inicio) - new Date(b.periodo_inicio));

  if (lista.length === 0) {
    container.innerHTML = `<p class="dash-empty">Nenhuma férias agendada.</p>`;
    return;
  }

  animateGridReflow(container, () => {
  container.innerHTML = lista.map(f => {
    const ini = new Date(f.periodo_inicio + "T00:00:00");
    const fim = new Date(f.periodo_fim    + "T00:00:00");
    const emCurso = getFeriasStatus(f.periodo_inicio, f.periodo_fim) === "em_curso";

    const diaIni = String(ini.getDate()).padStart(2,"0");
    const mesIni = MESES_PT[ini.getMonth()].slice(0,3);
    const diaFim = String(fim.getDate()).padStart(2,"0");
    const mesFim = MESES_PT[fim.getMonth()].slice(0,3);
    const periodo = `${diaIni}/${mesIni} — ${diaFim}/${mesFim}`;

    // Calcula progresso da barra (apenas para em_curso)
    let barraHTML = "";
    if (emCurso) {
      const total    = fim - ini;
      const decorrido = hoje - ini;
      const pct = Math.min(100, Math.round((decorrido / total) * 100));
      barraHTML = `
        <div class="ferias-barra">
          <div class="ferias-barra-fill" style="width:${pct}%"></div>
        </div>`;
    }

    return `
      <div class="ferias-item${emCurso ? " ferias-item--ativo" : ""}">
        ${(() => {
          const func = funcionarios.find(fn => fn.id === f.funcionario_id);
          return func && func.foto
            ? `<img src="${func.foto}" class="ferias-avatar ferias-avatar--foto" alt="${f.nome}" />`
            : `<div class="ferias-avatar">${getInitials(f.nome)}</div>`;
        })()}
        <div class="ferias-info">
          <span class="ferias-nome">${f.nome}</span>
          <span class="ferias-cargo">${f.cargo}</span>
          <span class="ferias-periodo">
            <i class="ph-bold ph-calendar-blank"></i>${periodo}
          </span>
          ${barraHTML}
        </div>
        ${emCurso ? '<span class="ferias-badge-ativo">Em férias</span>' : ""}
      </div>`;
  }).join("");
  });
}

/* ---------- ACESSO RÁPIDO ---------- */
function renderAcessoRapido() {
  const container = document.getElementById("acesso-grid");
  if (!container) return;

  container.innerHTML = acessoRapido.map(a => {
    if (a.coringa) {
      return `
        <div class="acesso-btn acesso-btn--coringa" title="Clique para configurar">
          <i class="ph-bold ph-plus"></i>
          <span>Configurar</span>
        </div>`;
    }
    return `
      <a href="${a.url}" target="_blank" rel="noopener" class="acesso-btn" style="--ac:${a.cor}">
        <i class="ph-bold ${a.icone}"></i>
        <span>${a.titulo}</span>
      </a>`;
  }).join("");
}


/* ============================================================
   DATA E HORA NO DASHBOARD
   ============================================================ */
function initDate() {
  const el = document.getElementById("header-date");
  if (!el) return;
  const agora = new Date();
  const opts = { weekday: "long", day: "2-digit", month: "long", year: "numeric" };
  const str = agora.toLocaleDateString("pt-BR", opts);
  el.innerHTML = str.charAt(0).toUpperCase() + str.slice(1);
}


/* ============================================================
   DASHBOARD LATERAL — Calendário, Avisos, Eventos e Instagram
   ============================================================ */

let calYear, calMonth;

function initDashboardSide() {
  const hoje = new Date();
  calYear  = hoje.getFullYear();
  calMonth = hoje.getMonth();

  renderDashboardInstagramWidget();
  renderCalendar();
  renderDashAvisos();
  renderDashEventos();
  initInstagram();
  initWidgetCollapse();

  document.getElementById("cal-prev").addEventListener("click", () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });
  document.getElementById("cal-next").addEventListener("click", () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });
}

/* ---------- COLLAPSE dos widgets ---------- */
const WIDGET_COLLAPSE_DURATION_MS = 280;

function setWidgetBodyState(widget, body, isOpen, immediate = false) {
  if (!widget || !body) return;

  const shouldAnimate = !immediate;

  body.hidden = false;
  body.style.overflow = 'hidden';

  if (!shouldAnimate) {
    body.style.transition = '';
    body.style.height = isOpen ? 'auto' : '0px';
    body.style.opacity = isOpen ? '1' : '0';
    body.hidden = !isOpen;
    widget.dataset.open = isOpen ? "true" : "false";
    const btn = widget.querySelector(".widget-toggle-btn");
    if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    return;
  }

  const currentHeight = body.getBoundingClientRect().height;
  const targetHeight = isOpen ? body.scrollHeight : 0;

  body.style.transition = 'none';
  body.style.height = `${currentHeight}px`;
  body.style.opacity = currentHeight > 0 ? '1' : '0';

  requestAnimationFrame(() => {
    body.style.transition = `height ${WIDGET_COLLAPSE_DURATION_MS}ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease`;
    body.style.height = `${targetHeight}px`;
    body.style.opacity = isOpen ? '1' : '0';
    widget.dataset.open = isOpen ? "true" : "false";
    const btn = widget.querySelector(".widget-toggle-btn");
    if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  window.setTimeout(() => {
    if (isOpen) {
      body.style.height = 'auto';
      body.style.overflow = '';
    } else {
      body.hidden = true;
      body.style.overflow = '';
    }
  }, WIDGET_COLLAPSE_DURATION_MS);
}

function initWidgetCollapse() {
  document.querySelectorAll(".side-widget").forEach(widget => {
    const body = widget.querySelector(".side-widget-body");
    const isOpen = widget.dataset.open === "true";
    setWidgetBodyState(widget, body, isOpen, true);
  });

  document.querySelectorAll(".widget-toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const widget = btn.closest(".side-widget");
      const target = btn.dataset.target;
      const body   = document.getElementById("body-" + target);
      const isOpen = widget.dataset.open === "true";
      setWidgetBodyState(widget, body, !isOpen);
    });
  });

  // "Ver todos" links
  document.querySelectorAll(".side-widget-link[data-nav]").forEach(a => {
    a.addEventListener("click", (e) => { e.preventDefault(); navigateTo(a.dataset.nav); });
  });
}

/* ---------- CALENDÁRIO ---------- */

const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_PT  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

/* ---------- TIPOS de evento e aviso ---------- */

const tipoEvento = {
  reuniao:     { label: "Reunião",     cor: "#3d5c7a", icone: "ph-users-three" },
  evento:      { label: "Evento",      cor: "#3d7a5e", icone: "ph-calendar-check" },
  prazo:       { label: "Prazo",       cor: "#7a3d3d", icone: "ph-clock-countdown" },
  capacitacao: { label: "Capacitação", cor: "#5c3d7a", icone: "ph-graduation-cap" },
  operacao:    { label: "Operação",    cor: "#7a5c3d", icone: "ph-tractor" },
};

function parseEventoDateTime(data, hora = null, usarFimDoDia = false) {
  if (!data) return null;

  const raw = String(data).trim();
  if (!raw) return null;

  const normalizeHora = (valor, fallback) => {
    if (!valor) return fallback;
    const horaLimpa = String(valor).trim();
    if (/^\d{2}:\d{2}$/.test(horaLimpa)) return `${horaLimpa}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(horaLimpa)) return horaLimpa;
    return fallback;
  };

  const fallbackHora = usarFimDoDia ? "23:59:59" : "00:00:00";
  const time = normalizeHora(hora, fallbackHora);

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [dia, mes, ano] = raw.split("/");
    return new Date(`${ano}-${mes}-${dia}T${time}`);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T${time}`);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEventoTiming(e) {
  const isPrazo = e.tipo === 'prazo';
  const inicioBase = e.data || e.data_fim;
  const inicio = isPrazo
    ? parseEventoDateTime(inicioBase, e.hora, false)
    : parseEventoDateTime(e.data, e.hora, false);
  const fimData = e.data_fim || e.data;
  const fim = parseEventoDateTime(fimData, e.hora_fim || (isPrazo ? e.hora : null), true);
  const agora = new Date();
  const referenciaFim = fim || inicio;

  const ativo = !!referenciaFim && agora <= referenciaFim;
  const emAndamento = isPrazo
    ? ativo
    : (!!inicio && !!referenciaFim && agora >= inicio && agora <= referenciaFim);
  const encerrado = !!referenciaFim && agora > referenciaFim;
  const dataBadge = isPrazo ? (e.data_fim || e.data) : e.data;
  const sortDate = isPrazo ? (referenciaFim || inicio) : (inicio || referenciaFim);

  return { isPrazo, inicio, fim: referenciaFim, ativo, emAndamento, encerrado, dataBadge, sortDate };
}

function formatEventoPeriodo(e) {
  const t = getEventoTiming(e);
  if (t.isPrazo) {
    const fim = t.fim;
    if (!fim) return '';
    const data = `${String(fim.getDate()).padStart(2,"0")} ${MESES_PT[fim.getMonth()].slice(0,3)} ${fim.getFullYear()}`;
    return e.hora_fim ? `${data} às ${e.hora_fim}` : data;
  }

  const ini = t.inicio;
  const fim = t.fim;
  if (!ini || !fim) return '';

  const dataIni = `${String(ini.getDate()).padStart(2,"0")} ${MESES_PT[ini.getMonth()].slice(0,3)} ${ini.getFullYear()}`;
  const mesmaData = ini.toDateString() === fim.toDateString();

  if (mesmaData) {
    if (e.hora && e.hora_fim) return `${dataIni} · ${e.hora} às ${e.hora_fim}`;
    if (e.hora) return `${dataIni} · ${e.hora}`;
    if (e.hora_fim) return `${dataIni} · até ${e.hora_fim}`;
    return dataIni;
  }

  const dataFim = `${String(fim.getDate()).padStart(2,"0")} ${MESES_PT[fim.getMonth()].slice(0,3)} ${fim.getFullYear()}`;
  const parteIni = e.hora ? `${dataIni} · ${e.hora}` : dataIni;
  const parteFim = e.hora_fim ? `${dataFim} · ${e.hora_fim}` : dataFim;
  return `${parteIni} — ${parteFim}`;
}

const tipoAviso = {
  aviso:      { label: "Aviso",      cor: "#7a6b3d", icone: "ph-megaphone" },
  urgente:    { label: "Urgente",    cor: "#7a3d3d", icone: "ph-warning" },
  comunicado: { label: "Comunicado", cor: "#3d5c7a", icone: "ph-chat-text" },
};

function positionTooltip(tip, cell) {
  tip.hidden = false;
  const rect   = cell.getBoundingClientRect();
  const margin = 8;
  const tipW = tip.offsetWidth;
  const tipH = tip.offsetHeight;
  let left = rect.left + rect.width / 2 - tipW / 2;
  let top  = rect.top  - tipH - margin;
  if (left < margin) left = margin;
  if (left + tipW > window.innerWidth - margin)
    left = window.innerWidth - tipW - margin;
  if (top < margin)
    top = rect.bottom + margin;
  tip.style.left = left + "px";
  tip.style.top  = top  + "px";
}

function avisoItemHTML(a) {
  const tipo = tipoAviso[a.tipo] || tipoAviso.aviso;
  return `
    <div class="aviso-item aviso-item--${a.tipo}" onclick="navigateTo('agenda'); setTimeout(() => openAviso(${a.id}), 120)">
      <div class="aviso-icon" style="color:${tipo.cor}">
        <i class="ph-bold ${tipo.icone}"></i>
      </div>
      <div class="aviso-body">
        <div class="aviso-titulo">
          <span class="aviso-tag" style="background:color-mix(in srgb,${tipo.cor} 12%,transparent);color:${tipo.cor}">${tipo.label}</span>
          ${a.titulo}
        </div>
        ${a.desc ? `<p class="aviso-desc">${a.desc}</p>` : ""}
      </div>
    </div>`;
}

function renderDashAvisos() {
  const container = document.getElementById("dash-avisos-list");
  if (!container) return;
  if (avisos.length === 0) {
    container.innerHTML = `<p class="eventos-vazio">Nenhum aviso no momento.</p>`;
    return;
  }
  container.innerHTML = avisos.map(a => avisoItemHTML(a)).join("");
}

function initInstagram() {
  const savedToken = localStorage.getItem("ig_access_token");
  const tokenInput = document.getElementById("ig-token-input");
  const saveBtn    = document.getElementById("ig-token-save");

  if (savedToken) {
    tokenInput.value = savedToken;
    fetchInstagramPosts(savedToken);
  }

  saveBtn.addEventListener("click", () => {
    const token = tokenInput.value.trim();
    if (!token) return;
    localStorage.setItem("ig_access_token", token);
    fetchInstagramPosts(token);
  });
}

async function fetchInstagramPosts(token) {
  const grid = document.getElementById("ig-grid");
  if (!grid) return;
  grid.innerHTML = `<div class="ig-loading"><i class="ph-bold ph-spinner"></i> Carregando...</div>`;
  try {
    const url = `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp&limit=6&access_token=${token}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error("Token inválido ou expirado.");
    const data = await res.json();
    if (!data.data || data.data.length === 0) {
      grid.innerHTML = `<p class="ig-empty">Nenhuma postagem encontrada.</p>`;
      return;
    }
    grid.innerHTML = data.data.map(post => {
      const img = post.media_type === "VIDEO" ? post.thumbnail_url : post.media_url;
      const cap = post.caption ? post.caption.slice(0, 80) + (post.caption.length > 80 ? "…" : "") : "";
      return `
        <a href="${post.permalink}" target="_blank" rel="noopener" class="ig-post">
          <img src="${img}" alt="${cap}" loading="lazy" />
          <div class="ig-post-overlay"><i class="ph-bold ph-instagram-logo"></i></div>
        </a>`;
    }).join("");
  } catch (err) {
    grid.innerHTML = `
      <div class="ig-error">
        <i class="ph-bold ph-warning-circle"></i>
        <p>${err.message}</p>
        <small>Verifique se o token está correto e ainda é válido.</small>
      </div>`;
  }
}

/* ============================================================
   NAVEGAÇÃO SPA
   Troca de páginas sem recarregar — apenas mostra/oculta sections
   ============================================================ */
function initNavigation() {

  // Itens da sidebar
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      if (!item.dataset.page) return;
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Cards do dashboard que navegam para módulos
  const navCards = document.querySelectorAll(".card-nav");
  navCards.forEach(card => {
    card.addEventListener("click", () => {
      navigateTo(card.dataset.nav);
    });
  });
}

/**
 * Navega para uma página específica pelo ID.
 * @param {string} pageId - Ex: "dashboard", "funcionarios"
 */
function navigateTo(pageId) {
  ensureModuleInitialized(pageId);

  // Oculta todas as páginas
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  // Mostra a página selecionada
  const target = document.getElementById("page-" + pageId);
  if (target) target.classList.add("active");

  // Atualiza item ativo na sidebar
  document.querySelectorAll(".nav-item").forEach(n => {
    n.classList.toggle("active", n.dataset.page === pageId);
  });

  // Fecha sidebar no mobile após navegar
  closeMobileSidebar();

  // Scroll para o topo
  document.getElementById("main-content").scrollTo({ top: 0 });
}

function ensureModuleInitialized(pageId) {
  if (modulosInicializados.has(pageId)) return;

  switch (pageId) {
    case "funcionarios":
      initFuncionarios();
      initFuncSearch();
      break;
    case "manuais":
      initManuais();
      break;
    case "processos":
      initProcessos();
      break;
    case "arquivos":
      initArquivos();
      break;
    case "informacoes":
      initInformacoes();
      break;
    case "veiculos":
      initVeiculos();
      break;
    case "sistemas":
      initSistemas();
      break;
    case "servicos":
      initServicos();
      break;
    case "agenda":
      initAgenda();
      break;
    case "relatorios":
      initRelatorios();
      break;
    default:
      return;
  }

  modulosInicializados.add(pageId);
}


/* ============================================================
   MÓDULO: FUNCIONÁRIOS
   ============================================================ */
function initFuncionarios() {
  renderFuncionarios(funcionarios);

  // Botão fechar detalhe
  document.getElementById("func-detail-close").addEventListener("click", closeDetail.bind(null, "func-detail-overlay"));

  // Fechar ao clicar no fundo
  document.getElementById("func-detail-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("func-detail-overlay")) {
      closeDetail("func-detail-overlay");
    }
  });
}

/**
 * Renderiza cards de funcionários filtrados.
 * @param {Array} lista - Subconjunto de funcionarios[]
 */
function renderFuncionarios(lista) {
  const container = document.getElementById("func-list");
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;">Nenhum funcionário encontrado.</p>`;
    return;
  }

  animateGridReflow(container, () => {
    container.innerHTML = lista.map(f => {
      const avatarHTML = f.foto
        ? `<img src="${f.foto}" class="list-card-avatar func-foto" alt="${f.nome}" />`
        : `<div class="list-card-avatar">${getInitials(f.nome)}</div>`;
      return `
        <div class="list-card" data-id="${f.id}" data-reflow-id="func-${f.id}" onclick="openFuncionario(${f.id})">
          <div class="list-card-header">
            ${avatarHTML}
            <div>
              <div class="list-card-title">${f.nome}</div>
              <div class="list-card-sub">${f.cargo}</div>
            </div>
          </div>
          <span class="list-card-tag">${f.setor}</span>
        </div>
      `;
    }).join("");
  });
}

/** Abre o painel de detalhe de um funcionário */
function openFuncionario(id) {
  const f = funcionarios.find(x => x.id === id);
  if (!f) return;

  const avatarHTML = f.foto
    ? `<img src="${f.foto}" class="detail-avatar-large detail-avatar-foto" alt="${f.nome}" />`
    : `<div class="detail-avatar-large">${getInitials(f.nome)}</div>`;

  document.getElementById("func-detail-content").innerHTML = `
    ${avatarHTML}
    <div class="detail-name">${f.nome}</div>
    <div class="detail-role">${f.cargo}</div>
    <span class="detail-badge">${f.setor}</span>
    <hr class="detail-divider">
    <p class="detail-section-title">Informações de contato</p>
    <div class="detail-info-grid">
      <div class="detail-info-item">
        <label>Telefone</label>
        <span>${f.telefone}</span>
      </div>
      <div class="detail-info-item">
        <label>E-mail institucional</label>
        <span>${f.email}</span>
      </div>
    </div>
    <hr class="detail-divider">
    <p class="detail-section-title">O que essa pessoa faz</p>
    <p class="detail-desc">${f.descricao}</p>
  `;

  openDetail("func-detail-overlay");
}

/** Busca no módulo de funcionários (filtra em tempo real) */
function initFuncSearch() {
  const input = document.getElementById("func-search");
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    const filtrados = funcionarios.filter(f =>
      f.nome.toLowerCase().includes(q) ||
      f.cargo.toLowerCase().includes(q) ||
      f.setor.toLowerCase().includes(q)
    );
    renderFuncionarios(filtrados);
  });
}

// Sobrescreve a implementação legada para suportar o novo modelo de funcionário.
function renderFuncionarios(lista) {
  const container = document.getElementById("func-list");
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;">Nenhum funcionário encontrado.</p>`;
    return;
  }

  animateGridReflow(container, () => {
    container.innerHTML = lista.map(f => {
      const avatarHTML = f.foto
        ? `<img src="${f.foto}" class="list-card-avatar func-foto" alt="${f.nome}" />`
        : `<div class="list-card-avatar">${getInitials(f.nome)}</div>`;
      const lotacao = f.lotacao || f.setor || f.departamento || "";
      return `
        <div class="list-card" data-id="${f.id}" data-reflow-id="func-${f.id}" onclick="openFuncionario(${f.id})">
          <div class="list-card-header">
            ${avatarHTML}
            <div>
              <div class="list-card-title">${f.nome}</div>
              <div class="list-card-sub">${f.cargo}</div>
            </div>
          </div>
          <span class="list-card-tag">${lotacao}</span>
        </div>
      `;
    }).join("");
  });
}

function openFuncionario(id) {
  const f = funcionarios.find(x => x.id === id);
  if (!f) return;

  const avatarHTML = f.foto
    ? `<img src="${f.foto}" class="detail-avatar-large detail-avatar-foto" alt="${f.nome}" />`
    : `<div class="detail-avatar-large">${getInitials(f.nome)}</div>`;
  const lotacao = f.lotacao || f.setor || "";
  const camposInfo = [
    ["Matrícula", f.matricula],
    ["Lotação", lotacao],
    ["Vínculo", f.vinculo],
    ["Órgão", f.orgao],
    ["Data de admissão", formatDateBR(f.data_admissao)],
    ["Telefone", f.telefone],
    ["E-mail institucional", f.email],
    ["CPF", f.cpf],
    ["Departamento", f.departamento],
  ].filter(([, valor]) => valor);

  document.getElementById("func-detail-content").innerHTML = `
    ${avatarHTML}
    <div class="detail-name">${f.nome}</div>
    <div class="detail-role">${f.cargo}</div>
    <span class="detail-badge">${lotacao}</span>
    <hr class="detail-divider">
    <p class="detail-section-title">Informações do funcionário</p>
    <div class="detail-info-grid">${camposInfo.map(([label, valor]) => `
      <div class="detail-info-item">
        <label>${label}</label>
        <span>${valor}</span>
      </div>
    `).join("")}</div>
    <hr class="detail-divider">
    <p class="detail-section-title">O que essa pessoa faz</p>
    <p class="detail-desc">${f.descricao || "Sem descrição cadastrada."}</p>
  `;

  openDetail("func-detail-overlay");
}

function applyFuncionariosSearch(query = getModuleSearchValue("funcionarios")) {
  const q = String(query || "").toLowerCase().trim();
  const filtrados = q
    ? funcionarios.filter(f =>
        String(f.nome || "").toLowerCase().includes(q) ||
        String(f.cargo || "").toLowerCase().includes(q) ||
        String(f.lotacao || f.setor || "").toLowerCase().includes(q) ||
        String(f.departamento || "").toLowerCase().includes(q) ||
        String(f.orgao || "").toLowerCase().includes(q) ||
        String(f.matricula || "").toLowerCase().includes(q)
      )
    : funcionarios;
  renderFuncionarios(filtrados);
}

function limparBuscaFuncionarios() {
  setModuleSearchValue("funcionarios", "");
  const input = document.getElementById("func-search");
  if (input) input.value = "";
  applyFuncionariosSearch("");
}

function initFuncSearch() {
  const input = restoreModuleSearchInput("funcionarios", "func-search");
  if (!input) return;
  applyFuncionariosSearch(input.value);
  input.addEventListener("input", () => {
    setModuleSearchValue("funcionarios", input.value);
    applyFuncionariosSearch(input.value);
  });
}

function renderFuncionarios(lista) {
  const container = document.getElementById("func-list");
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = `<p class="modulo-vazio">Nenhum funcionário encontrado.</p>`;
    return;
  }

  animateGridReflow(container, () => {
    container.innerHTML = lista.map(f => {
      const avatarHTML = f.foto
        ? `<img src="${f.foto}" class="list-card-avatar func-foto" alt="${f.nome}" />`
        : `<div class="list-card-avatar">${getInitials(f.nome)}</div>`;
      const lotacao = f.lotacao || f.setor || f.departamento || "";
      return `
        <div class="list-card" data-id="${f.id}" data-reflow-id="func-${f.id}" onclick="openFuncionario(${f.id})">
          <div class="list-card-header">
            ${avatarHTML}
            <div>
              <div class="list-card-title">${f.nome}</div>
              <div class="list-card-sub">${f.cargo}</div>
            </div>
          </div>
          <span class="list-card-tag">${lotacao}</span>
        </div>
      `;
    }).join("");
  });
}


/* ============================================================
   MÓDULO: MANUAIS
   ============================================================ */
function initManuais() {
  renderManuais(manuais);

  document.getElementById("manual-detail-close").addEventListener("click", closeDetail.bind(null, "manual-detail-overlay"));
  document.getElementById("manual-detail-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("manual-detail-overlay")) closeDetail("manual-detail-overlay");
  });

  const input = restoreModuleSearchInput("manuais", "manuais-search");
  if (input) {
    applyManuaisSearch(input.value);
    input.addEventListener("input", (e) => {
      setModuleSearchValue("manuais", e.target.value);
      applyManuaisSearch(e.target.value);
    });
  }
}

function applyManuaisSearch(query = getModuleSearchValue("manuais")) {
  const q = String(query || "").toLowerCase().trim();
  const filtrados = q
    ? manuais.filter(m =>
        m.titulo.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q)
      )
    : manuais;
  renderManuais(filtrados);
}

function renderManuais(lista) {
  const container = document.getElementById("manuais-list");
  if (!container) return;
  if (lista.length === 0) {
    container.innerHTML = `<p class="modulo-vazio">Nenhum manual encontrado.</p>`;
    return;
  }
  animateGridReflow(container, () => {
  container.innerHTML = lista.map(m => {
    const ic  = m.icone || 'ph-book-open';
    const cor = m.cor   || 'var(--accent)';
    return `
    <div class="list-card" data-reflow-id="manual-${m.id}" onclick="openManual(${m.id})">
      <div class="list-card-header">
        <div class="list-card-avatar icon-avatar" style="color:${cor}">
          <i class="ph-bold ${ic}"></i>
        </div>
        <div>
          <div class="list-card-title">${m.titulo}</div>
          <div class="list-card-sub">${m.passos.length} etapas</div>
        </div>
      </div>
      <span class="list-card-tag">${m.categoria}</span>
    </div>`;
  }).join("");
  });
}

/** Abre o painel de detalhe de um manual */
function openManual(id) {
  const m = manuais.find(x => x.id === id);
  if (!m) return;

  renderManualDetail(m, "resumido");
  openDetail("manual-detail-overlay");
}

/** Renderiza o conteúdo do manual baseado no modo (resumido ou completo) */
function renderManualDetail(m, modo, passoAtivo = 0) {
  const container = document.getElementById("manual-detail-content");

  // Tabs de navegação entre modos
  const tabsHTML = `
    <div class="manual-tabs">
      <button class="manual-tab ${modo === 'resumido' ? 'active' : ''}" onclick="switchManualMode(${m.id}, 'resumido')">
        <i class="ph-bold ph-list-numbers"></i> Resumido
      </button>
      <button class="manual-tab ${modo === 'completo' ? 'active' : ''}" onclick="switchManualMode(${m.id}, 'completo')">
        <i class="ph-bold ph-presentation"></i> Completo
      </button>
    </div>
  `;

  let contentHTML = "";

  if (modo === "resumido") {
    const stepsHTML = m.passos.map((p, i) => `
      <div class="manual-step">
        <div class="step-number">${i + 1}</div>
        <div class="step-text">${typeof p === 'string' ? p : p.texto}</div>
      </div>
    `).join("");
    contentHTML = `<div class="manual-content-switch"><div class="manual-steps">${stepsHTML}</div></div>`;
  } else {
    // Paginação horizontal para modo completo
    const passo = m.passos[passoAtivo];
    const texto = typeof passo === 'string' ? passo : passo.texto;
    const imagem = (typeof passo === 'object' && passo.imagem) ? passo.imagem : "";

    contentHTML = `
      <div class="manual-content-switch"><div class="manual-completo">
        ${buildManualPaginationHTML(
          m.passos.length,
          passoAtivo,
          i => `switchManualPasso(${m.id}, ${i})`,
          `switchManualPasso(${m.id}, ${passoAtivo - 1})`,
          `switchManualPasso(${m.id}, ${passoAtivo + 1})`
        )}

        <div class="manual-passo-card">
          <div class="manual-passo-header">
            <span class="step-number">${passoAtivo + 1}</span>
            <strong>Passo ${passoAtivo + 1} de ${m.passos.length}</strong>
          </div>

          <div class="manual-passo-body">
            <p class="manual-passo-texto">${texto}</p>
            ${imagem ? `
              <div class="manual-passo-img-container">
                <img src="${imagem}" class="manual-passo-img" alt="Ilustração do passo ${passoAtivo + 1}" />
              </div>
            ` : `
              <div class="manual-passo-no-img">
                <i class="ph-bold ph-image-square"></i>
                <span>Nenhuma imagem disponível para este passo.</span>
              </div>
            `}
          </div>

          <div class="manual-passo-footer">
            <button class="btn-passo" ${passoAtivo === 0 ? 'disabled' : ''} onclick="switchManualPasso(${m.id}, ${passoAtivo - 1})">
              <i class="ph-bold ph-arrow-left"></i> Anterior
            </button>
            <button class="btn-passo btn-passo-primary" ${passoAtivo === m.passos.length - 1 ? 'disabled' : ''} onclick="switchManualPasso(${m.id}, ${passoAtivo + 1})">
              Próximo <i class="ph-bold ph-arrow-right"></i>
            </button>
          </div>
        </div>
      </div></div>
    `;
  }

  const docsHTML = m.documentos.map(d => {
    // Verifica se é um objeto vinculado a arquivo
    const isObj = typeof d === 'object' && d !== null;
    const nome = isObj ? d.nome : d;
    const arquivoId = isObj ? d.arquivo_id : null;
    
    if (arquivoId) {
      // Buscar o arquivo para verificar se tem dados
      const arquivo = arquivos.find(a => a.id === arquivoId);
      if (arquivo && (arquivo.arquivo_data || arquivo.url)) {
        const downloadUrl = arquivo.arquivo_data || arquivo.url;
        const nomeArquivo = arquivo.arquivo_nome || arquivo.nome || 'arquivo';
        return `
          <a href="${downloadUrl}" download="${nomeArquivo}" class="doc-tag doc-tag-link" style="text-decoration:none">
            <i class="ph-bold ph-download-simple"></i>${nome}
          </a>`;
      }
    }
    return `<span class="doc-tag"><i class="ph-bold ph-file-text"></i>${nome}</span>`;
  }).join("");

  container.innerHTML = `
    <div class="manual-transition-scope">
    <span class="detail-badge">${m.categoria}</span>
    <div class="detail-name" style="margin-top:10px">${m.titulo}</div>

    ${tabsHTML}

    <hr class="detail-divider">
    <p class="detail-section-title">${modo === 'resumido' ? 'Passo a passo' : 'Visualização Detalhada'}</p>
    ${contentHTML}

    <hr class="detail-divider">
    <p class="detail-section-title">Documentos necessários</p>
    <div class="docs-list">${docsHTML}</div>

    <hr class="detail-divider">
    <p class="detail-section-title">Observações</p>
    <div class="obs-box">${m.observacoes}</div>
    </div>
  `;
  animateManualPanelContent(container, modo, passoAtivo);
}

/** Troca o modo de visualização do manual */
window.switchManualMode = function(id, modo) {
  const m = manuais.find(x => x.id === id);
  if (m) renderManualDetail(m, modo);
};

/** Navega entre os passos no modo completo */
window.switchManualPasso = function(id, passoIdx) {
  const m = manuais.find(x => x.id === id);
  if (m) renderManualDetail(m, "completo", passoIdx);
};


/* ============================================================
   MÓDULO: PROCESSOS
   ============================================================ */
function initProcessos() {
  renderProcessos(processos);

  const closeProcesso = () => closeDetail("processo-detail-overlay");

  document.getElementById("processo-detail-close").addEventListener("click", closeProcesso);
  document.getElementById("processo-detail-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("processo-detail-overlay")) closeProcesso();
  });

  const input = restoreModuleSearchInput("processos", "processos-search");
  if (input) {
    applyProcessosSearch(input.value);
    input.addEventListener("input", (e) => {
      setModuleSearchValue("processos", e.target.value);
      applyProcessosSearch(e.target.value);
    });
  }
}

function applyProcessosSearch(query = getModuleSearchValue("processos")) {
  const q = String(query || "").toLowerCase().trim();
  const filtrados = q
    ? processos.filter(p =>
        p.titulo.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.etapas.some(et => et.titulo.toLowerCase().includes(q))
      )
    : processos;
  renderProcessos(filtrados);
}

function renderProcessos(lista) {
  const container = document.getElementById("processos-list");
  if (!container) return;
  if (lista.length === 0) {
    container.innerHTML = `<p class="modulo-vazio">Nenhum processo encontrado.</p>`;
    return;
  }
  animateGridReflow(container, () => {
  container.innerHTML = lista.map(p => {
    const ic  = p.icone || 'ph-flow-arrow';
    const cor = p.cor   || 'var(--accent)';
    return `
    <div class="list-card" data-reflow-id="processo-${p.id}" onclick="openProcesso(${p.id})">
      <div class="list-card-header">
        <div class="list-card-avatar icon-avatar" style="color:${cor}">
          <i class="ph-bold ${ic}"></i>
        </div>
        <div>
          <div class="list-card-title">${p.titulo}</div>
          <div class="list-card-sub">${p.etapas.length} etapas</div>
        </div>
      </div>
      <span class="list-card-tag">${p.categoria}</span>
    </div>`;
  }).join("");
  });
}

/** Abre o painel de detalhe de um processo com chips de manuais vinculados */
function openProcesso(id) {
  const p = processos.find(x => x.id === id);
  if (!p) return;

  // Remove filho residual de sessão anterior
  const filhoAnterior = document.getElementById('manual-filho-panel');
  if (filhoAnterior) filhoAnterior.remove();

  const timelineHTML = p.etapas.map(e => {
    const chips = (e.manuais_ids || []).map(mid => {
      const m = manuais.find(x => x.id === mid);
      if (!m) return '';
      return `<button class="etapa-manual-chip" onclick="openManualFilho(${m.id})" title="Ver manual">
        <i class="ph-bold ph-book-open"></i>${m.titulo}
        <i class="ph-bold ph-arrow-right" style="font-size:.65rem;opacity:.6"></i>
      </button>`;
    }).join('');

    return `
      <div class="timeline-item">
        <div class="timeline-left">
          <div class="timeline-dot"></div>
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-content">
          <strong>${e.titulo}</strong>
          <p>${e.descricao}</p>
          ${chips ? `<div class="etapa-manuais-row">${chips}</div>` : ''}
        </div>
      </div>`;
  }).join("");

  document.getElementById("processo-detail-content").innerHTML = `
    <span class="detail-badge">${p.categoria}</span>
    <div class="detail-name" style="margin-top:10px">${p.titulo}</div>
    <hr class="detail-divider">
    <p class="detail-section-title">Fluxo do processo</p>
    <div class="timeline">${timelineHTML}</div>
  `;

  openDetail("processo-detail-overlay");
}

/** Abre painel filho de manual por cima do painel de processo */
function openManualFilho(id) {
  const m = manuais.find(x => x.id === id);
  if (!m) return;

  openNestedPanel({
    parentPanelId: 'processo-detail-panel',
    panelId: 'manual-filho-panel',
    renderFn: () => renderManualFilho(m, 'resumido', 0),
  });
}

function renderManualFilho(m, modo, passoAtivo) {
  const filho = document.getElementById('manual-filho-panel');
  if (!filho) return;

  const tabs = `
    <div class="manual-tabs" style="margin:0 0 16px">
      <button class="manual-tab ${modo==='resumido'?'active':''}"
              onclick="renderManualFilho(manuais.find(x=>x.id===${m.id}),'resumido',0)">
        <i class="ph-bold ph-list-numbers"></i> Resumido
      </button>
      <button class="manual-tab ${modo==='completo'?'active':''}"
              onclick="renderManualFilho(manuais.find(x=>x.id===${m.id}),'completo',0)">
        <i class="ph-bold ph-presentation"></i> Completo
      </button>
    </div>`;

  let content = '';
  if (modo === 'resumido') {
    content = `<div class="manual-content-switch"><div class="manual-steps">${m.passos.map((p, i) => `
      <div class="manual-step">
        <div class="step-number">${i + 1}</div>
        <div class="step-text">${typeof p === 'string' ? p : p.texto}</div>
      </div>`).join('')}</div></div>`;
  } else {
    const passo  = m.passos[passoAtivo];
    const texto  = typeof passo === 'string' ? passo : passo.texto;
    const imagem = typeof passo === 'object' && passo.imagem ? passo.imagem : '';
    const total  = m.passos.length;
    content = `
      <div class="manual-content-switch"><div class="manual-completo">
        ${buildManualPaginationHTML(
          total,
          passoAtivo,
          i => `renderManualFilho(manuais.find(x=>x.id===${m.id}),'completo',${i})`,
          `renderManualFilho(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo-1})`,
          `renderManualFilho(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo+1})`
        )}
        <div class="manual-passo-card">
          <div class="manual-passo-header">
            <span class="step-number">${passoAtivo+1}</span>
            <strong>Passo ${passoAtivo+1} de ${total}</strong>
          </div>
          <div class="manual-passo-body">
            <p class="manual-passo-texto">${texto}</p>
            ${imagem
              ? `<div class="manual-passo-img-container"><img src="${imagem}" class="manual-passo-img"/></div>`
              : `<div class="manual-passo-no-img"><i class="ph-bold ph-image-square"></i><span>Nenhuma imagem para este passo.</span></div>`}
          </div>
          <div class="manual-passo-footer">
            <button class="btn-passo" ${passoAtivo===0?'disabled':''}
                    onclick="renderManualFilho(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo-1})">
              <i class="ph-bold ph-arrow-left"></i> Anterior</button>
            <button class="btn-passo btn-passo-primary" ${passoAtivo===total-1?'disabled':''}
                    onclick="renderManualFilho(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo+1})">
              Próximo <i class="ph-bold ph-arrow-right"></i></button>
          </div>
        </div>
      </div></div>`;
  }

  const docs = (m.documentos || []).map(d => {
    const isObj = typeof d === 'object' && d !== null;
    const nome = isObj ? d.nome : d;
    const aid  = isObj ? d.arquivo_id : null;
    if (aid) {
      const a = arquivos.find(x => x.id === aid);
      if (a && (a.arquivo_data || a.url)) {
        const href = a.arquivo_data || a.url;
        const dl   = a.arquivo_data ? `download="${a.arquivo_nome || a.nome}"` : 'target="_blank" rel="noopener"';
        return `<a href="${href}" ${dl} class="doc-tag doc-tag-link" style="text-decoration:none">
          <i class="ph-bold ph-download-simple"></i>${nome}</a>`;
      }
    }
    return `<span class="doc-tag"><i class="ph-bold ph-file-text"></i>${nome}</span>`;
  }).join('');

  filho.innerHTML = `
    <div class="manual-transition-scope">
    <div class="manual-filho-header">
      <button class="manual-filho-back" onclick="fecharManualFilho()">
        <i class="ph-bold ph-arrow-left"></i> Voltar ao processo
      </button>
      <button class="detail-close" style="position:static;width:32px;height:32px" onclick="fecharProcessoCompleto()">
        <i class="ph-bold ph-x"></i>
      </button>
    </div>
    <span class="detail-badge">${m.categoria}</span>
    <div class="detail-name" style="margin-top:10px;font-size:1.3rem">${m.titulo}</div>
    <hr class="detail-divider">
    ${tabs}${content}
    ${docs ? `<hr class="detail-divider"><p class="detail-section-title">Documentos necessários</p><div class="docs-list">${docs}</div>` : ''}
    ${m.observacoes ? `<hr class="detail-divider"><p class="detail-section-title">Observações</p><div class="obs-box">${m.observacoes}</div>` : ''}
    </div>
  `;
  animateManualPanelContent(filho, modo, passoAtivo);
}

function fecharManualFilho() {
  closeNestedPanel({ panelId: 'manual-filho-panel' });
}

function fecharProcessoCompleto() {
  closeDetail('processo-detail-overlay');
}



/* ============================================================
   MÓDULO: ARQUIVOS
   Filtro por tags — múltiplas tags por arquivo, multi-seleção
   ============================================================ */

// Estado do filtro: conjunto de tags ativas (Set para facilitar toggle)
let tagsAtivas = new Set();
let extensoesAtivas = new Set();
let arquivoQuery = "";        // texto da busca em lowercase (usado nos filtros)
let arquivoQueryRaw = "";     // texto original digitado pelo usuário (usado no input)
let arquivosPaginaAtual = 1;
const ARQUIVOS_POR_PAGINA = 20;
const ARQUIVOS_UI_STATE_KEY = "smader_arquivos_ui_state_v1";
const ORDEM_EXTENSOES_ARQUIVO = [
  ".pdf",
  ".doc/.docx",
  ".xls/.xlsx",
  ".jpg/.jpeg",
  ".zip/.rar",
  ".png",
  ".txt"
];

function loadArquivosUIState() {
  try {
    const saved = localStorage.getItem(ARQUIVOS_UI_STATE_KEY);
    if (!saved) return;

    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") return;

    arquivoQueryRaw = typeof parsed.query === "string" ? parsed.query : "";
    arquivoQuery = arquivoQueryRaw.toLowerCase().trim();
    arquivosPaginaAtual = Number.isInteger(parsed.page) && parsed.page > 0 ? parsed.page : 1;
    tagsAtivas = new Set(Array.isArray(parsed.tags) ? parsed.tags.filter(Boolean) : []);
    extensoesAtivas = new Set(Array.isArray(parsed.extensoes) ? parsed.extensoes.filter(Boolean) : []);
  } catch (error) {
    console.warn("[Arquivos] Falha ao restaurar estado da interface:", error);
  }
}

function loadModuleSearchState() {
  try {
    const saved = localStorage.getItem(MODULE_SEARCH_STATE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn("[Busca] Falha ao restaurar estado de busca dos módulos:", error);
    return {};
  }
}

let moduleSearchState = loadModuleSearchState();

function getModuleSearchValue(moduleId) {
  return typeof moduleSearchState[moduleId] === "string" ? moduleSearchState[moduleId] : "";
}

function setModuleSearchValue(moduleId, value) {
  moduleSearchState[moduleId] = String(value || "");
  try {
    localStorage.setItem(MODULE_SEARCH_STATE_KEY, JSON.stringify(moduleSearchState));
  } catch (error) {
    console.warn("[Busca] Falha ao salvar estado de busca dos módulos:", error);
  }
}

function restoreModuleSearchInput(moduleId, inputId) {
  const input = document.getElementById(inputId);
  if (!input) return null;
  input.value = getModuleSearchValue(moduleId);
  return input;
}

function clearModuleSearch(moduleId, inputId, applyFnName) {
  setModuleSearchValue(moduleId, "");
  const input = document.getElementById(inputId);
  if (input) input.value = "";

  const applyFn = window[applyFnName];
  if (typeof applyFn === "function") {
    applyFn("");
  }
}

function persistArquivosUIState() {
  try {
    localStorage.setItem(ARQUIVOS_UI_STATE_KEY, JSON.stringify({
      query: arquivoQueryRaw,
      page: arquivosPaginaAtual,
      tags: Array.from(tagsAtivas),
      extensoes: Array.from(extensoesAtivas),
    }));
  } catch (error) {
    console.warn("[Arquivos] Falha ao salvar estado da interface:", error);
  }
}

function syncArquivosSearchInput() {
  const input = document.getElementById("arquivo-search");
  if (input) input.value = arquivoQueryRaw;
}

function sanitizeArquivosFilters() {
  const tagsDisponiveis = new Set(
    arquivos.flatMap((arquivo) => Array.isArray(arquivo.tags) ? arquivo.tags : [])
  );
  tagsAtivas = new Set(Array.from(tagsAtivas).filter((tag) => tagsDisponiveis.has(tag)));

  const extensoesDisponiveis = new Set(
    arquivos.map((arquivo) => getArquivoExtensaoGrupo(
      getArquivoExtensaoReal(arquivo) || getArquivoExtensaoFallbackPorTipo(arquivo.tipo)
    ))
  );
  extensoesAtivas = new Set(Array.from(extensoesAtivas).filter((grupo) => extensoesDisponiveis.has(grupo)));
}

function initArquivos() {
  loadArquivosUIState();
  sanitizeArquivosFilters();
  syncArquivosSearchInput();
  renderTagFilter();
  renderExtensaoFilter();
  renderArquivos();

  // Overlay de detalhe
  document.getElementById("arquivo-detail-close").addEventListener("click", closeDetail.bind(null, "arquivo-detail-overlay"));
  document.getElementById("arquivo-detail-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("arquivo-detail-overlay")) closeDetail("arquivo-detail-overlay");
  });

  // Busca por texto — filtra em tempo real
  const input = document.getElementById("arquivo-search");
  if (input) {
    input.value = arquivoQueryRaw;
    input.addEventListener("input", () => {
      arquivoQueryRaw = input.value;
      arquivoQuery = arquivoQueryRaw.toLowerCase().trim();
      arquivosPaginaAtual = 1;
      renderArquivos();
    });
  }
}

/**
 * Coleta todas as tags únicas do array arquivos,
 * renderiza os botões de filtro no topo da página.
 */
function renderTagFilter() {
  const container = document.getElementById("arquivos-tags");
  if (!container) return;

  // Extrai todas as tags únicas e ordena alfabeticamente
  const todasTags = [...new Set(arquivos.flatMap(a => a.tags))].sort();

  container.innerHTML = todasTags.map(tag => `
    <button class="tag-filter-btn ${tagsAtivas.has(tag) ? "active" : ""}" data-tag="${tag}" onclick="toggleTag('${tag}')">
      ${tag}
    </button>
  `).join("");
}

/**
 * Ativa ou desativa uma tag no filtro e re-renderiza a lista.
 * @param {string} tag
 */
function toggleTag(tag) {
  if (tagsAtivas.has(tag)) {
    tagsAtivas.delete(tag);
  } else {
    tagsAtivas.add(tag);
  }

  // Atualiza visual dos botões
  document.querySelectorAll("#arquivos-tags .tag-filter-btn").forEach(btn => {
    btn.classList.toggle("active", tagsAtivas.has(btn.dataset.tag));
  });

  // Atualiza contador de resultados e lista
  arquivosPaginaAtual = 1;
  renderArquivos();
}

function getArquivoExtensaoReal(arquivo) {
  const candidatos = [arquivo.arquivo_nome, arquivo.url]
    .filter(Boolean)
    .map(valor => String(valor).trim());

  for (const candidato of candidatos) {
    const semQuery = candidato.split("?")[0].split("#")[0];
    const ultimoTrecho = semQuery.split("/").pop() || semQuery;
    const match = ultimoTrecho.match(/\.([a-z0-9]+)$/i);
    if (match) return `.${match[1].toLowerCase()}`;

    if (/^[a-z0-9]{2,5}$/i.test(ultimoTrecho) && !ultimoTrecho.includes(" ")) {
      return `.${ultimoTrecho.toLowerCase()}`;
    }
  }

  return "";
}

function getArquivoExtensaoFallbackPorTipo(tipo) {
  const normalizado = String(tipo || "").trim().toLowerCase();

  switch (normalizado) {
    case "pdf":
      return ".pdf";
    case "doc":
    case "docx":
      return ".doc/.docx";
    case "xls":
    case "xlsx":
      return ".xls/.xlsx";
    case "jpg":
    case "jpeg":
      return ".jpg/.jpeg";
    case "zip":
    case "rar":
      return ".zip/.rar";
    case "png":
      return ".png";
    case "txt":
      return ".txt";
    default:
      return normalizado ? `.${normalizado}` : "__sem_extensao__";
  }
}

function getArquivoExtensaoGrupo(extensao) {
  switch (extensao) {
    case ".doc":
    case ".docx":
      return ".doc/.docx";
    case ".xls":
    case ".xlsx":
      return ".xls/.xlsx";
    case ".jpg":
    case ".jpeg":
      return ".jpg/.jpeg";
    case ".zip":
    case ".rar":
      return ".zip/.rar";
    default:
      return extensao;
  }
}

function getArquivoExtensaoLabel(grupo) {
  return grupo === "__sem_extensao__" ? "Sem extensão" : grupo;
}

function renderExtensaoFilter() {
  const container = document.getElementById("arquivos-extensoes");
  if (!container) return;

  const grupos = [...new Set(
    arquivos.map(a => getArquivoExtensaoGrupo(getArquivoExtensaoReal(a) || getArquivoExtensaoFallbackPorTipo(a.tipo)))
  )];

  const ordenados = grupos.sort((a, b) => {
    const ia = ORDEM_EXTENSOES_ARQUIVO.indexOf(a);
    const ib = ORDEM_EXTENSOES_ARQUIVO.indexOf(b);

    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }

    if (a === "__sem_extensao__") return 1;
    if (b === "__sem_extensao__") return -1;
    return a.localeCompare(b, "pt-BR");
  });

  container.innerHTML = ordenados.map(grupo => `
    <button class="tag-filter-btn ${extensoesAtivas.has(grupo) ? "active" : ""}" data-ext="${grupo}" onclick="toggleExtensao('${grupo}')">
      ${getArquivoExtensaoLabel(grupo)}
    </button>
  `).join("");
}

function toggleExtensao(grupo) {
  if (extensoesAtivas.has(grupo)) {
    extensoesAtivas.delete(grupo);
  } else {
    extensoesAtivas.add(grupo);
  }

  document.querySelectorAll("#arquivos-extensoes .tag-filter-btn").forEach(btn => {
    btn.classList.toggle("active", extensoesAtivas.has(btn.dataset.ext));
  });

  arquivosPaginaAtual = 1;
  renderArquivos();
}

/**
 * Limpa todos os filtros ativos.
 */
function limparFiltros() {
  tagsAtivas.clear();
  extensoesAtivas.clear();
  arquivoQuery = "";
  arquivoQueryRaw = "";
  arquivosPaginaAtual = 1;
  const input = document.getElementById("arquivo-search");
  if (input) input.value = "";
  document.querySelectorAll("#arquivos-tags .tag-filter-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll("#arquivos-extensoes .tag-filter-btn").forEach(btn => btn.classList.remove("active"));
  persistArquivosUIState();
  renderArquivos();
}

function goToArquivosPage(page) {
  arquivosPaginaAtual = page;
  renderArquivos();
}

function getArquivosPaginationItems(totalPaginas, paginaAtual) {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  if (paginaAtual <= 3) {
    return [1, 2, 3, 4, "...", totalPaginas];
  }

  if (paginaAtual >= totalPaginas - 2) {
    return [1, "...", totalPaginas - 3, totalPaginas - 2, totalPaginas - 1, totalPaginas];
  }

  return [1, "...", paginaAtual - 1, paginaAtual, paginaAtual + 1, "...", totalPaginas];
}

function renderArquivosPagination(totalItens) {
  const container = document.getElementById("arquivos-pagination");
  if (!container) return;

  const totalPaginas = Math.ceil(totalItens / ARQUIVOS_POR_PAGINA);
  if (totalPaginas <= 1) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }

  const itens = getArquivosPaginationItems(totalPaginas, arquivosPaginaAtual);
  container.hidden = false;
  container.innerHTML = `
    <div class="arquivos-pagination-summary">
      Página ${arquivosPaginaAtual} de ${totalPaginas} · ${totalItens} resultado${totalItens === 1 ? "" : "s"}
    </div>
    <button class="arquivos-page-btn" ${arquivosPaginaAtual === 1 ? "disabled" : ""}
      onclick="goToArquivosPage(${arquivosPaginaAtual - 1})">
      <i class="ph-bold ph-caret-left"></i>
      Anterior
    </button>
    <div class="arquivos-page-numbers">
      ${itens.map(item => item === "..."
        ? `<span class="arquivos-page-ellipsis">...</span>`
        : `<button class="arquivos-page-btn arquivos-page-btn--number ${item === arquivosPaginaAtual ? "is-active" : ""}"
            onclick="goToArquivosPage(${item})">${item}</button>`
      ).join("")}
    </div>
    <button class="arquivos-page-btn" ${arquivosPaginaAtual === totalPaginas ? "disabled" : ""}
      onclick="goToArquivosPage(${arquivosPaginaAtual + 1})">
      Próxima
      <i class="ph-bold ph-caret-right"></i>
    </button>
  `;
}

function animateGridReflow(container, renderFn, selector = "[data-reflow-id]") {

  const anteriores = new Map(
    Array.from(container.querySelectorAll(selector)).map(card => [
      card.dataset.reflowId,
      {
        rect: card.getBoundingClientRect(),
        node: card
      }
    ])
  );

  renderFn();

  const atuais = Array.from(container.querySelectorAll(selector));
  const atuaisIds = new Set(atuais.map(card => card.dataset.reflowId));

  anteriores.forEach((item, id) => {
    if (atuaisIds.has(id)) return;

    const ghost = item.node.cloneNode(true);
    ghost.style.position = "fixed";
    ghost.style.left = `${item.rect.left}px`;
    ghost.style.top = `${item.rect.top}px`;
    ghost.style.width = `${item.rect.width}px`;
    ghost.style.height = `${item.rect.height}px`;
    ghost.style.margin = "0";
    ghost.style.zIndex = "250";
    ghost.style.pointerEvents = "none";
    ghost.style.transformOrigin = "center top";
    document.body.appendChild(ghost);

    const anim = ghost.animate(
      [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(0.96)" }
      ],
      {
        duration: 180,
        easing: "ease-out",
        fill: "forwards"
      }
    );

    anim.onfinish = () => ghost.remove();
  });

  atuais.forEach((card, index) => {
    const anterior = anteriores.get(card.dataset.reflowId);
    const atual = card.getBoundingClientRect();

    if (anterior) {
      const dx = anterior.rect.left - atual.left;
      const dy = anterior.rect.top - atual.top;

      if (dx || dy) {
        card.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: "translate(0, 0)" }
          ],
          {
            duration: 280,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)"
          }
        );
      }
      return;
    }

    card.animate(
      [
        { opacity: 0, transform: "translateY(10px) scale(0.985)" },
        { opacity: 1, transform: "translateY(0) scale(1)" }
      ],
      {
        duration: 240,
        delay: Math.min(index * 18, 90),
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both"
      }
    );
  });
}

function animateArquivosGrid(container, renderFn) {
  animateGridReflow(container, renderFn, ".arquivo-card[data-reflow-id]");
}

function buildArquivoCardTagsHTML(tags = []) {
  const normalizedTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  const visibleTags = normalizedTags.slice(0, 2);
  const hiddenCount = Math.max(0, normalizedTags.length - visibleTags.length);

  const visibleHTML = visibleTags.map((tag) =>
    `<span class="arquivo-tag ${tagsAtivas.has(tag) ? 'highlight' : ''}">${tag}</span>`
  ).join("");

  const moreHTML = hiddenCount > 0
    ? `<span class="arquivo-tag arquivo-tag-more">+${hiddenCount}</span>`
    : "";

  return visibleHTML + moreHTML;
}

function getManualPaginationWindow(total, passoAtivo) {
  const visible = window.innerWidth < 640 ? 7 : 9;
  const centro = Math.floor(visible / 2);
  const paginaAtual = passoAtivo + 1;
  const inicio = paginaAtual - centro;

  return Array.from({ length: visible }, (_, i) => {
    const pagina = inicio + i;
    return pagina >= 1 && pagina <= total ? pagina : null;
  });
}

function buildManualPaginationHTML(total, passoAtivo, onSelect, onPrev, onNext) {
  const paginas = getManualPaginationWindow(total, passoAtivo);
  return `
    <div class="manual-paginacao">
      <button class="pag-arrow" ${passoAtivo === 0 ? "disabled" : ""} onclick="${onPrev}" aria-label="Passo anterior">
        <i class="ph-bold ph-caret-left"></i>
      </button>
      <div class="manual-paginacao-track">
        ${paginas.map((pagina, i) => pagina
          ? `<button class="pag-dot manual-pag-item ${pagina === passoAtivo + 1 ? "active" : ""}" data-reflow-id="manual-page-${pagina}" onclick="${onSelect(pagina - 1)}" title="Passo ${pagina}">${pagina}</button>`
          : `<span class="pag-placeholder manual-pag-item" data-reflow-id="manual-gap-${i}"></span>`
        ).join("")}
      </div>
      <button class="pag-arrow" ${passoAtivo === total - 1 ? "disabled" : ""} onclick="${onNext}" aria-label="Próximo passo">
        <i class="ph-bold ph-caret-right"></i>
      </button>
    </div>
  `;
}

function centerActiveManualPagination(container, direcao = 0) {
  const track = container.querySelector(".manual-paginacao-track");
  if (!track) return;

  const dotSize = 28 + 8; // width + gap em px
  const deslocamento = direcao * dotSize;

  if (deslocamento !== 0) {
    track.animate(
      [
        { transform: `translateX(${deslocamento}px)`, opacity: 0.5 },
        { transform: "translateX(0)",                 opacity: 1   }
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both"
      }
    );
  }
}

function animateManualPanelContent(container, modo, passoAtivo = 0) {
  const modoAnterior = container.dataset.manualModo || "";
  const passoAnterior = Number(container.dataset.manualPasso || 0);

  container.dataset.manualModo = modo;
  container.dataset.manualPasso = String(passoAtivo);

  // Direção: positivo = avançando (track desliza da direita), negativo = voltando
  const direcao = passoAtivo - passoAnterior;
  centerActiveManualPagination(container, direcao);

  if (!modoAnterior) return;

  if (modoAnterior !== modo) {
    const scope = container.querySelector(".manual-content-switch");
    if (!scope) return;
    const deslocamento = modo === "completo" ? 28 : -28;
    scope.animate(
      [
        { opacity: 0, transform: `translateX(${deslocamento}px)` },
        { opacity: 1, transform: "translateX(0)" }
      ],
      {
        duration: 240,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both"
      }
    );
    return;
  }

  if (modo === "completo" && passoAnterior !== passoAtivo) {
    const card = container.querySelector(".manual-passo-card");
    if (!card) return;
    const deslocamento = passoAtivo > passoAnterior ? 34 : -34;
    card.animate(
      [
        { opacity: 0, transform: `translateX(${deslocamento}px)` },
        { opacity: 1, transform: "translateX(0)" }
      ],
      {
        duration: 1120,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both"
      }
    );
  }
}

/**
 * Renderiza os cards de arquivos de acordo com as tags ativas.
 * Se nenhuma tag estiver ativa, mostra todos.
 */
function renderArquivos() {
  const container = document.getElementById("arquivos-list");
  const contador  = document.getElementById("arquivos-contador");
  const paginacao = document.getElementById("arquivos-pagination");
  if (!container) return;

  const filtrados = arquivos.filter(a => {
    const passaTag   = tagsAtivas.size === 0 || a.tags.some(t => tagsAtivas.has(t));
    const extensaoGrupo = getArquivoExtensaoGrupo(getArquivoExtensaoReal(a) || getArquivoExtensaoFallbackPorTipo(a.tipo));
    const passaExtensao = extensoesAtivas.size === 0 || extensoesAtivas.has(extensaoGrupo);
    const passaTexto = arquivoQuery === "" || a.nome.toLowerCase().includes(arquivoQuery);
    return passaTag && passaExtensao && passaTexto;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ARQUIVOS_POR_PAGINA));
  arquivosPaginaAtual = Math.min(arquivosPaginaAtual, totalPaginas);
  persistArquivosUIState();

  const inicio = (arquivosPaginaAtual - 1) * ARQUIVOS_POR_PAGINA;
  const fim = inicio + ARQUIVOS_POR_PAGINA;
  const paginaAtualItens = filtrados.slice(inicio, fim);

  if (contador) {
    const filtroAtivo = tagsAtivas.size > 0 || extensoesAtivas.size > 0 || arquivoQuery !== "";
    if (filtrados.length === 0) {
      contador.textContent = filtroAtivo ? "0 resultados" : "0 arquivos";
    } else {
      const inicioLabel = inicio + 1;
      const fimLabel = Math.min(fim, filtrados.length);
      contador.textContent = filtroAtivo
        ? `${inicioLabel}–${fimLabel} de ${filtrados.length} resultados · pág. ${arquivosPaginaAtual}/${totalPaginas}`
        : `${inicioLabel}–${fimLabel} de ${arquivos.length} arquivos · pág. ${arquivosPaginaAtual}/${totalPaginas}`;
    }
  }

  const tipoIcone = { PDF: "ph-file-pdf", XLSX: "ph-file-xls", DOCX: "ph-file-doc" };
  const tipoCor   = { PDF: "#7a3d3d", XLSX: "#3d7a5e", DOCX: "#3d5c7a" };

  if (filtrados.length === 0) {
    const filtroAtivo = tagsAtivas.size > 0 || extensoesAtivas.size > 0 || arquivoQuery !== "";
    container.innerHTML = `
      <div class="arquivos-vazio">
        <i class="ph-bold ${filtroAtivo ? "ph-funnel-x" : "ph-folder-open"}"></i>
        <p>${filtroAtivo ? "Nenhum arquivo encontrado com os filtros atuais." : "Nenhum arquivo cadastrado no momento."}</p>
        <span>${filtroAtivo ? "Tente ajustar a busca ou limpar os filtros para voltar à listagem completa." : "Quando novos arquivos forem cadastrados, eles aparecerão aqui."}</span>
        ${filtroAtivo ? `<button onclick="limparFiltros()">Limpar filtros</button>` : ""}
      </div>`;
    if (paginacao) {
      paginacao.innerHTML = "";
      paginacao.hidden = true;
    }
    return;
  }

  animateArquivosGrid(container, () => {
  container.innerHTML = paginaAtualItens.map(a => {
    const cor   = tipoCor[a.tipo]   || "#5a6354";
    const icone = tipoIcone[a.tipo] || "ph-file";
    const temArquivo = a.arquivo_data || a.arquivo_nome || a.url;
    const extensaoGrupo = getArquivoExtensaoGrupo(getArquivoExtensaoReal(a) || getArquivoExtensaoFallbackPorTipo(a.tipo));
    const tagsHTML = buildArquivoCardTagsHTML(a.tags);

    return `
      <div class="list-card arquivo-card" data-reflow-id="arquivo-${a.id}" onclick="openArquivo(${a.id})">
        <div class="list-card-header">
          <div class="list-card-avatar icon-avatar" style="color:${cor}">
            <i class="ph-bold ${icone}"></i>
          </div>
          <div style="min-width:0;flex:1">
            <div class="list-card-title arquivo-nome-clamp">${a.nome}</div>
            <div class="list-card-sub">${getArquivoExtensaoLabel(extensaoGrupo)}${temArquivo ? ' · <span class="arquivo-disponivel">disponível</span>' : ''}</div>
          </div>
        </div>
        <div class="arquivo-tags-row">${tagsHTML}</div>
      </div>`;
  }).join("");
  });

  renderArquivosPagination(filtrados.length);
}

/** Abre o detail-panel de um arquivo com informações completas e botão de download */
function openArquivo(id) {
  const a = arquivos.find(x => x.id === id);
  if (!a) return;

  const tipoIcone = { PDF: "ph-file-pdf", XLSX: "ph-file-xls", DOCX: "ph-file-doc" };
  const tipoCor   = { PDF: "#7a3d3d", XLSX: "#3d7a5e", DOCX: "#3d5c7a" };
  const cor   = tipoCor[a.tipo]   || "#5a6354";
  const icone = tipoIcone[a.tipo] || "ph-file";

  const tagsHTML = (a.tags || []).map(t =>
    `<span class="doc-tag"><i class="ph-bold ph-tag"></i>${t}</span>`
  ).join("");

  let acaoHTML = '';
  if (a.arquivo_data) {
    acaoHTML = `
      <a href="${a.arquivo_data}" download="${a.arquivo_nome || a.nome}" class="sistema-btn">
        <i class="ph-bold ph-download-simple"></i> Baixar arquivo
      </a>`;
  } else if (a.url) {
    acaoHTML = `
      <a href="${a.url}" target="_blank" rel="noopener" class="sistema-btn">
        <i class="ph-bold ph-arrow-square-out"></i> Abrir link externo
      </a>`;
  } else {
    acaoHTML = `<p class="detail-desc" style="color:var(--text-muted)">Nenhum arquivo ou link disponível para este registro.</p>`;
  }

  document.getElementById("arquivo-detail-content").innerHTML = `
    <div class="detail-avatar-large" style="background:color-mix(in srgb,${cor} 12%,transparent);color:${cor}">
      <i class="ph-bold ${icone}"></i>
    </div>
    <div class="detail-name">${a.nome}</div>
    <span class="detail-badge">${a.tipo}</span>
    <hr class="detail-divider">
    <p class="detail-section-title">Informações</p>
    <div class="detail-info-grid">
      <div class="detail-info-item">
        <label>Tipo</label>
        <span>${a.tipo}</span>
      </div>
      <div class="detail-info-item">
        <label>Origem</label>
        <span>${a.arquivo_data ? 'Upload local' : a.url ? 'Link externo' : 'Não definida'}</span>
      </div>
      ${a.arquivo_nome ? `
      <div class="detail-info-item" style="grid-column:1/-1">
        <label>Nome original do arquivo</label>
        <span>${a.arquivo_nome}</span>
      </div>` : ''}
      ${a.url && !a.arquivo_data ? `
      <div class="detail-info-item" style="grid-column:1/-1">
        <label>Link externo</label>
        <span style="word-break:break-all;font-size:.8rem">${a.url}</span>
      </div>` : ''}
    </div>
    ${tagsHTML ? `
    <hr class="detail-divider">
    <p class="detail-section-title">Tags</p>
    <div class="docs-list">${tagsHTML}</div>` : ''}
    <hr class="detail-divider">
    ${acaoHTML}
  `;

  openDetail("arquivo-detail-overlay");
}


/* ============================================================
   BUSCA GLOBAL (Dashboard)
   Indexa todos os módulos campo a campo.
   Resultado: Módulo > Nome do item > Campo > Valor encontrado
   ============================================================ */
function initSearch() {
  const input     = document.getElementById("global-search");
  const resultsBox = document.getElementById("search-results");
  let searchDebounceTimer = null;
  if (!input || !resultsBox) return;

  scheduleGlobalSearchIndexBuild();

  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    if (q.length < 2) { resultsBox.classList.remove("visible"); resultsBox.innerHTML = ""; return; }

    searchDebounceTimer = setTimeout(() => {
      const results = buildGlobalIndex(q);
      renderGlobalResults(results, resultsBox, input);
    }, 300);
  });

  // Navegar com teclado (↑ ↓ Enter)
  input.addEventListener("keydown", (e) => {
    const items = resultsBox.querySelectorAll(".search-result-item");
    let cur = resultsBox.querySelector(".search-result-item.focused");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = cur ? cur.nextElementSibling : items[0];
      if (next) { cur?.classList.remove("focused"); next.classList.add("focused"); next.scrollIntoView({ block: "nearest" }); }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = cur?.previousElementSibling;
      if (prev) { cur.classList.remove("focused"); prev.classList.add("focused"); prev.scrollIntoView({ block: "nearest" }); }
    } else if (e.key === "Enter") {
      const focused = resultsBox.querySelector(".search-result-item.focused");
      if (focused) focused.click();
    } else if (e.key === "Escape") {
      resultsBox.classList.remove("visible");
      input.blur();
    }
  });

  // Fecha ao clicar fora
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !resultsBox.contains(e.target))
      resultsBox.classList.remove("visible");
  });
}

/**
 * Busca global rankeada — retorna um resultado por item, ordenado por score.
 *
 * Score por tier:
 *   Tier 1 (nome/título principal): 100
 *   Tier 2 (campos secundários identificadores): 50
 *   Tier 3 (texto livre — descrição, observações, passos): 10
 *
 * Dentro do mesmo score, a ordem de inserção no índice é preservada
 * (módulos mais relevantes primeiro: Funcionários, Manuais, etc.).
 */
function buildGlobalIndex(query) {
  const q = query.toLowerCase().trim();
  if (!globalSearchIndexReady) rebuildGlobalSearchIndex();

  const resultados = [];

  for (const item of globalSearchIndex) {
    // Encontra o tier com maior score que bate com a query.
    // Se o melhor match for o próprio título, tenta mostrar um único
    // contexto complementar do mesmo item sem alterar o ranking.
    const camposComMatch = item.campos.filter(campo => campo.searchText.includes(q));
    if (camposComMatch.length === 0) continue;

    let melhorScore = 0;
    let melhorCampo = null;

    for (const campo of camposComMatch) {
      if (campo.tier > melhorScore) {
        melhorScore = campo.tier;
        melhorCampo = campo;
      }
    }

    if (melhorScore === 0) continue;

    const nomeNormalizado = item.itemNome.toLowerCase();
    let campoDeContexto = melhorCampo;

    if (melhorCampo && melhorCampo.valor.toLowerCase() === nomeNormalizado) {
      campoDeContexto =
        camposComMatch.find(campo =>
          campo !== melhorCampo &&
          campo.tier === melhorScore &&
          campo.valor.toLowerCase() !== nomeNormalizado
        ) ||
        camposComMatch.find(campo =>
          campo !== melhorCampo &&
          campo.valor.toLowerCase() !== nomeNormalizado
        ) ||
        melhorCampo;
    }

    resultados.push({
      modulo:        item.modulo,
      itemNome:      item.itemNome,
      contextoLabel: campoDeContexto?.label || "",
      contextoValor: campoDeContexto?.valor || "",
      score:         melhorScore,
      action:        item.action,
    });
  }

  // Ordena: maior score primeiro; empate mantém ordem de inserção
  resultados.sort((a, b) => b.score - a.score);
  return resultados;
}

function rebuildGlobalSearchIndex() {
  const entries = [];

  /**
   * Registra um item no índice.
   * @param {string}   modulo   - Nome do módulo
   * @param {string}   itemNome - Nome/título principal do item
   * @param {Array}    campos   - [{tier, label, valor}] — campos com seus pesos
   * @param {Function} action   - O que fazer ao clicar no resultado
   */
  function addItem(modulo, itemNome, campos, action) {
    const camposValidos = campos
      .filter(c => c.valor !== undefined && c.valor !== null && String(c.valor).trim() !== "")
      .map(c => ({
        tier:       c.tier,
        label:      c.label,
        valor:      String(c.valor),
        searchText: String(c.valor).toLowerCase(),
      }));

    if (camposValidos.length === 0) return;

    entries.push({ modulo, itemNome, campos: camposValidos, action });
  }

  // Atalhos de tier para clareza
  const T1 = 100; // nome/título principal
  const T2 = 50;  // identificadores secundários (cargo, categoria, placa, órgão...)
  const T3 = 10;  // texto livre (descrição, observações, passos, campos de contato)

  funcionarios.forEach(f => {
    const ir = () => { navigateTo("funcionarios"); setTimeout(() => openFuncionario(f.id), 120); };
    addItem("Funcionários", f.nome, [
      { tier: T1, label: "Nome",        valor: f.nome },
      { tier: T2, label: "Cargo",       valor: f.cargo },
      { tier: T2, label: "Lotação",     valor: f.lotacao || f.setor },
      { tier: T2, label: "Matrícula",   valor: f.matricula },
      { tier: T2, label: "E-mail",      valor: f.email },
      { tier: T2, label: "Telefone",    valor: f.telefone },
      { tier: T2, label: "CPF",         valor: f.cpf },
      { tier: T3, label: "Descrição",   valor: f.descricao },
    ], ir);
  });

  manuais.forEach(m => {
    const ir = () => { navigateTo("manuais"); setTimeout(() => openManual(m.id), 120); };
    const passosCampos = (m.passos || []).map((p, i) => ({
      tier: T3,
      label: `Passo ${i + 1}`,
      valor: typeof p === "object" ? (p.texto || p.descricao || "") : p,
    }));
    const docsCampos = (m.documentos || []).map(d => ({
      tier: T3,
      label: "Documento necessário",
      valor: typeof d === "object" ? d.nome : d,
    }));
    addItem("Manuais", m.titulo, [
      { tier: T1, label: "Título",       valor: m.titulo },
      { tier: T2, label: "Categoria",    valor: m.categoria },
      { tier: T3, label: "Observações",  valor: m.observacoes },
      ...passosCampos,
      ...docsCampos,
    ], ir);
  });

  processos.forEach(p => {
    const ir = () => { navigateTo("processos"); setTimeout(() => openProcesso(p.id), 120); };
    const etapasCampos = (p.etapas || []).flatMap(e => [
      { tier: T2, label: "Etapa",      valor: e.titulo },
      { tier: T3, label: "Descrição",  valor: e.descricao },
    ]);
    addItem("Processos", p.titulo, [
      { tier: T1, label: "Título",    valor: p.titulo },
      { tier: T2, label: "Categoria", valor: p.categoria },
      ...etapasCampos,
    ], ir);
  });

  arquivos.forEach(a => {
    const ir = () => { navigateTo("arquivos"); setTimeout(() => openArquivo(a.id), 120); };
    const tagsCampos = (a.tags || []).map(t => ({ tier: T2, label: "Tag", valor: t }));
    addItem("Arquivos", a.nome, [
      { tier: T1, label: "Nome", valor: a.nome },
      { tier: T2, label: "Tipo", valor: a.tipo },
      ...tagsCampos,
    ], ir);
  });

  infoJuridico.forEach(item => {
    const ir = () => { navigateTo("informacoes"); setTimeout(() => openJuridico(item.id), 120); };
    const camposCampos = (item.campos || []).map(c => ({ tier: T3, label: c.label, valor: c.valor }));
    addItem("Secretaria", item.titulo, [
      { tier: T1, label: "Bloco",  valor: item.titulo },
      { tier: T2, label: "Badge", valor: item.badge || item.tag },
      ...camposCampos,
    ], ir);
  });

  infoMunicipio.forEach(item => {
    const ir = () => { navigateTo("informacoes"); setTimeout(() => openMunicipio(item.id), 120); };
    const camposCampos = (item.campos || []).map(c => ({ tier: T3, label: c.label, valor: c.valor }));
    addItem("Município", item.titulo, [
      { tier: T1, label: "Bloco", valor: item.titulo },
      { tier: T2, label: "Tag",   valor: item.tag || item.badge },
      ...camposCampos,
    ], ir);
  });

  infoOrgaos.forEach(item => {
    const ir = () => { navigateTo("informacoes"); setTimeout(() => openOrgao(item.id), 120); };
    const camposCampos = (item.campos || []).map(c => ({ tier: T3, label: c.label, valor: c.valor }));
    addItem("Órgãos", item.titulo, [
      { tier: T1, label: "Sigla",        valor: item.titulo },
      { tier: T1, label: "Nome",         valor: item.nome_completo },
      { tier: T3, label: "Atribuição",   valor: item.atribuicao },
      ...camposCampos,
    ], ir);
  });

  veiculos.forEach(v => {
    const ir = () => { navigateTo("veiculos"); setTimeout(() => openVeiculo(v.id), 120); };
    addItem("Veículos", v.nome, [
      { tier: T1, label: "Nome",        valor: v.nome },
      { tier: T2, label: "Placa",       valor: v.placa },
      { tier: T2, label: "Modelo",      valor: `${v.marca} ${v.modelo}`.trim() },
      { tier: T2, label: "Tipo",        valor: v.tipo },
      { tier: T2, label: "Situação",    valor: v.situacao },
      { tier: T2, label: "Patrimônio",  valor: v.patrimonio },
      { tier: T2, label: "Motorista",   valor: v.motorista },
      { tier: T3, label: "Chassi",      valor: v.chassi },
      { tier: T3, label: "RENAVAM",     valor: v.renavam },
      { tier: T3, label: "Localização", valor: v.localizacao },
      { tier: T3, label: "Observações", valor: v.obs },
    ], ir);
  });

  sistemas.forEach(s => {
    const ir = () => { navigateTo("sistemas"); setTimeout(() => openSistema(s.id), 120); };
    addItem("Sistemas", s.nome, [
      { tier: T1, label: "Nome",        valor: s.nome },
      { tier: T1, label: "Nome completo", valor: s.nome_completo },
      { tier: T2, label: "Órgão",       valor: s.orgao },
      { tier: T2, label: "Acesso",      valor: s.acesso },
      { tier: T3, label: "Descrição",   valor: s.descricao },
      { tier: T3, label: "URL",         valor: s.url },
    ], ir);
  });

  servicos.forEach(s => {
    const ir = () => { navigateTo("servicos"); setTimeout(() => openServico(s.id), 120); };
    const docsCampos = (s.documentos || []).map(d => ({
      tier: T3,
      label: "Documento",
      valor: typeof d === "object" ? d.nome : d,
    }));
    addItem("Serviços", s.nome, [
      { tier: T1, label: "Nome",           valor: s.nome },
      { tier: T2, label: "Categoria",      valor: s.categoria },
      { tier: T2, label: "Público-alvo",   valor: s.publico },
      { tier: T3, label: "Descrição",      valor: s.descricao },
      { tier: T3, label: "Como solicitar", valor: s.como_solicitar },
      { tier: T3, label: "Prazo",          valor: s.prazo },
      { tier: T3, label: "Observações",    valor: s.obs },
      ...docsCampos,
    ], ir);
  });

  avisos.forEach(a => {
    const ir = () => { navigateTo("agenda"); setTimeout(() => openAviso(a.id), 120); };
    addItem("Avisos", a.titulo, [
      { tier: T1, label: "Título",    valor: a.titulo },
      { tier: T2, label: "Tipo",      valor: tipoAviso[a.tipo]?.label || a.tipo },
      { tier: T2, label: "Local",     valor: a.local },
      { tier: T3, label: "Descrição", valor: a.desc },
    ], ir);
  });

  agendaEventos.forEach(e => {
    const ir = () => { navigateTo("agenda"); setTimeout(() => openEvento(e.id), 120); };
    addItem("Agenda", e.titulo, [
      { tier: T1, label: "Título",    valor: e.titulo },
      { tier: T2, label: "Tipo",      valor: tipoEvento[e.tipo]?.label || e.tipo },
      { tier: T2, label: "Local",     valor: e.local },
      { tier: T2, label: "Data",      valor: formatDateBR(e.data) },
      { tier: T3, label: "Descrição", valor: e.desc },
    ], ir);
  });

  globalSearchIndex = entries;
  globalSearchIndexReady = true;
  globalSearchIndexBuilding = false;
}

/** Destaca a substring encontrada em negrito */
function highlightMatch(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx))
    + `<mark>${escapeHtml(text.slice(idx, idx + query.length))}</mark>`
    + escapeHtml(text.slice(idx + query.length));
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/** Renderiza a lista de resultados no dropdown */
function renderGlobalResults(results, resultsBox, input) {
  const q = input.value.trim();

  if (results.length === 0) {
    resultsBox.innerHTML = `
      <div class="search-empty">
        <i class="ph-bold ph-magnifying-glass"></i>
        Nenhum resultado para "<strong>${escapeHtml(q)}</strong>"
      </div>`;
    resultsBox.classList.add("visible");
    return;
  }

  const shown   = results.slice(0, 10);
  const hasMore = results.length > 10;

  // Contexto: se o valor é o próprio nome do item, não repete — mostra o label do campo
  function buildContexto(r) {
    const valorIgualNome = r.contextoValor.toLowerCase() === r.itemNome.toLowerCase();
    if (valorIgualNome) {
      // O match foi no próprio título — contexto fica vazio (nome já aparece acima)
      return "";
    }
    const labelHTML = `<span class="result-ctx-label">${escapeHtml(r.contextoLabel)}:</span>`;
    const valorHTML = highlightMatch(truncarContexto(r.contextoValor, q, 60), q);
    return `${labelHTML} ${valorHTML}`;
  }

  resultsBox.innerHTML = shown.map((r, i) => {
    const contexto = buildContexto(r);
    return `
      <div class="search-result-item search-result-item--enter" data-index="${i}" style="--search-enter-delay:${Math.min(i, 5) * 26}ms">
        <div class="result-linha-1">
          <span class="result-modulo">${escapeHtml(r.modulo)}</span>
          <span class="result-item-nome">${highlightMatch(r.itemNome, q)}</span>
        </div>
        ${contexto ? `<div class="result-linha-2">${contexto}</div>` : ""}
      </div>
    `;
  }).join("") + (hasMore ? `
    <div class="search-more">+${results.length - 10} resultados — refine a busca</div>
  ` : "");

  resultsBox.querySelectorAll(".search-result-item").forEach((el, i) => {
    el.addEventListener("click", () => {
      shown[i].action();
      input.value = "";
      resultsBox.classList.remove("visible");
      resultsBox.innerHTML = "";
    });
  });

  resultsBox.classList.add("visible");
}

/**
 * Recorta o valor ao redor da query para mostrar contexto relevante.
 * Ex: "...assistência técnica e extensão rural..." ao buscar "extensão"
 */
function truncarContexto(texto, query, maxLen = 60) {
  const idx = texto.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return texto.slice(0, maxLen) + (texto.length > maxLen ? "…" : "");

  const meio = Math.floor(maxLen / 2);
  const inicio = Math.max(0, idx - meio);
  const fim = Math.min(texto.length, inicio + maxLen);
  const trecho = texto.slice(inicio, fim);

  return (inicio > 0 ? "…" : "") + trecho + (fim < texto.length ? "…" : "");
}


/* ============================================================
   HELPERS — Overlay de detalhe
   ============================================================ */
function openDetail(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;

  overlay.hidden = false;
  overlay.classList.remove("is-closing");

  requestAnimationFrame(() => {
    overlay.classList.add("open");
    document.body.style.overflow = "hidden"; // previne scroll do fundo
  });
}

function resetDetailPanels(overlayId) {
  const panelMap = {
    "processo-detail-overlay": ["manual-filho-panel"],
    "sistema-detail-overlay": ["sistema-filho-panel", "sistema-neto-panel"],
    "servico-detail-overlay": ["servico-filho-panel", "servico-neto-panel"],
  };

  (panelMap[overlayId] || []).forEach((panelId) => {
    const panel = document.getElementById(panelId);
    if (panel) panel.remove();
  });
}

const DETAIL_CLOSE_TRANSITION_MS = 200;

function getInstagramWidgetHTML() {
  return `
    <div class="side-widget dash-instagram-widget" data-widget="instagram" data-open="true">
      <div class="side-widget-header">
        <button class="widget-toggle-btn" data-target="instagram" aria-expanded="true">
          <i class="ph-bold ph-instagram-logo"></i>
          <span>Instagram</span>
          <i class="ph-bold ph-caret-down widget-chevron"></i>
        </button>
        <a href="https://instagram.com/smader_luziania" target="_blank" rel="noopener" class="ig-follow-btn">
          <i class="ph-bold ph-arrow-square-out"></i> Ver perfil
        </a>
      </div>
      <div class="side-widget-body" id="body-instagram">
        <div class="ig-info-box">
          <i class="ph-bold ph-lock-key"></i>
          <div>
            <strong>Integração via API do Instagram</strong>
            <p>Para exibir postagens automáticas, configure o token de acesso do Instagram Basic Display API no campo abaixo e recarregue a página.</p>
            <div class="ig-token-row">
              <input type="text" id="ig-token-input" placeholder="Cole seu Access Token aqui..." />
              <button id="ig-token-save">Salvar</button>
            </div>
          </div>
        </div>
        <div class="ig-grid" id="ig-grid"></div>
      </div>
    </div>
  `;
}

function renderDashboardInstagramWidget() {
  const belowSlot = document.getElementById('instagram-below-slot');
  const sidebarSlot = document.getElementById('instagram-sidebar-slot');
  if (!belowSlot || !sidebarSlot) return;

  belowSlot.innerHTML = '';
  sidebarSlot.innerHTML = '';

  const config = DB.getLayoutConfig ? DB.getLayoutConfig() : {};
  const targetSlot = config.instagramPosition === 'sidebar' ? sidebarSlot : belowSlot;
  targetSlot.innerHTML = getInstagramWidgetHTML();
}

function closeDetail(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  if (overlay.classList.contains("is-closing")) return;

  const panelMap = {
    "processo-detail-overlay": ["manual-filho-panel"],
    "sistema-detail-overlay": ["sistema-filho-panel", "sistema-neto-panel"],
    "servico-detail-overlay": ["servico-filho-panel", "servico-neto-panel"],
  };

  (panelMap[overlayId] || []).forEach((panelId) => {
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.remove("open");
  });

  overlay.classList.add("is-closing");

  window.setTimeout(() => {
    overlay.hidden = true;
    resetDetailPanels(overlayId);
    document.body.style.overflow = "";

    requestAnimationFrame(() => {
      overlay.classList.remove("open", "is-closing");
    });
  }, DETAIL_CLOSE_TRANSITION_MS);
}

const CHILD_PANEL_TRANSITION_MS = 280;

function animateChildPanelSwap(panel, renderFn) {
  if (!panel) return;

  if (!panel.classList.contains('open')) {
    renderFn();
    requestAnimationFrame(() => panel.classList.add('open'));
    return;
  }

  panel.classList.remove('open');
  setTimeout(() => {
    renderFn();
    requestAnimationFrame(() => panel.classList.add('open'));
  }, CHILD_PANEL_TRANSITION_MS);
}

function closeChildPanel(panelId, nestedPanelIds = []) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  nestedPanelIds.forEach((nestedId) => {
    const nested = document.getElementById(nestedId);
    if (nested) nested.remove();
  });

  panel.classList.remove('open');
  setTimeout(() => {
    if (panel.isConnected) panel.remove();
  }, CHILD_PANEL_TRANSITION_MS);
}

function ensureChildPanel(parentPanelId, panelId, className = 'manual-filho-panel') {
  let panel = document.getElementById(panelId);
  if (panel) return panel;

  const parent = document.getElementById(parentPanelId);
  if (!parent) return null;

  panel = document.createElement('div');
  panel.id = panelId;
  panel.className = className;
  parent.appendChild(panel);
  return panel;
}

function openNestedPanel({ parentPanelId, panelId, renderFn, className = 'manual-filho-panel' }) {
  const panel = ensureChildPanel(parentPanelId, panelId, className);
  if (!panel) return null;
  animateChildPanelSwap(panel, () => renderFn(panel));
  return panel;
}

function closeNestedPanel({ panelId, nestedPanelIds = [] }) {
  closeChildPanel(panelId, nestedPanelIds);
}

// Fechar qualquer detalhe com Escape
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;

  document.querySelectorAll(".detail-overlay.open").forEach((overlay) => {
    closeDetail(overlay.id);
  });
  document.body.style.overflow = "";
});


/* ============================================================
   MÓDULO: INFORMAÇÕES
   Três seções: Secretaria · Município/Prefeitura · Órgãos Externos
   ============================================================ */
function initInformacoes() {
  renderJuridico(infoJuridico);
  renderMunicipio(infoMunicipio);
  renderOrgaos(infoOrgaos);

  // Fechar overlays
  [
    ["juridico-detail-close",  "juridico-detail-overlay"],
    ["municipio-detail-close", "municipio-detail-overlay"],
    ["orgaos-detail-close",    "orgaos-detail-overlay"],
  ].forEach(([btnId, overlayId]) => {
    document.getElementById(btnId).addEventListener("click", closeDetail.bind(null, overlayId));
    document.getElementById(overlayId).addEventListener("click", (e) => {
      if (e.target === document.getElementById(overlayId)) closeDetail(overlayId);
    });
  });

  // Busca global que filtra as três seções simultaneamente
  const input = restoreModuleSearchInput("informacoes", "info-search");
  if (input) {
    applyInformacoesSearch(input.value);
    input.addEventListener("input", (e) => {
      setModuleSearchValue("informacoes", e.target.value);
      applyInformacoesSearch(e.target.value);
    });
  }
}

function applyInformacoesSearch(query = getModuleSearchValue("informacoes")) {
  const q = String(query || "").toLowerCase().trim();
  const matchItem = item =>
    item.titulo.toLowerCase().includes(q) ||
    (item.tag || "").toLowerCase().includes(q) ||
    (item.nome_completo || "").toLowerCase().includes(q) ||
    item.campos.some(c => c.label.toLowerCase().includes(q) || c.valor.toLowerCase().includes(q));

  renderJuridico(q ? infoJuridico.filter(matchItem) : infoJuridico);
  renderMunicipio(q ? infoMunicipio.filter(matchItem) : infoMunicipio);
  renderOrgaos(q ? infoOrgaos.filter(matchItem) : infoOrgaos);
}

/* ---------- helpers compartilhados ---------- */

/** Monta o HTML de uma grade de campos (label + valor) */
function camposGridHTML(campos) {
  return campos.map(c => `
    <div class="detail-info-item">
      <label>${c.label}</label>
      <span>${c.valor}</span>
    </div>
  `).join("");
}

/** Abre um overlay genérico de informações (campos simples) */
function openInfoCard({ overlayId, contentId, item, badgeLabel }) {
  document.getElementById(contentId).innerHTML = `
    <div class="detail-avatar-large" style="background:color-mix(in srgb,${item.cor} 12%,transparent);color:${item.cor}">
      <i class="ph-bold ${item.icone}"></i>
    </div>
    <div class="detail-name">${item.titulo}</div>
    ${item.nome_completo ? `<div class="detail-role">${item.nome_completo}</div>` : ""}
    <span class="detail-badge">${badgeLabel}</span>
    ${item.atribuicao ? `
      <hr class="detail-divider">
      <p class="detail-section-title">Atribuição / O que fazem</p>
      <p class="detail-desc">${item.atribuicao}</p>` : ""}
    <hr class="detail-divider">
    <p class="detail-section-title">Dados e contatos</p>
    <div class="detail-info-grid">${camposGridHTML(item.campos)}</div>
  `;
  openDetail(overlayId);
}

/* ---------- SEÇÃO 1 — Secretaria ---------- */

function renderJuridico(lista = infoJuridico) {
  const container = document.getElementById("juridico-list");
  if (!container) return;
  if (lista.length === 0) { container.innerHTML = `<p class="modulo-vazio">Nenhum resultado.</p>`; return; }
  animateGridReflow(container, () => {
  container.innerHTML = lista.map(item => `
    <div class="list-card" data-reflow-id="juridico-${item.id}" onclick="openJuridico(${item.id})">
      <div class="list-card-header">
        <div class="list-card-avatar icon-avatar" style="background:color-mix(in srgb,${item.cor} 12%,transparent);color:${item.cor}">
          <i class="ph-bold ${item.icone}"></i>
        </div>
        <div>
          <div class="list-card-title">${item.titulo}</div>
          <div class="list-card-sub">${item.campos.length} informações</div>
        </div>
      </div>
      <span class="list-card-tag">Secretaria</span>
    </div>
  `).join("");
  });
}

function openJuridico(id) {
  const item = infoJuridico.find(x => x.id === id);
  if (!item) return;
  openInfoCard({ overlayId: "juridico-detail-overlay", contentId: "juridico-detail-content", item, badgeLabel: item.badge || item.tag || "SMADER" });
}

/* ---------- SEÇÃO 2 — Município e Prefeitura ---------- */

function renderMunicipio(lista = infoMunicipio) {
  const container = document.getElementById("municipio-list");
  if (!container) return;
  if (lista.length === 0) { container.innerHTML = `<p class="modulo-vazio">Nenhum resultado.</p>`; return; }
  animateGridReflow(container, () => {
  container.innerHTML = lista.map(item => `
    <div class="list-card" data-reflow-id="municipio-${item.id}" onclick="openMunicipio(${item.id})">
      <div class="list-card-header">
        <div class="list-card-avatar icon-avatar" style="background:color-mix(in srgb,${item.cor} 12%,transparent);color:${item.cor}">
          <i class="ph-bold ${item.icone}"></i>
        </div>
        <div>
          <div class="list-card-title">${item.titulo}</div>
          <div class="list-card-sub">${item.campos.length} informações</div>
        </div>
      </div>
      <span class="list-card-tag">${item.tag}</span>
    </div>
  `).join("");
  });
}

function openMunicipio(id) {
  const item = infoMunicipio.find(x => x.id === id);
  if (!item) return;
  openInfoCard({ overlayId: "municipio-detail-overlay", contentId: "municipio-detail-content", item, badgeLabel: item.badge || item.tag || "Município" });
}

/* ---------- SEÇÃO 3 — Órgãos Externos ---------- */

function renderOrgaos(lista = infoOrgaos) {
  const container = document.getElementById("orgaos-list");
  if (!container) return;
  if (lista.length === 0) { container.innerHTML = `<p class="modulo-vazio">Nenhum resultado.</p>`; return; }
  animateGridReflow(container, () => {
  container.innerHTML = lista.map(item => `
    <div class="list-card" data-reflow-id="orgao-${item.id}" onclick="openOrgao(${item.id})">
      <div class="list-card-header">
        <div class="list-card-avatar icon-avatar" style="background:color-mix(in srgb,${item.cor} 12%,transparent);color:${item.cor}">
          <i class="ph-bold ${item.icone}"></i>
        </div>
        <div>
          <div class="list-card-title">${item.titulo}</div>
          <div class="list-card-sub">${item.nome_completo}</div>
        </div>
      </div>
      <span class="list-card-tag">Externo</span>
    </div>
  `).join("");
  });
}

function openOrgao(id) {
  const item = infoOrgaos.find(x => x.id === id);
  if (!item) return;
  openInfoCard({ overlayId: "orgaos-detail-overlay", contentId: "orgaos-detail-content", item, badgeLabel: item.badge || "Órgão Externo" });
}

/* ============================================================
   MÓDULO: VEÍCULOS
   Frota e patrimônio oficial da secretaria
   ============================================================ */
function initVeiculos() {
  renderVeiculos(veiculos);

  document.getElementById("veiculo-detail-close").addEventListener("click", closeDetail.bind(null, "veiculo-detail-overlay"));
  document.getElementById("veiculo-detail-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("veiculo-detail-overlay")) closeDetail("veiculo-detail-overlay");
  });

  const input = restoreModuleSearchInput("veiculos", "veiculos-search");
  if (input) {
    applyVeiculosSearch(input.value);
    input.addEventListener("input", (e) => {
      setModuleSearchValue("veiculos", e.target.value);
      applyVeiculosSearch(e.target.value);
    });
  }
}

function applyVeiculosSearch(query = getModuleSearchValue("veiculos")) {
  const q = String(query || "").toLowerCase().trim();
  const filtrados = q
    ? veiculos.filter(v =>
        v.nome.toLowerCase().includes(q) ||
        v.marca.toLowerCase().includes(q) ||
        v.modelo.toLowerCase().includes(q) ||
        v.placa.toLowerCase().includes(q) ||
        v.tipo.toLowerCase().includes(q) ||
        v.situacao.toLowerCase().includes(q)
      )
    : veiculos;
  renderVeiculos(filtrados);
}

/** Renderiza cards de veículos */
function renderVeiculos(lista = veiculos) {
  const container = document.getElementById("veiculos-list");
  if (!container) return;
  if (lista.length === 0) {
    container.innerHTML = `<p class="modulo-vazio">Nenhum veículo encontrado.</p>`;
    return;
  }

  const situacaoBadge = (s) => s === "Em operação"
    ? `<span class="list-card-tag" style="background:#e6f4ea;color:#2d6a4f">${s}</span>`
    : `<span class="list-card-tag" style="background:#fff3e0;color:#7a4f00">${s}</span>`;

  animateGridReflow(container, () => {
  container.innerHTML = lista.map(v => `
    <div class="list-card" data-reflow-id="veiculo-${v.id}" onclick="openVeiculo(${v.id})">
      <div class="list-card-header">
        <div class="list-card-avatar icon-avatar" style="background:color-mix(in srgb, ${v.cor} 12%, transparent);color:${v.cor}">
          <i class="ph-bold ${v.icone}"></i>
        </div>
        <div>
          <div class="list-card-title">${v.nome}</div>
          <div class="list-card-sub">${v.marca} ${v.modelo} · ${v.ano}</div>
        </div>
      </div>
      ${situacaoBadge(v.situacao)}
    </div>
  `).join("");
  });
}

/** Abre detalhe de um veículo */
function openVeiculo(id) {
  const v = veiculos.find(x => x.id === id);
  if (!v) return;

  const situacaoStyle = v.situacao === "Em operação"
    ? "background:#e6f4ea;color:#2d6a4f"
    : "background:#fff3e0;color:#7a4f00";

  // Motoristas: IDs vinculados ou string legada
  let motoristasHTML = '';
  if (Array.isArray(v.motorista_ids) && v.motorista_ids.length) {
    const itens = v.motorista_ids.map(mid => {
      const f = funcionarios.find(x => x.id === mid);
      return f
        ? `<span style="display:flex;align-items:center;gap:6px"><i class="ph-bold ph-user"></i>${f.nome} <small style="color:var(--text-muted)">${f.cargo}</small></span>`
        : '';
    }).filter(Boolean).join('');
    motoristasHTML = itens || (v.motorista || '—');
  } else {
    motoristasHTML = v.motorista || '—';
  }

  // Arquivos vinculados
  const tipoIcone = { PDF: "ph-file-pdf", XLSX: "ph-file-xls", DOCX: "ph-file-doc" };
  const arquivosLinks = (v.arquivo_ids || []).map(aid => {
    const a = arquivos.find(x => x.id === aid);
    if (!a) return '';
    const icone = tipoIcone[a.tipo] || "ph-file";
    if (a.arquivo_data) {
      return `<a href="${a.arquivo_data}" download="${a.arquivo_nome || a.nome}" class="veiculo-arquivo-link">
        <i class="ph-bold ${icone}"></i>${a.nome}
        <i class="ph-bold ph-download-simple" style="font-size:.7rem;opacity:.6;margin-left:auto"></i>
      </a>`;
    } else if (a.url) {
      return `<a href="${a.url}" target="_blank" rel="noopener" class="veiculo-arquivo-link">
        <i class="ph-bold ${icone}"></i>${a.nome}
        <i class="ph-bold ph-arrow-square-out" style="font-size:.7rem;opacity:.6;margin-left:auto"></i>
      </a>`;
    }
    return `<span class="veiculo-arquivo-link veiculo-arquivo-indisponivel">
      <i class="ph-bold ${icone}"></i>${a.nome}
    </span>`;
  }).filter(Boolean);

  document.getElementById("veiculo-detail-content").innerHTML = `
    <div class="detail-avatar-large" style="background:color-mix(in srgb, ${v.cor} 12%, transparent);color:${v.cor};font-size:2rem">
      <i class="ph-bold ${v.icone}"></i>
    </div>
    <div class="detail-name">${v.nome}</div>
    <div class="detail-role">${v.marca} ${v.modelo} · ${v.ano}</div>
    <span class="detail-badge" style="${situacaoStyle}">${v.situacao}</span>
    <hr class="detail-divider">
    <p class="detail-section-title">Identificação do veículo</p>
    <div class="detail-info-grid">
      <div class="detail-info-item"><label>Placa</label><span>${v.placa}</span></div>
      <div class="detail-info-item"><label>Nº Patrimônio</label><span>${v.patrimonio}</span></div>
      <div class="detail-info-item"><label>Chassi</label><span style="font-size:.78rem">${v.chassi}</span></div>
      <div class="detail-info-item"><label>RENAVAM</label><span>${v.renavam}</span></div>
      <div class="detail-info-item"><label>Cor</label><span>${v.cor_veiculo}</span></div>
      <div class="detail-info-item"><label>Combustível</label><span>${v.combustivel}</span></div>
    </div>
    <hr class="detail-divider">
    <p class="detail-section-title">Operação</p>
    <div class="detail-info-grid">
      <div class="detail-info-item" style="grid-column:1/-1">
        <label>Motorista(s) habilitado(s)</label>
        <div style="display:flex;flex-direction:column;gap:4px;margin-top:2px">${motoristasHTML}</div>
      </div>
      <div class="detail-info-item" style="grid-column:1/-1"><label>Localização atual</label><span>${v.localizacao}</span></div>
    </div>
    ${arquivosLinks.length ? `
    <hr class="detail-divider">
    <p class="detail-section-title">Documentos do veículo</p>
    <div class="veiculo-arquivos-list">${arquivosLinks.join('')}</div>` : ''}
    <hr class="detail-divider">
    <div class="obs-box">${v.obs}</div>
  `;
  openDetail("veiculo-detail-overlay");
}


/* ============================================================
   MÓDULO: SISTEMAS
   Links e informações dos sistemas externos utilizados
   ============================================================ */
function initSistemas() {
  renderSistemas(sistemas);

  const closeSistema = () => {
    const filho = document.getElementById('sistema-filho-panel');
    if (filho) filho.remove();
    closeDetail("sistema-detail-overlay");
  };
  document.getElementById("sistema-detail-close").addEventListener("click", closeSistema);
  document.getElementById("sistema-detail-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("sistema-detail-overlay")) closeSistema();
  });

  const input = restoreModuleSearchInput("sistemas", "sistemas-search");
  if (input) {
    applySistemasSearch(input.value);
    input.addEventListener("input", (e) => {
      setModuleSearchValue("sistemas", e.target.value);
      applySistemasSearch(e.target.value);
    });
  }
}

function applySistemasSearch(query = getModuleSearchValue("sistemas")) {
  const q = String(query || "").toLowerCase().trim();
  const filtrados = q
    ? sistemas.filter(s =>
        s.nome.toLowerCase().includes(q) ||
        s.nome_completo.toLowerCase().includes(q) ||
        s.descricao.toLowerCase().includes(q) ||
        s.orgao.toLowerCase().includes(q)
      )
    : sistemas;
  renderSistemas(filtrados);
}

function renderSistemas(lista = sistemas) {
  const container = document.getElementById("sistemas-list");
  if (!container) return;
  if (lista.length === 0) {
    container.innerHTML = `<p class="modulo-vazio">Nenhum sistema encontrado.</p>`;
    return;
  }
  animateGridReflow(container, () => {
  container.innerHTML = lista.map(s => `
    <div class="sistema-card list-card" data-reflow-id="sistema-${s.id}" onclick="openSistema(${s.id})">
      <div class="list-card-header">
        <div class="list-card-avatar icon-avatar" style="color:${s.cor}">
          <i class="ph-bold ${s.icone}"></i>
        </div>
        <div style="flex:1">
          <div class="list-card-title">${s.nome}</div>
          <div class="list-card-sub">${s.nome_completo}</div>
        </div>
      </div>
      <p class="sistema-desc">${s.descricao}</p>
      <div class="sistema-footer">
        <span class="list-card-tag">${s.orgao}</span>
        <a href="${s.url}" target="_blank" rel="noopener" class="sistema-btn" onclick="event.stopPropagation()">
          <i class="ph-bold ph-arrow-square-out"></i> Acessar
        </a>
      </div>
    </div>
  `).join("");
  });
}

function openSistema(id) {
  const s = sistemas.find(x => x.id === id);
  if (!s) return;

  // Limpa filho residual de sessão anterior
  const filhoAnterior = document.getElementById('sistema-filho-panel');
  if (filhoAnterior) filhoAnterior.remove();
  const netoAnterior = document.getElementById('sistema-neto-panel');
  if (netoAnterior) netoAnterior.remove();

  // Chips de manuais vinculados
  const manuaisChips = (s.manuais_ids || []).map(mid => {
    const m = manuais.find(x => x.id === mid);
    if (!m) return '';
    return `<button class="etapa-manual-chip" onclick="openSistemaFilho('manual',${m.id})">
      <i class="ph-bold ph-book-open"></i>${m.titulo}
      <i class="ph-bold ph-arrow-right" style="font-size:.65rem;opacity:.6"></i>
    </button>`;
  }).filter(Boolean).join('');

  // Chips de processos vinculados
  const processosChips = (s.processos_ids || []).map(pid => {
    const p = processos.find(x => x.id === pid);
    if (!p) return '';
    return `<button class="etapa-manual-chip" style="background:color-mix(in srgb,#7a5c3d 10%,transparent);color:#7a5c3d;border-color:color-mix(in srgb,#7a5c3d 25%,transparent)" onclick="openSistemaFilho('processo',${p.id})">
      <i class="ph-bold ph-flow-arrow"></i>${p.titulo}
      <i class="ph-bold ph-arrow-right" style="font-size:.65rem;opacity:.6"></i>
    </button>`;
  }).filter(Boolean).join('');

  const linksSection = (manuaisChips || processosChips) ? `
    <hr class="detail-divider">
    <p class="detail-section-title">Links relacionados</p>
    ${manuaisChips ? `
      <p style="font-size:.7rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Manuais</p>
      <div class="etapa-manuais-row" style="margin-bottom:12px">${manuaisChips}</div>` : ''}
    ${processosChips ? `
      <p style="font-size:.7rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Processos</p>
      <div class="etapa-manuais-row">${processosChips}</div>` : ''}
  ` : '';

  document.getElementById("sistema-detail-content").innerHTML = `
    <div class="detail-avatar-large" style="background:color-mix(in srgb,${s.cor} 12%,transparent);color:${s.cor}">
      <i class="ph-bold ${s.icone}"></i>
    </div>
    <div class="detail-name">${s.nome}</div>
    <div class="detail-role">${s.nome_completo}</div>
    <span class="detail-badge">${s.orgao}</span>
    <hr class="detail-divider">
    <p class="detail-section-title">Descrição</p>
    <p class="detail-desc">${s.descricao}</p>
    <hr class="detail-divider">
    <p class="detail-section-title">Acesso</p>
    <p class="detail-desc" style="display:flex;align-items:flex-start;gap:6px">
      <i class="ph-bold ph-key" style="margin-top:2px;flex-shrink:0"></i>${s.acesso}
    </p>
    <a href="${s.url}" target="_blank" rel="noopener" class="sistema-btn" style="margin-top:14px;display:inline-flex">
      <i class="ph-bold ph-arrow-square-out"></i> Acessar sistema
    </a>
    ${linksSection}
  `;

  openDetail("sistema-detail-overlay");
}

/** Abre painel filho (manual ou processo) dentro do detail do sistema */
function openSistemaFilho(tipo, id) {
  openNestedPanel({
    parentPanelId: 'sistema-detail-panel',
    panelId: 'sistema-filho-panel',
    renderFn: () => {
      if (tipo === 'manual') {
        const m = manuais.find(x => x.id === id);
        if (m) renderSistemaFilhoManual(m, 'resumido', 0);
      } else {
        const p = processos.find(x => x.id === id);
        if (p) renderSistemaFilhoProcesso(p);
      }
    },
  });
}

function renderSistemaFilhoManual(m, modo, passoAtivo) {
  const filho = document.getElementById('sistema-filho-panel');
  if (!filho) return;

  const tabs = `
    <div class="manual-tabs" style="margin:0 0 16px">
      <button class="manual-tab ${modo==='resumido'?'active':''}"
              onclick="renderSistemaFilhoManual(manuais.find(x=>x.id===${m.id}),'resumido',0)">
        <i class="ph-bold ph-list-numbers"></i> Resumido
      </button>
      <button class="manual-tab ${modo==='completo'?'active':''}"
              onclick="renderSistemaFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',0)">
        <i class="ph-bold ph-presentation"></i> Completo
      </button>
    </div>`;

  let content = '';
  if (modo === 'resumido') {
    content = `<div class="manual-content-switch"><div class="manual-steps">${m.passos.map((p,i) => `
      <div class="manual-step">
        <div class="step-number">${i+1}</div>
        <div class="step-text">${typeof p==='string'?p:p.texto}</div>
      </div>`).join('')}</div></div>`;
  } else {
    const passo  = m.passos[passoAtivo];
    const texto  = typeof passo==='string'?passo:passo.texto;
    const imagem = typeof passo==='object'&&passo.imagem?passo.imagem:'';
    const total  = m.passos.length;
    content = `
      <div class="manual-content-switch"><div class="manual-completo">
        ${buildManualPaginationHTML(
          total,
          passoAtivo,
          i => `renderSistemaFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',${i})`,
          `renderSistemaFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo-1})`,
          `renderSistemaFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo+1})`
        )}
        <div class="manual-passo-card">
          <div class="manual-passo-header">
            <span class="step-number">${passoAtivo+1}</span>
            <strong>Passo ${passoAtivo+1} de ${total}</strong>
          </div>
          <div class="manual-passo-body">
            <p class="manual-passo-texto">${texto}</p>
            ${imagem
              ? `<div class="manual-passo-img-container"><img src="${imagem}" class="manual-passo-img"/></div>`
              : `<div class="manual-passo-no-img"><i class="ph-bold ph-image-square"></i><span>Nenhuma imagem.</span></div>`}
          </div>
          <div class="manual-passo-footer">
            <button class="btn-passo" ${passoAtivo===0?'disabled':''}
                    onclick="renderSistemaFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo-1})">
              <i class="ph-bold ph-arrow-left"></i> Anterior</button>
            <button class="btn-passo btn-passo-primary" ${passoAtivo===total-1?'disabled':''}
                    onclick="renderSistemaFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo+1})">
              Próximo <i class="ph-bold ph-arrow-right"></i></button>
          </div>
        </div>
      </div></div>`;
  }

  // Documentos: igual ao renderManualFilho — suporta arquivo_id vinculado
  const docs = (m.documentos||[]).map(d => {
    const isObj = typeof d === 'object' && d !== null;
    const nome  = isObj ? d.nome : d;
    const aid   = isObj ? d.arquivo_id : null;
    if (aid) {
      const a = arquivos.find(x => x.id === aid);
      if (a && (a.arquivo_data || a.url)) {
        const href = a.arquivo_data || a.url;
        const dl   = a.arquivo_data ? `download="${a.arquivo_nome || a.nome}"` : 'target="_blank" rel="noopener"';
        return `<a href="${href}" ${dl} class="doc-tag doc-tag-link" style="text-decoration:none">
          <i class="ph-bold ph-download-simple"></i>${nome}</a>`;
      }
    }
    return `<span class="doc-tag"><i class="ph-bold ph-file-text"></i>${nome}</span>`;
  }).join('');

  filho.innerHTML = `
    <div class="manual-transition-scope">
    <div class="manual-filho-header">
      <button class="manual-filho-back" onclick="fecharSistemaFilho()">
        <i class="ph-bold ph-arrow-left"></i> Voltar ao sistema
      </button>
      <button class="detail-close" style="position:static;width:32px;height:32px" onclick="fecharSistemaCompleto()">
        <i class="ph-bold ph-x"></i>
      </button>
    </div>
    <span class="detail-badge">${m.categoria}</span>
    <div class="detail-name" style="margin-top:10px;font-size:1.3rem">${m.titulo}</div>
    <hr class="detail-divider">
    ${tabs}${content}
    ${docs ? `<hr class="detail-divider"><p class="detail-section-title">Documentos necessários</p><div class="docs-list">${docs}</div>` : ''}
    ${m.observacoes ? `<hr class="detail-divider"><p class="detail-section-title">Observações</p><div class="obs-box">${m.observacoes}</div>` : ''}
    </div>
  `;
  animateManualPanelContent(filho, modo, passoAtivo);
}

function renderSistemaFilhoProcesso(p) {
  const filho = document.getElementById('sistema-filho-panel');
  if (!filho) return;

  // Timeline com chips de manuais vinculados por etapa — igual ao openProcesso
  const timeline = p.etapas.map(e => {
    const chips = (e.manuais_ids || []).map(mid => {
      const m = manuais.find(x => x.id === mid);
      if (!m) return '';
      return `<button class="etapa-manual-chip" onclick="abrirManualNoSistemaFilho(${m.id},${p.id})" title="Ver manual">
        <i class="ph-bold ph-book-open"></i>${m.titulo}
        <i class="ph-bold ph-arrow-right" style="font-size:.65rem;opacity:.6"></i>
      </button>`;
    }).join('');

    return `
      <div class="timeline-item">
        <div class="timeline-left">
          <div class="timeline-dot"></div>
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-content">
          <strong>${e.titulo}</strong>
          <p>${e.descricao}</p>
          ${chips ? `<div class="etapa-manuais-row">${chips}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  filho.innerHTML = `
    <div class="manual-filho-header">
      <button class="manual-filho-back" onclick="fecharSistemaFilho()">
        <i class="ph-bold ph-arrow-left"></i> Voltar ao sistema
      </button>
      <button class="detail-close" style="position:static;width:32px;height:32px" onclick="fecharSistemaCompleto()">
        <i class="ph-bold ph-x"></i>
      </button>
    </div>
    <span class="detail-badge">${p.categoria}</span>
    <div class="detail-name" style="margin-top:10px;font-size:1.3rem">${p.titulo}</div>
    <hr class="detail-divider">
    <p class="detail-section-title">Fluxo do processo</p>
    <div class="timeline">${timeline}</div>
  `;
}

/**
 * Abre manual no painel filho de sistema, a partir de um chip de etapa
 * dentro de um processo. Guarda o processo pai para o botão "Voltar".
 */
function abrirManualNoSistemaFilho(manualId, processoId) {
  const m = manuais.find(x => x.id === manualId);
  if (!m) return;

  const filho = document.getElementById('sistema-filho-panel');
  if (!filho) return;

  openNestedPanel({
    parentPanelId: 'sistema-filho-panel',
    panelId: 'sistema-neto-panel',
    renderFn: () => renderSistemaNetoManual(m, 'resumido', processoId, 0),
  });
}

function fecharSistemaFilho() {
  closeNestedPanel({ panelId: 'sistema-filho-panel', nestedPanelIds: ['sistema-neto-panel'] });
}

function fecharSistemaCompleto() {
  closeDetail('sistema-detail-overlay');
}


/* ============================================================
   MÓDULO: SERVIÇOS
   Serviços prestados pela secretaria à população
   ============================================================ */

// Mapa de cores por categoria para os badges
const catCores = {
  "Trator":       { bg: "#e8f3ec", fg: "#2d6a4f" },
  "Arborização":  { bg: "#eaf3e8", fg: "#3d7a5e" },
  "Capacitação":  { bg: "#e8ecf3", fg: "#3d5c7a" },
  "Insumos":      { bg: "#f3f0e8", fg: "#7a6b3d" },
};

function initServicos() {
  renderServicos(servicos);
  const closeServicoDetail = () => closeDetail("servico-detail-overlay");

  // Fechar overlay
  document.getElementById("servico-detail-close")
    .addEventListener("click", closeServicoDetail);
  document.getElementById("servico-detail-overlay")
    .addEventListener("click", (e) => {
      if (e.target === document.getElementById("servico-detail-overlay"))
        closeServicoDetail();
    });

  const input = restoreModuleSearchInput("servicos", "servicos-search");
  if (input) {
    applyServicosSearch(input.value);
    input.addEventListener("input", (e) => {
      setModuleSearchValue("servicos", e.target.value);
      applyServicosSearch(e.target.value);
    });
  }
}

function applyServicosSearch(query = getModuleSearchValue("servicos")) {
  const q = String(query || "").toLowerCase().trim();
  const filtrados = q
    ? servicos.filter(s =>
        s.nome.toLowerCase().includes(q) ||
        s.categoria.toLowerCase().includes(q) ||
        s.descricao.toLowerCase().includes(q) ||
        s.publico.toLowerCase().includes(q)
      )
    : servicos;
  renderServicos(filtrados);
}

function renderServicos(lista = servicos) {
  const container = document.getElementById("servicos-list");
  if (!container) return;
  if (lista.length === 0) {
    container.innerHTML = `<p class="modulo-vazio">Nenhum serviço encontrado.</p>`;
    return;
  }
  animateGridReflow(container, () => {
  container.innerHTML = lista.map(s => {
    const cat = catCores[s.categoria] || { bg: "var(--accent-light)", fg: "var(--accent)" };
    return `
      <div class="list-card servico-card" data-reflow-id="servico-${s.id}" onclick="openServico(${s.id})">
        <div class="list-card-header">
          <div class="list-card-avatar icon-avatar"
               style="background:color-mix(in srgb,${s.cor} 12%,transparent);color:${s.cor}">
            <i class="ph-bold ${s.icone}"></i>
          </div>
          <div>
            <div class="list-card-title">${s.nome}</div>
            <div class="list-card-sub">${s.publico}</div>
          </div>
        </div>
        <p class="servico-desc-preview">${s.descricao}</p>
        <span class="list-card-tag" style="background:${cat.bg};color:${cat.fg}">${s.categoria}</span>
      </div>
    `;
  }).join("");
  });
}

/** Abre o painel lateral com todos os detalhes do serviço */
function openServico(id) {
  const s = servicos.find(x => x.id === id);
  if (!s) return;

  const filhoAnterior = document.getElementById('servico-filho-panel');
  if (filhoAnterior) filhoAnterior.remove();
  const netoAnterior = document.getElementById('servico-neto-panel');
  if (netoAnterior) netoAnterior.remove();

  const cat  = catCores[s.categoria] || { bg: "var(--accent-light)", fg: "var(--accent)" };
  const docs = (s.documentos || []).map(d => {
    const isObj = typeof d === 'object' && d !== null;
    const nome = isObj ? d.nome : d;
    const arquivoId = isObj ? d.arquivo_id : null;

    if (arquivoId) {
      const arquivo = arquivos.find(a => a.id === arquivoId);
      if (arquivo && (arquivo.arquivo_data || arquivo.url)) {
        const href = arquivo.arquivo_data || arquivo.url;
        const attrs = arquivo.arquivo_data
          ? `download="${arquivo.arquivo_nome || arquivo.nome}"`
          : 'target="_blank" rel="noopener"';
        return `<a href="${href}" ${attrs} class="doc-tag doc-tag-link" style="text-decoration:none">
          <i class="ph-bold ph-download-simple"></i>${nome}</a>`;
      }
    }

    return `<span class="doc-tag"><i class="ph-bold ph-file-text"></i>${nome}</span>`;
  }).join("");

  const processosChips = (s.processos_ids || []).map(pid => {
    const p = processos.find(x => x.id === pid);
    if (!p) return '';
    return `<button class="etapa-manual-chip" style="background:color-mix(in srgb,#7a5c3d 10%,transparent);color:#7a5c3d;border-color:color-mix(in srgb,#7a5c3d 25%,transparent)" onclick="openServicoFilho('processo',${p.id})">
      <i class="ph-bold ph-flow-arrow"></i>${p.titulo}
      <i class="ph-bold ph-arrow-right" style="font-size:.65rem;opacity:.6"></i>
    </button>`;
  }).join("");

  document.getElementById("servico-detail-content").innerHTML = `
    <div class="detail-avatar-large"
         style="background:color-mix(in srgb,${s.cor} 12%,transparent);color:${s.cor};font-size:1.8rem">
      <i class="ph-bold ${s.icone}"></i>
    </div>
    <div class="detail-name">${s.nome}</div>
    <span class="detail-badge" style="background:${cat.bg};color:${cat.fg}">${s.categoria}</span>

    <hr class="detail-divider">
    <p class="detail-section-title">Descrição do serviço</p>
    <p class="detail-desc">${s.descricao}</p>

    <hr class="detail-divider">
    <p class="detail-section-title">Público-alvo</p>
    <p class="detail-desc">${s.publico}</p>

    <hr class="detail-divider">
    <p class="detail-section-title">Como solicitar</p>
    <p class="detail-desc">${s.como_solicitar}</p>

    <hr class="detail-divider">
    <p class="detail-section-title">Documentos necessários</p>
    <div class="docs-list">${docs}</div>

    ${processosChips ? `
    <hr class="detail-divider">
    <p class="detail-section-title">Processos relacionados</p>
    <div class="etapa-manuais-row">${processosChips}</div>` : ''}

    <hr class="detail-divider">
    <p class="detail-section-title">Prazo estimado</p>
    <p class="detail-desc">${s.prazo}</p>

    <hr class="detail-divider">
    <div class="detail-ausencia">
      <strong><i class="ph-bold ph-note"></i> Observações</strong>
      <p>${s.obs}</p>
    </div>
  `;

  openDetail("servico-detail-overlay");
}

function openServicoFilho(tipo, id) {
  openNestedPanel({
    parentPanelId: 'servico-detail-panel',
    panelId: 'servico-filho-panel',
    renderFn: () => {
      if (tipo === 'processo') {
        const p = processos.find(x => x.id === id);
        if (p) renderServicoFilhoProcesso(p);
      } else {
        const m = manuais.find(x => x.id === id);
        if (m) renderServicoFilhoManual(m, 'resumido', 0);
      }
    },
  });
}

function renderServicoFilhoProcesso(p) {
  const filho = document.getElementById('servico-filho-panel');
  if (!filho) return;

  const timeline = p.etapas.map(e => {
    const chips = (e.manuais_ids || []).map(mid => {
      const m = manuais.find(x => x.id === mid);
      if (!m) return '';
      return `<button class="etapa-manual-chip" onclick="abrirManualNoServicoFilho(${m.id},${p.id})" title="Ver manual">
        <i class="ph-bold ph-book-open"></i>${m.titulo}
        <i class="ph-bold ph-arrow-right" style="font-size:.65rem;opacity:.6"></i>
      </button>`;
    }).join('');

    return `
      <div class="timeline-item">
        <div class="timeline-left">
          <div class="timeline-dot"></div>
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-content">
          <strong>${e.titulo}</strong>
          <p>${e.descricao}</p>
          ${chips ? `<div class="etapa-manuais-row">${chips}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  filho.innerHTML = `
    <div class="manual-transition-scope">
    <div class="manual-filho-header">
      <button class="manual-filho-back" onclick="fecharServicoFilho()">
        <i class="ph-bold ph-arrow-left"></i> Voltar ao serviço
      </button>
      <button class="detail-close" style="position:static;width:32px;height:32px" onclick="fecharServicoCompleto()">
        <i class="ph-bold ph-x"></i>
      </button>
    </div>
    <span class="detail-badge">${p.categoria}</span>
    <div class="detail-name" style="margin-top:10px;font-size:1.3rem">${p.titulo}</div>
    <hr class="detail-divider">
    <p class="detail-section-title">Fluxo do processo</p>
    <div class="timeline">${timeline}</div>
    </div>
  `;
}

function renderServicoFilhoManual(m, modo, passoAtivo) {
  const filho = document.getElementById('servico-filho-panel');
  if (!filho) return;

  const tabs = `
    <div class="manual-tabs" style="margin:0 0 16px">
      <button class="manual-tab ${modo==='resumido'?'active':''}"
              onclick="renderServicoFilhoManual(manuais.find(x=>x.id===${m.id}),'resumido',0)">
        <i class="ph-bold ph-list-numbers"></i> Resumido
      </button>
      <button class="manual-tab ${modo==='completo'?'active':''}"
              onclick="renderServicoFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',0)">
        <i class="ph-bold ph-presentation"></i> Completo
      </button>
    </div>`;

  let content = '';
  if (modo === 'resumido') {
    content = `<div class="manual-content-switch"><div class="manual-steps">${m.passos.map((p, i) => `
      <div class="manual-step">
        <div class="step-number">${i+1}</div>
        <div class="step-text">${typeof p==='string' ? p : p.texto}</div>
      </div>`).join('')}</div></div>`;
  } else {
    const passo = m.passos[passoAtivo];
    const texto = typeof passo === 'string' ? passo : passo.texto;
    const imagem = typeof passo === 'object' && passo.imagem ? passo.imagem : '';
    const total = m.passos.length;
    content = `
      <div class="manual-content-switch"><div class="manual-completo">
        ${buildManualPaginationHTML(
          total,
          passoAtivo,
          i => `renderServicoFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',${i})`,
          `renderServicoFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo-1})`,
          `renderServicoFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo+1})`
        )}
        <div class="manual-passo-card">
          <div class="manual-passo-header">
            <span class="step-number">${passoAtivo+1}</span>
            <strong>Passo ${passoAtivo+1} de ${total}</strong>
          </div>
          <div class="manual-passo-body">
            <p class="manual-passo-texto">${texto}</p>
            ${imagem
              ? `<div class="manual-passo-img-container"><img src="${imagem}" class="manual-passo-img"/></div>`
              : `<div class="manual-passo-no-img"><i class="ph-bold ph-image-square"></i><span>Nenhuma imagem.</span></div>`}
          </div>
          <div class="manual-passo-footer">
            <button class="btn-passo" ${passoAtivo===0?'disabled':''}
                    onclick="renderServicoFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo-1})">
              <i class="ph-bold ph-arrow-left"></i> Anterior</button>
            <button class="btn-passo btn-passo-primary" ${passoAtivo===total-1?'disabled':''}
                    onclick="renderServicoFilhoManual(manuais.find(x=>x.id===${m.id}),'completo',${passoAtivo+1})">
              Próximo <i class="ph-bold ph-arrow-right"></i></button>
          </div>
        </div>
      </div></div>`;
  }

  const docs = (m.documentos || []).map(d => {
    const isObj = typeof d === 'object' && d !== null;
    const nome = isObj ? d.nome : d;
    const aid = isObj ? d.arquivo_id : null;
    if (aid) {
      const a = arquivos.find(x => x.id === aid);
      if (a && (a.arquivo_data || a.url)) {
        const href = a.arquivo_data || a.url;
        const attrs = a.arquivo_data
          ? `download="${a.arquivo_nome || a.nome}"`
          : 'target="_blank" rel="noopener"';
        return `<a href="${href}" ${attrs} class="doc-tag doc-tag-link" style="text-decoration:none">
          <i class="ph-bold ph-download-simple"></i>${nome}</a>`;
      }
    }
    return `<span class="doc-tag"><i class="ph-bold ph-file-text"></i>${nome}</span>`;
  }).join('');

  filho.innerHTML = `
    <div class="manual-filho-header">
      <button class="manual-filho-back" onclick="fecharServicoFilho()">
        <i class="ph-bold ph-arrow-left"></i> Voltar ao serviço
      </button>
      <button class="detail-close" style="position:static;width:32px;height:32px" onclick="fecharServicoCompleto()">
        <i class="ph-bold ph-x"></i>
      </button>
    </div>
    <span class="detail-badge">${m.categoria}</span>
    <div class="detail-name" style="margin-top:10px;font-size:1.3rem">${m.titulo}</div>
    <hr class="detail-divider">
    ${tabs}${content}
    ${docs ? `<hr class="detail-divider"><p class="detail-section-title">Documentos necessários</p><div class="docs-list">${docs}</div>` : ''}
    ${m.observacoes ? `<hr class="detail-divider"><p class="detail-section-title">Observações</p><div class="obs-box">${m.observacoes}</div>` : ''}
  `;
  animateManualPanelContent(filho, modo, passoAtivo);
}

function abrirManualNoServicoFilho(manualId, processoId) {
  const m = manuais.find(x => x.id === manualId);
  if (!m) return;

  const filho = document.getElementById('servico-filho-panel');
  if (!filho) return;

  openNestedPanel({
    parentPanelId: 'servico-filho-panel',
    panelId: 'servico-neto-panel',
    renderFn: () => renderServicoNetoManual(m, 'resumido', processoId, 0),
  });
}



/* ============================================================
   MOBILE — Hamburger menu
   ============================================================ */
function renderSistemaNetoManual(m, modo, processoId, passoAtivo = 0) {
  const neto = document.getElementById('sistema-neto-panel');
  if (!neto) return;

  const tabs = `
    <div class="manual-tabs" style="margin:0 0 16px">
      <button class="manual-tab ${modo==='resumido'?'active':''}"
              onclick="renderSistemaNetoManual(manuais.find(x=>x.id===${m.id}),'resumido',${processoId},0)">
        <i class="ph-bold ph-list-numbers"></i> Resumido
      </button>
      <button class="manual-tab ${modo==='completo'?'active':''}"
              onclick="renderSistemaNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},0)">
        <i class="ph-bold ph-presentation"></i> Completo
      </button>
    </div>`;

  let content = '';
  if (modo === 'resumido') {
    content = `<div class="manual-content-switch"><div class="manual-steps">${m.passos.map((p, i) => `
      <div class="manual-step">
        <div class="step-number">${i+1}</div>
        <div class="step-text">${typeof p==='string' ? p : p.texto}</div>
      </div>`).join('')}</div></div>`;
  } else {
    const passo = m.passos[passoAtivo];
    const texto = typeof passo === 'string' ? passo : passo.texto;
    const imagem = typeof passo === 'object' && passo.imagem ? passo.imagem : '';
    const total = m.passos.length;
    content = `
      <div class="manual-content-switch"><div class="manual-completo">
        ${buildManualPaginationHTML(
          total,
          passoAtivo,
          i => `renderSistemaNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},${i})`,
          `renderSistemaNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},${passoAtivo-1})`,
          `renderSistemaNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},${passoAtivo+1})`
        )}
        <div class="manual-passo-card">
          <div class="manual-passo-header">
            <span class="step-number">${passoAtivo+1}</span>
            <strong>Passo ${passoAtivo+1} de ${total}</strong>
          </div>
          <div class="manual-passo-body">
            <p class="manual-passo-texto">${texto}</p>
            ${imagem
              ? `<div class="manual-passo-img-container"><img src="${imagem}" class="manual-passo-img"/></div>`
              : `<div class="manual-passo-no-img"><i class="ph-bold ph-image-square"></i><span>Nenhuma imagem.</span></div>`}
          </div>
          <div class="manual-passo-footer">
            <button class="btn-passo" ${passoAtivo===0?'disabled':''}
                    onclick="renderSistemaNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},${passoAtivo-1})">
              <i class="ph-bold ph-arrow-left"></i> Anterior</button>
            <button class="btn-passo btn-passo-primary" ${passoAtivo===total-1?'disabled':''}
                    onclick="renderSistemaNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},${passoAtivo+1})">
              Próximo <i class="ph-bold ph-arrow-right"></i></button>
          </div>
        </div>
      </div></div>`;
  }

  const docs = (m.documentos || []).map(d => {
    const isObj = typeof d === 'object' && d !== null;
    const nome = isObj ? d.nome : d;
    const aid = isObj ? d.arquivo_id : null;
    if (aid) {
      const a = arquivos.find(x => x.id === aid);
      if (a && (a.arquivo_data || a.url)) {
        const href = a.arquivo_data || a.url;
        const dl = a.arquivo_data ? `download="${a.arquivo_nome || a.nome}"` : 'target="_blank" rel="noopener"';
        return `<a href="${href}" ${dl} class="doc-tag doc-tag-link" style="text-decoration:none">
          <i class="ph-bold ph-download-simple"></i>${nome}</a>`;
      }
    }
    return `<span class="doc-tag"><i class="ph-bold ph-file-text"></i>${nome}</span>`;
  }).join('');

  neto.innerHTML = `
    <div class="manual-transition-scope">
    <div class="manual-filho-header">
      <button class="manual-filho-back" onclick="fecharSistemaNetoFilho()">
        <i class="ph-bold ph-arrow-left"></i> Voltar ao processo
      </button>
      <button class="detail-close" style="position:static;width:32px;height:32px" onclick="fecharSistemaCompleto()">
        <i class="ph-bold ph-x"></i>
      </button>
    </div>
    <span class="detail-badge">${m.categoria}</span>
    <div class="detail-name" style="margin-top:10px;font-size:1.3rem">${m.titulo}</div>
    <hr class="detail-divider">
    ${tabs}${content}
    ${docs ? `<hr class="detail-divider"><p class="detail-section-title">Documentos necessários</p><div class="docs-list">${docs}</div>` : ''}
    ${m.observacoes ? `<hr class="detail-divider"><p class="detail-section-title">Observações</p><div class="obs-box">${m.observacoes}</div>` : ''}
    </div>
  `;
  animateManualPanelContent(neto, modo, passoAtivo);
}

function fecharSistemaNetoFilho() {
  closeChildPanel('sistema-neto-panel');
}

function renderServicoNetoManual(m, modo, processoId, passoAtivo = 0) {
  const neto = document.getElementById('servico-neto-panel');
  if (!neto) return;

  const tabs = `
    <div class="manual-tabs" style="margin:0 0 16px">
      <button class="manual-tab ${modo==='resumido'?'active':''}"
              onclick="renderServicoNetoManual(manuais.find(x=>x.id===${m.id}),'resumido',${processoId},0)">
        <i class="ph-bold ph-list-numbers"></i> Resumido
      </button>
      <button class="manual-tab ${modo==='completo'?'active':''}"
              onclick="renderServicoNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},0)">
        <i class="ph-bold ph-presentation"></i> Completo
      </button>
    </div>`;

  let content = '';
  if (modo === 'resumido') {
    content = `<div class="manual-content-switch"><div class="manual-steps">${m.passos.map((p, i) => `
      <div class="manual-step">
        <div class="step-number">${i+1}</div>
        <div class="step-text">${typeof p==='string' ? p : p.texto}</div>
      </div>`).join('')}</div></div>`;
  } else {
    const passo = m.passos[passoAtivo];
    const texto = typeof passo === 'string' ? passo : passo.texto;
    const imagem = typeof passo === 'object' && passo.imagem ? passo.imagem : '';
    const total = m.passos.length;
    content = `
      <div class="manual-content-switch"><div class="manual-completo">
        ${buildManualPaginationHTML(
          total,
          passoAtivo,
          i => `renderServicoNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},${i})`,
          `renderServicoNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},${passoAtivo-1})`,
          `renderServicoNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},${passoAtivo+1})`
        )}
        <div class="manual-passo-card">
          <div class="manual-passo-header">
            <span class="step-number">${passoAtivo+1}</span>
            <strong>Passo ${passoAtivo+1} de ${total}</strong>
          </div>
          <div class="manual-passo-body">
            <p class="manual-passo-texto">${texto}</p>
            ${imagem
              ? `<div class="manual-passo-img-container"><img src="${imagem}" class="manual-passo-img"/></div>`
              : `<div class="manual-passo-no-img"><i class="ph-bold ph-image-square"></i><span>Nenhuma imagem.</span></div>`}
          </div>
          <div class="manual-passo-footer">
            <button class="btn-passo" ${passoAtivo===0?'disabled':''}
                    onclick="renderServicoNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},${passoAtivo-1})">
              <i class="ph-bold ph-arrow-left"></i> Anterior</button>
            <button class="btn-passo btn-passo-primary" ${passoAtivo===total-1?'disabled':''}
                    onclick="renderServicoNetoManual(manuais.find(x=>x.id===${m.id}),'completo',${processoId},${passoAtivo+1})">
              Próximo <i class="ph-bold ph-arrow-right"></i></button>
          </div>
        </div>
      </div></div>`;
  }

  const docs = (m.documentos || []).map(d => {
    const isObj = typeof d === 'object' && d !== null;
    const nome = isObj ? d.nome : d;
    const aid = isObj ? d.arquivo_id : null;
    if (aid) {
      const a = arquivos.find(x => x.id === aid);
      if (a && (a.arquivo_data || a.url)) {
        const href = a.arquivo_data || a.url;
        const attrs = a.arquivo_data ? `download="${a.arquivo_nome || a.nome}"` : 'target="_blank" rel="noopener"';
        return `<a href="${href}" ${attrs} class="doc-tag doc-tag-link" style="text-decoration:none">
          <i class="ph-bold ph-download-simple"></i>${nome}</a>`;
      }
    }
    return `<span class="doc-tag"><i class="ph-bold ph-file-text"></i>${nome}</span>`;
  }).join('');

  neto.innerHTML = `
    <div class="manual-transition-scope">
    <div class="manual-filho-header">
      <button class="manual-filho-back" onclick="fecharServicoNetoFilho()">
        <i class="ph-bold ph-arrow-left"></i> Voltar ao processo
      </button>
      <button class="detail-close" style="position:static;width:32px;height:32px" onclick="fecharServicoCompleto()">
        <i class="ph-bold ph-x"></i>
      </button>
    </div>
    <span class="detail-badge">${m.categoria}</span>
    <div class="detail-name" style="margin-top:10px;font-size:1.3rem">${m.titulo}</div>
    <hr class="detail-divider">
    ${tabs}${content}
    ${docs ? `<hr class="detail-divider"><p class="detail-section-title">Documentos necessários</p><div class="docs-list">${docs}</div>` : ''}
    ${m.observacoes ? `<hr class="detail-divider"><p class="detail-section-title">Observações</p><div class="obs-box">${m.observacoes}</div>` : ''}
    </div>
  `;
  animateManualPanelContent(neto, modo, passoAtivo);
}

function fecharServicoNetoFilho() {
  closeNestedPanel({ panelId: 'servico-neto-panel' });
}

function fecharServicoFilho() {
  closeNestedPanel({ panelId: 'servico-filho-panel', nestedPanelIds: ['servico-neto-panel'] });
}

function fecharServicoCompleto() {
  closeDetail('servico-detail-overlay');
}

function eventoItemHTML(e, mostrarData = true) {
  const tipo  = tipoEvento[e.tipo] || tipoEvento.evento;
  const timing = getEventoTiming(e);
  const badgeDate = timing.dataBadge ? new Date(timing.dataBadge + "T00:00:00") : null;
  const isHoje = badgeDate ? badgeDate.toDateString() === new Date().toDateString() : false;
  const dia   = badgeDate ? String(badgeDate.getDate()).padStart(2, "0") : "--";
  const mes   = badgeDate ? MESES_PT[badgeDate.getMonth()].slice(0, 3) : "---";
  const duracao = e.tipo !== 'prazo' && e.data_fim
    ? ` <span class="evento-duracao">até ${new Date(e.data_fim+"T00:00:00").getDate()}/${MESES_PT[new Date(e.data_fim+"T00:00:00").getMonth()].slice(0,3)}</span>`
    : "";
  const horaMeta = e.tipo === 'prazo'
    ? (e.hora_fim ? `<span><i class="ph-bold ph-clock"></i> ${e.hora_fim}</span>` : "")
    : [e.hora, e.hora_fim].filter(Boolean).length
      ? `<span><i class="ph-bold ph-clock"></i> ${[e.hora, e.hora_fim].filter(Boolean).join(" - ")}</span>`
      : "";

  return `
    <div class="evento-item" onclick="navigateTo('agenda'); setTimeout(() => openEvento(${e.id}), 120)">
      ${mostrarData ? `
      <div class="evento-date-badge" style="color:${tipo.cor};background:color-mix(in srgb,${tipo.cor} 10%,transparent)">
        <span class="evento-dia">${dia}</span>
        <span class="evento-mes">${mes}</span>
      </div>` : ""}
      <div class="evento-body">
        <div class="evento-titulo">
          ${isHoje ? '<span class="evento-hoje-tag">Hoje</span>' : ""}
          ${e.titulo}${duracao}
        </div>
        <div class="evento-meta">
          <span style="color:${tipo.cor}"><i class="ph-bold ${tipo.icone}"></i> ${tipo.label}</span>
          <span><i class="ph-bold ph-map-pin"></i> ${e.local}</span>
          ${horaMeta}
        </div>
        ${e.desc ? `<p class="evento-desc">${e.desc}</p>` : ""}
      </div>
    </div>`;
}

function renderDashEventos() {
  const container = document.getElementById("dash-eventos-list");
  if (!container) return;

  const proximos = agendaEventos
    .filter(e => {
      const timing = getEventoTiming(e);
      return !!timing.fim && timing.fim >= new Date();
    })
    .sort((a, b) => getEventoTiming(a).sortDate - getEventoTiming(b).sortDate);

  if (proximos.length === 0) {
    container.innerHTML = `<p class="eventos-vazio">Nenhum evento próximo.</p>`;
    return;
  }
  container.innerHTML = proximos.map(e => eventoItemHTML(e)).join("");
}

function renderCalendar() {
  const label = document.getElementById("cal-month-label");
  const grid  = document.getElementById("cal-grid");
  if (!label || !grid) return;

  label.textContent = `${MESES_PT[calMonth]} ${calYear}`;

  const hoje        = new Date();
  const primeiroDia = new Date(calYear, calMonth, 1).getDay();
  const diasNoMes   = new Date(calYear, calMonth + 1, 0).getDate();

  const eventosPorDia = {};
  agendaEventos.forEach(e => {
    const timing = getEventoTiming(e);
    const inicio = timing.isPrazo ? timing.fim : timing.inicio;
    const fim = timing.fim;
    if (!inicio || !fim) return;

    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const dia = d.getDate();
        if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
        eventosPorDia[dia].push(e);
      }
    }
  });

  let html = DIAS_PT.map(d => `<span class="cal-dow">${d}</span>`).join("");
  for (let i = 0; i < primeiroDia; i++) html += `<span class="cal-cell empty"></span>`;

  for (let d = 1; d <= diasNoMes; d++) {
    const isHoje    = d === hoje.getDate() && calMonth === hoje.getMonth() && calYear === hoje.getFullYear();
    const evs       = eventosPorDia[d];
    const temEvento = !!evs;

    if (temEvento) {
      const indicadores = evs.map(e => {
        const cor = (tipoEvento[e.tipo] || tipoEvento.evento).cor;
        return `<span class="cal-marker" style="--mc:${cor}"></span>`;
      }).join("");
      const payload = JSON.stringify(evs.map(e => ({
        titulo: e.titulo,
        tipo: e.tipo,
        hora: e.hora || null,
        hora_fim: e.hora_fim || null,
        local: e.local || null,
        multi: !!e.data_fim && e.tipo !== 'prazo',
      })));
      html += `
        <span class="cal-cell has-event${isHoje ? " today" : ""}" data-eventos='${payload.replace(/'/g, "&#39;")}'>
          <span class="cal-day-num">${d}</span>
          <span class="cal-markers">${indicadores}</span>
        </span>`;
    } else {
      html += `<span class="cal-cell${isHoje ? " today" : ""}"><span class="cal-day-num">${d}</span></span>`;
    }
  }

  grid.innerHTML = html;
  initCalTooltip(grid);
}

function initCalTooltip(grid) {
  const old = document.getElementById("cal-tooltip");
  if (old) old.remove();

  const tip = document.createElement("div");
  tip.id = "cal-tooltip";
  tip.className = "cal-tooltip";
  tip.hidden = true;
  document.body.appendChild(tip);

  grid.addEventListener("mouseenter", (e) => {
    const cell = e.target.closest(".cal-cell.has-event");
    if (!cell) return;

    const evs = JSON.parse(cell.dataset.eventos);
    tip.innerHTML = evs.map(ev => {
      const tipo = tipoEvento[ev.tipo] || tipoEvento.evento;
      const horas = [ev.hora, ev.hora_fim].filter(Boolean).map(h => `<span class="cal-tip-hora">${h}</span>`).join("");
      const multi = ev.multi ? `<span class="cal-tip-multi">Multi-dia</span>` : "";
      return `
        <div class="cal-tip-item">
          <span class="cal-tip-dot" style="background:${tipo.cor}"></span>
          <div class="cal-tip-info">
            <span class="cal-tip-titulo">${ev.titulo}</span>
            <span class="cal-tip-meta">
              <span class="cal-tip-tag" style="--ct:${tipo.cor}">${tipo.label}</span>
              ${horas}${multi}
              ${ev.local ? `· ${ev.local}` : ""}
            </span>
          </div>
        </div>`;
    }).join("");

    tip.hidden = false;
    positionTooltip(tip, cell);
  }, true);

  grid.addEventListener("mouseleave", (e) => {
    if (e.target.closest(".cal-cell.has-event")) tip.hidden = true;
  }, true);

  grid.addEventListener("mousemove", (e) => {
    const cell = e.target.closest(".cal-cell.has-event");
    if (cell && !tip.hidden) positionTooltip(tip, cell);
  }, true);
}

function initAgenda() {
  renderAvisos(avisos);
  renderAgendaEventos(agendaEventos);
  renderAgendaHistorico(agendaEventos);

  // Restaura estado do toggle do histórico
  _restoreAgendaHistoricoState();

  const agendaSearch = restoreModuleSearchInput("agenda", "agenda-search");
  if (agendaSearch) {
    applyAgendaSearch(agendaSearch.value);
    agendaSearch.addEventListener("input", (e) => {
      setModuleSearchValue("agenda", e.target.value);
      applyAgendaSearch(e.target.value);
    });
  }

  [
    ["aviso-detail-close", "aviso-detail-overlay"],
    ["evento-detail-close", "evento-detail-overlay"],
  ].forEach(([btnId, overlayId]) => {
    const btn = document.getElementById(btnId);
    const overlay = document.getElementById(overlayId);
    if (!btn || !overlay) return;

    btn.addEventListener("click", closeDetail.bind(null, overlayId));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDetail(overlayId);
    });
  });
}

const AGENDA_UI_STATE_KEY = "smader_agenda_ui_state_v1";

function _loadAgendaUIState() {
  try {
    const saved = localStorage.getItem(AGENDA_UI_STATE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function _persistAgendaHistoricoState(aberto) {
  try {
    const state = _loadAgendaUIState();
    state.historicoAberto = aberto;
    localStorage.setItem(AGENDA_UI_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[Agenda] Falha ao salvar estado do histórico:", error);
  }
}

function _restoreAgendaHistoricoState() {
  const state = _loadAgendaUIState();
  const aberto = state.historicoAberto === true;
  const wrap    = document.getElementById("historico-eventos-wrap");
  const chevron = document.getElementById("historico-chevron");
  const label   = document.getElementById("historico-toggle-label");

  if (!wrap) return;

  wrap.hidden = !aberto;
  if (chevron) chevron.style.transform = aberto ? "rotate(180deg)" : "";

  // Atualiza label com contagem — o container já foi preenchido por renderAgendaHistorico
  if (label) {
    const container = document.getElementById("agenda-historico-list");
    const total = container ? container.querySelectorAll(".agenda-card").length : 0;
    label.textContent = aberto ? `Ocultar (${total})` : `Mostrar (${total})`;
  }
}

function applyAgendaSearch(query = getModuleSearchValue("agenda")) {
  const q = String(query || "").toLowerCase().trim();

  const avisosFiltrados = q
    ? avisos.filter(a =>
        a.titulo.toLowerCase().includes(q) ||
        (a.desc || "").toLowerCase().includes(q) ||
        (a.local || "").toLowerCase().includes(q) ||
        (a.tipo || "").toLowerCase().includes(q)
      )
    : avisos;

  const eventosFiltrados = q
    ? agendaEventos.filter(ev =>
        ev.titulo.toLowerCase().includes(q) ||
        (ev.desc || "").toLowerCase().includes(q) ||
        (ev.local || "").toLowerCase().includes(q) ||
        (ev.tipo || "").toLowerCase().includes(q)
      )
    : agendaEventos;

  renderAvisos(avisosFiltrados);
  renderAgendaEventos(eventosFiltrados);
  renderAgendaHistorico(eventosFiltrados);
}

function renderAvisos(lista = avisos) {
  const container = document.getElementById("avisos-list");
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = `<p class="modulo-vazio">Nenhum aviso encontrado.</p>`;
    return;
  }

  animateGridReflow(container, () => {
    container.innerHTML = lista.map(a => {
      const tipo = tipoAviso[a.tipo] || tipoAviso.aviso;
      return `
        <div class="agenda-card card" data-reflow-id="aviso-${a.id}" onclick="openAviso(${a.id})" style="cursor:pointer">
          <div class="agenda-card-header">
            <div class="agenda-date-badge" style="color:${tipo.cor};background:color-mix(in srgb,${tipo.cor} 10%,transparent)">
              <i class="ph-bold ${tipo.icone}"></i>
            </div>
            <div class="agenda-card-meta">
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                <span class="agenda-tag" style="background:color-mix(in srgb,${tipo.cor} 12%,transparent);color:${tipo.cor}">
                  <i class="ph-bold ${tipo.icone}"></i> ${tipo.label}
                </span>
              </div>
              <strong class="agenda-card-titulo">${a.titulo}</strong>
            </div>
          </div>
          <div class="agenda-card-local">
            ${a.local ? `<i class="ph-bold ph-map-pin"></i>${a.local}` : `<i class="ph-bold ph-info"></i>Comunicado interno`}
          </div>
          ${a.desc ? `<p class="agenda-card-desc">${a.desc}</p>` : ""}
        </div>
      `;
    }).join("");
  }, ".agenda-card[data-reflow-id]");
}

function openAviso(id) {
  const a = avisos.find(x => x.id === id);
  if (!a) return;

  const tipo = tipoAviso[a.tipo] || tipoAviso.aviso;

  document.getElementById("aviso-detail-content").innerHTML = `
    <div class="detail-avatar-large" style="background:color-mix(in srgb,${tipo.cor} 12%,transparent);color:${tipo.cor}">
      <i class="ph-bold ${tipo.icone}"></i>
    </div>
    <div class="detail-name">${a.titulo}</div>
    <span class="detail-badge" style="background:color-mix(in srgb,${tipo.cor} 12%,transparent);color:${tipo.cor}">${tipo.label}</span>
    <hr class="detail-divider">
    <p class="detail-section-title">Local / contexto</p>
    <div class="detail-info-grid">
      <div class="detail-info-item" style="grid-column:1/-1">
        <label>Referência</label>
        <span>${a.local || "Comunicado interno"}</span>
      </div>
    </div>
    ${a.desc ? `
      <hr class="detail-divider">
      <p class="detail-section-title">Descrição</p>
      <p class="detail-desc">${a.desc}</p>` : ""}
  `;

  openDetail("aviso-detail-overlay");
}

function renderAgendaEventos(lista) {
  const container = document.getElementById("agenda-eventos-list");
  if (!container) return;

  // Apenas eventos ativos ou futuros
  const ativos = lista.filter(e => !getEventoTiming(e).encerrado);

  if (ativos.length === 0) {
    container.innerHTML = `<p class="modulo-vazio">Nenhum evento ativo ou futuro encontrado.</p>`;
    return;
  }

  const sorted = [...ativos].sort((a, b) => getEventoTiming(a).sortDate - getEventoTiming(b).sortDate);

  animateGridReflow(container, () => {
    container.innerHTML = sorted.map(e => _agendaEventoCardHTML(e)).join("");
  }, ".agenda-card[data-reflow-id]");
}

/* ── Renderiza histórico (encerrados, do mais recente ao mais antigo) ── */
function renderAgendaHistorico(lista) {
  const container = document.getElementById("agenda-historico-list");
  if (!container) return;

  const encerrados = lista.filter(e => getEventoTiming(e).encerrado);

  if (encerrados.length === 0) {
    container.innerHTML = `<p class="modulo-vazio">Nenhum evento encerrado.</p>`;
    // Atualiza o contador no botão
    const label = document.getElementById("historico-toggle-label");
    if (label) label.textContent = "Mostrar (0)";
    return;
  }

  // Mais recente primeiro
  const sorted = [...encerrados].sort((a, b) => getEventoTiming(b).sortDate - getEventoTiming(a).sortDate);

  // Atualiza contador no botão toggle
  const label = document.getElementById("historico-toggle-label");
  if (label) {
    const wrap = document.getElementById("historico-eventos-wrap");
    const aberto = wrap && !wrap.hidden;
    label.textContent = aberto ? `Ocultar (${encerrados.length})` : `Mostrar (${encerrados.length})`;
  }

  animateGridReflow(container, () => {
    container.innerHTML = sorted.map(e => _agendaEventoCardHTML(e, true)).join("");
  }, ".agenda-card[data-reflow-id]");
}

/* ── Toggle de visibilidade do histórico ── */
function toggleHistorico() {
  const wrap     = document.getElementById("historico-eventos-wrap");
  const chevron  = document.getElementById("historico-chevron");
  const label    = document.getElementById("historico-toggle-label");
  if (!wrap) return;

  const abrindo = wrap.hidden;
  wrap.hidden = !abrindo;

  if (chevron) chevron.style.transform = abrindo ? "rotate(180deg)" : "";

  // Atualiza label com contagem
  const container = document.getElementById("agenda-historico-list");
  const total = container ? container.querySelectorAll(".agenda-card").length : 0;
  if (label) label.textContent = abrindo ? `Ocultar (${total})` : `Mostrar (${total})`;

  // Persiste o novo estado
  _persistAgendaHistoricoState(abrindo);
}

/* ── HTML compartilhado de card de evento (ativo ou histórico) ── */
function _agendaEventoCardHTML(e, isHistorico = false) {
  const tipo   = tipoEvento[e.tipo] || tipoEvento.evento;
  const timing = getEventoTiming(e);
  const baseDate = timing.dataBadge ? new Date(timing.dataBadge + "T00:00:00") : new Date();
  const dia  = String(baseDate.getDate()).padStart(2,"0");
  const mes  = MESES_PT[baseDate.getMonth()].slice(0,3);
  const periodoHTML = formatEventoPeriodo(e);
  const horarioLinha = e.tipo === 'prazo'
    ? (e.hora_fim ? ` · <i class="ph-bold ph-clock"></i>${e.hora_fim}` : "")
    : [e.hora, e.hora_fim].filter(Boolean).length
      ? ` · <i class="ph-bold ph-clock"></i>${[e.hora, e.hora_fim].filter(Boolean).join(" - ")}`
      : "";

  return `
    <div class="agenda-card card${isHistorico ? " agenda-card--passado" : ""}" data-reflow-id="evento-${e.id}" onclick="openEvento(${e.id})" style="cursor:pointer">
      <div class="agenda-card-header">
        <div class="agenda-date-badge" style="color:${isHistorico ? 'var(--text-muted)' : tipo.cor};background:color-mix(in srgb,${isHistorico ? '#8a9482' : tipo.cor} 10%,transparent)">
          <span class="evento-dia">${dia}</span>
          <span class="evento-mes">${mes}</span>
        </div>
        <div class="agenda-card-meta">
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span class="agenda-tag" style="background:color-mix(in srgb,${isHistorico ? '#8a9482' : tipo.cor} 12%,transparent);color:${isHistorico ? 'var(--text-muted)' : tipo.cor}">
              <i class="ph-bold ${tipo.icone}"></i> ${tipo.label}
            </span>
            ${timing.emAndamento ? '<span class="evento-hoje-tag">Em andamento</span>' : ""}
            ${isHistorico ? '<span class="agenda-passado-tag">Encerrado</span>' : ""}
          </div>
          <strong class="agenda-card-titulo">${e.titulo}</strong>
        </div>
      </div>
      <div class="agenda-card-local">
        <i class="ph-bold ph-calendar-blank"></i>${periodoHTML}
        ${horarioLinha}
        ${e.local ? ` &nbsp;·&nbsp;<i class="ph-bold ph-map-pin"></i>${e.local}` : ""}
      </div>
      ${e.desc ? `<p class="agenda-card-desc">${e.desc}</p>` : ""}
    </div>
  `;
}

function openEvento(id) {
  const e = agendaEventos.find(x => x.id === id);
  if (!e) return;

  const tipo  = tipoEvento[e.tipo] || tipoEvento.evento;
  const timing = getEventoTiming(e);
  const periodoLabel = formatEventoPeriodo(e);

  const statusBadge = timing.emAndamento
    ? `<span class="detail-badge" style="background:#e8f5ee;color:#2d6a4f">Em andamento</span>`
    : timing.encerrado
      ? `<span class="detail-badge" style="background:var(--surface-2);color:var(--text-muted)">Encerrado</span>`
      : `<span class="detail-badge" style="background:color-mix(in srgb,${tipo.cor} 12%,transparent);color:${tipo.cor}">${tipo.label}</span>`;

  document.getElementById("evento-detail-content").innerHTML = `
    <div class="detail-avatar-large" style="background:color-mix(in srgb,${tipo.cor} 12%,transparent);color:${tipo.cor}">
      <i class="ph-bold ${tipo.icone}"></i>
    </div>
    <div class="detail-name">${e.titulo}</div>
    ${statusBadge}
    <hr class="detail-divider">
    <p class="detail-section-title">Data e local</p>
    <div class="detail-info-grid">
      <div class="detail-info-item" style="grid-column:1/-1">
        <label>${timing.isPrazo ? 'Prazo final' : 'Período'}</label>
        <span>${periodoLabel}</span>
      </div>
      ${!timing.isPrazo && e.hora ? `<div class="detail-info-item"><label>Hora inicial</label><span>${e.hora}</span></div>` : ""}
      ${e.hora_fim ? `<div class="detail-info-item"><label>${timing.isPrazo ? 'Hora final' : 'Hora final'}</label><span>${e.hora_fim}</span></div>` : ""}
      ${e.local ? `<div class="detail-info-item"><label>Local</label><span>${e.local}</span></div>` : ""}
    </div>
    ${e.desc ? `
      <hr class="detail-divider">
      <p class="detail-section-title">Descrição</p>
      <p class="detail-desc">${e.desc}</p>` : ""}
  `;
  openDetail("evento-detail-overlay");
}

function initRelatorios() {
  const grid = document.getElementById("relatorios-grid");
  const backBtn = document.getElementById("relatorio-back-btn");
  const printBtn = document.getElementById("relatorio-print-btn");

  if (grid) {
    grid.querySelectorAll("[data-relatorio]").forEach(btn => {
      btn.addEventListener("click", () => openRelatorio(btn.dataset.relatorio));
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", resetRelatoriosView);
  }

  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }
}

function resetRelatoriosView() {
  const grid = document.getElementById("relatorios-grid");
  const view = document.getElementById("relatorio-view");
  const area = document.getElementById("relatorio-print-area");
  if (grid) grid.hidden = false;
  if (view) view.hidden = true;
  if (area) area.innerHTML = "";
}

function openRelatorio(tipo) {
  const grid = document.getElementById("relatorios-grid");
  const view = document.getElementById("relatorio-view");
  const area = document.getElementById("relatorio-print-area");
  if (!grid || !view || !area) return;

  const renderers = {
    funcionarios: renderRelatorioFuncionarios,
    veiculos: renderRelatorioVeiculos,
    secretaria: renderRelatorioSecretaria,
    municipio: renderRelatorioMunicipio,
    orgaos: renderRelatorioOrgaos,
    servicos: renderRelatorioServicos,
    agenda: renderRelatorioAgenda,
    "historico-agenda": renderRelatorioHistoricoAgenda,
    ferias: renderRelatorioFerias,
  };

  const renderer = renderers[tipo];
  if (!renderer) return;

  area.innerHTML = renderer();
  grid.hidden = true;
  view.hidden = false;
  area.scrollIntoView({ block: "start", behavior: "smooth" });
}

function relatorioLayoutHTML({ titulo, descricao, total, conteudo }) {
  return `
    <article class="relatorio-print-doc">
      <header class="relatorio-print-header">
        <div>
      <span class="relatorio-print-kicker">SMADER · Relatório</span>
          <h2 class="relatorio-print-title">${escapeHtml(titulo)}</h2>
          <p class="relatorio-print-subtitle">${escapeHtml(descricao)}</p>
        </div>
        <div class="relatorio-print-meta">
          <span><strong>Emitido em:</strong> ${new Date().toLocaleString("pt-BR")}</span>
          <span><strong>Total de registros:</strong> ${total}</span>
        </div>
      </header>
      ${conteudo}
    </article>
  `;
}

function relatorioTabelaHTML(colunas, linhas, tableClass = "") {
  const classes = ["relatorio-table"];
  if (tableClass) classes.push(tableClass);
  return `
    <div class="relatorio-table-wrap">
      <table class="${classes.join(" ")}">
        <thead>
          <tr>${colunas.map(c => `<th>${escapeHtml(c)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${linhas.map(linha => `
            <tr>${linha.map(valor => `<td>${escapeHtml(String(valor ?? "—"))}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function relatorioBlocosHTML(blocos) {
  return `
    <div class="relatorio-blocks">
      ${blocos.map(bloco => `
        <section class="relatorio-block">
          <div class="relatorio-block-head">
            <h3>${escapeHtml(bloco.titulo)}</h3>
            ${bloco.subtitulo ? `<p>${escapeHtml(bloco.subtitulo)}</p>` : ""}
          </div>
          <div class="relatorio-block-fields">
            ${bloco.campos.map(campo => `
              <div class="relatorio-field">
                <span class="relatorio-field-label">${escapeHtml(campo.label)}</span>
                <span class="relatorio-field-value">${escapeHtml(String(campo.valor ?? "—"))}</span>
              </div>
            `).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

function renderRelatorioFuncionarios() {
  const colunas = ["Nome", "Matrícula", "Cargo", "Data de admissão", "Telefone", "E-mail", "CPF", "Departamento"];
  const linhas = funcionarios.map(f => [
    f.nome || "—",
    f.matricula || "—",
    f.cargo || "—",
    formatDateBR(f.data_admissao),
    f.telefone || "—",
    f.email || "—",
    f.cpf || "—",
    f.departamento || "—",
  ]);

  return relatorioLayoutHTML({
    titulo: "Relação de Funcionários",
    descricao: "Listagem textual completa dos funcionários cadastrados.",
    total: linhas.length,
    conteudo: relatorioTabelaHTML(colunas, linhas, "relatorio-table--funcionarios"),
  });
}

function renderRelatorioVeiculos() {
  const colunas = ["Nome", "Tipo", "Marca", "Modelo", "Ano", "Placa", "Patrimonio", "Chassi", "RENAVAM", "Combustivel", "Motorista(s)"];
  const linhas = veiculos.map(v => [
    v.nome || "—",
    v.tipo || "—",
    v.marca || "—",
    v.modelo || "—",
    v.ano || "—",
    v.placa || "—",
    v.patrimonio || "—",
    v.chassi || "—",
    v.renavam || "—",
    v.combustivel || "—",
    v.motorista || "—",
  ]);

  return relatorioLayoutHTML({
    titulo: "Relação de Veículos",
    descricao: "Listagem da frota e dos principais dados patrimoniais cadastrados.",
    total: linhas.length,
    conteudo: relatorioTabelaHTML(colunas, linhas, "relatorio-table--veiculos"),
  });
}

function renderRelatorioSecretaria() {
  const blocos = infoJuridico.map(item => ({
    titulo: item.titulo || "Bloco",
    subtitulo: item.nome_completo || item.badge || item.tag || "",
    campos: (item.campos || []).map(campo => ({
      label: campo.label || "Campo",
      valor: campo.valor || "—",
    })),
  }));

  return relatorioLayoutHTML({
    titulo: "Dados da Secretaria",
    descricao: "Informações institucionais e contatos cadastrados para a secretaria.",
    total: blocos.length,
    conteudo: relatorioBlocosHTML(blocos),
  });
}

function renderRelatorioMunicipio() {
  const blocos = infoMunicipio.map(item => ({
    titulo: item.titulo || "Bloco",
    subtitulo: item.nome_completo || item.badge || item.tag || "",
    campos: (item.campos || []).map(campo => ({
      label: campo.label || "Campo",
      valor: campo.valor || "—",
    })),
  }));

  return relatorioLayoutHTML({
    titulo: "Município e Prefeitura",
    descricao: "Dados administrativos e contatos cadastrados para o município e a prefeitura.",
    total: blocos.length,
    conteudo: relatorioBlocosHTML(blocos),
  });
}

function renderRelatorioOrgaos() {
  const blocos = infoOrgaos.map(item => ({
    titulo: item.titulo || "Órgão",
    subtitulo: item.nome_completo || "",
    campos: [
      ...(item.atribuicao ? [{ label: "Atribuição", valor: item.atribuicao }] : []),
      ...((item.campos || []).map(campo => ({
        label: campo.label || "Campo",
        valor: campo.valor || "—",
      }))),
    ],
  }));

  return relatorioLayoutHTML({
    titulo: "Órgãos Parceiros",
    descricao: "Listagem dos órgãos parceiros e seus dados de contato.",
    total: blocos.length,
    conteudo: relatorioBlocosHTML(blocos),
  });
}

function renderRelatorioServicos() {
  const blocosHTML = servicos.map(servico => {
    const campos = [
      { label: "Público-alvo", valor: servico.publico || "—" },
      { label: "Como solicitar", valor: servico.como_solicitar || "—" },
      { label: "Prazo", valor: servico.prazo || "—" },
      { label: "Descrição", valor: servico.descricao || "—" },
      ...(servico.obs ? [{ label: "Observações", valor: servico.obs }] : []),
    ];

    const documentos = (servico.documentos || []).map(doc =>
      typeof doc === "object" && doc !== null ? (doc.nome || "—") : (doc || "—")
    ).filter(Boolean);

    return `
      <section class="relatorio-block">
        <div class="relatorio-block-head">
          <h3>${escapeHtml(servico.nome || "Serviço")}</h3>
          ${servico.categoria ? `<p>${escapeHtml(servico.categoria)}</p>` : ""}
        </div>
        <div class="relatorio-block-fields">
          ${campos.map(campo => `
            <div class="relatorio-field">
              <span class="relatorio-field-label">${escapeHtml(campo.label)}</span>
              <span class="relatorio-field-value">${escapeHtml(String(campo.valor ?? "—"))}</span>
            </div>
          `).join("")}
        </div>
        ${documentos.length ? `
          <div class="relatorio-subsection">
            <div class="relatorio-subsection-title">Documentação</div>
            <div class="relatorio-doc-list">
              ${documentos.map((doc, index) => `
                <div class="relatorio-doc-item">
                  <span class="relatorio-doc-index">${index + 1}.</span>
                  <span class="relatorio-doc-text">${escapeHtml(doc)}</span>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </section>
    `;
  }).join("");

  return relatorioLayoutHTML({
    titulo: "Serviços Cadastrados",
    descricao: "Listagem textual dos serviços cadastrados pela secretaria.",
    total: servicos.length,
    conteudo: `<div class="relatorio-blocks">${blocosHTML}</div>`,
  });
}

function getEventoStatusLabel(evento) {
  const timing = getEventoTiming(evento);
  if (timing.encerrado) return "Encerrado";
  if (timing.emAndamento) return "Em andamento";
  return "Agendado";
}

function buildRelatorioAgendaRows(listaEventos) {
  return listaEventos.map(evento => [
    evento.titulo || "—",
    tipoEvento[evento.tipo]?.label || evento.tipo || "—",
    formatDateBR(evento.data),
    formatDateBR(evento.data_fim),
    evento.hora || "—",
    evento.hora_fim || "—",
    evento.local || "—",
    getEventoStatusLabel(evento),
    evento.desc || "—",
  ]);
}

function renderRelatorioAgenda() {
  const eventos = [...agendaEventos]
    .filter(evento => !getEventoTiming(evento).encerrado)
    .sort((a, b) => getEventoTiming(a).sortDate - getEventoTiming(b).sortDate);

  const colunas = ["Título", "Tipo", "Data inicial", "Data final", "Hora inicial", "Hora final", "Local", "Status", "Descrição"];

  return relatorioLayoutHTML({
    titulo: "Agenda",
    descricao: "Eventos em andamento e eventos futuros, ordenados do mais próximo para o mais distante.",
    total: eventos.length,
    conteudo: relatorioTabelaHTML(colunas, buildRelatorioAgendaRows(eventos), "relatorio-table--agenda"),
  });
}

function renderRelatorioHistoricoAgenda() {
  const eventos = [...agendaEventos]
    .filter(evento => getEventoTiming(evento).encerrado)
    .sort((a, b) => getEventoTiming(b).sortDate - getEventoTiming(a).sortDate);

  const colunas = ["Título", "Tipo", "Data inicial", "Data final", "Hora inicial", "Hora final", "Local", "Status", "Descrição"];

  return relatorioLayoutHTML({
    titulo: "Histórico de Agenda",
    descricao: "Eventos encerrados, ordenados do mais recente para o mais antigo.",
    total: eventos.length,
    conteudo: relatorioTabelaHTML(colunas, buildRelatorioAgendaRows(eventos), "relatorio-table--agenda"),
  });
}

function renderRelatorioFerias() {
  const colunas = ["Funcionário", "Cargo", "Início", "Fim", "Status"];
  const linhas = escalaFerias.map(f => [
    f.nome || "—",
    f.cargo || "—",
    formatDateBR(f.periodo_inicio),
    formatDateBR(f.periodo_fim),
    getFeriasStatus(f.periodo_inicio, f.periodo_fim),
  ]);

  return relatorioLayoutHTML({
    titulo: "Escala de Férias",
    descricao: "Relação dos períodos de férias cadastrados com status calculado automaticamente.",
    total: linhas.length,
    conteudo: relatorioTabelaHTML(colunas, linhas),
  });
}

function initMobile() {
  const hamburger = document.getElementById("hamburger");
  const sidebar = document.getElementById("sidebar");

  // Cria backdrop para fechar sidebar
  const backdrop = document.createElement("div");
  backdrop.classList.add("sidebar-backdrop");
  document.body.appendChild(backdrop);

  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    backdrop.classList.toggle("visible");
  });

  backdrop.addEventListener("click", closeMobileSidebar);
}

function closeMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.querySelector(".sidebar-backdrop");
  if (sidebar) sidebar.classList.remove("open");
  if (backdrop) backdrop.classList.remove("visible");
}


/* ============================================================
   LIGHTBOX — zoom de imagens dos manuais
   ============================================================ */
function initLightbox() {
  // Cria o overlay uma única vez
  const overlay = document.createElement("div");
  overlay.id = "lightbox-overlay";
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = `
    <button class="lightbox-close" id="lightbox-close" aria-label="Fechar">
      <i class="ph-bold ph-x"></i>
    </button>
    <img class="lightbox-img" id="lightbox-img" src="" alt="" />
  `;
  document.body.appendChild(overlay);

  // Fechar ao clicar no fundo ou no botão X
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".lightbox-close")) {
      closeLightbox();
    }
  });

  // Fechar com Escape (prioridade menor que outros overlays — não interrompe)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) {
      closeLightbox();
    }
  });

  // Delegação de eventos — captura cliques em qualquer .manual-passo-img
  document.addEventListener("click", (e) => {
    const img = e.target.closest(".manual-passo-img");
    if (img && img.src) openLightbox(img.src, img.alt);
  });
}

function openLightbox(src, alt = "") {
  const overlay = document.getElementById("lightbox-overlay");
  const img     = document.getElementById("lightbox-img");
  if (!overlay || !img) return;
  img.src = src;
  img.alt = alt;
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const overlay = document.getElementById("lightbox-overlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}

/* ============================================================
   UTILITÁRIO — Iniciais do nome para avatar
   ============================================================ */
function getInitials(nome) {
  const partes = nome.trim().split(" ");
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
