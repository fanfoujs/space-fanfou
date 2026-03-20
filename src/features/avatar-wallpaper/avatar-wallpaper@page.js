import parseHTML from '@libs/parseHTML'
import getLoggedInUserId from '@libs/getLoggedInUserId'
import { isTimelinePage, isStatusPage } from '@libs/pageDetect'

const STORAGE_KEY_CACHE = 'avatar-wallpaper/cache'
const STORAGE_AREA = 'local'
const STORAGE_KEY_FAVORITE_FANFOUERS = 'favorite-fanfouers/friendsData'
const STORAGE_AREA_FAVORITE_FANFOUERS = 'sync'
const STORAGE_KEY_AUTOCOMPLETE_FRIENDS_LIST = 'friends-list'
const STORAGE_AREA_AUTOCOMPLETE_FRIENDS_LIST = 'session'
const STORAGE_KEY_MATCH3_TRADITIONAL_MINIMIZED = 'avatar-wallpaper/match3TraditionalMinimized'
// Bump the cache schema so existing installs refetch avatar data after
// merging the avatar-wallpaper branch into the main worktree.
const CACHE_SCHEMA_VERSION = 2
const CONTAINER_ID = 'sf-avatar-wallpaper'
const PANE_LEFT_ID = 'sf-avatar-wallpaper-pane-left'
const PANE_RIGHT_ID = 'sf-avatar-wallpaper-pane-right'
const BODY_CLASSNAME = 'sf-avatar-wallpaper-enabled'
const DEFAULT_OPACITY = 0.22
const DEFAULT_BACKGROUND_PRESET = 2
const DEFAULT_PRIORITIZE_FAVORITES = true
const DEFAULT_FILL_GAPS_ONLY = true
const DEFAULT_MATCH3_MODE = false
const DEFAULT_REFRESH_INTERVAL_DAYS = 7
const API_PAGE_SIZE = 100
const MAX_API_PAGES = 8
const MAX_WEB_PAGES = 8
const MAX_RENDER_AVATARS = API_PAGE_SIZE * MAX_API_PAGES
const LEFT_PANE_CENTER_GUTTER = 14
const RIGHT_PANE_CENTER_GUTTER = 14
const NORMAL_TILE_LAYOUTS = [ {
  tileSize: 72,
  tileGap: 8,
}, {
  tileSize: 64,
  tileGap: 6,
}, {
  tileSize: 56,
  tileGap: 5,
}, {
  tileSize: 52,
  tileGap: 4,
}, {
  tileSize: 48,
  tileGap: 3,
}, {
  tileSize: 44,
  tileGap: 3,
}, {
  tileSize: 40,
  tileGap: 3,
}, {
  tileSize: 36,
  tileGap: 2,
}, {
  tileSize: 32,
  tileGap: 2,
}, {
  tileSize: 28,
  tileGap: 2,
}, {
  tileSize: 24,
  tileGap: 1,
}, {
  tileSize: 22,
  tileGap: 1,
}, {
  tileSize: 20,
  tileGap: 1,
}, {
  tileSize: 18,
  tileGap: 1,
} ]
const SHEEP_MIN_TYPE_COUNT = 3
const SHEEP_TRAY_LIMIT = 7
const SHEEP_STACK_OVERLAP_PX = 22
const SHEEP_LAYER_OFFSET_PX = 5
const SHEEP_HISTORY_LIMIT = 40
const SHEEP_TILE_HEIGHT_RATIO = 1.32
const SHEEP_TILE_AVATAR_INSET_SIDE_RATIO = 0.12
const SHEEP_TILE_AVATAR_INSET_TOP_RATIO = 0.12
const SHEEP_TILE_AVATAR_INSET_BOTTOM_RATIO = 0.18
const SHEEP_FIXED_TRIPLE_GROUP_COUNTS = [ 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3 ]
const SHEEP_FIXED_TOTAL_TILES = 126
const SHEEP_TRADITIONAL_TARGET_TYPE_COUNT = 15
const SHEEP_TRADITIONAL_TRIPLE_GROUP_COUNTS = new Array(SHEEP_TRADITIONAL_TARGET_TYPE_COUNT).fill(3)
const SHEEP_TRADITIONAL_TOTAL_TILES = 135
const SHEEP_TRADITIONAL_INITIAL_WINDOW_COUNT = 25
const SHEEP_TRADITIONAL_OPENING_SAFE_TURNS = 10
const SHEEP_TRADITIONAL_OPENING_REQUIRED_TRIPLES = 2
const SHEEP_TRADITIONAL_OPENING_MAX_DEAL_ATTEMPTS = 120
const SHEEP_REGION_CLUSTER_COUNT = 3
const SHEEP_REGION_A_LAYER_COUNTS = [ 5, 5, 4 ]
const SHEEP_REGION_B_LAYER_COUNTS = [ 7, 6, 6, 5, 4 ]
const SHEEP_REGION_SIDE_PADDING = 8
const SHEEP_REGION_TOP_PADDING = 18
const SHEEP_REGION_BOTTOM_PADDING = 126
const SHEEP_REGION_MIN_GAP_PX = 16
const SHEEP_REGION_CLUSTER_INSET_A = [ 12, 0, 14 ]
const SHEEP_REGION_CLUSTER_INSET_B = [ 16, 2, 10 ]
const SHEEP_STACK_PREVIEW_COUNT = 2
const SHEEP_STACK_PREVIEW_OFFSET_PX = 6
const SHEEP_OPENING_SAFE_TURNS = 12
const SHEEP_OPENING_REQUIRED_TRIPLES = 3
const SHEEP_OPENING_MAX_DEAL_ATTEMPTS = 80
const SHEEP_AUTO_SHUFFLE_LOOKAHEAD_TURNS = 5
const SHEEP_AUTO_SHUFFLE_MAX_ATTEMPTS = 4
const SHEEP_AUTO_SHUFFLE_NOTICE_MS = 1600
const SHEEP_STATUS_EFFECT_DURATION_MS = 980
const SHEEP_TRADITIONAL_MAIN_LAYER_TEMPLATES = [ {
  rowCounts: [ 1, 3, 5, 4, 2 ],
  rowOffsets: [ 0, 0, 0, 0.25, 0.55 ],
  xOffset: 0,
  yOffset: 0,
  baseDepth: 1,
}, {
  rowCounts: [ 2, 4, 5, 4, 2 ],
  rowOffsets: [ -0.35, -0.15, 0, 0.15, 0.42 ],
  xOffset: -0.18,
  yOffset: 1,
  baseDepth: 1,
}, {
  rowCounts: [ 2, 4, 5, 4, 2 ],
  rowOffsets: [ 0.25, 0.12, 0, -0.12, -0.32 ],
  xOffset: 0.2,
  yOffset: 2,
  baseDepth: 1,
}, {
  rowCounts: [ 1, 3, 4, 3, 1 ],
  rowOffsets: [ 0.15, 0.1, 0.2, 0.35, 0.55 ],
  xOffset: -0.05,
  yOffset: 3,
  baseDepth: 2,
} ]
const SHEEP_TRADITIONAL_INDEPENDENT_STACKS = [ {
  pileId: 'traditional-independent-top-left',
  x: -1.85,
  y: 0,
  depth: 2,
}, {
  pileId: 'traditional-independent-top-right',
  x: 1.85,
  y: 0,
  depth: 2,
}, {
  pileId: 'traditional-independent-mid-left',
  x: -3.05,
  y: 2.85,
  depth: 2,
}, {
  pileId: 'traditional-independent-mid-right',
  x: 3.05,
  y: 2.85,
  depth: 2,
}, {
  pileId: 'traditional-independent-bottom-left',
  x: -1.45,
  y: 6.65,
  depth: 3,
}, {
  pileId: 'traditional-independent-bottom-right',
  x: 1.45,
  y: 6.65,
  depth: 3,
} ]
const SHEEP_TRADITIONAL_SIDE_STACKS = [ {
  pileId: 'traditional-side-stack-left',
  x: -4.75,
  y: 4.45,
  depth: 13,
}, {
  pileId: 'traditional-side-stack-right',
  x: 4.75,
  y: 4.45,
  depth: 13,
} ]
const SHEEP_TRADITIONAL_BLIND_BOX_STACKS = [ {
  pileId: 'traditional-blind-box-left',
  x: -2.55,
  y: 8.45,
  depth: 9,
}, {
  pileId: 'traditional-blind-box-right',
  x: 2.55,
  y: 8.45,
  depth: 9,
} ]
const SHEEP_TRADITIONAL_GLYPH_TEXT = '饭否'
const SHEEP_TRADITIONAL_GLYPH_GRID_ROWS = 8
const SHEEP_TRADITIONAL_GLYPH_GRID_COLUMNS = 16
const SHEEP_TRADITIONAL_GLYPH_CHAR_COLUMNS = 7
const SHEEP_TRADITIONAL_GLYPH_CHAR_GAP_COLUMNS = 2
const SHEEP_TRADITIONAL_GLYPH_LEFT_MASK_ROWS = [ '..#....',
  '.##....',
  '.#.##..',
  '.##.#..',
  '.#.###.',
  '.#..##.',
  '.#.##..',
  '.......' ]
const SHEEP_TRADITIONAL_GLYPH_RIGHT_MASK_ROWS = [ '####...',
  '.##....',
  '####...',
  '.###...',
  '.#.#...',
  '.###...',
  '.......',
  '.......' ]
const SHEEP_TRADITIONAL_GLYPH_VISIBLE_SLOT_COUNT = 37
const SHEEP_TRADITIONAL_GLYPH_MID_SUPPORT_COUNT = 24
const SHEEP_TRADITIONAL_GLYPH_BACK_SUPPORT_COUNT = 18
const SHEEP_TRADITIONAL_GLYPH_SIDE_STACK_DEPTH = 14
const SHEEP_TRADITIONAL_GLYPH_BLIND_BOX_DEPTH = 14
const SHEEP_TRADITIONAL_GLYPH_X_STEP_RATIO = 0.92
const SHEEP_TRADITIONAL_GLYPH_Y_STEP_RATIO = 0.82
const SHEEP_TRADITIONAL_GLYPH_SUPPORT_OFFSET_X = 3
const SHEEP_TRADITIONAL_GLYPH_SUPPORT_OFFSET_Y = 4
const SHEEP_TRADITIONAL_MIN_TILE_WIDTH = 30
const SHEEP_TRADITIONAL_MAX_TILE_WIDTH = 72
const SHEEP_TRADITIONAL_STAGE_PADDING_X = 24
const SHEEP_TRADITIONAL_STAGE_PADDING_TOP = 24
const SHEEP_TRADITIONAL_STAGE_PADDING_BOTTOM = 20
const SHEEP_TRADITIONAL_STAGE_HUD_HEIGHT = 174
const SHEEP_TRADITIONAL_STAGE_HUD_GAP = 18
const SHEEP_STATUS_PLAYING = 'playing'
const SHEEP_STATUS_FAILED = 'failed'
const SHEEP_STATUS_CLEARED = 'cleared'
let cachedTraditionalGlyphCoverageCells = null
const AVATAR_FRAME_CLASSES = [
  'sf-avatar-frame-1',
  'sf-avatar-frame-2',
  'sf-avatar-frame-3',
  'sf-avatar-frame-4',
  'sf-avatar-frame-5',
]
const AVATAR_FRAME_GOLD_CLASS = 'sf-avatar-frame-gold'
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

function sumNumbers(numbers) {
  return numbers.reduce((sum, number) => sum + number, 0)
}

function compareNumberArrays(leftNumbers, rightNumbers) {
  const maxLength = Math.max(leftNumbers.length, rightNumbers.length)

  for (const index of Array.from({ length: maxLength }, (_, index_) => index_)) {
    const leftValue = leftNumbers[index] || 0
    const rightValue = rightNumbers[index] || 0

    if (leftValue !== rightValue) {
      return leftValue - rightValue
    }
  }

  return 0
}

function getSheepRegionLayerCounts(region) {
  return region === 'a'
    ? SHEEP_REGION_A_LAYER_COUNTS
    : SHEEP_REGION_B_LAYER_COUNTS
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

function deterministicUnit(...seedParts) {
  const seed = seedParts.reduce(
    (accumulator, value, index) => accumulator + value * (index + 1) * 97.531,
    0,
  )
  const raw = Math.sin(seed) * 10000

  return raw - Math.floor(raw)
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

function readTraditionalMatch3MinimizedState() {
  try {
    return sessionStorage.getItem(STORAGE_KEY_MATCH3_TRADITIONAL_MINIMIZED) === '1'
  } catch (error) {
    return false
  }
}

function writeTraditionalMatch3MinimizedState(minimized) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY_MATCH3_TRADITIONAL_MINIMIZED,
      minimized ? '1' : '0',
    )
  } catch (error) {
    // 忽略 sessionStorage 不可用场景，避免影响头像墙主流程
  }
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
        count: API_PAGE_SIZE,
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

    if (responseJSON.length < API_PAGE_SIZE) {
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

function getAutocompleteFriendsListStorageKey() {
  return `${STORAGE_KEY_AUTOCOMPLETE_FRIENDS_LIST}/${getLoggedInUserId()}`
}

function normalizeAvatarUrlsFromFriendsList(friendsList) {
  if (!Array.isArray(friendsList)) return []

  return dedupeAndNormalize(
    friendsList
      .map(item => item?.photo_url || item?.avatarUrl || item?.profile_image_url || '')
      .filter(Boolean),
  )
}

async function readAvatarUrlsFromAutocompleteCache(storage) {
  const cachedValue = await storage.read(
    getAutocompleteFriendsListStorageKey(),
    STORAGE_AREA_AUTOCOMPLETE_FRIENDS_LIST,
  ) || {}

  return normalizeAvatarUrlsFromFriendsList(cachedValue.friendsList)
}

async function fetchAvatarUrlsFromAutocompleteEndpoint() {
  try {
    const response = await fetch('/home.ac_friends')
    if (!response.ok) return []

    const responseJSON = await response.json()

    return normalizeAvatarUrlsFromFriendsList(responseJSON)
  } catch {
    return []
  }
}

function resolveLayout(avatarCount) {
  if (avatarCount <= 110) {
    return NORMAL_TILE_LAYOUTS[0]
  }

  if (avatarCount <= 180) {
    return NORMAL_TILE_LAYOUTS[1]
  }

  if (avatarCount <= 280) {
    return NORMAL_TILE_LAYOUTS[2]
  }

  if (avatarCount <= 420) {
    return NORMAL_TILE_LAYOUTS[3]
  }

  return NORMAL_TILE_LAYOUTS[4]
}

function getNormalLayoutCandidates(avatarCount) {
  const defaultLayout = resolveLayout(avatarCount)
  const defaultIndex = NORMAL_TILE_LAYOUTS.findIndex(
    layout => layout.tileSize === defaultLayout.tileSize && layout.tileGap === defaultLayout.tileGap,
  )

  return NORMAL_TILE_LAYOUTS.slice(Math.max(0, defaultIndex))
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
    const fallbackWidth = Math.floor(document.documentElement.clientWidth * 0.22)
    const fallbackPaneWidth = Math.max(0, fallbackWidth - LEFT_PANE_CENTER_GUTTER)
    return {
      left: fallbackPaneWidth,
      right: fallbackPaneWidth,
    }
  }

  const rect = centerContainer.getBoundingClientRect()
  const viewportWidth = document.documentElement.clientWidth
  const left = Math.max(0, Math.floor(rect.left) - LEFT_PANE_CENTER_GUTTER)
  const right = Math.max(0, Math.floor(viewportWidth - rect.right) - RIGHT_PANE_CENTER_GUTTER)

  return { left, right }
}

function getPaneCapacity({ paneWidth, tileSize, tileGap }) {
  const usableWidth = paneWidth - 16
  if (usableWidth < tileSize) return { capacity: 0, columns: 0, rows: 0 }

  const columns = Math.max(1, Math.floor((usableWidth + tileGap) / (tileSize + tileGap)))
  const usableHeight = Math.max(0, window.innerHeight - 28)
  const rows = Math.max(1, Math.floor((usableHeight + tileGap) / (tileSize + tileGap)))

  return { capacity: columns * rows, columns, rows }
}

function resolveNormalPaneLayout({
  avatarCount,
  leftPaneWidth,
  rightPaneWidth,
}) {
  const candidates = getNormalLayoutCandidates(avatarCount)
  let fallback = null

  for (const candidate of candidates) {
    const leftPaneMetrics = getPaneCapacity({
      paneWidth: leftPaneWidth,
      tileSize: candidate.tileSize,
      tileGap: candidate.tileGap,
    })
    const rightPaneMetrics = getPaneCapacity({
      paneWidth: rightPaneWidth,
      tileSize: candidate.tileSize,
      tileGap: candidate.tileGap,
    })

    if (!leftPaneMetrics.capacity && !rightPaneMetrics.capacity) {
      continue
    }

    const resolved = {
      ...candidate,
      leftPaneMetrics,
      rightPaneMetrics,
      totalCapacity: leftPaneMetrics.capacity + rightPaneMetrics.capacity,
    }
    fallback = resolved

    if (resolved.totalCapacity >= avatarCount) {
      return resolved
    }
  }

  return fallback
}

function countPartialRow(itemCount, columnCount) {
  return itemCount > 0 && columnCount > 0 && itemCount % columnCount
    ? 1
    : 0
}

function countTrailingEmptyCells(itemCount, columnCount) {
  if (!itemCount || columnCount <= 0) return 0

  return (columnCount - (itemCount % columnCount || columnCount)) % columnCount
}

function isBetterPaneDistribution(left, right) {
  return (
    left.partialRowCount < right.partialRowCount
    || (
      left.partialRowCount === right.partialRowCount
      && left.trailingEmptyCellCount < right.trailingEmptyCellCount
    )
    || (
      left.partialRowCount === right.partialRowCount
      && left.trailingEmptyCellCount === right.trailingEmptyCellCount
      && left.rowBalance < right.rowBalance
    )
    || (
      left.partialRowCount === right.partialRowCount
      && left.trailingEmptyCellCount === right.trailingEmptyCellCount
      && left.rowBalance === right.rowBalance
      && left.itemBalance < right.itemBalance
    )
  )
}

function splitItemsForPanes({
  items,
  leftCapacity,
  rightCapacity,
  leftColumns,
  rightColumns,
}) {
  const totalCount = Math.min(items.length, leftCapacity + rightCapacity)
  if (!totalCount) {
    return {
      leftItems: [],
      rightItems: [],
    }
  }

  const minimumLeftCount = Math.max(0, totalCount - rightCapacity)
  const maximumLeftCount = Math.min(leftCapacity, totalCount)
  let bestDistribution = null

  for (let leftCount = minimumLeftCount; leftCount <= maximumLeftCount; leftCount++) {
    const rightCount = totalCount - leftCount
    const leftRowCount = leftColumns > 0
      ? Math.ceil(leftCount / leftColumns)
      : 0
    const rightRowCount = rightColumns > 0
      ? Math.ceil(rightCount / rightColumns)
      : 0
    const candidate = {
      leftCount,
      rightCount,
      partialRowCount:
        countPartialRow(leftCount, leftColumns)
        + countPartialRow(rightCount, rightColumns),
      trailingEmptyCellCount:
        countTrailingEmptyCells(leftCount, leftColumns)
        + countTrailingEmptyCells(rightCount, rightColumns),
      rowBalance: Math.abs(leftRowCount - rightRowCount),
      itemBalance: Math.abs(leftCount - rightCount),
    }

    if (!bestDistribution || isBetterPaneDistribution(candidate, bestDistribution)) {
      bestDistribution = candidate
    }
  }

  const leftItems = items.slice(0, bestDistribution.leftCount)
  const rightItems = items.slice(bestDistribution.leftCount, totalCount)

  return { leftItems, rightItems }
}

function pickRandomItem(items) {
  if (!items.length) return ''

  return items[Math.floor(Math.random() * items.length)]
}

function resolveSheepTileMetrics(tileSize) {
  return {
    tileWidth: tileSize,
    tileHeight: Math.round(tileSize * SHEEP_TILE_HEIGHT_RATIO),
    avatarInsetX: Math.max(6, Math.round(tileSize * SHEEP_TILE_AVATAR_INSET_SIDE_RATIO)),
    avatarInsetTop: Math.max(6, Math.round(tileSize * SHEEP_TILE_AVATAR_INSET_TOP_RATIO)),
    avatarInsetBottom: Math.max(8, Math.round(tileSize * SHEEP_TILE_AVATAR_INSET_BOTTOM_RATIO)),
  }
}

function createTraditionalGlyphCellKey({
  row,
  column,
}) {
  return `${row}:${column}`
}

function computeTraditionalGlyphNeighborScore(cell, cellMap) {
  let score = 0

  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
      if (!rowOffset && !columnOffset) continue

      const neighbor = cellMap.get(createTraditionalGlyphCellKey({
        row: cell.row + rowOffset,
        column: cell.column + columnOffset,
      }))
      if (!neighbor) continue

      score += neighbor.coverage * (
        rowOffset === 0 || columnOffset === 0
          ? 1.2
          : 0.8
      )
    }
  }

  return score
}

function selectTraditionalGlyphCells(cells, targetCount) {
  const cellMap = new Map(
    cells.map(cell => [
      createTraditionalGlyphCellKey(cell),
      cell,
    ]),
  )

  return [ ...cells ]
    .sort((left, right) => {
      const leftScore = left.coverage * 2.2 + computeTraditionalGlyphNeighborScore(left, cellMap) * 0.18
      const rightScore = right.coverage * 2.2 + computeTraditionalGlyphNeighborScore(right, cellMap) * 0.18
      if (leftScore !== rightScore) return rightScore - leftScore
      if (left.coverage !== right.coverage) return right.coverage - left.coverage
      if (left.row !== right.row) return left.row - right.row
      return left.column - right.column
    })
    .slice(0, targetCount)
}

function resolveTraditionalGlyphSplitColumn(cells) {
  const uniqueColumns = [ ...new Set(cells.map(cell => cell.column)) ]
    .sort((left, right) => left - right)

  if (uniqueColumns.length <= 1) {
    return uniqueColumns[0] || 0
  }

  let splitColumn = (uniqueColumns[0] + uniqueColumns[uniqueColumns.length - 1]) / 2
  let maxGap = -Infinity

  for (let index = 0; index < uniqueColumns.length - 1; index++) {
    const current = uniqueColumns[index]
    const next = uniqueColumns[index + 1]
    const gap = next - current

    if (gap > maxGap) {
      maxGap = gap
      splitColumn = current + gap / 2
    }
  }

  return splitColumn
}

function distributeTraditionalGlyphLayerCounts(groups, targetCount) {
  const total = sumNumbers(groups.map(group => group.length))
  if (!total || !targetCount) {
    return groups.map(() => 0)
  }

  const allocations = groups.map(group => Math.min(
    group.length,
    Math.floor(targetCount * group.length / total),
  ))
  let allocated = sumNumbers(allocations)

  while (allocated < targetCount) {
    let bestIndex = -1

    for (const [ index, group ] of groups.entries()) {
      if (allocations[index] >= group.length) continue

      if (
        bestIndex < 0
        || group.length - allocations[index] > groups[bestIndex].length - allocations[bestIndex]
      ) {
        bestIndex = index
      }
    }

    if (bestIndex < 0) break
    allocations[bestIndex] += 1
    allocated += 1
  }

  return allocations
}

function rankTraditionalGlyphLayerCells(cells) {
  const cellMap = new Map(
    cells.map(cell => [
      createTraditionalGlyphCellKey(cell),
      cell,
    ]),
  )
  const centerRow = sumNumbers(cells.map(cell => cell.row)) / Math.max(1, cells.length)
  const centerColumn = sumNumbers(cells.map(cell => cell.column)) / Math.max(1, cells.length)

  return [ ...cells ].sort((left, right) => {
    const leftNeighborScore = computeTraditionalGlyphNeighborScore(left, cellMap)
    const rightNeighborScore = computeTraditionalGlyphNeighborScore(right, cellMap)
    if (leftNeighborScore !== rightNeighborScore) return rightNeighborScore - leftNeighborScore

    const leftDistance = Math.abs(left.row - centerRow) + Math.abs(left.column - centerColumn)
    const rightDistance = Math.abs(right.row - centerRow) + Math.abs(right.column - centerColumn)
    if (leftDistance !== rightDistance) return leftDistance - rightDistance

    if (left.row !== right.row) return left.row - right.row
    return left.column - right.column
  })
}

function selectTraditionalGlyphLayerCells(cells, targetCount) {
  const splitColumn = resolveTraditionalGlyphSplitColumn(cells)
  const leftCells = cells.filter(cell => cell.column <= splitColumn)
  const rightCells = cells.filter(cell => cell.column > splitColumn)
  const [ leftCount, rightCount ] = distributeTraditionalGlyphLayerCounts(
    [ leftCells, rightCells ],
    targetCount,
  )

  return [
    ...rankTraditionalGlyphLayerCells(leftCells).slice(0, leftCount),
    ...rankTraditionalGlyphLayerCells(rightCells).slice(0, rightCount),
  ]
}

function createTraditionalGlyphCoverageCells() {
  if (cachedTraditionalGlyphCoverageCells) {
    return cachedTraditionalGlyphCoverageCells.map(cell => ({
      ...cell,
    }))
  }

  if (
    SHEEP_TRADITIONAL_GLYPH_LEFT_MASK_ROWS.length !== SHEEP_TRADITIONAL_GLYPH_GRID_ROWS
    || SHEEP_TRADITIONAL_GLYPH_RIGHT_MASK_ROWS.length !== SHEEP_TRADITIONAL_GLYPH_GRID_ROWS
  ) {
    return []
  }

  const cells = []
  const combinedMaskRows = SHEEP_TRADITIONAL_GLYPH_LEFT_MASK_ROWS.map((maskRow, index) => (
    `${maskRow}${'.'.repeat(SHEEP_TRADITIONAL_GLYPH_CHAR_GAP_COLUMNS)}${SHEEP_TRADITIONAL_GLYPH_RIGHT_MASK_ROWS[index]}`
  ))

  for (const [ row, maskRow ] of combinedMaskRows.entries()) {
    if (
      SHEEP_TRADITIONAL_GLYPH_LEFT_MASK_ROWS[row].length !== SHEEP_TRADITIONAL_GLYPH_CHAR_COLUMNS
      || SHEEP_TRADITIONAL_GLYPH_RIGHT_MASK_ROWS[row].length !== SHEEP_TRADITIONAL_GLYPH_CHAR_COLUMNS
    ) {
      return []
    }

    if (maskRow.length !== SHEEP_TRADITIONAL_GLYPH_GRID_COLUMNS) {
      return []
    }

    for (const [ column, marker ] of [ ...maskRow ].entries()) {
      if (marker !== '#') continue

      cells.push({
        row,
        column,
        coverage: 1,
      })
    }
  }

  cachedTraditionalGlyphCoverageCells = cells.map(cell => ({
    ...cell,
  }))

  return cells
}

function buildTraditionalGlyphMainSlots({
  tileWidth,
  tileHeight,
}) {
  const previewExtent = SHEEP_STACK_PREVIEW_COUNT * SHEEP_STACK_PREVIEW_OFFSET_PX
  const tileFrameWidth = tileWidth + previewExtent
  const tileFrameHeight = tileHeight + previewExtent
  const xStep = Math.round(tileWidth * SHEEP_TRADITIONAL_GLYPH_X_STEP_RATIO)
  const yStep = Math.round(tileHeight * SHEEP_TRADITIONAL_GLYPH_Y_STEP_RATIO)
  const visibleCells = selectTraditionalGlyphCells(
    createTraditionalGlyphCoverageCells(),
    SHEEP_TRADITIONAL_GLYPH_VISIBLE_SLOT_COUNT,
  )
  if (visibleCells.length !== SHEEP_TRADITIONAL_GLYPH_VISIBLE_SLOT_COUNT) return null
  const splitColumn = resolveTraditionalGlyphSplitColumn(visibleCells)

  const midSupportCells = selectTraditionalGlyphLayerCells(
    visibleCells,
    SHEEP_TRADITIONAL_GLYPH_MID_SUPPORT_COUNT,
  )
  const backSupportCells = selectTraditionalGlyphLayerCells(
    midSupportCells,
    SHEEP_TRADITIONAL_GLYPH_BACK_SUPPORT_COUNT,
  )
  const slots = []
  const layerDefinitions = [ {
    pileId: 'traditional-main-glyph-back-support',
    pileIndex: 0,
    layerValue: 5,
    cells: backSupportCells,
  }, {
    pileId: 'traditional-main-glyph-mid-support',
    pileIndex: 1,
    layerValue: 6,
    cells: midSupportCells,
  }, {
    pileId: 'traditional-main-glyph-visible',
    pileIndex: 2,
    layerValue: 7,
    cells: visibleCells,
  } ]

  for (const definition of layerDefinitions) {
    definition.cells.forEach((cell, index) => {
      const supportDepth = Math.max(0, 7 - definition.layerValue)
      const offsetDirectionX = cell.column <= splitColumn
        ? -1
        : 1

      slots.push({
        slotId: `${definition.pileId}-slot-${index}`,
        pileId: definition.pileId,
        pileIndex: definition.pileIndex,
        paneId: 'left',
        region: 'traditional',
        stackKind: 'traditional-main',
        layer: definition.layerValue,
        row: cell.row,
        column: cell.column,
        x: cell.column * xStep + supportDepth * SHEEP_TRADITIONAL_GLYPH_SUPPORT_OFFSET_X * offsetDirectionX,
        y: cell.row * yStep + supportDepth * SHEEP_TRADITIONAL_GLYPH_SUPPORT_OFFSET_Y,
        coveredBySlotIds: [],
        targetDepth: 1,
      })
    })
  }

  const mainBounds = measureTraditionalSheepBoardBounds({
    slots,
    tileFrameWidth,
    tileFrameHeight,
  })

  return {
    slots,
    tileFrameWidth,
    tileFrameHeight,
    mainBounds,
  }
}

function buildLegacyTraditionalSheepSlots({
  tileWidth,
  tileHeight,
}) {
  const previewExtent = SHEEP_STACK_PREVIEW_COUNT * SHEEP_STACK_PREVIEW_OFFSET_PX
  const tileFrameWidth = tileWidth + previewExtent
  const tileFrameHeight = tileHeight + previewExtent
  const horizontalStep = Math.round(tileWidth * 0.78)
  const rowStepY = Math.round(tileHeight * 0.62)
  const layerStepY = Math.round(tileHeight * 0.24)
  const mainStartY = Math.round(tileHeight * 1.35)
  const boardCenterX = 0
  const slots = []

  for (const [ layerIndex, template ] of SHEEP_TRADITIONAL_MAIN_LAYER_TEMPLATES.entries()) {
    createTraditionalRowSlots({
      slots,
      groupId: `traditional-main-layer-${layerIndex}`,
      pileId: `traditional-main-layer-${layerIndex}`,
      pileIndex: layerIndex,
      rowCounts: template.rowCounts,
      rowOffsets: template.rowOffsets,
      centerX: boardCenterX + template.xOffset * horizontalStep,
      startY: mainStartY + template.yOffset * layerStepY,
      xStep: horizontalStep,
      yStep: rowStepY,
      tileWidth,
      stackKind: 'traditional-main',
      layerValue: SHEEP_TRADITIONAL_MAIN_LAYER_TEMPLATES.length - layerIndex + 4,
      rowBase: layerIndex * 10,
      targetDepthResolver: ({ rowIndex }) => (
        resolveTraditionalMainTargetDepth({
          layerIndex,
          rowIndex,
        })
      ),
    })
  }

  SHEEP_TRADITIONAL_INDEPENDENT_STACKS.forEach((stackSpec, index) => {
    createTraditionalSingleStackSlot({
      slots,
      pileId: stackSpec.pileId,
      pileIndex: SHEEP_TRADITIONAL_MAIN_LAYER_TEMPLATES.length + index,
      stackKind: 'traditional-independent',
      x: Math.round(boardCenterX + stackSpec.x * horizontalStep),
      y: Math.round(stackSpec.y * rowStepY),
      depth: stackSpec.depth,
      row: 50 + index,
      layerValue: 4,
    })
  })

  SHEEP_TRADITIONAL_SIDE_STACKS.forEach((stackSpec, index) => {
    createTraditionalSingleStackSlot({
      slots,
      pileId: stackSpec.pileId,
      pileIndex: SHEEP_TRADITIONAL_MAIN_LAYER_TEMPLATES.length + SHEEP_TRADITIONAL_INDEPENDENT_STACKS.length + index,
      stackKind: 'traditional-side-stack',
      x: Math.round(boardCenterX + stackSpec.x * horizontalStep),
      y: Math.round(stackSpec.y * rowStepY),
      depth: stackSpec.depth,
      row: 70 + index,
      layerValue: 2,
    })
  })

  SHEEP_TRADITIONAL_BLIND_BOX_STACKS.forEach((stackSpec, index) => {
    createTraditionalSingleStackSlot({
      slots,
      pileId: stackSpec.pileId,
      pileIndex: (
        SHEEP_TRADITIONAL_MAIN_LAYER_TEMPLATES.length
        + SHEEP_TRADITIONAL_INDEPENDENT_STACKS.length
        + SHEEP_TRADITIONAL_SIDE_STACKS.length
        + index
      ),
      stackKind: 'traditional-blind-box',
      x: Math.round(boardCenterX + stackSpec.x * horizontalStep),
      y: Math.round(stackSpec.y * rowStepY),
      depth: stackSpec.depth,
      row: 90 + index,
      layerValue: 1,
    })
  })

  return {
    slots,
    tileFrameWidth,
    tileFrameHeight,
  }
}

function buildTraditionalSheepSlots({
  tileWidth,
  tileHeight,
}) {
  const glyphLayout = buildTraditionalGlyphMainSlots({
    tileWidth,
    tileHeight,
  })

  if (!glyphLayout) {
    return buildLegacyTraditionalSheepSlots({
      tileWidth,
      tileHeight,
    })
  }

  const {
    slots,
    tileFrameWidth,
    tileFrameHeight,
    mainBounds,
  } = glyphLayout
  const glyphCenterY = mainBounds.minY + mainBounds.boardHeight / 2
  const glyphBottomY = mainBounds.maxY - tileFrameHeight
  const auxiliarySpecs = [ {
    pileId: 'traditional-side-stack-left',
    pileIndex: 3,
    stackKind: 'traditional-side-stack',
    x: Math.round(mainBounds.minX - tileWidth * 2.05),
    y: Math.round(glyphCenterY - tileHeight * 0.48),
    depth: SHEEP_TRADITIONAL_GLYPH_SIDE_STACK_DEPTH,
    row: 90,
    layerValue: 2,
    stackDirectionX: -1,
    stackDirectionY: 0.28,
  }, {
    pileId: 'traditional-side-stack-right',
    pileIndex: 4,
    stackKind: 'traditional-side-stack',
    x: Math.round(mainBounds.maxX + tileWidth * 0.55),
    y: Math.round(glyphCenterY - tileHeight * 0.48),
    depth: SHEEP_TRADITIONAL_GLYPH_SIDE_STACK_DEPTH,
    row: 91,
    layerValue: 2,
    stackDirectionX: 1,
    stackDirectionY: 0.28,
  }, {
    pileId: 'traditional-blind-box-left',
    pileIndex: 5,
    stackKind: 'traditional-blind-box',
    x: Math.round(mainBounds.minX + tileWidth * 0.75),
    y: Math.round(glyphBottomY + tileHeight * 0.82),
    depth: SHEEP_TRADITIONAL_GLYPH_BLIND_BOX_DEPTH,
    row: 92,
    layerValue: 1,
    stackDirectionX: -1,
    stackDirectionY: 0.38,
  }, {
    pileId: 'traditional-blind-box-right',
    pileIndex: 6,
    stackKind: 'traditional-blind-box',
    x: Math.round(mainBounds.maxX - tileFrameWidth - tileWidth * 0.75),
    y: Math.round(glyphBottomY + tileHeight * 0.82),
    depth: SHEEP_TRADITIONAL_GLYPH_BLIND_BOX_DEPTH,
    row: 93,
    layerValue: 1,
    stackDirectionX: 1,
    stackDirectionY: 0.38,
  } ]

  auxiliarySpecs.forEach(spec => {
    createTraditionalSingleStackSlot({
      slots,
      pileId: spec.pileId,
      pileIndex: spec.pileIndex,
      stackKind: spec.stackKind,
      x: spec.x,
      y: spec.y,
      depth: spec.depth,
      row: spec.row,
      layerValue: spec.layerValue,
      stackDirectionX: spec.stackDirectionX,
      stackDirectionY: spec.stackDirectionY,
    })
  })

  return {
    slots,
    tileFrameWidth,
    tileFrameHeight,
  }
}

function measureTraditionalSheepBoardBounds({
  slots,
  tileFrameWidth,
  tileFrameHeight,
}) {
  const minX = Math.min(...slots.map(slot => slot.x))
  const minY = Math.min(...slots.map(slot => slot.y))
  const maxX = Math.max(...slots.map(slot => slot.x + tileFrameWidth))
  const maxY = Math.max(...slots.map(slot => slot.y + tileFrameHeight))

  return {
    minX,
    minY,
    maxX,
    maxY,
    boardWidth: maxX - minX,
    boardHeight: maxY - minY,
  }
}

function resolveTraditionalSheepTileMetrics() {
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = window.innerHeight
  const preferredTileWidth = clamp(
    Math.round(Math.min(viewportWidth * 0.062, viewportHeight * 0.102)),
    SHEEP_TRADITIONAL_MIN_TILE_WIDTH,
    SHEEP_TRADITIONAL_MAX_TILE_WIDTH,
  )

  for (let tileWidth = preferredTileWidth; tileWidth >= SHEEP_TRADITIONAL_MIN_TILE_WIDTH; tileWidth--) {
    const tileMetrics = resolveSheepTileMetrics(tileWidth)
    const stageLayout = resolveTraditionalSheepStageLayout({
      tileWidth: tileMetrics.tileWidth,
      tileHeight: tileMetrics.tileHeight,
    })
    const {
      boardWidth,
      boardHeight,
    } = measureTraditionalSheepBoardBounds(
      buildTraditionalSheepSlots({
        tileWidth: tileMetrics.tileWidth,
        tileHeight: tileMetrics.tileHeight,
      }),
    )

    if (
      boardWidth <= stageLayout.boardAreaWidth
      && boardHeight <= stageLayout.boardAreaHeight
    ) {
      return tileMetrics
    }
  }

  return resolveSheepTileMetrics(SHEEP_TRADITIONAL_MIN_TILE_WIDTH)
}

function resolveTraditionalSheepStageLayout({
  tileWidth,
  tileHeight,
}) {
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = window.innerHeight
  const previewExtent = SHEEP_STACK_PREVIEW_COUNT * SHEEP_STACK_PREVIEW_OFFSET_PX
  const stageWidth = viewportWidth
  const stageHeight = viewportHeight
  const stageX = 0
  const stageY = 0
  const innerWidth = Math.min(stageWidth - 48, 780)
  const boardX = Math.max(
    SHEEP_TRADITIONAL_STAGE_PADDING_X,
    Math.floor((stageWidth - innerWidth) / 2),
  )
  const boardAreaWidth = Math.max(
    tileWidth + previewExtent,
    innerWidth,
  )
  const boardAreaHeight = Math.max(
    tileHeight + previewExtent,
    stageHeight
      - SHEEP_TRADITIONAL_STAGE_PADDING_TOP
      - SHEEP_TRADITIONAL_STAGE_HUD_GAP
      - SHEEP_TRADITIONAL_STAGE_HUD_HEIGHT
      - SHEEP_TRADITIONAL_STAGE_PADDING_BOTTOM,
  )
  const hudWidth = Math.min(stageWidth - 48, 560)
  const hudX = Math.max(
    SHEEP_TRADITIONAL_STAGE_PADDING_X,
    Math.floor((stageWidth - hudWidth) / 2),
  )

  return {
    stageWidth,
    stageHeight,
    stageX,
    stageY,
    boardAreaWidth,
    boardAreaHeight,
    boardX,
    boardY: SHEEP_TRADITIONAL_STAGE_PADDING_TOP,
    hudX,
    hudY: SHEEP_TRADITIONAL_STAGE_PADDING_TOP + boardAreaHeight + SHEEP_TRADITIONAL_STAGE_HUD_GAP,
    hudWidth,
    hudHeight: SHEEP_TRADITIONAL_STAGE_HUD_HEIGHT,
  }
}

function createTraditionalRowSlots({
  slots,
  groupId,
  pileId,
  pileIndex,
  rowCounts,
  rowOffsets = [],
  centerX,
  startY,
  xStep,
  yStep,
  tileWidth,
  stackKind = 'traditional-main',
  layerValue = 0,
  rowBase = 0,
  targetDepthResolver = () => 1,
}) {
  for (const [ rowIndex, rowSlotCount ] of rowCounts.entries()) {
    const rowWidth = tileWidth + xStep * Math.max(0, rowSlotCount - 1)
    const rowStartX = centerX - rowWidth / 2 + (rowOffsets[rowIndex] || 0) * xStep

    for (const index of Array.from({ length: rowSlotCount }, (_, index_) => index_)) {
      slots.push({
        slotId: `${groupId}-row-${rowIndex}-slot-${index}`,
        pileId,
        pileIndex,
        paneId: 'left',
        region: 'traditional',
        stackKind,
        layer: layerValue,
        row: rowBase + rowIndex,
        column: index,
        x: Math.round(rowStartX + index * xStep),
        y: Math.round(startY + rowIndex * yStep),
        coveredBySlotIds: [],
        targetDepth: targetDepthResolver({
          rowIndex,
          index,
          rowSlotCount,
        }),
      })
    }
  }
}

function createTraditionalSingleStackSlot({
  slots,
  pileId,
  pileIndex,
  stackKind,
  x,
  y,
  depth,
  row,
  layerValue,
  stackDirectionX,
  stackDirectionY,
}) {
  slots.push({
    slotId: `${pileId}-slot-0`,
    pileId,
    pileIndex,
    paneId: 'left',
    region: 'traditional',
    stackKind,
    layer: layerValue,
    row,
    column: 0,
    x,
    y,
    stackDirectionX,
    stackDirectionY,
    coveredBySlotIds: [],
    targetDepth: depth,
  })
}

function resolveTraditionalMainTargetDepth({
  layerIndex,
  rowIndex,
}) {
  const template = SHEEP_TRADITIONAL_MAIN_LAYER_TEMPLATES[layerIndex]
  if (!template) return 1

  let targetDepth = template.baseDepth

  if (layerIndex === 3 && rowIndex === 2) {
    targetDepth += 1
  }

  return targetDepth
}

function assignTraditionalLayers(slots) {
  const normalizedLayerByValue = new Map(
    [ ...new Set(slots.map(slot => slot.layer)) ]
      .sort((left, right) => left - right)
      .map((layer, index) => [ layer, index + 1 ]),
  )

  for (const slot of slots) {
    slot.layer = normalizedLayerByValue.get(slot.layer) || 1
  }
}

function resolveTraditionalCoveredBySlotIds({ slots }) {
  for (const slot of slots) {
    slot.coveredBySlotIds = []
  }
  const byLayer = new Map()

  for (const slot of slots) {
    if (slot.stackKind !== 'traditional-main') continue

    const layerSlots = byLayer.get(slot.layer) || []
    layerSlots.push(slot)
    byLayer.set(slot.layer, layerSlots)
  }

  const layers = [ ...byLayer.keys() ].sort((left, right) => right - left)
  for (const [ index, upperLayer ] of layers.entries()) {
    const lowerLayer = layers[index + 1]
    if (!Number.isFinite(lowerLayer)) continue

    const upperSlots = byLayer.get(upperLayer) || []
    const lowerSlots = byLayer.get(lowerLayer) || []

    for (const upperSlot of upperSlots) {
      for (const lowerSlot of lowerSlots) {
        const overlapWidth = Math.min(
          upperSlot.x + upperSlot.width,
          lowerSlot.x + lowerSlot.width,
        ) - Math.max(upperSlot.x, lowerSlot.x)
        const overlapHeight = Math.min(
          upperSlot.y + upperSlot.height,
          lowerSlot.y + lowerSlot.height,
        ) - Math.max(upperSlot.y, lowerSlot.y)

        if (
          overlapWidth >= upperSlot.width * 0.44
          && overlapHeight >= upperSlot.height * 0.34
        ) {
          lowerSlot.coveredBySlotIds.push(upperSlot.slotId)
        }
      }
    }
  }
}

function createTraditionalSheepBoardLayout({
  tileWidth,
  tileHeight,
}) {
  const {
    slots,
    tileFrameWidth,
    tileFrameHeight,
  } = buildTraditionalSheepSlots({
    tileWidth,
    tileHeight,
  })
  const {
    minX,
    minY,
    boardWidth,
    boardHeight,
  } = measureTraditionalSheepBoardBounds({
    slots,
    tileFrameWidth,
    tileFrameHeight,
  })

  for (const slot of slots) {
    slot.x -= minX
    slot.y -= minY
    slot.width = tileFrameWidth
    slot.height = tileFrameHeight
  }

  assignTraditionalLayers(slots)
  resolveTraditionalCoveredBySlotIds({
    slots,
  })

  return {
    piles: [],
    slots,
    region: 'traditional',
    boardWidth,
    boardHeight,
  }
}

function setMatch3AvatarImage(element, url) {
  element.style.setProperty(
    '--sf-match3-avatar-image',
    `url(${JSON.stringify(url)})`,
  )
}

function createAvatarFrameResolver({
  favoriteAvatarUrls,
  frameClassByAvatarKey,
}) {
  const favoriteKeys = new Set(
    favoriteAvatarUrls.map(createAvatarKey),
  )

  return avatarUrl => {
    const key = createAvatarKey(avatarUrl)
    if (!key) return AVATAR_FRAME_CLASSES[0]

    if (favoriteKeys.has(key)) {
      frameClassByAvatarKey.set(key, AVATAR_FRAME_GOLD_CLASS)
      return AVATAR_FRAME_GOLD_CLASS
    }

    const assigned = frameClassByAvatarKey.get(key)
    if (assigned) return assigned

    const randomFrameClass = pickRandomItem(AVATAR_FRAME_CLASSES)
    frameClassByAvatarKey.set(key, randomFrameClass)

    return randomFrameClass
  }
}

function resolveSheepTripleGroupCounts({
  uniqueAvatarCount,
  targetTripleGroupCounts,
}) {
  if (uniqueAvatarCount < SHEEP_MIN_TYPE_COUNT) return []
  if (uniqueAvatarCount >= targetTripleGroupCounts.length) {
    return [ ...targetTripleGroupCounts ]
  }

  const groupCounts = [ ...targetTripleGroupCounts.slice(0, uniqueAvatarCount) ]
  const remainingCounts = targetTripleGroupCounts.slice(uniqueAvatarCount)

  for (const remainingCount of remainingCounts) {
    let targetIndex = 0

    for (let index = 1; index < groupCounts.length; index++) {
      if (groupCounts[index] < groupCounts[targetIndex]) {
        targetIndex = index
      }
    }

    groupCounts[targetIndex] += remainingCount
  }

  return groupCounts
}

function createSheepTileDeck({
  urls,
  targetTripleGroupCounts = SHEEP_FIXED_TRIPLE_GROUP_COUNTS,
}) {
  const uniqueUrls = dedupeAndNormalize(urls)
  const tripleGroupCounts = resolveSheepTripleGroupCounts({
    uniqueAvatarCount: uniqueUrls.length,
    targetTripleGroupCounts,
  })
  if (!tripleGroupCounts.length) return []

  const typeUrls = shuffle([ ...uniqueUrls ])
    .slice(0, tripleGroupCounts.length)
  if (!typeUrls.length) return []

  const tiles = []
  let tileSerial = 0

  tripleGroupCounts.forEach((tripleGroupCount, typeIndex) => {
    const typeUrl = typeUrls[typeIndex]
    if (!typeUrl) return

    for (let tripleIndex = 0; tripleIndex < tripleGroupCount; tripleIndex++) {
      for (let copy = 0; copy < 3; copy++) {
        tileSerial += 1
        tiles.push({
          tileId: `sf-match3-tile-${tileSerial}`,
          typeIndex,
          typeLabel: String(typeIndex + 1),
          typeClass: `sf-match3-type-${typeIndex + 1}`,
          url: typeUrl,
        })
      }
    }
  })

  if (tiles.length !== sumNumbers(targetTripleGroupCounts) * 3) return []

  return shuffle(tiles)
}

function resolveSheepRegionLayoutMetrics({
  paneWidth,
  paneHeight,
  tileWidth,
  tileHeight,
  region,
}) {
  const previewExtent = SHEEP_STACK_PREVIEW_COUNT * SHEEP_STACK_PREVIEW_OFFSET_PX
  const layerCounts = getSheepRegionLayerCounts(region)
  const maxColumns = Math.max(1, ...layerCounts)
  const layerCount = Math.max(1, layerCounts.length)
  const usableWidth = Math.max(tileWidth, paneWidth - SHEEP_REGION_SIDE_PADDING * 2)
  const usableHeight = Math.max(
    tileHeight,
    paneHeight - SHEEP_REGION_TOP_PADDING - SHEEP_REGION_BOTTOM_PADDING,
  )
  const targetXStep = Math.round(tileWidth * (region === 'a' ? 0.38 : 0.3))
  const maxXStep = Math.max(
    0,
    Math.floor((usableWidth - tileWidth - previewExtent) / Math.max(1, maxColumns - 1)),
  )
  const xStep = clamp(targetXStep, 0, maxXStep)
  const targetYStep = Math.round(tileHeight * (region === 'a' ? 0.28 : 0.22))
  const maxClusterHeight = Math.max(
    tileHeight + previewExtent,
    Math.floor((
      usableHeight - SHEEP_REGION_MIN_GAP_PX * (SHEEP_REGION_CLUSTER_COUNT - 1)
    ) / SHEEP_REGION_CLUSTER_COUNT),
  )
  const maxYStep = Math.max(
    0,
    Math.floor((maxClusterHeight - tileHeight - previewExtent) / Math.max(1, layerCount - 1)),
  )
  const yStep = clamp(targetYStep, 0, maxYStep)
  const clusterBoardWidth = tileWidth + previewExtent + xStep * Math.max(0, maxColumns - 1)
  const clusterBoardHeight = tileHeight + previewExtent + yStep * Math.max(0, layerCount - 1)
  const clusterGap = SHEEP_REGION_CLUSTER_COUNT > 1
    ? Math.max(
      8,
      Math.floor((
        usableHeight - clusterBoardHeight * SHEEP_REGION_CLUSTER_COUNT
      ) / (SHEEP_REGION_CLUSTER_COUNT - 1)),
    )
    : 0
  const totalClustersHeight = clusterBoardHeight * SHEEP_REGION_CLUSTER_COUNT
    + clusterGap * Math.max(0, SHEEP_REGION_CLUSTER_COUNT - 1)
  const startY = SHEEP_REGION_TOP_PADDING + Math.max(
    0,
    Math.floor((usableHeight - totalClustersHeight) / 2),
  )

  return {
    xStep,
    yStep,
    clusterBoardWidth,
    clusterBoardHeight,
    clusterGap,
    startY,
  }
}

function createSheepClusterLayout({
  clusterId,
  tileWidth,
  tileHeight,
  xStep,
  yStep,
  layerCounts,
  seedOffset = 0,
}) {
  const previewExtent = SHEEP_STACK_PREVIEW_COUNT * SHEEP_STACK_PREVIEW_OFFSET_PX
  const maxColumns = Math.max(1, ...layerCounts)
  const topLayerIndex = Math.max(0, layerCounts.length - 1)
  const slots = []
  const slotsByLayer = []

  for (const [ layerIndex, rawLayerSlotCount ] of layerCounts.entries()) {
    const layerSlotCount = Math.max(0, rawLayerSlotCount || 0)
    const columnOffset = (maxColumns - layerSlotCount) / 2
    const row = topLayerIndex - layerIndex
    const layerSlots = []

    for (const index of Array.from({ length: layerSlotCount }, (_, index_) => index_)) {
      const slotId = `${clusterId}-layer-${layerIndex}-slot-${index}`
      const jitterX = Math.round((
        deterministicUnit(layerIndex + 1, index + 1, seedOffset + 17) - 0.5
      ) * SHEEP_LAYER_OFFSET_PX)
      const jitterY = Math.round((
        deterministicUnit(layerIndex + 1, index + 1, seedOffset + 29) - 0.5
      ) * SHEEP_LAYER_OFFSET_PX)
      const column = columnOffset + index
      const slot = {
        slotId,
        pileId: clusterId,
        layer: layerIndex,
        row,
        column,
        x: Math.round(column * xStep + jitterX),
        y: Math.round(row * yStep + jitterY),
        coveredBySlotIds: [],
        targetDepth: 1,
      }

      layerSlots.push(slot)
      slots.push(slot)
    }

    slotsByLayer.push(layerSlots)
  }

  for (const [ layerIndex, currentLayerSlots ] of slotsByLayer.slice(0, -1).entries()) {
    const upperLayerSlots = slotsByLayer[layerIndex + 1]

    for (const slot of currentLayerSlots) {
      slot.coveredBySlotIds = upperLayerSlots
        .filter(upperSlot => (
          Math.abs(upperSlot.x - slot.x) < tileWidth * 0.76
          && upperSlot.y < slot.y
        ))
        .map(upperSlot => upperSlot.slotId)
    }
  }

  return {
    pileId: clusterId,
    slots,
    boardWidth: tileWidth + previewExtent + xStep * Math.max(0, maxColumns - 1),
    boardHeight: tileHeight + previewExtent + yStep * Math.max(0, layerCounts.length - 1),
  }
}

function createSheepPaneLayout({
  paneId,
  paneWidth,
  paneHeight,
  tileWidth,
  tileHeight,
}) {
  const region = paneId === 'left' ? 'a' : 'b'
  const layerCounts = getSheepRegionLayerCounts(region)
  const clusterInsets = region === 'a'
    ? SHEEP_REGION_CLUSTER_INSET_A
    : SHEEP_REGION_CLUSTER_INSET_B
  const layoutMetrics = resolveSheepRegionLayoutMetrics({
    paneWidth,
    paneHeight,
    tileWidth,
    tileHeight,
    region,
  })
  const piles = []
  const slots = []

  for (let pileIndex = 0; pileIndex < SHEEP_REGION_CLUSTER_COUNT; pileIndex++) {
    const pileId = `${paneId}-pile-${pileIndex}`
    const pileLayout = createSheepClusterLayout({
      clusterId: pileId,
      tileWidth,
      tileHeight,
      xStep: layoutMetrics.xStep,
      yStep: layoutMetrics.yStep,
      layerCounts,
      seedOffset: pileIndex + (paneId === 'left' ? 1 : 101),
    })
    if (!pileLayout.slots.length) continue

    const alignedX = paneId === 'left'
      ? Math.max(0, paneWidth - SHEEP_REGION_SIDE_PADDING - pileLayout.boardWidth)
      : SHEEP_REGION_SIDE_PADDING
    const pileInset = clusterInsets[pileIndex] || 0
    const pileX = clamp(
      alignedX + (paneId === 'left' ? -pileInset : pileInset),
      0,
      Math.max(0, paneWidth - pileLayout.boardWidth),
    )
    const pileY = layoutMetrics.startY
      + pileIndex * (layoutMetrics.clusterBoardHeight + layoutMetrics.clusterGap)

    piles.push({
      pileId,
      pileIndex,
      region,
      x: pileX,
      y: pileY,
      width: pileLayout.boardWidth,
      height: pileLayout.boardHeight,
    })

    for (const slot of pileLayout.slots) {
      slots.push({
        ...slot,
        pileId,
        pileIndex,
        region,
        paneId,
        x: pileX + slot.x,
        y: pileY + slot.y,
      })
    }
  }

  return {
    piles,
    slots,
    region,
    boardWidth: paneWidth,
    boardHeight: paneHeight,
  }
}

function createSheepPaneStacks({
  tiles,
  leftLayout,
  rightLayout,
}) {
  const leftStacks = leftLayout.slots.map(slot => ({
    ...slot,
    paneId: 'left',
    tiles: [],
  }))
  const rightStacks = rightLayout.slots.map(slot => ({
    ...slot,
    paneId: 'right',
    tiles: [],
  }))
  const allStacks = [ ...leftStacks, ...rightStacks ]

  if (!allStacks.length || !tiles.length) {
    return { leftStacks, rightStacks }
  }

  const targetTileCount = sumNumbers(
    allStacks.map(stack => stack.targetDepth || 0),
  )
  if (targetTileCount !== tiles.length) {
    return { leftStacks, rightStacks }
  }

  const allocationOrder = shuffle([ ...allStacks ])
  let cursor = 0

  for (const stack of allocationOrder) {
    const depth = stack.targetDepth || 0
    stack.tiles = tiles
      .slice(cursor, cursor + depth)
      .map(tile => ({ ...tile }))
    cursor += depth

    if (stack.tiles.length > 1) {
      shuffle(stack.tiles)
    }
  }

  return { leftStacks, rightStacks }
}

function createPaneStackStates({
  stacks,
  paneId,
  resolveFrameClass,
}) {
  const stackBySlotId = new Map()
  const stackStates = stacks.map((stack, index) => {
    const stackState = {
      stackId: `${paneId}-stack-${index}`,
      slotId: stack.slotId,
      paneId,
      region: stack.region,
      stackKind: stack.stackKind || '',
      pileId: stack.pileId,
      pileIndex: Number.isFinite(stack.pileIndex) ? stack.pileIndex : 0,
      layer: Number.isFinite(stack.layer) ? stack.layer : 0,
      row: Number.isFinite(stack.row) ? stack.row : 0,
      column: Number.isFinite(stack.column) ? stack.column : 0,
      x: stack.x,
      y: stack.y,
      stackDirectionX: Number.isFinite(stack.stackDirectionX) ? stack.stackDirectionX : null,
      stackDirectionY: Number.isFinite(stack.stackDirectionY) ? stack.stackDirectionY : null,
      coveredBySlotIds: [ ...(stack.coveredBySlotIds || []) ],
      coveredByStackIds: [],
      tiles: stack.tiles.map(tile => ({
        ...tile,
        paneId,
        frameClass: resolveFrameClass(tile.url),
      })),
    }

    stackBySlotId.set(stack.slotId, stackState)
    return stackState
  })

  for (const stackState of stackStates) {
    stackState.coveredByStackIds = stackState.coveredBySlotIds
      .map(slotId => stackBySlotId.get(slotId))
      .filter(Boolean)
      .map(item => item.stackId)
  }

  return stackStates
}

function createSheepGameState({
  leftStacks,
  rightStacks,
  resolveFrameClass,
}) {
  const leftPaneStacks = createPaneStackStates({
    stacks: leftStacks,
    paneId: 'left',
    resolveFrameClass,
  })
  const rightPaneStacks = createPaneStackStates({
    stacks: rightStacks,
    paneId: 'right',
    resolveFrameClass,
  })
  const stackById = new Map()
  const tileById = new Map()
  let remainingTiles = 0

  for (const stack of [ ...leftPaneStacks, ...rightPaneStacks ]) {
    stackById.set(stack.stackId, stack)
    for (const tile of stack.tiles) {
      tileById.set(tile.tileId, { stackState: stack })
      remainingTiles += 1
    }
  }

  return {
    panes: {
      left: leftPaneStacks,
      right: rightPaneStacks,
    },
    stackById,
    tileById,
    trayLimit: SHEEP_TRAY_LIMIT,
    tray: [],
    remainingTiles,
    status: SHEEP_STATUS_PLAYING,
    autoShuffleNotice: '',
  }
}

function cloneSheepTile(tile) {
  return {
    ...tile,
  }
}

function cloneSheepStack(stack) {
  return {
    ...stack,
    coveredBySlotIds: [ ...stack.coveredBySlotIds ],
    coveredByStackIds: [ ...stack.coveredByStackIds ],
    tiles: stack.tiles.map(cloneSheepTile),
  }
}

function rebuildSheepStateMaps(state) {
  state.stackById = new Map()
  state.tileById = new Map()

  for (const stack of [ ...state.panes.left, ...state.panes.right ]) {
    state.stackById.set(stack.stackId, stack)

    for (const tile of stack.tiles) {
      state.tileById.set(tile.tileId, { stackState: stack })
    }
  }
}

function cloneSheepStateForSimulation(state) {
  const clonedState = {
    panes: {
      left: state.panes.left.map(cloneSheepStack),
      right: state.panes.right.map(cloneSheepStack),
    },
    stackById: new Map(),
    tileById: new Map(),
    trayLimit: state.trayLimit,
    tray: state.tray.map(cloneSheepTile),
    remainingTiles: state.remainingTiles,
    status: state.status,
    autoShuffleNotice: '',
  }

  rebuildSheepStateMaps(clonedState)
  return clonedState
}

function captureSheepStateSnapshot(state) {
  return {
    panes: {
      left: state.panes.left.map(cloneSheepStack),
      right: state.panes.right.map(cloneSheepStack),
    },
    tray: state.tray.map(cloneSheepTile),
    remainingTiles: state.remainingTiles,
    status: state.status,
  }
}

function restoreSheepStateSnapshot(state, snapshot) {
  state.panes = {
    left: snapshot.panes.left.map(cloneSheepStack),
    right: snapshot.panes.right.map(cloneSheepStack),
  }
  state.tray = snapshot.tray.map(cloneSheepTile)
  state.remainingTiles = snapshot.remainingTiles
  state.status = snapshot.status
  state.autoShuffleNotice = ''

  rebuildSheepStateMaps(state)
}

function pushSheepHistory(history, state) {
  history.push(captureSheepStateSnapshot(state))
  if (history.length > SHEEP_HISTORY_LIMIT) {
    history.shift()
  }
}

function shuffleRemainingSheepTiles(state) {
  const remainingTiles = []
  const countsByStack = new Map()

  for (const stack of [ ...state.panes.left, ...state.panes.right ]) {
    countsByStack.set(stack.stackId, stack.tiles.length)
    remainingTiles.push(...stack.tiles)
  }

  if (remainingTiles.length <= 1) return

  shuffle(remainingTiles)
  let cursor = 0

  for (const stack of [ ...state.panes.left, ...state.panes.right ]) {
    const size = countsByStack.get(stack.stackId) || 0
    stack.tiles = remainingTiles
      .slice(cursor, cursor + size)
      .map(cloneSheepTile)
    cursor += size
  }

  rebuildSheepStateMaps(state)
}

function isStackSelectable(state, stackState) {
  if (!stackState.tiles.length) return false

  for (const coveredById of stackState.coveredByStackIds) {
    const blocker = state.stackById.get(coveredById)
    if (blocker && blocker.tiles.length) {
      return false
    }
  }

  return true
}

function resolveSheepStackZIndex(stackState) {
  const depth = Math.min(99, Math.max(1, stackState.tiles.length))

  // Overlay stacks must stay above every base stack they block, even when
  // their y-position is slightly higher on the board.
  return 200 + stackState.layer * 1000 + Math.round(stackState.y) + depth
}

function resolveTraditionalStackKind(stackState) {
  if (stackState.region !== 'traditional') return 'default'
  if (stackState.stackKind) return stackState.stackKind

  if (stackState.pileId.startsWith('traditional-blind-box')) return 'traditional-blind-box'
  if (stackState.pileId.startsWith('traditional-side-stack')) return 'traditional-side-stack'
  if (stackState.pileId.startsWith('traditional-independent')) return 'traditional-independent'

  return 'traditional-main'
}

function renderSheepPaneBoard({
  board,
  stacks,
  state,
}) {
  const fragment = document.createDocumentFragment()
  const boardWidth = board.clientWidth || Number.parseFloat(board.style.width) || 0

  for (const stackState of stacks) {
    const depth = stackState.tiles.length
    if (!depth) continue

    const stackSlot = document.createElement('span')
    const stackKind = resolveTraditionalStackKind(stackState)

    stackSlot.className = 'sf-match3-stack-slot'
    stackSlot.dataset.stackKind = stackKind
    stackSlot.style.left = `${stackState.x}px`
    stackSlot.style.top = `${stackState.y}px`
    stackSlot.style.zIndex = String(resolveSheepStackZIndex(stackState))

    const selectable = isStackSelectable(state, stackState)
    const topTile = stackState.tiles[depth - 1]

    if (!selectable) {
      stackSlot.classList.add('is-match3-blocked')
    }

    if (stackKind !== 'traditional-main' && depth > 1) {
      const directionX = Number.isFinite(stackState.stackDirectionX)
        ? stackState.stackDirectionX
        : stackState.x < boardWidth / 2
          ? -1
          : 1
      const directionY = Number.isFinite(stackState.stackDirectionY)
        ? stackState.stackDirectionY
        : stackKind === 'traditional-blind-box'
          ? 0.85
          : stackKind === 'traditional-independent'
            ? -0.9
            : 0.28
      const indicatorCount = Math.min(9, depth - 1)

      for (const indicatorDepth of Array.from({ length: indicatorCount }, (_, index_) => indicatorCount - index_)) {
        const indicator = document.createElement('span')
        const offsetX = (
          stackKind === 'traditional-independent'
            ? 3
            : 4
        ) * directionX * indicatorDepth
        const offsetY = (
          stackKind === 'traditional-independent'
            ? 1
            : stackKind === 'traditional-blind-box'
              ? 1.05
              : 0.52
        ) * directionY * indicatorDepth

        indicator.className = 'sf-match3-stack-depth-card'
        indicator.style.zIndex = '0'
        indicator.style.setProperty('--sf-match3-indicator-offset-x', `${offsetX}px`)
        indicator.style.setProperty('--sf-match3-indicator-offset-y', `${offsetY}px`)
        stackSlot.append(indicator)
      }
    }

    const previewLimit = stackKind === 'traditional-main'
      ? 1
      : stackKind.startsWith('traditional-')
        ? 0
        : SHEEP_STACK_PREVIEW_COUNT
    const previewTiles = stackState.tiles
      .slice(Math.max(0, depth - 1 - previewLimit), depth - 1)

    previewTiles.forEach((previewTile, previewIndex) => {
      const preview = document.createElement('span')
      const previewDepth = previewTiles.length - previewIndex

      preview.className = 'sf-avatar-wallpaper-tile sf-match3-stack-preview'
      preview.classList.add(`sf-match3-stack-preview-depth-${previewDepth}`)
      preview.style.setProperty(
        '--sf-match3-preview-offset',
        `${previewDepth * SHEEP_STACK_PREVIEW_OFFSET_PX}px`,
      )
      setMatch3AvatarImage(preview, previewTile.url)
      stackSlot.append(preview)
    })

    const tile = document.createElement('button')
    const depthLevel = Math.min(4, Math.max(0, depth - 1))

    tile.type = 'button'
    tile.className = 'sf-avatar-wallpaper-tile sf-match3-tile'
    tile.dataset.tileId = topTile.tileId
    tile.dataset.stackId = stackState.stackId
    setMatch3AvatarImage(tile, topTile.url)
    tile.style.setProperty('--sf-match3-stack-shadow-offset', `${depthLevel * 1.3}px`)
    tile.style.setProperty('--sf-match3-stack-shadow-alpha', String(0.14 + depthLevel * 0.06))
    tile.disabled = !selectable

    if (!selectable) {
      tile.classList.add('is-match3-blocked')
    }
    stackSlot.append(tile)
    fragment.append(stackSlot)
  }

  board.replaceChildren(fragment)
}

function resolveTrayMatches(state) {
  const countsByType = new Map()

  for (const trayTile of state.tray) {
    countsByType.set(
      trayTile.typeIndex,
      (countsByType.get(trayTile.typeIndex) || 0) + 1,
    )
  }

  const removeCountByType = new Map()
  for (const [ typeIndex, count ] of countsByType.entries()) {
    if (count >= 3) {
      removeCountByType.set(typeIndex, Math.floor(count / 3) * 3)
    }
  }

  if (!removeCountByType.size) return

  state.tray = state.tray.filter(trayTile => {
    const removableCount = removeCountByType.get(trayTile.typeIndex) || 0
    if (!removableCount) return true

    removeCountByType.set(trayTile.typeIndex, removableCount - 1)
    return false
  })
}

function updateSheepGameStatus(state) {
  if (state.status !== SHEEP_STATUS_PLAYING) return

  if (state.remainingTiles === 0 && state.tray.length === 0) {
    state.status = SHEEP_STATUS_CLEARED
    return
  }

  if (state.tray.length >= state.trayLimit) {
    state.status = SHEEP_STATUS_FAILED
  }
}

function getSelectableSheepStacks(state) {
  return [ ...state.panes.left, ...state.panes.right ]
    .filter(stackState => isStackSelectable(state, stackState))
}

function getSheepTrayTypeCounts(state) {
  const countsByType = new Map()

  for (const trayTile of state.tray) {
    countsByType.set(
      trayTile.typeIndex,
      (countsByType.get(trayTile.typeIndex) || 0) + 1,
    )
  }

  return countsByType
}

function resolveSheepStackSelectionPriority(state, stackState, trayTypeCounts) {
  const topTile = stackState.tiles[stackState.tiles.length - 1]
  if (!topTile) return [ 99, 99, 99, 99, 99, 99 ]

  const trayCount = trayTypeCounts.get(topTile.typeIndex) || 0
  const matchRank = trayCount >= 2
    ? 0
    : trayCount === 1
      ? 1
      : 2
  const trayRiskRank = matchRank === 2 && state.tray.length >= state.trayLimit - 1
    ? 1
    : 0
  const regionRank = stackState.region === 'b' ? 1 : 0

  return [
    matchRank,
    trayRiskRank,
    regionRank,
    stackState.row,
    Math.round(stackState.y),
    stackState.pileIndex,
  ]
}

function findPreferredSheepStack(state) {
  const trayTypeCounts = getSheepTrayTypeCounts(state)
  let preferredStack = null
  let preferredPriority = null

  for (const stackState of getSelectableSheepStacks(state)) {
    const priority = resolveSheepStackSelectionPriority(state, stackState, trayTypeCounts)

    if (
      !preferredStack
      || compareNumberArrays(priority, preferredPriority) < 0
    ) {
      preferredStack = stackState
      preferredPriority = priority
    }
  }

  return preferredStack
}

function applySheepStackSelection(state, stackState) {
  if (!stackState || !stackState.tiles.length) return null
  if (!isStackSelectable(state, stackState)) return null

  const topTile = stackState.tiles[stackState.tiles.length - 1]
  if (!topTile) return null

  const trayLengthBeforePush = state.tray.length
  stackState.tiles.pop()
  state.tileById.delete(topTile.tileId)
  state.remainingTiles -= 1
  state.tray.push({
    tileId: topTile.tileId,
    url: topTile.url,
    frameClass: topTile.frameClass,
    typeIndex: topTile.typeIndex,
    typeLabel: topTile.typeLabel,
    typeClass: topTile.typeClass,
  })
  resolveTrayMatches(state)
  updateSheepGameStatus(state)

  return {
    tile: topTile,
    resolvedTripleCount: Math.max(0, trayLengthBeforePush + 1 - state.tray.length) / 3,
  }
}

function simulateSheepSafety(state, {
  maxTurns,
  requiredTriples = 0,
}) {
  const simulationState = cloneSheepStateForSimulation(state)
  let turnsPlayed = 0
  let resolvedTripleCount = 0

  while (
    turnsPlayed < maxTurns
    && simulationState.status === SHEEP_STATUS_PLAYING
  ) {
    const preferredStack = findPreferredSheepStack(simulationState)
    if (!preferredStack) break

    const selectionResult = applySheepStackSelection(simulationState, preferredStack)
    if (!selectionResult) break

    turnsPlayed += 1
    resolvedTripleCount += selectionResult.resolvedTripleCount
  }

  const completedWindow = (
    turnsPlayed >= maxTurns
    || simulationState.status === SHEEP_STATUS_CLEARED
  )
  const safe = (
    simulationState.status !== SHEEP_STATUS_FAILED
    && completedWindow
    && resolvedTripleCount >= requiredTriples
  )
  const score = (
    turnsPlayed * 100
    + resolvedTripleCount * 45
    - simulationState.tray.length * 5
    + (safe ? 400 : 0)
    + (simulationState.status === SHEEP_STATUS_CLEARED ? 200 : 0)
  )

  return {
    safe,
    score,
    turnsPlayed,
    resolvedTripleCount,
    trayLength: simulationState.tray.length,
    status: simulationState.status,
  }
}

function evaluateSheepOpeningCandidate({
  leftStacks,
  rightStacks,
  maxTurns = SHEEP_OPENING_SAFE_TURNS,
  requiredTriples = 0,
  requiredSelectableCount = 0,
}) {
  const candidateState = createSheepGameState({
    leftStacks,
    rightStacks,
    resolveFrameClass: () => '',
  })
  const initialSelectableCount = getSelectableSheepStacks(candidateState).length

  const safetyResult = simulateSheepSafety(candidateState, {
    maxTurns,
    requiredTriples,
  })
  const safe = (
    initialSelectableCount >= requiredSelectableCount
    && safetyResult.safe
  )

  return {
    ...safetyResult,
    safe,
    initialSelectableCount,
    score: safetyResult.score + initialSelectableCount * 6 + (safe ? 120 : 0),
  }
}

function createPlayableSheepPaneStacks({
  tiles,
  leftLayout,
  rightLayout,
  maxTurns = SHEEP_OPENING_SAFE_TURNS,
  requiredTriples = SHEEP_OPENING_REQUIRED_TRIPLES,
  maxAttempts = SHEEP_OPENING_MAX_DEAL_ATTEMPTS,
  requiredSelectableCount = 0,
}) {
  let bestCandidate = null
  let attemptCount = 0

  while (attemptCount < maxAttempts) {
    const candidateTiles = shuffle([ ...tiles ])
    const candidate = createSheepPaneStacks({
      tiles: candidateTiles,
      leftLayout,
      rightLayout,
    })
    const evaluatedOpening = evaluateSheepOpeningCandidate({
      ...candidate,
      maxTurns,
      requiredTriples,
      requiredSelectableCount,
    })
    const rankedCandidate = {
      ...candidate,
      openingEvaluation: evaluatedOpening,
    }

    if (
      !bestCandidate
      || evaluatedOpening.score > bestCandidate.openingEvaluation.score
    ) {
      bestCandidate = rankedCandidate
    }

    if (evaluatedOpening.safe) {
      return rankedCandidate
    }

    attemptCount += 1
  }

  return bestCandidate || {
    leftStacks: [],
    rightStacks: [],
    openingEvaluation: null,
  }
}

function rerollSheepStateUntilSafe(state, {
  maxTurns,
  requiredTriples = 0,
  maxAttempts = SHEEP_AUTO_SHUFFLE_MAX_ATTEMPTS,
  forceShuffleFirst = false,
}) {
  let shuffleCount = 0
  let evaluation = forceShuffleFirst
    ? {
      safe: false,
    }
    : simulateSheepSafety(state, {
      maxTurns,
      requiredTriples,
    })

  while (
    !evaluation.safe
    && shuffleCount < maxAttempts
    && state.status === SHEEP_STATUS_PLAYING
    && state.remainingTiles > 1
  ) {
    shuffleRemainingSheepTiles(state)
    shuffleCount += 1
    evaluation = simulateSheepSafety(state, {
      maxTurns,
      requiredTriples,
    })
  }

  return {
    shuffleCount,
    evaluation,
  }
}

function renderSheepTray({
  container,
  trayStatus,
  trayUsage,
  traySlots,
  state,
}) {
  const fragment = document.createDocumentFragment()

  for (let index = 0; index < state.trayLimit; index++) {
    const slot = document.createElement('span')
    const slotTile = state.tray[index]

    slot.className = 'sf-match3-tray-slot'

    if (slotTile) {
      const tile = document.createElement('span')

      tile.className = 'sf-avatar-wallpaper-tile sf-match3-tray-tile'
      setMatch3AvatarImage(tile, slotTile.url)
      slot.append(tile)
    }

    fragment.append(slot)
  }

  traySlots.replaceChildren(fragment)

  container.classList.remove('is-match3-cleared', 'is-match3-failed')
  if (state.status === SHEEP_STATUS_CLEARED) {
    container.classList.add('is-match3-cleared')
    trayStatus.textContent = '通关'
    trayUsage.textContent = '剩余牌 0 | 槽位 0/7'
    return
  }

  if (state.status === SHEEP_STATUS_FAILED) {
    container.classList.add('is-match3-failed')
    trayStatus.textContent = '失败'
    trayUsage.textContent = `剩余牌 ${state.remainingTiles} | 槽位 ${state.tray.length}/${state.trayLimit}`
    return
  }

  trayStatus.textContent = state.autoShuffleNotice || `剩余牌 ${state.remainingTiles}`
  trayUsage.textContent = `槽位 ${state.tray.length}/${state.trayLimit}`
}

function renderSheepControls({
  state,
  history,
  layoutMode = 'default',
  buttonsByAction,
}) {
  const undoButton = buttonsByAction.undo
  const shuffleButton = buttonsByAction.shuffle
  const restartButton = buttonsByAction.restart
  const clearButton = buttonsByAction.clear
  const reviveButton = buttonsByAction.revive

  if (undoButton) {
    undoButton.disabled = history.length === 0
  }

  if (shuffleButton) {
    shuffleButton.disabled = state.status !== SHEEP_STATUS_PLAYING || state.remainingTiles <= 1
  }

  if (layoutMode === 'traditional') {
    if (clearButton) {
      clearButton.disabled = state.status !== SHEEP_STATUS_PLAYING || state.tray.length === 0
    }

    if (reviveButton) {
      reviveButton.disabled = state.status !== SHEEP_STATUS_FAILED
    }

    return
  }

  if (restartButton) {
    restartButton.disabled = false
  }
}

function removeOldestSheepTrayTiles(state, count) {
  const removeCount = Math.max(0, Math.min(count, state.tray.length))
  if (!removeCount) return

  state.tray.splice(0, removeCount)
  if (state.status === SHEEP_STATUS_FAILED && state.tray.length < state.trayLimit) {
    state.status = SHEEP_STATUS_PLAYING
  }
  updateSheepGameStatus(state)
}

function reviveFailedSheepState(state) {
  if (state.status !== SHEEP_STATUS_FAILED) return

  state.tray = []
  state.status = SHEEP_STATUS_PLAYING
  updateSheepGameStatus(state)
}

function animateTileToTray({
  sourceRect,
  trayBar,
  traySlots,
  trayIndex,
  tile,
}) {
  if (!sourceRect || sourceRect.width <= 0 || sourceRect.height <= 0) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const targetSlot = traySlots.children[trayIndex]
  const targetRect = (targetSlot || trayBar).getBoundingClientRect()
  if (!targetRect.width || !targetRect.height) return

  const ghost = document.createElement('span')
  ghost.className = 'sf-avatar-wallpaper-tile sf-match3-fly-tile'
  setMatch3AvatarImage(ghost, tile.url)
  ghost.style.width = `${sourceRect.width}px`
  ghost.style.height = `${sourceRect.height}px`
  ghost.style.left = `${sourceRect.left}px`
  ghost.style.top = `${sourceRect.top}px`

  document.body.append(ghost)

  const targetX = targetRect.left + targetRect.width / 2 - sourceRect.width / 2
  const targetY = targetRect.top + targetRect.height / 2 - sourceRect.height / 2
  const deltaX = targetX - sourceRect.left
  const deltaY = targetY - sourceRect.top

  requestAnimationFrame(() => {
    ghost.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.78)`
    ghost.style.opacity = '0.16'
  })

  window.setTimeout(() => {
    ghost.remove()
  }, 280)
}

function mountSheepMode({
  container,
  leftBoard,
  rightBoard,
  hudHost = container,
  leftStacks,
  rightStacks,
  resolveFrameClass,
  openingEvaluation,
  layoutMode = 'default',
}) {
  const state = createSheepGameState({
    leftStacks,
    rightStacks,
    resolveFrameClass,
  })
  const history = []
  const trayBar = document.createElement('div')
  const trayHeader = document.createElement('div')
  const trayStatus = document.createElement('div')
  const trayUsage = document.createElement('div')
  const traySlots = document.createElement('div')
  const controls = document.createElement('div')
  const statusEffect = document.createElement('div')
  const statusEffectTitle = document.createElement('div')
  const statusEffectSubtitle = document.createElement('div')
  const buttonsByAction = {}
  let autoShuffleNoticeTimer = 0
  let statusEffectTimer = 0
  let initialSnapshot = null
  let previousRenderedStatus = state.status

  trayBar.className = 'sf-match3-tray'
  trayHeader.className = 'sf-match3-tray-header'
  trayStatus.className = 'sf-match3-tray-status'
  trayUsage.className = 'sf-match3-tray-usage'
  traySlots.className = 'sf-match3-tray-slots'
  trayHeader.append(trayStatus, trayUsage)
  trayBar.append(trayHeader, traySlots)
  controls.className = 'sf-match3-controls'
  controls.dataset.layout = layoutMode
  hudHost.dataset.layout = layoutMode
  statusEffect.className = 'sf-match3-status-effect'
  statusEffectTitle.className = 'sf-match3-status-effect-title'
  statusEffectSubtitle.className = 'sf-match3-status-effect-subtitle'
  statusEffect.append(statusEffectTitle, statusEffectSubtitle)

  const controlDefinitions = layoutMode === 'traditional'
    ? [ {
      action: 'clear',
      label: '清牌',
    }, {
      action: 'shuffle',
      label: '洗牌',
    }, {
      action: 'revive',
      label: '复活',
      emphasis: true,
    }, {
      action: 'undo',
      label: '撤回',
    } ]
    : [ {
      action: 'undo',
      label: '反悔',
    }, {
      action: 'shuffle',
      label: '打乱',
    }, {
      action: 'restart',
      label: '重开',
      emphasis: true,
    } ]

  for (const definition of controlDefinitions) {
    const button = document.createElement('button')

    button.type = 'button'
    button.className = definition.emphasis
      ? 'sf-match3-control-button is-emphasis'
      : 'sf-match3-control-button'
    button.dataset.action = definition.action
    button.textContent = definition.label
    controls.append(button)
    buttonsByAction[definition.action] = button
  }

  hudHost.append(trayBar)
  hudHost.append(controls)
  container.append(statusEffect)

  const render = () => {
    if (leftBoard) {
      renderSheepPaneBoard({
        board: leftBoard,
        stacks: state.panes.left,
        state,
      })
    }
    if (rightBoard) {
      renderSheepPaneBoard({
        board: rightBoard,
        stacks: state.panes.right,
        state,
      })
    }
    renderSheepTray({
      container,
      trayStatus,
      trayUsage,
      traySlots,
      state,
    })
    renderSheepControls({
      state,
      history,
      layoutMode,
      buttonsByAction,
    })

    if (state.status === SHEEP_STATUS_FAILED && previousRenderedStatus !== SHEEP_STATUS_FAILED) {
      showFailedStatusEffect()
    } else if (previousRenderedStatus === SHEEP_STATUS_FAILED && state.status !== SHEEP_STATUS_FAILED) {
      clearStatusEffect()
    }

    previousRenderedStatus = state.status
  }

  const clearAutoShuffleNotice = () => {
    state.autoShuffleNotice = ''

    if (autoShuffleNoticeTimer) {
      window.clearTimeout(autoShuffleNoticeTimer)
      autoShuffleNoticeTimer = 0
    }
  }

  const showAutoShuffleNotice = shuffleCount => {
    if (!shuffleCount) return

    clearAutoShuffleNotice()
    state.autoShuffleNotice = shuffleCount > 1
      ? `已自动打乱 x${shuffleCount}`
      : '已自动打乱'
    autoShuffleNoticeTimer = window.setTimeout(() => {
      autoShuffleNoticeTimer = 0
      state.autoShuffleNotice = ''

      if (container.isConnected) {
        render()
      }
    }, SHEEP_AUTO_SHUFFLE_NOTICE_MS)
  }

  const clearStatusEffect = () => {
    if (statusEffectTimer) {
      window.clearTimeout(statusEffectTimer)
      statusEffectTimer = 0
    }

    container.classList.remove('is-match3-failed-burst')
    statusEffect.classList.remove('is-visible')
    statusEffect.removeAttribute('data-effect')
    statusEffectTitle.textContent = ''
    statusEffectSubtitle.textContent = ''
  }

  const showFailedStatusEffect = () => {
    clearStatusEffect()
    statusEffect.dataset.effect = 'failed'
    statusEffectTitle.textContent = '游戏结束'
    statusEffectSubtitle.textContent = `槽位已满 ${Math.min(state.tray.length, state.trayLimit)}/${state.trayLimit}`
    container.classList.add('is-match3-failed-burst')

    requestAnimationFrame(() => {
      statusEffect.classList.add('is-visible')
    })

    statusEffectTimer = window.setTimeout(() => {
      statusEffectTimer = 0
      container.classList.remove('is-match3-failed-burst')
      statusEffect.classList.remove('is-visible')
    }, SHEEP_STATUS_EFFECT_DURATION_MS)
  }

  const stabilizeSheepState = ({
    maxTurns,
    requiredTriples = 0,
    maxAttempts = SHEEP_AUTO_SHUFFLE_MAX_ATTEMPTS,
    forceShuffleFirst = false,
  } = {}) => {
    if (layoutMode === 'traditional') {
      return {
        shuffleCount: 0,
        evaluation: openingEvaluation || null,
      }
    }

    const stabilizationResult = rerollSheepStateUntilSafe(state, {
      maxTurns,
      requiredTriples,
      maxAttempts,
      forceShuffleFirst,
    })

    showAutoShuffleNotice(stabilizationResult.shuffleCount)
    return stabilizationResult
  }

  if (layoutMode !== 'traditional') {
    stabilizeSheepState({
      maxTurns: SHEEP_OPENING_SAFE_TURNS,
      requiredTriples: SHEEP_OPENING_REQUIRED_TRIPLES,
      maxAttempts: SHEEP_AUTO_SHUFFLE_MAX_ATTEMPTS,
      forceShuffleFirst: !openingEvaluation?.safe,
    })
  }
  initialSnapshot = captureSheepStateSnapshot(state)

  const restartSheepMode = () => {
    clearAutoShuffleNotice()
    clearStatusEffect()
    restoreSheepStateSnapshot(state, initialSnapshot)
    history.length = 0

    if (layoutMode !== 'traditional') {
      stabilizeSheepState({
        maxTurns: SHEEP_AUTO_SHUFFLE_LOOKAHEAD_TURNS,
      })
    }

    render()
  }

  controls.addEventListener('click', event => {
    const actionButton = event.target.closest('.sf-match3-control-button')
    if (!actionButton || !controls.contains(actionButton)) return
    if (actionButton.disabled) return

    const { action } = actionButton.dataset
    if (action === 'undo') {
      const snapshot = history.pop()
      if (!snapshot) return

      clearAutoShuffleNotice()
      restoreSheepStateSnapshot(state, snapshot)

      if (layoutMode !== 'traditional') {
        stabilizeSheepState({
          maxTurns: SHEEP_AUTO_SHUFFLE_LOOKAHEAD_TURNS,
        })
      }

      render()
      return
    }

    if (action === 'shuffle') {
      pushSheepHistory(history, state)
      clearAutoShuffleNotice()
      shuffleRemainingSheepTiles(state)

      if (layoutMode !== 'traditional') {
        stabilizeSheepState({
          maxTurns: SHEEP_AUTO_SHUFFLE_LOOKAHEAD_TURNS,
        })
      }

      render()
      return
    }

    if (action === 'clear') {
      pushSheepHistory(history, state)
      clearAutoShuffleNotice()
      removeOldestSheepTrayTiles(state, 3)
      render()
      return
    }

    if (action === 'revive') {
      pushSheepHistory(history, state)
      clearAutoShuffleNotice()
      reviveFailedSheepState(state)
      render()
      return
    }

    if (action === 'restart') {
      restartSheepMode()
    }
  })

  container.addEventListener('click', event => {
    if (state.status !== SHEEP_STATUS_PLAYING) return

    const tileElement = event.target.closest('.sf-match3-tile')
    if (!tileElement || !container.contains(tileElement)) return

    const { tileId } = tileElement.dataset
    if (!tileId) return

    const tileBinding = state.tileById.get(tileId)
    if (!tileBinding) return

    const { stackState } = tileBinding
    if (!isStackSelectable(state, stackState)) return
    const topTile = stackState.tiles[stackState.tiles.length - 1]
    if (!topTile || topTile.tileId !== tileId) return

    const sourceRect = tileElement.getBoundingClientRect()
    const trayIndexBeforePush = Math.max(
      0,
      Math.min(state.tray.length, state.trayLimit - 1),
    )
    pushSheepHistory(history, state)

    clearAutoShuffleNotice()
    applySheepStackSelection(state, stackState)

    if (layoutMode !== 'traditional') {
      stabilizeSheepState({
        maxTurns: SHEEP_AUTO_SHUFFLE_LOOKAHEAD_TURNS,
      })
    }

    render()

    animateTileToTray({
      sourceRect,
      trayBar,
      traySlots,
      trayIndex: trayIndexBeforePush,
      tile: topTile,
    })
  })

  render()
  return {
    restart: restartSheepMode,
  }
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
  match3Mode,
  match3TraditionalLayout,
  match3TraditionalMinimized,
  frameClassByAvatarKey,
  onTraditionalMatch3MinimizedChange,
}) {
  removeWallpaperContainer()

  if (!avatars.length) return

  const renderUrls = getRenderAvatarUrls({
    avatars,
    favoriteAvatarUrls,
    prioritizeFavoritesFirst,
  })
  const resolveFrameClass = createAvatarFrameResolver({
    favoriteAvatarUrls,
    frameClassByAvatarKey,
  })
  if (!renderUrls.length) return
  const defaultLayout = resolveLayout(renderUrls.length)
  let { tileSize, tileGap } = defaultLayout
  let sheepTileMetrics = resolveSheepTileMetrics(tileSize)
  const { left: leftPaneWidth, right: rightPaneWidth } = resolveSidePaneWidths()
  let leftPaneMetrics = null
  let rightPaneMetrics = null

  if (match3Mode && match3TraditionalLayout) {
    sheepTileMetrics = resolveTraditionalSheepTileMetrics()
    tileSize = sheepTileMetrics.tileWidth
    tileGap = 0
  }

  if (match3Mode) {
    leftPaneMetrics = getPaneCapacity({
      paneWidth: leftPaneWidth,
      tileSize,
      tileGap,
    })
    rightPaneMetrics = getPaneCapacity({
      paneWidth: rightPaneWidth,
      tileSize,
      tileGap,
    })
  } else {
    const normalPaneLayout = resolveNormalPaneLayout({
      avatarCount: renderUrls.length,
      leftPaneWidth,
      rightPaneWidth,
    })
    if (!normalPaneLayout) return

    const {
      tileSize: resolvedTileSize,
      tileGap: resolvedTileGap,
      leftPaneMetrics: resolvedLeftPaneMetrics,
      rightPaneMetrics: resolvedRightPaneMetrics,
    } = normalPaneLayout

    tileSize = resolvedTileSize
    tileGap = resolvedTileGap
    sheepTileMetrics = resolveSheepTileMetrics(tileSize)
    leftPaneMetrics = resolvedLeftPaneMetrics
    rightPaneMetrics = resolvedRightPaneMetrics

    if (!leftPaneMetrics.capacity && !rightPaneMetrics.capacity) return
  }

  const leftPaneCapacity = leftPaneMetrics.capacity
  const rightPaneCapacity = rightPaneMetrics.capacity

  const container = document.createElement('div')
  const leftPane = document.createElement('div')
  const rightPane = document.createElement('div')
  const match3Stage = document.createElement('div')
  const match3StageMark = document.createElement('div')
  const match3StageHud = document.createElement('div')
  const match3StageActions = document.createElement('div')
  const match3StageRestart = document.createElement('button')
  const match3StageMinimize = document.createElement('button')
  const match3StageRestore = document.createElement('button')

  container.id = CONTAINER_ID
  container.style.opacity = match3Mode
    ? '1'
    : fillBlueOnlyInGaps
      ? '1'
      : String(opacity)
  container.style.setProperty('--sf-avatar-wallpaper-tile-size', `${tileSize}px`)
  container.style.setProperty('--sf-avatar-wallpaper-tile-gap', `${tileGap}px`)
  container.style.setProperty('--sf-match3-overlap', `${SHEEP_STACK_OVERLAP_PX}px`)
  container.style.setProperty('--sf-match3-layer-offset', `${SHEEP_LAYER_OFFSET_PX}px`)
  container.style.setProperty('--sf-match3-tile-width', `${sheepTileMetrics.tileWidth}px`)
  container.style.setProperty('--sf-match3-tile-height', `${sheepTileMetrics.tileHeight}px`)
  container.style.setProperty('--sf-match3-preview-step', `${SHEEP_STACK_PREVIEW_OFFSET_PX}px`)
  container.style.setProperty('--sf-match3-avatar-inset-x', `${sheepTileMetrics.avatarInsetX}px`)
  container.style.setProperty('--sf-match3-avatar-inset-top', `${sheepTileMetrics.avatarInsetTop}px`)
  container.style.setProperty('--sf-match3-avatar-inset-bottom', `${sheepTileMetrics.avatarInsetBottom}px`)
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
  leftPane.style.setProperty('--sf-avatar-wallpaper-pane-columns', Math.max(1, leftPaneMetrics.columns))
  rightPane.id = PANE_RIGHT_ID
  rightPane.className = 'sf-avatar-wallpaper-pane'
  rightPane.style.width = `${rightPaneWidth}px`
  rightPane.style.setProperty('--sf-avatar-wallpaper-pane-columns', Math.max(1, rightPaneMetrics.columns))
  match3Stage.className = 'sf-match3-stage'
  match3StageMark.className = 'sf-match3-stage-mark'
  match3StageMark.textContent = SHEEP_TRADITIONAL_GLYPH_TEXT
  match3StageHud.className = 'sf-match3-stage-hud'
  match3StageActions.className = 'sf-match3-stage-actions'
  match3StageRestart.type = 'button'
  match3StageRestart.className = 'sf-match3-stage-action-button is-emphasis'
  match3StageRestart.textContent = '重开'
  match3StageMinimize.type = 'button'
  match3StageMinimize.className = 'sf-match3-stage-action-button'
  match3StageMinimize.textContent = '最小化'
  match3StageRestore.type = 'button'
  match3StageRestore.className = 'sf-match3-stage-restore'
  match3StageRestore.textContent = '恢复棋盘'

  if (match3Mode) {
    container.classList.add('sf-avatar-wallpaper-match3')
    if (match3TraditionalLayout) {
      const stageLayout = resolveTraditionalSheepStageLayout({
        tileWidth: sheepTileMetrics.tileWidth,
        tileHeight: sheepTileMetrics.tileHeight,
      })
      const traditionalLayout = createTraditionalSheepBoardLayout({
        stageLayout,
        tileWidth: sheepTileMetrics.tileWidth,
        tileHeight: sheepTileMetrics.tileHeight,
      })
      const expectedTileCount = sumNumbers(
        traditionalLayout.slots.map(slot => slot.targetDepth || 0),
      )
      if (expectedTileCount !== SHEEP_TRADITIONAL_TOTAL_TILES) return

      const sheepTiles = createSheepTileDeck({
        urls: renderUrls,
        targetTripleGroupCounts: SHEEP_TRADITIONAL_TRIPLE_GROUP_COUNTS,
      })
      if (sheepTiles.length !== expectedTileCount) return

      const {
        leftStacks,
        rightStacks,
        openingEvaluation,
      } = createPlayableSheepPaneStacks({
        tiles: sheepTiles,
        leftLayout: traditionalLayout,
        rightLayout: {
          slots: [],
        },
        maxTurns: SHEEP_TRADITIONAL_OPENING_SAFE_TURNS,
        requiredTriples: SHEEP_TRADITIONAL_OPENING_REQUIRED_TRIPLES,
        maxAttempts: SHEEP_TRADITIONAL_OPENING_MAX_DEAL_ATTEMPTS,
        requiredSelectableCount: SHEEP_TRADITIONAL_INITIAL_WINDOW_COUNT,
      })
      if (
        !leftStacks.length
        || openingEvaluation?.initialSelectableCount < SHEEP_TRADITIONAL_INITIAL_WINDOW_COUNT
      ) return

      const traditionalBoard = document.createElement('div')
      const boardOffsetX = Math.max(
        0,
        Math.floor((stageLayout.boardAreaWidth - traditionalLayout.boardWidth) / 2),
      )
      const boardOffsetY = Math.max(
        0,
        Math.floor((stageLayout.boardAreaHeight - traditionalLayout.boardHeight) / 2),
      )

      container.classList.add('sf-avatar-wallpaper-match3-traditional')
      if (match3TraditionalMinimized) {
        container.classList.add('is-match3-traditional-minimized')
      }
      match3StageActions.append(match3StageRestart, match3StageMinimize)
      match3Stage.style.left = `${stageLayout.stageX}px`
      match3Stage.style.top = `${stageLayout.stageY}px`
      match3Stage.style.width = `${stageLayout.stageWidth}px`
      match3Stage.style.height = `${stageLayout.stageHeight}px`
      traditionalBoard.className = 'sf-match3-board'
      traditionalBoard.dataset.layout = 'traditional'
      traditionalBoard.style.left = `${stageLayout.boardX + boardOffsetX}px`
      traditionalBoard.style.top = `${stageLayout.boardY + boardOffsetY}px`
      traditionalBoard.style.width = `${Math.ceil(traditionalLayout.boardWidth)}px`
      traditionalBoard.style.height = `${Math.ceil(traditionalLayout.boardHeight)}px`
      match3StageHud.style.left = `${stageLayout.hudX}px`
      match3StageHud.style.top = `${stageLayout.hudY}px`
      match3StageHud.style.width = `${stageLayout.hudWidth}px`
      match3StageHud.style.height = `${stageLayout.hudHeight}px`
      match3Stage.append(match3StageActions, match3StageMark, traditionalBoard, match3StageHud)
      container.append(match3Stage, match3StageRestore)

      const mountedTraditionalMatch3 = mountSheepMode({
        container,
        leftBoard: traditionalBoard,
        rightBoard: null,
        hudHost: match3StageHud,
        leftStacks,
        rightStacks,
        resolveFrameClass,
        openingEvaluation,
        layoutMode: 'traditional',
      })

      match3StageRestart.addEventListener('click', () => {
        mountedTraditionalMatch3.restart()
      })
      match3StageMinimize.addEventListener('click', () => {
        if (onTraditionalMatch3MinimizedChange) {
          onTraditionalMatch3MinimizedChange(true)
        }
        container.classList.add('is-match3-traditional-minimized')
      })
      match3StageRestore.addEventListener('click', () => {
        if (onTraditionalMatch3MinimizedChange) {
          onTraditionalMatch3MinimizedChange(false)
        }
        container.classList.remove('is-match3-traditional-minimized')
      })
    } else {
      const leftLayout = createSheepPaneLayout({
        paneId: 'left',
        paneWidth: leftPaneWidth,
        paneHeight: window.innerHeight,
        tileWidth: sheepTileMetrics.tileWidth,
        tileHeight: sheepTileMetrics.tileHeight,
      })
      const rightLayout = createSheepPaneLayout({
        paneId: 'right',
        paneWidth: rightPaneWidth,
        paneHeight: window.innerHeight,
        tileWidth: sheepTileMetrics.tileWidth,
        tileHeight: sheepTileMetrics.tileHeight,
      })
      const expectedTileCount = sumNumbers([
        ...leftLayout.slots.map(slot => slot.targetDepth || 0),
        ...rightLayout.slots.map(slot => slot.targetDepth || 0),
      ])
      if (expectedTileCount !== SHEEP_FIXED_TOTAL_TILES) return

      const sheepTiles = createSheepTileDeck({
        urls: renderUrls,
      })
      if (sheepTiles.length !== expectedTileCount) return

      const {
        leftStacks,
        rightStacks,
        openingEvaluation,
      } = createPlayableSheepPaneStacks({
        tiles: sheepTiles,
        leftLayout,
        rightLayout,
      })
      if (!leftStacks.length && !rightStacks.length) return

      const leftBoard = document.createElement('div')
      const rightBoard = document.createElement('div')
      leftBoard.className = 'sf-match3-board'
      leftBoard.dataset.region = leftLayout.region
      leftBoard.style.width = `${Math.ceil(leftLayout.boardWidth)}px`
      leftBoard.style.height = `${Math.ceil(leftLayout.boardHeight)}px`
      rightBoard.className = 'sf-match3-board'
      rightBoard.dataset.region = rightLayout.region
      rightBoard.style.width = `${Math.ceil(rightLayout.boardWidth)}px`
      rightBoard.style.height = `${Math.ceil(rightLayout.boardHeight)}px`
      leftPane.append(leftBoard)
      rightPane.append(rightBoard)
      container.append(leftPane, rightPane)

      mountSheepMode({
        container,
        leftBoard,
        rightBoard,
        leftStacks,
        rightStacks,
        resolveFrameClass,
        openingEvaluation,
      })
    }
  } else {
    const {
      leftItems: leftUrls,
      rightItems: rightUrls,
    } = splitItemsForPanes({
      items: renderUrls,
      leftCapacity: leftPaneCapacity,
      rightCapacity: rightPaneCapacity,
      leftColumns: leftPaneMetrics.columns,
      rightColumns: rightPaneMetrics.columns,
    })
    if (!leftUrls.length && !rightUrls.length) return

    for (const [ pane, urls ] of [
      [ leftPane, leftUrls ],
      [ rightPane, rightUrls ],
    ]) {
      const fragment = document.createDocumentFragment()

      for (const url of urls) {
        const tile = document.createElement('span')
        tile.className = 'sf-avatar-wallpaper-tile'
        tile.classList.add(resolveFrameClass(url))
        tile.style.backgroundImage = `url("${url}")`
        fragment.append(tile)
      }

      pane.append(fragment)
    }

    container.append(leftPane, rightPane)
  }
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
  let activeMatch3Mode = DEFAULT_MATCH3_MODE
  let activeMatch3TraditionalMinimized = false
  const activeAvatarFrameByKey = new Map()
  let resizeTimer = null

  function updateTraditionalMatch3MinimizedState(minimized) {
    activeMatch3TraditionalMinimized = minimized
    writeTraditionalMatch3MinimizedState(minimized)
  }

  async function fetchAvatarUrls() {
    try {
      const avatarsFromApi = await fetchAvatarUrlsFromApi(fanfouOAuth)

      if (avatarsFromApi.length) {
        return avatarsFromApi
      }
    } catch (error) {
      // OAuth 未配置或请求失败时，回退到页面抓取方案
    }

    const avatarsFromAutocompleteCache = await readAvatarUrlsFromAutocompleteCache(storage)
    if (avatarsFromAutocompleteCache.length) {
      return avatarsFromAutocompleteCache
    }

    const avatarsFromAutocompleteEndpoint = await fetchAvatarUrlsFromAutocompleteEndpoint()
    if (avatarsFromAutocompleteEndpoint.length) {
      return avatarsFromAutocompleteEndpoint
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
      match3Mode: activeMatch3Mode,
      match3TraditionalLayout: activeMatch3Mode,
      match3TraditionalMinimized: activeMatch3TraditionalMinimized,
      frameClassByAvatarKey: activeAvatarFrameByKey,
      onTraditionalMatch3MinimizedChange: updateTraditionalMatch3MinimizedState,
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
    activeMatch3Mode = readOptionValue('match3Mode') === true
    activeMatch3TraditionalMinimized = readTraditionalMatch3MinimizedState()
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
    applyWhen: () => {
      if (isStatusPage()) return true

      return isTimelinePage()
    },

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
