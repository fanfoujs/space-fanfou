import versionHistory from '@version-history'
import getExtensionVersion from '@libs/getExtensionVersion'
import {
  IS_EXTENSION_UPGRADED_STORAGE_KEY,
  IS_EXTENSION_UPGRADED_STORAGE_AREA_NAME,
} from '@constants'

const NOTIFICATION_TIMEOUT = 15 * 1000

export default context => {
  const { readOptionValue, requireModules } = context
  const { storage, notification } = requireModules([ 'storage', 'notification' ])

  function isExtensionUpgraded() {
    return storage.read(
      IS_EXTENSION_UPGRADED_STORAGE_KEY,
      IS_EXTENSION_UPGRADED_STORAGE_AREA_NAME,
    )
  }

  function getCurrentVersionUpdateDetails() {
    const currentVersion = getExtensionVersion()
    const versionItem = versionHistory.find(({ version }) => version === currentVersion)

    if (!versionItem) return ''
    if (versionItem.summary) return versionItem.summary

    return versionItem.updateDetails
      .map((updateDetail, i) => `${i + 1}. ${updateDetail}`)
      .join(' ')
  }

  async function shouldNotifyUpdateDetails() {
    return (
      await isExtensionUpgraded() &&
      readOptionValue('notifyUpdateDetails') &&
      getCurrentVersionUpdateDetails()
    )
  }

  function notifyUpdateDetails() {
    const onClick = () => {
      const url = chrome.runtime.getURL('settings.html') + '#version-history'

      chrome.tabs.create(url)
    }

    notification.create({
      id: 'extension-upgraded',
      title: `太空饭否更新至 v${getExtensionVersion()}`,
      message: getCurrentVersionUpdateDetails(),
      onClick,
      buttonDefs: [ {
        title: '查看详情',
        onClick,
      }, {
        title: '忽略',
      } ],
      timeout: NOTIFICATION_TIMEOUT,
    })
  }

  return {
    async onLoad() {
      if (await shouldNotifyUpdateDetails()) {
        notifyUpdateDetails()
      }
    },
  }
}
