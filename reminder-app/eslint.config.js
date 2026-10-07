import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'release/**', 'android/**'] },
  js.configs.recommended,
  { files: ['src/**/*.{js,jsx}'], languageOptions: { globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } }, rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }] } },
  { files: ['src/**/*.jsx'], plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh }, rules: { ...reactHooks.configs.recommended.rules, 'react-refresh/only-export-components': 'warn' } },
  { files: ['electron/**/*.cjs', 'scripts/**/*.cjs', 'tests/**/*.js', 'playwright*.config.js'], languageOptions: { globals: globals.node } },
  { files: ['tests/ui/**/*.js', 'tests/sync/**/*.js'], languageOptions: { globals: { ...globals.node, ...globals.browser } } }
];
