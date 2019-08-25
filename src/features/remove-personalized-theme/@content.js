import { h } from 'dom-chef'
import elementReady from 'element-ready'
import fanfouDefaultThemeCss from './fanfou-default-theme'
import findUserThemeStyleElement from '@libs/findUserThemeStyleElement'
import keepRetry from '@libs/keepRetry'
import getLoggedInUserId from '@libs/getLoggedInUserId'
import arrayUniquePush from '@libs/arrayUniquePush'
import arrayRemove from '@libs/arrayRemove'

const STORAGE_KEY = 'remove-personalized-theme/userIdList'
const STORAGE_AREA_NAME = 'sync'

export default context => {
  const { requireModules } = context
  const { storage } = requireModules([ 'storage' ])

  let isEnabled = false
  let userThemeStyleElement
  let userThemeCss = ''
  let button
  let userId

  function extractUserIdFromUrl() {
    const splitPathname = window.location.pathname.split('/')

    // 这几个页面没有相关 meta，所以直接通过 URL 判断
    return [ 'favorites', 'friends', 'followers' ].includes(splitPathname[1])
      ? splitPathname[2]
      : null
  }

  async function extractUserIdFromMeta() {
    const meta = await elementReady('meta[name="author"]')

    if (meta) {
      const rawValue = meta.getAttribute('content')

      return rawValue.match(/\((.+)\)$/)[1]
    }
  }

  function createButton() {
    return (
      <a id="sf-remove-personalized-theme-switch" onClick={() => toggle(!isEnabled)} />
    )
  }

  async function readList() {
    return await storage.read(STORAGE_KEY, STORAGE_AREA_NAME) || []
  }

  async function writeList(list) {
    await storage.write(STORAGE_KEY, list, STORAGE_AREA_NAME)
  }

  async function shouldEnableOnLoad() {
    const list = await readList()

    return list.includes(userId)
  }

  async function saveState() {
    const list = await readList()

    if (isEnabled) {
      arrayUniquePush(list, userId)
    } else {
      arrayRemove(list, userId)
    }

    await writeList(list)
  }

  function toggle(nextState, force = false) {
    if (nextState === isEnabled && !force) return

    setStyle(nextState ? fanfouDefaultThemeCss : userThemeCss)

    button.title = nextState
      ? '使用用户自定义模板'
      : '使用饭否默认模板'
    button.classList.toggle('sf-enabled', isEnabled = nextState)

    saveState()
  }

  function setStyle(css) {
    userThemeStyleElement.textContent = css
  }

  return {
    async applyWhen() {
      userId = extractUserIdFromUrl() || await extractUserIdFromMeta()

      return userId && userId !== getLoggedInUserId()
    },

    waitReady: () => keepRetry({
      checker: () => findUserThemeStyleElement(),
      until: () => document.readyState === 'complete',
      delay: 0,
    }),

    async onLoad() {
      userThemeStyleElement = findUserThemeStyleElement()
      userThemeCss = userThemeStyleElement.textContent
      button = createButton()
      document.body.appendChild(button)
      toggle(await shouldEnableOnLoad(), true) // 初始化
    },

    onUnload() {
      setStyle(userThemeCss)
      userThemeStyleElement = null
      userThemeCss = ''
      button.remove()
      button = null
      isEnabled = false
    },
  }
}
