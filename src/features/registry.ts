import replaceExtensionOrigin from '@libs/replaceExtensionOrigin'

export type SettingValue = boolean | number | string
export interface RawOption {
  isSoldered?: boolean
  defaultValue?: SettingValue
  disableCloudSyncing?: boolean
  type?: string
  label?: string
  comment?: string
  controlOptions?: Record<string, unknown>
}
export interface RawMetadata {
  isSoldered?: boolean
  options?: Record<string, RawOption>
}
export interface OptionDefinition extends RawOption {
  key: string
  isSoldered: boolean
  isSubOption: boolean
  disableCloudSyncing: boolean
  type: string
  parentKey?: string
}
export interface FeatureDefinition {
  metadata: {
    isSoldered: boolean
    optionNames: string[]
    optionDefs: OptionDefinition[]
    defaultValues: Record<string, SettingValue>
    optionStorageAreaMap: Record<string, 'local' | 'sync'>
  }
  subfeatures: Record<
    string,
    { script?: (context: any) => any; style?: string }
  >
}

function processMetadata(
  featureName: string,
  metadata: RawMetadata,
): FeatureDefinition['metadata'] {
  const result: FeatureDefinition['metadata'] = {
    isSoldered: !!metadata.isSoldered,
    optionNames: [],
    optionDefs: [],
    defaultValues: {},
    optionStorageAreaMap: {},
  }
  if (result.isSoldered) return result
  for (const [key, option] of Object.entries(metadata.options || {})) {
    const isSubOption = key !== '_'
    const name = isSubOption ? `${featureName}/${key}` : featureName
    const type =
      option.type ||
      (option.isSoldered || typeof option.defaultValue === 'boolean'
        ? 'checkbox'
        : typeof option.defaultValue === 'number'
          ? 'number'
          : typeof option.defaultValue === 'string'
            ? 'text'
            : undefined)
    if (!type) throw new TypeError(`无法判断选项 ${name} 的类型`)
    result.optionNames.push(name)
    result.optionDefs.push({
      key: name,
      isSoldered: !!option.isSoldered,
      isSubOption,
      disableCloudSyncing: !!option.disableCloudSyncing,
      type,
      label:
        featureName === 'notifications' && key === '_'
          ? import.meta.env.SAFARI
            ? '启用消息提醒'
            : '启用桌面通知'
          : option.label,
      comment: option.comment,
      controlOptions: option.controlOptions,
      ...(isSubOption ? { parentKey: featureName } : {}),
    })
    result.defaultValues[name] =
      option.isSoldered || (option.defaultValue ?? false)
    result.optionStorageAreaMap[name] = option.disableCloudSyncing
      ? 'local'
      : 'sync'
  }
  return result
}

export function createRegistry(
  metadataModules: Record<string, RawMetadata>,
  scriptModules: Record<string, { default: (context: any) => any }> = {},
  styleModules: Record<string, string> = {},
): Record<string, FeatureDefinition> {
  const features: Record<string, FeatureDefinition> = {}
  for (const [path, metadata] of Object.entries(metadataModules)) {
    const featureName = path.split('/')[1]!
    features[featureName] = {
      metadata: processMetadata(featureName, metadata),
      subfeatures: {},
    }
  }
  for (const [path, module] of Object.entries({
    ...scriptModules,
    ...styleModules,
  })) {
    const [, featureName, filename] = path.split('/') as [
      string,
      string,
      string,
    ]
    const basename = filename.slice(0, filename.lastIndexOf('.'))
    const at = basename.lastIndexOf('@')
    const name = at === 0 ? 'default' : basename.slice(0, at)
    const feature = features[featureName]
    if (!feature) throw new Error(`功能 ${featureName} 缺少 metadata`)
    const subfeature = (feature.subfeatures[name] ||= {})
    if (typeof module === 'string')
      subfeature.style = replaceExtensionOrigin(module)
    else subfeature.script = module.default
  }
  return features
}
