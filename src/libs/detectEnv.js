import simpleMemoize from 'just-once'
import { ENV_BACKGROUND, ENV_CONTENT, ENV_PAGE } from '@constants'

// 探测当前脚本的运行环境
export default simpleMemoize(() => {
  if (typeof chrome.runtime?.reload === 'function') {
    return ENV_BACKGROUND
  }

  if (typeof chrome.runtime?.id === 'string') {
    return ENV_CONTENT
  }

  return ENV_PAGE
})
