import semvergte from 'semver/functions/gte'
import deepEqual from 'fast-deep-equal'
import defined from 'defined'
import simpleMemoize from 'just-once'
import mapValues from 'just-map-values'
import messaging from './messaging'
import storage from './storage'
import features from '@features'
import migrate from '@libs/migrate'
import isExtensionUpgraded from '@libs/isExtensionUpgraded'
import { getLegacyStorage } from '@platform/legacy-storage'
import getExtensionVersion from '@libs/getExtensionVersion'
import omitBy from '@libs/omitBy'
import log from '@libs/log'
import {
  SETTINGS_READ,
  SETTINGS_WRITE,
  SETTINGS_READ_ALL,
  SETTINGS_WRITE_ALL,
  SETTINGS_CHANGED,
  STORAGE_CHANGED,
  GET_OPTION_DEFS,
  STORAGE_KEY_IS_EXTENSION_UPGRADED,
  STORAGE_AREA_NAME_IS_EXTENSION_UPGRADED,
} from '@constants'
const SETTINGS_STORAGE_KEY = 'settings'
const SETTINGS_VERSION_STORAGE_KEY = 'settings/version'
const LAST_SYNCED_SETTINGS_STORAGE_KEY = 'settings/lastSyncedValues'
const PREVIOUS_EXTENSION_VERSION_STORAGE_KEY = 'extension-version/previous'
const PREVIOUS_EXTENSION_VERSION_STORAGE_AREA_NAME = 'local'
let optionValuesCache
let writeTail = Promise.resolve()
const pendingSyncWrites = []
function queueWrite(task) {
  const result = writeTail.then(task)
  writeTail = result.catch(() => {})
  return result
}
const getDefaults = simpleMemoize(() => {
  return Object.values(features).reduce(
    (defaultValues, feature) =>
      Object.assign(defaultValues, feature.metadata.defaultValues),
    {},
  )
})
const getAllOptionNames = simpleMemoize(() => Object.keys(getDefaults()))
const getOptionDefs = simpleMemoize(() => {
  const unsolderedFeatures = omitBy(
    features,
    (feature) => feature.metadata.isSoldered,
  )
  const optionDefs = mapValues(
    unsolderedFeatures,
    (feature) => feature.metadata.optionDefs,
  )
  return optionDefs
})
const getOptionStorageAreaName = (function () {
  const fullOptionStorageAreaMap = Object.values(features).reduce(
    (map, feature) => Object.assign(map, feature.metadata.optionStorageAreaMap),
    {},
  )
  return (optionName) => fullOptionStorageAreaMap[optionName]
})()
async function migrateSettings() {
  var _do
  // 下面被注释掉的有两种情况：
  //   1. 已经转换成 soldered feature（不提供设置项，强制开启），使用「*」标记
  //   2. 不打算再实现了或者设置项被去掉了，使用「-」标记
  const optionNameMap = {
    // * 'advanced_sidebar': true,
    auto_pager: 'auto-pager',
    // * 'backup_avatar': true,
    box_shadows: 'box-shadows',
    check_saved_searches: 'check-saved-searches',
    'check_saved_searches.show_notification':
      'check-saved-searches/enableNotifications',
    clean_personal_theme: 'remove-personalized-theme',
    // - 'counternum_font': false,
    // - 'counternum_font.fontname': 'Lato',
    // * 'disable_autocomplete': true,
    // * 'disable_autocomplete.sf_autocomplete': true,
    // - 'disguise_username': false,
    // - 'disguise_username.fake_name': '略',
    // - 'emoji_selector': true,
    enrich_statuses: 'enrich-statuses',
    expanding_replies: 'show-contextual-statuses',
    'expanding_replies.auto_expand': 'show-contextual-statuses/autoFetch',
    'expanding_replies.number':
      'show-contextual-statuses/fetchStatusNumberPerClick',
    fav_friends: 'favorite-fanfouers',
    float_message: 'floating-status-form',
    'float_message.keepmentions':
      'floating-status-form/keepAtNamesAfterPosting',
    'float_message.notlostfocus': 'floating-status-form/keepFocusAfterPosting',
    // - 'font_reset_cn': false,
    friend_manage: 'batch-manage-relationships',
    friendship_check: 'check-friendship',
    logo_remove_beta: 'remove-logo-beta',
    // * 'newstyle_op_icons': true,
    // * 'newstyle_trendlist': true,
    notification: 'notifications',
    'notification.followers': 'notifications/notifyNewFollowers',
    'notification.mentions': 'notifications/notifyUnreadMentions',
    'notification.notdisturb': 'notifications/doNotDisturbWhenVisitingFanfou',
    'notification.playsound': 'notifications/playSound',
    'notification.privatemsgs': 'notifications/notifyUnreadPrivateMessages',
    // - 'notification.timeout': 15,
    'notification.updates': 'notifications/notifyUpdateDetails',
    privatemsg_manage: 'batch-remove-private-messages',
    // - 'rating': true,
    remove_app_recom: 'remove-app-recommendations',
    // - 'remove_app_recom.completely_remove': true,
    // - 'replace_self_name': false,
    // - 'rescale_background': true,
    share_to_fanfou: 'share-to-fanfou',
    status_manage: 'batch-remove-statuses',
    translucent_sidebar: 'translucent-sidebar',
    unread_statuses: 'process-unread-statuses',
    'unread_statuses.playsound': 'process-unread-statuses/playSound',
    // * 'user_switcher': true,
  }
  const legacyOptionValues = getLegacyStorage().settings
  _do = legacyOptionValues
  if (_do) {
    {
      var _do2
      const object = {}
      for (const [legacyOptionName, newOptionName] of Object.entries(
        optionNameMap,
      )) {
        const legacyOptionValue = legacyOptionValues[legacyOptionName]
        object[newOptionName] = legacyOptionValue
      }
      _do2 = object
    }
  }
  const migratedOptionValues = _do && _do2
  for (const storageAreaName of ['local', 'sync']) {
    // 即便 migratedOptionValues 为 undefined 下面的 migrate() 也必须要执行
    // 表示这个迁移已经处理过了
    await migrate({
      storage,
      storageAreaName,
      migrationId: 'settings/legacy-to-1.0.0',
      async executor() {
        if (migratedOptionValues) {
          await storage.write(
            SETTINGS_STORAGE_KEY,
            migratedOptionValues,
            storageAreaName,
          )
        }
      },
    })
  }
}
async function initOptions() {
  // 不直接在旧的对象上面修改，这样当某个选项被去掉后，可以剔除掉这个选项对应的字段
  const defaults = getDefaults()
  const oldOptionValues = await settings.readFromStorage()
  const newOptionValues = {}
  for (const optionName of getAllOptionNames()) {
    const optionValue = defined(
      oldOptionValues[optionName],
      defaults[optionName],
    )
    newOptionValues[optionName] = optionValue
  }
  await settings.writeAll(newOptionValues, true)
}
async function checkIfExtensionUpgraded() {
  await migrate({
    storage,
    storageAreaName: 'local',
    migrationId: 'extension-version/legacy-to-1.0.0',
    async executor() {
      const legacyVersion = getLegacyStorage().version

      if (legacyVersion) {
        await storage.write(
          PREVIOUS_EXTENSION_VERSION_STORAGE_KEY,
          legacyVersion,
          PREVIOUS_EXTENSION_VERSION_STORAGE_AREA_NAME,
        )
      }
    },
  })
  const previousVersion = await storage.read(
    PREVIOUS_EXTENSION_VERSION_STORAGE_KEY,
    PREVIOUS_EXTENSION_VERSION_STORAGE_AREA_NAME,
  )
  const currentVersion = getExtensionVersion()
  await storage.write(
    PREVIOUS_EXTENSION_VERSION_STORAGE_KEY,
    currentVersion,
    PREVIOUS_EXTENSION_VERSION_STORAGE_AREA_NAME,
  )
  await storage.write(
    STORAGE_KEY_IS_EXTENSION_UPGRADED,
    isExtensionUpgraded(previousVersion, currentVersion),
    STORAGE_AREA_NAME_IS_EXTENSION_UPGRADED,
  )
}
function registerHandlers() {
  messaging.registerHandler(SETTINGS_READ, async (payload) => {
    const { key } = payload
    const value = await settings.read(key)
    return {
      value,
    }
  })
  messaging.registerHandler(SETTINGS_READ_ALL, async () => {
    const allOptions = await settings.readAll()
    return allOptions
  })
  messaging.registerHandler(SETTINGS_WRITE, ({ key, value }) => {
    if (!getAllOptionNames().includes(key)) throw new Error(`未知设置项：${key}`)
    return queueWrite(() => persistOptions({ ...optionValuesCache, [key]: value }))
  })
  messaging.registerHandler(SETTINGS_WRITE_ALL, async (payload) => {
    const { optionValues } = payload
    await settings.writeAll(optionValues)
  })
  messaging.registerHandler(GET_OPTION_DEFS, () => {
    const optionDefs = getOptionDefs()
    return optionDefs
  })
}
function listenOnStorageChange() {
  messaging.registerBroadcastListener(async (message) => {
    if (message.action === STORAGE_CHANGED) {
      const { key, storageAreaName, oldValue, newValue } = message.payload

      // 只监听 sync 的设置变动，即从其他设备同步过来的变动
      if (key === SETTINGS_STORAGE_KEY && storageAreaName === 'sync') {
        // storage.onChanged 也会回传我们自己的写入，延迟的旧回传不能覆盖较新的选择。
        const ownWriteIndex = pendingSyncWrites.findIndex(value => deepEqual(value, newValue))
        if (ownWriteIndex !== -1) {
          pendingSyncWrites.splice(ownWriteIndex, 1)
          return
        }
        await queueWrite(() => {
          const changes = {}
          for (const optionName of getAllOptionNames()) {
            if (getOptionStorageAreaName(optionName) !== 'sync') continue
            if (!deepEqual(oldValue?.[optionName], newValue?.[optionName])) {
              changes[optionName] = defined(newValue?.[optionName], getDefaults()[optionName])
            }
          }
          return persistOptions({ ...optionValuesCache, ...changes })
        })
      }
    }
  })
}
const settings = {
  async install() {
    await migrateSettings()
    listenOnStorageChange()
    await initOptions()
    await checkIfExtensionUpgraded()
    registerHandlers()
  },
  async readFromStorage() {
    const [local, sync, lastSynced] = await Promise.all([
      storage.read(SETTINGS_STORAGE_KEY, 'local'),
      storage.read(SETTINGS_STORAGE_KEY, 'sync'),
      storage.read(LAST_SYNCED_SETTINGS_STORAGE_KEY, 'local'),
    ])
    // 本地保存先于云端同步。重新加载时保留本机明确选择过的值（包括 false），
    // 若本机自上次成功同步后未修改该项，则接受后台休眠期间收到的远端新值。
    return Object.fromEntries(getAllOptionNames().map(optionName => {
      const unchangedLocally = lastSynced && Object.hasOwn(lastSynced, optionName)
        && deepEqual(local?.[optionName], lastSynced[optionName])
      const value = getOptionStorageAreaName(optionName) === 'sync' && unchangedLocally
        ? sync?.[optionName]
        : defined(local?.[optionName], sync?.[optionName])
      return [optionName, value]
    }))
  },
  read(optionName) {
    return optionValuesCache[optionName]
  },
  readAll() {
    return {
      ...optionValuesCache,
    }
  },
  writeAll(newOptionValues, isInit = false) {
    return queueWrite(() => persistOptions(newOptionValues, isInit))
  },
  handleSettingsChange() {
    messaging.broadcastMessage({
      action: SETTINGS_CHANGED,
    })
  },
}
async function persistOptions(newOptionValues, isInit = false) {
  if (deepEqual(optionValuesCache, newOptionValues)) return
  await storage.write(SETTINGS_STORAGE_KEY, newOptionValues, 'local')
  optionValuesCache = { ...newOptionValues }
  if (!isInit) settings.handleSettingsChange()

  // 同步失败不影响本地保存，也不能让下一次加载恢复成云端的旧值。
  try {
    const localVersion = getExtensionVersion()
    const syncVersion = (await storage.read(SETTINGS_VERSION_STORAGE_KEY, 'sync')) || localVersion
    if (semvergte(localVersion, syncVersion)) {
      const previous = await storage.read(SETTINGS_STORAGE_KEY, 'sync')
      if (!deepEqual(previous, newOptionValues)) {
        const snapshot = { ...newOptionValues }
        pendingSyncWrites.push(snapshot)
        try {
          await storage.write(SETTINGS_STORAGE_KEY, snapshot, 'sync')
        } catch (error) {
          const index = pendingSyncWrites.indexOf(snapshot)
          if (index !== -1) pendingSyncWrites.splice(index, 1)
          throw error
        }
      }
      await storage.write(SETTINGS_VERSION_STORAGE_KEY, localVersion, 'sync')
      await storage.write(LAST_SYNCED_SETTINGS_STORAGE_KEY, newOptionValues, 'local')
    }
  } catch (error) {
    log.warn('设置已保存到本地，暂未同步到浏览器账号', error)
  }
}
export default settings
