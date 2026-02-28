import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium, expect, test } from '@playwright/test'
import type { BrowserContext, SetCookieParam } from '@playwright/test'

const cookiesJson = (process.env.FANFOU_COOKIES_JSON || '').trim()

function parseCookiesFromEnv(): SetCookieParam[] {
  if (!cookiesJson) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(cookiesJson)
  } catch (error) {
    throw new Error('FANFOU_COOKIES_JSON 不是合法 JSON')
  }
  return parsed.map((item: any) => ({
    name: item.name, value: item.value, domain: item.domain || '.fanfou.com', path: item.path || '/'
  })) as SetCookieParam[]
}

const injectedCookies = parseCookiesFromEnv()
test.skip(injectedCookies.length === 0, '需要 FANFOU_COOKIES_JSON 授权测试')

test('word count and image upload in #PopupBox', async () => {
  const extensionPath = path.resolve(__dirname, '../../dist')
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'space-fanfou-status-form-'))

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: process.env.PW_HEADLESS !== '0',
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`, '--no-sandbox'],
  })

  try {
    const page = await context.newPage()
    await context.addCookies(injectedCookies)

    // 前往任意用户的推文页来触发 PopupBox 回复
    await page.goto('https://fanfou.com/fanfou', { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForTimeout(4_000)

    // 点击某条消息的【回复】按钮
    const replyButton = page.locator('#stream ol .op .reply').first()
    await expect(replyButton).toBeVisible()
    await replyButton.click()

    // 等待原生 #PopupBox 弹窗及其 textarea 准备好
    const popupBox = page.locator('#PopupBox')
    await expect(popupBox).toBeVisible()

    const textarea = popupBox.locator('textarea')
    await expect(textarea).toBeVisible()

    // 1. 验证字数预警
    // 填充超过 140 字符，验证 sf-exceeded 是否出现
    await textarea.fill('a'.repeat(141))
    await page.waitForTimeout(500)
    const counter = popupBox.locator('#sf-counter')
    await expect(counter).toHaveClass(/sf-exceeded/)
    await expect(counter).toHaveText('-1')
    await expect(popupBox).toHaveClass(/sf-status-danger/)

    await textarea.fill('a'.repeat(125))
    await page.waitForTimeout(500)
    await expect(counter).toHaveClass(/sf-warning/)
    await expect(counter).not.toHaveClass(/sf-exceeded/)
    await expect(popupBox).toHaveClass(/sf-status-warning/)
    await expect(popupBox).not.toHaveClass(/sf-status-danger/)

    // 2. 验证动态注入的照片上传按钮
    const uploadButton = popupBox.locator('.sf-upload-button')
    await expect(uploadButton).toBeVisible()
    const fileInput = popupBox.locator('input[type="file"][name="picture"]')
    await expect(fileInput).toBeAttached()

    // 3. 验证 Ajax 图片回复发布
    await textarea.fill('Playwright 自动化回复测试伴随图片上传 ' + Date.now())
    
    // 生成一个测试图片文件
    const testImagePath = path.join(os.tmpdir(), 'test-upload.png')
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
    fs.writeFileSync(testImagePath, transparentPng)

    await fileInput.setInputFiles(testImagePath)
    
    // 监听网络请求验证 FormData
    const requestPromise = page.waitForRequest(request => 
        request.url().includes('/home/upload') && request.method() === 'POST'
    )

    const submitButton = popupBox.locator('input[type="submit"]')
    await submitButton.click()

    const request = await requestPromise
    const postData = request.postData()
    // 简单验证: postData (multipart/form-data) 应包含 'in_reply_to_status_id' 和 'picture'
    expect(postData).toContain('name="in_reply_to_status_id"')
    expect(postData).toContain('name="picture"')

    // 等待请求结束与状态重置
    await page.waitForTimeout(3000)
    await expect(submitButton).toHaveValue('发送') // 回到原始状态

  } finally {
    await context.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
})
