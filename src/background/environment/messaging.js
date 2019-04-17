import safelyInvokeFns from '@libs/safelyInvokeFns'
import arrayUniquePush from '@libs/arrayUniquePush'
import arrayRemove from '@libs/arrayRemove'
import log from '@libs/log'
import { BROADCASTING_MESSAGE } from '@constants'

const messageHandlers = {}
const connectedPorts = []
const broadcastListeners = []

function createMessageHandler(port) {
  return async ({ senderId, message }) => {
    const handler = messageHandlers[message.action]
    let respondedMessage

    if (handler) {
      try {
        respondedMessage = await handler(message.payload)
      } catch (error) {
        log.error(error)
      }

      // 页面端不确定是否一定会收到回复，却必须注册监听 callback
      // 因此无论 handler 有没有回复消息（respondedMessage 可能为 undefined）
      // 都要给页面端发送消息，以注销掉监听回复的 callback
      // 因为 handler 是异步的，在它执行结束后消息源标签页可能已经关闭了
      // 需要先检查是否已经 disconnect
      if (!isPortDisconnected(port)) {
        port.postMessage({ senderId, message: respondedMessage })
      }
    } else {
      throw new Error(`未知消息类型 “${message.action}”`)
    }
  }
}

function isPortDisconnected(port) {
  return !connectedPorts.includes(port)
}

const messaging = {
  install() {
    chrome.runtime.onConnect.addListener(port => {
      connectedPorts.push(port)
      port.onMessage.addListener(createMessageHandler(port))
      port.onDisconnect.addListener(() => arrayRemove(connectedPorts, port))
    })
  },

  registerHandler(actionType, handler) {
    if (messageHandlers[actionType]) {
      throw new Error(`重复注册 “${actionType}” 类型的消息处理器`)
    } else {
      messageHandlers[actionType] = handler
    }
  },

  unregisterHandler(actionType) {
    if (!delete messageHandlers[actionType]) {
      throw new Error(`不存在 “${actionType}” 类型的消息处理器，因此取消注册失败`)
    }
  },

  registerBroadcastListener(fn) {
    arrayUniquePush(broadcastListeners, fn)
  },

  broadcastMessage(message) {
    for (const port of connectedPorts) {
      port.postMessage({
        type: BROADCASTING_MESSAGE,
        message,
      })
    }

    this.handleBroadcastMessage(message)
  },

  handleBroadcastMessage(message) {
    safelyInvokeFns({
      fns: broadcastListeners,
      args: [ message ],
    })
  },
}

export default messaging
