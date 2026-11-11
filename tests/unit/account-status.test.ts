const state = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('../../src/settings/messaging', () => ({
  default: { postMessage: state.send },
}))

const cached = { loggedIn: true, userId: 'tester', screenName: '缓存的名字' }
let account: typeof import('../../src/settings/accountStatus')

beforeEach(async () => {
  vi.resetModules()
  state.send.mockReset()
  account = await import('../../src/settings/accountStatus')
})

function holdCheck() {
  let finish!: (value: unknown) => void
  const response = new Promise((resolve) => {
    finish = resolve
  })
  state.send.mockImplementation(({ payload }) =>
    payload.cached ? Promise.resolve({ status: cached }) : response,
  )
  return finish
}

test('publishes the cached name before a slow check finishes, then replaces it with the fresh name', async () => {
  const finish = holdCheck()
  const listener = vi.fn()
  const unsubscribe = account.subscribeAccountStatus(listener)
  const checking = account.refreshAccountStatus()
  await vi.waitFor(() =>
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: cached,
        loading: false,
        checking: true,
      }),
    ),
  )
  finish({ status: { ...cached, screenName: '更新的名字' } })
  await checking
  expect(listener).toHaveBeenLastCalledWith(
    expect.objectContaining({
      status: { ...cached, screenName: '更新的名字' },
      checking: false,
    }),
  )
  unsubscribe()
})

test('composer and settings share a single in-flight network check', async () => {
  const finish = holdCheck()
  const removeComposer = account.subscribeAccountStatus(vi.fn())
  const removeSettings = account.subscribeAccountStatus(vi.fn())
  const first = account.refreshAccountStatus()
  const second = account.refreshAccountStatus()
  expect(second).toBe(first)
  await vi.waitFor(() => expect(state.send).toHaveBeenCalledTimes(2))
  expect(
    state.send.mock.calls.filter(([message]) => !message.payload.cached),
  ).toHaveLength(1)
  finish({ status: cached })
  await first
  removeComposer()
  removeSettings()
})

test('a temporary network failure preserves the cached account and clears the spinner', async () => {
  state.send.mockImplementation(({ payload }) =>
    payload.cached
      ? Promise.resolve({ status: cached })
      : Promise.reject(new Error('offline')),
  )
  const listener = vi.fn()
  const unsubscribe = account.subscribeAccountStatus(listener)
  await account.refreshAccountStatus()
  expect(listener).toHaveBeenLastCalledWith(
    expect.objectContaining({
      status: cached,
      checking: false,
      needsReload: false,
      checkError: expect.stringContaining('上次保存'),
    }),
  )
  unsubscribe()
})

test('a delayed silent check cannot undo an explicit logout', async () => {
  const finish = holdCheck()
  const listener = vi.fn()
  const unsubscribe = account.subscribeAccountStatus(listener)
  const checking = account.refreshAccountStatus()
  await vi.waitFor(() =>
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: cached }),
    ),
  )
  account.invalidateAccountCheck()
  const loggedOut = { loggedIn: false, userId: null, screenName: null }
  account.acceptAccountStatus(loggedOut)
  finish({ status: cached })
  await checking
  expect(listener).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: loggedOut, checking: false }),
  )
  unsubscribe()
})

test('a profile rate limit keeps the confirmed login and only adds a nonblocking update hint', async () => {
  const finish = holdCheck()
  const listener = vi.fn()
  const unsubscribe = account.subscribeAccountStatus(listener)
  const checking = account.refreshAccountStatus()
  await vi.waitFor(() => expect(state.send).toHaveBeenCalledTimes(2))
  finish({ status: { ...cached, profileError: '尝试次数过多' } })
  await checking
  expect(listener).toHaveBeenLastCalledWith(
    expect.objectContaining({
      status: expect.objectContaining({
        loggedIn: true,
        screenName: cached.screenName,
      }),
      checking: false,
      checkError: expect.stringContaining('上次保存'),
    }),
  )
  unsubscribe()
})

test('an invalidated check cannot block or clear a newer check after account management', async () => {
  let finishOld!: (value: unknown) => void
  let finishNew!: (value: unknown) => void
  const oldResponse = new Promise((resolve) => {
    finishOld = resolve
  })
  const newResponse = new Promise((resolve) => {
    finishNew = resolve
  })
  let requests = 0
  state.send.mockImplementation(({ payload }) =>
    payload.cached
      ? Promise.resolve({ status: cached })
      : ++requests === 1
        ? oldResponse
        : newResponse,
  )
  const listener = vi.fn()
  const unsubscribe = account.subscribeAccountStatus(listener)
  const first = account.refreshAccountStatus()
  await vi.waitFor(() => expect(state.send).toHaveBeenCalledTimes(2))
  account.invalidateAccountCheck()
  account.acceptAccountStatus({ loggedIn: false })
  const second = account.refreshAccountStatus()
  await vi.waitFor(() => expect(state.send).toHaveBeenCalledTimes(3))
  finishOld({ status: cached })
  await first
  expect(account.refreshAccountStatus()).toBe(second)
  finishNew({ status: { loggedIn: false } })
  await second
  expect(listener).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: { loggedIn: false }, checking: false }),
  )
  unsubscribe()
})
