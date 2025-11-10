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
    // Service Worker 休眠导致的正常断开，清理所有等待中的请求并自动重连
    console.log('[SpaceFanfou] Port 断开，清理等待中的请求并自动重连...', error?.message || '(Service Worker 休眠)')

    // 清理所有等待中的 deferreds，避免内存泄漏和 "missing deferred" 警告
    const pendingError = new Error('Port disconnected during Service Worker sleep')
    Object.values(deferreds).forEach(d => d.reject(pendingError))
    Object.keys(deferreds).forEach(key => delete deferreds[key])

    reinstallWithRetry(0)
  }
}

function reinstallWithRetry(attempt = 0) {
  const maxAttempts = 10
  const baseDelay = 100
  const maxDelay = 5000

  if (attempt >= maxAttempts) {
    console.error('[SpaceFanfou] 重连失败，已达最大重试次数')
    return
  }

  try {
    port = chrome.runtime.connect()
    port.onMessage.addListener(onMessage)
    port.onDisconnect.addListener(onDisconnect)
    console.log(`[SpaceFanfou] Port 重连成功 (尝试 ${attempt + 1}/${maxAttempts})`)
  } catch (error) {
    // 连接失败，使用指数退避算法重试
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    console.warn(`[SpaceFanfou] Port 重连失败 (尝试 ${attempt + 1}/${maxAttempts}): ${error.message}，${delay}ms 后重试`)
    setTimeout(() => reinstallWithRetry(attempt + 1), delay)
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

    // 防止在 port 断开期间调用
    if (!port) {
      console.warn('[SpaceFanfou] postMessage 失败：port 未初始化')
      d.reject(new Error('Port not initialized'))
      delete deferreds[senderId]
      return d.promise
    }

    try {
      port.postMessage({ senderId, message })
    } catch (error) {
      console.error('[SpaceFanfou] postMessage 失败:', error)
      d.reject(error)
      delete deferreds[senderId]
    }

    return d.promise
  },
})

export default messaging
