import dotProp from 'dot-prop'
import pick from 'just-pick'
import casey from 'casey-js'
import replaceExtensionOrigin from '@libs/replaceExtensionOrigin'

const componentPathRe = do {
  const beginning = String.raw`^\.`
  const ending = '$'
  const slash = String.raw`/`

  const metadata = '(?<isMetadata>metadata)'
  const script = '(?<isScript>script)'
  const style = '(?<isStyle>style)'

  const featureName = '(?<featureName>[a-z-]+)'
  const subfeatureName = String.raw`\[(?<subfeatureName>[a-z-]+)\]`

  const envType = String.raw`\((?<envType>background|content|page)\)`
  const extName = String.raw`\.(js|css|less)`

  const or = (...branches) => `(?:${branches.join('|')})`
  const optional = x => `(?:${x})?`

  new RegExp([
    beginning + slash + featureName + slash,
    or(
      metadata,
      or(script, style) + envType + optional(subfeatureName),
    ),
    extName + ending,
  ].join(''))
}

function loadComponent(key, loadModule) {
  const result = (key.match(componentPathRe) || {}).groups
  const { featureName, subfeatureName = 'default', envType } = result || {}

  if (!result) throw new Error(`非法路径：${key}`)

  if (result.isMetadata) return {
    featureName,
    type: 'metadata',
    loadModule,
  }

  if (result.isScript) return {
    featureName,
    subfeatureName,
    type: 'script',
    envType,
    loadModule: () => loadModule().default,
  }

  if (result.isStyle) return {
    featureName,
    subfeatureName,
    type: 'style',
    envType,
    loadModule: () => replaceExtensionOrigin(loadModule()),
  }
}

function loadComponents() {
  const context = require.context(
    './',
    true,
    // webpack 要求这里的正则表达式必须使用字面量
    /\/(metadata\.js|(script|style)\((background|content|page)\)(\[.+\])?\.(js|css|less))$/,
  )
  const components = context.keys().map(key => loadComponent(key, () => context(key)))

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

  for (const { featureName, subfeatureName, type, envType, loadModule } of loadComponents()) {
    if (type === 'metadata') {
      dotProp.set(
        features,
        `${featureName}.metadata`,
        processMetadata(featureName, loadModule()),
      )
    } else {
      dotProp.set(
        features,
        `${featureName}.subfeatures.${subfeatureName}.envType`,
        envType,
      )
      dotProp.set(
        features,
        `${featureName}.subfeatures.${subfeatureName}.${casey.toCamelCase(`load-${type}`)}`,
        loadModule,
      )
    }
  }

  return features
}

export default loadFeatures()
