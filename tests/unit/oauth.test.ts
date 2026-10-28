const state = vi.hoisted(() => ({
  handlers: new Map<string, (payload?: any) => Promise<any>>(),
  storage: new Map<string, any>(),
  createTab: vi.fn(),
}))
vi.mock('wxt/browser', () => ({
  browser: { identity: undefined, tabs: { create: state.createTab } },
}))
vi.mock('../../src/background/environment/messaging', () => ({
  default: {
    registerHandler: (type: string, handler: (payload?: any) => Promise<any>) =>
      state.handlers.set(type, handler),
  },
}))
vi.mock('../../src/background/environment/settings', () => ({
  default: { readAll: async () => ({ 'fanfou-oauth': true }) },
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

test('Safari can authorize without identity API, keep pending state, exchange tokens, and revoke', async () => {
  const fetchMock = vi.fn(
    async (url: string) =>
      new Response(
        String(url).includes('request_token')
          ? 'oauth_token=temporary&oauth_token_secret=temp-secret'
          : 'oauth_token=access&oauth_token_secret=access-secret&screen_name=tester&user_id=42',
      ),
  )
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
    expect(
      (await state.handlers.get('FANFOU_OAUTH_CLEAR_TOKENS')!()).status
        .hasTokens,
    ).toBe(false)
  } finally {
    vi.unstubAllGlobals()
  }
})
