import react from '@eslint-react/eslint-plugin'
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import tanstackQuery from '@tanstack/eslint-plugin-query'
import tanstackRouter from '@tanstack/eslint-plugin-router'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import importX from 'eslint-plugin-import-x'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import nodePlugin from 'eslint-plugin-n'
import perfectionist from 'eslint-plugin-perfectionist'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import promise from 'eslint-plugin-promise'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config';


export default defineConfig([
  {
    ignores: [
      'node_modules',
      'dist/**',
      'build',
      'coverage',
      '**/.nx/**',
      '**/.svelte-kit/**',
      '**/snap/**',
      '**/vite.config.*.timestamp-*.*',
      "vite.config.ts"
    ],
  },{
    extends: [
      js.configs['recommended'],
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      nodePlugin.configs['flat/recommended-module'],
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        semi: false,
        jsx: true,
      }),
      react.configs['recommended-type-checked'],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      reactHooks.configs.flat.recommended,
      promise.configs['flat/recommended'],
      ...tanstackRouter.configs['flat/recommended'],
      ...tanstackQuery.configs['flat/recommended'],
      prettierRecommended,
      perfectionist.configs['recommended-natural'],
      eslintConfigPrettier,
    ],
    files: ['src/**/*.{ts,tsx}', 'env.ts', 'vite.config.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'n/no-missing-import': 'off', // TODO: turn it on
      '@typescript-eslint/restrict-template-expressions': 'off', // TODO: maybe turn it on
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // TODO: maybe turn it on
      'import-x/order': 'off',
      'import-x/no-dynamic-require': 'warn',
      'import-x/no-nodejs-modules': 'warn',
      'perfectionist/sort-imports': [
        'error',
        {
          groups: [
            'react',
            ['builtin', 'external'],
            'internal-type',
            'internal',
            ['parent-type', 'sibling-type', 'index-type'],
            ['parent', 'sibling', 'index'],
            'type',
            'object',
            'unknown',
          ],
          customGroups: {
            type: {
              react: ['^react$', '^react-.+'],
            },
            value: {
              react: ['^react$', '^react-.+'],
            },
          },
          environment: 'node',
        },
      ],
      'perfectionist/sort-objects': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
])
