/**
 * Motor de listas do painel administrativo (Bloco 11).
 *
 * Existe porque os 13 modulos do admin repetiam o mesmo ciclo:
 * guardar `query`/`page` num `*_LIST_STATE`, filtrar, ordenar, paginar,
 * renderizar e (em alguns casos) restaurar o cursor do campo de busca.
 *
 * Este controlador nao conhece `DB`, `document` de tela nem os dados: recebe
 * `filter`, `sort` e `render` prontos. Assim, migrar um modulo e trocar as
 * funcoes duplicadas por uma chamada, sem mudar o visual nem o comportamento.
 *
 * Uso:
 *   const lista = createListController({
 *     colecao: 'arquivos',
 *     pageSize: 12,
 *     filter: filtrarArquivosLista,
 *     sort: (itens) => paginarLista(itens, 1, itens.length)...,  // opcional
 *     render: (estado) => renderArquivos(estado),
 *     searchInputId: 'arquivos-search',
 *   });
 *
 *   lista.setItems(arquivos);      // ja renderiza
 *   lista.setQuery('manual');      // volta para a pagina 1 e renderiza
 *   lista.setPage(2);              // pagina absoluta, limitada ao total
 *   lista.aplicarBusca(inputEl);   // le o input, preserva o cursor
 *
 * Ordem de carga: depois de `js/core/utils.js` e antes de `admin.js`.
 * Esposto como `window.SisListas`.
 */

(function (global) {
  'use strict';

  const CHAVE_PADRAO = 'smader_admin_list_state_v1';
  const PAGINA_PADRAO = 1;
  const TAMANHO_PADRAO = 12;

  function inteiro(valor, padrao) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.trunc(numero) : padrao;
  }

  function texto(valor) {
    return valor === null || valor === undefined ? '' : String(valor);
  }

  /**
   * @param {object} opcoes
   * @param {string} opcoes.colecao       nome do modulo (chave de persistencia)
   * @param {number} [opcoes.pageSize]    itens por pagina (padrao 12)
   * @param {Function} [opcoes.filter]    (itens, query) => itens filtrados
   * @param {Function} [opcoes.sort]      (itens) => nova lista ordenada
   * @param {Function} [opcoes.render]    recebe o estado calculado
   * @param {string} [opcoes.searchInputId] id do input de busca
   * @param {string} [opcoes.stateKey]    chave do localStorage
   * @param {Storage} [opcoes.storage]    injetavel nos testes
   * @param {Document} [opcoes.document]  injetavel nos testes
   * @returns {{setItems: Function, setQuery: Function, setPage: Function,
   *   getState: Function, render: Function, aplicarBusca: Function}}
   */
  function createListController(opcoes) {
    const config = opcoes || {};
    const colecao = texto(config.colecao) || 'lista';
    const pageSizePedido = inteiro(config.pageSize, TAMANHO_PADRAO);
    const pageSize = pageSizePedido > 0 ? pageSizePedido : TAMANHO_PADRAO;
    const filtrar = typeof config.filter === 'function' ? config.filter : (itens) => itens;
    const ordenar = typeof config.sort === 'function' ? config.sort : (itens) => itens;
    const renderizar = typeof config.render === 'function' ? config.render : () => {};
    const stateKey = texto(config.stateKey) || CHAVE_PADRAO;
    const searchInputId = texto(config.searchInputId);
    const documento = config.document || (typeof global.document !== 'undefined' ? global.document : null);

    let itens = [];
    const estado = restaurar();

    function storage() {
      if (config.storage) return config.storage;
      try {
        return global.localStorage || null;
      } catch {
        return null;
      }
    }

    function lerMapa() {
      const alvo = storage();
      if (!alvo || typeof alvo.getItem !== 'function') return {};
      try {
        const bruto = alvo.getItem(stateKey);
        if (!bruto) return {};
        const dados = JSON.parse(bruto);
        return dados && typeof dados === 'object' ? dados : {};
      } catch {
        return {};
      }
    }

    function restaurar() {
      const salvo = lerMapa()[colecao];
      const query = salvo && typeof salvo === 'object' ? texto(salvo.query) : '';
      const pagina = salvo && typeof salvo === 'object'
        ? Math.max(PAGINA_PADRAO, inteiro(salvo.page, PAGINA_PADRAO))
        : PAGINA_PADRAO;
      return { query, page: pagina };
    }

    function persistir() {
      const alvo = storage();
      if (!alvo || typeof alvo.setItem !== 'function') return;
      try {
        const mapa = lerMapa();
        mapa[colecao] = { query: estado.query, page: estado.page };
        alvo.setItem(stateKey, JSON.stringify(mapa));
      } catch {
        // storage cheio/bloqueado (modo privado): a lista continua funcionando.
      }
    }

    function calcular() {
      const filtrados = filtrar(itens, estado.query);
      const base = Array.isArray(filtrados) ? filtrados : [];
      const ordenadosBrutos = ordenar(base.slice());
      const ordenados = Array.isArray(ordenadosBrutos) ? ordenadosBrutos : base;

      const total = ordenados.length;
      const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
      const pagina = Math.min(Math.max(PAGINA_PADRAO, estado.page), totalPaginas);
      const inicio = (pagina - 1) * pageSize;

      return {
        colecao,
        query: estado.query,
        pageSize,
        pagina,
        totalPaginas,
        total,
        totalColecao: itens.length,
        itens: ordenados.slice(inicio, inicio + pageSize),
        vazio: total === 0,
        semResultado: total === 0 && estado.query.trim() !== '',
      };
    }

    function render() {
      const resultado = calcular();
      // Guarda a pagina efetiva (pode ter sido limitada pelo total).
      estado.page = resultado.pagina;
      persistir();
      renderizar(resultado);
      return resultado;
    }

    function setItems(lista) {
      itens = Array.isArray(lista) ? lista.slice() : [];
      return render();
    }

    function setQuery(valor) {
      estado.query = texto(valor);
      estado.page = PAGINA_PADRAO;
      return render();
    }

    function setPage(pagina) {
      estado.page = inteiro(pagina, PAGINA_PADRAO);
      return render();
    }

    function getState() {
      return calcular();
    }

    /**
     * Le o valor do input de busca, aplica e devolve o foco/cursor ao campo.
     * Mesmo comportamento de `atualizarBusca*` no admin.js atual.
     */
    function aplicarBusca(inputEl) {
      const campo = inputEl
        || (documento && searchInputId ? documento.getElementById(searchInputId) : null);
      const valor = campo ? campo.value : '';
      const cursor = campo && typeof campo.selectionStart === 'number'
        ? campo.selectionStart
        : texto(valor).length;

      setQuery(valor);

      const proximo = documento && searchInputId ? documento.getElementById(searchInputId) : null;
      if (!proximo) return;
      if (typeof proximo.focus === 'function') proximo.focus();
      if (typeof proximo.setSelectionRange !== 'function') return;
      const seguro = Math.min(cursor, texto(proximo.value).length);
      proximo.setSelectionRange(seguro, seguro);
    }

    return { setItems, setQuery, setPage, getState, render, aplicarBusca };
  }

  global.SisListas = { createListController, CHAVE_PADRAO };
})(typeof window !== 'undefined' ? window : globalThis);
