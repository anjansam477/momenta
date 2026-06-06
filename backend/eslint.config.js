const globals = require('globals');

// Flat ESLint config (ESLint v9). Lenient by design: real bugs (undeclared
// vars) error; style/cleanup issues warn so the bootstrap lint stays green and
// teams can tighten incrementally.
module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'assets/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart'],
      'no-var': 'warn',
    },
  },
];
