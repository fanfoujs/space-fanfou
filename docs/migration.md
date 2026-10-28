# WXT 与 Manifest V3 迁移

本次迁移以 `47471f9` 为功能基线，保留 31 项用户功能。按用户要求，将 2026-02-28 改为默认开启的 12 项既有设置恢复为之前的关闭状态，并移除头像壁纸小游戏的选项、逻辑与样式；其余设置键保留，已保存的用户偏好不会被默认值强制覆盖。逐项基线见 [feature-inventory.json](feature-inventory.json)。唯一移除的是旧版 Google Analytics 统计，不影响饭否功能；发布包不再加载远程统计脚本。

## 工程

- WXT 0.21、Vite 7、TypeScript 5；继续使用 Preact 和现有 Less 样式。
- 新入口、功能注册、浏览器事件分发、存储、后台 HTML 解析和音频适配采用 TypeScript。历史功能保留 JS/JSX，渐进迁移，不以 `any` 批量替换现有业务代码。
- 去掉 Webpack、`require.context`、Babel macros、`::`、`do` 表达式和实验性 re-export 写法，使用标准模块和 Vite glob。
- Vitest 继续执行原来的工具函数测试；Playwright 执行隔离的 Chrome 扩展测试。
- 三个浏览器分别生成 MV3 Manifest。Firefox 和 Safari 使用事件页面，Chrome 使用 Service Worker。

## 保留的功能

| 范围 | 功能 |
| --- | --- |
| 时间线 | 自动翻页、回复与转发上下文展开、内容增强、未读消息处理、时间更新、返回顶部 |
| 发文 | 浮动输入框、回复与转发后保留内容、草稿保存、字数提示、Ajax 发文、上传图片、拖放与粘贴图片、@ 自动补全 |
| 用户与管理 | 多用户切换、喜爱饭友、好友关系检查、统计侧栏、批量管理消息、私信和关注关系 |
| 提醒与分享 | 关注话题检查和已读标记、@/私信/关注者提醒、更新通知、右键分享 |
| 外观 | 头像墙纸、阴影、半透明侧栏、移除个性主题、应用推荐和 beta 标记、去除计数括号、高清图片和图片缩放修复 |
| 其他 | OAuth 授权、头像分享、快捷键 |

构建核对 `npm run verify:build` 会读取三个浏览器的实际 JS 包，检查每个历史功能的 metadata、每个子功能脚本与样式都被注册，并检查 Manifest、HTML 资源和禁止的动态代码执行。

## 已修复的 V3 问题

- 恢复此前被空实现替代的关注话题后台服务。使用可在 Worker 中运行的 HTML 解析器和五分钟重复 alarm，保留原有已读/未读数据格式。
- 修复通知检查在运行一次后清除自己的重复 alarm 的问题，保留跨后台重启的通知计数。
- 后台原生事件在入口同步注册，异步初始化完成后再分发，处理 Worker 冷启动。
- 消息改为 `runtime.sendMessage`；不再用长连接反复重连唤醒后台。
- Chrome 音频通过 offscreen document 播放；通知点击目标和过期任务持久化，后台重启后仍可处理。
- 旧扩展 `localStorage` 先通过文档上下文读取，再执行迁移。迁移失败不再永久标记为已完成。
- 页面与内容脚本的事件载荷使用 JSON 字符串，避免 Firefox 跨隔离世界读取对象时的权限错误。
- 使用 `scripting.executeScript` 在 MAIN world 执行打包脚本，避免通过网页 `<script src>` 注入时受到 CSP 限制。
- 页面资源地址从实际扩展 origin 获取，支持 `chrome-extension:`、`moz-extension:` 和 Safari 的扩展地址。

## 浏览器差异和限制

| 能力 | Chrome | Firefox | Safari macOS |
| --- | --- | --- | --- |
| 饭否页面功能 | 保留 | 保留 | 共用实现；需在 Safari 中授予饭否站点访问权限 |
| 后台桌面通知 | 原生通知 | 原生通知，点击通知主体查看 | 无标准 WebExtensions notifications API；改为站内提示与工具栏标记 |
| 通知按钮 | 支持，具体显示取决于系统 | API 不支持按钮；保留点击通知主体查看 | 使用提醒替代 |
| 提示音 | offscreen document | 后台文档音频 | 后台文档音频，仍受浏览器自动播放限制 |
| OAuth | 浏览器授权窗口，也可手动授权 | 浏览器授权窗口，也可手动授权 | 无 identity API；打开饭否授权页，返回设置填写验证码并完成授权 |
| 设置 | local/sync | local/sync | 保存到本机；Safari 的 sync 存储不提供设备间同步 |
| 定时检查 | alarms | alarms | alarms |

这些 Safari 差异是浏览器 API 的限制，并非饭否功能被任意删除。若要在 Safari 中提供系统级桌面通知，需要另外实现包含应用的原生通知服务。当前没有实现原生通知，也没有把缺失能力伪装成可用。

MV3 后台会休眠，浏览器退出或系统睡眠时也不能保证定时检查准确到秒；通知自动关闭改用 alarm，因此可能比原来的页面定时器稍晚。这里没有使用永久保活的规避方式。

Google Analytics 的旧 Universal Analytics 远程代码已停用，没有引入新的统计服务。

Safari 当前交付范围为 macOS。没有将构建成功描述成 iOS/iPadOS、真实饭否账号或商店审核已完成。

## 升级时保护数据

保持同一个扩展 ID 时，原有 `chrome.storage` 设置、OAuth token、喜爱饭友和已读记录沿用原来的键。修改了扩展 ID 或卸载旧扩展，浏览器不会把旧存储自动交给新扩展。

Chrome 手动加载扩展时，目录从旧 `dist` 改到 `.output/chrome-mv3` 可能生成新的 ID。升级已有的解压版时，先备份旧目录和数据，再将新构建文件复制到原来加载的目录并点击“重新加载”，不要直接卸载旧扩展。商店发布应沿用原来的商店条目和签名身份。

Safari 和 Firefox 不会自动共享 Chrome 的扩展存储。Chrome/Firefox 的 sync 也不是跨浏览器同步服务。

## 验证与实际账号验收

自动化测试覆盖功能清单、设置结构与默认值、存储、同步写入限额优化、后台 HTML 解析、重复检查、已读标记、子功能并行初始化和 Safari 手动 OAuth 流程（使用模拟服务）。Chrome 测试使用模拟饭否页面，覆盖设置读写、CSP 下的 MAIN world 注入、草稿保存/恢复和 Worker 冷启动。

真实饭否发文、上传图片、批量删除/管理及 OAuth 服务器回调需要实际账号验收。测试不会为了验证迁移而在真实饭否账户中发布或删除内容。原有需要 `FANFOU_COOKIES_JSON` 的测试保留为可选验收入口。

正式发布前仍需在 Safari 手动启用签名后的扩展并验收实际页面，以及按原有测试说明验收发文和批量操作。Safari Xcode 工程可本地生成和编译；签名、TestFlight 和商店提交需要发布者自己的身份。

## 官方资料

- [WXT 多浏览器构建](https://wxt.dev/guide/essentials/target-different-browsers)
- [Chrome Service Worker 迁移](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers)
- [MDN 跨浏览器后台配置](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background#browser_support)
- [MDN notifications 兼容数据](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/notifications.json)
- [MDN identity 兼容数据](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/identity.json)
- [Apple Safari 打包](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)

## 本次验证记录（2026-10-28）

- TypeScript 与 ESLint 通过；18 个测试文件、26 个单元测试通过。
- Chromium 156：5 个隔离扩展测试通过，包含历史默认设置、严格 CSP、设置写入、草稿、头像壁纸渲染/调整/关闭和 Service Worker 强制停止后的恢复。
- Firefox 159.0：设置页、MAIN world 注入、跨环境消息、扩展样式、草稿保存与恢复通过。
- Safari：Xcode 27 生成的 macOS 应用与扩展在关闭代码签名的情况下编译通过；尚未在 Safari 中签名启用并进行实际账号验收。
- 三个 MV3 产物均通过功能清单和资源核对，已生成 2.0.0 ZIP。
- Mozilla `web-ext lint`：0 errors、0 notices、13 warnings。11 项为 HTML 赋值扫描提示，涉及历史组件/DOM 库及经过 DOMPurify 处理的内容；另外两项是隐私声明字段在最低支持的旧 Firefox 版本上尚未提供。保留这些提示供发布前审阅，没有将警告过滤为“完全无问题”。

Firefox 测试下载的浏览器、临时 profile 和 Safari 编译缓存均不属于源码。自动化没有使用个人浏览器资料，也没有在真实饭否账户中发送或删除内容。
