import type { Linter } from 'eslint';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

const config: Linter.Config[] = [
  // 0. 무시할 경로
  {
    ignores: ['node_modules', 'dist', 'coverage'],
  },

  // 1. JS 기본 룰
  js.configs.recommended,

  // 2. TS 기본 룰들
  ...tseslint.configs.recommended,

  // 3. Prettier와 겹치는 ESLint 룰 off
  eslintConfigPrettier,

  // 4. 프로젝트 공통 설정
  {
    files: ['**/*.{ts,tsx,js,jsx,cjs,mjs}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier 포맷 안 맞으면 에러
      'prettier/prettier': 'error',

      // console은 경고만
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // JS 기본 unused-vars 끄고 TS용만 사용
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },

  // 5. Scripts 폴더는 console.log 허용 (마지막에 배치하여 override)
  {
    files: ['scripts/**/*.{ts,js}'],
    rules: {
      'no-console': 'off',
    },
  },
];

export default config;
