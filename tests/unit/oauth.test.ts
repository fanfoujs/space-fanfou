const state = vi.hoisted(() => ({
  handlers: new Map<string, (payload?: any) => Promise<any>>(),
  storage: new Map<string, any>(),
  createTab: vi.fn(),
  identity: undefined as
    | undefined
    | {
        getRedirectURL: (path: string) => string
        launchWebAuthFlow: ReturnType<typeof vi.fn>
      },
  options: { 'fanfou-oauth': true } as Record<string, unknown>,
}))
vi.mock('wxt/browser', () => ({
  browser: {
    get identity() {
      return state.identity
    },
    tabs: { create: state.createTab },
  },
}))
vi.mock('../../src/background/environment/messaging', () => ({
  default: {
    registerHandler: (type: string, handler: (payload?: any) => Promise<any>) =>
      state.handlers.set(type, handler),
  },
}))
vi.mock('../../src/background/environment/settings', () => ({
  default: { readAll: async () => state.options },
}))
vi.mock('../../src/background/environment/storage', () => ({
  default: {
    read: async (key: string, area: string) =>
      state.storage.get(area + ':' + key),
    write: async (key: string, value: unknown, area: string) => {
      state.storage.set(area + ':' + key, value)
    },
    delete: async (key: string, area: string) => {
      state.storage.delete(area + ':' + key)
    },
  },
}))
import oauth from '../../src/background/environment/fanfouOAuth'
import log from '../../src/libs/log'

const authorize = (payload?: unknown) =>
  state.handlers.get('FANFOU_OAUTH_AUTHORIZE')!(payload)
const pendingKey = 'session:fanfou-oauth/pending'
const tokenKey = 'local:fanfou-oauth/tokens'

beforeEach(async () => {
  state.storage.clear()
  state.identity = undefined
  state.options = { 'fanfou-oauth': true }
  state.createTab.mockReset()
  oauth.install()
  await state.handlers.get('FANFOU_OAUTH_CLEAR_TOKENS')!()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function mockAuthorization() {
  const requests: Request[] = []
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      requests.push(request)
      const path = new URL(request.url).pathname
      if (path === '/oauth/request_token')
        return new Response(
          'oauth_token=temporary&oauth_token_secret=temp-secret',
        )
      if (path === '/oauth/access_token')
        return new Response(
          'oauth_token=access&oauth_token_secret=access-secret',
        )
      return Response.json({
        id: '42',
        screen_name: 'tester',
        statuses_count: 7,
      })
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  return { requests, fetchMock }
}

function callbackIdentity(parameters: string) {
  const redirect = 'https://extension-test.chromiumapp.org/fanfou-oauth'
  state.identity = {
    getRedirectURL: () => redirect,
    launchWebAuthFlow: vi.fn(async () => `${redirect}?${parameters}`),
  }
  return { redirect, launch: state.identity.launchWebAuthFlow }
}

test('Safari can authorize without identity API, keep pending state, exchange tokens, and revoke', async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input)
    return new Response(
      url.includes('api.fanfou.com')
        ? JSON.stringify({
            id: '42',
            screen_name: 'tester',
            statuses_count: 7,
          })
        : url.includes('request_token')
          ? 'oauth_token=temporary&oauth_token_secret=temp-secret'
          : 'oauth_token=access&oauth_token_secret=access-secret&screen_name=tester&user_id=42',
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  oauth.install()
  try {
    const status = await state.handlers.get('FANFOU_OAUTH_GET_STATUS')!()
    expect(status.status.manualAuthorization).toBe(true)
    expect(status.status.redirectUrl).toBe('oob')
    const started = await state.handlers.get('FANFOU_OAUTH_AUTHORIZE')!()
    expect(started.status.pendingAuthorization).toBe(true)
    expect(state.createTab).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('oauth_callback=oob'),
      }),
    )
    const authorized = await state.handlers.get('FANFOU_OAUTH_AUTHORIZE')!({
      complete: true,
      verifier: '123456',
    })
    expect(authorized.status.hasTokens).toBe(true)
    expect(authorized.status.screenName).toBe('tester')
    expect(state.storage.has('session:fanfou-oauth/pending')).toBe(false)
    expect(state.storage.get('local:fanfou-oauth/tokens').oauthToken).toBe(
      'access',
    )
    const profile = await state.handlers.get('FANFOU_OAUTH_API_REQUEST')!({
      method: 'getUser',
      params: { id: '42' },
    })
    expect(profile.responseJSON).toMatchObject({
      id: '42',
      screenName: 'tester',
      statusesCount: 7,
    })
    const [accessInput, accessInit] = fetchMock.mock.calls.find(([input]) =>
      String(input).includes('access_token'),
    )! as unknown as [RequestInfo, RequestInit]
    const access = new Request(accessInput, accessInit)
    expect(access.method).toBe('POST')
    expect(access.credentials).toBe('omit')
    expect(new URLSearchParams(await access.text()).get('oauth_verifier')).toBe(
      '123456',
    )
    expect(
      (await state.handlers.get('FANFOU_OAUTH_CLEAR_TOKENS')!()).status
        .hasTokens,
    ).toBe(false)
  } finally {
    vi.unstubAllGlobals()
  }
})

test('Safari without a verifier exchanges both tokens through SDK and retrieves account details', async () => {
  const { requests } = mockAuthorization()
  const started = await authorize()
  expect(started.status.pendingAuthorization).toBe(true)
  expect(state.storage.get(pendingKey).tempToken).toEqual({
    oauth_token: 'temporary',
    oauth_token_secret: 'temp-secret',
  })
  const url = new URL(state.createTab.mock.calls[0]![0].url)
  expect(url.searchParams.get('oauth_callback')).toBe('oob')
  expect(url.searchParams.get('oauth_token')).toBe('temporary')
  const result = await authorize({ complete: true })
  expect(result.status).toMatchObject({
    hasTokens: true,
    screenName: 'tester',
    userId: '42',
    pendingAuthorization: false,
  })
  expect(
    requests.map((request) => [new URL(request.url).pathname, request.method]),
  ).toEqual([
    ['/oauth/request_token', 'GET'],
    ['/oauth/access_token', 'GET'],
    ['/account/verify_credentials.json', 'GET'],
  ])
  expect(requests[0]!.url).toBe('https://fanfou.com/oauth/request_token')
  expect(requests[1]!.headers.get('Authorization')).toContain(
    'oauth_token="temporary"',
  )
  expect(requests[2]!.headers.get('Authorization')).toContain(
    'oauth_token="access"',
  )
  expect(state.storage.get(tokenKey)).toMatchObject({
    oauthToken: 'access',
    oauthTokenSecret: 'access-secret',
    screenName: 'tester',
  })
  expect(state.storage.get(tokenKey)).not.toHaveProperty('consumerSecret')
})

test.each(['', '&oauth_verifier=654321'])(
  'callback authorization keeps callback URL and supports verifier %s',
  async (suffix) => {
    const { requests } = mockAuthorization()
    const { redirect, launch } = callbackIdentity(
      'oauth_token=temporary' + suffix,
    )
    const result = await authorize()
    expect(result.status).toMatchObject({
      hasTokens: true,
      screenName: 'tester',
      userId: '42',
    })
    const url = new URL(launch.mock.calls[0]![0].url)
    expect(url.searchParams.get('oauth_callback')).toBe(redirect)
    expect(url.searchParams.get('oauth_token')).toBe('temporary')
    expect(state.createTab).not.toHaveBeenCalled()
    expect(requests[1]!.method).toBe(suffix ? 'POST' : 'GET')
    if (suffix)
      expect(
        new URLSearchParams(await requests[1]!.text()).get('oauth_verifier'),
      ).toBe('654321')
  },
)

test.each([
  ['oauth_token=another-token', 'OAuth 回调 token 不匹配'],
  ['denied=temporary', '授权被拒绝'],
])(
  'callback %s is rejected before token exchange',
  async (parameters, error) => {
    const { requests } = mockAuthorization()
    callbackIdentity(parameters!)
    vi.spyOn(log, 'error').mockImplementation(() => {})
    expect(await authorize()).toEqual({ error })
    expect(requests).toHaveLength(1)
    expect(state.storage.has(tokenKey)).toBe(false)
  },
)

test.each(['expired', 'consumer-changed'])(
  'manual authorization rejects %s pending state',
  async (reason) => {
    const { requests } = mockAuthorization()
    await authorize()
    const pending = state.storage.get(pendingKey)
    if (reason === 'expired') pending.createdAt = Date.now() - 11 * 60_000
    else pending.consumerKey = 'different-consumer'
    vi.spyOn(log, 'error').mockImplementation(() => {})
    const result = await authorize({ complete: true })
    expect(result.error).toContain(
      reason === 'expired' ? '授权已过期' : '应用密钥已变更',
    )
    expect(requests).toHaveLength(1)
    expect(state.storage.has(tokenKey)).toBe(false)
  },
)

test('incomplete temporary credentials never open an authorization window', async () => {
  const { fetchMock } = mockAuthorization()
  fetchMock.mockImplementationOnce(
    async () => new Response('oauth_token=temporary'),
  )
  expect((await authorize()).error).toContain('获取 Request Token 失败')
  expect(state.createTab).not.toHaveBeenCalled()
  expect(state.storage.has(pendingKey)).toBe(false)
})

test('incomplete access credentials are not persisted', async () => {
  const { fetchMock } = mockAuthorization()
  await authorize()
  fetchMock.mockImplementationOnce(
    async () => new Response('oauth_token=access'),
  )
  vi.spyOn(log, 'error').mockImplementation(() => {})
  expect((await authorize({ complete: true })).error).toContain(
    '获取 Access Token 失败',
  )
  expect(state.storage.has(tokenKey)).toBe(false)
})

test('account profile failures do not discard successful SDK authorization', async () => {
  const { fetchMock } = mockAuthorization()
  await authorize()
  fetchMock.mockImplementationOnce(
    async () =>
      new Response('oauth_token=access&oauth_token_secret=access-secret'),
  )
  fetchMock.mockImplementationOnce(async () =>
    Response.json({ error: 'Profile unavailable' }, { status: 403 }),
  )
  vi.spyOn(log, 'warn').mockImplementation(() => {})
  const result = await authorize({ complete: true })
  expect(result.status).toMatchObject({
    hasTokens: true,
    screenName: null,
    pendingAuthorization: false,
  })
  expect(state.storage.get(tokenKey).oauthToken).toBe('access')
})

test('duplicate requests share one authorization and exchange each temporary token only once', async () => {
  const { requests } = mockAuthorization()
  const started = await Promise.all([authorize(), authorize()])
  expect(started[0]).toEqual(started[1])
  expect(state.createTab).toHaveBeenCalledTimes(1)
  const results = await Promise.all([
    authorize({ complete: true }),
    authorize({ complete: true }),
  ])
  expect(results[0]).toEqual(results[1])
  expect(results[0].status.hasTokens).toBe(true)
  expect(
    requests.filter(
      (request) => new URL(request.url).pathname === '/oauth/access_token',
    ),
  ).toHaveLength(1)
})

test('a different authorization flow cannot replace one that is still in progress', async () => {
  mockAuthorization()
  const started = authorize()
  expect(await authorize({ manual: true })).toEqual({
    error: '授权正在处理中，请稍后再试',
  })
  expect((await started).status.pendingAuthorization).toBe(true)
  expect((await authorize({ complete: true })).status.hasTokens).toBe(true)
})
