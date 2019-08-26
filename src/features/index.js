import importAll from 'import-all.macro'
import dotProp from 'dot-prop'
import pick from 'just-pick'
import parseFilename from '@libs/parseFilename'
import replaceExtensionOrigin from '@libs/replaceExtensionOrigin'

function loadComponent(path, module) {
  const [ , featureName, filename ] = path.split('/')

  if (filename === 'metadata.js') return {
    featureName,
    type: 'metadata',
    module,
  }

  const { basename, extname } = parseFilename(filename)
  const atPos = basename.lastIndexOf('@')
  const subfeatureName = atPos === 0
    ? 'default'
    : basename.substring(0, atPos)

  if ([ '.less', '.css' ].includes(extname)) return {
    featureName,
    subfeatureName,
    type: 'style',
    module: replaceExtensionOrigin(module),
  }

  if (extname === '.js') return {
    featureName,
    subfeatureName,
    type: 'script',
    module: module.default,
  }
}

function loadComponents() {
  const modules = {
    ...importAll.sync('./*/metadata.js'),
    /// #if ENV_BACKGROUND
    ...importAll.sync('./*/*@background.js'),
    /// #elif ENV_CONTENT
    ...importAll.sync('./*/*@content.{less,css}'),
    ...importAll.sync('./*/*@content.js'),
    /// #elif ENV_PAGE
    ...importAll.sync('./*/*@page.{less,css}'),
    ...importAll.sync('./*/*@page.js'),
    /// #endif
  }
  const components = Object.entries(modules)
    .map(([ path, module ]) => loadComponent(path, module))

  return components
}

function processOptionDef(featureName, optionName, rawOptionDef, isSubOption) {
  const { isSoldered = false, defaultValue, disableCloudSyncing = false } = rawOptionDef
  const optionDef = {
    key: optionName,
    isSoldered,
    isSubOption,
    disableCloudSyncing,
    type: do {
      if (isSoldered || typeof defaultValue === 'boolean') {
        'checkbox' // eslint-disable-line no-unused-expressions
      } else if (typeof defaultValue === 'number') {
        'number' // eslint-disable-line no-unused-expressions
      } else {
        throw new Error('无法判断选项的类型，因为没有指定 `isSoldered` 或 `defaultValue`')
      }
    },
    ...pick(rawOptionDef, [ 'label', 'comment', 'controlOptions' ]),
  }

  if (isSubOption) {
    optionDef.parentKey = featureName
  }

  return optionDef
}

function processMetadata(featureName, metadata) {
  const isSoldered = !!metadata.isSoldered
  const optionNames = []
  const optionDefs = []
  const defaultValues = {}
  const optionStorageAreaMap = {}

  if (!isSoldered) {
    for (const [ k, v ] of Object.entries(metadata.options)) {
      const isSubOption = k !== '_'
      const optionName = isSubOption ? `${featureName}/${k}` : featureName
      const optionDef = processOptionDef(featureName, optionName, v, isSubOption)

      optionNames.push(optionName)
      optionDefs.push(optionDef)
      defaultValues[optionName] = v.isSoldered || v.defaultValue
      optionStorageAreaMap[optionName] = v.disableCloudSyncing
        ? 'local'
        : 'sync'
    }
  }

  return {
    isSoldered,
    optionNames,
    optionDefs,
    defaultValues,
    optionStorageAreaMap,
  }
}

function loadFeatures() {
  const features = {}

  for (const { featureName, subfeatureName, type, module } of loadComponents()) {
    if (type === 'metadata') {
      dotProp.set(
        features,
        `${featureName}.metadata`,
        processMetadata(featureName, module),
      )
    } else {
      dotProp.set(
        features,
        `${featureName}.subfeatures.${subfeatureName}.${type}`,
        module,
      )
    }
  }

  return features
}

export default loadFeatures()
