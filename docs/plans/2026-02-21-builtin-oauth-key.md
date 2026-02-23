# 内置 OAuth 密钥，一键授权即可使用统计功能

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 nofan 的开源 consumer key 内置为默认值，用户只需在设置页点击一次「开始授权」，即可在任何人的个人页面看到饭香和注册时间。

**Architecture:** 在 `fanfouOAuth.js` 中以内置 key 为兜底（fallback），当用户未填写自定义 key 时自动使用内置 key；同时取消"必须先勾选启用复选框才能授权"的限制，让「开始授权」按钮始终可点；将 `_` 选项的 defaultValue 改为 `true`，使新用户开箱即用。

**Tech Stack:** Chrome Extension MV3, Preact, oauth-1.0a, chrome.storage.local

---

## 背景

- `api.fanfou.com/users/show.json` 要求 OAuth 1.0a 签名
- 饭否官方已停止受理开发者申请，普通用户无法自行获取 consumer key
- `fanfoujs/nofan`（与本项目同属 fanfoujs 组织，2026-01 仍活跃）公开了其 consumer key/secret
- 内置 key 后，用户只需一次 OAuth 授权（浏览器跳转饭否 → 点同意）即可完成

---

## Task 1: 在 fanfouOAuth.js 中内置 nofan 的 consumer key

**Files:**
- Modify: `src/background/environment/fanfouOAuth.js`

**Step 1: 在文件顶部 `const` 区域（`REQUEST_TOKEN_URL` 等定义之前）加入内置 key 常量**

在 `const REQUEST_TOKEN_URL = ...` 这行之前插入：

```javascript
// fanfoujs/nofan 开源项目公开的 consumer key（与本项目同属 fanfoujs 组织）
// 饭否官方已停止开发者申请，内置此 key 供无法自行申请的用户使用
const BUILTIN_CONSUMER_KEY = '13456aa784cdf7688af69e85d482e011'
const BUILTIN_CONSUMER_SECRET = 'f75c02df373232732b69354ecfbcabea'
```

**Step 2: 修改 `readConsumerConfig()` 使其在用户未填写时回退到内置 key**

将：
```javascript
async function readConsumerConfig() {
  const optionValues = await settings.readAll()
  const enabled = !!optionValues['fanfou-oauth']
  const consumerKey = (optionValues['fanfou-oauth/consumerKey'] || '').trim()
  const consumerSecret = (optionValues['fanfou-oauth/consumerSecret'] || '').trim()

  return {
    enabled,
    consumerKey,
    consumerSecret,
    hasCredentials: Boolean(consumerKey && consumerSecret),
  }
}
```

改为：
```javascript
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
```

**Step 3: 修改 `buildStatus()` 使「开始授权」按钮无需勾选复选框**

将：
```javascript
canAuthorize: enabled && hasCredentials,
```
改为：
```javascript
canAuthorize: hasCredentials, // 内置 key 始终可授权，无需先勾选复选框
```

**Step 4: 修改 `handleApiRequest()` — 移除强制 `enabled` 检查**

当 tokens 存在时，即使用户没有勾选复选框也应允许 API 请求。将：
```javascript
if (!consumer.enabled) {
  return { error: 'OAuth 功能未启用' }
}

if (!consumer.hasCredentials) {
  return { error: '请先填写 Consumer Key / Secret' }
}
```
改为：
```javascript
if (!consumer.hasCredentials) {
  return { error: '请先填写 Consumer Key / Secret' }
}
```

（`hasCredentials` 现在始终为 `true`，但保留此检查以防万一）

**Step 5: 在 `buildStatus()` 中传递 `usingBuiltinKey` 字段**

找到 `buildStatus` 函数返回值，加入 `usingBuiltinKey`：
```javascript
return {
  ok: true,
  status: {
    enabled,
    hasConsumerCredentials: hasCredentials,
    usingBuiltinKey: tokens?.consumerKey === BUILTIN_CONSUMER_KEY || consumer.usingBuiltinKey,
    hasTokens,
    canAuthorize: hasCredentials,
    screenName: tokens?.screenName || null,
    userId: tokens?.userId || null,
    redirectUrl,
    consumerKeyMatches: hasTokens ? tokens.consumerKey === consumer.consumerKey : true,
  },
}
```

**Step 6: 构建并验证无报错**

```bash
npm --prefix /home/fiver/projects/space-fanfou run build 2>&1 | grep -i error
```
预期：无 Error

---

## Task 2: 更新 fanfou-oauth metadata.js 的提示文案

**Files:**
- Modify: `src/features/fanfou-oauth/metadata.js`

**Step 1: 修改 `_`（主开关）的 defaultValue 和说明文案**

将：
```javascript
_: {
  defaultValue: false,
  label: '启用 OAuth 认证（填写下方字段并授权）',
  comment: '保存后请点击下方的「开始授权」按钮完成授权流程',
},
```
改为：
```javascript
_: {
  defaultValue: true,
  label: '启用 OAuth 认证',
  comment: '已内置开发者密钥，无需自行申请。直接点击下方「开始授权」完成一次性授权即可。',
},
```

**Step 2: 更新 consumerKey 和 consumerSecret 的 placeholder 文案**

```javascript
consumerKey: {
  defaultValue: '',
  label: `Consumer Key：${CONTROL_PLACEHOLDER}`,
  disableCloudSyncing: true,
  controlOptions: {
    placeholder: '留空则使用内置密钥',
    spellCheck: false,
    autoComplete: 'off',
  },
},

consumerSecret: {
  defaultValue: '',
  label: `Consumer Secret：${CONTROL_PLACEHOLDER}`,
  disableCloudSyncing: true,
  controlOptions: {
    placeholder: '留空则使用内置密钥',
    type: 'password',
    spellCheck: false,
    autoComplete: 'off',
  },
},
```

**Step 3: 构建验证**

```bash
npm --prefix /home/fiver/projects/space-fanfou run build 2>&1 | grep -i error
```

---

## Task 3: 更新 OAuthPanel.js 状态文案

**Files:**
- Modify: `src/settings/components/OAuthPanel.js`

**Step 1: 更新 `getSummary()` 中 Consumer Key 状态的描述**

找到：
```javascript
lines.push(
  status.hasConsumerCredentials
    ? 'Consumer Key / Secret：已填写'
    : 'Consumer Key / Secret：尚未填写或未保存'
)
```

改为：
```javascript
lines.push(
  status.usingBuiltinKey
    ? 'Consumer Key / Secret：使用内置密钥（nofan）'
    : status.hasConsumerCredentials
      ? 'Consumer Key / Secret：已填写（自定义）'
      : 'Consumer Key / Secret：尚未填写'
)
```

**Step 2: 构建验证**

```bash
npm --prefix /home/fiver/projects/space-fanfou run build 2>&1 | grep -i error
```

---

## Task 4: 更新 sidebar-statistics 的错误提示文案

**Files:**
- Modify: `src/features/sidebar-statistics/@page.js`

**Step 1: 在 `fetchUserProfileData()` 中区分不同错误类型**

当前代码：
```javascript
const isOAuthMissing = typeof error === 'string' && (
  error.includes('OAuth') ||
  error.includes('授权') ||
  error.includes('Consumer')
)
return { profile: {}, oauthNotConfigured: isOAuthMissing }
```

改为：
```javascript
const needsAuth = typeof error === 'string' && error.includes('授权')
const oauthDisabled = typeof error === 'string' && error.includes('OAuth 功能未启用')
return { profile: {}, oauthNotConfigured: needsAuth || oauthDisabled }
```

**Step 2: 更新「未授权」时的显示文案**

找到 `render()` 中 `oauthNotConfigured` 分支：
```jsx
if (oauthNotConfigured) {
  return (
    <div class="stabs sf-sidebar-statistics">
      <h2>统计信息</h2>
      <ul>
        <li class="sf-sidebar-statistics-item">需配置 OAuth 查看统计</li>
      </ul>
    </div>
  )
}
```

改为：
```jsx
if (oauthNotConfigured) {
  return (
    <div class="stabs sf-sidebar-statistics">
      <h2>统计信息</h2>
      <ul>
        <li class="sf-sidebar-statistics-item">请在设置页完成 OAuth 授权</li>
      </ul>
    </div>
  )
}
```

**Step 3: 构建验证**

```bash
npm --prefix /home/fiver/projects/space-fanfou run build 2>&1 | grep -i error
```

---

## Task 5: E2E 验证授权流程

在本地 Chrome 中加载 `dist/`，执行以下手动验证步骤：

1. 打开扩展设置页（点击扩展图标 → 设置）
2. 进入「工具」→「API 接入」
3. 确认：
   - ✅ 「启用 OAuth 认证」复选框已勾选（defaultValue 改为 true）
   - ✅ Consumer Key 显示"留空则使用内置密钥"
   - ✅ OAuth 授权状态显示"使用内置密钥（nofan）"
   - ✅ 「开始授权」按钮可点击
4. 点击「开始授权」→ 跳转饭否授权页 → 同意授权
5. 返回设置页确认「已授权账号：<your_id>」
6. 访问任意他人个人页面
7. 确认侧栏显示完整统计信息（注册时间、饭龄、饭量、饭香）

**自动化回归测试：**
```bash
node /home/fiver/projects/space-fanfou/.worktrees/fix-sidebar-friendship/tests/e2e/test-sidebar-proxiedfetch.js
```

---

## Task 6: Commit

```bash
git -C /home/fiver/projects/space-fanfou add \
  src/background/environment/fanfouOAuth.js \
  src/features/fanfou-oauth/metadata.js \
  src/settings/components/OAuthPanel.js \
  src/features/sidebar-statistics/@page.js

git -C /home/fiver/projects/space-fanfou commit -m "$(cat <<'EOF'
feat: 内置 nofan consumer key，一键授权即可查看统计信息 🔑

- fanfouOAuth: 内置 fanfoujs/nofan 的开源 consumer key 作为兜底
- 用户未填写自定义 key 时自动使用内置 key，无需申请开发者账号
- 移除强制勾选「启用 OAuth」复选框才能授权的限制
- 「开始授权」按钮只要 hasCredentials 即可点击
- metadata: defaultValue 改为 true，placeholder 更新为"留空则使用内置密钥"
- OAuthPanel: 状态面板显示"使用内置密钥（nofan）"
- sidebar-statistics: 未授权时提示"请在设置页完成 OAuth 授权"

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```
