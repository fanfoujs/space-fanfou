// Service Worker 兼容：检测 window 对象是否存在
export default object => {
  // Service Worker 环境中没有 window 对象，直接返回
  if (typeof window === 'undefined') {
    return
  }

  if (typeof SF === 'undefined') {
    window.SF = {}
  }

  Object.assign(window.SF, object)
}
