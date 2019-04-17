import wrapper from '@libs/wrapper'
import { BRIDGE_EVENT_TYPE, BROADCASTING_MESSAGE } from '@constants'
import messaging from './messaging'

async function eventHandler(event) {
  const { from, senderId, message } = event.detail

  if (from === 'page') {
    const respondedMessage = await bridge.postMessageToBackground(message)

    bridge.postMessageToInjected({
      senderId,
      message: respondedMessage,
    })
  }
}

function handleBroadcastMessage(message) {
  const event = new CustomEvent(BRIDGE_EVENT_TYPE, {
    detail: {
      type: BROADCASTING_MESSAGE,
      message,
    },
  })

  window.dispatchEvent(event)
}

const bridge = wrapper({
  async install() {
    await messaging.ready()
    messaging.registerBroadcastListener(handleBroadcastMessage)
    window.addEventListener(BRIDGE_EVENT_TYPE, eventHandler)
  },

  uninstall() {
    window.removeEventListener(BRIDGE_EVENT_TYPE, eventHandler)
  },

  async postMessageToBackground(message) {
    const respondedMessage = await messaging.postMessage(message)

    return respondedMessage
  },

  postMessageToInjected({ senderId, message }) {
    const event = new CustomEvent(BRIDGE_EVENT_TYPE, {
      detail: {
        from: 'background',
        senderId,
        message,
      },
    })

    window.dispatchEvent(event)
  },
})

export default bridge
