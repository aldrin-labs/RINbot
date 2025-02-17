module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json'],
    sourceType: 'module',
  },
  ignorePatterns: [
    // "/lib/**/*", // Ignore built files.
  ],
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  rules: {
    'import/no-unresolved': 0,
    indent: 'off',
    'max-len': ['error', { code: 120 }],
    'prettier/prettier': 'error',
    'require-jsdoc': 0,
    'valid-jsdoc': 0,
    'no-empty': 0,
  },
};
