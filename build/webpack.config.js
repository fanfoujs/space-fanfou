module.exports = [
  require('./webpack.js.config')('background', 'background-content-page'),
  require('./webpack.js.config')('content', 'background-content-page'),
  require('./webpack.js.config')('page', 'background-content-page'),
  require('./webpack.js.config')('settings', 'settings'),
  require('./webpack.css.config'),
]
