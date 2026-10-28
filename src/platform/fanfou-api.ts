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
