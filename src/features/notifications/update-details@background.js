import versionHistory from '@version-history'
import getExtensionVersion from '@libs/getExtensionVersion'
import {
  STORAGE_KEY_IS_EXTENSION_UPGRADED,
  STORAGE_AREA_NAME_IS_EXTENSION_UPGRADED,
} from '@constants'

const NOTIFICATION_TIMEOUT = 15 * 1000
export default context => {
  const { readOptionValue, requireModules } = context
  const { storage, notification } = requireModules([ 'storage', 'notification' ])

  // 1.0.0 是一个不能使用的版本，下面的代码使得当用户升级到 1.0.1 后也能看到 1.0.0 的更新通知
  const patchedVersionHistory = do {
    const patched = [ ...versionHistory ]
    const updateDetailsFor100 = versionHistory.find(({ version }) => version === '1.0.0')
    const updateDetailsFor101 = { ...updateDetailsFor100 }
    const indexOf100 = patched.indexOf(updateDetailsFor100)

    updateDetailsFor101.version = '1.0.1'
    patched.splice(indexOf100, 0, updateDetailsFor101)

    patched // eslint-disable-line no-unused-expressions
  }

  function isExtensionUpgraded() {
    return storage.read(
      STORAGE_KEY_IS_EXTENSION_UPGRADED,
      STORAGE_AREA_NAME_IS_EXTENSION_UPGRADED,
    )
  }

  function getCurrentVersionUpdateDetails() {
    const currentVersion = getExtensionVersion()
    const versionItem = patchedVersionHistory.find(({ version }) => version === currentVersion)

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

      chrome.tabs.create({ url, active: true })
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
