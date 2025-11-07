import safelyInvokeFns from '@libs/safelyInvokeFns'
import wrapper from '@libs/wrapper'
import Deferred from '@libs/Deferred'
import arrayUniquePush from '@libs/arrayUniquePush'
import arrayRemove from '@libs/arrayRemove'
import { BRIDGE_EVENT_TYPE, BROADCASTING_MESSAGE } from '@constants'

let id = 0
const deferreds = {}
const broadcastListeners = []

function eventHandler(event) {
  const { type, from, senderId, message } = event.detail

  if (type === BROADCASTING_MESSAGE) {
    bridge.broadcast(message)
  } else if (from === 'background') {
    const d = deferreds[senderId]

    d.resolve(message)
    delete deferreds[senderId]
  }
}

const bridge = wrapper({
  install() {
    window.addEventListener(BRIDGE_EVENT_TYPE, eventHandler)
  },

  uninstall() {
    window.removeEventListener(BRIDGE_EVENT_TYPE, eventHandler)
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
    const event = new CustomEvent(BRIDGE_EVENT_TYPE, {
      detail: {
        from: 'page',
        senderId,
        message,
      },
    })

    window.dispatchEvent(event)

    return d.promise
  },
})

export default bridge
