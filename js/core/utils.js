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

  global.SisUtils = { escapeHtml, escapeAttr };
})(typeof window !== 'undefined' ? window : globalThis);
