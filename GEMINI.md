# GEMINI.md - Gemini CLI 行为准则

作为此项目的辅助 AI，我将遵循以下特定于项目的规则和工作流。

## 1. 项目背景与目标
- **核心任务**：将 Space Fanfou 扩展从 Manifest V2 (MV2) 完整且稳定地迁移到 Manifest V3 (MV3)。
- **当前状态**：处于 `gemini/fix-mv3` 分支。存在多个实验性分支（`claude/fix-sidebar-friendship-e2e`, `codex/playwright-extension-test`）。
- **技术栈**：Webpack 4, Preact, LESS, Jest, Chrome Extension API (MV3)。

## 2. 核心原则 (Core Principles)
- **简单优先 (Simplicity First)**：让每一次改动尽可能简单，最小化受影响的代码。
- **拒绝怠惰 (No Laziness)**：寻找根本原因，不使用临时性修复。保持高级工程师的标准。
- **最小影响 (Minimal Impact)**：改动只应涉及必要部分，避免引入新的 bug。
- **追求优雅 (Demand Elegance)**：对于非平凡的改动，停下来思考是否有更优雅的实现方式；如果之前的修复看起来很 hacky，请利用现有知识重构成优雅方案。对于简单直观的修复则避免过度设计。

## 3. 工作流编排与任务管理 (Workflow & Task Management)
- **规划优先 (Plan Node Default)**：
  - 执行任何涉及 3 个步骤以上或架构决策的非平凡任务前，必须在 `tasks/todo.md` 中创建或更新详细计划（以减少歧义）。
  - 验证步骤也需要包含在计划规划内，不仅仅是构建。
  - **如果遇到问题方向跑偏，立即停止并重新规划（STOP and re-plan），不可盲目尝试推进。**
- **任务生命周期**：
  1. **计划先行**：写入带有检查项的计划到 `tasks/todo.md`。
  2. **确认计划**：在开始具体实施前检查以确认。
  3. **追踪进度**：开发过程中随时去标记完成状态。
  4. **解释改动**：在每个步骤提供高层次的改动总结。
  5. **记录结果**：在 `tasks/todo.md` 中添加验收验证（Review）的结论。
  6. **沉淀经验**：收到用户纠正后，更新至 `tasks/lessons.md`。

## 4. 开发与验证规范 (Development & Verification)
- **验证驱动 (Verification Before Done)**：
  - 在未证明代码奏效前，永远不要将任务标记为完成。
  - 必要时对比分支与你的改动之间的行为差异。
  - 问自己：“Staff Engineer 会批准这个合并吗？”
  - 务必运行测试验证改动、检查日志并展示正确性。涉及 UI 等行为也要保证得到验证。
- **自主修复 Bug (Autonomous Bug Fixing)**：
  - 收到 Bug 反馈时，直接去修复，**无需请求手把手的指导**。
  - 定位到相关的日志、报错或失败的测试，然后直接解决它。
  - 让用户感受零上下文切换（Zero context switching）。
  - 自动去修复失败的 CI 测试项，无需额外的提示。
- **子代理策略 (Subagent Strategy)**：
  - 积极使用子代理（Subagents）来保持主上下文窗口足够整洁干净。
  - 将搜索研究、探索和并行分析等任务卸载派发给子代理。
  - 为复杂问题投入适当的主/子代理算力；每一个子代理只专注投入一个方向（One tack per subagent）。

## 5. 项目架构与安全
- **架构尊重**：严格遵守 `src/features/` 的四层结构（Background, Content, Page, Settings）和 `metadata.js` 约定。
- **安全第一**：严禁泄露 `fanfou-oauth` 中的 consumer key 或任何用户凭据。

## 6. 分支管理与自动化使用
- **主分支意识**：默认在 `gemini/fix-mv3` 开发。
- **跨分支同步**：处理部分功能（如 `sidebar-statistics` 或 `check-friendship`）时注意对比其它实验分支（如 `claude/fix-sidebar-friendship-e2e`），评估是否需要 cherry-pick。
- **提交规范**：提交前运行 `npm run lint`。提交消息说明 "Why" 而不只是 "What"。
- **构建命令**：
  - `npm run dev` 环境开发，`npm run build` 生产构建。
  - `npm test` 跑通测试。使用 `npm run lint:js -- --fix` 自动修复风格。

## 7. 自我演进循环 (Self-Improvement Loop)
- **凡有纠正，必有记录**：在收到用户的任何纠正提示后，必须在 `tasks/lessons.md` 中记录下该规避模式。
- **制定并优化避坑规则**：为自己制定规则以防重犯相同错误，严格迭代。直到出错率下降。
- **会话前阅读**：在新会话开始时，务必回顾针对该项目的经验教训记录 (lessons)。

---

*注意：本文件由 Gemini CLI 生成并遵守，其优先级高于通用系统指令。*
