module.exports = {
  browser: true,
  resolver: 'jest-webpack-resolver',
  jestWebpackResolver: {
    silent: true,
    webpackConfig: './build/webpack.config.js',
  },
}
