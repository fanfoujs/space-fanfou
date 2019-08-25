function loadConstants() {
  const context = require.context('./', false, /\.js$/)

  return context.keys().reduce((constants, key) => {
    return key.endsWith(__filename)
      ? constants
      : Object.assign(constants, context(key))
  }, {})
}

module.exports = Object.assign(exports, loadConstants())
