/**
 * ESLint 9 - flat config.
 *
 * Objetivo deste bloco: MEDIR, nao corrigir. A linha de base esta anotada em
 * docs/qualidade/linha-de-base-lint.md. Se o lint comecar a acusar mais do que
 * isso, alguem introduziu um problema - e o CI avisa.
 *
 * Os 4 arquivos do app sao scripts classicos (sem modulo, sem bundler): sao
 * carregados direto por <script src> e compartilham o escopo global. Por isso
 * `sourceType: 'script'` e os globals de navegador.
 *
 * `DB` e `dbInit` sao declarados em db.js e consumidos por script.js/admin.js.
 * Por isso eles so entram como globais nos arquivos que os CONSOMEM - declara-los
 * em db.js dispararia `no-redeclare`.
 */

const globaisNavegador = require('globals').browser;

/** Globais comuns a qualquer script do app. */
const base = {
  ...globaisNavegador,
  // carregado por CDN em index.html / admin.html
  supabase: 'readonly',
};

/** Regras de correcao (erros) - estas sim precisam ficar em zero. */
const regrasApp = {
  'no-undef': 'error',
  'no-redeclare': 'error',
  'no-unused-vars': 'warn',
  'no-unreachable': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-cond-assign': 'error',
  'no-constant-condition': 'error',
  'no-self-assign': 'error',
  'no-sparse-arrays': 'error',
  'no-loss-of-precision': 'error',
  'valid-typeof': 'error',
};

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'graphify-out/**',
      'raw/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },

  // -------------------- app: quem DEFINE os globais --------------------
  {
    files: ['db.js', 'dados.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: base },
    rules: regrasApp,
  },

  // -------------------- app: quem CONSOME os globais --------------------
  {
    files: ['script.js', 'admin.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...base, DB: 'readonly', dbInit: 'readonly' },
    },
    rules: regrasApp,
  },

  // -------------------- ferramentas: Node / ESM --------------------
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globaisNavegador, ...require('globals').node },
    },
    rules: {
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-unused-vars': ['warn', { args: 'none' }],
    },
  },

  // -------------------- configs (CommonJS) --------------------
  {
    files: ['eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...require('globals').node },
    },
    rules: { 'no-undef': 'error' },
  },
];
