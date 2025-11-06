import select from 'select-dom'
import { on, off } from 'delegated-events'
import {
  NEW_TIMESTAMP_STORAGE_KEY,
  NEW_TIMESTAMP_STORAGE_AREA_NAME,
  READ_TIMESTAMP_STORAGE_KEY,
  READ_TIMESTAMP_STORAGE_AREA_NAME,
  SAVED_SEARCHES_READ,
  SAVED_SEARCHES_WRITE,
} from './constants'
import bridge from '@page/environment/bridge'
import getLoggedInUserId from '@libs/getLoggedInUserId'
import { STORAGE_CHANGED } from '@constants'

const CLASSNAME_INDICATOR = 'sf-new'
const SELECTOR_KEYWORD_LINK = '#savedsearchs > ul > li > a'

export default context => {
  const {
    elementCollection,
    registerBroadcastListener,
    unregisterBroadcastListener,
  } = context

  elementCollection.add({
    savedSearchs: '#savedsearchs',
  })

  async function checkUnread(keyword) {
    const userId = getLoggedInUserId()
    const hasUnread = await bridge.postMessage({
      action: SAVED_SEARCHES_READ,
      payload: { userId, keyword },
    })

    return hasUnread
  }

  async function markAsRead(keyword) {
    const userId = getLoggedInUserId()

    await bridge.postMessage({
      action: SAVED_SEARCHES_WRITE,
      payload: { userId, keyword },
    })
  }

  function getItems() {
    const savedSearchs = elementCollection.get('savedSearchs')
    // 这些元素不缓存在 ElementCollection 里，因为可能会动态增删
    const elements = select.all('.label', savedSearchs)

    return elements.map(element => ({
      element,
      keyword: element.textContent.trim(),
    }))
  }

  async function updateIndicators() {
    for (const { element, keyword } of getItems()) {
      const hasNew = await checkUnread(keyword)

      element.classList.toggle(CLASSNAME_INDICATOR, hasNew)
    }
  }

  function removeIndicators() {
    for (const { element } of getItems()) {
      element.classList.remove(CLASSNAME_INDICATOR)
    }
  }

  async function onClick(event) {
    const keywordLink = (event.composedPath?.() || event.path || []).find(element => element.matches?.(SELECTOR_KEYWORD_LINK))
    const label = select('.label', keywordLink)
    const keyword = label.textContent.trim()

    label.classList.remove(CLASSNAME_INDICATOR)

    await markAsRead(keyword)
    await updateIndicators()
  }

  function isRelatedStorageChange({ storageAreaName, key }) {
    if (
      storageAreaName === NEW_TIMESTAMP_STORAGE_AREA_NAME &&
      key === NEW_TIMESTAMP_STORAGE_KEY
    ) {
      return true
    }

    if (
      storageAreaName === READ_TIMESTAMP_STORAGE_AREA_NAME &&
      key === READ_TIMESTAMP_STORAGE_KEY
    ) {
      return true
    }

    return false
  }

  function onBroadcast({ action, payload }) {
    if (action === STORAGE_CHANGED && isRelatedStorageChange(payload)) {
      updateIndicators()
    }
  }

  return {
    applyWhen: () => elementCollection.ready('savedSearchs'),

    onLoad() {
      updateIndicators()
      // 饭否也使用了事件代理，并且使用了 event.stopPropagation()
      // 我们使用 capture 避免受影响
      on('click', SELECTOR_KEYWORD_LINK, onClick, { capture: true })
      registerBroadcastListener(onBroadcast)
    },

    onUnload() {
      removeIndicators()
      off('click', SELECTOR_KEYWORD_LINK, onClick, { capture: true })
      unregisterBroadcastListener(onBroadcast)
    },
  }
}
