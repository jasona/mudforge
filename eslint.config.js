import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Buffer: 'readonly',
        NodeJS: 'readonly',
        fetch: 'readonly', // Node.js 18+ native fetch
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-undef': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-control-regex': 'off',
    },
  },
  // Browser environment for client files
  {
    files: ['src/client/**/*.ts', 'tests/client/**/*.ts'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        requestAnimationFrame: 'readonly',
        Audio: 'readonly',
        confirm: 'readonly',
        afterEach: 'readonly',
        // HTML Elements
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLAudioElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLElementTagNameMap: 'readonly',
        // SVG Elements
        SVGElement: 'readonly',
        SVGSVGElement: 'readonly',
        SVGGElement: 'readonly',
        // Events
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
        // Other browser APIs
        WebSocket: 'readonly',
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
      },
    },
  },
  prettier,
  {
    ignores: ['dist/', 'node_modules/', '*.js', '!eslint.config.js'],
  },
];
