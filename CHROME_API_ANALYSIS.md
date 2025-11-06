## Chrome API 使用检查报告

### 评分：72/100

---

## API 使用统计

| API | 使用次数 | 状态 | 说明 |
|-----|---------|------|------|
| chrome.storage.sync | 6 | ✅ | 使用 promisifyChromeApi 包装，支持 Promise |
| chrome.storage.local | 4 | ✅ | 使用 promisifyChromeApi 包装，支持 Promise |
| chrome.tabs.create | 4 | ⚠️ | 部分使用回调，部分无错误处理 |
| chrome.runtime.onConnect | 2 | ✅ | 正确注册，消息处理完整 |
| chrome.runtime.getURL | 2 | ✅ | 简单调用，无需错误处理 |
| chrome.tabs.onUpdated | 2 | ⚠️ | 使用已废弃的 tab.selected 属性 |
| chrome.tabs.onActivated | 2 | ✅ | 正确使用，监听器管理正确 |
| chrome.windows.create | 2 | ✅ | 正确使用，无错误处理但可接受 |
| chrome.offscreen.createDocument | 1 | ✅ | 正确使用，带错误处理 |
| chrome.notifications.* | 4 | ✅ | 创建、清除、事件监听都正确 |
| chrome.contextMenus.* | 2 | ✅ | 创建、移除都正确 |
| chrome.tabs.query | 1 | ⚠️ | 使用回调模式，未转换为 Promise |
| chrome.tabs.update | 1 | ⚠️ | 回调中未进行错误处理 |
| chrome.tabs.reload | 1 | ⚠️ | 回调中未进行错误处理 |
| chrome.tabs.get | 1 | ⚠️ | 使用回调模式，回调中有赋值语句 |
| chrome.windows.update | 1 | ⚠️ | 回调中未进行错误处理 |
| chrome.runtime.sendMessage | 1 | ✅ | 正确使用 await，有错误处理 |
| chrome.runtime.getContexts | 1 | ✅ | 正确使用 await |
| chrome.runtime.onMessage | 1 | ✅ | 正确使用，有错误处理 |
| chrome.pageAction.show | 1 | ❌ | **已废弃 API** |

---

## 废弃 API 检查

❌ 发现 2 处废弃/不当 API 使用：

1. **文件**: `src/features/notifications/service@background.js:214`
   - **问题**: `tab.selected` 属性
   - **状态**: ❌ 已废弃（应使用 `tab.active`）
   - **说明**: `tab.selected` 在 Manifest V3 中已移除，应改用 `tab.active`
   - **修复方案**: 
     ```javascript
     // 当前（错误）
     if (tab.selected && (isVisitingFanfou = isFanfouUrl(tab.url)))
     
     // 应改为
     if (tab.active && (isVisitingFanfou = isFanfouUrl(tab.url)))
     ```

2. **文件**: `src/background/environment/settings.js:258`
   - **问题**: `chrome.pageAction.show(tab.id)`
   - **状态**: ❌ 已废弃（Manifest V3 中移除）
   - **说明**: `pageAction` API 在 Manifest V3 中已完全移除，应改用 `action` API
   - **修复方案**: 
     ```javascript
     // 当前（错误）
     chrome.pageAction.show(tab.id)
     
     // 应改为（如果需要）
     // chrome.action.setVisible(tab.id, true)
     // 或移除此调用，使用 default_action 在 manifest.json 中配置
     ```

---

## 使用问题详情

⚠️ 发现 6 处使用模式问题：

### 1. 混合回调和 Promise 模式
**文件**: `src/features/notifications/service@background.js:151-161`
**严重度**: 中等
**问题描述**:
- `chrome.tabs.query()` 使用回调模式，但后续调用 `chrome.tabs.update()`、`chrome.windows.update()` 和 `chrome.tabs.reload()` 都没有检查错误
- 回调中没有 try-catch 保护

```javascript
// 当前代码（有问题）
chrome.tabs.query({ url }, matchedTabs => {
  if (reuseExistingTabs && matchedTabs.length) {
    const { id, windowId } = matchedTabs[0]
    chrome.tabs.update(id, { active: true })           // 无错误处理
    chrome.windows.update(windowId, { focused: true }) // 无错误处理
    chrome.tabs.reload(id)                             // 无错误处理
  } else {
    chrome.tabs.create({ url, active: true })          // 无错误处理
  }
})
```

**改进方案**: 使用 promisifyChromeApi 转换为 Promise，或添加错误回调

### 2. chrome.tabs.get 回调中的副作用赋值
**文件**: `src/features/notifications/service@background.js:206-210`
**严重度**: 低
**问题描述**:
```javascript
chrome.tabs.get(activeInfo.tabId, tab => {
  if (isVisitingFanfou = isFanfouUrl(tab.url)) {  // 赋值在条件判断中
    hideRelativeNotificationIfMatched(tab.url)
  }
})
```

**改进建议**: 虽然在 Service Worker 中无法使用 DOM API，但应考虑是否需要转换为 Promise 模式

### 3. chrome.runtime.getBackgroundPage 已废弃
**文件**: `src/settings/components/App.js:47-48`
**严重度**: 高
**问题描述**:
```javascript
// 虽然这是在 Content Script 中，但 getBackgroundPage 仍有兼容性问题
chrome.runtime.getBackgroundPage(resolve)
```

**说明**: `chrome.runtime.getBackgroundPage` 在 Manifest V3 中仅对非持久化 background page 有限制，但已不推荐使用

### 4. chrome.storage API 错误处理缺失
**文件**: `src/settings/components/App.js:60`
**严重度**: 低
**问题描述**:
```javascript
chrome.storage.sync.get(LAST_TAB_ID_STORAGE_KEY, values => {
  // 无错误处理
})
```

**改进建议**: 应使用 promisifyChromeApi 统一处理

### 5. 消息处理中缺少 errorCallback
**文件**: `src/features/notifications/service@background.js:151`
**严重度**: 中等
**问题描述**: `chrome.tabs.query()` 调用没有提供错误回调，如果查询失败会导致回调不被调用

### 6. offscreen 文档创建可能异常
**文件**: `src/background/environment/proxiedAudio.js:27-31`
**严重度**: 低
**问题描述**: 虽然有 try-catch，但 `ensureOffscreenDocument()` 本身在错误时可能处于不确定状态
```javascript
// 即使创建失败也标记为已创建
offscreenDocumentCreated = true  // 应在成功后再设置
```

---

## 最佳实践评价

### ✅ Promise 使用：7/10
- 优点：
  - 存储 API 使用 `promisifyChromeApi` 统一包装，很好
  - `chrome.offscreen.createDocument()` 正确使用 await
  - `chrome.runtime.sendMessage()` 正确使用 await
  
- 不足：
  - `chrome.tabs` API 仍使用回调模式
  - 没有全面转换所有 Chrome API 为 Promise

### ⚠️ 错误处理：5/10
- 优点：
  - `proxiedAudio.js` 中有 try-catch 保护
  - offscreen 文档中有 .catch() 处理
  - 存储 API 通过 promisifyChromeApi 获得统一的错误处理
  
- 不足：
  - `chrome.tabs.query()` 无错误回调
  - `chrome.tabs.update()` / `reload()` 无错误处理
  - `chrome.storage.sync.get()` 在 App.js 中无错误处理
  - 大多数回调模式 API 没有错误处理

### ✅ 异步模式：8/10
- 优点：
  - `fetchFanfouMobileDOM()` 正确使用 async/await
  - 消息处理中正确使用 await
  - offscreen 文档正确返回 Promise
  
- 不足：
  - 混合使用回调和 Promise，增加复杂性

---

## 改进建议

### 优先级 1（必须修复）
1. **替换 tab.selected → tab.active**
   - 文件: `src/features/notifications/service@background.js:214`
   - 影响: Manifest V3 兼容性
   - 工作量: 5 分钟

2. **移除/替换 chrome.pageAction.show()**
   - 文件: `src/background/environment/settings.js:258`
   - 选项1: 删除此行（如果不需要该功能）
   - 选项2: 改用 `chrome.action` 替代方案
   - 工作量: 10 分钟

### 优先级 2（强烈建议）
3. **为 chrome.tabs.query() 添加 promisify 转换**
   ```javascript
   // 创建辅助函数
   const queryTabs = promisifyChromeApi(::chrome.tabs.query)
   
   // 改写 notifications/service@background.js
   try {
     const matchedTabs = await queryTabs({ url })
     if (reuseExistingTabs && matchedTabs.length) {
       const { id, windowId } = matchedTabs[0]
       await promisifyChromeApi(::chrome.tabs.update)(id, { active: true })
       await promisifyChromeApi(::chrome.windows.update)(windowId, { focused: true })
       await promisifyChromeApi(::chrome.tabs.reload)(id)
     } else {
       await promisifyChromeApi(::chrome.tabs.create)({ url, active: true })
     }
   } catch (error) {
     log.error('Failed to handle tab operations:', error)
   }
   ```
   - 工作量: 30 分钟

4. **规范化 chrome.storage API 使用**
   - 在 `src/settings/components/App.js:60` 改用已包装的 Promise API
   - 工作量: 10 分钟

### 优先级 3（建议）
5. **改进 offscreen 文档创建的容错性**
   ```javascript
   async function ensureOffscreenDocument() {
     if (offscreenDocumentCreated) return
     
     try {
       const existingContexts = await chrome.runtime.getContexts({
         contextTypes: ['OFFSCREEN_DOCUMENT'],
       })
       
       if (existingContexts.length > 0) {
         offscreenDocumentCreated = true
         return
       }
       
       await chrome.offscreen.createDocument({
         url: 'offscreen.html',
         reasons: ['AUDIO_PLAYBACK'],
         justification: 'Play notification sounds',
       })
       
       offscreenDocumentCreated = true  // 成功后再标记
     } catch (error) {
       log.error('Failed to create offscreen document:', error)
       offscreenDocumentCreated = false  // 失败时不标记
       throw error
     }
   }
   ```
   - 工作量: 10 分钟

6. **为所有 Chrome API 调用添加日志**
   - 便于调试和监控运行时错误
   - 工作量: 20 分钟

---

## 安全性检查

### ✅ 已通过检查
- 没有发现权限滥用
- 没有发现恶意数据流向
- Content Security Policy 配置正确
- 不存在 XSS 风险（Web Accessible Resources 受限）

### ⚠️ 建议加强
- 添加对 chrome.tabs.query() 结果的验证
- 添加 URL 白名单验证，避免打开非预期 URL

---

## 总结

该 Chrome 插件已升级到 Manifest V3，大体上遵循了现代最佳实践：
- 使用 Service Worker 代替背景页
- 使用 offscreen document 处理音频播放
- 使用 promisifyChromeApi 统一 Promise 处理

但仍存在以下问题需要修复：
1. **2 处已废弃 API** - tab.selected 和 chrome.pageAction
2. **混合异步模式** - 部分使用回调，部分使用 Promise
3. **错误处理不完整** - 缺少多个关键 API 的错误处理

建议按优先级进行修复，总工作量预计 1-2 小时。

---

### 关键文件清单

检查的关键文件：
- ✅ `src/background/environment/messaging.js` - 正确使用 chrome.runtime.onConnect
- ✅ `src/background/environment/storage.js` - 正确使用 promisifyChromeApi
- ✅ `src/background/environment/proxiedAudio.js` - 正确使用 chrome.offscreen
- ⚠️ `src/features/notifications/service@background.js` - 发现 tab.selected 问题
- ⚠️ `src/background/environment/settings.js` - 发现 chrome.pageAction 问题
- ✅ `src/background/modules/notification.js` - 正确使用 chrome.notifications
- ✅ `src/offscreen/offscreen.js` - 正确使用 chrome.runtime.onMessage

