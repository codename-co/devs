import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import connectorSecurity from './eslint-rules/connector-security.js'

export default [
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
        __APP_VERSION__: 'readonly',
        __BUILD_TIME__: 'readonly',
      },
      parser: tsparser,
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Disable rules that weren't enforced in the original config
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-undef': 'off', // TypeScript handles this
      'no-unused-vars': 'off', // TypeScript handles this
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',
      'no-redeclare': 'off', // TypeScript handles function overloads
      'react-hooks/exhaustive-deps': 'off', // Too many false positives with intentional exclusions
      'react-hooks/rules-of-hooks': 'off', // Has false positives in this codebase
      'react-refresh/only-export-components': 'off', // Not critical for this project
    },
  },
  // Connector security rules — scoped to connector feature files only
  {
    files: ['src/features/connectors/**/*.{ts,tsx}'],
    plugins: {
      'connector-security': connectorSecurity,
    },
    rules: {
      'connector-security/no-sensitive-logging': 'warn',
      'connector-security/require-error-sanitization': 'warn',
    },
  },
]
