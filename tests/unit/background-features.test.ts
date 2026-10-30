import { fakeBrowser } from '@webext-core/fake-browser'
import savedSearches from '../../src/features/check-saved-searches/service@background'
import notifications from '../../src/features/notifications/service@background'
import { events } from '../../src/platform/events'
import messaging from '../../src/background/environment/messaging'

vi.mock('../../src/background/environment/messaging', () => ({
  default: {
    registerHandler: vi.fn(),
    unregisterHandler: vi.fn(),
  },
}))

test('saved topics check repeatedly and retain unread state for keywords containing dots', async () => {
  let time = '2026-10-27T00:00:00Z'
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('/search'))
        return new Response(
          JSON.stringify({
            data: {
              timeline: `<li><a class="author" href="/friend">朋友</a><span class="stamp"><a class="time" href="/statuses/123" stime="${time}"></a></span><span class="content">测试</span></li>`,
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        )
      return new Response(
        '<ul id="navigation"><li><a href="/tester">我的空间</a></li></ul><div id="savedsearchs"><ul><li><a><span class="label">node.js</span></a></li></ul></div>',
      )
    }),
  )
  const values = new Map<string, any>()
  const storage = {
    read: async (key: string, area: string) => values.get(area + ':' + key),
    write: async (key: string, value: unknown, area: string) => {
      values.set(area + ':' + key, structuredClone(value))
    },
  }
  const service = savedSearches({
    readOptionValue: () => false,
    requireModules: () => ({ storage, notification: { create: vi.fn() } }),
  })
  service.onLoad()
  try {
    await vi.waitFor(() =>
      expect(values.has('sync:saved-searches/readTimestampUserMap')).toBe(true),
    )
    time = '2026-10-28T00:00:00Z'
    await events.alarm.dispatch({
      name: 'saved-searches-check',
      scheduledTime: Date.now(),
      persistAcrossSessions: true,
    })
    const read = vi
      .mocked(messaging.registerHandler)
      .mock.calls.find(([type]) => type === 'SAVED_SEARCHES_READ')![1]
    expect(await read({ userId: 'tester', keyword: 'node.js' })).toBe(true)
    const write = vi
      .mocked(messaging.registerHandler)
      .mock.calls.find(([type]) => type === 'SAVED_SEARCHES_WRITE')![1]
    await write({ userId: 'tester', keyword: 'node.js' })
    expect(await read({ userId: 'tester', keyword: 'node.js' })).toBe(false)
    expect(
      values.get('sync:saved-searches/readTimestampUserMap').tester['node.js'],
    ).toBe(Date.parse(time))
    expect(
      (await fakeBrowser.alarms.get('saved-searches-check'))?.periodInMinutes,
    ).toBe(5)
  } finally {
    service.onUnload()
    vi.unstubAllGlobals()
  }
})

test('unread notifications keep their repeating alarm after several checks and restore count history', async () => {
  let count = 1
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          `<div id="nav"><a accesskey="1" href="/tester">我的空间</a>@我的(${count})</div>`,
        ),
    ),
  )
  const create = vi.fn()
  const service = notifications({
    readOptionValue: (key: string) => key !== 'doNotDisturbWhenVisitingFanfou',
    requireModules: () => ({ notification: { create, hide: vi.fn() } }),
  })
  service.onLoad()
  try {
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    await events.alarm.dispatch({
      name: 'notifications-check',
      scheduledTime: Date.now(),
      persistAcrossSessions: true,
    })
    expect(create).toHaveBeenCalledTimes(1)
    count = 2
    await events.alarm.dispatch({
      name: 'notifications-check',
      scheduledTime: Date.now(),
      persistAcrossSessions: true,
    })
    expect(create).toHaveBeenCalledTimes(2)
    expect(
      (await fakeBrowser.alarms.get('notifications-check'))?.periodInMinutes,
    ).toBe(1)
    const counts = (
      await fakeBrowser.storage.local.get('notification_counts_tester')
    ).notification_counts_tester as {
      currentCounts: { unreadMentions: number }
    }
    expect(counts.currentCounts.unreadMentions).toBe(2)
  } finally {
    service.onUnload()
    vi.unstubAllGlobals()
  }
})
