import wrapper from '@libs/wrapper'
import Deferred from '@libs/Deferred'
import safelyInvokeFns from '@libs/safelyInvokeFns'
import extensionUnloaded from '@libs/extensionUnloaded'
import arrayUniquePush from '@libs/arrayUniquePush'
import arrayRemove from '@libs/arrayRemove'
import { BROADCASTING_MESSAGE } from '@constants'

let port
let id = 0
const deferreds = {}
const broadcastListeners = []

function onMessage({ type, senderId, message }) {
  if (type === BROADCASTING_MESSAGE) {
    messaging.broadcast(message)
  } else if (senderId != null) {
    const d = deferreds[senderId]

    d.resolve(message)
    delete deferreds[senderId]
  }
}

function onDisconnect() {
  // Manifest V3: Service Worker 休眠会断开 port 连接（约 30 秒无活动）
  // 只有在扩展真正被卸载（禁用/删除）时才触发资源清理
  const error = chrome.runtime.lastError

  if (error?.message?.includes('Extension context invalidated')) {
    // 扩展上下文失效（被禁用/删除）
    console.log('[SpaceFanfou] 扩展上下文失效，触发资源清理')
    extensionUnloaded.trigger()
  } else {
    // Service Worker 休眠导致的正常断开，自动重连
    console.log('[SpaceFanfou] Port 断开，自动重连...', error?.message || '(Service Worker 休眠)')
    setTimeout(() => messaging.install(), 100)
  }
}

const messaging = wrapper({
  install() {
    port = chrome.runtime.connect()
    port.onMessage.addListener(onMessage)
    port.onDisconnect.addListener(onDisconnect)
  },

  uninstall() {
    port = null
    broadcastListeners.length = 0
  },

  registerBroadcastListener(fn) {
    arrayUniquePush(broadcastListeners, fn)
  },

  unregisterBroadcastListener(fn) {
    arrayRemove(broadcastListeners, fn)
  },

  broadcast(message) {
    safelyInvokeFns({
      fns: broadcastListeners,
      args: [ message ],
    })
  },

  postMessage(message) {
    const senderId = id++
    const d = deferreds[senderId] = new Deferred()

    port.postMessage({ senderId, message })

    return d.promise
  },
})

export default messaging
