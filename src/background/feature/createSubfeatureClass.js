import pick from 'just-pick'
import every from '@libs/promiseEvery'

export default ({ modules }) => class Subfeature {
  constructor({ featureName, subfeatureName, script, parent }) {
    this.featureName = featureName
    this.subfeatureName = subfeatureName
    this.parent = parent
    this.initContext()

    const featureScriptObj = script(this.context)

    this.migrations = featureScriptObj.migrations
    this.script = pick(featureScriptObj, [
      'onLoad',
      'onSettingsChange',
      'onUnload',
    ])
  }

  initContext() {
    this.waitReadyFns = []

    this.context = pick(this, [
      'requireModules',
      'readOptionValue',
    ])
  }

  requireModules = moduleNames => {
    const requiredModules = {}

    for (const moduleName of moduleNames) {
      const module = modules[moduleName]

      if (!module) throw new Error(`未知 module：${moduleName}`)

      this.waitReadyFns.push(module.ready)
      requiredModules[moduleName] = module
    }

    return requiredModules
  }

  readOptionValue = key => {
    const optionName = `${this.featureName}/${key}`
    const optionValue = this.parent.optionValuesCache[optionName]

    return optionValue
  }

  async load() {
    await every(this.waitReadyFns.map(fn => fn()))
    await this.script.onLoad?.()
  }

  async unload() {
    await this.script.onUnload?.()
  }

  handleSettingsChange() {
    // eslint-disable-next-line no-unused-expressions
    this.script.onSettingsChange?.()
  }
}
