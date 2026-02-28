import parseQueryString from '@libs/parseQueryString'
import memoize from '@libs/memoize'

// Service Worker 兼容：使用 URL API 而不是 document.createElement('a')
// 假定 url 是绝对路径；如果是相对路径，则 domain 一定会是 fanfou.com
export default memoize(url => {
  try {
    const parsed = new URL(url)

    return {
      protocol: parsed.protocol,
      origin: parsed.origin,
      pathname: parsed.pathname,
      domain: parsed.hostname,
      query: parseQueryString(parsed.search),
      hash: parsed.hash.slice(1),
    }
  } catch (error) {
    // 如果解析失败，返回默认值
    return {
      protocol: '',
      origin: '',
      pathname: '',
      domain: 'fanfou.com',
      query: {},
      hash: '',
    }
  }
})
