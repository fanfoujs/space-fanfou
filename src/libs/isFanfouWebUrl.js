// Service Worker 兼容：使用 URL API 而不是 parseUrl（parseUrl 依赖 document.createElement）
export default url => {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'fanfou.com'
  } catch {
    return false
  }
}
