module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', 'public', '*.js', '*.d.ts', 'test-*.ts', 'src/mobile/**'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    // React refresh - disabled for now but monitor for HMR issues
    'react-refresh/only-export-components': 'off',

    // TypeScript rules - re-enabled with warnings for gradual migration
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': ['warn', {
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': false,
      'ts-nocheck': false
    }],
    '@typescript-eslint/ban-types': 'warn',

    // React hooks - keep rules-of-hooks as error, warn on exhaustive-deps
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // General JavaScript - enforce no-var
    'no-var': 'error',
    'prefer-const': 'warn',

    // Console statements - warn in development
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
}
