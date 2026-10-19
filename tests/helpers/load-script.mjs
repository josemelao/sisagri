/**
 * Carrega os scripts classicos do app dentro de um contexto `node:vm`.
 *
 * Por que isso existe: `db.js`, `script.js` e `admin.js` sao scripts de
 * navegador sem modulo. Nao da para `import` eles. Este helper monta um
 * ambiente falso (window, document, localStorage, eventos) e executa o arquivo
 * como o navegador executaria, devolvendo um handle para inspecionar o que
 * ficou no escopo.
 *
 * Importante: os testes aqui sao de CHARACTERIZATION - eles fixam o
 * comportamento ATUAL, inclusive os defeitos conhecidos, para que qualquer
 * mudanca futura seja deliberada e visivel no diff.
 */

import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/* ------------------------------------------------------------------ */
/* pecas falsas                                                        */
/* ------------------------------------------------------------------ */

export function criarLocalStorage(inicial = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => { dados.set(String(chave), String(valor)); },
    removeItem: (chave) => { dados.delete(chave); },
    clear: () => dados.clear(),
    key: (i) => [...dados.keys()][i] ?? null,
    get length() { return dados.size; },
    // atalho para teste
    _dados: dados,
  };
}

export function criarElemento(tag = 'div') {
  const classes = new Set();
  const el = {
    tagName: String(tag).toUpperCase(),
    nodeType: 1,
    style: {},
    dataset: {},
    children: [],
    childNodes: [],
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    id: '',
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (c) => classes.has(c),
      toggle: (c, forcar) => {
        if (forcar === undefined) {
          if (classes.has(c)) { classes.delete(c); return false; }
          classes.add(c); return true;
        }
        if (forcar) { classes.add(c); return true; }
        classes.delete(c); return false;
      },
      toString: () => [...classes].join(' '),
    },
    appendChild: (filho) => { el.children.push(filho); el.childNodes.push(filho); return filho; },
    removeChild: (filho) => {
      const i = el.children.indexOf(filho);
      if (i >= 0) el.children.splice(i, 1);
      return filho;
    },
    insertBefore: (filho) => { el.children.push(filho); return filho; },
    replaceChildren: () => { el.children.length = 0; },
    setAttribute: () => {},
    getAttribute: () => null,
    removeAttribute: () => {},
    hasAttribute: () => false,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    contains: () => false,
    focus: () => {},
    blur: () => {},
    click: () => {},
    remove: () => {},
    scrollIntoView: () => {},
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  };
  return el;
}

export function criarDocumento() {
  const doc = {
    readyState: 'loading',
    title: '',
    cookie: '',
    body: criarElemento('body'),
    head: criarElemento('head'),
    documentElement: criarElemento('html'),
    activeElement: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    getElementById: () => null,
    getElementsByClassName: () => [],
    getElementsByTagName: () => [],
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => criarElemento(tag),
    createTextNode: (texto) => ({ nodeType: 3, textContent: texto }),
    createDocumentFragment: () => criarElemento('fragment'),
  };
  return doc;
}

/* ------------------------------------------------------------------ */
/* contexto                                                            */
/* ------------------------------------------------------------------ */

/**
 * Cria o contexto com todos os fakes e executa os arquivos na ordem dada.
 *
 * @param {string[]} arquivos  ex.: ['db.js'] ou ['db.js', 'script.js']
 * @param {object}   opcoes
 * @param {object}   opcoes.dadosIniciais  vira window.DADOS_INICIAIS
 * @param {boolean}  opcoes.supabase       false = deixa window.supabase ausente (modo local)
 * @param {object}   opcoes.localStorage   itens iniciais
 */
export function carregarScripts(arquivos, opcoes = {}) {
  const ouvintes = new Map();

  const sandbox = {
    console: opcoes.console || console,
    localStorage: criarLocalStorage(opcoes.localStorage),
    sessionStorage: criarLocalStorage(),
    document: criarDocumento(),
    navigator: { userAgent: 'node-test', language: 'pt-BR', onLine: true },
    location: { href: 'http://localhost:5173/index.html', pathname: '/index.html', hash: '', search: '', origin: 'http://localhost:5173' },
    history: { pushState: () => {}, replaceState: () => {}, back: () => {}, forward: () => {} },
    screen: { width: 1280, height: 720 },
    innerWidth: 1280,
    innerHeight: 720,
    scrollY: 0,
    scrollTo: () => {},
    alert: () => {},
    confirm: () => true,
    prompt: () => null,
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    fetch: () => Promise.reject(new Error('fetch desligado nos testes unitarios')),
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    AbortController,
    Blob: class Blob {},
    File: class File {},
    FileReader: class FileReader {},
    FormData: class FormData {},
    Image: class Image {},
    IntersectionObserver: class IntersectionObserver { observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class MutationObserver { observe() {} disconnect() {} },
    ResizeObserver: class ResizeObserver { observe() {} unobserve() {} disconnect() {} },
    addEventListener: (tipo, fn) => {
      if (!ouvintes.has(tipo)) ouvintes.set(tipo, []);
      ouvintes.get(tipo).push(fn);
    },
    removeEventListener: (tipo, fn) => {
      const lista = ouvintes.get(tipo) || [];
      const i = lista.indexOf(fn);
      if (i >= 0) lista.splice(i, 1);
    },
    dispatchEvent: (evento) => {
      (ouvintes.get(evento?.type) || []).slice().forEach((fn) => fn(evento));
      return true;
    },
  };

  // No navegador, window === globalThis.
  sandbox.window = sandbox;
  sandbox.self = sandbox;

  if (opcoes.dadosIniciais) sandbox.DADOS_INICIAIS = opcoes.dadosIniciais;
  if (opcoes.supabase !== false) sandbox.supabase = criarSupabaseFalso();

  const contexto = vm.createContext(sandbox);

  for (const arquivo of arquivos) {
    const codigo = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
    new vm.Script(codigo, { filename: arquivo }).runInContext(contexto);
  }

  return {
    contexto,
    window: sandbox,
    localStorage: sandbox.localStorage,
    /** le um identificador do escopo do script (funciona para const e function) */
    get(nome) {
      return vm.runInContext(nome, contexto);
    },
    /** executa codigo arbitrário no mesmo contexto */
    run(codigo) {
      return vm.runInContext(codigo, contexto);
    },
    /** dispara um evento registrado por window.addEventListener */
    disparar(tipo, detalhe = {}) {
      return sandbox.dispatchEvent({ type: tipo, ...detalhe });
    },
  };
}

/**
 * Cliente Supabase falso, minimo. Nao faz rede: so o suficiente para que
 * `_createSupabaseClient()` devolva algo e `getPublicUrl()` funcione.
 */
export function criarSupabaseFalso() {
  const cliente = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: {}, error: { message: 'fake' } }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: () => ({
      select: () => ({ order: async () => ({ data: [], error: null }), async then(r) { return r({ data: [], error: null }); } }),
      insert: async () => ({ error: null }),
      update: async () => ({ error: null }),
      delete: async () => ({ error: null }),
      upsert: async () => ({ error: null }),
    }),
    storage: {
      from: () => ({
        getPublicUrl: (caminho) => ({ data: { publicUrl: `https://fake.supabase.co/storage/v1/object/public/x/${caminho}` } }),
        upload: async () => ({ error: null }),
        remove: async () => ({ error: null }),
      }),
    },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  };
  return { createClient: () => cliente, _cliente: cliente };
}
