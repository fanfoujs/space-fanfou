import select from 'select-dom'
import simpleMemoize from 'just-once'
import detectEnv from '@libs/detectEnv'
import parseUrl from '@libs/parseUrl'
import { ENV_PAGE, ASSET_CLASSNAME } from '@constants'

export default simpleMemoize(() => {
  let extensionId

  if (detectEnv() === ENV_PAGE) {
    // 一般是 content script 注入的 page script 的 <script /> 元素
    const sfAsset = select(`.${ASSET_CLASSNAME}[src]`)

    extensionId = parseUrl(sfAsset.src).domain
  } else {
    extensionId = chrome.runtime.id
  }

  return `chrome-extension://${extensionId}`
})
