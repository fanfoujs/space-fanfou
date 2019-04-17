// 发送消息后，立即调用 FF.app.Timeline.checkNew() 往往刷新不出新消息
// 这个模块尝试解决这个问题
// 原理是持续调用接口查询新消息，直到查询到新的自己的消息为止

import select from 'select-dom'
import wretch from 'wretch'
import requireFanfouLib from '@libs/requireFanfouLib'
import keepRetry from '@libs/keepRetry'
import parseHTML from '@libs/parseHTML'
import asyncSingleton from '@libs/asyncSingleton'
import getLoggedInUserProfilePageUrl from '@libs/getLoggedInUserProfilePageUrl'

// 如果重试超过该时间仍然查找不到自己发送的新消息，放弃
const TIMEOUT_MS = 5 * 1000

let timeDifference = 0

function processHtml(html) {
  const document = parseHTML(html)
  const statusElements = Array.from(document.body.children)

  return statusElements
}

// 获取所有未加载入 TL 的新消息
async function fetchNewStatuses() {
  const { currentSinceId } = window.FF.app.Timeline
  const json = await wretch(`/hc?since_id=${currentSinceId}`).get().json()
  const statusElements = processHtml(json.data.timeline || '')
  const serverTime = Date.parse(json.srv_clk)
  const clientTime = Date.now()

  // 服务器时间和本地时间可能有偏差
  timeDifference = serverTime ? clientTime - serverTime : 0

  return statusElements
}

// 查找刚刚发送的消息
function findTheStatusJustPosted(startTime, statusElements) {
  return statusElements.some(li => {
    // 首先得是登录用户自己的消息
    const authorUrl = select('.author', li).href
    if (authorUrl !== getLoggedInUserProfilePageUrl()) return false

    // 且消息的时间应该在发送之后，否则认为是之前发送过但是没有加载进 TL 的消息
    const statusTime = (
      Date.parse(select('.time', li).getAttribute('stime')) +
      timeDifference
    )
    if (startTime > statusTime) return false

    return true
  })
}

const check = asyncSingleton((startTime = Date.now()) => keepRetry({
  async checker() {
    const newStatuses = await fetchNewStatuses()
    const hasFoundMyStatuses = findTheStatusJustPosted(startTime, newStatuses)

    return hasFoundMyStatuses
  },
  executor() {
    window.FF.app.Timeline.checkNew()
  },
  until() {
    const now = Date.now()
    const shouldCancel = now - startTime > TIMEOUT_MS

    return shouldCancel
  },
}))

export default {
  ready: () => requireFanfouLib('FF.app.Timeline'),

  check,
}
