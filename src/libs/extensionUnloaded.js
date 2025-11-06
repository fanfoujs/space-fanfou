import { EXTENSION_UNLOADED_EVENT_TYPE } from '@constants'

/// #if ENV_BACKGROUND
// Service Worker 环境：使用简单的回调数组替代 window 事件
const listeners = []

export default {
  trigger() {
    // 触发所有监听器
    listeners.forEach(fn => fn())
    listeners.length = 0 // 清空（once: true 行为）
  },

  addListener(fn) {
    listeners.push(fn)
  },
}
/// #else
// Content/Page 环境：使用 window 事件
export default {
  trigger() {
    const event = new CustomEvent(EXTENSION_UNLOADED_EVENT_TYPE)
    window.dispatchEvent(event)
  },

  addListener(fn) {
    window.addEventListener(EXTENSION_UNLOADED_EVENT_TYPE, fn, { once: true })
  },
}
/// #endif
