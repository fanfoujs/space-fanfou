# OAuth 集成阶段性报告

> 日期：2025-11-12  
> 作者：Codex

## 1. 背景与目标

- 目的：在 Manifest V3 版本中恢复 `users/show.json` 的注册时间能力。  
- 约束：不搭建中转服务器，所有签名逻辑在扩展本地实现。  
- 依赖：用户自备饭否应用（Consumer Key/Secret），并在扩展设置中手动配置。

## 2. 已完成工作

1. **设置面板与存储**
   - 新增 `fanfou-oauth` feature，允许在“工具 → API 接入”中启用 OAuth，并输入 Consumer Key/Secret。
   - 设置页支持文本输入、密码输入及 OAuth 状态面板，实时展示授权结果、Chrome Identity 回调地址。

2. **后台 OAuth 模块**
   - `src/background/environment/fanfouOAuth.js` 实现完整的 Request Token → Authorize → Access Token 流程。
   - 利用 `chrome.identity.launchWebAuthFlow()` 弹出授权窗口，使用 `oauth-1.0a + crypto-js` 生成 HMAC-SHA1 签名。
   - Access Token、用户名等数据持久化在 `chrome.storage.local`，并暴露 `FANFOU_OAUTH_*` 消息供 UI、页面脚本调用。

3. **统计面板 API 调用**
   - `SidebarStatistics` 优先走 OAuth API 请求，失败时回退到原来的未签名尝试和 DOM 解析。

4. **构建/权限**
   - `manifest.json` 添加 `identity` 权限。
   - 新依赖 `oauth-1.0a`、`crypto-js`，`npm run build` 产出的 `dist/` 已更新。

## 3. 当前阻塞

- **Request Token 无法成功获取**  
  设置页点击“开始授权”后，后台没有记录有效的 token，`SidebarStatistics` 日志持续提示「尚未完成授权」。  
  目前观察：
  1. Callback URL 已显示为 `https://ldmngjbcgbgblhkamaiekhpcjpolpa.chromiumapp.org/fanfou-oauth`。若饭否应用后台未同步此地址，请求会被拒绝（需确认）。  
  2. 若扩展未重新加载，Service Worker 可能仍在运行旧代码，也会导致按钮调用旧逻辑（需确保在 `chrome://extensions` 中点击“重新加载”）。  
  3. 用户反馈 Service Worker 控制台无任何 `[SpaceFanfou] OAuth` 日志，表明请求可能根本未发出——需要进一步调试按钮逻辑或收集 background 侧 console。

- **API 回退路径仍报 401/404**  
  在授权未完成前，`users/show.json` 继续返回 401，`ContextualStatuses` 在取上下文消息时也会遇到 404（网页不存在）。这是预期中的降级行为，但也意味着只有授权打通后才能恢复注册时间显示。

## 4. 建议的排查步骤

1. **确认 Callback URL**  
   在饭否应用后台「编辑」界面，把 “回调地址” 精确设置为设置页显示的地址（HTTPS + `/fanfou-oauth`），保存后等待 1-2 分钟。

2. **刷新扩展 & 清空 token**  
   - `chrome://extensions` → 打开“开发者模式” → 点击“重新加载”。  
   - 回到设置页，点击“取消授权”，再点“重新检测”，确保状态显示“未完成授权”。  
   - 再次点击“开始授权”，观察是否弹出饭否授权窗口。

3. **收集 Service Worker 日志**  
   - 在扩展详情页点击 “Service worker” → “检查视图”。  
   - 重复点击“开始授权”，将 Console 中的 `[SpaceFanfou] OAuth…` 日志（包含错误码）截图或粘贴出来。

4. **验证请求**（可选）  
   使用 Node/cURL 按当前参数发起 `http://fanfou.com/oauth/request_token`，若饭否返回 `Invalid signature` 以外的内容，可进一步定位是 key/secret 还是回调地址问题。

## 5. 后续计划

- [ ] 复现用户环境，在 Service Worker 中附加更多日志（请求参数、响应状态、`chrome.identity` 回调结果）。
- [ ] 如确认 callback 正确仍失败，考虑是否需要 HTTP 回调（饭否旧接口可能强制 http）；若是，需评估 Chrome Identity 对非 HTTPS 回调的兼容性。
- [ ] 授权流程打通后，补充单元/手动测试步骤，记录在 README 或 docs 中，方便其它维护者配置。

> 目前核心代码已就绪，剩下的问题集中在授权步骤与饭否后台配置的匹配。请按照建议步骤收集信息，以便定位 Request Token 被拒绝的具体原因。
