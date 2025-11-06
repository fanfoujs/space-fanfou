// Offscreen document for audio playback
// Service Worker 不支持 Audio API，所以需要在 offscreen document 中播放音频

import { PROXIED_AUDIO } from '@constants'

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === PROXIED_AUDIO) {
    const { audioUrl } = request.payload

    // 健壮的类型检查：处理可能的非字符串类型
    if (!audioUrl) {
      console.error('[SpaceFanfou Offscreen] audioUrl is empty or undefined')
      sendResponse({ success: false, error: 'audioUrl is empty' })
      return true
    }

    // 处理可能的 webpack module 对象（有 default 属性）
    const audioUrlString = typeof audioUrl === 'string'
      ? audioUrl
      : (audioUrl?.default || String(audioUrl))

    // 验证转换后的 URL 格式
    if (!audioUrlString || audioUrlString === 'undefined' || audioUrlString === '[object Object]') {
      console.error('[SpaceFanfou Offscreen] Invalid audioUrl:', audioUrl, 'Converted:', audioUrlString)
      sendResponse({ success: false, error: 'Invalid audioUrl' })
      return true
    }

    // 确保使用完整的 extension URL
    const fullUrl = audioUrlString.startsWith('chrome-extension://')
      ? audioUrlString
      : chrome.runtime.getURL(audioUrlString)

    console.log('[SpaceFanfou Offscreen] Playing audio:', fullUrl)

    // 创建并播放音频
    const audio = new Audio()

    // 监听加载错误
    audio.onerror = (error) => {
      console.error('[SpaceFanfou Offscreen] Audio load error:', error, 'URL:', fullUrl)
      sendResponse({ success: false, error: 'Failed to load audio file' })
    }

    // 监听加载完成
    audio.oncanplaythrough = () => {
      console.log('[SpaceFanfou Offscreen] Audio loaded, ready to play')
    }

    audio.src = fullUrl

    // 设置音量
    audio.volume = 1.0

    // 尝试播放
    audio.play()
      .then(() => {
        console.log('[SpaceFanfou Offscreen] Audio played successfully')
        sendResponse({ success: true })
      })
      .catch(error => {
        console.error('[SpaceFanfou Offscreen] Failed to play audio:', error, 'URL:', fullUrl)
        sendResponse({ success: false, error: error.message || error.toString() })
      })

    // 返回 true 表示会异步调用 sendResponse
    return true
  }
})
