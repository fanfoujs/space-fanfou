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
  extensionUnloaded.trigger()
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
