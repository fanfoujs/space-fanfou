// 把原本在 page script 的 AJAX 请求放到 background script
// 用于绕开跨域限制
// 但是仍然需要把要请求的资源的域名列在 manifest.json 的 content_security_policy 里面
// https://developer.chrome.com/apps/xhr

import wretch from 'wretch'
import messaging from './messaging'
import { PROXIED_FETCH_GET } from '@constants'

function registerHandler() {
  messaging.registerHandler(PROXIED_FETCH_GET, async payload => {
    const { url, query, responseType = 'text' } = payload
    let error, responseText, responseJSON
    let w = wretch(url).options({
      // 必须带上 cookie，否则 fanfou 会返回登录页导致解析为空
      credentials: 'include',
    })

    if (query) w = w.query(query)

    try {
      w = await w.get()

      if (responseType === 'text') {
        responseText = await w.text()
      } else if (responseType === 'json') {
        responseJSON = await w.json()
      }
    } catch (exception) {
      error = exception
    }

    return { error, responseText, responseJSON }
  })
}

export default {
  install() {
    registerHandler()
  },
}
