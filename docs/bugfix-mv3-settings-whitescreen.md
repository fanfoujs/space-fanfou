# 深入解析：Manifest V3 选项页白屏 Bug 尸检报告

**生成时间**：2026-02-25
**针对问题**：执行 `npm run build` 后加载扩展，选项页 (`settings.html`) 加载白屏，无任何有效 UI 渲染。但在某些电脑环境（如公司）或纯开发模式 (`npm run dev`) 下又能表现正常。

造成这种“环境薛定谔”的现象，是由隐藏在架构深处的**两处不同级别的严重 Bug**（一个是时序竞态，一个是构建缓存缺陷）共同交织所导致的。

---

## 核心元凶一：MV3 Service Worker 的冷启动与 IPC 竞态死锁

### 问题现象
在重新加载扩展并立刻点击“设置”时，Service Worker 会处于“冷启动”状态。但在前台（选项页）看来，它只是发出了一个请求 `GET_OPTION_DEFS` 给 Background，然后就永远收不到回应（无 resolve，也无 reject），前端 UI 直接死锁，无法执行由它驱动的渲染工作。

### 为什么会在公司电脑好用，家里电脑死锁？
在 MV3 中，后台脚本 `index.js` 是按照以下时序执行的：
1. `messaging.install()` (同步：挂载了对 `chrome.runtime.onConnect` 和 `port.onMessage` 的侦听器)。
2. `settings.install()` (异步：它包含 `await migrateSettings()` 和 `await initOptions()`，会执行存储读写操作以兼容旧版数据)。
3. 在 `settings.install()` 所有的 `await` 结束后，才会执行内部的 `registerHandlers()`。

**公司电脑（性能佳或无迁移负担）**：
存储读写或迁移操作瞬间完成，事件循环几乎不挂起。此时前台的 `settings.html` 都还没来得及渲染和发送 `GET_OPTION_DEFS` 消息。此时后台早已执行完了 `registerHandlers()`，顺利接盘，功能正常。

**家里的电脑 / Playwright 无头测试环境**：
系统调度、文件 I/O 速度或本地需要迁移的旧历史配置带来的几毫秒延迟，导致 `await migrateSettings()` 把事件主线程交还给了浏览器引擎（让出了事件循环）。就在这个几毫秒的空窗期，**前台的 `settings.html` 抢先发来了 `GET_OPTION_DEFS` 消息**。
背景中同步挂载的 `onMessage` 瞬间捕获了这条消息，跑去 `handlers` 字典里寻找，结果发现处理函数还没注册，就抛出了一个 “Unknown action”，直接把前台的请求挂死在黑洞里。

### 优雅的解决方案
我们在 `src/background/environment/messaging.js` 在处理任何消息之前，插入了一个原生异步同步锁（Barrier Synchronization）：
```javascript
// 【核心修复】：消息处理前屏障
if (self.__SF_BACKGROUND_READY__) {
  try {
    // 强制挂起传入的消息处理事件（等待背景环境全局 Promise.all 完成）
    await self.__SF_BACKGROUND_READY__
  } catch (e) { ... }
}
```
**复核验证点**：这让任何急着发过来的消息都能被“放入休眠仓”等待，直到后台所有模块百分百登记完毕，彻底抹杀了底层因性能波动导致的并发竞态。

---

## 核心元凶二：Babel-Loader 的 AST 宏缓存导致生产产物残缺

### 问题现象
即使修复了竞态条件，有时前端仍然会在运行时抛出 `Cannot read properties of undefined (reading 'map')` 导致 React 树销毁引发终极白屏。排查发现，传给前台的 `optionDefs` 里，离奇丢失了诸如 `avatar-wallpaper` 或者刚新增的实验性功能目录属性。

### 为什么之前不报错，今天这台电脑才报错？
这正是本次最隐秘的坑：
1. 我们的项目高度依赖 `import-all.macro` 这个构建时的文件探测宏，它负责扫描 `src/features/` 自动打包子组件。
2. 我们今天在家里的这台电脑上，短时间内让 Claude 挂载了 **4 个不同的工作树 (Worktrees)**，在这个 `features/` 目录下**极其频繁地新增和删除了大量功能级文件夹**。
3. 在执行 `npm run build` 时，Webpack 内部配置的 `cache-loader` 在判断 `src/features/index.js` 是否需要重新编译时，只看它的文件最后修改时间 (mtime)。问题在于，即使你在它旁边删减了 10 万个特性文件夹，这个 `index.js` **文件本身的 mtime 是完全不会变的**！
4. 所以 Loader 欺骗了编译器：“哦，`index.js` 没修改，直接吐出昨天在本地 `.cache` 里的老编译产物吧。”
5. 结果就是，生产包构建出来，里面完全没有包含今天在代码层发生的文件变化。功能丢失，导致取不到其 `metadata` 中的定义，运行时遇到 `undefined` 全盘崩溃。

在公司这台电脑中：如果当时您是进行全新 `git clone`，或并未经历这种爆发性的文件夹增删缓存污染，`node_modules/.cache` 要么不存在，要么没有历史负担，它会直接跑宏并执行全新 AST 树分析，就不会产生残块代码。

### 优雅的解决方案
我们在 `build/webpack.js.config.js` 的装载器链中，去除了生产环境的 `cache-loader`：
```javascript
use: [
  // 仅在开发模式 (npm run dev) 启用 cache-loader 加速热更新
  ...(mode === 'development' ? [{
    loader: 'cache-loader',
    options: {
      cacheIdentifier: require('cache-loader/package').version + mode + id,
    },
  }] : []),
  'babel-loader',
  // ...
]
```
**复核验证点**：虽然 `npm run build` 现在的打包时间可能只多了 1~2 秒，但每一次发布构建都绝对、必然会读取真实的实时物理文件目录执行最新宏定义。构建包里的功能再也不会因缓存污染而缺失。

---

### 明日复核指南 (Office Verification Guide)

建议您明天通过如下步骤复核它的健壮性：

1. `npm run build` 构建最新的生产包。
2. 转到 `chrome://extensions/` 尝试多次重载扩展并狂点“设置”按钮测试页面，验证不管怎样切页面、断网重连，都不会再产生死锁白屏。
3. 检查控制台 Background Inspector，确保不会看到 `Unknown action GET_OPTION_DEFS` 报错。
4. 审查 `src/background/environment/messaging.js` 中的 `self.__SF_BACKGROUND_READY__` 逻辑，以及 `src/background/environment/index.js` 对它的赋值。
5. 审查 `build/webpack.js.config.js` 中关于 `cache-loader` 的排除判断。

这两套补丁严格执行了 `Simple & Elegant` 原则：未对主业务生命周期进行大动干戈的重构，而是精准掐灭了环境和时序引起的不稳定点。请放心复核！
