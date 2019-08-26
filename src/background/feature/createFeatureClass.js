import pick from 'just-pick'
import deepEqual from 'fast-deep-equal'
import safelyInvokeFn from '@libs/safelyInvokeFn'
import migrate from '@libs/migrate'
import extensionUnloaded from '@libs/extensionUnloaded'
import { SETTINGS_CHANGED } from '@constants'

export default ({ messaging, bridge, settings, modules }) => class Feature {
  constructor({ featureName, metadata }) {
    this.featureName = featureName
    this.metadata = metadata
    this.subfeatures = []
    this.optionValuesCache = {}
    this.isLoaded = false
  }

  get transport() {
    return messaging || bridge
  }

  addSubfeature(subfeature) {
    this.subfeatures.push(subfeature)
  }

  async init() {
    await this.loadOptionValues()
    await this.migrate()

    if (this.metadata.isSoldered || await this.checkIfEnabled()) {
      await this.load()
    }

    this.listenOnSettingsChange()
    this.listenOnExtensionUnload()
  }

  async loadOptionValues() {
    const optionValues = await settings.readAll()

    this.optionValuesCache = pick(optionValues, this.metadata.optionNames)
  }

  async migrate() {
    const { storage } = modules

    for (const subfeature of this.subfeatures) {
      const { migrations = [] } = subfeature

      for (const migration of migrations) {
        await migrate({ storage, ...migration })
      }
    }
  }

  checkIfEnabled() {
    return this.optionValuesCache[this.featureName]
  }

  load() {
    if (this.isLoaded) return

    for (const subfeature of this.subfeatures) {
      safelyInvokeFn(::subfeature.load)
    }

    this.isLoaded = true
  }

  unload() {
    if (!this.isLoaded) return

    for (const subfeature of this.subfeatures) {
      safelyInvokeFn(::subfeature.unload)
    }

    this.isLoaded = false
  }

  listenOnSettingsChange() {
    this.transport.registerBroadcastListener(message => {
      if (message.action === SETTINGS_CHANGED) {
        this.handleSettingsChange()
      }
    })
  }

  async handleSettingsChange() {
    const previousOptionValues = this.optionValuesCache
    await this.loadOptionValues()
    const currentOptionValues = this.optionValuesCache

    const previousEnabled = previousOptionValues[this.featureName]
    const currentEnabled = currentOptionValues[this.featureName]

    if (currentEnabled === previousEnabled) {
      if (!currentEnabled) return
      if (deepEqual(previousOptionValues, currentOptionValues)) return

      for (const subfeature of this.subfeatures) {
        subfeature.handleSettingsChange()
      }
    } else {
      if (this.isLoaded) {
        this.unload()
      } else {
        this.load()
      }
    }
  }

  listenOnExtensionUnload() {
    extensionUnloaded.addListener(::this.handleExtensionUnload)
  }

  handleExtensionUnload() {
    this.unload()
  }
}
