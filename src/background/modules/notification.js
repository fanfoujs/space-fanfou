import pick from 'just-pick'
import debounce from 'just-debounce-it'
import settings from '@background/environment/settings'
import wrapper from '@libs/wrapper'
import playSound from '@libs/playSound'
import noop from '@libs/noop'

const DEFAULT_NOTIFICATION_TIMEOUT = 15 * 1000
const SOUND_URL = require('@assets/sounds/ding.mp3')

const notificationMap = {}

// 使用 debounce 避免多个通知同时弹出导致重复播放提示音（音量会偏大）
const playSoundForNotification = debounce(() => {
  if (settings.read('notifications/playSound')) {
    playSound(SOUND_URL)
  }
}, 1)

function createNotification(opts) {
  const {
    id,
    title = '太空饭否',
    message,
    timeout = DEFAULT_NOTIFICATION_TIMEOUT,
    buttonDefs = [],
  } = opts
  const buttons = buttonDefs.map(buttonDef => pick(buttonDef, [ 'title' ]))

  if (!id) {
    throw new Error('必须指定通知的 id')
  }

  // 如果存在活跃的同名实例，先销毁它
  destroyNotification(id)

  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: '/icons/icon-256.png',
    title,
    message,
    buttons,
    // 避免被 Windows 自动收入到通知中心，否则之后就没办法用代码清除了
    // 而且一旦被收入通知中心，下次就不能再弹同 ID 的通知
    requireInteraction: true,
    // 禁用系统默认的提示音
    silent: true,
  })

  playSoundForNotification()
  opts.timeoutId = setTimeout(() => {
    destroyNotification(id)
  }, timeout)

  notificationMap[id] = opts
}

function destroyNotification(id) {
  const opts = notificationMap[id]

  if (opts) {
    clearTimeout(opts.timeoutId)
    chrome.notifications.clear(id)
    delete notificationMap[id]
  }
}

function onNotificationClicked(id) {
  const opts = notificationMap[id]

  if (opts) {
    const handler = opts.onClick || noop

    handler()
    destroyNotification(id)
  }
}

function onButtonClicked(id, buttonIndex) {
  const opts = notificationMap[id]

  if (opts) {
    const handler = opts.buttonDefs?.[buttonIndex]?.onClick || noop

    handler()
    destroyNotification(id)
  }
}

export default wrapper({
  install() {
    chrome.notifications.onClicked.addListener(onNotificationClicked)
    chrome.notifications.onButtonClicked.addListener(onButtonClicked)
  },

  create: createNotification,

  hide: destroyNotification,
})
