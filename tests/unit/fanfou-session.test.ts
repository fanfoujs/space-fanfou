import {
  parseFanfouSession,
  readFanfouSession,
} from '../../src/platform/fanfou-session'

const home = (user: string) =>
  `<nav id="navigation"><a href="/${user}">我的空间</a></nav><div id="user_top"><h3>测试饭友</h3></div>`

afterEach(() => vi.unstubAllGlobals())

test('website account is read from the signed-in navigation, including encoded IDs', () => {
  expect(parseFanfouSession(home('%7Ealice'))).toEqual({
    userId: '~alice',
    screenName: '测试饭友',
  })
})

test('logged-out pages do not have a current account', () => {
  expect(parseFanfouSession('<form id="login"></form>')).toBeNull()
})

test('a navigation link to another site is not a Fanfou account', () => {
  expect(
    parseFanfouSession(
      '<div id="navigation"><a href="https://example.com/alice">我的空间</a></div>',
    ),
  ).toBeNull()
})

test('session checks include site cookies, merge concurrent requests and reread after an account switch', async () => {
  const fetchMock = vi.fn(async () => new Response(home('alice')))
  vi.stubGlobal('fetch', fetchMock)
  expect(await Promise.all([readFanfouSession(), readFanfouSession()])).toEqual(
    [
      { userId: 'alice', screenName: '测试饭友' },
      { userId: 'alice', screenName: '测试饭友' },
    ],
  )
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    'https://fanfou.com/home',
    expect.objectContaining({ credentials: 'include', cache: 'no-store' }),
  )
  fetchMock.mockImplementationOnce(async () => new Response(home('bob')))
  expect((await readFanfouSession())?.userId).toBe('bob')
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
