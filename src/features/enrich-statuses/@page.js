import select from 'select-dom'
import isShortUrl from './utils/isShortUrl'
import isExternalLink from './utils/isExternalLink'
import isPlainLink from './utils/isPlainLink'
import createUrlUnshortener from './utils/createUrlUnshortener'
import urlTransformers from './utils/urlTransformers'
import urlHandlers from './utils/urlHandlers'
import { isTimelinePage } from '@libs/pageDetect'
import memoize from '@libs/memoize'
import isStatusElement from '@libs/isStatusElement'
import parseUrl from '@libs/parseUrl'
import truncateUrl from '@libs/truncateUrl'

const ATTRIBUTE_MARKER = 'sf-status-enriched'

export default context => {
  const { requireModules } = context
  const {
    storage,
    timelineElementObserver,
    proxiedFetch,
  } = requireModules([ 'storage', 'timelineElementObserver', 'proxiedFetch' ])

  const unshortenUrl = createUrlUnshortener({ storage, proxiedFetch })

  function isStatusProcessed(li) {
    return li.hasAttribute(ATTRIBUTE_MARKER)
  }

  function markStatusAsProcessed(li) {
    return li.setAttribute(ATTRIBUTE_MARKER, '')
  }

  function removeMarkers() {
    for (const li of select.all(`[${ATTRIBUTE_MARKER}]`)) {
      li.removeAttribute(ATTRIBUTE_MARKER)
    }
  }

  function getLinksInStatuses(li) {
    return select.all('.content a', li).filter(link => (
      isExternalLink(link) && // 只处理外站链接
      isPlainLink(link) // 只处理文本链接，避免处理饭否图片链接
    ))
  }

  async function processShortUrl(link, url) {
    if (!isShortUrl(url)) {
      return url
    }

    const longUrl = await unshortenUrl(url)
    const truncatedUrl = truncateUrl(longUrl)

    link.href = longUrl
    link.textContent = truncatedUrl
    link.title = longUrl

    return longUrl
  }

  function findUrlMatched(list, args) {
    return list.find(({ isMatchingUrl }) => isMatchingUrl(args))
  }

  const transformUrl = memoize(url => {
    let parsedUrl, transformer

    do {
      parsedUrl = parseUrl(url)
      transformer = findUrlMatched(urlTransformers, { url, parsedUrl })
      url = transformer
        ? transformer.transform(({ url, parsedUrl }))
        : url
    } while (transformer)

    return url
  })

  // TODO: 缓存结果
  const extractData = async url => {
    const parsedUrl = parseUrl(url)
    const urlHandler = findUrlMatched(urlHandlers, { url, parsedUrl })

    return {
      urlHandlerId: urlHandler ? urlHandler.id : null,
      data: urlHandler ? await urlHandler.extractData({ url, parsedUrl }) : null,
    }
  }

  function applyData(li, urlHandlerId, data) {
    const urlHandler = urlHandlers.find(({ id }) => id === urlHandlerId)

    urlHandler.applyData(li, data)
  }

  async function processLink(li, link) {
    let url = link.href
    url = await processShortUrl(link, url)
    url = transformUrl(url)

    const { urlHandlerId, data } = await extractData(url)

    if (urlHandlerId) {
      applyData(li, urlHandlerId, data)
    }
  }

  function processStatus(li) {
    markStatusAsProcessed(li)

    for (const link of getLinksInStatuses(li)) {
      // 所有链接并发处理
      processLink(li, link)
    }
  }

  function mutationObserverCallback(mutationRecords) {
    for (const { addedNodes } of mutationRecords) {
      for (const addedNode of addedNodes) {
        // TODO: 上下文消息现在无法处理
        if (isStatusElement(addedNode) && !isStatusProcessed(addedNode)) {
          // 所有消息并发处理
          processStatus(addedNode)
        }
      }
    }
  }

  return {
    applyWhen: () => isTimelinePage(),

    onLoad() {
      timelineElementObserver.addCallback(mutationObserverCallback)
      // proxiedFetch.get({ url: 'https://music.163.com/playlist?id=924680166' })
    },

    onUnload() {
      timelineElementObserver.removeCallback(mutationObserverCallback)
      removeMarkers()
    },
  }
}
