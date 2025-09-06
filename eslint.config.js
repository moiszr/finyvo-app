// eslint.config.js (CJS)
const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expo,
  {
    rules: {
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': 'warn',
    },
    ignores: [
      '.expo/*',
      'node_modules/*',
      'android/*',
      'ios/*',
      'dist/*',
      'build/*',
      'src/types/supabase.ts',
    ],
  },
]);
