# Space Fanfou OAuth 修复状态报告 (交给 Claude)

你好 Claude，我是 Gemini。在处理 Space Fanfou (MV3 迁移) 的 OAuth 这个远古系统集成时，我遇到了一些极其诡异的环境相关 Bug。我已经修复了前两个致命的协议层拦截问题，但现在走通全流程后依然存在数据无法正确获取的问题，需要你接力或进行联合审查。

## 📍 我们目前的目标与背景
我们在为扩展接入 OAuth 1.0a 认证功能。因为饭否官方在 2020 年关闭了未授权 API，我们硬编码了开源项目 `nofan` (CLI 应用) 的 Consumer Key / Secret，通过 `chrome.identity.launchWebAuthFlow` 让用户去 `fanfou.com/oauth/authorize` 授权，以获取 `access_token` 代替已死掉的 JSONP 抓取。

## ✅ 我已经查明并彻底修复的技术难点 (你不需要再排查这些)：
1. **Request Token 网络劫持 / HSTS 导致解包失败 (已解决)**：
   饭否极老的 OAuth 后台强制验证签名时的 `url` 必须是 `http://fanfou.com/oauth/request_token`。如果写 `https://` 返回 401 Invalid Signature。
   但国内网络环境发起的 `http://` 往往被代理软件或 ISP 挟持转成空响应。**我已经对 `fanfouOAuth.js` 中的 `signedRequest` 执行了“签名 URL 欺骗”**：签名时使用 `http`，但真实的 `fetch(url)` 发送的是 `https`，成功拿到了 request_token。
2. **Nofan 的 OOB 属性导致缺少 verifier (已解决)**：
   由于 `nofan` 是终端 CLI 应用，用户同意授权后，饭否的重定向回调**不会附带 `oauth_verifier`**（正常 Web 应用才有）。
   **我已经修改代码忽略了对 `verifier` 的严格校验**，直接使用 `oauth_token` 即可成功换取持久的 Access Token！
3. **带 Cookie 强行申请 Request Token 导致 401 (已解决)**：
   用户的第一次最新反馈：“*fanfou.com已登录状态下，开始授权直接失败*”。
   **我已经修复**：刚才我确认为 Chrome extension Service Worker 的 cross-origin fetch 自动带上了用户的 `.fanfou.com` 登录 Cookie，导致原本应该是服务级端点的 `request_token` 崩溃。在 `fetchOptions` 里加入 `credentials: 'omit'` 已经修复了已登录下报错的问题。

## 🆘 剩余未解决的痛点 (需要你审查并协助解决)

用户反馈：
> “不勾选 [记住我的登录状态] 则可以下一步（完成授权）**但是无法正确显示互相关注关系和其他用户的注册时间**。”

**当前现象**：
如果用户在弹出的那个只有账号密码的小授权框里登录，并且**不勾选**记住我 -> 授权能成功跑完 -> `exchangeAccessToken` 成功拿到了合法的 `access_token` 和 `access_token_secret` 并存入了 Storage。
但是！紧接着去他人主页触发 `check-friendship`（或者侧边栏加载注册时间发送 `FANFOU_OAUTH_API_REQUEST`）时，**依然失败或返回空值/被拒绝**。

**我对这个终极 Bug 的猜想，请协助验证**：
1. **API 权限隐式丢失**：难道因为 `nofan` 是古老的客户端 Key，不勾选“记住我”会导致它派发出来的 `access_token` 虽然名义上存在，但在具体的 `/users/show.json` 请求中没有真实的读写权限？
2. **OAuth 请求拼接错误**：在 `fanfouOAuth.js` 的 `handleApiRequest` 中，我们在拿着最终的 Token 发起实际的数据请求时，是不是 HTTP 动词或参数没有被正确签名？或者 URL 需要从 `http://api.fanfou.com` 变成 `https://api.fanfou.com` 但签名器因为历史原因拦截了？
3. **扩展内的逻辑错误**：其实 Token 是完美的，但是在 `src/features/check-friendship/@page.js` 或是 `sidebar-statistics` 的接收方逻辑里，拿到 `responseJSON` 后由于某种字段的不匹配，直接把它抛弃了？

我已经重新执行了 `npm run build`，用户的 `dist` 里包含了我 `credentials: omit` 的修复。请你审查 `handleApiRequest` 和 API 使用端的代码，帮我找出最后这个 "Token 已全流程拿到，但数据调不通" 的原因。辛苦了！
