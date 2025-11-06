// 把原本在 page script 的音频播放放到 background script (Service Worker)
// 因为 Chrome 限制非活动的标签页播放音频
// Manifest V3: 使用 offscreen document 播放音频，因为 Service Worker 不支持 Audio API

import messaging from './messaging'
import { PROXIED_AUDIO } from '@constants'

let offscreenDocumentCreated = false

async function ensureOffscreenDocument() {
  // 检查 offscreen document 是否已经存在
  if (offscreenDocumentCreated) {
    return
  }

  // 检查是否已经有 offscreen document（可能被其他功能创建）
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  })

  if (existingContexts.length > 0) {
    offscreenDocumentCreated = true
    return
  }

  // 创建 offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play notification sounds',
  })

  offscreenDocumentCreated = true
}

async function playSound(audioUrl) {
  try {
    // 确保 offscreen document 存在
    await ensureOffscreenDocument()

    // 发送消息到 offscreen document 播放音频
    await chrome.runtime.sendMessage({
      type: PROXIED_AUDIO,
      payload: { audioUrl },
    })
  } catch (error) {
    console.error('Failed to play sound via offscreen document:', error)
  }
}

function registerHandler() {
  messaging.registerHandler(PROXIED_AUDIO, payload => {
    const { audioUrl } = payload
    playSound(audioUrl)
  })
}

export default {
  install() {
    registerHandler()
  },
}
