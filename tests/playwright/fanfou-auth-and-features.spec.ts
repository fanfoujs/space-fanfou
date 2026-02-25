import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium, expect, test } from '@playwright/test'
import type { BrowserContext, SetCookieParam } from '@playwright/test'

const username = (process.env.FANFOU_USERNAME || '').trim()
const password = (process.env.FANFOU_PASSWORD || '').trim()
const cookiesJson = (process.env.FANFOU_COOKIES_JSON || '').trim()

function parseCookiesFromEnv(): SetCookieParam[] {
  if (!cookiesJson) return []

  let parsed: unknown

  try {
    parsed = JSON.parse(cookiesJson)
  } catch (error) {
    throw new Error('FANFOU_COOKIES_JSON 不是合法 JSON')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('FANFOU_COOKIES_JSON 必须是数组')
  }

  return parsed
    .map(cookie => {
      const item = cookie as Record<string, unknown>
      const name = String(item.name || '').trim()
      const value = String(item.value || '')

      if (!name) return null

      const domain = String(item.domain || '.fanfou.com').trim()
      const pathValue = String(item.path || '/').trim() || '/'
      const secure = item.secure === true
      const httpOnly = item.httpOnly === true
      const expiresRaw = item.expires

      let expires = -1
      if (typeof expiresRaw === 'number' && Number.isFinite(expiresRaw)) {
        expires = expiresRaw
      } else if (typeof expiresRaw === 'string' && expiresRaw.trim()) {
        const n = Number(expiresRaw)
        if (Number.isFinite(n)) expires = n
      }

      return {
        name,
        value,
        domain,
        path: pathValue,
        secure,
        httpOnly,
        expires,
      } satisfies SetCookieParam
    })
    .filter((x): x is SetCookieParam => Boolean(x))
}

async function ensureLoggedInWithCookies(context: BrowserContext, page: import('@playwright/test').Page) {
  const cookies = await context.cookies('https://fanfou.com')
  const userCookie = cookies.find(cookie => cookie.name === 'u')

  if (userCookie) return userCookie.value

  await page.goto('https://fanfou.com/home', {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  })
  await page.waitForTimeout(4_000)

  const afterCookies = await context.cookies('https://fanfou.com')
  const afterUserCookie = afterCookies.find(cookie => cookie.name === 'u')
  if (afterUserCookie) return afterUserCookie.value

  throw new Error('Cookie 注入后仍未登录（缺少 cookie u），请确认提供的 cookies 仍有效')
}

const injectedCookies = parseCookiesFromEnv()
const hasCookieAuth = injectedCookies.length > 0
const hasPasswordAuth = Boolean(username && password)

test.skip(
  !hasCookieAuth && !hasPasswordAuth,
  '未提供登录凭据。请提供 FANFOU_COOKIES_JSON 或 FANFOU_USERNAME/FANFOU_PASSWORD'
)

test('login fanfou and probe extension features', async () => {
  const extensionPath = path.resolve(__dirname, '..', '..', 'dist')
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'space-fanfou-auth-pw-'))

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: process.env.PW_HEADLESS !== '0',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
  })

  try {
    const page = await context.newPage()
    let loggedInUserId = ''

    if (hasCookieAuth) {
      await context.addCookies(injectedCookies)
      loggedInUserId = await ensureLoggedInWithCookies(context, page)
    }

    if (!loggedInUserId && hasPasswordAuth) {
      await page.goto('https://fanfou.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      })

      const userInput = page.locator([
        'input[name="loginname"]',
        'input[name="username"]',
        'input[name="name"]',
        'input[type="text"]',
        'input#loginname',
      ].join(', ')).first()
      const passwordInput = page.locator([
        'input[name="password"]',
        'input[type="password"]',
        'input#password',
      ].join(', ')).first()
      const submitButton = page.locator([
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("登录")',
      ].join(', ')).first()

      await expect(userInput).toBeVisible({ timeout: 20_000 })
      await expect(passwordInput).toBeVisible({ timeout: 20_000 })

      await userInput.fill(username)
      await passwordInput.fill(password)

      if (await submitButton.count()) {
        await Promise.all([
          page.waitForLoadState('domcontentloaded'),
          submitButton.click(),
        ])
      } else {
        await passwordInput.press('Enter')
        await page.waitForLoadState('domcontentloaded')
      }

      await page.waitForTimeout(6_000)

      const cookies = await context.cookies('https://fanfou.com')
      const userCookie = cookies.find(cookie => cookie.name === 'u')
      const currentUrlAfterLogin = page.url()
      const currentTitleAfterLogin = await page.title()
      const passwordInputsAfterLogin = await page.locator([
        'input[name="password"]',
        'input[type="password"]',
        'input#password',
      ].join(', ')).count()

      fs.mkdirSync('test-results', { recursive: true })
      await page.screenshot({
        path: 'test-results/fanfou-auth-debug-before-assert.png',
        fullPage: true,
      })
      fs.writeFileSync(
        'test-results/fanfou-auth-debug.json',
        JSON.stringify({
          currentUrlAfterLogin,
          currentTitleAfterLogin,
          cookieNames: cookies.map(cookie => cookie.name),
          passwordInputsAfterLogin,
        }, null, 2),
        'utf8'
      )

      expect(userCookie, '登录后应存在 cookie u').toBeTruthy()
      loggedInUserId = userCookie?.value || ''
    }

    expect(loggedInUserId, '未获取到登录用户 ID').toBeTruthy()

    await page.goto(`https://fanfou.com/${loggedInUserId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    })
    await page.waitForTimeout(8_000)

    const sidebarExists = await page.locator('.sf-sidebar-statistics').count()
    expect(sidebarExists, '用户页应渲染 .sf-sidebar-statistics').toBeGreaterThan(0)
    const sidebarItemTexts = await page.locator('.sf-sidebar-statistics li').allInnerTexts()
    const registerItemText = sidebarItemTexts.find(text => text.includes('注册于')) || ''
    const registerDateLooksValid = Boolean(
      registerItemText &&
      !registerItemText.includes('……') &&
      !registerItemText.includes('NaN') &&
      !registerItemText.includes('Invalid Date')
    )

    expect(registerItemText, '应存在包含“注册于”的统计项').toContain('注册于')
    expect(registerDateLooksValid, `注册时间看起来无效: ${registerItemText}`).toBeTruthy()

    await page.goto('https://fanfou.com/fanfou', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    })
    await page.waitForTimeout(8_000)

    const checkFriendshipButtonExists = await page.locator('.sf-check-friendship-button').count()
    expect(
      checkFriendshipButtonExists,
      '他人用户页应渲染 .sf-check-friendship-button'
    ).toBeGreaterThan(0)
    const button = page.locator('.sf-check-friendship-button').first()
    const initialButtonText = ((await button.textContent()) || '').trim()
    await button.click()

    await page.waitForFunction(() => {
      const element = document.querySelector('.sf-check-friendship-button')
      if (!element) return false
      const text = (element.textContent || '').trim()

      return text.includes('关注了你') || text.includes('没有关注你')
    }, { timeout: 45_000 })

    const finalButtonText = ((await button.textContent()) || '').trim()
    expect(finalButtonText).toMatch(/关注了你|没有关注你/)

    fs.mkdirSync('test-results', { recursive: true })
    fs.writeFileSync(
      'test-results/fanfou-auth-feature-diagnostics.json',
      JSON.stringify({
        loggedInUserId,
        sidebarItemTexts,
        registerItemText,
        registerDateLooksValid,
        initialButtonText,
        finalButtonText,
      }, null, 2),
      'utf8'
    )

    await page.screenshot({
      path: 'test-results/fanfou-auth-and-features.png',
      fullPage: true,
    })
  } finally {
    await context.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
})
