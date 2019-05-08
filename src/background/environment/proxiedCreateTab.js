// 把原本在 page script 的 window.open() 放到 background script
// 避免被 Chrome 当成恶意弹窗屏蔽掉

import messaging from './messaging'
import { PROXIED_CREATE_TAB } from '@constants'

function registerHandler() {
  messaging.registerHandler(PROXIED_CREATE_TAB, payload => {
    const { url, openInBackgroundTab = false } = payload

    chrome.tabs.create({
      url,
      active: !openInBackgroundTab,
    })
  })
}

export default {
  install() {
    registerHandler()
  },
}
