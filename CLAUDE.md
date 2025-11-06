# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

太空饭否是一个 Chrome 浏览器扩展（Manifest V3），为 fanfou.com 提供增强功能。

## 核心命令

### 开发流程
```bash
npm run dev          # 开发模式（监听文件变化，自动重新构建）
npm test             # 运行 lint + 单元测试
npm run build        # 生产构建
npm run release      # 构建并打包发布版本
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
  - `offscreen.js`：Offscreen 文档入口
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
npm test                # 确保通过所有检查
npm run build           # 生产构建
npm run pack            # 打包成 zip
```

## 参考文档

- 架构详情：`docs/architecture.md`
- 发布流程：`docs/publish.md`
- 贡献指南：`docs/contributing.md`
