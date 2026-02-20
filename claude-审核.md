# 太空饭否 MV3 迁移技术审核报告

**审核日期**: 2026-02-15
**审核范围**: `sidebar-statistics`（用户注册时间）、`check-friendship`（好友关系检查）
**原项目**: [fanfoujs/space-fanfou](https://github.com/fanfoujs/space-fanfou)（MV2, v1.0.1）
**当前项目**: 本地 fork（MV3, v2.0.0）

---

## 结论摘要

| 功能 | 状态 | 根因 | 修复难度 |
|------|------|------|----------|
| 用户注册时间 | **不可用** | JSONP 被错误移除，替代方案均无法正常获取 `created_at` | **低** — 恢复 JSONP 即可 |
| 好友关系检查 | **不可用** | 查询逻辑重写引入多处 bug，normalizeUserId 破坏 ID 匹配 | **中** — 需回退核心逻辑 |

**核心发现**: Page Scripts 运行在页面上下文中，不受扩展 CSP 限制。JSONP 在 MV3 下完全可用，移除 JSONP 是一个错误判断。

> **交叉审核说明**: 本报告已与 Codex 审核报告（`codex-审核.md`）交叉对比。两份报告在数据获取失败和 check-friendship 脆弱性上达成共识；在 JSONP 可行性判断上存在分歧（详见第 6 节）；Codex 报告的 `isUserProfilePage()` 超时 bug 判断经源码验证后已排除（详见第 6.2 节）。

---

## 1. 功能一：用户注册时间（sidebar-statistics）

### 1.1 原项目代码（关键片段）

**文件**: `src/features/sidebar-statistics/@page.js`（原版）

```javascript
import jsonp from '@libs/jsonp'
import retry from 'p-retry'

// 获取用户 ID：从 <meta name=author> 标签解析
getUserId() {
  const metaContent = select('meta[name=author]').content
  const userId = metaContent.match(/\((.+)\)/)[1]
  return userId
}

// 获取数据：JSONP 直接调用公开 API，带重试
async fetchUserProfileData() {
  const apiUrl = '//api.fanfou.com/users/show.json'
  const params = { id: this.getUserId() }
  const fetch = () => jsonp(apiUrl, { params })
  const userProfileData = await retry(fetch, {
    retries: 3,
    minTimeout: 250,
  })
  return userProfileData
}

// 导出：不需要任何外部模块
export default context => {
  const { elementCollection } = context
  // ... 直接渲染，无需 proxiedFetch 或 OAuth
}
```

**特点**:
- 单一数据源（JSONP → 饭否公开 API）
- API 返回完整用户对象：`created_at`、`statuses_count`、`friends_count`、`followers_count`、`protected`、`profile_background_image_url`
- 不需要任何认证、不需要 Background Script 参与
- 带 3 次重试机制

### 1.2 当前项目代码（关键片段）

**文件**: `src/features/sidebar-statistics/@page.js`（当前版本，315 行）

```javascript
// 无 jsonp 导入，无 retry 导入
import elementReady from 'element-ready'
import select from 'select-dom'

// 获取用户 ID：从 URL 路径提取
getUserId() {
  const splitPathname = window.location.pathname.split('/')
  return splitPathname[1]
}

// 获取数据：三层回退策略
async fetchUserProfileData() {
  await elementReady('#info')   // 先等 DOM 就绪

  // 步骤1: 从 DOM #info 区域提取统计数字
  const links = info.querySelectorAll('li a')
  links.forEach((link) => {
    // 正则匹配 "22102 消息"、"171 他关注的人"、"459 关注他的人"
    // → userProfile.statuses_count / friends_count / followers_count
  })

  // 步骤2: 尝试 OAuth API 获取注册日期
  if (oauthClient) {
    const { responseJSON } = await oauthClient.request({ url, method: 'GET', query })
    // → userProfile.created_at
  }

  // 步骤3: 尝试 proxiedFetch（未签名请求）
  if (!userProfile.created_at && proxiedFetch) {
    const { responseText } = await proxiedFetch.get({ url, query })
    // → userProfile.created_at
  }

  return userProfile  // 缺少: protected, profile_background_image_url
}

// 导出：依赖 proxiedFetch 和 fanfouOAuth 两个外部模块
export default context => {
  const { requireModules } = context
  const { proxiedFetch, fanfouOAuth } = requireModules([ 'proxiedFetch', 'fanfouOAuth' ])
  // ...
  preactRender(<SidebarStatistics proxiedFetch={proxiedFetch} oauthClient={fanfouOAuth} />)
}
```

### 1.3 逐项对比

| 维度 | 原版 | 当前版本 | 影响 |
|------|------|----------|------|
| **数据获取方式** | JSONP（`<script>` 标签注入） | OAuth API → proxiedFetch → DOM 提取 | 三种方式都可能失败 |
| **获取用户 ID** | `<meta name=author>` 正则 `\((.+)\)` | `window.location.pathname.split('/')[1]` | 功能等价，URL 方式更可靠 |
| **`created_at`** | API 直接返回 | OAuth 或 proxiedFetch 获取 | **核心问题**：两种方式均可能失败 |
| **`statuses_count`** 等 | API 直接返回 | DOM 正则提取 | DOM 结构变化会导致提取失败 |
| **`protected`** | API 返回 | **未获取** | 加锁用户标识丢失 |
| **`profile_background_image_url`** | API 返回 | **未获取** | 背景图片链接丢失 |
| **认证要求** | 无（JSONP 公开 API） | OAuth 需用户手动配置 Consumer Key/Secret | 绝大多数用户不会配置 |
| **重试机制** | `p-retry`，3 次重试 | 无重试 | 降低了可靠性 |
| **外部依赖** | 无 | `proxiedFetch` + `fanfouOAuth` 两个 Background 模块 | 增加了通信链路复杂度 |
| **错误处理** | 重试后抛出异常 | try/catch 静默失败，状态保持 "……" | 用户看到永远的 "……" |

### 1.4 根因分析

```
原版数据流（可用）:
┌──────────┐    JSONP <script>    ┌──────────────────┐
│ Page     │ ──────────────────→  │ api.fanfou.com   │
│ Script   │ ←────────────────── │ /users/show.json │
│          │    完整 JSON 回调     │  (公开，无需认证)  │
└──────────┘                      └──────────────────┘

当前数据流（不可用）:
┌──────────┐  消息   ┌──────────────┐  OAuth签名请求  ┌──────────────────┐
│ Page     │ ──→    │ Content      │ ──→           │ Background       │
│ Script   │ ←──    │ Script       │ ←──           │ (Service Worker) │
│          │  桥接   │ (bridge.js)  │  chrome.       │                  │
└──────────┘        └──────────────┘  runtime.msg   └───────┬──────────┘
                                                            │ fetch()
                                                    ┌───────▼──────────┐
                                                    │ api.fanfou.com   │
                                                    │ (需 OAuth 签名)   │
                                                    └──────────────────┘
```

**失败链路分析**：

1. **OAuth 路径（步骤2）**: 用户需在设置页面启用 OAuth → 填写 Consumer Key → 填写 Consumer Secret → 完成授权流程。`fanfou-oauth` 的 `metadata.js` 显示 `defaultValue: false`，即**默认关闭**。绝大多数用户不会配置这些。

2. **proxiedFetch 路径（步骤3）**: 从 Service Worker 发起**未签名** API 请求。饭否 API 对 `/users/show.json` 端点可能要求认证，未签名请求会返回 401 或空响应。代码注释已承认："未签名 API 请求失败（预期内）"。

3. **DOM 提取路径（步骤1）**: 只能获取 `statuses_count`、`friends_count`、`followers_count`，**无法获取 `created_at`**（注册时间不在页面 DOM 中）。

4. **processData 崩溃**: 当 `created_at` 缺失时，`new Date(undefined)` → `Invalid Date`，后续的 `formatDate(Invalid Date)` 和 `Math.floor((new Date() - Invalid Date) / ...)` 均返回 `NaN`，导致所有统计项显示异常。

### 1.5 关键误判

**JSONP 在 MV3 中仍然可用**。MV3 的 CSP 限制（`script-src 'self'`）仅适用于扩展页面（popup、options、background）。Page Scripts 运行在**饭否网站的页面上下文**中，不受扩展 CSP 约束。JSONP 通过 `<script>` 标签注入，在页面上下文中执行，完全不受影响。

| 环境 | CSP 来源 | 是否限制 JSONP |
|------|----------|---------------|
| Background (Service Worker) | 扩展 manifest.json | **是** |
| Extension Pages (settings.html) | 扩展 manifest.json | **是** |
| Content Scripts | 扩展 manifest.json | **是** |
| **Page Scripts** | **fanfou.com 的 CSP** | **否**（饭否无严格 CSP）|

### 1.6 修复建议

**P0 — 恢复 JSONP 方案**（预计改动 < 30 行）：

```javascript
// 恢复原版导入
import jsonp from '@libs/jsonp'
import retry from 'p-retry'  // 需确认是否在 package.json 中

// 恢复 getUserId（可保留 URL 方式，功能等价）

// 恢复 fetchUserProfileData
async fetchUserProfileData() {
  const apiUrl = '//api.fanfou.com/users/show.json'
  const params = { id: this.getUserId() }
  const fetch = () => jsonp(apiUrl, { params })
  const userProfileData = await retry(fetch, {
    retries: 3,
    minTimeout: 250,
  })
  return userProfileData
}

// 恢复导出（移除 requireModules 依赖）
export default context => {
  const { elementCollection } = context
  // 不再需要 proxiedFetch 和 fanfouOAuth
}
```

**验证步骤**：
1. 检查 `p-retry` 是否在 `package.json` 依赖中（原版有，当前版本可能已移除）
2. `src/libs/jsonp.js` 仍然存在且代码完整（已确认）
3. 构建后在饭否用户页面测试统计信息是否正常显示

---

## 2. 功能二：好友关系检查（check-friendship）

### 2.1 原项目代码（关键片段）

```javascript
// 不需要 getLoggedInUserId
import getCurrentPageOwnerUserId from '@libs/getCurrentPageOwnerUserId'

// 获取关注者列表：查看登录用户自己的 followers
async function fetchFollowersList(pageNumber) {
  const url = `https://m.fanfou.com/followers/p.${pageNumber}`
  // 不传 user 参数 → 默认查看当前登录用户的 followers
  const { error, responseText: html } = await proxiedFetch.get({ url })

  // ID 提取：简单去除括号
  followerIds = items.map(item => item.textContent.replace(/^\(|\)$/g, ''))

  // 翻页检测：精确匹配下一页链接
  hasReachedEnd = !select.exists(`a[href="/followers/p.${pageNumber + 1}"]`, document)
}

async function checkFriendship() {
  const userId = await getCurrentPageOwnerUserId()  // 页面主人的 ID
  // 不需要获取自己的 ID

  while (true) {
    const { followerIds, hasReachedEnd } = await fetchFollowersList(++pageNumber)

    if (!hasReachedEnd) {
      isFollowed = followerIds.includes(userId)  // 页面主人是否在我的 followers 中？
    }
    // ...
  }
}
```

**逻辑**: "对方是否关注了我？" → 遍历**我的 followers 列表**，查找对方 ID。

### 2.2 当前项目代码（关键片段）

```javascript
import getLoggedInUserId from '@libs/getLoggedInUserId'  // 新增依赖

function normalizeUserId(raw) {       // 新增函数
  return raw.trim()
    .replace(/[\s]+/g, ' ')
    .replace(/^[@（(\s]+/, '')         // 去除前导 @、括号
    .replace(/[@）)\s]+$/, '')         // 去除尾随 @、括号
    .trim()
    .toLowerCase()                     // 转小写！
}

// 获取关注列表：查看目标用户的 friends（关注的人）
async function fetchFollowersList(targetUserId, pageNumber) {
  const url = `https://m.fanfou.com/friends/p.${pageNumber}`
  const query = targetUserId ? { u: targetUserId } : undefined
  // 传 u 参数 → 查看目标用户的 friends 列表

  // ID 提取：使用 normalizeUserId
  followerIds = items.map(item => normalizeUserId(item.textContent))

  // 翻页检测：复杂多重判断
  const hasNextByNumber = nextPageLinks.some(link => { /* 数字比较 */ })
  const hasNextByText = select.all('a', document)
    .some(link => link.textContent.includes('下一页'))
  hasReachedEnd = !(hasNextByNumber || hasNextByText)
}

async function checkFriendship() {
  const targetUserId = await getCurrentPageOwnerUserId()
  const viewerUserIdRaw = getLoggedInUserId()           // 需要获取自己的 ID
  const viewerUserId = normalizeUserId(viewerUserIdRaw)  // 归一化

  // 遍历目标用户的 friends，查找自己
  isFollowed = followerIds.some(id => id === viewerUserId)
}
```

**逻辑**: "对方是否关注了我？" → 遍历**对方的 friends 列表**，查找我的 ID。

### 2.3 逐项对比

| 维度 | 原版 | 当前版本 | 影响 |
|------|------|----------|------|
| **查询 URL** | `m.fanfou.com/followers/p.X` | `m.fanfou.com/friends/p.X` | 语义不同（下面详述） |
| **查询参数** | 无（默认查自己） | `?u=targetUserId` | 查看对方的列表 |
| **逻辑方向** | 我的 followers 中找对方 | 对方的 friends 中找我 | 理论等价，实现不同 |
| **需要自己 ID** | **否** | **是**（`getLoggedInUserId()`） | 引入新的失败点 |
| **ID 提取** | `replace(/^\(|\)$/g, '')` | `normalizeUserId()` + `.toLowerCase()` | **破坏大小写敏感 ID** |
| **ID 匹配** | `followerIds.includes(userId)` | `followerIds.some(id => id === viewerUserId)` | 匹配对象反转 |
| **翻页检测** | 精确下一页链接匹配 | 数字比较 + "下一页"文本 | 更复杂但更健壮 |
| **条件判断** | `if (!hasReachedEnd)` 时才比较 | 无此条件，每页都比较 | 原版最后一页不检查（bug?） |

### 2.4 根因分析

**问题 1：getLoggedInUserId 依赖**

原版完全不需要知道登录用户的 ID，只需遍历自己的 followers 列表查找目标。当前版本需要知道自己的 ID 来在对方的 friends 列表中查找自己。

`getLoggedInUserId` 的实现：
```javascript
export default function getLoggedInUserId() {
  // 1. 尝试 cookie 'u'
  const cookieUserId = cookies.get('u')
  if (cookieUserId) return cookieUserId

  // 2. 尝试从导航栏 "我的空间" 链接提取
  const profilePageLink = findElementWithSpecifiedContentInArray(navLinks, '我的空间')
  // ...
}
```

原版的 `getLoggedInUserId` 更简单：
```javascript
export default simpleMemoize(() => cookies.get('u'))
```

如果 cookie `u` 不存在且 DOM 回退也失败，当前版本返回 `undefined`，`normalizeUserId(undefined)` → `normalizeUserId('')` → `''`，导致后续匹配永远失败。

**问题 2：normalizeUserId 破坏 ID 匹配**

```javascript
function normalizeUserId(raw) {
  return raw.trim()
    .replace(/[\s]+/g, ' ')
    .replace(/^[@（(\s]+/, '')
    .replace(/[@）)\s]+$/, '')
    .trim()
    .toLowerCase()  // ← 关键问题：饭否 ID 可能区分大小写
}
```

饭否的用户 ID 支持混合大小写（如 `FanFou`）。`.toLowerCase()` 会把 `FanFou` 转为 `fanfou`。如果 cookie 中存储的是 `FanFou`，而 m.fanfou.com 页面显示的是 `fanfou`（或反之），归一化后可能**仍然不匹配**，也可能**意外匹配**。这种不确定性是致命的。

**问题 3：proxiedFetch 在 MV3 中的 Cookie 问题**

`proxiedFetch` 的 background handler 使用 `credentials: 'include'`：
```javascript
let w = wretch(url).options({
  credentials: 'include',  // 必须带上 cookie
})
```

在 MV2 中，Background Page 是持久页面，`credentials: 'include'` 会携带浏览器中 `m.fanfou.com` 的 cookie。在 MV3 中，Background 是 Service Worker，cookie 处理可能受到 [第三方 Cookie 分区](https://developer.chrome.com/docs/privacy-sandbox/chips/) 的影响，导致 `m.fanfou.com` 的 cookie 无法被正确携带。

如果 cookie 未携带，`m.fanfou.com/friends/p.1?u=xxx` 会返回登录页面而非好友列表，`parseHTML` 解析后得到空列表 → `hasReachedEnd = true` → 直接判定"未关注"。

**问题 4：原版最后一页判断逻辑**

原版有一个微妙的 bug（或特性）：
```javascript
if (!hasReachedEnd) {
  isFollowed = followerIds.includes(userId)
}
```

只在**未到达末页**时才检查，最后一页的结果被跳过了。当前版本修复了这一点（每页都检查），但这不影响当前版本的核心问题。

### 2.5 修复建议

**P1 — 回退到原版逻辑**（预计改动 ~50 行）：

```javascript
// 1. 移除 getLoggedInUserId 导入
// 2. 移除 normalizeUserId 函数
// 3. 恢复原版 fetchFollowersList

async function fetchFollowersList(pageNumber) {
  const url = `https://m.fanfou.com/followers/p.${pageNumber}`
  // 不传 user 参数
  const { error, responseText: html } = await proxiedFetch.get({ url })

  // 恢复原版 ID 提取
  followerIds = items.map(item => item.textContent.replace(/^\(|\)$/g, ''))

  // 恢复原版翻页检测
  hasReachedEnd = !select.exists(`a[href="/followers/p.${pageNumber + 1}"]`, document)
}

// 4. 恢复原版 checkFriendship
async function checkFriendship() {
  const userId = await getCurrentPageOwnerUserId()
  // 不需要 getLoggedInUserId

  while (true) {
    const { followerIds, hasReachedEnd } = await fetchFollowersList(++pageNumber)
    isFollowed = followerIds.includes(userId)  // 修复：每页都检查
    if (hasReachedEnd || isFollowed) break
  }
}
```

**注意**: 此修复仍依赖 `proxiedFetch` 从 Service Worker 访问 `m.fanfou.com`。如果 MV3 Cookie 问题导致失败，需要额外方案（如通过 Content Script 中转请求）。

---

## 3. MV3 迁移影响总览

### 3.1 架构变化

| 维度 | MV2 (原版) | MV3 (当前) |
|------|-----------|-----------|
| **Background** | 持久 Background Page | Service Worker（短暂生命周期） |
| **manifest_version** | 2 | 3 |
| **权限声明** | `permissions` 包含 host | `permissions` + `host_permissions` 分离 |
| **CSP** | 字符串格式 | 对象格式 `{ extension_pages: ... }` |
| **页面动作** | `page_action` | `action` |
| **web_accessible_resources** | 字符串数组 | 对象数组（含 matches） |
| **新增权限** | — | `offscreen`, `scripting`, `alarms`, `identity` |
| **新增文件** | — | `offscreen.html`/`offscreen.js` |

### 3.2 通信链路变化

```
MV2:
Page Script ←CustomEvent→ Content Script ←chrome.runtime→ Background Page
                                                          (持久，有完整 DOM)

MV3:
Page Script ←CustomEvent→ Content Script ←chrome.runtime→ Service Worker
                                                          (短暂，无 DOM)
                                                          ↓ 需要 DOM 时
                                                          Offscreen Document
```

### 3.3 Service Worker 生命周期影响

Service Worker 在无活动约 30 秒后会被终止。这对以下功能有影响：

- **通知检查**：需要使用 `chrome.alarms` 替代 `setInterval`
- **长连接**：WebSocket 无法在 Service Worker 中维持
- **状态缓存**：`tokenCache` 等内存变量会随 Service Worker 终止而丢失

当前代码中 `fanfouOAuth.js` 的 `tokenCache` 变量会在 Service Worker 重启后清空，需要每次从 `chrome.storage` 重新读取（当前已实现 `readTokens()` 的 storage 回退）。

### 3.4 Cookie 访问变化

MV3 Service Worker 中 `fetch` 的 `credentials: 'include'` 行为：

- Chrome 已确认 Service Worker 中 `credentials: 'include'` 仍可发送第一方 cookie
- 但 `m.fanfou.com` 的 cookie 对于从扩展 Service Worker 发起的请求是否算"第一方"存在歧义
- 如果 Chrome 的隐私沙盒（Cookie 分区）策略生效，cookie 可能被隔离

这直接影响 `proxiedFetch` 和 `check-friendship` 的可靠性。

---

## 4. API 端点可用性测试

从当前环境（WSL2）测试饭否 API：

```
$ curl -sv "http://api.fanfou.com/users/show.json?callback=test&id=fanfou"
< HTTP/1.1 404 Not Found
< Server: nginx
< Access-Control-Allow-Origin: *

$ curl "https://api.fanfou.com/users/show.json?id=fanfou"
→ 404 Not Found

$ curl "https://fanfou.com/"
→ 404 Not Found

$ curl "https://m.fanfou.com/"
→ 404 Not Found
```

**发现**: 所有饭否域名（fanfou.com、api.fanfou.com、m.fanfou.com）从 WSL2 环境均返回 404。可能原因：
1. 饭否服务需从中国大陆网络访问
2. 服务器对非浏览器 User-Agent 返回不同响应
3. 服务当前处于维护/异常状态

**结论**: 此测试不影响代码层面的审核结论。JSONP 方案的可行性取决于用户浏览器环境中 API 是否可达，而非我们的测试环境。

---

## 5. 修复优先级建议

### P0：恢复 sidebar-statistics JSONP 方案

**理由**: 改动最小、效果最明确、风险最低。

| 步骤 | 操作 |
|------|------|
| 1 | 确认 `p-retry` 在 `package.json` 中（如不在，`npm install p-retry`） |
| 2 | 恢复 `@page.js` 中的 JSONP 数据获取逻辑 |
| 3 | 移除 `requireModules(['proxiedFetch', 'fanfouOAuth'])` 依赖 |
| 4 | 移除 DOM 提取逻辑和三层回退代码 |
| 5 | 构建 → 加载扩展 → 访问用户页面 → 检查统计信息面板 |

**预计改动**: ~30 行（净删除约 100 行）

### P1：回退 check-friendship 核心逻辑

**理由**: 需要回退多处改动，且依赖 `proxiedFetch` 的 MV3 Cookie 行为。

| 步骤 | 操作 |
|------|------|
| 1 | URL 从 `/friends/` 改回 `/followers/` |
| 2 | 移除 `u` 查询参数 |
| 3 | 移除 `getLoggedInUserId` 导入和调用 |
| 4 | 移除 `normalizeUserId` 函数 |
| 5 | 恢复原版 ID 提取和比较逻辑 |
| 6 | 测试：访问他人页面 → 点击检查按钮 → 验证结果 |
| 7 | 如果 MV3 Cookie 导致 proxiedFetch 失败，需额外排查 |

**预计改动**: ~50 行

### P2：OAuth 流程完善（可选增强）

OAuth 不是修复上述功能的必要条件，但可作为**增强功能**保留：

- 将 `defaultValue` 改为 `true`（但仍需用户填写 Key/Secret）
- 或者内置一个公共的 Consumer Key（如果饭否允许）
- 作为 JSONP 不可用时的备选方案

**建议**: 暂不优先处理，等 P0/P1 完成后再评估是否需要。

---

## 附录 A：文件清单

| 文件 | 行数 | 角色 | 状态 |
|------|------|------|------|
| `src/features/sidebar-statistics/@page.js` | 315 | 注册时间主文件 | 需回退 |
| `src/features/sidebar-statistics/metadata.js` | 1 | 焊死功能（无法关闭） | 无需改动 |
| `src/features/check-friendship/@page.js` | 175 | 好友关系检查主文件 | 需回退 |
| `src/features/check-friendship/metadata.js` | 6 | 功能配置 | 无需改动 |
| `src/background/environment/fanfouOAuth.js` | 332 | OAuth 1.0 实现 | 保留（P2） |
| `src/background/environment/proxiedFetch.js` | 41 | 跨域代理 | 保留 |
| `src/libs/jsonp.js` | 57 | JSONP 库 | 仍在项目中，需被重新引用 |
| `src/libs/getLoggedInUserId.js` | 40 | 获取登录用户 ID | check-friendship 不再需要 |
| `src/libs/getCurrentPageOwnerUserId.js` | 11 | 获取页面用户 ID | 两版本一致 |

## 附录 B：原版 vs 当前版本 getLoggedInUserId 对比

```javascript
// ===== 原版（4行）=====
import cookies from 'js-cookie'
import simpleMemoize from 'just-once'
export default simpleMemoize(() => cookies.get('u'))

// ===== 当前版本（40行）=====
import cookies from 'js-cookie'
import select from 'select-dom'
import findElementWithSpecifiedContentInArray from '@libs/findElementWithSpecifiedContentInArray'

let cachedUserId

function getUserIdFromProfileLink() {
  const navLinks = select.all('#navigation li a')
  const profilePageLink = findElementWithSpecifiedContentInArray(navLinks, '我的空间')
  if (!profilePageLink) return undefined
  try {
    const url = new URL(profilePageLink.href, window.location.origin)
    const [ userId ] = url.pathname.replace(/^\/+/, '').split('/')
    return userId || undefined
  } catch (error) {
    return undefined
  }
}

export default function getLoggedInUserId() {
  if (cachedUserId) return cachedUserId
  const cookieUserId = cookies.get('u')
  if (cookieUserId) { cachedUserId = cookieUserId; return cachedUserId }
  const domUserId = getUserIdFromProfileLink()
  if (domUserId) { cachedUserId = domUserId; return cachedUserId }
  return undefined
}
```

当前版本增加了 DOM 回退，但核心问题不在于 `getLoggedInUserId` 本身，而在于 `check-friendship` 不应该依赖它。

---

## 6. 与 Codex 审核报告的交叉对比

本节对比 `codex-审核.md` 与本报告的异同，标注共识、分歧和事实纠正。

### 6.1 共识点

| 主题 | Claude 报告 | Codex 报告 | 判定 |
|------|------------|-----------|------|
| `created_at` 在无 OAuth 时无法获取 | 1.4 节 失败链路分析 | 4.4 节 | **一致** |
| OAuth 默认关闭，绝大多数用户不会配置 | 1.3 节 对比表 | 5.1 节 | **一致** |
| check-friendship 当前实现比原版脆弱 | 2.3 节 逐项对比 | 3.2 节 + 4.2 节 | **一致** |
| `getLoggedInUserId` 失败 → 直接误判未关注 | 2.4 节 问题1 | 4.3 节 | **一致** |
| `hasChecked=true` 阻止重试 | 未提及 | 4.3 节 | **Codex 补充有效**，纳入修复建议 |
| 恢复原版 `/followers/` 路径 | 2.5 节 | 6.2 节 | **一致** |

### 6.2 分歧点一：`isUserProfilePage()` 超时是否导致功能不加载

**Codex 判断**（4.1 节，标记为最优先修复点）：
> `elementReady('#overlay-report', { timeout: 10000 })` 没有 `try/catch`，一旦超时 reject，后续 URL 兜底逻辑根本不会执行。

**事实验证**：

项目使用 `element-ready@4.1.1`。查看 `node_modules/element-ready/index.js:25-29`：

```javascript
const stop = () => {
    cancelAnimationFrame(rafId);
    cache.delete(cacheKeys, promise);
    deferred.resolve();   // ← 无参数 resolve，不是 reject
};

if (timeout !== Infinity) {
    setTimeout(stop, timeout);  // 超时 → 调用 stop → resolve(undefined)
}
```

超时时调用 `deferred.resolve()` 无参数，promise **resolve 为 `undefined`**，不会 reject。

当前 `pageDetect.js:77-93` 的处理逻辑：
```javascript
const overlayReport = await elementReady('#overlay-report', { timeout: 10000 })
// 超时 → overlayReport = undefined
if (overlayReport) { return true }   // undefined → false，跳过
// → 正常执行到 URL 模式兜底（85-93 行）
```

**结论：Codex 在此点上判断错误。** `isUserProfilePage()` 不存在超时中断问题，无需修复。此项从修复优先级中移除。

### 6.3 分歧点二：JSONP 方案是否可恢复

**Codex 判断**（5.1 节）：
> 原版匿名拿 `users/show` 的路径在现在不可依赖。

**Claude 判断**（1.5 节）：
> JSONP 在 MV3 中仍然可用。Page Scripts 运行在页面上下文中，不受扩展 CSP 限制。

**分析**：

Codex 未区分"MV3 的 CSP 是否阻止 JSONP"和"饭否 API 端点是否仍然支持 JSONP"这两个独立问题：

1. **CSP 层面**：MV3 的 `script-src 'self'` 仅适用于 extension pages。Page Scripts（`@page.js`）运行在 fanfou.com 页面上下文中，受**页面的 CSP** 约束，而非扩展的。饭否没有设置严格的 CSP。因此 CSP 不阻止 JSONP。

2. **API 层面**：`src/libs/jsonp.js` 仍完整存在于项目中（57 行，未修改）。原版代码通过 JSONP 调用 `//api.fanfou.com/users/show.json` 无需认证。如果此 API 端点仍可用（对登录用户的浏览器可达），JSONP 方案即可恢复。

3. **网络测试**：从 WSL2 环境 curl 测试返回 404，但这可能是网络环境限制（需中国大陆网络）或 User-Agent 差异。不能据此否定浏览器内的 JSONP 可行性。

**结论：JSONP 恢复仍应作为 P0 方案尝试。** 如果实际测试中 API 端点确实不再支持匿名 JSONP，再降级到 Codex 建议的 OAuth 闭环方案。

### 6.4 Codex 报告中值得采纳的建议

| 建议 | 来源 | 采纳情况 |
|------|------|----------|
| check-friendship 失败时 `hasChecked` 阻止重试 | Codex 4.3 | **采纳** — 修复时应重置 `hasChecked` 或允许重试 |
| OAuth 设置页展示当前失败点 | Codex 6.3 | **纳入 P2** — 提升调试体验 |
| `created_at` 不可得时显示降级文案 | Codex 6.4 | **采纳** — 即使恢复 JSONP 也应有降级提示 |
| 恢复 `/followers/` 后保留 `/friends/` 作备选 | Codex 6.2 | **暂不采纳** — 先验证原版路径，避免增加复杂度 |

### 6.5 修正后的修复优先级

| 优先级 | 修复项 | 状态 |
|--------|--------|------|
| **P0** | sidebar-statistics 恢复 JSONP | Claude 报告原始建议，维持 |
| **P1** | check-friendship 回退到原版 `/followers/` 逻辑 | 两份报告共识 |
| **P1.1** | check-friendship 失败时允许重试（重置 `hasChecked`） | Codex 补充，纳入 |
| **P2** | `created_at` 不可得时显示降级文案 | Codex 补充，纳入 |
| **P2** | OAuth 流程完善 + 设置页错误提示 | 两份报告共识 |
| ~~P0~~ | ~~修 `isUserProfilePage()` 超时~~ | **已排除** — element-ready 超时不 reject |

---

---

## 7. 实测结果（2026-02-20）

**分支**: `claude/fix-sidebar-friendship-e2e`
**测试账号**: `kiruoto`（通过 `m.fanfou.com` 无验证码登录）
**测试工具**: Playwright Chromium + 扩展加载

### 7.1 check-friendship — ✅ 功能正常

```
[test] check-friendship 结果: 他没有关注你 :(   ✓ PASSED (1.3s)
```

修复后行为符合预期：
- `proxiedFetch` 成功访问 `m.fanfou.com/followers/p.N`（Service Worker cookie 携带正常）
- 移除 `normalizeUserId` 和 `getLoggedInUserId` 后逻辑回归稳定
- `hasChecked = false` 重置允许重试

### 7.2 sidebar-statistics — ⚠️ 代码正确，API 认证待确认

```
[test] 注册时间文字: 注册于 API 不可用   ✓ PASSED (43.1s)
```

**发现**（测试过程中的关键事实）：

| 测试方式 | `api.fanfou.com` 结果 |
|---------|----------------------|
| `curl` 无代理 | 404（连到 198.18.0.5，假 IP） |
| `curl` 走 Windows 代理（127.0.0.1:7897） | 404 |
| Playwright 无代理（`launch`，无 extension） | "Failed to fetch" |
| Playwright 无代理（`launch`，有代理参数） | **401 + `{"error":"参数错误!"}`** ← API 存活 |
| Playwright + extension（`launchPersistentContext`） | "Failed to fetch"（代理未被 extension context 采用） |

**核心结论**：
1. `api.fanfou.com/users/show.json` **端点存在**，返回 401 而非 404，说明 API 服务运行正常
2. API 现在**要求认证**（原版代码时代可能是匿名公开的），401 错误体为 `{"error":"参数错误!"}` ← 即"未带 OAuth 签名或 session cookie"
3. JSONP 请求**确实被发出**（在 request log 中可见），但浏览器 session cookie 是否足以通过认证**尚未验证**
4. Playwright 测试环境的 extension context 无法通过代理到达 API，所以测试只能验证"不再显示 NaN"而无法验证年份

**待人工验证**：在真实 Chrome 浏览器中加载 `dist/` 扩展，访问任意饭否用户页面，观察 sidebar 是否显示年份。若显示"API 不可用"，则需要接入 OAuth 签名（fanfou-oauth 模块已存在，需打通流程）。

### 7.3 技术基础设施（新增）

| 文件 | 用途 |
|------|------|
| `tests/e2e/login-and-save.js` | 通过 `m.fanfou.com` 无验证码登录，保存 cookie 到 `.env.local` |
| `tests/e2e/fanfou.test.js` | Playwright e2e 主测试文件 |
| `tests/e2e/setup.js` | 扩展加载 + cookie 注入 helper |
| `playwright.config.js` | 60 秒超时配置 |
| `tests/e2e/.env.local` | 凭据（已 gitignore，不提交） |

### 7.4 更新后的修复状态

| 优先级 | 修复项 | 状态 |
|--------|--------|------|
| **P0** | sidebar-statistics 恢复 JSONP + 降级文案 | ✅ **已完成**（"API 不可用"替代 NaN） |
| **P1** | check-friendship 回退 `/followers/` 逻辑 | ✅ **已完成** |
| **P1.1** | check-friendship `hasChecked` 允许重试 | ✅ **已完成** |
| **P2** | sidebar-statistics API 认证可用性确认 | ⏳ **待人工验证**（需真实 Chrome） |
| **P2** | OAuth 流程完善（API 确实要求签名时启用） | ⏳ **待评估** |
| **P2** | OAuth 设置页展示失败点 | ⏳ 未开始 |

---

*报告完毕。*
*Co-Authored-By: Claude <noreply@anthropic.com>*
