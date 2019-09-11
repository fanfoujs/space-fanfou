const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const approot = require('approot')(path.resolve(__dirname, '..'))

const BUNDLE_SIZE_LIMIT = 768 * 1024 // in bytes

// 用于 jest-webpack-resolver
const defaultArgv = {
  mode: 'none',
}

const generateBaseConfig = mode => ({
  devtool: mode === 'development' ? 'source-map' : false,

  resolve: {
    extensions: [ '.js', '.json', '.css', '.less' ],
    alias: {
      // 我们使用的是 Preact，借助这个模块可以使用 npm 上的 React 组件
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'element-ready': approot('src/libs/elementReady'),
      // 定义 alias，避免 `../../libs` 这种过长且容易出错的相对路径
      '@background': approot('src/background'),
      '@content': approot('src/content'),
      '@page': approot('src/page'),
      '@settings': approot('src/settings'),
      '@features': approot('src/features'),
      '@libs': approot('src/libs'),
      '@assets': approot('assets'),
      '@constants': approot('src/constants'),
      '@version-history': approot('src/version-history'),
    },
  },

  // https://webpack.js.org/configuration/stats
  stats: {
    all: false,
    builtAt: true,
    env: true,
    chunks: true,
    warnings: true,
    errors: true,
    errorDetails: true,
    colors: true,
    timings: true,
  },

  performance: {
    hints: mode === 'production' ? 'error' : false,
    // 提高 webpack 默认的打包体积报警阈值，同时如果不小心打包进来过多无用代码也能得到提示
    maxEntrypointSize: BUNDLE_SIZE_LIMIT,
    maxAssetSize: BUNDLE_SIZE_LIMIT,
  },
})

const generateStyleLoader = ({ extract = false, mode } = {}) => {
  // TODO: 不能控制是否输出 SourceMap，bug？
  // optimize-css-assets-webpack-plugin 会强制禁止输出 SourceMap，没有提供设置项
  const sourceMap = mode === 'development'
  const cssLoaders = [ 'css-loader', 'postcss-loader', 'less-loader' ]

  return {
    test: /\.(css|less$)/,
    use: [
      extract
        // 把 CSS 代码从最终的打包结果中提取出来，写入单独的 CSS 文件
        ? MiniCssExtractPlugin.loader
        // 对于把 CSS 代码保留在打包结果的情况，借助这个 loader 来省去每次都要写 `.toString()` 的麻烦
        : 'to-string-loader',
      'cache-loader',
      ...cssLoaders.map(loader => ({ loader, options: { sourceMap } })),
    ],
  }
}

// 输出到 dist 目录后，仍然保持原来的相对目录结构
// 比如 <root>/assets/image.png 输出到 <dist>/assets/image.png
const keepRelativePath = file => path.relative(approot(), file)

const reImageExt = /\.(jpe?g|png|gif|svg)$/
const reBase64 = /\.base64\./

// 把 CSS 中通过 `url()` 引用的图片资源复制到指定路径，不参与打包
const generateFileLoaderForImages = ({ publicPath }) => ({
  test: input => reImageExt.test(input) && !reBase64.test(input),
  use: [ {
    loader: 'file-loader',
    options: {
      name: keepRelativePath,
      publicPath,
    },
  } ],
})

// 把 CSS 中通过 `url()` 引用且文件名包含 ".base64" 的图片进行 base64 编码
// 大部分文件不应进行编码，因为可能降低页面加载性能
const generateUrlLoaderForImages = () => ({
  test: input => reImageExt.test(input) && reBase64.test(input),
  use: [ 'cache-loader', {
    loader: 'url-loader',
    options: {
      limit: 2048,
    },
  } ],
})

const reOtherExts = /\.mp3$/

const generateFileLoaderForOtherAssets = () => ({
  test: input => reOtherExts.test(input),
  use: [ {
    loader: 'file-loader',
    options: {
      name: keepRelativePath,
      publicPath: '/',
    },
  } ],
})

module.exports = {
  approot,
  defaultArgv,
  generateBaseConfig,
  generateStyleLoader,
  generateFileLoaderForImages,
  generateUrlLoaderForImages,
  generateFileLoaderForOtherAssets,
}
