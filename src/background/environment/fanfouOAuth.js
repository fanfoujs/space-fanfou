import { browser } from 'wxt/browser'
import OAuth from 'oauth-1.0a'
import CryptoJS from 'crypto-js'
import messaging from './messaging'
import storage from './storage'
import log from '@libs/log'
import { readFanfouSession } from '@platform/fanfou-session'
import {
  createFanfouClient,
  requestFanfouApi,
  getFanfouApiError,
  getFanfouAccount,
  isFanfouRateLimit,
  isFanfouAuthorizationInvalid,
} from '@platform/fanfou-api'
import {
  FANFOU_OAUTH_AUTHORIZE,
  FANFOU_OAUTH_GET_STATUS,
  FANFOU_OAUTH_CLEAR_TOKENS,
  FANFOU_OAUTH_API_REQUEST,
} from '@constants'

// 统一使用内置饭否应用凭据。
const BUILTIN_CONSUMER_KEY = '3b8763186f221a7d1f4afa56969898b9'
const BUILTIN_CONSUMER_SECRET = '0aa2aa5bba64adcb094d257dac1fdd40'

const ACCESS_TOKEN_URL = 'https://fanfou.com/oauth/access_token'
const AUTHORIZE_URL = 'https://fanfou.com/oauth/authorize'
const TOKEN_STORAGE_KEY = 'fanfou-oauth/tokens'
const ACCOUNTS_STORAGE_KEY = 'fanfou-oauth/accounts'

let tokenCache
let authorizationRequest
let authorizationRequestKey
let accountRequest
let tokenRevision = 0
let accountsWrite = Promise.resolve()

function updateAccounts(update) {
  const request = accountsWrite.then(async () => {
    const accounts = await storage.read(ACCOUNTS_STORAGE_KEY, 'local') || {}
    await storage.write(ACCOUNTS_STORAGE_KEY, update(accounts), 'local')
  })
  accountsWrite = request.catch(() => {})
  return request
}

function rememberTokens(tokens) {
  if (!tokens?.oauthToken || !tokens?.oauthTokenSecret || !tokens.consumerKey) return
  return updateAccounts(accounts => ({ ...accounts, [`${tokens.consumerKey}:${tokens.oauthToken}`]: tokens }))
}

function matchesAccount(tokens, userId) {
  return !!userId && (tokens?.userId === userId || tokens?.accountIds?.includes(userId))
}

async function currentSession() {
  try { return await readFanfouSession() }
  catch (error) {
    log.warn('[SpaceFanfou] 无法检查当前饭否账号:', error.message)
    return null
  }
}

async function selectAccountTokens(consumer, session, refresh = false) {
  const legacy = await readTokens()
  await rememberTokens(legacy)
  await accountsWrite
  const accounts = await storage.read(ACCOUNTS_STORAGE_KEY, 'local') || {}
  const candidates = [...new Map([legacy, ...Object.values(accounts)]
    .filter(tokens => tokens?.consumerKey === consumer.consumerKey && tokens.oauthToken && tokens.oauthTokenSecret)
    .map(tokens => [tokens.oauthToken, tokens])).values()]
  if (!session) return null
  let tokens = candidates.find(tokens => matchesAccount(tokens, session.userId))
  let refreshed = false
  // 升级前未保存账号信息的凭据先补全身份，绝不直接用于另一个饭否账号。
  if (!tokens) {
    for (const candidate of candidates.filter(item => (!item.userId || !item.accountIds) && (!item.profileError || refresh))) {
      await persistTokens(candidate)
      await refreshAccountProfile(consumer, candidate)
      const updated = await readTokens()
      if (matchesAccount(updated, session.userId)) { tokens = updated; refreshed = true; break }
    }
  }
  if (!tokens) return null
  if ((await readTokens())?.oauthToken !== tokens.oauthToken) await persistTokens(tokens)
  if (refresh && !refreshed) {
    await refreshAccountProfile(consumer, tokens)
    tokens = await readTokens()
  }
  return matchesAccount(tokens, session.userId) ? tokens : null
}

function createOAuthClient(consumerKey, consumerSecret) {
  return new OAuth({
    consumer: {
      key: consumerKey,
      secret: consumerSecret,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return CryptoJS.HmacSHA1(baseString, key).toString(CryptoJS.enc.Base64)
    },
  })
}

async function readTokens() {
  if (!tokenCache) {
    tokenCache = await storage.read(TOKEN_STORAGE_KEY, 'local')
  }

  return tokenCache
}

async function persistTokens(tokens) {
  tokenRevision++
  tokenCache = tokens || null

  if (tokens) {
    await storage.write(TOKEN_STORAGE_KEY, tokens, 'local')
    await rememberTokens(tokens)
  } else {
    try {
      await storage.delete(TOKEN_STORAGE_KEY, 'local')
    } catch (error) {
      log.warn('[SpaceFanfou] 删除 OAuth token 时出错（可忽略）', error)
    }
  }
}

function readConsumerConfig() {
  return {
    consumerKey: BUILTIN_CONSUMER_KEY,
    consumerSecret: BUILTIN_CONSUMER_SECRET,
  }
}

async function requestTemporaryToken(consumer) {
  const client = await createFanfouClient(consumer).getRequestToken()
  // 沿用已有 session 数据格式，后台休眠前开始的手动授权仍可继续完成。
  return {
    oauth_token: client.oauthToken,
    oauth_token_secret: client.oauthTokenSecret,
  }
}

async function exchangeAccessToken(consumer, tempToken, verifier) {
  if (!verifier) {
    const client = await createFanfouClient(consumer).getAccessToken({
      oauthToken: tempToken.oauth_token,
      oauthTokenSecret: tempToken.oauth_token_secret,
    })
    return {
      oauthToken: client.oauthToken,
      oauthTokenSecret: client.oauthTokenSecret,
    }
  }

  // SDK beta 尚不能提交 oauth_verifier，仅验证码交换保留兼容请求。
  const oauth = createOAuthClient(consumer.consumerKey, consumer.consumerSecret)
  const params = {
    oauth_token: tempToken.oauth_token,
    oauth_verifier: verifier,
  }
  const headers = oauth.toHeader(oauth.authorize(
    {
      url: ACCESS_TOKEN_URL.replace('https:', 'http:'),
      method: 'POST',
      data: params,
    },
    { key: tempToken.oauth_token, secret: tempToken.oauth_token_secret },
  ))
  const response = await fetch(ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    credentials: 'omit',
    body: new URLSearchParams(params).toString(),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(text || `Fanfou API ${response.status}`)
  const tokens = new URLSearchParams(text)
  return {
    oauthToken: tokens.get('oauth_token'),
    oauthTokenSecret: tokens.get('oauth_token_secret'),
    screenName: tokens.get('screen_name'),
    userId: tokens.get('user_id'),
  }
}

function launchAuthWindow(authUrl) {
  return browser.identity.launchWebAuthFlow({ url: authUrl, interactive: true })
}

function getRedirectUrl() {
  return browser.identity?.getRedirectURL ? browser.identity.getRedirectURL('fanfou-oauth') : 'oob'
}

async function saveAccessTokens(consumer, tempToken, verifier = '', accountContext) {
  const tokens = await exchangeAccessToken(consumer, tempToken, verifier)
  if (!tokens.oauthToken || !tokens.oauthTokenSecret) throw new Error('获取 Access Token 失败，请确认应用配置')
  const session = await currentSession()
  // 仅刚完成 OAuth 交换且网页账号未改变时绑定身份，不据此猜测历史未知凭据的归属。
  const confirmedSession = accountContext && session && (!accountContext.userId || accountContext.userId === session.userId)
    ? session : null
  const saved = {
    oauthToken: tokens.oauthToken,
    oauthTokenSecret: tokens.oauthTokenSecret,
    screenName: tokens.screenName || confirmedSession?.screenName || null,
    userId: tokens.userId || confirmedSession?.userId || null,
    accountIds: confirmedSession ? [confirmedSession.userId] : undefined,
    authorizationInvalid: false,
    profileError: null,
    consumerKey: consumer.consumerKey,
  }
  await rememberTokens(await readTokens())
  await persistTokens(saved)
  if (!tokens.screenName || !tokens.userId) {
    await refreshAccountProfile(consumer, saved)
  }
}

function refreshAccountProfile(consumer, tokens) {
  if (tokens.profileRetryAt > Date.now()) return Promise.resolve()
  if (accountRequest?.token === tokens.oauthToken && accountRequest?.consumerKey === consumer.consumerKey) {
    return accountRequest.promise
  }
  const request = {
    token: tokens.oauthToken,
    consumerKey: consumer.consumerKey,
    promise: updateAccountProfile(consumer, tokens).finally(() => {
      if (accountRequest === request) accountRequest = null
    }),
  }
  accountRequest = request
  return request.promise
}

async function updateAccountProfile(consumer, tokens) {
  const revision = tokenRevision
  let profile
  try {
    profile = {
      ...await getFanfouAccount(createFanfouClient({ ...consumer, ...tokens })),
      profileError: null,
      profileRetryAt: 0,
      authorizationInvalid: false,
    }
    profile.accountIds = [...new Set([...(tokens.accountIds || []), ...profile.accountIds])]
  } catch (error) {
    profile = {
      profileError: getFanfouApiError(error),
      profileRetryAt: Date.now() + (isFanfouRateLimit(error) ? 5 : 1) * 60_000,
      authorizationInvalid: isFanfouAuthorizationInvalid(error),
    }
    log.warn('[SpaceFanfou] 读取授权账号资料失败:', profile.profileError)
  }
  // 查询过程中取消或更换授权时，旧请求不得恢复已经清除的凭据。
  if (revision !== tokenRevision) return
  const current = await readTokens()
  if (revision !== tokenRevision || !current || current.oauthToken !== tokens.oauthToken || current.consumerKey !== tokens.consumerKey) return
  await persistTokens({ ...current, ...profile })
}

function buildStatus(tokens, redirectUrl) {
  const hasTokens = Boolean(tokens?.oauthToken && tokens?.oauthTokenSecret)

  return {
    ok: true,
    status: {
      hasTokens,
      loggedIn: hasTokens && !!tokens.userId && !tokens.authorizationInvalid,
      canAuthorize: true,
      screenName: tokens?.screenName || null,
      userId: tokens?.userId || null,
      profileError: tokens?.profileError || null,
      redirectUrl,
      manualAuthorization: !browser.identity?.launchWebAuthFlow,
    },
  }
}

async function handleGetStatus(payload = {}) {
  const consumer = await readConsumerConfig()
  const session = await currentSession()
  const tokens = await selectAccountTokens(consumer, session, !!payload.refreshAccount)
  const redirectUrl = getRedirectUrl()

  const result = buildStatus(tokens, redirectUrl)
  result.status.currentUserId = session?.userId || null
  result.status.pendingAuthorization = !!await storage.read('fanfou-oauth/pending', 'session')
  return result
}

function handleAuthorize(payload = {}) {
  const key = JSON.stringify([
    !!payload.manual,
    !!payload.complete,
    (payload.verifier || '').trim(),
  ])
  if (authorizationRequest) {
    return key === authorizationRequestKey
      ? authorizationRequest
      : Promise.resolve({ error: '授权正在处理中，请稍后再试' })
  }
  authorizationRequestKey = key
  authorizationRequest = authorize(payload).finally(() => {
    authorizationRequest = null
    authorizationRequestKey = null
  })
  return authorizationRequest
}

async function authorize(payload) {
  try {
    const consumer = await readConsumerConfig()
    const redirectUrl = payload.manual ? 'oob' : getRedirectUrl()

    if (payload.complete) {
      const pending = await storage.read('fanfou-oauth/pending', 'session')
      if (!pending || Date.now() - pending.createdAt > 10 * 60_000) throw new Error('授权已过期，请重新开始授权')
      if (pending.consumerKey !== consumer.consumerKey) throw new Error('应用密钥已变更，请重新开始授权')
      await saveAccessTokens(consumer, pending.tempToken, (payload.verifier || '').trim(), pending.accountContext)
      await storage.delete('fanfou-oauth/pending', 'session')
      return handleGetStatus()
    }

    const accountContext = { userId: (await currentSession())?.userId || null }
    const tempToken = await requestTemporaryToken(consumer)

    if (!tempToken.oauth_token || !tempToken.oauth_token_secret) {
      return { error: '获取 Request Token 失败，请稍后重试' }
    }

    // 和 fanfou-export 一样，将 callback 放在授权页 URL 中，SDK 负责 token 交换。
    const authorizeUrl = new URL(AUTHORIZE_URL)
    authorizeUrl.searchParams.set('oauth_token', tempToken.oauth_token)
    authorizeUrl.searchParams.set('oauth_callback', redirectUrl)
    if (redirectUrl === 'oob') {
      await storage.write('fanfou-oauth/pending', { tempToken, consumerKey: consumer.consumerKey, accountContext, createdAt: Date.now() }, 'session')
      await browser.tabs.create({ url: authorizeUrl.href, active: true })
      return handleGetStatus()
    }
    const responseUrl = await launchAuthWindow(authorizeUrl.href)
    const parsedUrl = new URL(responseUrl)

    // 兼容不返回 verifier 的授权回调；仍校验拒绝状态和临时 token。
    const verifier = parsedUrl.searchParams.get('oauth_verifier') || ''

    if (parsedUrl.searchParams.get('denied')) {
      return { error: '授权被拒绝' }
    }

    if (parsedUrl.searchParams.get('oauth_token') !== tempToken.oauth_token) throw new Error('OAuth 回调 token 不匹配')
    await saveAccessTokens(consumer, tempToken, verifier, accountContext)

    return handleGetStatus()
  } catch (error) {
    log.error('[SpaceFanfou] OAuth 授权失败:', error)
    return { error: error.message || '授权失败，请查看控制台日志' }
  }
}

async function handleClearTokens() {
  const consumer = await readConsumerConfig()
  const session = await currentSession()
  const tokens = await selectAccountTokens(consumer, session)
  await updateAccounts(accounts => Object.fromEntries(Object.entries(accounts).filter(([, item]) =>
    item.consumerKey !== consumer.consumerKey || (!matchesAccount(item, session?.userId) && item.oauthToken !== tokens?.oauthToken),
  )))
  await persistTokens(null)
  await storage.delete('fanfou-oauth/pending', 'session')
  return handleGetStatus()
}

async function handleApiRequest(payload) {
  try {
    const consumer = await readConsumerConfig()
    const tokens = await selectAccountTokens(consumer, await currentSession())

    if (!tokens || !tokens.oauthToken || !tokens.oauthTokenSecret || tokens.authorizationInvalid) {
      return { error: '当前饭否账号尚未完成授权，请先在设置中登录' }
    }

    if (tokens.consumerKey !== consumer.consumerKey) {
      await persistTokens(null)
      return { error: '保存的授权与当前 Consumer Key 不匹配，请重新授权' }
    }

    const client = createFanfouClient({
      consumerKey: consumer.consumerKey,
      consumerSecret: consumer.consumerSecret,
      oauthToken: tokens.oauthToken,
      oauthTokenSecret: tokens.oauthTokenSecret,
    })
    const responseJSON = await requestFanfouApi(client, payload)
    return { responseJSON }
  } catch (error) {
    log.error('[SpaceFanfou] 调用 FanFou API 失败:', error)
    return { error: getFanfouApiError(error) }
  }
}

function registerHandlers() {
  messaging.registerHandler(FANFOU_OAUTH_GET_STATUS, handleGetStatus)
  messaging.registerHandler(FANFOU_OAUTH_AUTHORIZE, handleAuthorize)
  messaging.registerHandler(FANFOU_OAUTH_CLEAR_TOKENS, handleClearTokens)
  messaging.registerHandler(FANFOU_OAUTH_API_REQUEST, handleApiRequest)
}

export default {
  install() {
    registerHandlers()
  },
}
