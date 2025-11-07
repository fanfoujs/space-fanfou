// Service Worker 兼容：检测 Audio API 是否可用
export default audioUrl => {
  // Service Worker 环境中 Audio 不可用，静默失败
  if (typeof Audio === 'undefined') {
    return
  }

  const audio = new Audio()
  audio.src = audioUrl
  audio.play()
}
