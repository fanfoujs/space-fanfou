/* eslint-disable camelcase, new-cap */
import OAuth from 'oauth-1.0a'
import CryptoJS from 'crypto-js'
import messaging from './messaging'
import settings from './settings'
import storage from './storage'
import log from '@libs/log'
import {
  FANFOU_OAUTH_AUTHORIZE,
  FANFOU_OAUTH_GET_STATUS,
  FANFOU_OAUTH_CLEAR_TOKENS,
  FANFOU_OAUTH_API_REQUEST,
} from '@constants'

// fanfoujs/nofan 开源项目公开的 consumer key（与本项目同属 fanfoujs 组织）
// 饭否官方已停止开发者申请，内置此 key 供无法自行申请的用户使用
const BUILTIN_CONSUMER_KEY = '13456aa784cdf7688af69e85d482e011'
const BUILTIN_CONSUMER_SECRET = 'f75c02df373232732b69354ecfbcabea'

const REQUEST_TOKEN_URL = 'https://fanfou.com/oauth/request_token'
const ACCESS_TOKEN_URL = 'https://fanfou.com/oauth/access_token'
const AUTHORIZE_URL = 'https://fanfou.com/oauth/authorize'
const TOKEN_STORAGE_KEY = 'fanfou-oauth/tokens'
const API_HOST = 'https://api.fanfou.com'

let tokenCache

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
  tokenCache = tokens || null

  if (tokens) {
    await storage.write(TOKEN_STORAGE_KEY, tokens, 'local')
  } else {
    try {
      await storage.delete(TOKEN_STORAGE_KEY, 'local')
    } catch (error) {
      log.warn('[SpaceFanfou] 删除 OAuth token 时出错（可忽略）', error)
    }
  }
}

async function readConsumerConfig() {
  const optionValues = await settings.readAll()
  const enabled = !!optionValues['fanfou-oauth']
  const userKey = (optionValues['fanfou-oauth/consumerKey'] || '').trim()
  const userSecret = (optionValues['fanfou-oauth/consumerSecret'] || '').trim()
  // 用户未填写时使用内置 key，保证「开始授权」按钮始终可用
  const consumerKey = userKey || BUILTIN_CONSUMER_KEY
  const consumerSecret = userSecret || BUILTIN_CONSUMER_SECRET

  return {
    enabled,
    consumerKey,
    consumerSecret,
    hasCredentials: true, // 内置 key 始终存在
    usingBuiltinKey: !userKey,
  }
}

function parseQueryString(str = '') {
  return str.split('&').reduce((acc, pair) => {
    if (!pair) return acc
    const [ key, value = '' ] = pair.split('=')

    acc[decodeURIComponent(key)] = decodeURIComponent(value)

    return acc
  }, {})
}

async function signedRequest({
  url,
  method = 'GET',
  params = {},
  consumerKey,
  consumerSecret,
  token,
}) {
  const oauth = createOAuthClient(consumerKey, consumerSecret)
  
  // 特殊修复：即使我们通过 HTTPS 请求，饭否由于极为古老的 OAuth 实现，
  // 依然强制要求 signature 的 origin base 必须是 http://fanfou.com 
  // 否则会返回 401 Invalid signature. 因此我们需要“欺骗”签名器。
  const signUrl = url.replace('https://fanfou.com/oauth', 'http://fanfou.com/oauth')

  const authParams = oauth.authorize({
    url: signUrl,
    method,
    data: params,
  }, token)
  const headers = oauth.toHeader(authParams)
  const search = new URLSearchParams(params)
  let finalUrl = url
  const fetchOptions = {
    method,
    headers,
  }

  if (method === 'GET') {
    const queryString = search.toString()
    if (queryString) {
      finalUrl += (url.includes('?') ? '&' : '?') + queryString
    }
  } else {
    fetchOptions.body = search.toString()
    fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  const response = await fetch(finalUrl, fetchOptions)
  const text = await response.text()

  if (!response.ok) {
    const error = new Error(`Fanfou API ${response.status}`)
    error.status = response.status
    error.responseText = text
    throw error
  }

  return text
}

async function requestTemporaryToken(consumer, redirectUrl) {
  const responseText = await signedRequest({
    url: REQUEST_TOKEN_URL,
    method: 'POST',
    params: {
      oauth_callback: redirectUrl,
    },
    consumerKey: consumer.consumerKey,
    consumerSecret: consumer.consumerSecret,
  })

  return parseQueryString(responseText)
}

async function exchangeAccessToken(consumer, tempToken, verifier) {
  const responseText = await signedRequest({
    url: ACCESS_TOKEN_URL,
    method: 'POST',
    params: {
      oauth_token: tempToken.oauth_token,
      oauth_verifier: verifier,
    },
    consumerKey: consumer.consumerKey,
    consumerSecret: consumer.consumerSecret,
    token: {
      key: tempToken.oauth_token,
      secret: tempToken.oauth_token_secret,
    },
  })

  return parseQueryString(responseText)
}

function launchAuthWindow(authUrl) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    }, responseUrl => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      resolve(responseUrl)
    })
  })
}

function buildStatus({ enabled, hasCredentials, consumerKey, usingBuiltinKey }, tokens, redirectUrl) {
  const hasTokens = Boolean(tokens?.oauthToken && tokens?.oauthTokenSecret)

  return {
    ok: true,
    status: {
      enabled,
      hasConsumerCredentials: hasCredentials,
      usingBuiltinKey: usingBuiltinKey || (!hasTokens ? false : tokens.consumerKey === BUILTIN_CONSUMER_KEY),
      hasTokens,
      canAuthorize: hasCredentials, // 内置 key 始终可授权，无需先勾选复选框
      screenName: tokens?.screenName || null,
      userId: tokens?.userId || null,
      redirectUrl,
      consumerKeyMatches: hasTokens ? tokens.consumerKey === consumerKey : true,
    },
  }
}

async function handleGetStatus() {
  const consumer = await readConsumerConfig()
  const tokens = await readTokens()
  const redirectUrl = chrome.identity.getRedirectURL('fanfou-oauth')

  if (tokens && consumer.consumerKey && tokens.consumerKey !== consumer.consumerKey) {
    // Consumer 改变后旧 token 失效，提示重新授权
    await persistTokens(null)
    return buildStatus(consumer, null, redirectUrl)
  }

  return buildStatus(consumer, tokens, redirectUrl)
}

async function handleAuthorize() {
  try {
    const consumer = await readConsumerConfig()
    const redirectUrl = chrome.identity.getRedirectURL('fanfou-oauth')

    if (!consumer.enabled && !consumer.usingBuiltinKey) {
      return { error: '请先勾选「启用 OAuth 认证」' }
    }

    if (!consumer.hasCredentials) {
      return { error: '请填写 Consumer Key 和 Consumer Secret 后重试' }
    }

    const tempToken = await requestTemporaryToken(consumer, redirectUrl)

    if (!tempToken.oauth_token) {
      return { error: '获取 Request Token 失败，请稍后重试' }
    }

    const authorizeUrl = `${AUTHORIZE_URL}?oauth_token=${encodeURIComponent(tempToken.oauth_token)}&oauth_callback=${encodeURIComponent(redirectUrl)}`
    const responseUrl = await launchAuthWindow(authorizeUrl)
    const parsedUrl = new URL(responseUrl)
    const verifier = parsedUrl.searchParams.get('oauth_verifier')

    if (!verifier) {
      return { error: '授权被取消或未返回 oauth_verifier' }
    }

    const accessTokens = await exchangeAccessToken(consumer, tempToken, verifier)

    if (!accessTokens.oauth_token || !accessTokens.oauth_token_secret) {
      return { error: '获取 Access Token 失败，请确认应用配置' }
    }

    await persistTokens({
      oauthToken: accessTokens.oauth_token,
      oauthTokenSecret: accessTokens.oauth_token_secret,
      screenName: accessTokens.screen_name,
      userId: accessTokens.user_id,
      consumerKey: consumer.consumerKey,
    })

    return handleGetStatus()
  } catch (error) {
    log.error('[SpaceFanfou] OAuth 授权失败:', error)
    return { error: error.message || '授权失败，请查看控制台日志' }
  }
}

async function handleClearTokens() {
  await persistTokens(null)
  return handleGetStatus()
}

async function handleApiRequest(payload) {
  try {
    const { url, method = 'GET', query = {}, responseType = 'json' } = payload

    if (!url || !url.startsWith(API_HOST)) {
      return { error: '仅允许访问 api.fanfou.com 域名' }
    }

    const consumer = await readConsumerConfig()
    const tokens = await readTokens()

    if (!consumer.hasCredentials) {
      return { error: '请先填写 Consumer Key / Secret' }
    }

    if (!tokens || !tokens.oauthToken || !tokens.oauthTokenSecret) {
      return { error: '尚未完成授权，请先点击「开始授权」' }
    }

    if (tokens.consumerKey !== consumer.consumerKey) {
      await persistTokens(null)
      return { error: '保存的授权与当前 Consumer Key 不匹配，请重新授权' }
    }

    const responseText = await signedRequest({
      url,
      method,
      params: query,
      consumerKey: consumer.consumerKey,
      consumerSecret: consumer.consumerSecret,
      token: {
        key: tokens.oauthToken,
        secret: tokens.oauthTokenSecret,
      },
    })

    let responseJSON

    if (responseType === 'json') {
      try {
        responseJSON = JSON.parse(responseText)
      } catch (error) {
        return { error: 'API 返回的 JSON 无法解析', responseText }
      }
    }

    return { responseText, responseJSON }
  } catch (error) {
    log.error('[SpaceFanfou] 调用 FanFou API 失败:', error)
    const errorMessage = error.responseText || error.message || 'API 请求失败'

    return { error: errorMessage }
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
