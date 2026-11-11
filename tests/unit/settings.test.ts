const state = vi.hoisted(() => ({
  values: new Map<string, any>(),
  handlers: new Map<string, (payload?: any) => Promise<any>>(),
  listeners: [] as ((message: any) => Promise<void>)[],
  syncEvents: [] as any[],
  failSync: false,
}))

vi.mock('@features', () => ({
  default: {
    replies: {
      metadata: {
        defaultValues: {
          'show-contextual-statuses': true,
          'show-contextual-statuses/autoFetch': false,
          notifications: true,
          'notifications/playSound': false,
        },
        optionStorageAreaMap: {
          'show-contextual-statuses': 'sync',
          'show-contextual-statuses/autoFetch': 'sync',
          notifications: 'local',
          'notifications/playSound': 'sync',
        },
      },
    },
  },
}))
vi.mock('../../src/background/environment/messaging', () => ({
  default: {
    registerHandler: (action: string, handler: any) =>
      state.handlers.set(action, handler),
    registerBroadcastListener: (listener: any) =>
      state.listeners.push(listener),
    broadcastMessage: vi.fn(),
  },
}))
vi.mock('../../src/background/environment/storage', () => ({
  default: {
    read: async (key: string, area: string) =>
      structuredClone(state.values.get(`${area}:${key}`)),
    write: async (key: string, value: any, area: string) => {
      if (state.failSync && area === 'sync')
        throw new Error('Sync write quota exceeded')
      const oldValue = state.values.get(`${area}:${key}`)
      state.values.set(`${area}:${key}`, structuredClone(value))
      if (
        area === 'sync' &&
        key === 'settings' &&
        JSON.stringify(oldValue) !== JSON.stringify(value)
      ) {
        state.syncEvents.push({
          action: 'STORAGE_CHANGED',
          payload: {
            key,
            storageAreaName: area,
            oldValue,
            newValue: structuredClone(value),
          },
        })
      }
    },
  },
}))
vi.mock('../../src/platform/legacy-storage', () => ({
  getLegacyStorage: () => ({ settings: null, version: null }),
}))
vi.mock('../../src/libs/getExtensionVersion', () => ({
  default: () => '2.0.1',
}))

const autoFetch = 'show-contextual-statuses/autoFetch'
async function loadSettings() {
  vi.resetModules()
  state.handlers.clear()
  state.listeners.length = 0
  const { default: settings } =
    await import('../../src/background/environment/settings')
  await settings.install()
  return settings
}
async function deliverSyncEvents() {
  let delivered = 0
  while (state.syncEvents.length) {
    if (++delivered > 20)
      throw new Error(
        'Settings changes are bouncing between local and sync storage',
      )
    const event = state.syncEvents.shift()
    for (const listener of state.listeners) await listener(event)
  }
}
beforeEach(() => {
  state.values.clear()
  state.syncEvents.length = 0
  state.failSync = false
})
afterEach(() => vi.restoreAllMocks())

test('reload keeps an explicitly disabled local option when sync still has an older enabled value', async () => {
  state.values.set('local:settings', { [autoFetch]: false })
  state.values.set('sync:settings', {
    [autoFetch]: true,
    'notifications/playSound': true,
  })
  const settings = await loadSettings()
  expect(settings.read(autoFetch)).toBe(false)
  expect(settings.read('notifications/playSound')).toBe(true)
})

test('sync failure does not undo a saved option after the background restarts', async () => {
  const settings = await loadSettings()
  await settings.writeAll({ ...settings.readAll(), [autoFetch]: true })
  await deliverSyncEvents()
  state.failSync = true
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  await expect(
    settings.writeAll({ ...settings.readAll(), [autoFetch]: false }),
  ).resolves.toBeUndefined()
  expect(state.values.get('local:settings')[autoFetch]).toBe(false)
  expect(state.values.get('sync:settings')[autoFetch]).toBe(true)
  const restarted = await loadSettings()
  expect(restarted.read(autoFetch)).toBe(false)
  state.failSync = false
})

test('delayed sync echoes cannot revert newer changes', async () => {
  const settings = await loadSettings()
  await deliverSyncEvents()
  await settings.writeAll({ ...settings.readAll(), [autoFetch]: true })
  await settings.writeAll({ ...settings.readAll(), [autoFetch]: false })
  await deliverSyncEvents()
  expect(settings.read(autoFetch)).toBe(false)
  expect(state.values.get('local:settings')[autoFetch]).toBe(false)
  expect(state.values.get('sync:settings')[autoFetch]).toBe(false)
})

test('each settings window updates only its changed option', async () => {
  const settings = await loadSettings()
  await deliverSyncEvents()
  await settings.writeAll({ ...settings.readAll(), [autoFetch]: true })
  await Promise.all([
    state.handlers.get('SETTINGS_WRITE')!({ key: autoFetch, value: false }),
    state.handlers.get('SETTINGS_WRITE')!({
      key: 'notifications/playSound',
      value: true,
    }),
  ])
  await deliverSyncEvents()
  expect(settings.read(autoFetch)).toBe(false)
  expect(settings.read('notifications/playSound')).toBe(true)
})

test('remote sync changes still apply without changing unrelated local settings', async () => {
  const settings = await loadSettings()
  await settings.writeAll({ ...settings.readAll(), notifications: false })
  await deliverSyncEvents()
  const oldValue = structuredClone(state.values.get('sync:settings'))
  const newValue = { ...oldValue, [autoFetch]: true }
  state.values.set('sync:settings', newValue)
  for (const listener of state.listeners)
    await listener({
      action: 'STORAGE_CHANGED',
      payload: { key: 'settings', storageAreaName: 'sync', oldValue, newValue },
    })
  await deliverSyncEvents()
  expect(settings.read(autoFetch)).toBe(true)
  expect(settings.read('notifications')).toBe(false)
})

test('remote changes received while the background is asleep survive restart when local settings were synced', async () => {
  const settings = await loadSettings()
  await settings.writeAll({ ...settings.readAll(), notifications: false })
  await deliverSyncEvents()
  const synced = state.values.get('sync:settings')
  state.values.set('sync:settings', {
    ...synced,
    [autoFetch]: true,
    notifications: true,
  })
  const restarted = await loadSettings()
  expect(restarted.read(autoFetch)).toBe(true)
  expect(restarted.read('notifications')).toBe(false)
})
