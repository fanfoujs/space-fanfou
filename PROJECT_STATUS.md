# 太空饭否 Manifest V3 适配项目状态

> 最后更新：2025-11-06

## 🎯 当前状态

### ✅ 已完成
- **Service Worker 适配**：将 background page 迁移到 Service Worker
- **DOM API 移除**：移除所有 Service Worker 中的 DOM 操作
- **音频播放修复**：使用 Offscreen Document 播放通知音效
- **生命周期兼容**：修复 Preact 10 的 `componentWillMount` 弃用问题
- **消息传递修复**：修复 bridge.js 的 `resolve undefined` 无限错误
- **统计信息功能**：完全重写 sidebar-statistics 数据提取逻辑
  - 找到真实数据位置：`#info` 区域（非之前的 `#stream-nav`）
  - 实现三层回退机制：`#info` → `.stabs` → `body.innerText`
  - 统计面板正常显示：消息数/关注数/粉丝数/饭龄/饭量/饭香

### ⚠️ 待解决问题

#### 1. 间歇性崩溃（高优先级）
**症状**：
- 页面加载初期显示正常
- 约 1-2 分钟后扩展功能全部失效，页面退回原版样式
- 刷新页面后恢复正常

**调试发现**：
- 30秒内出现 1166-1332 次错误（约 39 次/秒）
- 具体错误内容未捕获到（可能不走 `console.error` 或在 Service Worker）
- 怀疑某个 feature 在疯狂重试失败操作或事件监听器死循环

**待排查方向**：
1. 检查 Service Worker 错误日志（`chrome://extensions/` → 查看错误）
2. 监控是否有定时器/轮询未正确停止
3. 检查事件监听器是否在递归触发
4. 使用 Performance Profiler 找出 CPU 占用高峰

**调试脚本**（已提供给用户）：
```js
// 全面错误监控
const monitor = {
  errors: [],
  warns: [],
  exceptions: [],
  resources: []
}

// ... 监控代码（见用户消息历史）

// 每10秒报告一次
setInterval(() => {
  console.log(`\n=== 监控报告 (${new Date().toLocaleTimeString()}) ===`)
  console.log('Errors:', monitor.errors.length)
  console.log('Warns:', monitor.warns.length)
  console.log('Exceptions:', monitor.exceptions.length)
  console.log('Resource fails:', monitor.resources.length)

  if (monitor.errors.length > 10) {
    console.log('最近的errors:', monitor.errors.slice(-5))
  }
  if (monitor.exceptions.length > 0) {
    console.log('最近的exceptions:', monitor.exceptions.slice(-3))
  }
}, 10000)
```

#### 2. Google Analytics 错误（低优先级）
**症状**：
```
POST https://www.google-analytics.com/.../collect ... net::ERR_CONNECTION_CLOSED
```

**分析**：
- 这是**饭否页面自身的统计请求**，非扩展代码导致
- 可能被广告拦截器/防火墙拦截
- **不影响扩展功能**，可忽略

## 📁 关键文件变更

### 核心修复
- `src/page/environment/bridge.js:20-23` - 添加防御性检查 `if (d)`
- `src/features/sidebar-statistics/@page.js:61-144` - 重写 DOM 数据提取逻辑
- `src/background/environment/proxiedFetch.js:15` - 添加 credentials 支持
- `src/offscreen/offscreen.js` - 增强音频 URL 类型检查

### 文档
- `LIFECYCLE_FIXES.md` - 第5轮修复记录
- `SERVICE_WORKER_FIXES.md` - Service Worker 适配详情
- `RUNTIME_ERROR_FIXES.md` - 运行时错误修复
- `FINAL_FIXES.md` - 级联错误修复总结

## 🛠️ 技术细节

### 数据提取方案演变
1. **原方案（失败）**：调用 Fanfou API (`/users/show.json`)
   - 问题：需要 OAuth 1.0 签名（consumer key/secret）
   - 尝试：JSONP → fetch → proxiedFetch → 全部 401

2. **DOM提取方案（成功）**：
   ```javascript
   // 主提取：#info 区域链接
   info.querySelectorAll('li a').forEach(link => {
     const text = link.textContent.trim()
     // "22102 消息" / "171 他关注的人" / "459 关注他的人"
   })

   // 备用1：.stabs 标签页
   stabs.textContent.match(/消息\s*\((\d+)\)/)

   // 备用2：全文搜索
   document.body.innerText.match(/(\d+)\s*消息/)
   ```

### 构建产物
- `dist/page.js`: 674KB
- `dist/background.js`: 190KB
- `dist/content.js`: 111KB
- `dist/settings.js`: 123KB
- `dist/offscreen.js`: 5.28KB

## 🔧 开发环境

### 依赖版本
- Node.js: (未指定，需在 `package.json` 检查)
- Webpack: 生产模式
- Preact: 10.x (从生命周期修复推断)

### 构建命令
```bash
npm run build          # 生产构建
npm run cleanup        # 清理 dist 目录
```

### 测试步骤
1. 构建扩展：`npm run build`
2. Chrome 扩展管理：`chrome://extensions/`
3. 加载 `dist` 目录
4. 访问 `https://fanfou.com/{username}`
5. 检查统计信息面板

## 📝 下次继续工作指南

### 排查崩溃问题
1. **检查 Service Worker 日志**：
   - 打开 `chrome://extensions/`
   - 找到"太空饭否"，点击"错误"
   - 截图所有错误信息

2. **运行监控脚本**：
   - 打开饭否个人主页
   - F12 控制台运行监控脚本（见上文）
   - 等待崩溃发生，查看输出

3. **Performance 分析**：
   - F12 → Performance 标签
   - 开始录制
   - 等待崩溃
   - 停止录制，找出 CPU 峰值对应的代码

4. **怀疑对象**：
   - `src/features/check-saved-searches/` - 可能有轮询
   - `src/features/notifications/` - 可能有定时器
   - `src/page/environment/bridge.js` - 消息传递可能泄漏

### 可能的修复方向
1. 添加全局错误边界（Error Boundary）
2. 为所有 async 操作添加 timeout
3. 检查是否有未清理的定时器/事件监听器
4. 限流高频操作（debounce/throttle）

## 🔗 相关链接
- 原项目：https://github.com/fanfoujs/space-fanfou
- Fork：https://github.com/halmisen/space-fanfou
- 工作分支：`claude/overview-summary-011CUpgc1VfVq74UpWgYirBe`

## 📊 进度总结
- **完成度**：约 85%
- **核心功能**：✅ 正常运行
- **稳定性**：⚠️ 存在间歇性崩溃
- **优先级**：修复崩溃问题 > 性能优化 > 新功能

---

**备注**：所有修改已提交并推送到 `claude/overview-summary-011CUpgc1VfVq74UpWgYirBe` 分支，回家后直接 `git pull` 即可同步。
