/// #if ENV_BACKGROUND
// Service Worker 环境：没有 window 对象，expose 成为空操作
export default object => {
  // 在 Service Worker 中不做任何事
  // 这个函数主要用于开发调试，在 background 环境中不需要
}
/// #else
// Content/Page 环境：暴露到 window.SF
export default object => {
  if (typeof SF === 'undefined') {
    window.SF = {}
  }

  Object.assign(window.SF, object)
}
/// #endif
