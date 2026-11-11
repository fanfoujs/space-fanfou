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
  createFanfouStatus,
} from '@platform/fanfou-api'
import { COMPOSER_ACCOUNT_KEY, COMPOSER_DRAFT_KEY, COMPOSER_IMAGE_KEY, getComposerSendKey } from '@platform/composer'
import {
  FANFOU_OAUTH_AUTHORIZE,
  FANFOU_OAUTH_GET_STATUS,
  FANFOU_OAUTH_CLEAR_TOKENS,
  FANFOU_OAUTH_REMOVE_ACCOUNT,
  FANFOU_OAUTH_API_REQUEST,
  FANFOU_COMPOSE_SEND,
  FANFOU_ACCOUNT_CACHE_KEY,
  FANFOU_WEBSITE_ACCOUNTS_KEY,
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
const postingAccounts = new Set()

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

async function readAccountTokens(consumer) {
  const legacy = await readTokens()
  await rememberTokens(legacy)
  await accountsWrite
  const accounts = await storage.read(ACCOUNTS_STORAGE_KEY, 'local') || {}
  return [...new Map([legacy, ...Object.values(accounts)]
    .filter(tokens => tokens?.consumerKey === consumer.consumerKey && tokens.oauthToken && tokens.oauthTokenSecret)
    .map(tokens => [tokens.oauthToken, tokens])).values()]
}

async function composerAccountTokens(consumer) {
  const accounts = new Map()
  for (const tokens of await readAccountTokens(consumer)) {
    if (!tokens.userId) continue
    const previous = accounts.get(tokens.userId)
    if (!previous || (previous.authorizationInvalid && !tokens.authorizationInvalid)) accounts.set(tokens.userId, tokens)
  }
  return [...accounts.values()]
}

async function composerAccounts(consumer, currentUserId) {
  const tokens = await composerAccountTokens(consumer)
  const accounts = tokens.map(tokens => ({
    userId: tokens.userId,
    screenName: tokens.screenName || tokens.userId,
    loggedIn: !tokens.authorizationInvalid,
    sending: postingAccounts.has(tokens.userId),
    isCurrent: matchesAccount(tokens, currentUserId),
    profileError: tokens.profileError || null,
    hasAuthorization: true,
    hasWebsiteSession: false,
    accountIds: [...new Set([tokens.userId, ...(tokens.accountIds || [])])],
  }))
  const saved = await storage.read(FANFOU_WEBSITE_ACCOUNTS_KEY, 'local')
  for (const website of Array.isArray(saved) ? saved : []) {
    if (typeof website?.userId !== 'string' || !website.userId.trim()) continue
    const userId = website.userId.trim()
    const accountIds = [...new Set([userId, ...(Array.isArray(website.accountIds) ? website.accountIds.filter(id => typeof id === 'string' && id) : [])])]
    const linked = tokens.find(token => token.userId === userId) || tokens.find(token => accountIds.includes(token.userId)) || tokens.find(token => accountIds.some(id => matchesAccount(token, id)))
    const existing = accounts.find(account => account.userId === (linked?.userId || userId))
    if (existing) {
      existing.hasWebsiteSession = true
      existing.isCurrent ||= accountIds.includes(currentUserId)
      existing.accountIds = [...new Set([...existing.accountIds, ...accountIds])]
    } else {
      // Only identity metadata crosses into the settings UI; session cookies stay here.
      accounts.push({ userId, screenName: typeof website.nickname === 'string' && website.nickname.trim() ? website.nickname.trim() : userId, loggedIn: false, sending: false, isCurrent: accountIds.includes(currentUserId), profileError: null, hasAuthorization: false, hasWebsiteSession: true, accountIds })
    }
  }
  return accounts
}

async function selectAccountTokens(consumer, session, refresh = false) {
  const candidates = await readAccountTokens(consumer)
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
      await storage.delete(FANFOU_ACCOUNT_CACHE_KEY, 'local')
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
  if (payload.cached) return handleGetCachedStatus()
  const consumer = await readConsumerConfig()
  // A failed network check must not replace a cached login with "logged out".
  const session = await readFanfouSession()
  const tokens = await selectAccountTokens(consumer, session, !!payload.refreshAccount)
  const redirectUrl = getRedirectUrl()

  const result = buildStatus(tokens, redirectUrl)
  result.status.currentUserId = session?.userId || null
  result.status.currentScreenName = session?.screenName || null
  result.status.sending = postingAccounts.has(tokens?.userId)
  result.status.pendingAuthorization = !!await storage.read('fanfou-oauth/pending', 'session')
  result.status.accounts = await composerAccounts(consumer, result.status.currentUserId)
  await storage.write(FANFOU_ACCOUNT_CACHE_KEY, { consumerKey: consumer.consumerKey, status: result.status }, 'local')
  return result
}

async function handleGetCachedStatus() {
  const saved = await storage.read(FANFOU_ACCOUNT_CACHE_KEY, 'local')
  const cached = saved?.consumerKey === BUILTIN_CONSUMER_KEY ? saved.status : null
  const tokens = await readTokens()
  // Existing installations already have the profile next to their saved tokens.
  // Return only display/status fields; credentials stay in the background.
  const result = typeof cached?.loggedIn === 'boolean'
    ? { ok: true, status: { ...cached } }
    : buildStatus(tokens?.consumerKey === BUILTIN_CONSUMER_KEY ? tokens : null, getRedirectUrl())
  result.status.currentUserId ??= result.status.userId || null
  result.status.currentScreenName ??= result.status.screenName || null
  result.status.sending = postingAccounts.has(result.status.userId)
  result.status.pendingAuthorization = !!await storage.read('fanfou-oauth/pending', 'session')
  result.status.accounts = await composerAccounts(readConsumerConfig(), result.status.currentUserId)
  return result
}

function handleAuthorize(payload = {}) {
  const key = JSON.stringify([
    !!payload.manual,
    !!payload.complete,
    (payload.verifier || '').trim(),
    payload.userId || null,
    !!payload.addAccount,
    !!payload.cancel,
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
    if (payload.cancel) {
      await storage.delete('fanfou-oauth/pending', 'session')
      return handleGetCachedStatus()
    }
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

    const session = await currentSession()
    const accounts = await composerAccountTokens(consumer)
    const current = accounts.find(account => matchesAccount(account, session?.userId))
    const websiteAccounts = payload.userId ? await storage.read(FANFOU_WEBSITE_ACCOUNTS_KEY, 'local') : null
    const websiteMatch = session && Array.isArray(websiteAccounts) && websiteAccounts.some(account => account?.userId === payload.userId && Array.isArray(account.accountIds) && account.accountIds.includes(session.userId))
    if (payload.userId && session?.userId !== payload.userId && current?.userId !== payload.userId && !websiteMatch) {
      return { error: '请先在饭否切换到所选账号，再回来重新授权。', accountMismatch: true }
    }
    if (payload.addAccount && (!session || (current && !current.authorizationInvalid))) {
      return { error: session ? '当前网页账号已经授权，请先在饭否切换到其他账号。' : '请先在饭否登录要添加的账号，再回来授权。', accountMismatch: true }
    }
    const accountContext = { userId: session?.userId || null }
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

async function handleClearTokens(payload = {}) {
  const consumer = await readConsumerConfig()
  const session = await currentSession()
  const tokens = await selectAccountTokens(consumer, session)
  if (payload.userId && tokens?.userId !== payload.userId) {
    return { error: '当前饭否账号已改变，请等待账号更新后重试。' }
  }
  await updateAccounts(accounts => Object.fromEntries(Object.entries(accounts).filter(([, item]) =>
    item.consumerKey !== consumer.consumerKey || (!matchesAccount(item, session?.userId) && item.oauthToken !== tokens?.oauthToken),
  )))
  await persistTokens(null)
  await storage.delete('fanfou-oauth/pending', 'session')
  return handleGetStatus()
}

async function handleRemoveAccount(payload, sender) {
  const editor = new URL(browser.runtime.getURL('/settings.html'))
  let caller
  try { caller = new URL(sender?.url) } catch { return { error: '请从扩展设置中管理账号' } }
  if (caller.protocol !== editor.protocol || caller.host !== editor.host || caller.pathname !== editor.pathname) return { error: '请从扩展设置中管理账号' }
  if (typeof payload?.userId !== 'string' || !payload.userId) return { error: '请选择要移除的账号' }
  const consumer = readConsumerConfig()
  const accounts = await composerAccountTokens(consumer)
  const target = accounts.find(account => account.userId === payload.userId)
  if (!target) return { error: '这个账号的授权已经移除，请刷新账号列表。' }
  if (postingAccounts.has(target.userId)) return { error: '这个账号正在发送消息，请发送完成后再移除授权。' }
  const previous = (await handleGetCachedStatus()).status
  // Invalidate in-flight profile requests before removing any saved credentials.
  tokenRevision++
  if (matchesAccount(await readTokens(), target.userId)) await persistTokens(null)
  await updateAccounts(saved => Object.fromEntries(Object.entries(saved).filter(([, tokens]) =>
    tokens.consumerKey !== consumer.consumerKey || !matchesAccount(tokens, target.userId),
  )))
  if (await storage.read(COMPOSER_ACCOUNT_KEY, 'local') === target.userId) await storage.delete(COMPOSER_ACCOUNT_KEY, 'local')
  const remaining = await composerAccountTokens(consumer)
  const current = remaining.find(account => matchesAccount(account, previous.currentUserId))
  const result = buildStatus(current, getRedirectUrl())
  result.status.currentUserId = previous.currentUserId || null
  result.status.currentScreenName = previous.currentScreenName || null
  result.status.pendingAuthorization = previous.pendingAuthorization
  result.status.sending = postingAccounts.has(current?.userId)
  result.status.accounts = await composerAccounts(consumer, previous.currentUserId)
  await storage.write(FANFOU_ACCOUNT_CACHE_KEY, { consumerKey: consumer.consumerKey, status: result.status }, 'local')
  return result
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
  messaging.registerHandler(FANFOU_OAUTH_REMOVE_ACCOUNT, handleRemoveAccount)
  messaging.registerHandler(FANFOU_OAUTH_API_REQUEST, handleApiRequest)
  messaging.registerHandler(FANFOU_COMPOSE_SEND, handleComposeSend)
}

async function handleComposeSend(payload, sender) {
  // 发文仅允许扩展自己的编辑器调用，饭否页面的通用 API 桥仍然只读。
  const editorUrl = new URL(browser.runtime.getURL('/settings.html'))
  let caller
  try { caller = new URL(sender?.url) } catch { return { error: '请从扩展的快捷发饭窗口发送消息' } }
  if (caller.protocol !== editorUrl.protocol || caller.host !== editorUrl.host || caller.pathname !== editorUrl.pathname) {
    return { error: '请从扩展的快捷发饭窗口发送消息' }
  }
  const userId = payload?.userId
  if (typeof userId !== 'string' || !userId) return { error: '请先登录当前饭否账号' }
  if (payload.accountId != null && payload.accountId !== userId) return { error: '所选账号与发送账号不一致，请重新选择。' }
  if (postingAccounts.has(userId)) return { error: '消息正在发送，请稍候' }
  postingAccounts.add(userId)
  const sendKey = getComposerSendKey(userId)
  let posted = false
  let requestTokens
  try {
    const consumer = readConsumerConfig()
    const tokens = payload.accountId
      ? (await composerAccountTokens(consumer)).find(account => account.userId === payload.accountId)
      : await selectAccountTokens(consumer, await currentSession())
    if (!tokens || tokens.authorizationInvalid || tokens.userId !== userId) {
      throw new Error(payload.accountId ? '所选饭否账号尚未授权或授权已失效，请重新登录。' : '当前饭否账号已改变或尚未授权，请重新检查登录状态。')
    }
    requestTokens = tokens
    await browser.storage.local.set({ [sendKey]: { state: 'sending', status: payload.status, imageId: payload.image?.id || null } })
    const response = await createFanfouStatus(createFanfouClient({ ...consumer, ...tokens }), payload.status, payload.image)
    posted = true
    // 弹窗关闭后也由后台清理已发送的草稿；保留其他窗口新写的内容。
    const draftKey = COMPOSER_DRAFT_KEY
    const values = await browser.storage.local.get([draftKey, COMPOSER_IMAGE_KEY])
    const updates = { [sendKey]: { state: 'sent' } }
    if (values[draftKey] === payload.status && (values[COMPOSER_IMAGE_KEY]?.id || null) === (payload.image?.id || null)) {
      updates[draftKey] = ''
      updates[COMPOSER_IMAGE_KEY] = null
    }
    await browser.storage.local.set(updates)
    return { ok: true, statusId: response.id }
  } catch (error) {
    if (!posted && requestTokens && isFanfouAuthorizationInvalid(error)) {
      try {
        const invalid = { ...requestTokens, authorizationInvalid: true, profileError: getFanfouApiError(error) }
        await rememberTokens(invalid)
        if ((await readTokens())?.oauthToken === invalid.oauthToken) await persistTokens(invalid)
        await storage.delete(FANFOU_ACCOUNT_CACHE_KEY, 'local')
      } catch { /* Keep the original API error if updating local account metadata fails. */ }
    }
    const message = posted ? '消息已发送，但草稿清理失败，请勿重复发送。' : getFanfouApiError(error)
    await browser.storage.local.set({ [sendKey]: { state: 'error', error: message, status: payload.status, imageId: payload.image?.id || null } }).catch(() => {})
    return { error: message }
  } finally {
    postingAccounts.delete(userId)
  }
}

export default {
  install() {
    registerHandlers()
  },
}
