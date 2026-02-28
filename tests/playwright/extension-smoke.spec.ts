import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium, expect, test } from '@playwright/test'

test('load extension and verify service worker and script injection', async () => {
  const extensionPath = path.resolve(__dirname, '..', '..', 'dist')
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'space-fanfou-pw-'))

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
    const maybeWorker = context.serviceWorkers()[0]
    const serviceWorker = maybeWorker || await context.waitForEvent('serviceworker', {
      timeout: 20_000,
    })

    expect(serviceWorker.url()).toContain('background.js')

    const page = await context.newPage()
    await page.goto('https://fanfou.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    })
    await page.waitForTimeout(8_000)

    const injectionState = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
        .map(element => element.getAttribute('src') || '')
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(element => element.getAttribute('href') || '')

      return {
        hasInjectedPageScript: scripts.some(src => src.includes('/page.js')),
        hasInjectedPageStyle: styles.some(href => href.includes('/page.css')),
        url: window.location.href,
      }
    })

    expect(
      injectionState.hasInjectedPageScript || injectionState.hasInjectedPageStyle,
      `Expected extension script/style injection at ${injectionState.url}`
    ).toBeTruthy()

    fs.mkdirSync('test-results', { recursive: true })
    await page.screenshot({
      path: 'test-results/extension-smoke-fanfou.png',
      fullPage: true,
    })
  } finally {
    await context.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
})
