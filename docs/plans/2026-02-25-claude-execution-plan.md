# Claude 任务执行计划：Space Fanfou 新功能开发 (Features 1-4)

> 目标：在 `gemini/fix-mv3` 的基础上，使用 `git worktree` 并行开发 4 个独立的新功能。
> 所有的开发必须保证不相互干扰，且最终都能独立审查和合并。
> 请务必遵循 `GEMINI.md` 的代码规范及「简单优先、最小影响」原则。

---

## 阶段零：工作区初始化 (Setup Worktrees)

请**依次**执行以下命令，为 4 个特性分别创建独立的工作树和分支。工作树目录建立在项目同级的上层目录。

```bash
# 1. 字数预警可视化
git worktree add -b feat/word-count-warning ../space-fanfou-word-count gemini/fix-mv3

# 2. 草稿自动保存
git worktree add -b feat/draft-save ../space-fanfou-draft-save gemini/fix-mv3

# 3. 消息折叠/展开
git worktree add -b feat/collapse-repost ../space-fanfou-collapse-repost gemini/fix-mv3

# 4. 自定义头像本地版
git worktree add -b feat/custom-avatar ../space-fanfou-custom-avatar gemini/fix-mv3
```

*(注意：在各个工作区目录中修改和提交代码，不会影响彼此或主干。)*

---

## 阶段一：功能实施指南

请进入每一个对应的工作区目录，完成以下具体特性的开发并在各自的 worktree 提交 Commit。
请在开发每项功能前，使用 `npm install` 确保依赖正常。

### 特性 1：字数预警可视化
- **目录位置**：`../space-fanfou-word-count/`
- **修改模块**：`src/features/status-form-enhancements/`
- **实施要点**：
  - 监听状态输入框的字符长度变化。
  - 在接近饭否上限时（如 120 字以上变黄，135 字以上变红），给输入框边框和字数计数器添加不同的 CSS class 以高亮。

### 特性 2：草稿自动保存
- **目录位置**：`../space-fanfou-draft-save/`
- **修改模块**：`src/features/status-form-enhancements/`（建议新增 `draft-save@page.js`）
- **实施要点**：
  - 实时将用户输入的内容写入 `localStorage` 或是 `chrome.storage.local`。
  - 初始化加载时将内容恢复到 `<textarea>`，并**务必手动 dispatch 一次原生的 `input` 事件**以触发 React/Preact 的绑定：`textarea.dispatchEvent(new Event('input', { bubbles: true }))`。
  - 发文成功后清空缓存。

### 特性 3：消息折叠/展开
- **目录位置**：`../space-fanfou-collapse-repost/`
- **修改模块**：新增 `src/features/collapse-repost-chain/`
- **实施要点**：
  - 解析时间线上消息的内容 `.content`。
  - 若匹配到过长/过深的连续“转发”层级，通过 DOM 操作将其截断，并注入一个展开/折叠的 UI Button，挂载点击事件用来切换完整和截断的显示状态。

### 特性 4：自定义头像（本地版）
- **目录位置**：`../space-fanfou-custom-avatar/`
- **修改模块**：新增 `src/features/custom-avatar/`
- **实施要点**：
  - 在设置页提供输入框供用户填入图片 URL，将该 URL 存入 `chrome.storage.local`。
  - 页面加载时，获取“我的空间”对应的用户链接或 ID。
  - 查找到页面内该用户对应的所有 `<img>` 标签，并把 `src` 替换为自定义的头像 URL。

---

## 阶段二：验证与清理
完成 4 个特性分支的 Commit 后，请分别到各自的目录使用 `npm run build` 和载入无壳 Chrome 扩展确保没导致语法崩溃，即可通知用户检查。
