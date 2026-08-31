const js = require('@eslint/js');
const globals = require('globals');

/**
 * Flat config for ESLint 10.
 *
 * The codebase predates ESLint's flat config and relies on cross-file
 * globals (UI helpers defined in assets/common.js and used by every
 * renderer page) plus sloppy-mode patterns. We register the standard
 * browser/worker/node globals and the app-level helpers so `no-undef`
 * stays meaningful, and downgrade the noisiest strict rules that this
 * legacy codebase is not written against.
 */
module.exports = [
  {
    ignores: [
      'out/',
      'node_modules/',
      '**/*.min.js',
      '**/*.ico',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.browser,
        ...globals.worker,
        ...globals.node,
        // UI helpers defined in assets/common.js (loaded via <script>)
        Toast: 'readonly',
        WorkerHandler: 'readonly',
        ProgressBar: 'readonly',
        Logging: 'readonly',
        Item: 'readonly',
        bootstrap: 'readonly',
        CONSTANTS: 'readonly',
        toggleTheme: 'readonly',
        setTheme: 'readonly',
        loadTheme: 'readonly',
        toTop: 'readonly',
        toEnd: 'readonly',
        sanitizeString: 'readonly',
        updateItemStatus: 'readonly',
        poppulateModal: 'readonly',
        getNextNumThenUpdate: 'readonly',
        convertToTable: 'readonly',
      },
    },
    rules: {
      // Google-style allowances / legacy-codebase relaxations
      'max-len': ['warn', { code: 120 }],
      'linebreak-style': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Strict rules that are too noisy for the legacy codebase
      'no-useless-assignment': 'off',
      'no-useless-escape': 'off',
      'no-global-assign': 'off',
      'no-constant-binary-expression': 'off',
      'preserve-caught-error': 'off',
      'valid-jsdoc': 'off',
      'require-jsdoc': 'off',
      'no-invalid-this': 'off',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        // Vitest provides require() even in ESM-transformed test modules
        require: 'readonly',
      },
    },
  },
];
