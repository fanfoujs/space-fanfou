const TerserWebpackPlugin = require('terser-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { EXTENSION_ORIGIN_PLACEHOLDER } = require('esm')(module)('../src/constants/extension-origin')
const {
  approot,
  defaultArgv,
  generateBaseConfig,
  generateStyleLoader,
  generateFileLoaderForImages,
  generateUrlLoaderForImages,
  generateFileLoaderForOtherAssets,
} = require('./shared')

module.exports = (env, { mode } = defaultArgv) => ({
  name: 'js',

  entry: {
    'background-content-page': approot('src/entries/background-content-page.js'),
    'settings': approot('src/entries/settings.js'),
  },

  output: {
    path: approot('dist'),
    filename: '[name].js',
  },

  ...generateBaseConfig(mode),

  module: {
    rules: [
      { test: /\.js$/, use: [ 'cache-loader', 'babel-loader' ] },
      generateStyleLoader({ mode }),
      generateUrlLoaderForImages(),
      generateFileLoaderForImages({ publicPath: `${EXTENSION_ORIGIN_PLACEHOLDER}/` }),
      generateFileLoaderForOtherAssets(),
    ],
  },

  plugins: [
    new CopyWebpackPlugin([ {
      from: approot('static'),
      to: approot('dist'),
    } ]),
  ],

  optimization: {
    // 保留代码中的变量名等，方便用户反馈 bug
    minimizer: [
      new TerserWebpackPlugin({
        terserOptions: {
          ecma: 2019,
          mangle: false,
          keep_classnames: false, // eslint-disable-line camelcase
          keep_fnames: false, // eslint-disable-line camelcase
        },
        parallel: true,
      }),
    ],
  },
})
