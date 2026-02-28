const TerserWebpackPlugin = require('terser-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
// 直接定义常量，避免 esm 加载器的兼容性问题
const EXTENSION_ORIGIN_PLACEHOLDER = '<EXTENSION_ORIGIN_PLACEHOLDER>'
const {
  approot,
  defaultArgv,
  generateBaseConfig,
  generateStyleLoader,
  generateFileLoaderForImages,
  generateUrlLoaderForImages,
  generateFileLoaderForOtherAssets,
} = require('./shared')

module.exports = (id, entryFile) => (_, { mode } = defaultArgv) => ({
  name: 'js',

  entry: {
    [id]: approot(`src/entries/${entryFile}.js`),
  },

  output: {
    path: approot('dist'),
    filename: '[name].js',
  },

  ...generateBaseConfig(mode),

  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          ...(mode === 'development' ? [ {
            loader: 'cache-loader',
            options: {
              cacheIdentifier: require('cache-loader/package').version + mode + id,
            },
          } ] : []),
          'babel-loader',
          {
            loader: 'ifdef-loader',
            options: {
              DEVELOPMENT: mode === 'development',
              PRODUCTION: mode === 'production',
              ENV_BACKGROUND: id === 'background',
              ENV_CONTENT: id === 'content',
              ENV_PAGE: id === 'page',
            },
          },
        ],
      },
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
    // 使代码保持在可读的状态，方便用户反馈 bug 后 debug
    minimizer: [
      new TerserWebpackPlugin({
        terserOptions: {
          ecma: 8,
          compress: {
            defaults: false,
            dead_code: true, // eslint-disable-line camelcase
            evaluate: true,
            unused: true,
          },
          mangle: false,
          output: {
            beautify: true,
            indent_level: 2, // eslint-disable-line camelcase
          },
        },
        extractComments: false,
      }),
    ],
  },
})
