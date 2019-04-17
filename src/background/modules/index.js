function loadModules() {
  const modules = {}
  const context = require.context('./', false, /\.js$/)

  for (const key of context.keys()) {
    if (key.endsWith(__filename)) continue

    const moduleName = key.replace(/^\.\/|\.js$/g, '')
    const module = context(key).default

    modules[moduleName] = module
  }

  return modules
}

export default loadModules()
