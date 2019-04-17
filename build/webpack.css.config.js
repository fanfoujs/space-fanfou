const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const OmitJSforCSSPlugin = require('webpack-omit-js-for-css-plugin')
const {
  approot,
  defaultArgv,
  generateBaseConfig,
  generateStyleLoader,
  generateFileLoaderForImages,
  generateUrlLoaderForImages,
} = require('./shared')

module.exports = (env, { mode } = defaultArgv) => ({
  name: 'css',

  entry: {
    page: approot('src/page/styles/index.js'),
    settings: approot('src/settings/styles/index.js'),
  },

  output: {
    path: approot('dist'),
    // 这里必须得是 .js，代表的是最终打包的结果，并不是我们想要的 CSS 文件
    filename: '[name].js',
  },

  ...generateBaseConfig(mode),

  module: {
    rules: [
      generateStyleLoader({ extract: true, mode }),
      generateUrlLoaderForImages(),
      generateFileLoaderForImages({ publicPath: '/' }),
    ],
  },

  plugins: [
    // 通过这个插件把打包结果中的 CSS 代码提取出来，写入单独的 .css 文件
    new MiniCssExtractPlugin(),
    // 通过这个插件阻止 webpack 输出打包结果文件（.js），只保留 .css 文件
    new OmitJSforCSSPlugin(),
    mode === 'production' && new OptimizeCssAssetsPlugin(),
  ].filter(Boolean),
})
