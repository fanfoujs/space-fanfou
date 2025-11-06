// Offscreen document for audio playback
// Service Worker 不支持 Audio API，所以需要在 offscreen document 中播放音频

import { PROXIED_AUDIO } from '@constants'

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === PROXIED_AUDIO) {
    const { audioUrl } = request.payload

    // 创建并播放音频
    const audio = new Audio()
    audio.src = audioUrl
    audio.play()
      .then(() => {
        sendResponse({ success: true })
      })
      .catch(error => {
        console.error('Failed to play audio:', error)
        sendResponse({ success: false, error: error.message })
      })

    // 返回 true 表示会异步调用 sendResponse
    return true
  }
})
