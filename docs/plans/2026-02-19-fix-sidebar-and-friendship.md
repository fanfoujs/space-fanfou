# Fix sidebar-statistics & check-friendship Implementation Plan

> **状态**: ✅ 已执行完成（2026-02-20）
> 分支: `claude/fix-sidebar-friendship-e2e`，提交: `8671748`
> 测试: check-friendship ✅ | sidebar-statistics ⚠️（代码正确，API 认证待真实 Chrome 验证）

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复两个始终无法工作的功能：用户注册时间显示（sidebar-statistics）和好友关系检查（check-friendship），并通过 Playwright 自动化测试在真实饭否页面上验证。

**Architecture:**
- sidebar-statistics：移除 OAuth/proxiedFetch/DOM 三层回退，恢复原版 JSONP 直调 `api.fanfou.com/users/show.json`，Page Script 运行在页面上下文中不受扩展 CSP 限制。
- check-friendship：移除 `normalizeUserId` + `getLoggedInUserId` 依赖，回退到原版查询登录用户自己的 `/followers/` 列表，同时修复 `hasChecked` 阻止重试的问题。
- 测试：Playwright 脚本加载 `dist/` 扩展，登录饭否，逐项截图验证。

**Tech Stack:** Webpack 4, Preact, Playwright (Chromium), `src/libs/jsonp.js`, `p-retry@^4.1.0`

---

## 准备工作

### 前置：安装 Playwright Chromium

```bash
cd /home/fiver/projects/space-fanfou
npx playwright install chromium
```

预期输出：下载 Chromium 到 `~/.cache/ms-playwright/`

### 前置：准备测试凭据文件

在工作树根目录创建 `tests/e2e/.env.local`（已在 `.gitignore`，不提交）：

```
FANFOU_COOKIE=<用户提供的 cookie 字符串>
FANFOU_TEST_USER_ID=<要访问的他人用户 ID，用于测试好友关系>
```

---

## Task 1：建立 Playwright 测试基础设施

**Files:**
- Create: `tests/e2e/setup.js`
- Create: `tests/e2e/fanfou.test.js`
- Create: `tests/e2e/.env.local`（不提交，仅本地）

**Step 1：安装测试依赖**

```bash
npm install --save-dev @playwright/test dotenv
```

预期：`package.json` 的 `devDependencies` 新增这两个包。

**Step 2：创建扩展加载 helper**

`tests/e2e/setup.js`：

```javascript
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env.local') })

const EXTENSION_PATH = path.resolve(__dirname, '../../dist')

async function launchWithExtension(playwright) {
  const context = await playwright.chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
    ],
  })
  return context
}

async function loginWithCookie(context) {
  const cookie = process.env.FANFOU_COOKIE
  if (!cookie) throw new Error('FANFOU_COOKIE not set in .env.local')

  // 将 cookie 字符串解析后注入 fanfou.com 域
  const cookiePairs = cookie.split(';').map(pair => {
    const [name, ...rest] = pair.trim().split('=')
    return {
      name: name.trim(),
      value: rest.join('=').trim(),
      domain: '.fanfou.com',
      path: '/',
    }
  })
  await context.addCookies(cookiePairs)
}

module.exports = { launchWithExtension, loginWithCookie }
```

**Step 3：创建测试文件骨架**

`tests/e2e/fanfou.test.js`：

```javascript
const { test, expect } = require('@playwright/test')
const { launchWithExtension, loginWithCookie } = require('./setup')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env.local') })

let context, page

test.beforeAll(async ({ playwright }) => {
  context = await launchWithExtension(playwright)
  await loginWithCookie(context)
  page = await context.newPage()
})

test.afterAll(async () => {
  await context.close()
})

test('sidebar-statistics 显示注册时间', async () => {
  // Task 2 中填充
})

test('check-friendship 正确检测好友关系', async () => {
  // Task 4 中填充
})
```

**Step 4：构建扩展，确认 dist/ 存在**

```bash
npm run build
ls dist/background.js dist/content.js dist/page.js dist/manifest.json
```

预期：四个文件均存在，无构建错误。

**Step 5：运行骨架测试确认基础设施可用**

```bash
npx playwright test tests/e2e/fanfou.test.js --headed
```

预期：2 个 test passed（空测试），Chrome 窗口打开后关闭。

**Step 6：提交基础设施**

```bash
git add tests/e2e/setup.js tests/e2e/fanfou.test.js package.json package-lock.json
git commit -m "test: 添加 Playwright e2e 测试基础设施 🧪"
```

---

## Task 2：为 sidebar-statistics 编写失败测试

**Files:**
- Modify: `tests/e2e/fanfou.test.js`

**Step 1：填充 sidebar-statistics 测试**

将 `fanfou.test.js` 中对应 test 改为：

```javascript
test('sidebar-statistics 显示注册时间', async () => {
  // 访问登录用户自己的主页（任意有 sidebar 的用户页面）
  await page.goto('https://fanfou.com/home')
  // 等待 sidebar 统计渲染
  await page.waitForSelector('.sf-sidebar-statistics', { timeout: 15000 })

  // 注册时间不应为空/NaN/无效
  const regTimeEl = await page.$('.sf-sidebar-statistics-item:has-text("注册")')
  expect(regTimeEl).not.toBeNull()

  const regTimeText = await regTimeEl.textContent()
  expect(regTimeText).not.toContain('NaN')
  expect(regTimeText).not.toContain('Invalid')
  expect(regTimeText).toMatch(/\d{4}/) // 包含年份数字

  await page.screenshot({ path: 'tests/e2e/screenshots/sidebar-before.png', fullPage: true })
})
```

**Step 2：构建当前版本并运行测试，确认它失败**

```bash
npm run build && npx playwright test tests/e2e/fanfou.test.js -g "sidebar" --headed
```

预期：FAIL — 注册时间显示 "……"、NaN 或空白（截图保存在 `screenshots/`）。

---

## Task 3：修复 sidebar-statistics（恢复 JSONP）

**Files:**
- Modify: `src/features/sidebar-statistics/@page.js`

**背景：** 需要将当前 315 行的 OAuth/proxiedFetch/DOM 三层方案回退到 JSONP 单一方案。

**Step 1：阅读原版实现**

```bash
git show upstream/main:src/features/sidebar-statistics/@page.js | head -60
```

重点关注：
- `getUserId()` 的实现
- `fetchUserProfileData()` 的 JSONP 调用
- `export default` 的模块依赖

**Step 2：修改 `@page.js` — 数据获取部分**

在文件顶部 import 区域，添加：
```javascript
import jsonp from '@libs/jsonp'
import retry from 'p-retry'
```

移除（如存在）：
```javascript
// 删除这些行
import { requireModules } from ...  // 如有单独 import
```

**Step 3：修改 `fetchUserProfileData` 方法**

找到并替换 `fetchUserProfileData` 方法体，恢复为 JSONP 方案：

```javascript
async fetchUserProfileData() {
  const apiUrl = '//api.fanfou.com/users/show.json'
  const params = { id: this.getUserId() }
  const fetch = () => jsonp(apiUrl, { params })
  return retry(fetch, { retries: 3, minTimeout: 250 })
}
```

**Step 4：移除 DOM 提取逻辑**

删除 `#info` DOM 提取代码块（`elementReady('#info')` 及后续的 `links.forEach` 统计提取部分）。

**Step 5：修改 `export default` — 移除模块依赖**

将：
```javascript
export default context => {
  const { requireModules, elementCollection } = context
  const { proxiedFetch, fanfouOAuth } = requireModules([ 'proxiedFetch', 'fanfouOAuth' ])
  // ...
  preactRender(<SidebarStatistics proxiedFetch={proxiedFetch} oauthClient={fanfouOAuth} />)
}
```

改为：
```javascript
export default context => {
  const { elementCollection } = context
  // ...
  preactRender(<SidebarStatistics />)
}
```

（同时清理 `SidebarStatistics` 组件中对 `proxiedFetch` / `oauthClient` props 的引用）

**Step 6：构建验证**

```bash
npm run build 2>&1 | tail -20
```

预期：构建成功，无 undefined import 错误。

**Step 7：运行测试，确认通过**

```bash
npx playwright test tests/e2e/fanfou.test.js -g "sidebar" --headed
```

预期：PASS — 截图 `screenshots/sidebar-after.png` 显示注册时间（如"注册于 2010年3月"）。

**Step 8：提交**

```bash
git add src/features/sidebar-statistics/@page.js
git commit -m "fix: 恢复 sidebar-statistics JSONP 方案，移除 OAuth/proxiedFetch 依赖 🔧"
```

---

## Task 4：为 check-friendship 编写失败测试

**Files:**
- Modify: `tests/e2e/fanfou.test.js`

**Step 1：填充 check-friendship 测试**

```javascript
test('check-friendship 正确检测好友关系', async () => {
  const targetUserId = process.env.FANFOU_TEST_USER_ID
  if (!targetUserId) throw new Error('FANFOU_TEST_USER_ID not set')

  await page.goto(`https://fanfou.com/${targetUserId}`)
  // 等待好友检查按钮出现
  await page.waitForSelector('.sf-check-friendship-button', { timeout: 10000 })

  // 点击检查按钮
  await page.click('.sf-check-friendship-button')

  // 等待结果（按钮文字变化，不再是初始状态）
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('.sf-check-friendship-button')
      return btn && btn.textContent.trim() !== '' && btn.textContent !== '检查'
    },
    { timeout: 30000 }
  )

  const resultText = await page.textContent('.sf-check-friendship-button')
  console.log('check-friendship result:', resultText)

  // 结果应该是明确的"关注了你"或"未关注你"，不应是空/报错
  expect(resultText).toMatch(/关注|未关注/)

  await page.screenshot({ path: 'tests/e2e/screenshots/friendship-before.png' })
})
```

**Step 2：运行当前版本，确认失败或结果错误**

```bash
npx playwright test tests/e2e/fanfou.test.js -g "check-friendship" --headed
```

预期：FAIL 或超时，或显示错误状态。

---

## Task 5：修复 check-friendship（回退原版逻辑）

**Files:**
- Modify: `src/features/check-friendship/@page.js`

**Step 1：阅读原版实现**

```bash
git show upstream/main:src/features/check-friendship/@page.js
```

重点：`fetchFollowersList` 和 `checkFriendship` 两个函数。

**Step 2：移除 `normalizeUserId` 函数**

删除整个 `normalizeUserId` 函数定义（约 8 行）。

**Step 3：移除 `getLoggedInUserId` 导入**

删除：
```javascript
import getLoggedInUserId from '@libs/getLoggedInUserId'
```

**Step 4：恢复 `fetchFollowersList`**

将 URL 从 `friends/p.${pageNumber}` 改回 `followers/p.${pageNumber}`：

```javascript
async function fetchFollowersList(pageNumber) {
  const url = `https://m.fanfou.com/followers/p.${pageNumber}`
  // 不传 u 参数
  const { error, responseText: html } = await proxiedFetch.get({ url })
  if (error) return { followerIds: [], hasReachedEnd: true }

  const doc = parseHTML(html)
  const items = select.all('ol > li > a > span.a', doc)
  const followerIds = items.map(item => item.textContent.replace(/^\(|\)$/g, ''))
  const hasReachedEnd = !select.exists(`a[href="/followers/p.${pageNumber + 1}"]`, doc)

  return { followerIds, hasReachedEnd }
}
```

**Step 5：恢复 `checkFriendship` 主逻辑**

```javascript
async function checkFriendship() {
  if (hasChecked) return
  // 移除 viewerUserId 相关代码

  const userId = await getCurrentPageOwnerUserId()
  let pageNumber = 0
  let isFollowed = false

  while (true) {
    pageNumber++
    const { followerIds, hasReachedEnd } = await fetchFollowersList(pageNumber)
    if (followerIds.includes(userId)) {
      isFollowed = true
      break
    }
    if (hasReachedEnd) break
  }

  // 更新按钮文字
  button.textContent = isFollowed ? '关注了你' : '未关注你'
  hasChecked = false  // 修复：允许重试（重置 hasChecked）
}
```

注意：`hasChecked = false` 在最终 `finally` 块中重置，而不是 `= true`，以允许用户重试。

**Step 6：构建验证**

```bash
npm run build 2>&1 | tail -20
```

预期：无错误。

**Step 7：运行测试，确认通过**

```bash
npx playwright test tests/e2e/fanfou.test.js -g "check-friendship" --headed
```

预期：PASS — 截图显示按钮文字为"关注了你"或"未关注你"。

**Step 8：提交**

```bash
git add src/features/check-friendship/@page.js
git commit -m "fix: 回退 check-friendship 到原版 /followers/ 逻辑，修复 hasChecked 重试 🔧"
```

---

## Task 6：完整回归测试

**Step 1：运行所有 e2e 测试**

```bash
npm run build && npx playwright test tests/e2e/fanfou.test.js --headed
```

预期：2 tests passed。检查截图 `tests/e2e/screenshots/` 中的 `sidebar-after.png` 和 `friendship-after.png`。

**Step 2：运行单元测试（确保没有破坏已有逻辑）**

```bash
npm run unit
```

预期：all passed。

**Step 3：最终提交**

```bash
git add tests/e2e/
git commit -m "test: 添加 e2e 截图验证两项功能修复结果 ✅"
```

---

## 关键注意事项

1. **Cookie 注入**：fanfou 的认证 cookie 名为 `u`（用户 ID）和 `_fanfou_sess`（session），Playwright 的 `addCookies` 需要正确设置 `domain: '.fanfou.com'`。
2. **proxiedFetch MV3 Cookie 风险**：check-friendship 修复后仍依赖 `proxiedFetch` 从 Service Worker 携带 cookie 访问 `m.fanfou.com`。如果测试中 proxiedFetch 仍失败（返回登录页），需要进一步排查 MV3 Service Worker 的 cookie 传递。
3. **JSONP API 可用性**：sidebar-statistics 的 JSONP 修复是否有效，取决于 `api.fanfou.com/users/show.json` 在浏览器上下文中是否可匿名访问。如果 API 要求认证，测试会失败，需要降级到 Codex 建议的 OAuth 闭环方案。
4. **`tests/e2e/.env.local` 不提交**：确认 `.gitignore` 中有 `tests/e2e/.env.local`。
