module.exports = {
  plugins: [
    [ '@babel/plugin-transform-react-jsx', {
      pragma: 'h',
    } ],
    [ '@babel/plugin-proposal-class-properties', {
      loose: true,
    } ],
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-do-expressions',
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-function-bind',
  ],

  env: {
    test: {
      plugins: [
        '@babel/plugin-transform-modules-commonjs',
      ],
    },
  },
}
