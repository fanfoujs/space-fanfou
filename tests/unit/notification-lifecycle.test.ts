import { fakeBrowser } from '@webext-core/fake-browser'

vi.mock('../../src/background/environment/settings', () => ({
  default: { read: () => false },
}))
vi.mock('../../src/background/environment/messaging', () => ({
  default: { broadcastMessage: vi.fn(), invoke: vi.fn() },
}))

test('notification targets and expiry survive recreating the background module', async () => {
  let notification = (await import('../../src/background/modules/notification'))
    .default
  await notification.ready()
  await notification.create({
    id: 'mentions',
    title: '测试',
    message: '新消息',
    targetUrl: 'https://fanfou.com/mentions',
    timeout: 15000,
  })
  expect(
    (await fakeBrowser.alarms.get('notification-expire/mentions'))?.name,
  ).toBe('notification-expire/mentions')
  vi.resetModules()
  notification = (await import('../../src/background/modules/notification'))
    .default
  const { events } = await import('../../src/platform/events')
  await notification.ready()
  const create = vi.spyOn(fakeBrowser.tabs, 'create')
  await events.notificationClicked.dispatch('mentions')
  expect(create).toHaveBeenCalledWith({
    url: 'https://fanfou.com/mentions',
    active: true,
  })
  expect(await fakeBrowser.notifications.getAll()).toEqual({})
  expect(
    (await fakeBrowser.storage.session.get('notification/mentions'))[
      'notification/mentions'
    ],
  ).toBeUndefined()
})

test('expiry alarm removes a notification without relying on an in-memory timer', async () => {
  const notification = (
    await import('../../src/background/modules/notification')
  ).default
  const { events } = await import('../../src/platform/events')
  await notification.ready()
  await notification.create({ id: 'expires', message: '临时提醒' })
  await events.alarm.dispatch({
    name: 'notification-expire/expires',
    scheduledTime: Date.now(),
    persistAcrossSessions: true,
  })
  expect(await fakeBrowser.notifications.getAll()).toEqual({})
  expect(
    await fakeBrowser.alarms.get('notification-expire/expires'),
  ).toBeUndefined()
})
