function loadStyles() {
  const context = require.context('./', false, /\.(css|less)$/)

  for (const key of context.keys()) {
    context(key)
  }
}
loadStyles()
