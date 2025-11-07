import wretch from 'wretch'
import select from 'select-dom'
import dotProp from 'dot-prop'
import arrayLast from 'array-last'
import {
  NEW_TIMESTAMP_STORAGE_KEY,
  NEW_TIMESTAMP_STORAGE_AREA_NAME,
  READ_TIMESTAMP_STORAGE_KEY,
  READ_TIMESTAMP_STORAGE_AREA_NAME,
  SAVED_SEARCHES_READ,
  SAVED_SEARCHES_WRITE,
} from './constants'
import messaging from '@background/environment/messaging'
import parseHTML from '@libs/parseHTML'
import asyncSingleton from '@libs/asyncSingleton'
import findElementWithSpecifiedContentInArray from '@libs/findElementWithSpecifiedContentInArray'
import isNaN from '@libs/isNaN'
import log from '@libs/log'

const CHECKING_INTERVAL_MINUTES = 5 // 5 分钟
const ALARM_NAME = 'check-saved-searches'
const MAX_PAGES_TO_SEARCH = 10

export default context => {
  // Service Worker 环境检测：如果 parseHTML 不可用（会抛出错误），则禁用此功能
  // 这个功能需要大量 DOM 解析，在 Service Worker 中无法运行
  try {
    parseHTML('<div></div>')
  } catch (error) {
    log.info('check-saved-searches 功能在 Service Worker 环境中不可用（需要 DOM 解析）')
    return {
      onLoad() {},
      onUnload() {},
    }
  }
  const { requireModules, readOptionValue } = context
  const { storage, notification } = requireModules([ 'storage', 'notification' ])

  let previousLoggedInUserId

  async function readNewTimestampUserMap() {
    return await storage.read(NEW_TIMESTAMP_STORAGE_KEY, NEW_TIMESTAMP_STORAGE_AREA_NAME) || {}
  }

  async function writeNewTimestampUserMap(newTimestampUserMap) {
    await storage.write(NEW_TIMESTAMP_STORAGE_KEY, newTimestampUserMap, NEW_TIMESTAMP_STORAGE_AREA_NAME)
  }

  async function readReadTimestampUserMap() {
    return await storage.read(READ_TIMESTAMP_STORAGE_KEY, READ_TIMESTAMP_STORAGE_AREA_NAME) || {}
  }

  async function writeReadTimestampUserMap(readTimestampUserMap) {
    await storage.write(READ_TIMESTAMP_STORAGE_KEY, readTimestampUserMap, READ_TIMESTAMP_STORAGE_AREA_NAME)
  }

  function extractLoggedInUserId(document) {
    const navLinks = select.all('#navigation li a', document)
    const profilePageLink = findElementWithSpecifiedContentInArray(navLinks, '我的空间')

    return profilePageLink
      ? profilePageLink.pathname.split('/').pop()
      : null
  }

  function extractSavedKeywords(document) {
    return select.all('#savedsearchs > ul > li > a > .label', document)
      .map(element => element.textContent.trim())
  }

  function extractStatusId(li) {
    const statusId = select('.stamp .time', li).pathname.split('/').pop()

    return statusId
  }

  function extractStatusTime(li) {
    const stime = select('.stamp .time', li).getAttribute('stime')
    const statusTimestamp = Date.parse(stime)

    return statusTimestamp
  }

  function isValidTimestamp(x) {
    return typeof x === 'number' && !isNaN(x)
  }

  function hasUnread(newTimestamp, readTimestamp) {
    return (
      isValidTimestamp(newTimestamp) &&
      isValidTimestamp(readTimestamp) &&
      newTimestamp > readTimestamp
    )
  }

  async function searchKeyword(loggedInUserId, keyword, pageNumber = 1, maxId = '') {
    const url = 'https://fanfou.com/search'
    const data = { q: keyword, m: maxId }
    const headers = { 'X-Requested-With': 'XMLHttpRequest' }
    const response = await wretch(url).query(data).headers(headers).get().json()
    const document = parseHTML(response.data.timeline)
    const statuses = Array.from(document.body.children)
    const latestStatusMatchingKeyword = statuses[0]
    const latestFilteredStatus = statuses.find(li => !isPotentiallyReadStatus(li, loggedInUserId))

    if (!latestStatusMatchingKeyword) return null
    if (latestFilteredStatus) return latestFilteredStatus
    if (pageNumber >= MAX_PAGES_TO_SEARCH) return null

    const nextPageStatus = await searchKeyword(
      loggedInUserId,
      keyword,
      pageNumber + 1,
      extractStatusId(arrayLast(statuses)),
    )

    if (nextPageStatus) return nextPageStatus
    if (pageNumber > 1) return null

    return latestStatusMatchingKeyword
  }

  async function getNewTimestampMatchingKeyword(loggedInUserId, keyword) {
    try {
      const latestStatusMatchingKeyword = await searchKeyword(loggedInUserId, keyword)

      return latestStatusMatchingKeyword
        ? extractStatusTime(latestStatusMatchingKeyword)
        : 0 // 表示没有任何消息，但是也没有报错
    } catch (error) {
      log.info(`获取关键字「${keyword}」的搜索结果出错`, error)
      // 返回 undefined，将无法通过 isValidTimestamp() 检查
    }
  }

  function isPotentiallyReadStatus(li, loggedInUserId) {
    return (
      isMyStatus(li, loggedInUserId) ||
      isMentionedInStatus(li, loggedInUserId)
    )
  }

  function isMyStatus(li, loggedInUserId) {
    const authorId = select('.author', li).pathname.split('/').pop()

    return authorId === loggedInUserId
  }

  function isMentionedInStatus(li, loggedInUserId) {
    return select.all('.content .former', li).some(atUser => {
      const atUserId = atUser.pathname.split('/').pop()

      return atUserId === loggedInUserId
    })
  }

  function cleanupTimestampMap(timestampMap, savedKeywords) {
    // 清理已经不再在饭否服务器上保存的关键字的相关数据
    for (const keyword of Object.keys(timestampMap)) {
      if (!savedKeywords.includes(keyword)) {
        delete timestampMap[keyword]
      }
    }
  }

  const check = asyncSingleton(async () => {
    const response = await wretch('https://fanfou.com/home').get().text()
    const document = parseHTML(response)
    const loggedInUserId = extractLoggedInUserId(document)

    previousLoggedInUserId = loggedInUserId

    // 未登录
    if (!loggedInUserId) return

    const savedKeywords = extractSavedKeywords(document)
    const newTimestampUserMap = await readNewTimestampUserMap()
    const newTimestampMap = dotProp.get(newTimestampUserMap, `${loggedInUserId}.newTimestampMap`) || {}

    for (const keyword of savedKeywords) {
      const previousNewTimestamp = newTimestampMap[keyword] || 0
      const newTimestamp = await getNewTimestampMatchingKeyword(loggedInUserId, keyword)

      if (isValidTimestamp(newTimestamp)) {
        newTimestampMap[keyword] = newTimestamp

        if (newTimestamp > previousNewTimestamp) {
          showNotificationForKeyword(loggedInUserId, keyword)
        }
      }
    }
    cleanupTimestampMap(newTimestampMap, savedKeywords)

    newTimestampUserMap[loggedInUserId] = {
      newTimestampMap,
      lastChecked: Date.now(),
    }
    await writeNewTimestampUserMap(newTimestampUserMap)

    const readTimestampUserMap = await readReadTimestampUserMap()
    const readTimestampMap = readTimestampUserMap[loggedInUserId] || {}

    for (const keyword of savedKeywords) {
      const readTimestamp = readTimestampMap[keyword]

      // 如果是新的 keyword，从来都没标记为已读过；或者之前搜索时没有任何匹配的消息
      if (readTimestamp == null || readTimestamp === 0) {
        // 则保存当前最新一条消息为已读
        readTimestampMap[keyword] = newTimestampMap[keyword]
      }
    }
    cleanupTimestampMap(readTimestampMap, savedKeywords)

    readTimestampUserMap[loggedInUserId] = readTimestampMap
    await writeReadTimestampUserMap(readTimestampUserMap)
  })

  function showNotificationForKeyword(userId, keyword) {
    if (readOptionValue('enableNotifications')) {
      const url = `https://fanfou.com/q/${encodeURIComponent(keyword)}`
      const onClick = () => {
        chrome.tabs.create({ url, active: true })
        markKeywordAsRead(userId, keyword)
      }

      notification.create({
        id: `saved-searches/${userId}/${keyword}`,
        message: `您关注的话题「${keyword}」有了新消息`,
        onClick,
        buttonDefs: [ {
          title: '查看',
          onClick,
        }, {
          title: '忽略',
        } ],
      })
    }
  }

  async function markKeywordAsRead(userId, keyword) {
    const readTimestampUserMap = await readReadTimestampUserMap()
    const newTimestamp = await getNewTimestampMatchingKeyword(userId, keyword)

    if (isValidTimestamp(newTimestamp)) {
      dotProp.set(readTimestampUserMap, `${userId}.${keyword}`, newTimestamp)
      await writeReadTimestampUserMap(readTimestampUserMap)
    }
  }

  async function onRead(payload) {
    const { userId, keyword } = payload
    const newTimestampUserMap = await readNewTimestampUserMap()
    const readTimestampUserMap = await readReadTimestampUserMap()

    const lastChecked = dotProp.get(newTimestampUserMap, `${userId}.lastChecked`) || 0
    const now = Date.now()

    // 用户可能切换了账号，并且距离上次检查已经比较久了
    if (previousLoggedInUserId !== userId && now - lastChecked > CHECKING_INTERVAL) {
      setTimeout(check)
      // 临时返回 false，待检查结束会广播变动
      return false
    }

    const newTimestamp = dotProp.get(newTimestampUserMap, `${userId}.newTimestampMap.${keyword}`)
    const readTimestamp = dotProp.get(readTimestampUserMap, `${userId}.${keyword}`)

    return hasUnread(newTimestamp, readTimestamp)
  }

  async function onWrite(payload) {
    const { userId, keyword } = payload

    await markKeywordAsRead(userId, keyword)
  }

  function onAlarm(alarm) {
    if (alarm.name === ALARM_NAME) {
      check()
    }
  }

  return {
    onLoad() {
      console.log('[SpaceFanfou] check-saved-searches: onLoad()')
      check()
      // 使用 chrome.alarms API 替代 setInterval（Service Worker 兼容）
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: CHECKING_INTERVAL_MINUTES,
        periodInMinutes: CHECKING_INTERVAL_MINUTES,
      })
      chrome.alarms.onAlarm.addListener(onAlarm)

      messaging.registerHandler(SAVED_SEARCHES_READ, onRead)
      messaging.registerHandler(SAVED_SEARCHES_WRITE, onWrite)
    },

    onUnload() {
      console.log('[SpaceFanfou] check-saved-searches: onUnload()')
      previousLoggedInUserId = null

      chrome.alarms.clear(ALARM_NAME)
      chrome.alarms.onAlarm.removeListener(onAlarm)

      messaging.unregisterHandler(SAVED_SEARCHES_READ, onRead)
      messaging.unregisterHandler(SAVED_SEARCHES_WRITE, onWrite)
    },
  }
}
