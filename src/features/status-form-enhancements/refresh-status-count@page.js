import select from 'select-dom'
import arrayRemove from 'just-remove'
import { isHomePage } from '@libs/pageDetect'
import parseHTML from '@libs/parseHTML'
import isStatusElement from '@libs/isStatusElement'
import findElementWithSpecifiedContentInArray from '@libs/findElementWithSpecifiedContentInArray'
import getLoggedInUserId from '@libs/getLoggedInUserId'

const ATTRIBUTE_INTERNAL_ID = 'sf-internal-id'

export default context => {
  const { requireModules, elementCollection } = context
  const {
    timelineElementObserver,
    proxiedFetch,
  } = requireModules([ 'timelineElementObserver', 'proxiedFetch' ])

  let isInit
  let internalIdGen = 0

  elementCollection.add({
    count: '#user_stats li:nth-of-type(3) .count',
  })

  function getStatusInternalId(li) {
    return li.getAttribute(ATTRIBUTE_INTERNAL_ID) || do {
      const internalId = String(internalIdGen++)

      li.setAttribute(ATTRIBUTE_INTERNAL_ID, internalId)

      internalId // eslint-disable-line no-unused-expressions
    }
  }

  function getStatusByInternalId(statusElements) {
    return internalId => statusElements.find(li => getStatusInternalId(li) === internalId)
  }

  function getStatusAuthorId(li) {
    return select('.author', li).pathname.slice(1)
  }

  function isLoggedInUserId(userId) {
    return userId === getLoggedInUserId()
  }

  // TODO: 如果是向下翻页加载进来的新消息，不该处理
  function mutationObserverCallback(mutationRecords) {
    for (const { addedNodes, removedNodes } of mutationRecords) {
      const removed = removedNodes.filter(isStatusElement).map(getStatusInternalId)
      const added = addedNodes.filter(isStatusElement).map(getStatusInternalId)
      const diff = [
        ...arrayRemove(added, removed).map(getStatusByInternalId(addedNodes)),
        ...arrayRemove(removed, added).map(getStatusByInternalId(removedNodes)),
      ]
      const loggedInUserStatuses = diff.map(getStatusAuthorId).filter(isLoggedInUserId)

      if (isInit) {
        isInit = false
        return
      }

      if (loggedInUserStatuses.length) {
        refreshStatusCount()
      }
    }
  }

  async function refreshStatusCount() {
    const userId = getLoggedInUserId()
    const url = `https://m.fanfou.com/${userId}`
    const { error: ajaxError, responseText: html } = await proxiedFetch.get({ url })

    if (ajaxError) return

    const document = parseHTML(html)
    const p = select('#nav', document).previousElementSibling
    const re = /^消息\((\d+)\)$/
    const link = findElementWithSpecifiedContentInArray(select.all('a', p), re)
    const newCountNumber = link.textContent.match(re)[1]

    elementCollection.get('count').textContent = newCountNumber
  }

  return {
    applyWhen: () => isHomePage(),

    onLoad() {
      isInit = true
      timelineElementObserver.addCallback(mutationObserverCallback)
    },

    onUnload() {
      timelineElementObserver.removeCallback(mutationObserverCallback)
    },
  }
}
