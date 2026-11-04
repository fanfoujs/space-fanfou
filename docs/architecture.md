# 架构

## 运行环境

- `src/entrypoints/background.ts`：Chrome Service Worker；Firefox/Safari MV3 事件页面。原生事件在入口同步注册，初始化完成后由 `platform/events.ts` 分发。
- `src/entrypoints/content.ts`：饭否页面隔离环境，转发消息、注入主样式并安装 content 功能。
- `src/entrypoints/page.ts`：通过 `scripting.executeScript` 在网站 MAIN world 执行，保留需要访问饭否 jQuery/YUI 的增强功能。
- `src/entrypoints/settings/`：Preact 设置页面，同时作为工具栏弹出页面。
- `src/entrypoints/offscreen/`：仅 Chrome 包含，用于音频和旧版 `localStorage` 迁移。

## 功能注册

`src/features/*/metadata.js` 保持原有选项定义。`features/background.js`、`content.js` 和 `page.js` 分别通过静态 `import.meta.glob` 加载对应的 `@background`、`@content`、`@page` 子功能。`registry.ts` 建立类型化注册表；`initialize.js` 实例化功能类。

子功能并行初始化：等待饭否网站库的模块不会阻止草稿等独立模块启动。背景页面和页面世界的业务实现继续沿用原有的 feature/subfeature 模型。

## 消息与存储

设置/内容脚本通过一次性 `runtime.sendMessage` 请求后台。后台向设置页和饭否标签页广播变动；内容脚本与 MAIN world 通过携带 JSON 字符串的 `CustomEvent` 桥通信。

`platform/storage.ts` 统一 local/sync/session；session 保留跨 Worker 重启的临时状态。没有原生 session API 时使用隔离的本地命名空间，并在浏览器启动时清理。原有设置和用户数据的存储键保持不变。

旧 `localStorage` 在文档环境中读取成功后再执行迁移；首次迁移后保存读取标记，避免每次 Worker 唤醒都创建文档。

## 平台差异

Manifest 由 `wxt.config.ts` 生成，不再手工维护 JSON。浏览器特有的权限、事件页面、offscreen、通知和 OAuth 能力在构建或适配层处理。

[迁移说明](migration.md) 列出功能清单、兼容差异和验证范围。
