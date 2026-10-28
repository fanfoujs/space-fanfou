import { browser } from 'wxt/browser'
import wrapper from '@libs/wrapper'
import extensionUnloaded from '@libs/extensionUnloaded'
import safelyInvokeFns from '@libs/safelyInvokeFns'
import arrayUniquePush from '@libs/arrayUniquePush'
import arrayRemove from '@libs/arrayRemove'

const broadcastListeners = []
function onMessage(request) {
  if (request?.target === 'space-fanfou-clients') messaging.broadcast(request.message)
}

const messaging = wrapper({
  install() { browser.runtime.onMessage.addListener(onMessage) },
  uninstall() {
    browser.runtime.onMessage.removeListener(onMessage)
    broadcastListeners.length = 0
  },
  registerBroadcastListener(fn) { arrayUniquePush(broadcastListeners, fn) },
  unregisterBroadcastListener(fn) { arrayRemove(broadcastListeners, fn) },
  broadcast(message) { safelyInvokeFns({ fns: broadcastListeners, args: [message] }) },
  async postMessage(message) {
    await messaging.ready()
    let result
    try { result = await browser.runtime.sendMessage({ target: 'space-fanfou-background', message }) }
    catch (error) {
      if (error.message?.includes('Extension context invalidated')) extensionUnloaded.trigger()
      throw error
    }
    if (result?.__isError) throw new Error(result.message)
    return result
  },
})
export default messaging
