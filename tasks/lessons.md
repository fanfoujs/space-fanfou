# 经验教训 (Lessons Learned)

本文件用于记录开发过程中遇到的避坑经验和错误复盘，以遵循“凡有纠正，必有记录”的原则，避免重复犯错。

## 1. OAuth API 签名基准 URL (API Spoofing)
- **踩坑点**：饭否的 `/oauth` 接口以及 `api.fanfou.com` 的数据接口虽然都支持 `https` 请求，但在进行 OAuth 1.0 签名计算 (Signature Base String) 时，**其官方后端由于年久失修，仍会强制将基准 URL 视为 `http://`**。
- **复盘与规则**：在计算签名头参数时，不仅要把 `https://fanfou.com/oauth` 替换为 `http://`，连 `https://api.fanfou.com` 也必须强制替换为 `http://api.fanfou.com`，否则就会无差别收到 `401 Invalid signature` 的暴击。

## 2. Page 级环境脚本扩展注入的宿主模块隔离 (The `page.js` Module Vacuum)
- **踩坑点**：将原有的 `check-friendship` 脚本从 HTML 抓取迁移为 API 抓取时，我顺手在顶部引入了 `const { messaging } = requireModules(['messaging'])`，企图调用后台环境的接口。
- **致命后果**：由于 `page.js` 作为“受限注入脚本”并不具备 `messaging` 的预注册上下文模块，这一个找不到模块的微小错误，不仅让 `check-friendship` 挂掉，而且阻断了预处理器 `webpack` 整个模块遍历链（`for...of Object.entries(features)`）！这导致所有其他页面级组件全部“消失”，造成灾难级的回归 Bug。
- **复盘与规则**：在 `page.js` 的注入域中，**绝对不要**随意 `require` 后台的底层接口模块如 `messaging`。必须使用项目中专门做过 IPC 穿透暴露的 `fanfouOAuth` 等对齐中间件。而且一旦看到所有组件全部失效，第一反应就是去检查有没有阻断特征装载循环的高阶未捕获异常 (Top-level Exception)!

## 3. Chrome `launchWebAuthFlow` 的曲折沙箱 (Sandboxed Sessions)
- **踩坑点**：扩展使用 WebAuthFlow 进行饭否 OAuth 授权时，获取到的 Access Token 能正常工作，但浏览器本体原本登录在主域名下的饭否 Cookie 却不会同步给扩展环境发起的普通 fetch 请求。
- **复盘与规则**：一旦转入了扩展认证流程，就**必须**完全拥弃基于 Cookie 的 DOM 爬虫刮削（Scraping），全面转向受 OAuth 显式授权保护的官方 API。混合（Cookie + OAuth Token）在沙箱里会导致幽灵行为。
