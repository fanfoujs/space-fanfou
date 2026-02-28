import wretch from 'wretch'
import mapValues from 'just-map-values'
import timestamp from '@libs/timestamp'
import log from '@libs/log'

export default context => {
  const { readOptionValue, requireModules } = context
  const { notification } = requireModules([ 'notification' ])

  const URL_FANFOU_WEB_ORIGIN = 'https://fanfou.com'
  const URL_FANFOU_M_HOME = 'https://m.fanfou.com/home'

  const CHECK_INTERVAL_MINUTES = 1 // Chrome alarms 最小间隔为 1 分钟
  const AJAX_TIMEOUT = 10 * 1000
  const NOTIFICATION_TIMEOUT = 15 * 1000
  const ALARM_NAME = 'notifications-check'
  const STORAGE_KEY_PREFIX = 'notification_counts_' // 持久化存储前缀

  let isVisitingFanfou = false
  const userMap = {}

  // Service Worker 环境：直接在 HTML 字符串上使用正则表达式
  const itemsToCheck = {
    unreadMentions: {
      relatedOptionName: 'notifyUnreadMentions',
      extractFromHTML(html) {
        const re = /@我的\((\d+)\)/
        const matched = html.match(re)
        return matched?.[1]
      },
      template: count => `你被 @ 了 ${count} 次`,
      targetUrl: `${URL_FANFOU_WEB_ORIGIN}/mentions`,
      reuseExistingTabs: true,
    },

    unreadPrivateMessages: {
      relatedOptionName: 'notifyUnreadPrivateMessages',
      extractFromHTML(html) {
        const re = /私信\((\d+)\)/
        const matched = html.match(re)
        return matched?.[1]
      },
      template: count => `你有 ${count} 封未读私信`,
      targetUrl: `${URL_FANFOU_WEB_ORIGIN}/privatemsg`,
      reuseExistingTabs: true,
    },

    newFollowers: {
      relatedOptionName: 'notifyNewFollowers',
      extractFromHTML(html) {
        const re = /(\d+) 个人关注了你/
        const matched = html.match(re)
        return matched?.[1]
      },
      template: count => `有 ${count} 个新饭友关注了你`,
      targetUrl: `${URL_FANFOU_WEB_ORIGIN}/home`,
      reuseExistingTabs: false,
    },

    newFollowerRequests: {
      relatedOptionName: 'notifyNewFollowers',
      extractFromHTML(html) {
        const re = /(\d+) 个人申请关注你，去看看是谁/
        const matched = html.match(re)
        return matched?.[1]
      },
      template: count => `有 ${count} 个新饭友请求关注你`,
      targetUrl: `${URL_FANFOU_WEB_ORIGIN}/friend.request`,
      reuseExistingTabs: true,
    },
  }

  class CountCollector {
    constructor(userId) {
      this.userId = userId
      this.currentCounts = this.createEmptyCounts()
      this.previousCounts = this.createEmptyCounts()
    }

    createEmptyCounts() {
      return mapValues(itemsToCheck, () => 0)
    }
  }

  function isFanfouUrl(url) {
    const re = /^https?:\/\/([a-z0-9-]+\.)?fanfou\.com\//

    return re.test(url)
  }

  async function fetchFanfouMobileDOM() {
    try {
      const html = await wretch(URL_FANFOU_M_HOME).get().setTimeout(AJAX_TIMEOUT).text()
      // Service Worker 环境：直接返回 HTML 字符串
      return html
    } catch (error) {
      log.info(`获取 m.fanfou.com 页面源码失败 @ ${timestamp()}`, error)
      return null
    }
  }

  function checkIfLoggedIn(html) {
    // Service Worker 环境：用正则检查 HTML 字符串
    return html.includes('id="nav"') || html.includes('id=\'nav\'')
  }

  function extractUserId(html) {
    // Service Worker 环境：用正则从 HTML 提取用户 ID
    // 查找 <a accesskey="1" href="/用户ID"> 格式的链接
    // 正则表达式中的\转义是为了可读性，保留以提高代码可读性
    // eslint-disable-next-line no-useless-escape
    const match = html.match(/accesskey=["']1["'][^>]*href=["']\/([^"'\/]+)["']|href=["']\/([^"'\/]+)["'][^>]*accesskey=["']1["']/)
    const userId = match?.[1] || match?.[2]
    return userId ? unescape(userId) : null
  }

  async function getCountCollectorForUser(userId) {
    if (userMap[userId]) {
      return userMap[userId]
    }

    // 创建新的CountCollector
    const collector = new CountCollector(userId)

    // 🔧 从storage恢复历史记录（防止Service Worker重启后丢失）
    const storageKey = STORAGE_KEY_PREFIX + userId
    try {
      const result = await chrome.storage.local.get(storageKey)
      if (result[storageKey]) {
        collector.previousCounts = result[storageKey].previousCounts || collector.createEmptyCounts()
        collector.currentCounts = result[storageKey].currentCounts || collector.createEmptyCounts()
        log.info(`已恢复用户 ${userId} 的通知历史记录`)
      }
    } catch (error) {
      log.info(`恢复通知历史失败，使用默认值`, error)
    }

    userMap[userId] = collector
    return collector
  }

  async function extract(html, countCollector) {
    countCollector.previousCounts = countCollector.currentCounts
    countCollector.currentCounts = countCollector.createEmptyCounts()

    // Service Worker 环境：直接在 HTML 字符串上提取
    for (const [ name, opts ] of Object.entries(itemsToCheck)) {
      const extracted = opts.extractFromHTML(html)
      countCollector.currentCounts[name] = parseInt(extracted, 10) || 0
    }

    // 🔧 保存到storage（防止Service Worker重启后丢失）
    const storageKey = STORAGE_KEY_PREFIX + countCollector.userId
    try {
      await chrome.storage.local.set({
        [storageKey]: {
          previousCounts: countCollector.previousCounts,
          currentCounts: countCollector.currentCounts,
        },
      })
    } catch (error) {
      log.info(`保存通知历史失败`, error)
    }
  }

  function notify(countCollector) {
    if (readOptionValue('doNotDisturbWhenVisitingFanfou') && isVisitingFanfou) {
      return
    }

    for (const [ name, opts ] of Object.entries(itemsToCheck)) {
      const currentCount = countCollector.currentCounts[name]
      const previousCount = countCollector.previousCounts[name]
      const isOptionEnabled = readOptionValue(opts.relatedOptionName)

      if (currentCount > previousCount && isOptionEnabled) {
        const message = opts.template(currentCount)

        createNotification(name, opts, message)
      }
    }
  }

  function createNotification(name, opts, message) {
    const onClick = () => {
      const { targetUrl: url, reuseExistingTabs } = opts

      chrome.tabs.query({ url }, matchedTabs => {
        if (reuseExistingTabs && matchedTabs.length) {
          const { id, windowId } = matchedTabs[0]

          chrome.tabs.update(id, { active: true })
          chrome.windows.update(windowId, { focused: true })
          chrome.tabs.reload(id)
        } else {
          chrome.tabs.create({ url, active: true })
        }
      })
    }

    notification.create({
      id: name,
      message,
      onClick,
      buttonDefs: [ {
        title: '查看',
        onClick,
      }, {
        title: '忽略',
      } ],
      timeout: NOTIFICATION_TIMEOUT,
    })
  }

  async function check() {
    cancelTimer()

    const html = await fetchFanfouMobileDOM()

    if (html && checkIfLoggedIn(html)) {
      const currentlyLoggedInUserId = extractUserId(html)
      const countCollector = await getCountCollectorForUser(currentlyLoggedInUserId)

      await extract(html, countCollector)
      notify(countCollector)
    }

    // 不需要再次调用 setTimer，chrome.alarms 会自动重复
  }

  function setTimer() {
    // 使用 chrome.alarms API 替代 setTimeout（Service Worker 兼容）
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: CHECK_INTERVAL_MINUTES,
      periodInMinutes: CHECK_INTERVAL_MINUTES,
    })
  }

  function cancelTimer() {
    chrome.alarms.clear(ALARM_NAME)
  }

  function onAlarm(alarm) {
    if (alarm.name === ALARM_NAME) {
      check()
    }
  }

  function onActivated(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, tab => {
      if (isVisitingFanfou = isFanfouUrl(tab.url)) {
        hideRelativeNotificationIfMatched(tab.url)
      }
    })
  }

  function onUpdated(tabId, changeInfo, tab) {
    if (tab.selected && (isVisitingFanfou = isFanfouUrl(tab.url))) {
      hideRelativeNotificationIfMatched(tab.url)
    }
  }

  function hideRelativeNotificationIfMatched(tabUrl) {
    for (const [ name, opts ] of Object.entries(itemsToCheck)) {
      if (opts.targetUrl === tabUrl) {
        notification.hide(name)
        break
      }
    }
  }

  return {
    onLoad() {
      check()
      chrome.tabs.onActivated.addListener(onActivated)
      chrome.tabs.onUpdated.addListener(onUpdated)
      chrome.alarms.onAlarm.addListener(onAlarm)
      setTimer()
    },

    onUnload() {
      cancelTimer()
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.alarms.onAlarm.removeListener(onAlarm)
    },
  }
}
