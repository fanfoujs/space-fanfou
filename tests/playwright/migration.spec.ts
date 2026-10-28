import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Worker,
} from '@playwright/test'

const fixture = `<!doctype html><html><head><meta charset="utf-8"><title>饭否测试页</title><style>#container{width:600px;margin:0 auto}</style></head>
<body><div id="container"><div id="header"></div><div id="navigation"><ul><li><a href="/tester">我的空间</a></li></ul></div>
<div id="content"><div id="phupdate"><form><textarea name="content"></textarea><div class="act"><div class="actpost"><span class="loading"></span><input class="formbutton" type="submit" value="发送"></div></div></form></div>
<div id="stream"><ol></ol></div></div><div id="sidebar"><div id="savedsearchs"><ul></ul></div></div></div></body></html>`
let context: BrowserContext
let worker: Worker
let extensionId: string
let profile: string
const errors: string[] = []

test.beforeAll(async () => {
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'space-fanfou-migration-'))
  const extension = path.resolve('.output/chrome-mv3')
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  })
  context.on('weberror', (error) => {
    errors.push(error.error().message)
    console.error('Browser error:', error.page()?.url(), error.error().stack)
  })
  context.on('console', (message) => {
    if (message.type() === 'error')
      console.error('Browser console:', message.text())
  })
  await context.route(/^https?:\/\/(?:[^/]+\.)?fanfou\.com\//, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: fixture,
      headers: { 'Content-Security-Policy': "script-src 'none'" },
    }),
  )
  worker =
    context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'))
  extensionId = new URL(worker.url()).host
  await expect
    .poll(() =>
      worker.evaluate(() => (globalThis as any).__SF_BACKGROUND_STATE__?.phase),
    )
    .toBe('ready')
})

test.afterAll(async () => {
  await context?.close()
  if (profile) fs.rmSync(profile, { force: true, recursive: true })
})

test('settings loads every original option and saves disabled values', async () => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/settings.html`)
  await expect(page.locator('.wrapper')).toBeVisible()
  const values = await page.evaluate(async () => {
    const api = (globalThis as any).chrome
    return (await api.storage.local.get('settings')).settings
  })
  expect(Object.keys(values).length).toBeGreaterThan(30)
  expect(values['check-saved-searches']).toBe(true)
  expect(values['auto-pager']).toBe(true)
  expect(values['avatar-wallpaper']).toBeDefined()
  for (const key of [
    'show-contextual-statuses/autoFetch',
    'box-shadows',
    'check-friendship',
    'check-saved-searches/enableNotifications',
    'favorite-fanfouers',
    'floating-status-form',
    'floating-status-form/keepFocusAfterPosting',
    'floating-status-form/keepAtNamesAfterPosting',
    'process-unread-statuses/playSound',
    'remove-app-recommendations',
    'remove-personalized-theme',
    'share-to-fanfou',
  ])
    expect(values[key], key).toBe(false)
  expect(values).not.toHaveProperty('avatar-wallpaper/match3Mode')
  await page.evaluate(async () => {
    const api = (globalThis as any).chrome
    const values = (await api.storage.local.get('settings')).settings
    values['auto-pager'] = false
    const response = await api.runtime.sendMessage({
      target: 'space-fanfou-background',
      message: {
        action: 'SETTINGS_WRITE_ALL',
        payload: { optionValues: values },
      },
    })
    if (response?.__isError) throw new Error(response.message)
  })
  await page.reload()
  await expect(page.locator('.wrapper')).toBeVisible()
  expect(
    await page.evaluate(
      async () =>
        (await (globalThis as any).chrome.storage.local.get('settings'))
          .settings['auto-pager'],
    ),
  ).toBe(false)
  await page.screenshot({
    path: 'test-results/migration-settings.png',
    fullPage: true,
  })
  await page.close()
})

test('content and main-world scripts load, styles resolve and draft saving still works', async () => {
  const page = await context.newPage()
  const failedAssets: string[] = []
  page.on('requestfailed', (request) => {
    if (request.url().startsWith('chrome-extension:'))
      failedAssets.push(request.url())
  })
  await page.goto('https://fanfou.com/home')
  await page.waitForFunction(
    () => (window as any).__SF_PAGE_ENTRY_INITIALIZED__ === true,
  )
  const stylesheet = page.locator('link[href*="page-style.css"]')
  await expect(stylesheet).toHaveCount(1)
  await expect
    .poll(() => stylesheet.evaluate((link: HTMLLinkElement) => !!link.sheet))
    .toBe(true)
  const input = page.locator('#phupdate textarea')
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelectorAll('style.sf-asset').length),
    )
    .toBeGreaterThan(0)
  await expect(async () => {
    await input.fill('迁移测试草稿')
    expect(
      await page.evaluate(() =>
        localStorage.getItem('space-fanfou:status-form:draft'),
      ),
    ).toBe('迁移测试草稿')
  }).toPass({ timeout: 10000 })
  await page.reload()
  await expect(input).toHaveValue('迁移测试草稿')
  await input.evaluate((element) =>
    element.dispatchEvent(
      new CustomEvent('SpaceFanfouPostStatusSuccess', {
        bubbles: true,
        detail: { formDataJson: { content: '迁移测试草稿' } },
      }),
    ),
  )
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem('space-fanfou:status-form:draft'),
      ),
    )
    .toBe(null)
  expect(failedAssets).toEqual([])
  await page.close()
})

test('avatar wallpaper retains its layout, favorites, settings and cleanup', async () => {
  const settingsPage = await context.newPage()
  await settingsPage.goto(`chrome-extension://${extensionId}/settings.html`)
  await expect(settingsPage.locator('.wrapper')).toBeVisible()
  await settingsPage
    .getByRole('navigation')
    .getByText('页面外观', { exact: true })
    .click()
  await expect(
    settingsPage.getByText('羊了个羊模式（实验）', { exact: true }),
  ).toHaveCount(0)
  await settingsPage.evaluate(async () => {
    const api = (globalThis as any).chrome
    const avatars = ['red', 'green', 'blue', 'gold'].map(
      (color) =>
        'data:image/svg+xml,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${color}"/></svg>`,
        ),
    )
    await api.storage.local.set({
      'avatar-wallpaper/cache': { version: 1, updatedAt: Date.now(), avatars },
    })
    await api.storage.sync.set({
      'favorite-fanfouers/friendsData': [{ avatarUrl: avatars[0] }],
    })
    const values = (await api.storage.local.get('settings')).settings
    values['avatar-wallpaper'] = true
    const response = await api.runtime.sendMessage({
      target: 'space-fanfou-background',
      message: {
        action: 'SETTINGS_WRITE_ALL',
        payload: { optionValues: values },
      },
    })
    if (response?.__isError) throw new Error(response.message)
  })
  const page = await context.newPage()
  await page.goto('https://fanfou.com/home')
  const wallpaper = page.locator('#sf-avatar-wallpaper')
  await expect(wallpaper).toBeVisible()
  await expect(wallpaper.locator('.sf-avatar-wallpaper-tile')).toHaveCount(4)
  await expect(wallpaper.locator('.sf-avatar-frame-gold')).toHaveCount(1)
  await expect(wallpaper).toHaveCSS('pointer-events', 'none')
  await page.setViewportSize({ width: 1600, height: 900 })
  await expect(wallpaper.locator('.sf-avatar-wallpaper-tile')).toHaveCount(4)
  await settingsPage.evaluate(async () => {
    const api = (globalThis as any).chrome
    const values = (await api.storage.local.get('settings')).settings
    values['avatar-wallpaper/opacity'] = 0.4
    await api.runtime.sendMessage({
      target: 'space-fanfou-background',
      message: {
        action: 'SETTINGS_WRITE_ALL',
        payload: { optionValues: values },
      },
    })
  })
  await expect
    .poll(() =>
      wallpaper.evaluate((element) =>
        (element as HTMLElement).style.getPropertyValue(
          '--sf-avatar-wallpaper-pane-bg-opacity',
        ),
      ),
    )
    .toBe('0.4')
  await page.screenshot({
    path: 'test-results/avatar-wallpaper.png',
    fullPage: true,
  })
  await settingsPage.evaluate(async () => {
    const api = (globalThis as any).chrome
    const values = (await api.storage.local.get('settings')).settings
    values['avatar-wallpaper'] = false
    await api.runtime.sendMessage({
      target: 'space-fanfou-background',
      message: {
        action: 'SETTINGS_WRITE_ALL',
        payload: { optionValues: values },
      },
    })
  })
  await expect(wallpaper).toHaveCount(0)
  await expect(page.locator('body')).not.toHaveClass(
    /sf-avatar-wallpaper-enabled/,
  )
  await page.close()
  await settingsPage.close()
})

test('SDK API and token exchange run in the service worker with existing tokens and camelCase results', async () => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/settings.html`)
  await expect(page.locator('.wrapper')).toBeVisible()
  await worker.evaluate(async () => {
    const state = globalThis as any
    state.__sfOriginalFetch = state.fetch
    state.__sfOriginalCreateTab = state.chrome.tabs.create
    // 授权页和用户操作由模拟代替，SDK 的 token 交换仍在真实 Worker 中执行。
    state.chrome.tabs.create = async (options: { url: string }) => {
      state.__sfAuthorizationUrl = options.url
      return { id: -1 }
    }
    state.__sfSdkRequests = []
    state.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const url = new URL(request.url)
      const isTokenRequest =
        url.origin === 'https://fanfou.com' &&
        /^\/oauth\/(request_token|access_token)$/.test(url.pathname)
      if (url.origin !== 'https://api.fanfou.com' && !isTokenRequest) {
        return state.__sfOriginalFetch(input, init)
      }
      state.__sfSdkRequests.push({
        url: request.url,
        method: request.method,
        authorization: request.headers.get('Authorization'),
      })
      if (isTokenRequest)
        return new Response(
          url.pathname.endsWith('/request_token')
            ? 'oauth_token=sdk-temporary&oauth_token_secret=sdk-temp-secret'
            : 'oauth_token=sdk-access&oauth_token_secret=sdk-access-secret',
        )
      return Response.json({
        id: '~sdk-tester',
        screen_name: 'SDK 测试',
        statuses_count: 42,
      })
    }
    await state.chrome.storage.local.set({
      'fanfou-oauth/tokens': {
        oauthToken: 'sdk-test-token',
        oauthTokenSecret: 'sdk-test-secret',
        consumerKey: '13456aa784cdf7688af69e85d482e011',
      },
    })
  })
  try {
    const result = await page.evaluate(async () =>
      (globalThis as any).chrome.runtime.sendMessage({
        target: 'space-fanfou-background',
        message: {
          action: 'FANFOU_OAUTH_API_REQUEST',
          payload: { method: 'getUser', params: { id: '~sdk-tester' } },
        },
      }),
    )
    expect(result.responseJSON).toMatchObject({
      id: '~sdk-tester',
      screenName: 'SDK 测试',
      statusesCount: 42,
    })
    const requests = await worker.evaluate(
      () => (globalThis as any).__sfSdkRequests,
    )
    expect(requests).toHaveLength(1)
    expect(requests[0].url).toContain('https://api.fanfou.com/users/show.json')
    expect(requests[0].authorization).toContain('oauth_token="sdk-test-token"')
    const started = await page.evaluate(async () =>
      (globalThis as any).chrome.runtime.sendMessage({
        target: 'space-fanfou-background',
        message: {
          action: 'FANFOU_OAUTH_AUTHORIZE',
          payload: { manual: true },
        },
      }),
    )
    expect(started.status.pendingAuthorization).toBe(true)
    const authorizationUrl = new URL(
      await worker.evaluate(() => (globalThis as any).__sfAuthorizationUrl),
    )
    expect(authorizationUrl.searchParams.get('oauth_callback')).toBe('oob')
    expect(authorizationUrl.searchParams.get('oauth_token')).toBe(
      'sdk-temporary',
    )
    const completed = await page.evaluate(async () =>
      (globalThis as any).chrome.runtime.sendMessage({
        target: 'space-fanfou-background',
        message: {
          action: 'FANFOU_OAUTH_AUTHORIZE',
          payload: { complete: true },
        },
      }),
    )
    expect(completed.status).toMatchObject({
      hasTokens: true,
      pendingAuthorization: false,
      screenName: 'SDK 测试',
    })
    const authorizationRequests = await worker.evaluate(() =>
      (globalThis as any).__sfSdkRequests.slice(1),
    )
    expect(
      authorizationRequests.map((request: any) => [
        new URL(request.url).pathname,
        request.method,
      ]),
    ).toEqual([
      ['/oauth/request_token', 'GET'],
      ['/oauth/access_token', 'GET'],
      ['/account/verify_credentials.json', 'GET'],
    ])
    expect(authorizationRequests[1].authorization).toContain(
      'oauth_token="sdk-temporary"',
    )
    expect(authorizationRequests[2].authorization).toContain(
      'oauth_token="sdk-access"',
    )
  } finally {
    await worker.evaluate(() => {
      const state = globalThis as any
      state.fetch = state.__sfOriginalFetch
      state.chrome.tabs.create = state.__sfOriginalCreateTab
      delete state.__sfOriginalFetch
      delete state.__sfOriginalCreateTab
      delete state.__sfAuthorizationUrl
      delete state.__sfSdkRequests
    })
    await page.evaluate(async () =>
      (globalThis as any).chrome.runtime.sendMessage({
        target: 'space-fanfou-background',
        message: { action: 'FANFOU_OAUTH_CLEAR_TOKENS' },
      }),
    )
    await page.close()
  }
})

test('settings and alarms recover after the service worker is stopped', async () => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/settings.html`)
  await expect(page.locator('.wrapper')).toBeVisible()
  await page.evaluate(async () => {
    const api = (globalThis as any).chrome
    const values = (await api.storage.local.get('settings')).settings
    values['auto-pager'] = false
    await api.runtime.sendMessage({
      target: 'space-fanfou-background',
      message: {
        action: 'SETTINGS_WRITE_ALL',
        payload: { optionValues: values },
      },
    })
  })
  const cdp = await context.newCDPSession(page)
  const versions: any[] = []
  cdp.on('ServiceWorker.workerVersionUpdated', ({ versions: update }) =>
    versions.push(...update),
  )
  await cdp.send('ServiceWorker.enable')
  await expect
    .poll(
      () =>
        versions.find(
          (version) =>
            version.scriptURL === worker.url() &&
            version.runningStatus === 'running',
        )?.versionId,
    )
    .toBeTruthy()
  const version = versions.find(
    (version) =>
      version.scriptURL === worker.url() && version.runningStatus === 'running',
  )
  await cdp.send('ServiceWorker.stopWorker', { versionId: version.versionId })
  await page.goto(`chrome-extension://${extensionId}/settings.html`)
  await expect(page.locator('.wrapper')).toBeVisible()
  expect(
    await page.evaluate(
      async () =>
        (await (globalThis as any).chrome.storage.local.get('settings'))
          .settings['auto-pager'],
    ),
  ).toBe(false)
  worker = context
    .serviceWorkers()
    .find((candidate) => candidate.url().endsWith('/background.js'))!
  expect(worker).toBeTruthy()
  const alarms = await page.evaluate(async () =>
    (globalThis as any).chrome.alarms.getAll(),
  )
  expect(alarms.map((alarm: any) => alarm.name)).toEqual(
    expect.arrayContaining(['saved-searches-check', 'notifications-check']),
  )
  await cdp.detach()
  await page.close()
})

test('background services keep repeating alarms and offscreen document survives startup', async () => {
  const state = await worker.evaluate(async () => {
    const api = (globalThis as any).chrome
    return {
      alarms: await api.alarms.getAll(),
      offscreen: await api.offscreen.hasDocument(),
    }
  })
  expect(state.alarms.map((alarm: any) => alarm.name)).toContain(
    'saved-searches-check',
  )
  expect(state.alarms.map((alarm: any) => alarm.name)).toContain(
    'notifications-check',
  )
  expect(
    state.alarms.find((alarm: any) => alarm.name === 'notifications-check')
      ?.periodInMinutes,
  ).toBe(1)
  expect(state.offscreen).toBe(true)
  expect(errors).toEqual([])
})
