import { createHmac } from 'node:crypto'
import {
  composerImageBytes,
  composerImageFixture,
} from '../fixtures/composer-image'
import {
  createFanfouClient,
  getFanfouApiError,
  requestFanfouApi,
  createFanfouStatus,
} from '../../src/platform/fanfou-api'

const credentials = {
  consumerKey: 'test-consumer',
  consumerSecret: 'test-consumer-secret',
  oauthToken: 'saved-access-token',
  oauthTokenSecret: 'saved-token-secret',
}

afterEach(() => vi.unstubAllGlobals())

function mockResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn(async (_request: RequestInfo | URL) =>
    Response.json(body, { status }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function encode(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => '%' + character.charCodeAt(0).toString(16).toUpperCase(),
  )
}

test('SDK uses saved tokens over HTTPS with Fanfou HTTP signing and camelCase responses', async () => {
  const fetchMock = mockResponse({
    id: '~test',
    screen_name: '测试饭友',
    statuses_count: 42,
    profile_background_image_url: 'https://fanfou.com/background.png',
    status: { created_at: '2026-10-28', user: { screen_name: 'nested' } },
  })
  const response = await requestFanfouApi(createFanfouClient(credentials), {
    method: 'getUser',
    params: { id: '测试 饭友' },
  })
  expect(response).toMatchObject({
    screenName: '测试饭友',
    statusesCount: 42,
    profileBackgroundImageUrl: 'https://fanfou.com/background.png',
    status: { createdAt: '2026-10-28', user: { screenName: 'nested' } },
  })
  const request = fetchMock.mock.calls[0]![0] as unknown as Request
  const url = new URL(request.url)
  expect(url.origin).toBe('https://api.fanfou.com')
  expect(url.pathname).toBe('/users/show.json')
  expect(url.searchParams.get('id')).toBe('测试 饭友')
  expect(request.credentials).toBe('same-origin')
  const authorization = Object.fromEntries(
    request.headers
      .get('Authorization')!
      .replace(/^OAuth /, '')
      .split(',')
      .map((part) => {
        const [key, value] = part.trim().split('=')
        return [key!, decodeURIComponent(value!.slice(1, -1))]
      }),
  )
  expect(authorization.oauth_token).toBe(credentials.oauthToken)
  const signature = authorization.oauth_signature
  delete authorization.oauth_signature
  const parameters = [...url.searchParams, ...Object.entries(authorization)]
    .map(([key, value]) => [encode(key), encode(value)])
    .sort(([a, x], [b, y]) =>
      a! < b! ? -1 : a! > b! ? 1 : x! < y! ? -1 : x! > y! ? 1 : 0,
    )
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  const baseString = [
    'GET',
    'http://api.fanfou.com/users/show.json',
    parameters,
  ]
    .map(encode)
    .join('&')
  expect(signature).toBe(
    createHmac(
      'sha1',
      `${encode(credentials.consumerSecret)}&${encode(credentials.oauthTokenSecret)}`,
    )
      .update(baseString)
      .digest('base64'),
  )
})

test('SDK followings preserves pagination and converts avatar fields in arrays', async () => {
  const fetchMock = mockResponse([
    { profile_image_url: 'https://fanfou.com/avatar.jpg' },
  ])
  const users = await requestFanfouApi(createFanfouClient(credentials), {
    method: 'getFollowings',
    params: { count: 100, page: 2 },
  })
  expect(users).toEqual([{ profileImageUrl: 'https://fanfou.com/avatar.jpg' }])
  const request = fetchMock.mock.calls[0]![0] as unknown as Request
  const url = new URL(request.url)
  expect(url.pathname).toBe('/statuses/friends.json')
  expect(Object.fromEntries(url.searchParams)).toEqual({
    count: '100',
    page: '2',
  })
})

test('SDK normalizes relationship flags and sends the resolved target ID', async () => {
  const fetchMock = mockResponse({
    relationship: {
      source: { following: 'true', followed_by: 'false' },
      target: { following: false, followed_by: true },
    },
  })
  const relationship = await requestFanfouApi(createFanfouClient(credentials), {
    method: 'checkFriendshipDetail',
    params: { target_id: '~resolved-id' },
  })
  expect(relationship).toEqual({
    relationship: {
      source: { following: true, followedBy: false },
      target: { following: false, followedBy: true },
    },
  })
  const request = fetchMock.mock.calls[0]![0] as unknown as Request
  expect(new URL(request.url).searchParams.get('target_id')).toBe(
    '~resolved-id',
  )
})

test('SDK API bridge rejects unapproved methods without a network request', () => {
  const fetchMock = mockResponse({})
  expect(() =>
    requestFanfouApi(createFanfouClient(credentials), {
      method: 'post',
      params: { uri: 'https://example.com' },
    } as never),
  ).toThrow('不支持的饭否 API 方法')
  expect(fetchMock).not.toHaveBeenCalled()
})

test('SDK errors keep the API error text for expired authorizations', async () => {
  mockResponse({ error: 'Invalid OAuth token' }, 401)
  try {
    await requestFanfouApi(createFanfouClient(credentials), {
      method: 'getUser',
    })
    expect.unreachable('401 must fail')
  } catch (error) {
    expect(getFanfouApiError(error)).toBe('Invalid OAuth token')
  }
})

test('composer posts the exact text through the SDK and requires a confirmed status ID', async () => {
  let request!: Request
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request) => {
      request = input.clone()
      return Response.json({ id: 'new-status', text: '  写饭测试\n第二行  ' })
    }),
  )
  const result = await createFanfouStatus(
    createFanfouClient(credentials),
    '  写饭测试\n第二行  ',
  )
  expect(result.id).toBe('new-status')
  expect(request.url).toBe('https://api.fanfou.com/statuses/update.json')
  expect(request.method).toBe('POST')
  expect(new URLSearchParams(await request.text()).get('status')).toBe(
    '  写饭测试\n第二行  ',
  )
  mockResponse({ error: 'unconfirmed' })
  await expect(
    createFanfouStatus(createFanfouClient(credentials), '测试'),
  ).rejects.toThrow('未能确认发送结果')
})

test.each(['', '   \n', '饭'.repeat(141)])(
  'composer rejects invalid text before posting: %j',
  async (text) => {
    const fetchMock = mockResponse({ id: 'should-not-send' })
    await expect(
      createFanfouStatus(createFanfouClient(credentials), text),
    ).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  },
)

test.each(['', '图片说明\n保留换行'])(
  'composer sends photo bytes and optional caption through multipart upload: %j',
  async (caption) => {
    let request!: Request
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: Request) => {
        request = input.clone()
        return Response.json({ id: 'photo-status' })
      }),
    )
    expect(
      (
        await createFanfouStatus(
          createFanfouClient(credentials),
          caption,
          composerImageFixture,
        )
      ).id,
    ).toBe('photo-status')
    expect(request.url).toBe('https://api.fanfou.com/photos/upload.json')
    expect(request.method).toBe('POST')
    expect(request.headers.get('content-type')).toMatch(
      /^multipart\/form-data; boundary=/,
    )
    expect(request.headers.get('Authorization')).toContain(
      'oauth_token="saved-access-token"',
    )
    const form = await request.formData()
    const photo = form.get('photo') as File
    expect(photo.name).toBe('preview.png')
    expect(photo.type).toBe('image/png')
    expect(Buffer.from(await photo.arrayBuffer())).toEqual(composerImageBytes)
    expect((form.get('status') as string | null)?.replace(/\r\n/g, '\n') ?? null).toBe(caption || null)
  },
)

test('invalid images and overlong photo captions never reach the network', async () => {
  const fetchMock = mockResponse({ id: 'must-not-send' })
  await expect(
    createFanfouStatus(createFanfouClient(credentials), '', {
      ...composerImageFixture,
      dataUrl: 'bad-image',
    }),
  ).rejects.toThrow()
  await expect(
    createFanfouStatus(
      createFanfouClient(credentials),
      '饭'.repeat(141),
      composerImageFixture,
    ),
  ).rejects.toThrow('140')
  expect(fetchMock).not.toHaveBeenCalled()
})
