// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // src/shared is vendored from ../shared (owned by unibody-back-end) — lint it there, not here.
    ignores: ['dist/*', 'src/shared/*'],
  },
]);
