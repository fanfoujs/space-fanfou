import Fanfou, {
  FanfouError,
  type FanfouOptions,
  type GetUserOptions,
  type GetFollowingsOptions,
  type CheckFriendshipDetailOptions,
} from 'fanfou-sdk'

export type FanfouApiRequest =
  | { method: 'getUser'; params?: GetUserOptions }
  | { method: 'getFollowings'; params?: GetFollowingsOptions }
  | {
      method: 'checkFriendshipDetail'
      params: CheckFriendshipDetailOptions
    }

export function createFanfouClient(credentials: FanfouOptions) {
  return new Fanfou({
    consumerKey: credentials.consumerKey,
    consumerSecret: credentials.consumerSecret,
    oauthToken: credentials.oauthToken,
    oauthTokenSecret: credentials.oauthTokenSecret,
    protocol: 'https:',
    hooks: {
      // 饭否仍按 HTTP URL 校验 OAuth 签名；实际网络请求始终使用 HTTPS。
      baseString: (value) =>
        value.replace(/^([^&]+&)https%3A%2F%2F/, '$1http%3A%2F%2F'),
    },
  })
}

export function requestFanfouApi(client: Fanfou, request: FanfouApiRequest) {
  // 页面只能调用明确支持的 SDK 方法，不能指定任意 URL 或客户端方法。
  switch (request?.method) {
    case 'getUser':
      return client.getUser(request.params)
    case 'getFollowings':
      return client.getFollowings(request.params)
    case 'checkFriendshipDetail':
      return client.checkFriendshipDetail(request.params)
    default:
      throw new Error('不支持的饭否 API 方法')
  }
}

export async function getFanfouAccount(client: Fanfou) {
  // 与 fanfou-export 一致，不传 id 时读取当前授权账号。
  const profile = await client.getUser()
  if (profile && typeof profile === 'object' && 'error' in profile) {
    if (typeof profile.error === 'string' && profile.error) {
      throw new Error(profile.error)
    }
  }
  const userId =
    profile &&
    (typeof profile.id === 'string' || typeof profile.id === 'number')
      ? String(profile.id).trim()
      : ''
  if (!userId) throw new Error('饭否没有返回有效的账号资料')
  return {
    userId,
    accountIds: [
      ...new Set(
        [userId, profile.uniqueId].filter(
          (id): id is string => typeof id === 'string' && !!id,
        ),
      ),
    ],
    screenName: profile.screenName || profile.name || null,
  }
}

export function getFanfouApiError(error: unknown): string {
  const cause = error instanceof FanfouError ? error.err : error
  if (cause instanceof Error && 'data' in cause) {
    const data = cause.data
    if (typeof data === 'string' && data) return data
    if (data && typeof data === 'object' && 'error' in data) {
      if (typeof data.error === 'string' && data.error) return data.error
    }
  }
  return error instanceof Error ? error.message : 'API 请求失败'
}

export function isFanfouRateLimit(error: unknown): boolean {
  const cause = error instanceof FanfouError ? error.err : error
  return (
    /尝试次数过多|请求次数过多|too many|rate.?limit/i.test(
      getFanfouApiError(error),
    ) ||
    (cause instanceof Error &&
      'response' in cause &&
      cause.response instanceof Response &&
      cause.response.status === 429)
  )
}

export function isFanfouAuthorizationInvalid(error: unknown): boolean {
  if (isFanfouRateLimit(error)) return false
  const cause = error instanceof FanfouError ? error.err : error
  return (
    (cause instanceof Error &&
      'response' in cause &&
      cause.response instanceof Response &&
      cause.response.status === 401) ||
    /invalid.*(?:oauth|token|signature)|(?:oauth|token).*expired|授权.*失效/i.test(
      getFanfouApiError(error),
    )
  )
}
