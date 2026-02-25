# Claude 修复建议（供 Gemini 参考）

**日期**: 2026-02-25
**目标分支**: `gemini/fix-mv3`
**核心议题**: OAuth 授权流程存在一个 UX bug，导致用户即使看到"开始授权"按钮可点，点击后却报错。

---

## 背景速查

- nofan consumer key 已内置（`fanfouOAuth.js:17-18`）✅
- check-friendship 已回退原版 `/followers/` 逻辑 ✅
- Claude 分支已证实 JSONP 和 proxiedFetch 对他人页面均返回 401 ✅
- **他人注册时间的唯一可行路径：OAuth + access token**

---

## 问题一（必修）：`enabled` 门槛阻断授权

### 现象

用户在设置页点击"开始授权"→ 报错"请先勾选「启用 OAuth 认证」"。
但 UI 上按钮明明是可点状态（`canAuthorize: hasCredentials = true`）。

### 根因

**文件**: `src/background/environment/fanfouOAuth.js`

```javascript
// 第 224 行 — handleAuthorize()
if (!consumer.enabled) {
  return { error: '请先勾选「启用 OAuth 认证」' }
}
```

`consumer.enabled = !!optionValues['fanfou-oauth']`。
对于**从未打开过设置页的用户**，`chrome.storage` 里没有这个 key，`settings.readAll()` 返回 `undefined`，`!!undefined = false`，授权直接被拦截。

`metadata.js` 虽然写了 `defaultValue: true`，但如果 `settings.readAll()` 对未落盘的 key 不返回 defaultValue（只读 storage 实际存储值），这个默认值就没有效果。

### 修复方案

在 `handleAuthorize()` 里，当使用内置 key 时跳过 `enabled` 检查：

```javascript
async function handleAuthorize() {
  try {
    const consumer = await readConsumerConfig()
    const redirectUrl = chrome.identity.getRedirectURL('fanfou-oauth')

    // 使用内置 key 时无需用户手动启用开关
    if (!consumer.enabled && !consumer.usingBuiltinKey) {
      return { error: '请先勾选「启用 OAuth 认证」' }
    }

    if (!consumer.hasCredentials) {
      return { error: '请填写 Consumer Key 和 Consumer Secret 后重试' }
    }
    // ... 后续不变
```

**或者更简单**（如果你认为 `enabled` 开关在有内置 key 的前提下完全多余）：

```javascript
// 直接移除整个 enabled 检查，只保留 hasCredentials 检查
async function handleAuthorize() {
  try {
    const consumer = await readConsumerConfig()
    const redirectUrl = chrome.identity.getRedirectURL('fanfou-oauth')

    if (!consumer.hasCredentials) {
      return { error: '请填写 Consumer Key 和 Consumer Secret 后重试' }
    }
    // ... 后续不变
```

**推荐后者**：`hasCredentials` 永远为 `true`（内置 key 存在），`enabled` 的概念在有内置 key 后已无意义。

---

## 问题二（需验证）：`settings.readAll()` 是否返回 defaultValue

请在 `readConsumerConfig()` 里加一行日志确认：

```javascript
async function readConsumerConfig() {
  const optionValues = await settings.readAll()
  console.log('[SpaceFanfou] fanfou-oauth enabled raw:', optionValues['fanfou-oauth'])
  const enabled = !!optionValues['fanfou-oauth']
  // ...
}
```

**预期**：对从未进过设置页的用户，如果 `settings.readAll()` 正确处理 defaultValue，应该打印 `true`。
**如果打印 `undefined`**：说明 settings 模块不回填 defaultValue，问题一的修复是必须的。

验证完可删掉这行日志。

---

## 问题三（可选改进）：授权入口不够显眼

用户需要自己找到设置页才能授权。可以在 sidebar-statistics 的降级提示上加一个直接跳转链接：

当前代码（`sidebar-statistics/@page.js` 约第 258 行）：
```jsx
{ oauthNotConfigured &&
  <li class="sf-sidebar-statistics-item sf-oauth-tip">
    精确数据需在设置页完成 OAuth 授权
  </li>
}
```

改为带链接版本：
```jsx
{ oauthNotConfigured &&
  <li class="sf-sidebar-statistics-item sf-oauth-tip">
    精确数据需 <a href={chrome.runtime.getURL('settings.html')} target="_blank">OAuth 授权</a> 后显示
  </li>
}
```

**注意**：Page Script 运行在 fanfou.com 页面上下文里，`chrome.runtime` 是否可用需确认。如果不可用，可以通过 CustomEvent 向 Content Script 发消息打开设置页。

---

## 验收标准（手动测试步骤）

1. 全新安装扩展（或清除 `chrome.storage`）
2. 打开任意饭否用户页面 → sidebar 显示"精确数据需 OAuth 授权后显示"
3. 打开设置页 → 点击"开始授权"→ **不应报错**，应弹出饭否授权页
4. 在饭否授权页同意 → 回到插件设置页 → 显示"已授权账号：xxx"
5. 刷新饭否用户页面 → sidebar 显示注册时间、饭龄、饭量、饭香
6. 访问**他人**用户页面 → 同样显示完整统计信息
7. 点击"检查与 TA 的关系"→ 正确显示关注状态

---

## 文件清单

| 文件 | 改动 | 优先级 |
|------|------|--------|
| `src/background/environment/fanfouOAuth.js` | 移除/修改 `handleAuthorize()` 中的 `enabled` 检查 | **P0 必改** |
| `src/features/sidebar-statistics/@page.js` | 降级提示加授权链接（可选） | P2 可选 |

**不需要改动**：
- `src/features/fanfou-oauth/metadata.js`（已正确）
- `src/features/check-friendship/@page.js`（已修复）
- `src/settings/components/OAuthPanel.js`（UI 已合理）

---

*由 Claude Sonnet 4.6 根据源码审查生成，2026-02-25*
