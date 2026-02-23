# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI 行为指南

### 1. 规划优先
- 任何非简单任务（3 步以上或涉及架构决策）都要进入计划模式
- 遇到问题时立刻停下重新规划，不要硬撑
- 用计划模式做验证，不只是构建
- 提前写清详细规格，减少歧义

### 2. 子代理策略
- 积极使用子代理，保持主上下文干净
- 把研究、探索、并行分析分配给子代理
- 复杂问题用子代理投入更多算力
- 每个子代理专注单一任务

### 3. 自我改进循环
- 用户纠正后：把规律记录到 `tasks/lessons.md`
- 写下规则防止同类错误
- 持续迭代直到错误率下降
- 每次会话开始时回顾 lessons

### 4. 完成前验证
- 没有证明工作前不要标记任务完成
- 必要时对比 main 分支与修改后的行为差异
- 问自己：资深工程师会认可这个方案吗？
- 跑测试、查日志、证明正确性

### 5. 追求优雅（适度）
- 对于非简单修改：停下来问"有没有更优雅的方式？"
- 如果修复感觉很 hacky："用我现在掌握的全部知识，实现优雅方案"
- 简单明显的修复跳过此步，不要过度设计
- 提交前自我审查

### 6. 自主 bug 修复
- 收到 bug 报告时：直接修，不要要求手把手
- 用日志、报错、失败测试定位问题
- 不需要用户切换上下文
- 主动修复 CI 失败测试

## 任务管理

1. **先规划**：把计划写入 `tasks/todo.md`，含可勾选事项
2. **确认计划**：开始实现前先确认
3. **追踪进度**：逐项标记完成
4. **解释变更**：每步给出高层次说明
5. **记录结果**：在 `tasks/todo.md` 中添加回顾章节
6. **记录教训**：纠正后更新 `tasks/lessons.md`

## 核心原则

- **简单优先**：每次改动尽可能简单，影响最少代码
- **不偷懒**：找根因，不打临时补丁，以资深工程师标准要求自己
- **最小影响**：改动只触碰必要部分，避免引入新 bug

---

## 项目概述

太空饭否是一个 Chrome 浏览器扩展（Manifest V3），为 fanfou.com 提供增强功能。

- **版本**：MV3（本 fork 已完成 MV2→MV3 迁移，上游仍为 MV2）
- **基础**：Fork 自 [fanfoujs/space-fanfou](https://github.com/fanfoujs/space-fanfou)
- **OAuth**：内置饭否开发者密钥，用户一键授权即可（`fanfou-oauth` 功能模块）

## 核心命令

### 开发流程
```bash
npm run dev          # 开发模式（监听文件变化，自动重新构建）
npm test             # 运行 lint + 单元测试
npm run build        # 生产构建
npm run release      # 生产构建并打包（= build + pack）
```

### 测试与检查
```bash
npm run unit         # 运行 Jest 单元测试
npm run unit:dev     # Jest 监听模式
npm run lint         # 同时运行 JS 和 CSS 检查
npm run lint:js      # ESLint 检查
npm run lint:css     # Stylelint 检查
```

### 运行单个测试
```bash
npx jest path/to/test-file.js
npx jest -t "test name pattern"
```

## 架构概览

### 四层结构

扩展分为四个独立编译的部分（参见 `docs/architecture.md`）：

1. **Background Scripts** (`background.js`)
   - Service Worker，持续运行
   - 处理通知、检查 @ 提醒等需要持续执行的功能
   - 无法直接操作 DOM，通过消息与 Content Scripts 通信

2. **Content Scripts** (`content.js`)
   - 注入到 fanfou.com 页面，在隔离环境中运行
   - 可操作 DOM，但无法访问页面的 JS 对象（jQuery, YUI 等）
   - 作为 Background 和 Page Scripts 之间的桥梁
   - 修改后需要重启扩展才能生效

3. **Page Scripts** (`page.js`)
   - 由 Content Scripts 通过 `<script>` 标签注入
   - 运行在页面上下文中，可访问饭否的 JS API（jQuery, YUI 等）
   - 通过 CustomEvent 与 Content Scripts 通信
   - 修改后无需重启扩展，刷新页面即可

4. **Settings** (`settings.html` + `settings.js`)
   - 扩展设置页面
   - 使用 Preact 构建 UI

**选择原则**：对加载速度敏感或需要与 Background 通信的功能用 Content Scripts；需要调用饭否 JS API 的功能用 Page Scripts；开发期优先 Page Scripts（无需重启扩展）。

### 功能模块系统

每个功能独立存放在 `src/features/<feature-name>/` 目录中：

```
src/features/
├── auto-pager/
│   ├── metadata.js           # 功能配置（选项定义、默认值、标签）
│   └── @page.js              # Page Script 实现
├── notifications/
│   ├── metadata.js
│   ├── service@background.js # Background Script 实现
│   └── update-details@background.js
└── floating-status-form/
    ├── metadata.js
    ├── floating-status-form@page.js
    ├── floating-status-form@page.less
    └── replay-and-repost@page.js
```

**文件命名规则**：
- `metadata.js`：必需，定义功能选项和配置
- `<subfeature-name>@background.js`：Background Scripts 组件
- `<subfeature-name>@content.js`：Content Scripts 组件
- `<subfeature-name>@page.js`：Page Scripts 组件
- `<subfeature-name>@page.less`：Page Scripts 样式
- `<subfeature-name>@content.less`：Content Scripts 样式

**metadata.js 结构**：
```javascript
export const options = {
  _: {                          // 主开关
    defaultValue: true,         // 默认启用
    label: '功能描述',
  },
  subOption: {                  // 子选项
    defaultValue: false,
    label: '子功能描述',
    disableCloudSyncing: true,  // 禁用云同步（存储在 local 而非 sync）
  },
}

// 或者功能无法关闭（焊死）
export const isSoldered = true
```

### 构建系统

- **入口文件**：`src/entries/` 目录
  - `background-content-page.js`：三层共用的入口（自动根据环境加载对应功能组件）
  - `settings.js`：设置页面入口
  - `offscreen.js`：Offscreen 文档入口（MV3 中 Service Worker 不支持 Audio API，音频播放由此处理）
- **条件编译**：使用 `ifdef-loader` 根据环境变量选择性编译代码
  - `/// #if ENV_BACKGROUND`
  - `/// #elif ENV_CONTENT`
  - `/// #elif ENV_PAGE`
  - `/// #endif`
- **动态加载**：`src/features/index.js` 使用 `import-all.macro` 自动加载所有功能模块
- **输出目录**：`dist/`（包含 manifest.json、background.js、content.js、page.js 等）

## 技术栈

- **框架**：Preact 10（用于设置页面 UI）
- **构建工具**：Webpack 4 + Babel
- **测试**：Jest
- **代码检查**：ESLint（eslint-config-riophae）、Stylelint
- **样式**：LESS + PostCSS (Autoprefixer)
- **实用库**：
  - `select-dom`：DOM 选择器（类似 jQuery 但更轻量）
  - `dom-chef`：JSX 创建 DOM 元素
  - `element-ready`：等待元素出现
  - `wretch`：HTTP 请求封装

## 关键约定

1. **路径别名**：
   - `@libs/*` → `src/libs/*`
   - `@features/*` → `src/features/*`
   - `@constants/*` → `src/constants/*`

2. **消息通信**：
   - Background ↔ Content：Chrome Extension API (`chrome.runtime.sendMessage`)
   - Content ↔ Page：CustomEvent（通过 `src/content/environment/bridge.js`）

3. **设置存储**：
   - 使用 `chrome.storage.sync`（可云同步）或 `chrome.storage.local`（本地存储）
   - 通过 `disableCloudSyncing` 控制存储位置

4. **生产构建特点**：
   - 仅进行最小化压缩（保留代码可读性）
   - 方便用户反馈 bug 后 debug

## 常见任务

### 添加新功能

1. 在 `src/features/` 创建新目录
2. 创建 `metadata.js` 定义配置
3. 根据需要创建 `@background.js`、`@content.js` 或 `@page.js`
4. 功能会被自动加载（无需手动注册）

### 调试

- 开发模式：`npm run dev`，在 Chrome 扩展管理页面加载 `dist/` 目录
- 查看 Background 日志：扩展管理页面 → Service Worker → 检查视图
- 查看 Content/Page 日志：右键页面 → 检查 → Console

### 发布前检查

```bash
npm test            # 确保通过所有检查
npm run release     # 生产构建并打包成 zip
```

## 参考文档

- 架构详情：`docs/architecture.md`
- 发布流程：`docs/publish.md`
- 贡献指南：`docs/contributing.md`
