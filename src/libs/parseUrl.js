import pick from 'just-pick'
import parseQueryString from '@libs/parseQueryString'
import memoize from '@libs/memoize'

/// #if ENV_BACKGROUND
// Service Worker 环境：使用 URL API（不依赖 DOM）
// 假定 url 是绝对路径；如果是相对路径，则默认基于 fanfou.com
export default memoize(url => {
  try {
    const urlObj = new URL(url, 'https://fanfou.com')

    return {
      protocol: urlObj.protocol,
      origin: urlObj.origin,
      pathname: urlObj.pathname,
      domain: urlObj.hostname,
      query: parseQueryString(urlObj.search),
      hash: urlObj.hash.slice(1),
    }
  } catch (error) {
    // URL 解析失败时返回默认值
    return {
      protocol: '',
      origin: '',
      pathname: '',
      domain: '',
      query: {},
      hash: '',
    }
  }
})
/// #else
// Content/Page 环境：使用 DOM API
const helper = document.createElement('a')

// 假定 url 是绝对路径；如果是相对路径，则 domain 一定会是 fanfou.com
export default memoize(url => {
  helper.href = url

  // 缺少 port 等，但是已经足够使用了
  return {
    ...pick(helper, [ 'protocol', 'origin', 'pathname' ]),
    domain: helper.hostname,
    query: parseQueryString(helper.search),
    hash: helper.hash.slice(1),
  }
})
/// #endif
