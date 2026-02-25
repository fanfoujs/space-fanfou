import parseHTML from '@libs/parseHTML'
import getLoggedInUserId from '@libs/getLoggedInUserId'
import { isTimelinePage } from '@libs/pageDetect'

const STORAGE_KEY_CACHE = 'avatar-wallpaper/cache'
const STORAGE_AREA = 'local'
const STORAGE_KEY_FAVORITE_FANFOUERS = 'favorite-fanfouers/friendsData'
const STORAGE_AREA_FAVORITE_FANFOUERS = 'sync'
const CACHE_SCHEMA_VERSION = 1
const CONTAINER_ID = 'sf-avatar-wallpaper'
const PANE_LEFT_ID = 'sf-avatar-wallpaper-pane-left'
const PANE_RIGHT_ID = 'sf-avatar-wallpaper-pane-right'
const BODY_CLASSNAME = 'sf-avatar-wallpaper-enabled'
const DEFAULT_OPACITY = 0.22
const DEFAULT_BACKGROUND_PRESET = 2
const DEFAULT_PRIORITIZE_FAVORITES = true
const DEFAULT_FILL_GAPS_ONLY = true
const DEFAULT_REFRESH_INTERVAL_DAYS = 7
const MAX_RENDER_AVATARS = 520
const MAX_API_PAGES = 8
const MAX_WEB_PAGES = 8
const LEFT_PANE_CENTER_GUTTER = 14
const RIGHT_PANE_CENTER_GUTTER = 24
const API_URL = 'https://api.fanfou.com/users/friends.json'
const BACKGROUND_PRESETS = [ {
  id: 1,
  background: 'linear-gradient(140deg, #f3f8ff 0%, #e6f0ff 45%, #d8e7ff 100%)',
}, {
  id: 2,
  background: 'linear-gradient(140deg, #edf5ff 0%, #dbe9ff 45%, #c8ddff 100%)',
}, {
  id: 3,
  background: 'linear-gradient(145deg, #dde9ff 0%, #c8dcff 45%, #b1cfff 100%)',
}, {
  id: 4,
  background: 'linear-gradient(140deg, #e6f7ff 0%, #d5eeff 45%, #bee3ff 100%)',
}, {
  id: 5,
  background: 'linear-gradient(145deg, #d9e7ff 0%, #bfd6ff 45%, #9fc2ff 100%)',
}, {
  id: 6,
  background: 'linear-gradient(145deg, #eef7ff 0%, #def0ff 42%, #c9e5ff 100%)',
}, {
  id: 7,
  background: 'linear-gradient(145deg, #d8e7ff 0%, #bcd6ff 45%, #9cbfff 100%)',
}, {
  id: 8,
  background: 'linear-gradient(145deg, #d4e0f7 0%, #b7c9e8 45%, #95afd8 100%)',
}, {
  id: 9,
  background: 'linear-gradient(145deg, #f5f9ff 0%, #e8f1ff 45%, #d5e5ff 100%)',
}, {
  id: 10,
  background: 'linear-gradient(145deg, #cedcf7 0%, #afc3ed 42%, #8ea9e1 100%)',
} ]

function toNumberOrDefault(value, defaultValue) {
  return Number.isFinite(value)
    ? value
    : defaultValue
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }

  return array
}

function normalizeAvatarUrl(url = '') {
  let normalized = String(url).trim()
  if (!normalized) return ''

  if (normalized.startsWith('//')) {
    normalized = `${window.location.protocol}${normalized}`
  }

  normalized = normalized
    .replace('/s0/', '/l0/')
    .replace('/s1/', '/l1/')
    .replace('/m0/', '/l0/')
    .replace('/m1/', '/l1/')

  return normalized
}

function createAvatarKey(url = '') {
  const normalized = normalizeAvatarUrl(url)
  if (!normalized) return ''

  try {
    const parsedUrl = new URL(normalized, window.location.origin)
    return `${parsedUrl.hostname}${parsedUrl.pathname}`.toLowerCase()
  } catch {
    return normalized.split('?')[0].toLowerCase()
  }
}

function dedupeAndNormalize(urls) {
  const map = new Map()

  for (const url of urls) {
    const normalized = normalizeAvatarUrl(url)
    const key = createAvatarKey(normalized)

    if (key) {
      map.set(key, normalized)
    }
  }

  return [ ...map.values() ]
}

function parseAvatarUrlsFromHtmlDocument(document) {
  const images = document.querySelectorAll([
    '#stream li .avatar img',
    '#friends li .avatar img',
    '#friends li img',
    '.users li .avatar img',
  ].join(', '))
  const urls = [ ...images ].map(image => (
    image.getAttribute('src') || image.getAttribute('data-src') || ''
  ))

  return dedupeAndNormalize(urls)
}

function buildPageUrlCandidates() {
  const userId = getLoggedInUserId()

  if (!userId) {
    return [
      'https://fanfou.com/friends',
    ]
  }

  const encodedUserId = encodeURIComponent(userId)

  return [
    `https://fanfou.com/friends/${encodedUserId}`,
    'https://fanfou.com/friends',
  ]
}

function createPageUrl(baseUrl, page) {
  return page === 1
    ? baseUrl
    : `${baseUrl.replace(/\/+$/, '')}/p.${page}`
}

async function fetchHtml(proxiedFetch, url) {
  const { error, responseText } = await proxiedFetch.get({ url })
  if (error || typeof responseText !== 'string') return ''

  return responseText
}

async function fetchAvatarUrlsFromWebPages(proxiedFetch) {
  for (const baseUrl of buildPageUrlCandidates()) {
    const avatars = []

    for (let page = 1; page <= MAX_WEB_PAGES; page++) {
      const pageUrl = createPageUrl(baseUrl, page)
      const html = await fetchHtml(proxiedFetch, pageUrl)

      if (!html) {
        if (page === 1) {
          avatars.length = 0
        }
        break
      }

      const document = parseHTML(html)
      const pageAvatarUrls = parseAvatarUrlsFromHtmlDocument(document)

      if (!pageAvatarUrls.length) {
        break
      }

      avatars.push(...pageAvatarUrls)
    }

    if (avatars.length) {
      return dedupeAndNormalize(avatars)
    }
  }

  return []
}

async function fetchAvatarUrlsFromApi(fanfouOAuth) {
  const avatars = []

  for (let page = 1; page <= MAX_API_PAGES; page++) {
    const { error, responseJSON } = await fanfouOAuth.request({
      url: API_URL,
      query: {
        count: 100,
        page,
      },
      responseType: 'json',
    })

    if (error) {
      throw new Error(error)
    }

    if (!Array.isArray(responseJSON) || responseJSON.length === 0) {
      break
    }

    for (const user of responseJSON) {
      avatars.push(user?.profile_image_url)
    }

    if (responseJSON.length < 100) {
      break
    }
  }

  return dedupeAndNormalize(avatars)
}

function isCacheFresh(cache, refreshIntervalDays) {
  if (!cache || cache.version !== CACHE_SCHEMA_VERSION) return false
  if (!Array.isArray(cache.avatars) || cache.avatars.length === 0) return false
  if (!cache.updatedAt) return false

  const ttl = refreshIntervalDays * 24 * 60 * 60 * 1000

  return Date.now() - cache.updatedAt < ttl
}

function readCache(storage) {
  return storage.read(STORAGE_KEY_CACHE, STORAGE_AREA)
}

function writeCache(storage, avatars) {
  return storage.write(STORAGE_KEY_CACHE, {
    version: CACHE_SCHEMA_VERSION,
    updatedAt: Date.now(),
    avatars,
  }, STORAGE_AREA)
}

async function readFavoriteAvatarUrls(storage) {
  const rawData = await storage.read(
    STORAGE_KEY_FAVORITE_FANFOUERS,
    STORAGE_AREA_FAVORITE_FANFOUERS,
  )
  const favoriteAvatarUrls = Array.isArray(rawData)
    ? rawData.map(item => item?.avatarUrl)
    : []

  return dedupeAndNormalize(favoriteAvatarUrls)
}

function resolveLayout(avatarCount) {
  if (avatarCount <= 110) {
    return { tileSize: 72, tileGap: 8 }
  }

  if (avatarCount <= 180) {
    return { tileSize: 64, tileGap: 6 }
  }

  if (avatarCount <= 280) {
    return { tileSize: 56, tileGap: 5 }
  }

  if (avatarCount <= 420) {
    return { tileSize: 52, tileGap: 4 }
  }

  return { tileSize: 48, tileGap: 3 }
}

function getBackgroundPreset(rawPresetId) {
  const presetId = clamp(
    toNumberOrDefault(rawPresetId, DEFAULT_BACKGROUND_PRESET),
    1,
    BACKGROUND_PRESETS.length,
  )

  return BACKGROUND_PRESETS[presetId - 1]
}

function prioritizeFavorites({ avatars, favoriteAvatarUrls }) {
  if (!favoriteAvatarUrls.length) return avatars

  const avatarByKey = new Map(
    avatars.map(url => [ createAvatarKey(url), url ]),
  )
  const favoriteKeys = favoriteAvatarUrls.map(createAvatarKey)
  const used = new Set()
  const favoritesFirst = []

  for (const key of favoriteKeys) {
    const avatarUrl = avatarByKey.get(key)
    if (!avatarUrl || used.has(key)) continue

    favoritesFirst.push(avatarUrl)
    used.add(key)
  }

  const rest = avatars.filter(url => !used.has(createAvatarKey(url)))

  return [ ...favoritesFirst, ...rest ]
}

function getRenderAvatarUrls({
  avatars,
  favoriteAvatarUrls,
  prioritizeFavoritesFirst,
}) {
  if (!avatars.length) return []

  if (prioritizeFavoritesFirst) {
    const prioritized = prioritizeFavorites({ avatars, favoriteAvatarUrls })
    const favoriteKeys = new Set(
      favoriteAvatarUrls.map(createAvatarKey),
    )
    const favorites = []
    const normal = []

    for (const url of prioritized) {
      const key = createAvatarKey(url)

      if (favoriteKeys.has(key)) {
        favorites.push(url)
      } else {
        normal.push(url)
      }
    }

    return [ ...favorites, ...shuffle([ ...normal ]) ]
      .slice(0, MAX_RENDER_AVATARS)
  }

  return shuffle([ ...avatars ])
    .slice(0, MAX_RENDER_AVATARS)
}

function resolveSidePaneWidths() {
  const centerContainer = document.querySelector('#container')

  if (!centerContainer) {
    const fallbackWidth = Math.floor(window.innerWidth * 0.22)
    return {
      left: Math.max(0, fallbackWidth - LEFT_PANE_CENTER_GUTTER),
      right: Math.max(0, fallbackWidth - RIGHT_PANE_CENTER_GUTTER),
    }
  }

  const rect = centerContainer.getBoundingClientRect()
  const left = Math.max(0, Math.floor(rect.left) - LEFT_PANE_CENTER_GUTTER)
  const right = Math.max(0, Math.floor(window.innerWidth - rect.right) - RIGHT_PANE_CENTER_GUTTER)

  return { left, right }
}

function getPaneCapacity({ paneWidth, tileSize, tileGap }) {
  if (paneWidth < tileSize) return 0

  const columns = Math.max(1, Math.floor((paneWidth + tileGap) / (tileSize + tileGap)))
  const rows = Math.max(1, Math.floor((window.innerHeight + tileGap) / (tileSize + tileGap)))

  return columns * rows
}

function splitUrlsForPanes({ urls, leftCapacity, rightCapacity }) {
  const leftUrls = []
  const rightUrls = []

  for (const url of urls) {
    const shouldPushLeft = leftUrls.length <= rightUrls.length

    if (shouldPushLeft && leftUrls.length < leftCapacity) {
      leftUrls.push(url)
      continue
    }

    if (rightUrls.length < rightCapacity) {
      rightUrls.push(url)
      continue
    }

    if (leftUrls.length < leftCapacity) {
      leftUrls.push(url)
      continue
    }

    break
  }

  return { leftUrls, rightUrls }
}

function removeWallpaperContainer() {
  const existing = document.getElementById(CONTAINER_ID)

  if (existing) {
    existing.remove()
  }

  document.body.classList.remove(BODY_CLASSNAME)
  document.body.style.removeProperty('--sf-avatar-wallpaper-bg')
}

function renderWallpaper({
  avatars,
  favoriteAvatarUrls,
  opacity,
  backgroundPreset,
  prioritizeFavoritesFirst,
  fillBlueOnlyInGaps,
}) {
  removeWallpaperContainer()

  if (!avatars.length) return

  const renderUrls = getRenderAvatarUrls({
    avatars,
    favoriteAvatarUrls,
    prioritizeFavoritesFirst,
  })
  if (!renderUrls.length) return
  const { tileSize, tileGap } = resolveLayout(renderUrls.length)
  const { left: leftPaneWidth, right: rightPaneWidth } = resolveSidePaneWidths()
  const leftPaneCapacity = getPaneCapacity({
    paneWidth: leftPaneWidth,
    tileSize,
    tileGap,
  })
  const rightPaneCapacity = getPaneCapacity({
    paneWidth: rightPaneWidth,
    tileSize,
    tileGap,
  })
  const { leftUrls, rightUrls } = splitUrlsForPanes({
    urls: renderUrls,
    leftCapacity: leftPaneCapacity,
    rightCapacity: rightPaneCapacity,
  })

  if (!leftUrls.length && !rightUrls.length) return

  const container = document.createElement('div')
  const leftPane = document.createElement('div')
  const rightPane = document.createElement('div')

  container.id = CONTAINER_ID
  container.style.opacity = fillBlueOnlyInGaps
    ? '1'
    : String(opacity)
  container.style.setProperty('--sf-avatar-wallpaper-tile-size', `${tileSize}px`)
  container.style.setProperty('--sf-avatar-wallpaper-tile-gap', `${tileGap}px`)
  container.style.setProperty(
    '--sf-avatar-wallpaper-pane-bg',
    fillBlueOnlyInGaps
      ? backgroundPreset.background
      : 'transparent',
  )
  container.style.setProperty(
    '--sf-avatar-wallpaper-pane-bg-opacity',
    fillBlueOnlyInGaps
      ? String(opacity)
      : '0',
  )
  leftPane.id = PANE_LEFT_ID
  leftPane.className = 'sf-avatar-wallpaper-pane'
  leftPane.style.width = `${leftPaneWidth}px`
  rightPane.id = PANE_RIGHT_ID
  rightPane.className = 'sf-avatar-wallpaper-pane'
  rightPane.style.width = `${rightPaneWidth}px`

  for (const [ pane, urls ] of [
    [ leftPane, leftUrls ],
    [ rightPane, rightUrls ],
  ]) {
    const fragment = document.createDocumentFragment()

    for (const url of urls) {
      const tile = document.createElement('span')
      tile.className = 'sf-avatar-wallpaper-tile'
      tile.style.backgroundImage = `url("${url}")`
      fragment.append(tile)
    }

    pane.append(fragment)
  }

  container.append(leftPane, rightPane)
  if (fillBlueOnlyInGaps) {
    document.body.style.removeProperty('--sf-avatar-wallpaper-bg')
  } else {
    document.body.style.setProperty('--sf-avatar-wallpaper-bg', backgroundPreset.background)
  }
  document.body.prepend(container)
  document.body.classList.add(BODY_CLASSNAME)
}

export default context => {
  const {
    requireModules,
    readOptionValue,
  } = context
  const {
    storage,
    fanfouOAuth,
    proxiedFetch,
  } = requireModules([ 'storage', 'fanfouOAuth', 'proxiedFetch' ])

  let activeAvatarUrls = []
  let activeFavoriteAvatarUrls = []
  let activeOpacity = DEFAULT_OPACITY
  let activeBackgroundPreset = BACKGROUND_PRESETS[DEFAULT_BACKGROUND_PRESET - 1]
  let activePrioritizeFavoritesFirst = DEFAULT_PRIORITIZE_FAVORITES
  let activeFillBlueOnlyInGaps = DEFAULT_FILL_GAPS_ONLY
  let resizeTimer = null

  async function fetchAvatarUrls() {
    try {
      const avatarsFromApi = await fetchAvatarUrlsFromApi(fanfouOAuth)

      if (avatarsFromApi.length) {
        return avatarsFromApi
      }
    } catch (error) {
      // OAuth 未配置或请求失败时，回退到页面抓取方案
    }

    return fetchAvatarUrlsFromWebPages(proxiedFetch)
  }

  async function ensureAvatarCache() {
    const refreshIntervalDays = clamp(
      toNumberOrDefault(readOptionValue('fetchIntervalDays'), DEFAULT_REFRESH_INTERVAL_DAYS),
      1,
      30,
    )
    const cache = await readCache(storage)

    if (isCacheFresh(cache, refreshIntervalDays)) {
      return cache.avatars
    }

    const fetchedUrls = await fetchAvatarUrls()

    if (fetchedUrls.length) {
      await writeCache(storage, fetchedUrls)
      return fetchedUrls
    }

    return Array.isArray(cache?.avatars)
      ? cache.avatars
      : []
  }

  function renderUsingActiveState() {
    renderWallpaper({
      avatars: activeAvatarUrls,
      favoriteAvatarUrls: activeFavoriteAvatarUrls,
      opacity: activeOpacity,
      backgroundPreset: activeBackgroundPreset,
      prioritizeFavoritesFirst: activePrioritizeFavoritesFirst,
      fillBlueOnlyInGaps: activeFillBlueOnlyInGaps,
    })
  }

  async function initWallpaper() {
    activeOpacity = clamp(
      toNumberOrDefault(readOptionValue('opacity'), DEFAULT_OPACITY),
      0.08,
      0.65,
    )
    activeBackgroundPreset = getBackgroundPreset(
      readOptionValue('backgroundPreset'),
    )
    activePrioritizeFavoritesFirst = readOptionValue('prioritizeFavoriteFanfouers') !== false
    activeFillBlueOnlyInGaps = readOptionValue('fillBlueOnlyInGaps') !== false
    activeAvatarUrls = await ensureAvatarCache()
    activeFavoriteAvatarUrls = await readFavoriteAvatarUrls(storage)

    renderUsingActiveState()
  }

  function handleResize() {
    if (!activeAvatarUrls.length) return

    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }

    resizeTimer = setTimeout(() => {
      renderUsingActiveState()
      resizeTimer = null
    }, 180)
  }

  return {
    applyWhen: () => isTimelinePage(),

    async onLoad() {
      await initWallpaper()
      window.addEventListener('resize', handleResize)
    },

    onSettingsChange() {
      initWallpaper()
    },

    onUnload() {
      window.removeEventListener('resize', handleResize)
      if (resizeTimer) {
        clearTimeout(resizeTimer)
        resizeTimer = null
      }
      removeWallpaperContainer()
    },
  }
}
