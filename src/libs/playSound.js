/// #if ENV_BACKGROUND
// Service Worker 环境：通过 offscreen document 播放音频
import { PROXIED_AUDIO } from '@constants'

let offscreenDocumentCreated = false

async function ensureOffscreenDocument() {
  if (offscreenDocumentCreated) {
    return
  }

  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  })

  if (existingContexts.length > 0) {
    offscreenDocumentCreated = true
    return
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play notification sounds',
  })

  offscreenDocumentCreated = true
}

export default async audioUrl => {
  try {
    await ensureOffscreenDocument()

    // 发送消息到 offscreen document 播放音频
    await chrome.runtime.sendMessage({
      type: PROXIED_AUDIO,
      payload: { audioUrl },
    })
  } catch (error) {
    console.error('[SpaceFanfou] Failed to play sound in Service Worker:', error)
  }
}
/// #else
// Content/Page 环境：直接使用 Audio API
export default audioUrl => {
  const audio = new Audio()

  audio.src = audioUrl
  audio.play()
}
/// #endif
