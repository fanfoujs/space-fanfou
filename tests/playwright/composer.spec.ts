import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  composerImageBytes,
  composerImageFixture,
} from '../fixtures/composer-image'
import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Worker,
} from '@playwright/test'

let context: BrowserContext
let worker: Worker
let extensionUrl: string
let profile: string
const errors: string[] = []

test.beforeAll(async () => {
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'space-fanfou-composer-'))
  const extension = path.resolve('.output/chrome-mv3')
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  })
  context.on('weberror', (error) => errors.push(error.error().message))
  worker =
    context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'))
  extensionUrl = `chrome-extension://${new URL(worker.url()).host}/settings.html`
  await expect
    .poll(() =>
      worker.evaluate(() => (globalThis as any).__SF_BACKGROUND_STATE__?.phase),
    )
    .toBe('ready')
  // All session/API responses are local fixtures. No messages are posted to Fanfou.
  await worker.evaluate(async () => {
    const api = (globalThis as any).chrome
    const fixture = ((globalThis as any).__composerTest = {
      userId: 'tester',
      fail: false,
      hold: false,
      posts: [],
      postAccounts: [] as (string | undefined)[],
      finish: null,
      pauseSession: false,
      pauseProfile: false,
      failSession: false,
      sessionWaiters: [] as (() => void)[],
      profileWaiters: [] as (() => void)[],
      sessionReads: 0,
      profileReads: 0,
      profileName: '测试饭友',
      photoUploads: [] as {
        caption: FormDataEntryValue | null
        name: string
        size: number
        type: string
        account?: string
      }[],
    })
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init)
      const url = new URL(request.url)
      if (url.hostname === 'fanfou.com' && url.pathname === '/home') {
        fixture.sessionReads++
        if (fixture.pauseSession)
          await new Promise<void>((resolve) =>
            fixture.sessionWaiters.push(resolve),
          )
        if (fixture.failSession) throw new Error('offline')
        return new Response(
          `<div id="navigation"><a href="/${fixture.userId}">我的空间</a></div><div id="user_top"><h3>测试饭友</h3></div>`,
        )
      }
      if (
        url.hostname === 'api.fanfou.com' &&
        url.pathname === '/photos/upload.json'
      ) {
        const form = await request.formData()
        const photo = form.get('photo') as File
        fixture.photoUploads.push({
          caption: form.get('status'),
          name: photo.name,
          size: photo.size,
          type: photo.type,
          account: request.headers
            .get('Authorization')
            ?.match(/oauth_token="([^"]+)"/)?.[1],
        })
        if (fixture.hold)
          return new Promise<Response>((resolve) => {
            fixture.finish = () =>
              resolve(Response.json({ id: 'delayed-photo' }))
          })
        return fixture.fail
          ? Response.json({ error: '测试图片发送失败' }, { status: 503 })
          : Response.json({ id: 'posted-photo' })
      }
      if (
        url.hostname === 'api.fanfou.com' &&
        url.pathname === '/users/show.json'
      ) {
        fixture.profileReads++
        if (fixture.pauseProfile)
          await new Promise<void>((resolve) =>
            fixture.profileWaiters.push(resolve),
          )
        return Response.json({
          id: fixture.userId,
          screen_name: fixture.profileName,
        })
      }
      if (
        url.hostname === 'api.fanfou.com' &&
        url.pathname === '/statuses/update.json'
      ) {
        fixture.posts.push(
          new URLSearchParams(await request.text()).get('status'),
        )
        fixture.postAccounts.push(
          request.headers
            .get('Authorization')
            ?.match(/oauth_token="([^"]+)"/)?.[1],
        )
        if (fixture.hold)
          return new Promise<Response>((resolve) => {
            fixture.finish = () =>
              resolve(Response.json({ id: 'delayed-status' }))
          })
        return fixture.fail
          ? Response.json({ error: '测试发送失败' }, { status: 503 })
          : Response.json({ id: 'posted-status' })
      }
      if (url.hostname === 'api.fanfou.com')
        return Response.json({ id: fixture.userId, screen_name: '测试饭友' })
      return new Response('Unmocked request', { status: 404 })
    }
    await api.storage.local.set({
      'fanfou-oauth/tokens': {
        consumerKey: '3b8763186f221a7d1f4afa56969898b9',
        oauthToken: 'test-access',
        oauthTokenSecret: 'test-secret',
        userId: 'tester',
        accountIds: ['tester'],
        screenName: '测试饭友',
      },
    })
  })
})

test.afterAll(async () => {
  await context?.close()
  if (profile) fs.rmSync(profile, { recursive: true, force: true })
  expect(errors).toEqual([])
})

test.beforeEach(async () => {
  await worker.evaluate(async () => {
    const api = (globalThis as any).chrome
    await api.storage.local.remove([
      'settings/popupMode',
      'settings/lastTab',
      'composer/selectedAccount',
      'composer/draft',
      'composer/draft-tester',
      'composer/draft-second',
      'composer/image',
      'user-switcher/allUserData',
    ])
    await api.storage.sync.remove([
      'settings/defaultPopupMode',
      'settings/lastTabId',
    ])
    const fixture = (globalThis as any).__composerTest
    fixture.pauseSession = false
    fixture.pauseProfile = false
    fixture.failSession = false
    fixture.profileName = '测试饭友'
    for (const finish of [
      ...fixture.sessionWaiters.splice(0),
      ...fixture.profileWaiters.splice(0),
    ])
      finish()
  })
})

test('popup default, mode switching and draft recovery preserve existing settings behavior', async () => {
  const page = await context.newPage()
  await page.setViewportSize({ width: 560, height: 600 })
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.locator('.wrapper')).toBeVisible()
  await page.getByRole('button', { name: '工具', exact: true }).click()
  await page.getByRole('radio', { name: '快捷发饭', exact: true }).check()
  await expect(
    page.getByRole('radio', { name: '快捷发饭', exact: true }),
  ).toBeEnabled()
  await page.getByRole('button', { name: '快捷发饭', exact: true }).click()
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await page.getByLabel('饭否消息').fill('保留跨模式、跨窗口的草稿')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await expect(page.locator('.wrapper')).toBeVisible()
  await page.getByRole('button', { name: '快捷发饭', exact: true }).hover()
  await page.screenshot({ path: 'test-results/composer-settings.png' })
  await page.getByRole('button', { name: '快捷发饭', exact: true }).click()
  await expect(page.getByLabel('饭否消息')).toHaveValue(
    '保留跨模式、跨窗口的草稿',
  )
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (
            await (globalThis as any).chrome.storage.local.get('composer/draft')
          )['composer/draft'],
      ),
    )
    .toBe('保留跨模式、跨窗口的草稿')
  await page.close()

  const popup = await context.newPage()
  await popup.setViewportSize({ width: 560, height: 600 })
  await popup.goto(`${extensionUrl}?popup`)
  await expect(popup.locator('.wrapper')).toBeHidden()
  await expect(popup.getByLabel('饭否消息')).toHaveValue(
    '保留跨模式、跨窗口的草稿',
  )
  await popup
    .locator('body')
    .screenshot({ path: 'test-results/composer-popup.png' })
  await popup.close()

  const settings = await context.newPage()
  await settings.goto(extensionUrl)
  await expect(settings.locator('.wrapper')).toBeVisible()
  await settings.setViewportSize({ width: 560, height: 600 })
  expect(
    await settings.evaluate(() => document.body.scrollWidth <= innerWidth),
  ).toBe(true)
  await settings.close()
})

test('recovers the existing account draft once without restoring it after the shared draft is cleared', async () => {
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'settings/popupMode': 'compose',
      'composer/draft-tester': '升级前尚未发送的草稿',
    }),
  )
  let page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toHaveValue('升级前尚未发送的草稿')
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (
            await (globalThis as any).chrome.storage.local.get('composer/draft')
          )['composer/draft'],
      ),
    )
    .toBe('升级前尚未发送的草稿')
  await page.getByLabel('饭否消息').fill('')
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (
            await (globalThis as any).chrome.storage.local.get('composer/draft')
          )['composer/draft'],
      ),
    )
    .toBe('')
  await page.close()
  page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await expect(page.getByLabel('饭否消息')).toHaveValue('')
  expect(
    await worker.evaluate(
      async () =>
        (
          await (globalThis as any).chrome.storage.local.get(
            'composer/draft-tester',
          )
        )['composer/draft-tester'],
    ),
  ).toBe('升级前尚未发送的草稿')
  await page.close()
})

test('successful confirmation clears the editor even if the background leaves the stored draft untouched', async () => {
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'settings/popupMode': 'compose',
    }),
  )
  const page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await page.getByLabel('饭否消息').fill('已经发送成功的正文')
  await page.evaluate(() => {
    const api = (globalThis as any).chrome
    const original = api.runtime.sendMessage.bind(api.runtime)
    api.runtime.sendMessage = (request: any, ...rest: any[]) =>
      request.message?.action === 'FANFOU_COMPOSE_SEND'
        ? Promise.resolve({ ok: true, statusId: 'confirmed-status' })
        : original(request, ...rest)
  })
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.getByLabel('饭否消息')).toHaveValue('', { timeout: 1500 })
  expect(
    await page.evaluate(
      async () =>
        (await (globalThis as any).chrome.storage.local.get('composer/draft'))[
          'composer/draft'
        ],
    ),
  ).toBe('')
  await page.reload()
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await expect(page.getByLabel('饭否消息')).toHaveValue('')
  await page.close()
})

test('successful confirmation also clears the attached image when background cleanup was missed', async () => {
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'settings/popupMode': 'compose',
    }),
  )
  const page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await page.getByLabel('饭否消息').fill('已发送的图片说明')
  await page
    .getByLabel('选择图片', { exact: true })
    .setInputFiles({
      name: 'preview.png',
      mimeType: 'image/png',
      buffer: composerImageBytes,
    })
  await expect(page.getByRole('img', { name: '待发送的图片' })).toBeVisible()
  await page.evaluate(() => {
    const api = (globalThis as any).chrome
    const original = api.runtime.sendMessage.bind(api.runtime)
    api.runtime.sendMessage = (request: any, ...rest: any[]) =>
      request.message?.action === 'FANFOU_COMPOSE_SEND'
        ? Promise.resolve({ ok: true, statusId: 'confirmed-photo' })
        : original(request, ...rest)
  })
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.getByLabel('饭否消息')).toHaveValue('')
  await expect(page.getByRole('img', { name: '待发送的图片' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await expect(page.getByLabel('饭否消息')).toHaveValue('')
  await expect(page.getByRole('img', { name: '待发送的图片' })).toHaveCount(0)
  await page.close()
})

test('a confirmed response cannot erase a newer draft written while the request was pending', async () => {
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'settings/popupMode': 'compose',
    }),
  )
  const page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await page.getByLabel('饭否消息').fill('已经发送的旧正文')
  await page.evaluate(() => {
    const api = (globalThis as any).chrome
    const original = api.runtime.sendMessage.bind(api.runtime)
    api.runtime.sendMessage = async (request: any, ...rest: any[]) => {
      if (request.message?.action !== 'FANFOU_COMPOSE_SEND')
        return original(request, ...rest)
      await api.storage.local.set({
        'composer/draft': '另一窗口后来写的新正文',
      })
      return { ok: true, statusId: 'confirmed-older-status' }
    }
  })
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.getByLabel('饭否消息')).toHaveValue(
    '另一窗口后来写的新正文',
  )
  expect(
    await page.evaluate(
      async () =>
        (await (globalThis as any).chrome.storage.local.get('composer/draft'))[
          'composer/draft'
        ],
    ),
  ).toBe('另一窗口后来写的新正文')
  await page.close()
})

test('missing message IDs are not treated as confirmed success and keep the draft', async () => {
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'settings/popupMode': 'compose',
    }),
  )
  const page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await page.getByLabel('饭否消息').fill('尚未确认成功的正文')
  await page.evaluate(() => {
    const api = (globalThis as any).chrome
    const original = api.runtime.sendMessage.bind(api.runtime)
    api.runtime.sendMessage = (request: any, ...rest: any[]) =>
      request.message?.action === 'FANFOU_COMPOSE_SEND'
        ? Promise.resolve({ ok: true })
        : original(request, ...rest)
  })
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('未能确认发送结果')
  await expect(page.getByLabel('饭否消息')).toHaveValue('尚未确认成功的正文')
  await page.close()
})

test('send validation, failure recovery, and background cleanup after closing the popup', async () => {
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'settings/popupMode': 'compose',
    }),
  )
  const page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  const textarea = page.getByLabel('饭否消息')
  const send = page.getByRole('button', { name: '发送', exact: true })
  await expect(textarea).toBeEnabled()
  await textarea.fill('饭'.repeat(141))
  await expect(send).toBeDisabled()
  await expect(page.locator('.sf-composer__count')).toHaveClass(/is-exceeded/)
  await textarea.fill('   ')
  await expect(send).toBeDisabled()

  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.fail = true
  })
  await textarea.fill('发送失败后保留')
  await send.click()
  await expect(page.getByRole('alert')).toHaveText('测试发送失败')
  await expect(textarea).toHaveValue('发送失败后保留')

  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.fail = false
  })
  await textarea.press('Control+Enter')
  await expect(textarea).toHaveValue('')

  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.hold = true
  })
  await textarea.fill('关闭窗口后完成发送')
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (
            await (globalThis as any).chrome.storage.local.get('composer/draft')
          )['composer/draft'],
      ),
    )
    .toBe('关闭窗口后完成发送')
  await page.reload()
  await expect(textarea).toHaveValue('关闭窗口后完成发送')
  await expect(page.getByRole('status')).toHaveCount(0)
  await send.click()
  await expect
    .poll(() =>
      worker.evaluate(() => !!(globalThis as any).__composerTest.finish),
    )
    .toBe(true)
  await page.close()
  const reopened = await context.newPage()
  await reopened.goto(`${extensionUrl}?popup`)
  await expect(
    reopened.getByRole('button', { name: '正在发送…', exact: true }),
  ).toBeDisabled()
  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.finish()
  })
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (
            await (globalThis as any).chrome.storage.local.get('composer/draft')
          )['composer/draft'],
      ),
    )
    .toBe('')
  await expect(reopened.getByLabel('饭否消息')).toHaveValue('')
  await reopened.close()
  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.hold = false
  })
})

test('switching website accounts keeps the shared draft and requires authorization for the new account', async () => {
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'settings/popupMode': 'compose',
    }),
  )
  const page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await page.getByLabel('饭否消息').fill('tester 的草稿')
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (
            await (globalThis as any).chrome.storage.local.get('composer/draft')
          )['composer/draft'],
      ),
    )
    .toBe('tester 的草稿')
  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.userId = 'second'
  })
  await page.reload()
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await expect(page.getByLabel('饭否消息')).toHaveValue('tester 的草稿')
  await expect(page.getByRole('button', { name: '前往登录' })).toBeVisible()
  await page.getByLabel('饭否消息').fill('second 的草稿')
  await expect(
    page.getByRole('button', { name: '发送', exact: true }),
  ).toBeDisabled()
  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.userId = 'tester'
  })
  await page.reload()
  await expect(page.getByLabel('饭否消息')).toHaveValue('second 的草稿')
  await page.close()
})

test('remembers both popup modes and the selected settings category after every close', async () => {
  // Reproduce an existing installation whose old category points to Help.
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.sync.set({ 'settings/lastTabId': 4 }),
  )
  let page = await context.newPage()
  await page.setViewportSize({ width: 560, height: 600 })
  await page.goto(`${extensionUrl}?popup`)
  await expect(
    page.getByRole('heading', { name: '帮助与支持', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.sf-app-header')).toHaveCount(0)
  await page.getByRole('button', { name: '页面外观', exact: true }).click()
  await page.close()

  page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(
    page.getByRole('heading', { name: '页面外观', exact: true }),
  ).toBeVisible()
  // A stale synced value must no longer override the local selection.
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.sync.set({ 'settings/lastTabId': 4 }),
  )
  await page.getByRole('button', { name: '快捷发饭', exact: true }).click()
  await page.close()

  page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toBeVisible()
  await expect(page.locator('.sf-app-header')).toHaveCount(0)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.close()

  page = await context.newPage()
  await page.setViewportSize({ width: 560, height: 600 })
  await page.goto(`${extensionUrl}?popup`)
  await expect(
    page.getByRole('heading', { name: '页面外观', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: '工具', exact: true }).click()
  await expect(
    page.getByRole('radio', { name: '设置', exact: true }),
  ).toBeChecked()
  await expect(page.locator('#tabs')).toHaveCSS('height', '600px')
  await expect(page.locator('#tabs header:visible')).toHaveCSS('top', '0px')
  await page.screenshot({ path: 'test-results/composer-settings.png' })
  await page.getByRole('button', { name: '快捷发饭', exact: true }).click()
  await page
    .locator('body')
    .screenshot({ path: 'test-results/composer-popup.png' })
  await page.setViewportSize({ width: 320, height: 600 })
  // Full-page mode also fits when the browser is narrow.
  await page.goto(`${extensionUrl}?mode=compose`)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.close()
})

test('migrates old preferences, then remembers mode switches without overriding direct settings links', async () => {
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.sync.set({
      'settings/defaultPopupMode': 'compose',
    }),
  )
  const page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toBeVisible()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.reload()
  await expect(page.locator('.wrapper')).toBeVisible()
  await page.getByRole('button', { name: '工具', exact: true }).click()
  await page.getByRole('radio', { name: '快捷发饭', exact: true }).check()
  await expect(
    page.getByRole('radio', { name: '快捷发饭', exact: true }),
  ).toBeEnabled()
  await page.reload()
  await expect(page.getByLabel('饭否消息')).toBeVisible()
  const direct = await context.newPage()
  await direct.goto(extensionUrl)
  await expect(
    direct.getByRole('heading', { name: '工具', exact: true }),
  ).toBeVisible()
  await direct.goto(`${extensionUrl}#version-history`)
  await expect(
    direct.getByRole('heading', { name: '更新历史', exact: true }),
  ).toBeVisible()
  await direct.close()
  await page.reload()
  await expect(page.getByLabel('饭否消息')).toBeVisible()
  await page.close()
})

test('recognizes a native toolbar popup opened with the old unmarked URL', async () => {
  const harness = await context.newPage()
  await harness.goto(extensionUrl)
  await expect(harness.locator('.wrapper')).toBeVisible()
  try {
    await worker.evaluate(async () => {
      const api = (globalThis as any).chrome
      await api.storage.local.set({ 'settings/popupMode': 'compose' })
      await api.action.setPopup({ popup: 'settings.html' })
      await api.action.openPopup()
    })
    // Chromium exposes the real toolbar popup as an "other" target rather than
    // a Playwright page. Inspect its same-origin view from the settings tab.
    await expect
      .poll(() =>
        harness.evaluate(() => {
          const popup = (globalThis as any).chrome.extension.getViews({
            type: 'popup',
          })[0]
          return popup
            ? {
                url: popup.location.href,
                isPopup: popup.document.body.classList.contains('sf-popup'),
                composerVisible: !!popup.document.querySelector(
                  '.sf-composer:not([hidden]) textarea',
                ),
                width: popup.innerWidth,
                height: popup.innerHeight,
              }
            : null
        }),
      )
      .toEqual({
        url: extensionUrl,
        isPopup: true,
        composerVisible: true,
        width: 440,
        height: 220,
      })
    await harness.evaluate(() => {
      const popup = (globalThis as any).chrome.extension.getViews({
        type: 'popup',
      })[0]
      popup.document.querySelector('.sf-composer__settings').click()
    })
    await expect
      .poll(() =>
        harness.evaluate(() => {
          const popup = (globalThis as any).chrome.extension.getViews({
            type: 'popup',
          })[0]
          return [popup.innerWidth, popup.innerHeight]
        }),
      )
      .toEqual([560, 600])
    await harness.evaluate(() => {
      const popup = (globalThis as any).chrome.extension.getViews({
        type: 'popup',
      })[0]
      popup.document.querySelector('.sf-nav-actions button').click()
    })
    await expect
      .poll(() =>
        harness.evaluate(() => {
          const popup = (globalThis as any).chrome.extension.getViews({
            type: 'popup',
          })[0]
          return [popup.innerWidth, popup.innerHeight]
        }),
      )
      .toEqual([440, 220])
  } finally {
    await harness.evaluate(() => {
      for (const popup of (globalThis as any).chrome.extension.getViews({
        type: 'popup',
      }))
        popup.close()
    })
    await harness.close()
    await worker.evaluate(() =>
      (globalThis as any).chrome.action.setPopup({
        popup: 'settings.html?popup',
      }),
    )
  }
})

async function seedCachedAccount() {
  await worker.evaluate(async () => {
    const api = (globalThis as any).chrome
    await api.storage.local.set({
      'settings/popupMode': 'compose',
      'fanfou-oauth/status': {
        consumerKey: '3b8763186f221a7d1f4afa56969898b9',
        status: {
          loggedIn: true,
          hasTokens: true,
          userId: 'tester',
          currentUserId: 'tester',
          screenName: '缓存的饭友',
          pendingAuthorization: false,
        },
      },
    })
  })
}

test('cached names and drafts remain usable while both session and profile requests are stalled', async () => {
  await seedCachedAccount()
  await worker.evaluate(() => {
    const fixture = (globalThis as any).__composerTest
    fixture.pauseSession = true
    fixture.pauseProfile = true
    fixture.profileName = '更新后的饭友'
  })
  const page = await context.newPage()
  await page.setViewportSize({ width: 560, height: 600 })
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.locator('.sf-composer__account')).toContainText(
    '缓存的饭友',
  )
  await expect(page.getByRole('img', { name: '正在更新账号信息' })).toHaveCount(
    0,
  )
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await page.getByLabel('饭否消息').fill('请求还没完成，也可以先写饭')
  await expect(
    page.getByRole('button', { name: '发送', exact: true }),
  ).toBeEnabled()
  await page
    .locator('body')
    .screenshot({ path: 'test-results/composer-cached-account.png' })

  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '工具', exact: true }).click()
  await expect(page.locator('.sf-oauth-panel__status')).toContainText(
    '缓存的饭友',
  )
  await expect(page.getByRole('img', { name: '正在更新账号信息' })).toHaveCount(
    0,
  )
  await expect(
    page.getByRole('button', { name: /^移除 / }).first(),
  ).toBeEnabled()
  await page.locator('.sf-oauth-panel').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/oauth-cached-account.png' })

  await expect
    .poll(() =>
      worker.evaluate(
        () => (globalThis as any).__composerTest.sessionWaiters.length,
      ),
    )
    .toBeGreaterThan(0)
  await worker.evaluate(() => {
    const fixture = (globalThis as any).__composerTest
    fixture.pauseSession = false
    for (const finish of fixture.sessionWaiters.splice(0)) finish()
  })
  await expect
    .poll(() =>
      worker.evaluate(
        () => (globalThis as any).__composerTest.profileWaiters.length,
      ),
    )
    .toBeGreaterThan(0)
  await expect(page.locator('.sf-oauth-panel__status')).toContainText(
    '缓存的饭友',
  )
  await worker.evaluate(() => {
    const fixture = (globalThis as any).__composerTest
    fixture.pauseProfile = false
    for (const finish of fixture.profileWaiters.splice(0)) finish()
  })
  await expect(page.locator('.sf-oauth-panel__status')).toContainText(
    '更新后的饭友',
  )
  await expect(page.getByRole('img', { name: '正在更新账号信息' })).toHaveCount(
    0,
  )
  await page.getByRole('button', { name: '快捷发饭', exact: true }).click()
  await expect(page.getByLabel('饭否消息')).toHaveValue(
    '请求还没完成，也可以先写饭',
  )
  await expect(page.locator('.sf-composer__account')).toContainText(
    '更新后的饭友',
  )
  await page.close()
})

test('offline checks keep cached login visible in both composer and OAuth settings', async () => {
  await seedCachedAccount()
  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.failSession = true
  })
  const page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.locator('.sf-composer__account')).toContainText(
    '缓存的饭友',
  )
  await expect(
    page.locator('.sf-composer__account .sf-account-check-note'),
  ).toHaveText('暂未更新')
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await expect(page.getByRole('button', { name: '前往登录' })).toHaveCount(0)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '工具', exact: true }).click()
  await expect(page.locator('.sf-oauth-panel__status')).toContainText(
    '缓存的饭友',
  )
  await expect(
    page.locator('.sf-oauth-panel .sf-account-check-note'),
  ).toHaveText('暂未更新')
  await expect(
    page.getByRole('button', { name: /^移除 / }).first(),
  ).toBeEnabled()
  await page.close()
  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.failSession = false
  })
})

test('account picker remembers the sender, keeps the same draft, and sends without switching the website account', async () => {
  await worker.evaluate(async () => {
    const api = (globalThis as any).chrome
    const key = 'fanfou-oauth/accounts'
    const values = await api.storage.local.get(key)
    const consumerKey = '3b8763186f221a7d1f4afa56969898b9'
    await api.storage.local.set({
      'settings/popupMode': 'compose',
      'composer/draft-second': '第二个账号的草稿',
      [key]: {
        ...values[key],
        [`${consumerKey}:second-access`]: {
          consumerKey,
          oauthToken: 'second-access',
          oauthTokenSecret: 'second-secret',
          userId: 'second',
          accountIds: ['second'],
          screenName: '第二个饭否账号',
        },
        [`${consumerKey}:expired`]: {
          consumerKey,
          oauthToken: 'expired',
          oauthTokenSecret: 'expired-secret',
          userId: 'expired',
          accountIds: ['expired'],
          screenName: '过期账号',
          authorizationInvalid: true,
        },
      },
    })
  })
  let page = await context.newPage()
  await page.setViewportSize({ width: 560, height: 600 })
  await page.goto(`${extensionUrl}?popup`)
  const picker = page.getByRole('combobox', { name: '发送账号' })
  await expect(picker).toHaveValue('tester')
  await expect(picker.locator('option[value="expired"]')).toHaveAttribute(
    'disabled',
    '',
  )
  await page.getByLabel('饭否消息').fill('切换账号也保留的草稿')
  await picker.selectOption('second')
  await expect(page.getByLabel('饭否消息')).toHaveValue('切换账号也保留的草稿')
  await picker.selectOption('tester')
  await expect(page.getByLabel('饭否消息')).toHaveValue('切换账号也保留的草稿')
  await picker.selectOption('second')
  await expect(page.getByLabel('饭否消息')).toHaveValue('切换账号也保留的草稿')
  await page
    .locator('body')
    .screenshot({ path: 'test-results/composer-accounts.png' })
  await page.close()

  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.userId = 'website-only'
  })
  page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByRole('combobox', { name: '发送账号' })).toHaveValue(
    'second',
  )
  await expect(page.getByLabel('饭否消息')).toHaveValue('切换账号也保留的草稿')
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.getByLabel('饭否消息')).toHaveValue('')
  expect(
    await worker.evaluate(() =>
      (globalThis as any).__composerTest.postAccounts.at(-1),
    ),
  ).toBe('second-access')
  expect(
    await worker.evaluate(() => (globalThis as any).__composerTest.userId),
  ).toBe('website-only')
  await page.getByRole('combobox', { name: '发送账号' }).selectOption('tester')
  await expect(page.getByLabel('饭否消息')).toHaveValue('')
  await page.getByRole('combobox', { name: '发送账号' }).selectOption('second')
  await expect(page.getByLabel('饭否消息')).toHaveValue('')
  await page.close()
  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.userId = 'tester'
  })
})

test('account manager lists authorizations, resumes login guidance, and synchronizes removal with the composer', async () => {
  await worker.evaluate(async () => {
    const api = (globalThis as any).chrome
    const consumerKey = '3b8763186f221a7d1f4afa56969898b9'
    const key = 'fanfou-oauth/accounts'
    const values = await api.storage.local.get(key)
    await api.storage.local.set({
      [key]: {
        ...values[key],
        [`${consumerKey}:second-access`]: {
          consumerKey,
          oauthToken: 'second-access',
          oauthTokenSecret: 'second-secret',
          userId: 'second',
          accountIds: ['second'],
          screenName: '第二个饭否账号',
        },
        [`${consumerKey}:expired`]: {
          consumerKey,
          oauthToken: 'expired',
          oauthTokenSecret: 'expired-secret',
          userId: 'expired',
          accountIds: ['expired'],
          screenName: '过期账号',
          authorizationInvalid: true,
        },
      },
      'composer/draft': '移除授权也保留的草稿',
    })
  })
  let settings = await context.newPage()
  await settings.setViewportSize({ width: 560, height: 600 })
  await settings.goto(`${extensionUrl}?popup`)
  await settings.getByRole('button', { name: '工具', exact: true }).click()
  const current = settings.locator(
    '.sf-oauth-account[data-account-id="tester"]',
  )
  await expect(current).toContainText('当前网页')
  await expect(current).toContainText('已授权')
  await expect(
    settings.locator('.sf-oauth-account[data-account-id="second"]'),
  ).toContainText('已授权')
  const expired = settings.locator(
    '.sf-oauth-account[data-account-id="expired"]',
  )
  await expect(expired).toContainText('需重新授权')
  await settings
    .locator('body')
    .screenshot({ path: 'test-results/account-manager.png' })
  await expired.getByRole('button', { name: '重新授权', exact: true }).click()
  await expect(
    settings.getByRole('group', { name: '重新授权账号' }),
  ).toContainText('过期账号')
  await settings.getByRole('button', { name: '取消', exact: true }).click()
  await settings
    .getByRole('button', { name: '登录其他账号', exact: true })
    .click()
  await expect(
    settings.getByRole('group', { name: '添加饭否账号' }),
  ).toBeVisible()
  await settings
    .getByRole('button', { name: '授权当前网页账号', exact: true })
    .click()
  await expect(settings.getByRole('alert')).toContainText(
    '当前网页账号已经授权',
  )
  await settings.close()

  settings = await context.newPage()
  await settings.setViewportSize({ width: 560, height: 600 })
  await settings.goto(`${extensionUrl}?popup`)
  await expect(
    settings.getByRole('group', { name: '添加饭否账号' }),
  ).toBeVisible()
  await settings.getByRole('button', { name: '取消', exact: true }).click()
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'settings/popupMode': 'compose',
      'composer/selectedAccount': 'second',
    }),
  )
  const composer = await context.newPage()
  await composer.goto(`${extensionUrl}?popup`)
  await expect(
    composer.getByRole('combobox', { name: '发送账号' }),
  ).toHaveValue('second')
  await expect(composer.getByLabel('饭否消息')).toHaveValue(
    '移除授权也保留的草稿',
  )
  await settings
    .getByRole('button', { name: '移除 第二个饭否账号 的授权', exact: true })
    .click()
  await expect(
    settings.locator('.sf-oauth-account[data-account-id="second"]'),
  ).toHaveCount(0)
  await expect(
    composer
      .getByRole('combobox', { name: '发送账号' })
      .locator('option[value="second"]'),
  ).toHaveCount(0)
  await expect(
    composer.getByRole('combobox', { name: '发送账号' }),
  ).toHaveValue('tester')
  expect(
    await worker.evaluate(
      async () =>
        (await (globalThis as any).chrome.storage.local.get('composer/draft'))[
          'composer/draft'
        ],
    ),
  ).toBe('移除授权也保留的草稿')
  await expect(composer.getByLabel('饭否消息')).toHaveValue(
    '移除授权也保留的草稿',
  )
  await composer.close()
  await settings.close()
})

test('website logins appear live in the manager even without separate OAuth authorization', async () => {
  await worker.evaluate(async () => {
    const api = (globalThis as any).chrome
    const key = 'fanfou-oauth/accounts'
    const values = await api.storage.local.get(key)
    await api.storage.local.set({
      [key]: Object.fromEntries(
        Object.entries(values[key] || {}).filter(
          ([, value]) => (value as any).userId === 'tester',
        ),
      ),
    })
  })
  const settings = await context.newPage()
  await settings.setViewportSize({ width: 560, height: 600 })
  await settings.goto(`${extensionUrl}?popup`)
  await settings.getByRole('button', { name: '工具', exact: true }).click()
  await expect(settings.locator('.sf-oauth-account')).toHaveCount(1)
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'user-switcher/allUserData': [
        {
          userId: 'tester',
          nickname: '网页账号一',
          cookies: { u: 'test-private-session-a' },
        },
        {
          userId: 'web-only',
          nickname: '网页账号二',
          cookies: { u: 'test-private-session-b' },
        },
      ],
    }),
  )
  await expect(settings.locator('.sf-oauth-account')).toHaveCount(2)
  const website = settings.locator(
    '.sf-oauth-account[data-account-id="web-only"]',
  )
  await expect(website).toContainText('网页账号二')
  await expect(website).toContainText('未授权')
  await expect(
    website.getByRole('button', { name: '授权', exact: true }),
  ).toBeVisible()
  await expect(
    settings.locator('.sf-oauth-account[data-account-id="tester"]'),
  ).toContainText('已授权')
  await settings
    .locator('body')
    .screenshot({ path: 'test-results/account-manager-website-logins.png' })
  await website.getByRole('button', { name: '授权', exact: true }).click()
  await expect(
    settings.getByRole('group', { name: '授权饭否账号' }),
  ).toContainText('网页账号二')
  await settings.getByRole('button', { name: '取消', exact: true }).click()

  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'settings/popupMode': 'compose',
    }),
  )
  const composer = await context.newPage()
  await composer.goto(`${extensionUrl}?popup`)
  const option = composer
    .getByRole('combobox', { name: '发送账号' })
    .locator('option[value="web-only"]')
  await expect(option).toHaveText('网页账号二（未授权）')
  await expect(option).toHaveAttribute('disabled', '')
  await composer.close()
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'user-switcher/allUserData': [
        { userId: 'tester', nickname: '网页账号一' },
      ],
    }),
  )
  await expect(website).toHaveCount(0)
  await settings.close()
})

test('pasted images keep their caption across account switches, reopen, and failed uploads', async () => {
  await worker.evaluate(async () => {
    const api = (globalThis as any).chrome
    const key = 'fanfou-oauth/accounts'
    const saved = (await api.storage.local.get(key))[key] || {}
    const consumerKey = '3b8763186f221a7d1f4afa56969898b9'
    await api.storage.local.set({
      'settings/popupMode': 'compose',
      [key]: {
        ...saved,
        [`${consumerKey}:second-access`]: {
          consumerKey,
          oauthToken: 'second-access',
          oauthTokenSecret: 'second-secret',
          userId: 'second',
          accountIds: ['second'],
          screenName: '第二个饭否账号',
        },
      },
    })
  })
  let page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await page.getByLabel('饭否消息').fill('图片说明保持不变')
  await page.getByLabel('饭否消息').evaluate((element, image) => {
    const bytes = Uint8Array.from(atob(image.dataUrl.split(',')[1]!), (char) =>
      char.charCodeAt(0),
    )
    const clipboard = new DataTransfer()
    clipboard.items.add(new File([bytes], image.name, { type: 'image/png' }))
    element.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboard,
      }),
    )
  }, composerImageFixture)
  await expect(page.getByRole('img', { name: '待发送的图片' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: '添加图片', exact: true }),
  ).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('body')).toHaveCSS('height', '300px')
  await expect
    .poll(() =>
      page
        .getByRole('img', { name: '待发送的图片' })
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBe(128)
  await page.getByRole('combobox', { name: '发送账号' }).selectOption('second')
  await expect(page.getByLabel('饭否消息')).toHaveValue('图片说明保持不变')
  await expect(page.getByRole('img', { name: '待发送的图片' })).toBeVisible()
  await page
    .locator('body')
    .screenshot({ path: 'test-results/composer-image.png' })
  await page.close()
  page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByRole('combobox', { name: '发送账号' })).toHaveValue(
    'second',
  )
  await expect(page.getByRole('img', { name: '待发送的图片' })).toBeVisible()
  await expect(page.getByLabel('饭否消息')).toHaveValue('图片说明保持不变')
  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.fail = true
  })
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('测试图片发送失败')
  await expect(page.getByRole('img', { name: '待发送的图片' })).toBeVisible()
  await expect(page.getByLabel('饭否消息')).toHaveValue('图片说明保持不变')
  await worker.evaluate(() => {
    ;(globalThis as any).__composerTest.fail = false
  })
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.getByRole('img', { name: '待发送的图片' })).toHaveCount(0)
  await expect(page.getByLabel('饭否消息')).toHaveValue('')
  await expect(page.locator('body')).toHaveCSS('height', '220px')
  expect(
    await worker.evaluate(() =>
      (globalThis as any).__composerTest.photoUploads.at(-1),
    ),
  ).toEqual({
    caption: '图片说明保持不变',
    name: 'preview.png',
    size: composerImageBytes.length,
    type: 'image/png',
    account: 'second-access',
  })
  await page.close()
})

test('file selection, removal and drag-and-drop allow photo-only sending', async () => {
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'settings/popupMode': 'compose',
    }),
  )
  const page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  const input = page.getByLabel('选择图片', { exact: true })
  const file = {
    name: 'preview.png',
    mimeType: 'image/png',
    buffer: composerImageBytes,
  }
  await input.setInputFiles(file)
  await expect(page.getByRole('img', { name: '待发送的图片' })).toBeVisible()
  await page.getByRole('button', { name: '移除图片', exact: true }).click()
  await expect(page.getByRole('img', { name: '待发送的图片' })).toHaveCount(0)
  await expect(page.locator('body')).toHaveCSS('height', '220px')
  await expect(
    page.getByRole('button', { name: '发送', exact: true }),
  ).toBeDisabled()
  await page.locator('.sf-composer__form').evaluate((element, image) => {
    const bytes = Uint8Array.from(atob(image.dataUrl.split(',')[1]!), (char) =>
      char.charCodeAt(0),
    )
    const transfer = new DataTransfer()
    transfer.items.add(new File([bytes], image.name, { type: 'image/png' }))
    element.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    )
  }, composerImageFixture)
  await expect(page.getByRole('img', { name: '待发送的图片' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: '发送', exact: true }),
  ).toBeEnabled()
  await page.getByLabel('饭否消息').press('Control+Enter')
  await expect(page.getByRole('img', { name: '待发送的图片' })).toHaveCount(0)
  expect(
    await worker.evaluate(
      () => (globalThis as any).__composerTest.photoUploads.at(-1).caption,
    ),
  ).toBe(null)
  await page.close()
})

test('invalid images leave existing text and attachments intact', async () => {
  await worker.evaluate(() =>
    (globalThis as any).chrome.storage.local.set({
      'settings/popupMode': 'compose',
    }),
  )
  const page = await context.newPage()
  await page.goto(`${extensionUrl}?popup`)
  await expect(page.getByLabel('饭否消息')).toBeEnabled()
  await page.getByLabel('饭否消息').fill('正文不能丢')
  const input = page.getByLabel('选择图片', { exact: true })
  await input.setInputFiles({
    name: 'preview.png',
    mimeType: 'image/png',
    buffer: composerImageBytes,
  })
  await expect(page.getByRole('img', { name: '待发送的图片' })).toBeVisible()
  await input.setInputFiles({
    name: 'bad.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  })
  await expect(page.getByRole('alert')).toContainText('请选择 JPG')
  await expect(page.getByRole('img', { name: '待发送的图片' })).toBeVisible()
  await input.setInputFiles({
    name: 'large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(4 * 1024 * 1024 + 1),
  })
  await expect(page.getByRole('alert')).toContainText('4 MB')
  await expect(page.getByLabel('饭否消息')).toHaveValue('正文不能丢')
  await expect(page.getByRole('img', { name: '待发送的图片' })).toBeVisible()
  await page.close()
})

test('twenty accounts stay in a compact scrollable list and can be found by name or ID', async () => {
  await worker.evaluate(async () => {
    const api = (globalThis as any).chrome
    const consumerKey = '3b8763186f221a7d1f4afa56969898b9'
    const key = 'fanfou-oauth/accounts'
    const saved = (await api.storage.local.get(key))[key] || {}
    const accounts = Object.fromEntries(
      Object.entries(saved).filter(
        ([, value]) => (value as any).userId === 'tester',
      ),
    )
    const website = Array.from({ length: 20 }, (_, index) => {
      const suffix = String(index).padStart(2, '0')
      const userId = index === 0 ? 'tester' : `bulk-${suffix}`
      const nickname = `饭友 ${suffix}`
      if (index > 0 && index < 15)
        accounts[`${consumerKey}:bulk-token-${suffix}`] = {
          consumerKey,
          oauthToken: `bulk-token-${suffix}`,
          oauthTokenSecret: 'test-secret',
          userId,
          screenName: nickname,
          accountIds: [userId],
        }
      return { userId, nickname }
    })
    await api.storage.local.set({
      [key]: accounts,
      'user-switcher/allUserData': website,
    })
  })
  const page = await context.newPage()
  await page.setViewportSize({ width: 560, height: 600 })
  await page.goto(`${extensionUrl}?popup`)
  await page.getByRole('button', { name: '工具', exact: true }).click()
  const list = page.getByRole('list', { name: '饭否账号列表' })
  const search = page.getByRole('searchbox', { name: '搜索饭否账号' })
  await expect(page.locator('.sf-oauth-account')).toHaveCount(20)
  await expect(search).toBeVisible()
  expect(
    await list.evaluate(
      (element) =>
        element.clientHeight <= 112 &&
        element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true)
  expect(
    await page
      .getByRole('heading', { name: '扩展弹窗', exact: true })
      .evaluate(
        (element) => element.getBoundingClientRect().bottom < innerHeight,
      ),
  ).toBe(true)
  await page
    .locator('body')
    .screenshot({ path: 'test-results/account-manager-many.png' })
  await page
    .locator('.sf-oauth-account[data-account-id="bulk-19"]')
    .getByRole('button', { name: '授权', exact: true })
    .click()
  await expect(page.getByRole('group', { name: '授权饭否账号' })).toContainText(
    '饭友 19',
  )
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await search.fill('饭友 07')
  await expect(page.locator('.sf-oauth-account')).toHaveCount(1)
  await expect(page.locator('.sf-oauth-account')).toHaveAttribute(
    'data-account-id',
    'bulk-07',
  )
  expect(await list.evaluate((element) => element.scrollTop)).toBe(0)
  await search.fill('BULK-15')
  await expect(page.locator('.sf-oauth-account')).toHaveAttribute(
    'data-account-id',
    'bulk-15',
  )
  await search.fill('不存在这个账号')
  await expect(page.getByText('没有匹配的账号', { exact: true })).toBeVisible()
  await search.fill('')
  await expect(page.locator('.sf-oauth-account')).toHaveCount(20)
  await page.close()
})
