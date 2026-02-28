import parseHTML from '@libs/parseHTML'
import getLoggedInUserId from '@libs/getLoggedInUserId'
import { isTimelinePage, isStatusPage } from '@libs/pageDetect'

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
const DEFAULT_MATCH3_MODE = false
const DEFAULT_REFRESH_INTERVAL_DAYS = 7
const MAX_RENDER_AVATARS = 520
const MAX_API_PAGES = 8
const MAX_WEB_PAGES = 8
const LEFT_PANE_CENTER_GUTTER = 14
const RIGHT_PANE_CENTER_GUTTER = 14
const SHEEP_TARGET_TYPE_COUNT = 13
const SHEEP_MIN_TYPE_COUNT = 3
const SHEEP_TRAY_LIMIT = 7
const SHEEP_STACK_REPEAT_FACTOR = 1.9
const SHEEP_STACK_OVERLAP_PX = 22
const SHEEP_LAYER_OFFSET_PX = 5
const SHEEP_BASE_SLOT_RATIO = 0.72
const SHEEP_OVERLAY_SLOT_RATIO = 0.22
const SHEEP_HISTORY_LIMIT = 40
const SHEEP_STATUS_PLAYING = 'playing'
const SHEEP_STATUS_FAILED = 'failed'
const SHEEP_STATUS_CLEARED = 'cleared'
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

function splitItemsForPanes({ items, leftCapacity, rightCapacity }) {
  const leftItems = []
  const rightItems = []

  for (const item of items) {
    const shouldPushLeft = leftItems.length <= rightItems.length

    if (shouldPushLeft && leftItems.length < leftCapacity) {
      leftItems.push(item)
      continue
    }

    if (rightItems.length < rightCapacity) {
      rightItems.push(item)
      continue
    }

    if (leftItems.length < leftCapacity) {
      leftItems.push(item)
      continue
    }

    break
  }

  return { leftItems, rightItems }
}

function pickRandomItem(items) {
  if (!items.length) return ''

  return items[Math.floor(Math.random() * items.length)]
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

function resolveSheepTypeCount({
  uniqueAvatarCount,
  playableTileCount,
}) {
  const maxTriples = Math.max(1, Math.floor(playableTileCount / 3))
  const hardCap = Math.min(SHEEP_TARGET_TYPE_COUNT, uniqueAvatarCount, maxTriples)

  if (hardCap >= SHEEP_MIN_TYPE_COUNT) return hardCap

  return hardCap
}

function createSheepTileDeck({
  urls,
  totalSlots,
}) {
  const uniqueUrls = dedupeAndNormalize(urls)
  const estimatedTileCount = Math.max(
    totalSlots,
    Math.floor(totalSlots * SHEEP_STACK_REPEAT_FACTOR),
  )
  const playableTileCount = Math.floor(estimatedTileCount / 3) * 3

  if (!uniqueUrls.length || playableTileCount < 3) {
    return []
  }

  const typeCount = resolveSheepTypeCount({
    uniqueAvatarCount: uniqueUrls.length,
    playableTileCount,
  })

  if (!typeCount) return []

  const typeUrls = shuffle([ ...uniqueUrls ])
    .slice(0, typeCount)
  if (!typeUrls.length) return []

  const tripleGroupCount = playableTileCount / 3
  const tripleTypeOrder = []

  for (let index = 0; index < tripleGroupCount; index++) {
    tripleTypeOrder.push(index % typeCount)
  }

  shuffle(tripleTypeOrder)

  const tiles = []
  let tileSerial = 0

  for (const typeIndex of tripleTypeOrder) {
    const typeUrl = typeUrls[typeIndex]
    if (!typeUrl) continue

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

  return shuffle(tiles)
}

function createSheepPaneLayout({
  rows,
  columns,
  tileSize,
}) {
  if (!rows || !columns) {
    return {
      slots: [],
      boardWidth: 0,
      boardHeight: 0,
    }
  }

  const pitch = Math.max(10, tileSize - SHEEP_STACK_OVERLAP_PX)
  const slots = []
  const slotById = new Map()

  function addSlot(slot) {
    slots.push(slot)
    slotById.set(slot.slotId, slot)
  }

  const centerRow = (rows - 1) / 2
  const centerColumn = (columns - 1) / 2
  const rowRadius = Math.max(1, rows / 2)
  const columnRadius = Math.max(1, columns / 2)
  const totalGridCount = rows * columns
  const baseSlotTarget = clamp(
    Math.floor(totalGridCount * SHEEP_BASE_SLOT_RATIO),
    Math.min(9, totalGridCount),
    totalGridCount,
  )
  const baseCandidates = []

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const normalizedRow = (row - centerRow) / rowRadius
      const normalizedColumn = (column - centerColumn) / columnRadius
      const distanceScore = (
        normalizedColumn * normalizedColumn * 0.92
        + normalizedRow * normalizedRow * 1.14
      )
      const randomBias = deterministicUnit(row + 1, column + 1, rows, columns)

      baseCandidates.push({
        row,
        column,
        priority: distanceScore + randomBias * 0.34,
      })
    }
  }

  const selectedBaseCandidates = [ ...baseCandidates ]
    .sort((left, right) => left.priority - right.priority)
    .slice(0, baseSlotTarget)
  if (!selectedBaseCandidates.length) {
    selectedBaseCandidates.push({
      row: Math.floor(rows / 2),
      column: Math.floor(columns / 2),
      priority: 0,
    })
  }

  const selectedBaseSlotIds = new Set()
  for (const candidate of selectedBaseCandidates) {
    const { row, column } = candidate
    const slotId = `base-${row}-${column}`
    const jitterX = Math.round((
      deterministicUnit(row + 1, column + 1, 17) - 0.5
    ) * SHEEP_LAYER_OFFSET_PX)
    const jitterY = Math.round((
      deterministicUnit(row + 1, column + 1, 23) - 0.5
    ) * SHEEP_LAYER_OFFSET_PX)

    selectedBaseSlotIds.add(slotId)
    addSlot({
      slotId,
      row,
      column,
      x: column * pitch + jitterX,
      y: row * pitch + jitterY,
      coveredBySlotIds: [],
    })
  }

  const overlayCandidates = []
  for (let row = 0; row < rows - 1; row++) {
    for (let column = 0; column < columns - 1; column++) {
      const coverIds = [
        `base-${row}-${column}`,
        `base-${row + 1}-${column}`,
        `base-${row}-${column + 1}`,
        `base-${row + 1}-${column + 1}`,
      ].filter(slotId => selectedBaseSlotIds.has(slotId))
      if (coverIds.length < 3) continue

      const normalizedRow = (row + 0.5 - centerRow) / rowRadius
      const normalizedColumn = (column + 0.5 - centerColumn) / columnRadius
      const distanceScore = (
        normalizedColumn * normalizedColumn * 0.85
        + normalizedRow * normalizedRow * 1.08
      )

      overlayCandidates.push({
        row,
        column,
        coverIds,
        priority: distanceScore + deterministicUnit(row + 1, column + 1, 31) * 0.38,
      })
    }
  }

  const overlayTargetCount = Math.min(
    overlayCandidates.length,
    Math.max(1, Math.floor(selectedBaseCandidates.length * SHEEP_OVERLAY_SLOT_RATIO)),
  )
  for (const overlay of overlayCandidates
    .sort((left, right) => left.priority - right.priority)
    .slice(0, overlayTargetCount)
  ) {
    const { row, column, coverIds } = overlay
    const overlayId = `overlay-${row}-${column}`
    const jitterX = Math.round((
      deterministicUnit(row + 1, column + 1, 47) - 0.5
    ) * SHEEP_LAYER_OFFSET_PX)
    const jitterY = Math.round((
      deterministicUnit(row + 1, column + 1, 53) - 0.5
    ) * SHEEP_LAYER_OFFSET_PX)

    addSlot({
      slotId: overlayId,
      row: row + 0.5,
      column: column + 0.5,
      x: column * pitch + Math.floor(pitch / 2) + jitterX,
      y: row * pitch + Math.floor(pitch / 2) + jitterY,
      coveredBySlotIds: [],
    })

    for (const coveredSlotId of coverIds) {
      slotById.get(coveredSlotId).coveredBySlotIds.push(overlayId)
    }
  }

  if (!slots.length) {
    return {
      slots,
      boardWidth: 0,
      boardHeight: 0,
    }
  }

  const minX = Math.min(...slots.map(slot => slot.x))
  const minY = Math.min(...slots.map(slot => slot.y))
  if (minX < 0 || minY < 0) {
    const offsetX = minX < 0 ? Math.abs(minX) : 0
    const offsetY = minY < 0 ? Math.abs(minY) : 0

    for (const slot of slots) {
      slot.x += offsetX
      slot.y += offsetY
    }
  }

  const boardWidth = Math.max(
    tileSize,
    ...slots.map(slot => slot.x + tileSize),
  )
  const boardHeight = Math.max(
    tileSize,
    ...slots.map(slot => slot.y + tileSize),
  )

  return {
    slots,
    boardWidth,
    boardHeight,
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

  const activeStackCount = clamp(
    Math.floor(allStacks.length * 0.8),
    1,
    allStacks.length,
  )
  const activeStacks = shuffle([ ...allStacks ])
    .slice(0, activeStackCount)
  const shuffledTiles = shuffle([ ...tiles ])

  shuffledTiles.forEach((tile, index) => {
    const stackIndex = index % activeStacks.length
    activeStacks[stackIndex].tiles.push(tile)
  })

  for (const stack of activeStacks) {
    shuffle(stack.tiles)
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
      x: stack.x,
      y: stack.y,
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

function renderSheepPaneBoard({
  board,
  stacks,
  state,
}) {
  const fragment = document.createDocumentFragment()

  for (const stackState of stacks) {
    const depth = stackState.tiles.length
    if (!depth) continue

    const stackSlot = document.createElement('span')

    stackSlot.className = 'sf-match3-stack-slot'
    stackSlot.style.left = `${stackState.x}px`
    stackSlot.style.top = `${stackState.y}px`
    stackSlot.style.zIndex = String(200 + Math.round(stackState.y) + depth)

    const selectable = isStackSelectable(state, stackState)
    const topTile = stackState.tiles[depth - 1]

    if (!selectable) {
      stackSlot.classList.add('is-match3-blocked')
    }

    const tile = document.createElement('button')
    const badge = document.createElement('span')
    const depthLevel = Math.min(4, Math.max(0, depth - 1))

    tile.type = 'button'
    tile.className = 'sf-avatar-wallpaper-tile sf-match3-tile'
    tile.classList.add(topTile.frameClass, topTile.typeClass)
    tile.dataset.tileId = topTile.tileId
    tile.dataset.stackId = stackState.stackId
    tile.style.backgroundImage = `url("${topTile.url}")`
    tile.style.setProperty('--sf-match3-stack-shadow-offset', `${depthLevel * 1.3}px`)
    tile.style.setProperty('--sf-match3-stack-shadow-alpha', String(0.14 + depthLevel * 0.06))
    tile.disabled = !selectable

    if (!selectable) {
      tile.classList.add('is-match3-blocked')
    }

    badge.className = 'sf-match3-type-badge'
    badge.textContent = topTile.typeLabel

    tile.append(badge)
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

  if (state.tray.length > state.trayLimit) {
    state.status = SHEEP_STATUS_FAILED
  }
}

function renderSheepTray({
  container,
  trayStatus,
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
      const badge = document.createElement('span')

      tile.className = 'sf-avatar-wallpaper-tile sf-match3-tray-tile'
      tile.classList.add(slotTile.frameClass, slotTile.typeClass)
      tile.style.backgroundImage = `url("${slotTile.url}")`

      badge.className = 'sf-match3-type-badge'
      badge.textContent = slotTile.typeLabel

      tile.append(badge)
      slot.append(tile)
    }

    fragment.append(slot)
  }

  traySlots.replaceChildren(fragment)

  container.classList.remove('is-match3-cleared', 'is-match3-failed')
  if (state.status === SHEEP_STATUS_CLEARED) {
    container.classList.add('is-match3-cleared')
    trayStatus.textContent = '清空成功，通关！'
    return
  }

  if (state.status === SHEEP_STATUS_FAILED) {
    container.classList.add('is-match3-failed')
    trayStatus.textContent = '槽位已满，已失败。点右下“重开”再来一局。'
    return
  }

  trayStatus.textContent = `剩余 ${state.remainingTiles} | 槽位 ${state.tray.length}/${state.trayLimit}`
}

function renderSheepControls({
  state,
  history,
  undoButton,
  shuffleButton,
  restartButton,
}) {
  undoButton.disabled = history.length === 0
  shuffleButton.disabled = state.status !== SHEEP_STATUS_PLAYING || state.remainingTiles <= 1
  restartButton.disabled = false
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
  ghost.classList.add(tile.frameClass, tile.typeClass)
  ghost.style.backgroundImage = `url("${tile.url}")`
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
  leftStacks,
  rightStacks,
  resolveFrameClass,
}) {
  const state = createSheepGameState({
    leftStacks,
    rightStacks,
    resolveFrameClass,
  })
  const history = []
  const initialSnapshot = captureSheepStateSnapshot(state)
  const trayBar = document.createElement('div')
  const trayStatus = document.createElement('div')
  const traySlots = document.createElement('div')
  const controls = document.createElement('div')
  const undoButton = document.createElement('button')
  const shuffleButton = document.createElement('button')
  const restartButton = document.createElement('button')

  trayBar.className = 'sf-match3-tray'
  trayStatus.className = 'sf-match3-tray-status'
  traySlots.className = 'sf-match3-tray-slots'
  trayBar.append(trayStatus, traySlots)
  controls.className = 'sf-match3-controls'

  undoButton.type = 'button'
  undoButton.className = 'sf-match3-control-button'
  undoButton.dataset.action = 'undo'
  undoButton.textContent = '反悔'

  shuffleButton.type = 'button'
  shuffleButton.className = 'sf-match3-control-button'
  shuffleButton.dataset.action = 'shuffle'
  shuffleButton.textContent = '打乱'

  restartButton.type = 'button'
  restartButton.className = 'sf-match3-control-button is-emphasis'
  restartButton.dataset.action = 'restart'
  restartButton.textContent = '重开'

  controls.append(undoButton, shuffleButton, restartButton)
  container.append(trayBar)
  container.append(controls)

  const render = () => {
    renderSheepPaneBoard({
      board: leftBoard,
      stacks: state.panes.left,
      state,
    })
    renderSheepPaneBoard({
      board: rightBoard,
      stacks: state.panes.right,
      state,
    })
    renderSheepTray({
      container,
      trayStatus,
      traySlots,
      state,
    })
    renderSheepControls({
      state,
      history,
      undoButton,
      shuffleButton,
      restartButton,
    })
  }

  controls.addEventListener('click', event => {
    const actionButton = event.target.closest('.sf-match3-control-button')
    if (!actionButton || !controls.contains(actionButton)) return
    if (actionButton.disabled) return

    const { action } = actionButton.dataset
    if (action === 'undo') {
      const snapshot = history.pop()
      if (!snapshot) return

      restoreSheepStateSnapshot(state, snapshot)
      render()
      return
    }

    if (action === 'shuffle') {
      pushSheepHistory(history, state)
      shuffleRemainingSheepTiles(state)
      render()
      return
    }

    if (action === 'restart') {
      restoreSheepStateSnapshot(state, initialSnapshot)
      history.length = 0
      render()
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

    stackState.tiles.pop()
    state.tileById.delete(tileId)
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
  frameClassByAvatarKey,
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
  const { tileSize, tileGap } = resolveLayout(renderUrls.length)
  const { left: leftPaneWidth, right: rightPaneWidth } = resolveSidePaneWidths()
  const leftPaneMetrics = getPaneCapacity({
    paneWidth: leftPaneWidth,
    tileSize,
    tileGap,
  })
  const rightPaneMetrics = getPaneCapacity({
    paneWidth: rightPaneWidth,
    tileSize,
    tileGap,
  })
  const paneColumns = Math.min(leftPaneMetrics.columns, rightPaneMetrics.columns)
  if (!paneColumns) return

  const leftPlayableRows = match3Mode
    ? Math.max(0, leftPaneMetrics.rows - 1)
    : leftPaneMetrics.rows
  const rightPlayableRows = match3Mode
    ? Math.max(0, rightPaneMetrics.rows - 1)
    : rightPaneMetrics.rows
  const leftPaneCapacity = leftPlayableRows * paneColumns
  const rightPaneCapacity = rightPlayableRows * paneColumns

  const container = document.createElement('div')
  const leftPane = document.createElement('div')
  const rightPane = document.createElement('div')

  container.id = CONTAINER_ID
  container.style.opacity = fillBlueOnlyInGaps
    ? '1'
    : String(opacity)
  container.style.setProperty('--sf-avatar-wallpaper-columns', paneColumns)
  container.style.setProperty('--sf-avatar-wallpaper-tile-size', `${tileSize}px`)
  container.style.setProperty('--sf-avatar-wallpaper-tile-gap', `${tileGap}px`)
  container.style.setProperty('--sf-match3-overlap', `${SHEEP_STACK_OVERLAP_PX}px`)
  container.style.setProperty('--sf-match3-layer-offset', `${SHEEP_LAYER_OFFSET_PX}px`)
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

  if (match3Mode) {
    container.classList.add('sf-avatar-wallpaper-match3')
    const leftLayout = createSheepPaneLayout({
      rows: leftPlayableRows,
      columns: paneColumns,
      tileSize,
    })
    const rightLayout = createSheepPaneLayout({
      rows: rightPlayableRows,
      columns: paneColumns,
      tileSize,
    })
    const totalSlotCount = leftLayout.slots.length + rightLayout.slots.length
    if (!totalSlotCount) return

    const sheepTiles = createSheepTileDeck({
      urls: renderUrls,
      totalSlots: totalSlotCount,
    })
    if (!sheepTiles.length) return

    const {
      leftStacks,
      rightStacks,
    } = createSheepPaneStacks({
      tiles: sheepTiles,
      leftLayout,
      rightLayout,
    })

    if (!leftStacks.length && !rightStacks.length) return

    const leftBoard = document.createElement('div')
    const rightBoard = document.createElement('div')
    leftBoard.className = 'sf-match3-board'
    leftBoard.style.width = `${Math.ceil(leftLayout.boardWidth)}px`
    leftBoard.style.height = `${Math.ceil(leftLayout.boardHeight)}px`
    rightBoard.className = 'sf-match3-board'
    rightBoard.style.width = `${Math.ceil(rightLayout.boardWidth)}px`
    rightBoard.style.height = `${Math.ceil(rightLayout.boardHeight)}px`
    leftPane.append(leftBoard)
    rightPane.append(rightBoard)

    mountSheepMode({
      container,
      leftBoard,
      rightBoard,
      leftStacks,
      rightStacks,
      resolveFrameClass,
    })
  } else {
    const {
      leftItems: leftUrls,
      rightItems: rightUrls,
    } = splitItemsForPanes({
      items: renderUrls,
      leftCapacity: leftPaneCapacity,
      rightCapacity: rightPaneCapacity,
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
  let activeMatch3Mode = DEFAULT_MATCH3_MODE
  const activeAvatarFrameByKey = new Map()
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
      match3Mode: activeMatch3Mode,
      frameClassByAvatarKey: activeAvatarFrameByKey,
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
