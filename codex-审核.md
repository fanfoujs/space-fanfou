# codex 审核报告（space-fanfou）

## 1. 审核范围与基线

- 当前项目：`HEAD` = `35046f4`
- 原项目基线：`upstream/main` = `e206891`
- 差异规模：`93 files changed, 10129 insertions(+), 536 deletions(-)`

本次重点审核你明确提到的两项功能：

1. 用户注册时间显示（`sidebar-statistics`）
2. 用户相互关注检测（`check-friendship`）

---

## 2. 总结结论（先说结论）

### 2.1 注册时间显示

当前实现的主链路已经从原版的“匿名 JSONP”改成了“OAuth + 回退请求”，方向是对的；但在未完成 OAuth 授权前，`created_at` 基本无法稳定获取，因此该功能仍会长期不生效。

### 2.2 相互关注功能

当前实现在逻辑与依赖上都比原版更脆弱，主要存在两类风险：

- 入口触发层：`isUserProfilePage()` 的超时异常会让功能根本不加载。
- 数据来源层：把判定链路改成 `m.fanfou.com/friends/p.N?u=...`，对端点和参数有额外假设，失败面更大。

---

## 3. 原版 vs 当前：关键差异

## 3.1 注册时间（sidebar-statistics）

### 原版（可工作的前提）

- 文件：`src/features/sidebar-statistics/@page.js`
- 核心：直接 JSONP 调 `//api.fanfou.com/users/show.json`。
- 证据：`upstream/main:src/features/sidebar-statistics/@page.js` 第 41-50 行。

```js
const apiUrl = '//api.fanfou.com/users/show.json'
const fetch = () => jsonp(apiUrl, { params })
```

### 当前版本

- 文件：`src/features/sidebar-statistics/@page.js`
- 先从当前页面 DOM 提取计数（消息/关注/粉丝），再尝试 API 拿 `created_at`。
- 证据：`src/features/sidebar-statistics/@page.js:48-157`
  - DOM 提取：`#info` + 正则解析（69-85 行）
  - OAuth 请求：`oauthClient.request(...)`（100-123 行）
  - 未签名回退：`proxiedFetch.get(...)`（126-154 行）

### 结论

- 原版依赖“匿名可访问 users/show.json”的时代条件；这个条件现在已不可靠。
- 当前代码的 OAuth 能力已经接入（`src/background/environment/fanfouOAuth.js`），但功能是否可用取决于用户是否真的完成授权（Key/Secret + 回调地址 + 授权流程）。

---

## 3.2 相互关注（check-friendship）

### 原版

- 文件：`upstream/main:src/features/check-friendship/@page.js`
- 判定方式：请求 `https://m.fanfou.com/followers/p.N`，判断页面所有者 ID 是否在“我的粉丝列表”里。
- 证据：第 78-93 行、第 103-112 行。

### 当前版本

- 文件：`src/features/check-friendship/@page.js`
- 判定方式改为：请求 `https://m.fanfou.com/friends/p.N?u=<targetUserId>`，再检查当前登录用户 ID 是否在对方 friends 列表。
- 证据：`src/features/check-friendship/@page.js:95-123`、`134-150`

### 结论

- 当前做法在理论上可行，但依赖更多前提（`u` 参数有效、friends 页面结构稳定、移动站可访问、cookie 生效）。
- 在真实运行中，只要其中任何一项不成立，就会直接误报“没有关注你”。

---

## 4. 已确认的高风险点（与两项功能直接相关）

## 4.1 `isUserProfilePage()` 的超时异常会中断功能加载

- 文件：`src/libs/pageDetect.js:62-97`
- 问题：
  - 使用 `await elementReady('#overlay-report', { timeout: 10000 })`
  - 但没有 `try/catch`
  - 一旦超时 reject，`isUserProfilePage()` 直接 reject，后续 URL 兜底逻辑（85-96 行）根本不会执行
- 影响：
  - `check-friendship` 的 `applyWhen` 依赖 `isUserProfilePage()`（`src/features/check-friendship/@page.js:160-163`）
  - `sidebar-statistics` 也依赖 `isUserProfilePage()`（`src/features/sidebar-statistics/@page.js:298` 附近）

这会导致“功能不触发/不渲染”，是当前最优先修复点。

## 4.2 相互关注功能的数据源假设更脆弱

- 文件：`src/features/check-friendship/@page.js:97-99`
- 当前强依赖 `https://m.fanfou.com/friends/p.N` + `u` 参数。
- 相比原版 `followers/p.N`，多了一个参数语义依赖，且页面结构抓取仍基于字符串选择器（`ol > li > a > span.a`）。

## 4.3 登录用户 ID 获取失败时会直接给出“未关注”

- 文件：`src/features/check-friendship/@page.js:135-141`
- 若 `getLoggedInUserId()` 失败，直接展示未关注并结束。
- 且 `hasChecked` 已经置为 `true`（130-131 行），同一次页面生命周期内无法重试。

## 4.4 注册时间仍被 OAuth 状态卡住

- 文件：`src/background/environment/fanfouOAuth.js:273-283`
- 只要 OAuth 未启用、凭据未填、授权未完成，都会返回错误，不会有 `created_at`。
- `sidebar-statistics` 中未签名回退（`src/features/sidebar-statistics/@page.js:126-154`）从设计上就不稳定，不能作为长期方案。

---

## 5. 根因判断（对应你的两个卡点）

### 5.1 “注册时间始终无法显示”

更像“外部认证前置条件 + 产品流程未闭环”问题，不是单点代码语法 bug：

1. 原版匿名拿 `users/show` 的路径在现在不可依赖。
2. 当前虽接入 OAuth，但授权流程仍存在未打通情况（项目文档也记录了这一点）。
3. 未签名回退不是可持续主链路。

### 5.2 “相互关注功能始终无法实现”

大概率是“触发层 + 数据层叠加失败”：

1. `pageDetect` 超时异常导致子功能不加载。
2. 即使加载，`friends + u` 这条抓取链路比原版更脆。
3. 登录用户 ID 读取失败时直接误判为未关注且不允许重试。

---

## 6. 修复优先级建议（建议按顺序执行）

1. 先修 `isUserProfilePage()`：对 `elementReady(...timeout)` 加 `try/catch`，保证超时后仍走 URL 兜底。
2. 相互关注先回到“可验证最小路径”：优先恢复/兼容原版 `followers` 检测，再保留 `friends + u` 作为备选策略，而不是单一路径。
3. OAuth 走“可操作闭环”：
   - 设置页明确展示“当前失败点”（回调地址、签名失败、token 缺失）。
   - 为 `FANFOU_OAUTH_AUTHORIZE` 增加更细日志（请求发起、返回码、回调 URL、verifier）。
4. 注册时间显示增加显式降级文案：当 `created_at` 不可得时，UI直接提示“未授权 API，无法读取注册时间”，避免用户误解为计算错误。

---

## 7. 你现在这个分支的审核结论

- Manifest V3 迁移基础工作是有效的，项目主干可运行。
- 你卡住的两个功能不是“只差一两行”的小问题：
  - 注册时间本质受 OAuth 接入闭环影响。
  - 相互关注本质受页面检测与抓取策略稳定性影响。
- 只要先处理 `pageDetect` 异常路径，再收敛"单一脆弱抓取策略"，这两个功能可以明显回到可控状态。

---

## 8. Claude Code 交叉审核修正（2026-02-15）

以下是 Claude Code 对本报告的逐项复核结果。

### 8.1 事实纠正：`isUserProfilePage()` 超时不会导致异常

**原文（4.1 节）声称**：
> `elementReady('#overlay-report', { timeout: 10000 })` 没有 `try/catch`，一旦超时 reject，后续 URL 兜底逻辑根本不会执行。

**纠正**：项目使用 `element-ready@4.1.1`。查看其源码 `node_modules/element-ready/index.js:25-29`：

```javascript
const stop = () => {
    cancelAnimationFrame(rafId);
    cache.delete(cacheKeys, promise);
    deferred.resolve();   // ← resolve()，无参数，不是 reject()
};

if (timeout !== Infinity) {
    setTimeout(stop, timeout);  // 超时时调用 stop → resolve(undefined)
}
```

超时时 promise **resolve 为 `undefined`**，不会 reject。当前代码 `pageDetect.js:77-93` 正确处理了这一情况：

```javascript
const overlayReport = await elementReady('#overlay-report', { timeout: 10000 })
if (overlayReport) { return true }   // undefined → false，跳过
// → 正常落入 URL 模式兜底逻辑（85-93 行）
```

**结论：此项不是 bug，无需修复。从修复优先级第 1 位移除。**

### 8.2 分歧补充：JSONP 方案在 MV3 中仍然可行

**原文（5.1 节）声称**：
> 原版匿名拿 `users/show` 的路径在现在不可依赖。

**补充分析**：

此判断可能混淆了两个独立问题：

1. **MV3 CSP 是否阻止 JSONP？** — 不阻止。`sidebar-statistics/@page.js` 是 Page Script，运行在 fanfou.com 的页面上下文中。MV3 的 `content_security_policy.extension_pages: "script-src 'self'"` 仅适用于扩展自身页面（popup、options、background），不影响页面上下文中的 `<script>` 标签注入。

2. **饭否 API 是否仍支持匿名 JSONP？** — 需要在用户浏览器中实际验证。`src/libs/jsonp.js`（57 行）仍完整存在于项目中，未被删除。从 WSL2 的 curl 测试返回 404，但这可能是网络环境限制（需中国大陆网络访问），不能作为 API 不可用的依据。

**建议**：应将"恢复 JSONP"作为 P0 优先尝试（改动量 ~30 行，风险极低）。如果实际验证 API 确实不再支持匿名访问，再降级到 OAuth 闭环方案。

### 8.3 确认有效的发现

| 原报告章节 | 内容 | 复核结果 |
|-----------|------|----------|
| 4.2 数据源假设脆弱 | `/friends/p.N?u=...` 比原版 `/followers/p.N` 更脆弱 | **确认有效** |
| 4.3 登录用户 ID 获取失败 | `getLoggedInUserId()` 失败 → 误判未关注且不可重试 | **确认有效**，`hasChecked` 重试问题值得修复 |
| 4.4 OAuth 状态卡住 | 未签名回退不可作为长期方案 | **确认有效**，但可通过恢复 JSONP 绕过 |
| 6.4 降级文案 | `created_at` 不可得时应提示而非显示 NaN | **确认有效**，纳入修复计划 |

### 8.4 修正后的修复优先级

| 优先级 | 修复项 | 变更说明 |
|--------|--------|----------|
| **P0** | sidebar-statistics 恢复 JSONP 方案 | 新增（Claude 报告建议） |
| **P1** | check-friendship 回退到 `/followers/` 逻辑 | 原报告 6.2，维持 |
| **P1.1** | check-friendship 失败时允许重试 | 原报告 4.3，提升优先级 |
| **P2** | `created_at` 不可得时显示降级文案 | 原报告 6.4，维持 |
| **P2** | OAuth 设置页展示失败点 | 原报告 6.3，维持 |
| ~~P0~~ | ~~修 `isUserProfilePage()` 超时~~ | **移除** — element-ready v4.1.1 超时不 reject |

*— Claude Code (Opus 4.6) 交叉审核于 2026-02-15*
