import wretch from 'wretch'
import select from 'select-dom'
import mapValues from 'just-map-values'
import parseHTML from '@libs/parseHTML'
import timestamp from '@libs/timestamp'
import log from '@libs/log'

export default context => {
  const { readOptionValue, requireModules } = context
  const { notification } = requireModules([ 'notification' ])

  const URL_FANFOU_WEB_ORIGIN = 'https://fanfou.com'
  const URL_FANFOU_M_HOME = 'https://m.fanfou.com/home'

  const CHECK_INTERVAL = 30 * 1000
  const AJAX_TIMEOUT = 10 * 1000
  const NOTIFICATION_TIMEOUT = 15 * 1000

  let timerId
  let isVisitingFanfou = false
  const userMap = {}

  const itemsToCheck = {
    unreadMentions: {
      relatedOptionName: 'notifyUnreadMentions',
      findElement(document) {
        return select('h2 a[href="/mentions"]', document)
      },
      extract(element) {
        const re = /@我的\((\d+)\)/
        const matched = element.textContent.match(re)

        return matched?.[1]
      },
      template: count => `你被 @ 了 ${count} 次`,
      targetUrl: `${URL_FANFOU_WEB_ORIGIN}/mentions`,
      reuseExistingTabs: true,
    },

    unreadPrivateMessages: {
      relatedOptionName: 'notifyUnreadPrivateMessages',
      findElement(document) {
        return select('#nav [accesskey="7"]', document)
      },
      extract(element) {
        const re = /私信\((\d+)\)/
        const matched = element.textContent.match(re)

        return matched?.[1]
      },
      template: count => `你有 ${count} 封未读私信`,
      targetUrl: `${URL_FANFOU_WEB_ORIGIN}/privatemsg`,
      reuseExistingTabs: true,
    },

    newFollowers: {
      relatedOptionName: 'notifyNewFollowers',
      findElement(document) {
        return select('p > span.a > a[href^="/friend.add/"]', document)
          ?.parentElement // -> span.a
          ?.parentElement // -> p
          ?.previousElementSibling
      },
      extract(element) {
        const re = /(\d+) 个人关注了你/
        const matched = element.textContent.match(re)

        return matched?.[1]
      },
      template: count => `有 ${count} 个新饭友关注了你`,
      targetUrl: `${URL_FANFOU_WEB_ORIGIN}/home`,
      reuseExistingTabs: false,
    },

    newFollowerRequests: {
      relatedOptionName: 'notifyNewFollowers',
      findElement(document) {
        return select('a[href="/friend.request"]', document)?.parentElement
      },
      extract(element) {
        const re = /(\d+) 个人申请关注你，去看看是谁/
        const matched = element.textContent.match(re)

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
      const document = parseHTML(html)

      return document
    } catch (error) {
      log.info(`获取 m.fanfou.com 页面源码失败 @ ${timestamp()}`, error)
      return null
    }
  }

  function checkIfLoggedIn(document) {
    return select.exists('#nav', document)
  }

  function extractUserId(document) {
    const userProfilePageLink = select('#nav [accesskey="1"]', document)
    const userId = unescape(userProfilePageLink.getAttribute('href')).replace('/', '')

    return userId
  }

  function getCountCollectorForUser(userId) {
    return userMap[userId] || (userMap[userId] = new CountCollector(userId))
  }

  function extract(document, countCollector) {
    countCollector.previousCounts = countCollector.currentCounts
    countCollector.currentCounts = countCollector.createEmptyCounts()

    for (const [ name, opts ] of Object.entries(itemsToCheck)) {
      const element = opts.findElement(document)
      const extracted = element && opts.extract(element)

      countCollector.currentCounts[name] = parseInt(extracted, 10) || 0
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

    const document = await fetchFanfouMobileDOM()

    if (document && checkIfLoggedIn(document)) {
      const currentlyLoggedInUserId = extractUserId(document)
      const countCollector = getCountCollectorForUser(currentlyLoggedInUserId)

      extract(document, countCollector)
      notify(countCollector)
    }

    setTimer()
  }

  function setTimer() {
    timerId = setTimeout(check, CHECK_INTERVAL)
  }

  function cancelTimer() {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
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
    },

    onUnload() {
      cancelTimer()
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
    },
  }
}
