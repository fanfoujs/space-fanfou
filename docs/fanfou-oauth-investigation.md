# 饭否OAuth认证实现调查报告

## 执行摘要

本报告调查了如何为太空饭否Chrome扩展实现OAuth认证，以便通过API获取用户真实注册时间，而非使用默认值2010-01-01。

**关键发现：**
- 项目已尝试调用饭否API但失败（因缺少OAuth签名）
- 项目已有基础设施（proxiedFetch）可支持OAuth实现
- 饭否API需要OAuth 1.0认证（HMAC-SHA1签名）
- 存在更简单的替代方案

---

## 1. 项目现状分析

### 1.1 已有OAuth相关代码

**位置：** `src/features/sidebar-statistics/@page.js` (133-180行)

**当前实现：**
```javascript
const apiUrl = `http://api.fanfou.com/users/show.json`
const query = { id: userId, mode: 'lite' }

const { error: ajaxError, responseText: jsonText } = await proxiedFetch.get({
  url: apiUrl,
  query,
})
```

**问题：**
- 调用API但**未提供OAuth签名**
- 导致请求失败，返回401 Unauthorized
- 当前回退到DOM解析方案（从页面提取注册日期）

### 1.2 API调用基础设施

**文件：** `src/background/environment/proxiedFetch.js`

**优势：**
- 已实现跨域请求代理（Background Script → Content Script）
- 自动携带Cookie（`credentials: 'include'`）
- 支持GET/POST请求
- 支持query参数

**可扩展性：** ✅ 可轻松添加OAuth签名逻辑

### 1.3 manifest.json 权限

```json
"host_permissions": [
  "http://api.fanfou.com/", 
  "https://api.fanfou.com/"
]
```

✅ 已有API访问权限，无需修改manifest

---

## 2. 饭否API OAuth要求

### 2.1 认证机制

**API端点：** `http://api.fanfou.com/users/show.json`

**官方文档：** [FanfouAPI/FanFouAPIDoc/wiki/users.show](https://github.com/FanfouAPI/FanFouAPIDoc/wiki/users.show)

**认证要求：**
- ✅ OAuth 1.0（HMAC-SHA1签名）
- ✅ XAuth（简化版OAuth）
- ⚠️ Basic Auth（已弃用）

**关键字段：**
```json
{
  "created_at": "Sat Jun 09 23:56:33 +0000 2007",
  "id": "halmisen",
  "screen_name": "halmisen"
}
```

### 2.2 OAuth 1.0 流程

**步骤：**
1. **获取Request Token** - `GET /oauth/request_token`
2. **用户授权** - 重定向到 `/oauth/authorize`
3. **获取Access Token** - `POST /oauth/access_token`
4. **调用API** - 携带OAuth签名

**必需参数：**
- `oauth_consumer_key` - 应用密钥
- `oauth_signature_method` - HMAC-SHA1
- `oauth_signature` - 计算的签名
- `oauth_timestamp` - 当前时间戳
- `oauth_nonce` - 随机字符串

### 2.3 Consumer Key/Secret 获取

**申请流程：**
1. 在v2ex论坛发帖申请：http://www.v2ex.com/go/fanfou
2. 提供应用信息：
   - 应用名称
   - 应用描述  
   - 回调URL（Chrome扩展可用`chrome-extension://...`）
3. 审核通过后在 http://fanfou.com/apps 查看凭证

**安全性：**
- Consumer Secret **不应硬编码在扩展中**（代码公开）
- 需要服务器端代理或用户自行配置

---

## 3. 技术实现方案

### 方案A：完整OAuth 1.0认证（推荐，但复杂）

**技术栈：**
- `oauth-1.0a` (npm) - OAuth签名生成
- `crypto-js` - HMAC-SHA1哈希
- Chrome Extension Messaging API

**实现步骤：**

**步骤1：添加依赖**
```bash
npm install oauth-1.0a crypto-js
```

**步骤2：创建OAuth模块** (`src/background/modules/fanfouOAuth.js`)
```javascript
import OAuth from 'oauth-1.0a'
import CryptoJS from 'crypto-js'

const oauth = OAuth({
  consumer: {
    key: 'YOUR_CONSUMER_KEY',    // ⚠️ 需要申请
    secret: 'YOUR_CONSUMER_SECRET' // ⚠️ 安全问题
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64)
  }
})

// OAuth流程实现...
```

**步骤3：用户授权流程**
- 使用`chrome.identity.launchWebAuthFlow()`弹出授权窗口
- 用户在饭否页面登录并授权
- 获取`oauth_token`和`oauth_verifier`
- 交换Access Token并存储在`chrome.storage.local`

**步骤4：API调用**
```javascript
async function getUserInfo(userId) {
  const request_data = {
    url: 'http://api.fanfou.com/users/show.json',
    method: 'GET',
    data: { id: userId, mode: 'lite' }
  }
  
  const token = await getStoredAccessToken()
  const headers = oauth.toHeader(oauth.authorize(request_data, token))
  
  const response = await fetch(request_data.url + '?' + new URLSearchParams(request_data.data), {
    headers
  })
  
  return response.json()
}
```

**优点：**
- ✅ 官方推荐方式
- ✅ 安全可靠
- ✅ 长期有效（Access Token可持久化）

**缺点：**
- ❌ 需要申请Consumer Key/Secret（审核时间未知）
- ❌ Consumer Secret硬编码不安全（代码开源）
- ❌ 实现复杂（约300-500行代码）
- ❌ 用户首次使用需授权（弹窗体验）

---

### 方案B：XAuth认证（简化，但需凭证）

**技术栈：**
- `oauth-1.0a` (npm)
- 用户名+密码直接换Token

**流程：**
```javascript
POST /oauth/access_token
参数:
  x_auth_username=用户名
  x_auth_password=密码  
  x_auth_mode=client_auth
  + OAuth签名参数
```

**优点：**
- ✅ 无需浏览器重定向
- ✅ 一步获取Access Token

**缺点：**
- ❌ 仍需Consumer Key/Secret
- ❌ 需要用户输入饭否密码（安全风险）
- ❌ 饭否可能限制XAuth使用

---

### 方案C：利用现有Cookie（推荐，简单）

**核心思路：**
用户已在浏览器登录饭否，扩展可利用现有Cookie调用Web API（非OAuth API）。

**可用API端点：**
1. **移动版API**（无需OAuth）
   - `https://m.fanfou.com/`相关接口
   - 依赖Cookie认证
   
2. **网页接口**
   - 直接解析HTML（当前方案）
   - 已在`sidebar-statistics/@page.js`实现

**实现示例：**
```javascript
// 尝试调用移动版API（可能绕过OAuth）
const response = await proxiedFetch.get({
  url: 'https://m.fanfou.com/api/user/show.json', // 假设的端点
  query: { id: userId }
})
```

**调查行动：**
需要逆向工程饭否移动版/桌面版，找到：
- 是否有Cookie认证的JSON API
- API返回格式
- 是否包含`created_at`字段

**优点：**
- ✅ 无需OAuth申请
- ✅ 用户无感知（已登录）
- ✅ 实现简单（10-20行代码）
- ✅ 安全（无需存储凭证）

**缺点：**
- ⚠️ 非官方API（可能随时变化）
- ⚠️ 需要用户保持登录状态
- ⚠️ 移动版API端点需要调查确认

---

### 方案D：代理服务器（企业级，但过度）

**架构：**
```
Chrome扩展 → 你的服务器 → 饭否API
          (带OAuth签名)
```

**服务器职责：**
- 存储Consumer Secret（安全）
- 代理OAuth流程
- 签名请求

**优点：**
- ✅ Consumer Secret安全
- ✅ 集中管理认证

**缺点：**
- ❌ 需要维护服务器（成本+运维）
- ❌ 增加延迟
- ❌ 对个人项目过度

---

## 4. Chrome扩展OAuth最佳实践

### 4.1 chrome.identity API

**官方文档：** [Chrome Extensions OAuth](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)

**适用场景：**
- Google OAuth（内置支持）
- 任何OAuth 2.0 provider（`launchWebAuthFlow`）
- **饭否使用OAuth 1.0**，需要自行实现签名

**manifest配置：**
```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "...",
    "scopes": ["..."]
  }
}
```

⚠️ 饭否不支持OAuth 2.0标准流程，需手动实现OAuth 1.0

### 4.2 最佳安全实践

1. **不要硬编码Secret**
   - 使用服务器代理
   - 或让用户自行配置（在设置页面输入）

2. **Token存储**
   - 使用`chrome.storage.local`（不同步）
   - 或`chrome.storage.sync`（跨设备同步）

3. **HTTPS Only**
   - 饭否API应使用`https://api.fanfou.com`
   - 避免中间人攻击

---

## 5. 推荐实现方案（优先级排序）

### 🥇 方案1：Cookie + Web API（最快实现）

**步骤：**
1. 调查饭否移动版/桌面版是否有Cookie认证的JSON API
2. 使用`proxiedFetch`调用（已配置`credentials: 'include'`）
3. 解析返回的`created_at`

**时间估算：** 2-4小时（调查+实现）

**代码位置：** `src/features/sidebar-statistics/@page.js`

**示例代码：**
```javascript
// 在第134行附近修改
try {
  // 方案1：尝试m.fanfou.com API（可能存在）
  const mobileApiUrl = `https://m.fanfou.com/...` // 待调查
  let { error, responseText } = await proxiedFetch.get({
    url: mobileApiUrl,
    query: { id: userId }
  })
  
  if (!error && responseText) {
    const userData = JSON.parse(responseText)
    if (userData.created_at) {
      userProfile.created_at = formatDate(userData.created_at)
      return userProfile
    }
  }
} catch (err) {
  console.warn('Cookie API失败，回退到DOM解析', err)
}

// 回退：当前的DOM解析逻辑
```

---

### 🥈 方案2：用户配置OAuth（无需申请）

**步骤：**
1. 在设置页面添加OAuth配置选项
2. 用户自行申请饭否应用并填入Key/Secret
3. 扩展使用用户提供的凭证进行OAuth

**时间估算：** 8-16小时

**优点：**
- 无需等待饭否审核
- 用户完全控制
- 官方API支持

**缺点：**
- 大部分用户不会配置（门槛高）

---

### 🥉 方案3：申请官方OAuth（标准但慢）

**步骤：**
1. 在v2ex发帖申请饭否应用
2. 等待审核（时间未知）
3. 实现完整OAuth 1.0流程
4. 使用服务器代理保护Secret（可选）

**时间估算：** 审核时间未知 + 16-24小时开发

**适用场景：**
- 长期维护项目
- 需要其他API功能

---

### ❌ 不推荐方案

1. **XAuth** - 需要用户密码，安全风险高
2. **Basic Auth** - 已弃用
3. **代理服务器** - 对个人项目过度

---

## 6. 立即行动计划

### Phase 1: 调查（1-2小时）

**任务：**
1. 使用Chrome DevTools抓包饭否移动版
   - 访问 `https://m.fanfou.com/halmisen`
   - 查看Network请求
   - 寻找返回JSON的API
   - 检查是否包含`created_at`

2. 测试Cookie认证
   ```bash
   curl -H "Cookie: YOUR_FANFOU_COOKIE" \
        "https://m.fanfou.com/api/..."
   ```

3. 记录发现的API端点和响应格式

**交付物：**
- API端点列表
- 响应示例JSON
- 是否可行的结论

---

### Phase 2: 实现（2-4小时）

**如果发现可用API：**
```javascript
// src/features/sidebar-statistics/@page.js

async fetchUserProfileData() {
  // 3.1 优先尝试Cookie API
  if (proxiedFetch) {
    try {
      const userId = await getCurrentPageOwnerUserId()
      
      // 尝试移动版API
      const { error, responseText } = await proxiedFetch.get({
        url: 'https://m.fanfou.com/api/users/show.json', // 示例
        query: { id: userId }
      })
      
      if (!error && responseText) {
        const userData = JSON.parse(responseText)
        if (userData.created_at) {
          userProfile.created_at = formatCreatedAt(userData.created_at)
          console.log('[SpaceFanfou] 从Cookie API获取注册日期:', userProfile.created_at)
        }
      }
    } catch (err) {
      console.warn('[SpaceFanfou] Cookie API失败，回退到DOM:', err)
    }
  }
  
  // 3.2 回退到原有DOM解析
  if (!userProfile.created_at) {
    // ... 现有代码 ...
  }
}
```

**测试：**
1. 在饭否登录状态下测试
2. 在未登录状态下测试（应回退到DOM）
3. 检查多个用户资料页

---

### Phase 3: OAuth准备（可选，长期）

**如果Cookie API不可行：**
1. 在v2ex发帖申请饭否应用
2. 等待审核期间，保持DOM解析方案
3. 获得凭证后实现OAuth

**申请帖示例：**
```
标题：申请饭否API应用 - 太空饭否Chrome扩展

内容：
你好，我是太空饭否Chrome扩展的维护者。

应用名称：太空饭否（Space Fanfou）
应用描述：饭否浏览器扩展，提供浮动输入框、通知、统计信息等增强功能
GitHub：https://github.com/fanfoujs/space-fanfou
Chrome商店：[链接]
回调URL：chrome-extension://[extension-id]/oauth-callback.html

用途：获取用户注册时间（created_at），显示准确的"饭龄"统计

谢谢！
```

---

## 7. 技术依赖

### 方案1（Cookie API）所需依赖
- ✅ 无新增依赖（使用现有`proxiedFetch`）

### 方案3（OAuth）所需依赖
```json
{
  "dependencies": {
    "oauth-1.0a": "^2.2.6",
    "crypto-js": "^4.1.1"
  }
}
```

**安装：**
```bash
npm install oauth-1.0a crypto-js
```

---

## 8. 风险评估

| 方案 | 技术风险 | 安全风险 | 维护成本 | 用户体验 |
|------|----------|----------|----------|----------|
| Cookie API | 🟡 中（API可能变化） | 🟢 低 | 🟢 低 | 🟢 无感知 |
| 用户配置OAuth | 🟢 低 | 🟢 低 | 🟢 低 | 🔴 高门槛 |
| 官方OAuth | 🟢 低 | 🟡 中（Secret暴露） | 🟡 中 | 🟡 需授权 |
| 代理服务器 | 🟢 低 | 🟢 低 | 🔴 高（运维） | 🟢 无感知 |

---

## 9. 结论与建议

### 立即执行（本周）
1. **调查饭否Cookie API**（最高优先级）
   - 抓包移动版/桌面版
   - 测试是否可用
   - 如可用，2小时即可实现

2. **准备OAuth申请**（备用）
   - 在v2ex发帖申请
   - 等待审核期间使用DOM解析

### 中期规划（1-2个月）
- 如Cookie API稳定，保持此方案
- 如不稳定或失效，切换到OAuth

### 长期维护
- 定期检查API变化
- 收集用户反馈
- 考虑添加多种备用方案

---

## 10. 附录

### A. 现有代码位置
- OAuth调用尝试：`src/features/sidebar-statistics/@page.js:133-180`
- 跨域代理：`src/background/environment/proxiedFetch.js`
- 权限配置：`static/manifest.json:30`

### B. 参考链接
- [饭否OAuth文档](https://github.com/FanfouAPI/FanFouAPIDoc/wiki/Oauth)
- [users.show API](https://github.com/FanfouAPI/FanFouAPIDoc/wiki/users.show)
- [Chrome Extensions OAuth](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)
- [oauth-1.0a库](https://github.com/ddo/oauth-1.0a)
- [v2ex饭否论坛](http://www.v2ex.com/go/fanfou)

### C. 代码示例仓库
- [crimx/ext-weitweet](https://github.com/crimx/ext-weitweet) - 饭否Chrome扩展
- [akgnah/fanfou-py](https://github.com/akgnah/fanfou-py) - Python OAuth库

---

**报告生成时间：** 2025-11-12  
**调查人员：** Claude (Anthropic AI)  
**项目：** 太空饭否 (Space Fanfou) Manifest V3  
**目标：** 实现OAuth认证获取用户真实注册时间
