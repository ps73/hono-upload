module.exports = {
  root: true,

  env: {
    browser: true,
    es6: true,
    node: true,
  },

  parser: '@typescript-eslint/parser',

  parserOptions: {
    project: 'tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaVersion: 2022,
  },

  extends: [
    '@gridventures/eslint-config-base',
    '@gridventures/eslint-config-typescript',
    '@gridventures/eslint-config-base/prettier',
  ],

  rules: {
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/unbound-method': 'off',
    'import/extensions': [
      'error',
      {
        js: 'never',
        jsx: 'never',
        mjs: 'never',
        ts: 'never',
        tsx: 'never',
        json: 'always',
      },
    ],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'import/no-extraneous-dependencies': 'off',
  },
};
