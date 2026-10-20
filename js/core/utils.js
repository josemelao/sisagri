/**
 * `SisUtils` — utilitarios compartilhados entre o site publico e o painel.
 *
 * Existe porque cada arquivo tinha a sua propria copia de "escapar HTML", e as
 * duas estavam erradas de formas diferentes:
 *
 *   - `script.js`: nao escapava aspas e lancava TypeError quando o valor era
 *     `null`/`undefined` (um dado faltando quebrava o render inteiro);
 *   - `admin.js`: nao escapava apostrofo e transformava `0`/`false` em ''.
 *
 * Ordem de carga: este arquivo entra ANTES de `db.js` nos dois HTMLs.
 * Esposto como `window.SisUtils`.
 */

(function (global) {
  'use strict';

  const ENTIDADES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  /**
   * Converte qualquer valor em texto seguro para HTML.
   * `null`/`undefined` viram '' — ausencia de dado nao deve derrubar a tela.
   *
   * @param {unknown} valor
   * @returns {string}
   */
  function escapeHtml(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor).replace(/[&<>"']/g, (caractere) => ENTIDADES[caractere]);
  }

  /**
   * O mesmo escape, com nome explicito para uso dentro de atributos
   * (`href="..."`, `alt="..."`). Aspas ja saem escapadas em `escapeHtml`;
   * a funcao existe para deixar a intencao visivel no ponto de uso.
   *
   * @param {unknown} valor
   * @returns {string}
   */
  function escapeAttr(valor) {
    return escapeHtml(valor);
  }

  /**
   * Barra esquemas que executam codigo quando viram `href`/`src`.
   * Nao mexe em URL normal (`https:`, `mailto:`, caminho relativo).
   *
   * @param {unknown} valor
   * @returns {string} a URL original, ou '' se o esquema for perigoso
   */
  function urlSegura(valor) {
    const texto = valor === null || valor === undefined ? '' : String(valor).trim();
    if (!texto) return '';
    // O navegador ignora espacos/controle ao ler o esquema ("java\tscript:").
    const semControle = texto.replace(/[\u0000-\u0020]+/g, '');
    if (/^(javascript|vbscript|data):/i.test(semControle)) return '';
    return texto;
  }

  /**
   * Unico ponto do app que aceita um pouquinho de HTML: campos de informacao
   * que hoje carregam link (info_juridico / info_municipio).
   *
   * Aceita SOMENTE `<a href="...">texto</a>` com esquema http/https/mailto/tel
   * (ou caminho relativo). Todo o resto — inclusive tag dentro do texto — vira
   * texto literal. O `style` e fixo: o visual de hoje nao muda.
   *
   * @param {unknown} valor
   * @returns {string} HTML seguro
   */
  function htmlComLinks(valor) {
    if (valor === null || valor === undefined) return '';
    const texto = String(valor);
    const reLink = /<a\s+([^>]*?)>([\s\S]*?)<\/a\s*>/gi;

    let saida = '';
    let ultimo = 0;
    let achado;

    while ((achado = reLink.exec(texto)) !== null) {
      saida += escapeHtml(texto.slice(ultimo, achado.index));

      const atributos = achado[1] || '';
      const href = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(atributos);
      const bruto = href ? (href[1] ?? href[2] ?? href[3] ?? '') : '';
      const url = urlSegura(bruto);

      const temEsquema = /^[a-z][a-z0-9+.-]*:/i.test(url);
      const esquemaPermitido = !temEsquema || /^(https?|mailto|tel):/i.test(url);

      if (url && esquemaPermitido) {
        saida += `<a href="${escapeAttr(url)}" style="text-decoration: underline;">${escapeHtml(achado[2])}</a>`;
      } else {
        saida += escapeHtml(achado[0]);
      }

      ultimo = achado.index + achado[0].length;
    }

    saida += escapeHtml(texto.slice(ultimo));
    return saida;
  }

  global.SisUtils = { escapeHtml, escapeAttr, urlSegura, htmlComLinks };
})(typeof window !== 'undefined' ? window : globalThis);
