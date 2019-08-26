import select from 'select-dom'
import simpleMemoize from 'just-once'
import parseUrl from '@libs/parseUrl'
import { ASSET_CLASSNAME } from '@constants'

export default simpleMemoize(() => {
  let extensionId

  /// #if ENV_PAGE
  // 一般是 content script 注入的 page script 的 <script /> 元素
  extensionId = parseUrl(select(`.${ASSET_CLASSNAME}[src]`).src).domain
  /// #else
  extensionId = chrome.runtime.id
  /// #endif

  return `chrome-extension://${extensionId}`
})
