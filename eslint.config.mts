import * as js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ...js.configs.recommended,
    files: ['**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    ignores: ['node_modules/*', 'dist/*', 'coverage/*', 'eslint.config.mts', 'jest.config.js'],
  },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
]);
