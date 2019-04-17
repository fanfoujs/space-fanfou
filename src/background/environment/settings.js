import semver from 'semver'
import deepEqual from 'fast-deep-equal'
import defined from 'defined'
import simpleMemoize from 'just-once'
import mapValues from 'just-map-values'
import features from '@features'
import isFanfouWebUrl from '@libs/isFanfouWebUrl'
import migrate from '@libs/migrate'
import { readJSONFromLocalStorage } from '@libs/localStorageWrappers'
import getExtensionVersion from '@libs/getExtensionVersion'
import omitBy from '@libs/omitBy'
import {
  SETTINGS_READ,
  SETTINGS_READ_ALL,
  SETTINGS_WRITE_ALL,
  SETTINGS_CHANGED,
  STORAGE_CHANGED,
  GET_OPTION_DEFS,
  IS_EXTENSION_UPGRADED_STORAGE_KEY,
  IS_EXTENSION_UPGRADED_STORAGE_AREA_NAME,
} from '@constants'
import messaging from './messaging'
import storage from './storage'

const SETTINGS_STORAGE_KEY = 'settings'
const SETTINGS_VERSION_STORAGE_KEY = 'settings/version'
const PREVIOUS_EXTENSION_VERSION_STORAGE_KEY = 'extension-version/previous'
const PREVIOUS_EXTENSION_VERSION_STORAGE_AREA_NAME = 'local'

let optionValuesCache

const getDefaults = simpleMemoize(() => {
  return Object.values(features).reduce((defaultValues, feature) => (
    Object.assign(defaultValues, feature.metadata.defaultValues)
  ), {})
})

const getAllOptionNames = simpleMemoize(() => Object.keys(getDefaults()))

const getOptionDefs = simpleMemoize(() => {
  const unsolderedFeatures = omitBy(features, feature => feature.metadata.isSoldered)
  const optionDefs = mapValues(unsolderedFeatures, feature => feature.metadata.optionDefs)

  return optionDefs
})

const getOptionStorageAreaName = do {
  const fullOptionStorageAreaMap = Object.values(features).reduce((map, feature) => (
    Object.assign(map, feature.metadata.optionStorageAreaMap)
  ), {})

  // eslint-disable-next-line no-unused-expressions
  optionName => fullOptionStorageAreaMap[optionName]
}

function mergeSettings(map) {
  const merged = {}

  for (const optionName of getAllOptionNames()) {
    const storageAreaName = getOptionStorageAreaName(optionName)
    const optionValue = map[storageAreaName][optionName]

    merged[optionName] = optionValue
  }

  return merged
}

async function migrateSettings() {
  // 下面被注释掉的有两种情况：
  //   1. 已经转换成 soldered feature（不提供设置项，强制开启），使用“*”标记
  //   2. 不打算再实现了或者设置项被去掉了，使用“-”标记
  const optionNameMap = {
    // * 'advanced_sidebar': true,
    'auto_pager': 'auto-pager',
    // * 'backup_avatar': true,
    'box_shadows': 'box-shadows',
    'check_saved_searches': 'check-saved-searches',
    'check_saved_searches.show_notification': 'check-saved-searches/enableNotifications',
    'clean_personal_theme': 'remove-personalized-theme',
    // - 'counternum_font': false,
    // - 'counternum_font.fontname': 'Lato',
    // * 'disable_autocomplete': true,
    // * 'disable_autocomplete.sf_autocomplete': true,
    // - 'disguise_username': false,
    // - 'disguise_username.fake_name': '略',
    // - 'emoji_selector': true,
    'enrich_statuses': 'enrich-statuses',
    'expanding_replies': 'show-contextual-statuses',
    'expanding_replies.auto_expand': 'show-contextual-statuses/autoFetch',
    'expanding_replies.number': 'show-contextual-statuses/fetchStatusNumberPerClick',
    'fav_friends': 'favorite-fanfouers',
    'float_message': 'floating-status-form',
    'float_message.keepmentions': 'floating-status-form/keepAtNamesAfterPosting',
    'float_message.notlostfocus': 'floating-status-form/keepFocusAfterPosting',
    // - 'font_reset_cn': false,
    'friend_manage': 'batch-manage-relationships',
    'friendship_check': 'check-friendship',
    'logo_remove_beta': 'remove-logo-beta',
    // * 'newstyle_op_icons': true,
    // * 'newstyle_trendlist': true,
    'notification': 'notifications',
    'notification.followers': 'notifications/notifyNewFollowers',
    'notification.mentions': 'notifications/notifyUnreadMentions',
    'notification.notdisturb': 'notifications/doNotDisturbWhenVisitingFanfou',
    'notification.playsound': 'notifications/playSound',
    'notification.privatemsgs': 'notifications/notifyUnreadPrivateMessages',
    // - 'notification.timeout': 15,
    'notification.updates': 'notifications/notifyUpdateDetails',
    'privatemsg_manage': 'batch-remove-private-messages',
    // - 'rating': true,
    'remove_app_recom': 'remove-app-recommendations',
    // - 'remove_app_recom.completely_remove': true,
    // - 'replace_self_name': false,
    // - 'rescale_background': true,
    'share_to_fanfou': 'share-to-fanfou',
    'status_manage': 'batch-remove-statuses',
    'translucent_sidebar': 'translucent-sidebar',
    'unread_statuses': 'process-unread-statuses',
    'unread_statuses.playsound': 'process-unread-statuses/playSound',
    // * 'user_switcher': true,
  }
  const legacyOptionValues = readJSONFromLocalStorage('settings')
  const migratedOptionValues = legacyOptionValues && do {
    const object = {}

    for (const [ legacyOptionName, newOptionName ] of Object.entries(optionNameMap)) {
      const legacyOptionValue = legacyOptionValues[legacyOptionName]

      object[newOptionName] = legacyOptionValue
    }

    // eslint-disable-next-line no-unused-expressions
    object
  }


  for (const storageAreaName of [ 'local', 'sync' ]) {
    // 即便 migratedOptionValues 为 undefined 下面的 migrate() 也必须要执行
    // 表示这个迁移已经处理过了
    await migrate({
      storage,
      storageAreaName,
      migrationId: 'settings/legacy-to-1.0.0',
      async executor() {
        if (migratedOptionValues) {
          await storage.write(SETTINGS_STORAGE_KEY, migratedOptionValues, storageAreaName)
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
    const optionValue = defined(oldOptionValues[optionName], defaults[optionName])

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
      const legacyVersion = localStorage.getItem('sf_version')

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
  const isExtensionUpgraded = (
    !!previousVersion &&
    semver.gt(currentVersion, previousVersion)
  )

  await storage.write(
    PREVIOUS_EXTENSION_VERSION_STORAGE_KEY,
    currentVersion,
    PREVIOUS_EXTENSION_VERSION_STORAGE_AREA_NAME,
  )
  await storage.write(
    IS_EXTENSION_UPGRADED_STORAGE_KEY,
    isExtensionUpgraded,
    IS_EXTENSION_UPGRADED_STORAGE_AREA_NAME,
  )
}

function registerHandlers() {
  messaging.registerHandler(SETTINGS_READ, async payload => {
    const { key } = payload
    const value = await settings.read(key)

    return { value }
  })

  messaging.registerHandler(SETTINGS_READ_ALL, async () => {
    const allOptions = await settings.readAll()

    return allOptions
  })

  messaging.registerHandler(SETTINGS_WRITE_ALL, async payload => {
    const { optionValues } = payload

    await settings.writeAll(optionValues)
  })

  messaging.registerHandler(GET_OPTION_DEFS, () => {
    const optionDefs = getOptionDefs()

    return optionDefs
  })
}

function listenOnStorageChange() {
  messaging.registerBroadcastListener(async message => {
    if (message.action === STORAGE_CHANGED) {
      const { key, storageAreaName, newValue } = message.payload

      // 只监听 sync 的设置变动，即从其他设备同步过来的变动
      if (key === SETTINGS_STORAGE_KEY && storageAreaName === 'sync') {
        const newOptionValues = mergeSettings({
          local: optionValuesCache,
          sync: newValue,
        })

        await settings.writeAll(newOptionValues)
      }
    }
  })
}

function listenOnPageCoonect() {
  chrome.runtime.onConnect.addListener(port => {
    // 从 popup 打开设置页时，不存在 tab
    const { tab } = port.sender

    if (tab && isFanfouWebUrl(tab.url)) {
      // 使 pageAction 点击后可以显示设置页而不是弹出菜单
      chrome.pageAction.show(tab.id)
    }
  })
}

const settings = {
  async install() {
    await migrateSettings()
    await initOptions()
    await checkIfExtensionUpgraded()
    registerHandlers()
    listenOnStorageChange()
    listenOnPageCoonect()
  },

  readFromStorage: async () => mergeSettings({
    local: await storage.read(SETTINGS_STORAGE_KEY, 'local') || {},
    sync: await storage.read(SETTINGS_STORAGE_KEY, 'sync') || {},
  }),

  read(optionName) {
    return optionValuesCache[optionName]
  },

  readAll() {
    return { ...optionValuesCache }
  },

  async writeAll(newOptionValues, isInit = false) {
    if (deepEqual(optionValuesCache, newOptionValues)) return

    optionValuesCache = { ...newOptionValues }

    // 把所有选项的值同时保存在 local 和 sync
    // 如果未来某个选项的存储位置发生变化，并且存在多设备同步的情况
    // 这样设计可以避免出现设置值丢失的情况
    await storage.write(SETTINGS_STORAGE_KEY, newOptionValues, 'local')

    // 只在本地版本号大于等于云端版本号时，才写入 sync，避免本地过时的设置值覆盖掉较新的设置值
    const localVersion = getExtensionVersion()
    const syncVersion = await storage.read(SETTINGS_VERSION_STORAGE_KEY, 'sync') || localVersion
    if (!semver.lt(localVersion, syncVersion)) {
      await storage.write(SETTINGS_STORAGE_KEY, newOptionValues, 'sync')
      await storage.write(SETTINGS_VERSION_STORAGE_KEY, localVersion, 'sync')
    }

    if (!isInit) settings.handleSettingsChange()
  },

  handleSettingsChange() {
    messaging.broadcastMessage({
      action: SETTINGS_CHANGED,
    })
  },
}

export default settings
