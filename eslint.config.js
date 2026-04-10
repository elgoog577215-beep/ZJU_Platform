import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'dev-dist', 'server', 'node_modules', 'zju_app', 'wechat_crawler', 'wechat-batch-crawler', '.opencompass', '.venv-opencompass'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
        React: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react/prop-types': 'off',
      'react/no-unknown-property': 'off',
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^(React|[A-Z].*|set[A-Z].*|activeVideo|settings|loading|startX|icons|logout|user|isApp|t|addToGoogleCalendar|downloadICS|handleCopyLocation|handleShare|useEffect|useRef|useMemo|outcome|remainingTime|getHighResUrl|api|rect|startIndex|endIndex|e|e2|err|error)$',
        argsIgnorePattern: '^(_.*|e|err|error|res|req|proxyReq|v|a|priority|startIndex|endIndex|metric|section|index|onAlbumReorder)$',
        caughtErrorsIgnorePattern: '^(e|e2|err|error)$'
      }],
      'react-hooks/exhaustive-deps': 'off',
      'react-refresh/only-export-components': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
