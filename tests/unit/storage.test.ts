import { fakeBrowser } from '@webext-core/fake-browser'
import {
  createStorageArea,
  clearFallbackSession,
} from '../../src/platform/storage'

test('existing local and sync settings keep their keys and survive a new facade', async () => {
  const local = createStorageArea('local')
  const sync = createStorageArea('sync')
  await fakeBrowser.storage.local.set({
    settings: { notifications: false },
    'fanfou-oauth/tokens': { oauthToken: 'saved' },
  })
  await sync.write('settings', { 'auto-pager': false })
  expect(await local.read('settings')).toEqual({ notifications: false })
  expect(await sync.read('settings')).toEqual({ 'auto-pager': false })
  expect(await createStorageArea('local').read('fanfou-oauth/tokens')).toEqual({
    oauthToken: 'saved',
  })
})

test('unchanged settings do not consume sync write quota', async () => {
  const sync = createStorageArea('sync')
  await sync.write('settings', { enabled: false })
  const set = vi.spyOn(fakeBrowser.storage.sync, 'set')
  await sync.write('settings', { enabled: false })
  await sync.writeAll({ settings: { enabled: false } })
  expect(set).not.toHaveBeenCalled()
})

test('session state survives worker recreation', async () => {
  await createStorageArea('session').write('counts', { mentions: 3 })
  expect(await createStorageArea('session').read('counts')).toEqual({
    mentions: 3,
  })
  await clearFallbackSession()
  expect(await createStorageArea('session').read('counts')).toEqual({
    mentions: 3,
  })
})
