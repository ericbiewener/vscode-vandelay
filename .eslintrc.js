module.exports = {
  extends: '@ericbiewener/eslint-config-typescript',
  env: {
    browser: false,
    es6: true,
    node: true,
  },
  globals: {
    __non_webpack_require__: false,
  },
}
