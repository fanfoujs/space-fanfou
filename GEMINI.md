# GEMINI.md - Gemini CLI 行为准则

作为此项目的辅助 AI，我将遵循以下特定于项目的规则和工作流。

## 1. 项目背景与目标
- **核心任务**：将 Space Fanfou 扩展从 Manifest V2 (MV2) 完整且稳定地迁移到 Manifest V3 (MV3)。
- **当前状态**：处于 `gemini/fix-mv3` 分支。存在多个实验性分支（`claude/fix-sidebar-friendship-e2e`, `codex/playwright-extension-test`）。
- **技术栈**：Webpack 4, Preact, LESS, Jest, Chrome Extension API (MV3)。

## 2. 关键开发规范 (遵循 CLAUDE.md)
- **规划优先**：执行任何涉及 3 个步骤以上的任务前，必须在 `tasks/todo.md` 中创建或更新计划。
- **验证驱动**：改动必须通过 `npm test` (Lint + Unit tests) 验证。涉及 UI 或浏览器行为的改动，应尽可能通过 Playwright 或手动在 Chrome 中验证。
- **架构尊重**：严格遵守 `src/features/` 的四层结构（Background, Content, Page, Settings）和 `metadata.js` 约定。
- **安全第一**：严禁泄露 `fanfou-oauth` 中的 consumer key 或任何用户凭据。

## 3. 分支管理与冲突解决
- **主分支意识**：默认在 `gemini/fix-mv3` 开发。
- **跨分支同步**：在处理 `sidebar-statistics` 或 `check-friendship` 相关问题时，务必对比 `claude/fix-sidebar-friendship-e2e` 分支的实现，评估是否需要 cherry-pick 或合并。
- **提交规范**：提交前运行 `npm run lint`。提交消息应简明扼要，说明 "Why" 而非仅 "What"。

## 4. 自动化与工具使用
- **构建命令**：
  - `npm run dev`：开发模式。
  - `npm run build`：生产构建。
  - `npm test`：运行所有测试。
- **Linting**：优先使用 `npm run lint:js -- --fix` 自动修复格式问题。

## 5. 持续改进
- 遇到重复性错误或学到的教训，必须记录到 `tasks/lessons.md`。
- 每次开始新任务前，简要回顾 `tasks/todo.md` 中的待办事项。

---

*注意：本文件由 Gemini CLI 生成并遵守，其优先级高于通用系统指令。*
