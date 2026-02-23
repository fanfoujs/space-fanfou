# TODO

## 1. 提交当前工作区 (Commit current workspace)
- [ ] 提交 `.gitignore` 的改动（新增 e2e 忽略规则）
- [ ] 提交 `CLAUDE.md` 的重构内容
- [ ] 提交 `jest.config.js` 的修改
- [ ] 处理未跟踪的文件（`docs/plans/`, `docs/project-status.md`, `GEMINI.md`, `tasks/`）
- [ ] 清理不必要的临时文件 (`CLAUDE copy.md`, `fanfou账号`, `image copy 3.png`, `img/`)

## 2. 验证 sidebar-statistics
- [ ] 构建项目 `npm run build`
- [ ] 在真实 Chrome 环境中验证 `gemini/fix-mv3` 的 JSONP 原版方案是否可用
- [ ] 对比 `claude/fix-sidebar-friendship-e2e` 分支的 `proxiedFetch` 方案
- [ ] 决定最终采用哪种修法

## 3. 整合决策 (Integration decision)
- [ ] 评估并 cherry-pick `claude` 分支中关于 `check-friendship` 的修复
- [ ] 合并或关闭实验性分支

## 4. modernization 分支评估
- [ ] 检查 `modernization` 分支的当前状态
- [ ] 决定是继续推进构建系统现代化还是放弃

## 5. 其他
- [ ] 记录学习到的教训到 `tasks/lessons.md`
