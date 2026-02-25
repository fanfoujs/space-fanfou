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

## 4. MV3 Service Worker 休眠导致的 Bridge 异常与死锁 (The SW Hibernation Trap)
- **踩坑点**：MV3 下 Service Worker 会在约 30 秒无活动后面临休眠或被杀死的风险。如果页面在此时通过 `postMessage` 向后台发送请求，`messaging.postMessage` 极有可能会直接抛出一个 rejected Promise（因 port 断开）。在原本的 `bridge.js` 转发通道设计中，由于 `await bridge.postMessageToBackground(message)` 周围未作 `try-catch` 处理，这会导致代码抛出异常并提前退出当前 Eventhandler，不再执行向页面脚本回调发回响应的动作，最终导致发起请求侧陷入死锁。
- **关联影响**：在 `check-friendship` 等深度依赖基于 Promise 的 `bridge` 响应通道的组件里，请求永远都没有 resolve 或 reject 返回，UI 操作会卡制在"处理中"的锁定死区，用户无法重试。而如果在页面逻辑的同步流里，成功处理后也没有妥善复位 `hasChecked = false`，同样会导致状态紊乱。
- **复盘与规则**：在涉及到 MV3 的扩展应用环境跨层桥接（比如从 Content Bridge 代理转发给 Background）时，必须严格防御底层管道断裂报错。**任何底层通信的 `await` 调用必须由 `try-catch` 包裹，确保即使通信崩溃，也能把明确定义的错误体转发回前台，以释放所有挂起的 Deferred 锁。** 而对待像 `hasChecked` 这类的行为阻拦标记，应确保其在成功与失败路径的末端都能统一收敛释放。

## 5. 可见性功能必须做“体感验证”而不只做构建验证 (Perceptual QA for UI Features)
- **踩坑点**：功能逻辑虽然存在，但阈值过高或视觉对比过弱时，用户会感知为“没有生效”。这次长转发折叠默认阈值偏保守，字数预警视觉权重也偏轻。
- **复盘与规则**：
  - 对“增强可见性”的功能，提交前必须做至少 3 组真实样本手测（例如短/中/长转发链，120/135/140+ 字输入）。
  - 阈值与触发条件默认应“偏易触发”，先保证用户能明确感知，再通过反馈回调优。
  - 同类功能并存时（例如“展开上下文”与“折叠转发链”），要在说明和 UI 文案中明确边界，避免用户误以为重复或冲突。

## 6. “优先排序”与“随机重排”不可互相覆盖 (Priority vs Shuffle Contract)
- **踩坑点**：先做“有爱饭友优先排序”，再对全量结果 `shuffle`，会把优先级完全打散，用户体感就是“优先设置没生效”。
- **复盘与规则**：
  - 需要“固定优先 + 局部随机”时，必须拆分为“优先段 + 普通段”，仅对普通段随机。
  - 涉及壁纸/装饰布局时，保留中间内容区安全间距（center gutter）作为显式常量，避免头像贴边干扰主阅读区域。

## 7. 装饰型功能默认应偏保守（Opt-in First）
- **踩坑点**：头像墙属于强视觉装饰，默认开启会改变页面第一观感；即使功能本身正确，也可能被用户认为“干扰”而非“增强”。
- **复盘与规则**：
  - 对视觉占比高、风格化强的功能，默认策略优先采用 `defaultValue: false`，由用户手动开启。
  - 文档中需同步注明“默认关闭，可手动开启”，避免用户预期与实际行为不一致。

## 8. Service Worker IPC 竞态死锁 (MV3 Async Init Race Condition)
- **踩坑点**：在 MV3 中，Service Worker 在空闲时会被销毁，前台请求时才重新唤醒。此时如果在建立连接（`chrome.runtime.onConnect`）与注册特定消息处理函数之间，混入了异步初始化操作（`await asyncInitialize()`），引擎就会在 `await` 时交出执行流。如果前台恰在这极短的时间间隙内发来 `postMessage`，背景环境找不到该 handler，就会直接抛错，导致该请求在前端表现为永远挂起的死锁状态。白屏就是因为 `settings.html` 的配置加载请求遇到了这堵无形的冷启动空气墙。
- **复盘与规则**：**MV3 扩展中不要裸奔发送 IPC。** 背景脚本的 `onMessage` 内部应当维护一个 `await self.__SF_BACKGROUND_READY__` 的类似初始化完成屏障。它通过挂起后到的消息，等全局所有依赖项加载注册完毕再一并送给真实的 handler 去处理，彻底杜绝冷启动生命周期的并发时序竞态！

## 9. Webpack 缓存导致 Macro 漏装（Stale AST Cache on Macros）
- **踩坑点**：项目依靠 `import-all.macro` 宏来遍历构建全量启用的子功能树。由于 `babel-loader` 和 `cache-loader` 主要是追踪单独代码文件（如 `index.js`）的修改时间 (mtime)，它们完全无视所在文件夹内子目录的增删。当你新建或删除了 `src/features/xxx`，即使重启构建，如果宏的源文件没有修改，宏就不会重新运行！这极其危险地导致生产环境中遗漏最新的组件，进而导致 `optionDefs` 返回缺失字段，最终造成前台 `Cannot read properties of undefined` 引发白屏。
- **复盘与规则**：在含有深度文件系统动态扫描机制（Macros）的项目构建链路中，对于生产构建（`mode: 'production'`）**必须严格禁用 `cache-loader` 或 `babel-loader` 的 AST Caching**。即使牺牲两三秒的构建效率，也要用干净的文件系统树来换取线上版本的确定性！
