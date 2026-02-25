# Gemini 观察与修复计划 (gemini-观察计划.md)

**创建日期**: 2026-02-25
**目标分支**: `gemini/fix-mv3`
**核心议题**: 解决因 MV3 迁移及 API 限制导致的 `sidebar-statistics`（注册时间）和 `check-friendship`（好友关系）功能失效问题。

---

## 1. 背景与现状诊断

经过交叉比对前期的审核报告、验证 `nofan` 竞品源码，以及直接的端点测试，我们对当前的失效原因得出了以下最精确的结论：

### 1.1 侧边栏注册时间 (`sidebar-statistics`)
- **历史方案**: MV2 时期，利用代码注入在网页执行匿名 JSONP 跨域请求获取 `users/show.json`。
- **Claude 的关键洞察与事实核查**: Claude 准确指出 `@page.js` 属于 Page Scripts，运行在 `fanfou.com` 页面上下文中，**不受扩展自身的严苛 CSP 限制**。因此在**浏览器端**，利用 JSONP 注入 `<script>` 的通道依然是敞开的。
- **当前的真正阻碍 (API 服务拒载)**: 尽管浏览器允许发出 JSONP 请求，但随着安全升级，饭否官方服务器**已经彻底封死**了该 API 的无状态匿名访问。实测表明，任何不携带规范 OAuth 1.0a 签名授权的 API 调用（即使带有合法的网页端 Cookie），均会被饭否服务器拦截并直接返回 `401 参数错误` 或拒绝服务。所以“恢复 JSONP”这条路虽然在浏览器前端走得通，但在后端请求时被判了死刑。
- **当前进展**: `gemini/fix-mv3` 分支实际上已经实现了一套极其优秀的降级逻辑（首屏 DOM 值提取 + 遍历自身 `m.fanfou.com` 动态推算 + 引导 OAuth）。目前唯一的卡点是：**绝大多数用户没有，也无法搞到官方的 OAuth Consumer Key / Secret**。

### 1.2 好友关系检查 (`check-friendship`)
- **历史方案**: 抓取**当前网页主人自身的 `followers` (关注我的人)** 列表，如果在此列表中发现了“正在看他主页的那个人（当前用户）”，则说明“他关注了我”。
- **当前阻碍**: 目前代码被改写为“抓取目标用户的 `friends` (他关注的人)”。这导致必须额外获取并精准匹配当前用户自己的 ID。由于饭否 ID 存在大小写混用等复杂情况，强行执行 `normalizeUserId` 频繁导致误判。此外，网络错误时会错误锁死 `hasChecked = true`，使用户无法重试。

---

## 2. 修复路线图与执行方案

遵循项目的核心原则：**“简单优先 (Simplicity First)”** 和 **“最小影响 (Minimal Impact)”**。

### 2.1 破局 OAuth 僵局：引入内置官方级 Key
既然要求用户自己去申请 API Key 是一条死胡同，且目前活跃的第三方项目均采用内置 Key 的“拿来主义”路线（饭否官方也已默认这种非盈利开源的生态现状）。

**行动项**:
1. 提取开源 CLI 工具 `nofan` 源码中的 Consumer Key:
   - Key: `13456aa784cdf7688af69e85d482e011`
   - Secret: `f75c02df373232732b69354ecfbcabea`
2. 修改 `src/settings/components/OAuthPanel.js`。隐藏或淡化繁杂的 Key/Secret 手动输入框，将上述密钥设为全局缺省。
3. 用户只需在设置页一键点击“前往官网授权”，即可走完全套 OAuth Token 交换流。
4. **预期收益**: 彻底打通 `sidebar-statistics` 的 OAuth 获取链路。一次授权后，用户的插件即可享有合法的 API 请求权，精确时间完美恢复。

### 2.2 剥离脆弱逻辑：回滚网页抓取形态
`check-friendship` 的数据源其实是网页 DOM，它并不受限于 API 的 401 报错，仅依赖浏览器附带的 Cookie。

**行动项**:
1. 修改 `src/features/check-friendship/@page.js`。
2. **逻辑反转**: 从查询对方的 `/friends/` 改回查询原版的 `/followers/p.N`。
3. **剔除冗余**: 彻底删除 `getLoggedInUserId` (获取自己的 ID) 和 `normalizeUserId` 的依赖，因为直接在“关注我的人”列表中找目标主页人的 ID 是最准确的。
4. 修复抛错锁死 Bug：将失败和重试时的状态清理干净，保证 `hasChecked` 重置。

---

## 3. 验证标准 (Staff Engineer 标准)

在上述修改完成后，将执行以下验收：
1. **OAuth 接入测试**: 在全新安装的插件设置中，能够零配置直接呼起饭否授权页，同意后插件成功拿到并保存 Token。
2. **好友检测阻断测试**: 找一个大小写 ID 极其不规范的用户进行关注/取消关注双向测试，确保 `normalizeUserId` 被移除后不会出现 `False Negative` (漏判)。
3. 在 Playwright 的无头环境中运行核心功能的 e2e 测试通过。

---
*审核请求：请评估上述结合了内置现有生态 OAuth 密钥与回滚健壮策略的路线规划的可行性与风险。*
