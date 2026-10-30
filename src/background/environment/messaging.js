import { browser } from 'wxt/browser'
import safelyInvokeFns from '@libs/safelyInvokeFns'
import arrayUniquePush from '@libs/arrayUniquePush'

let ready = Promise.resolve()
const handlers = new Map()
const listeners = []

const messaging = {
  setReady(promise) { ready = promise },
  install() {
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request?.target !== 'space-fanfou-background') return
      this.invoke(request.message?.action, request.message?.payload, sender).then(
        value => sendResponse(value ?? null),
        error => sendResponse({ __isError: true, message: error.message || String(error) }),
      )
      return true
    })
  },
  async invoke(action, payload, sender) {
    await ready
    const handler = handlers.get(action)
    if (!handler) throw new Error(`未知消息类型「${action}」`)
    return handler(payload, sender)
  },
  registerHandler(action, handler) {
    if (handlers.has(action)) throw new Error(`重复注册「${action}」类型的消息处理器`)
    handlers.set(action, handler)
  },
  unregisterHandler(action) {
    if (!handlers.delete(action)) throw new Error(`不存在「${action}」类型的消息处理器`)
  },
  registerBroadcastListener(fn) { arrayUniquePush(listeners, fn) },
  broadcastMessage(message) {
    const request = { target: 'space-fanfou-clients', message }
    browser.runtime.sendMessage(request).catch(() => {})
    browser.tabs.query({ url: ['*://fanfou.com/*'] }).then(tabs => Promise.all(tabs
      .filter(tab => tab.id != null)
      .map(tab => browser.tabs.sendMessage(tab.id, request).catch(() => {})))).catch(console.error)
    this.handleBroadcastMessage(message)
  },
  handleBroadcastMessage(message) { safelyInvokeFns({ fns: listeners, args: [message] }) },
}
export default messaging
