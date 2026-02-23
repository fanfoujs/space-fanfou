# TODO

## 1. 提交当前工作区 (Commit current workspace)
- [x] 提交 `.gitignore` 的改动（新增 e2e 忽略规则）
- [x] 提交 `CLAUDE.md` 的重构内容
- [x] 提交 `jest.config.js` 的修改
- [x] 处理未跟踪的文件（`docs/plans/`, `docs/project-status.md`, `GEMINI.md`, `tasks/`）
- [x] 清理不必要的临时文件 (`CLAUDE copy.md`, `fanfou账号`, `image copy 3.png`, `img/`)

## 2. 验证与优化 sidebar-statistics
- [x] 构建项目 `npm run build`
- [x] 在真实 Chrome 环境中验证 `gemini/fix-mv3` 的 OAuth 方案（已由 481924b 实现）
- [x] 结合 `claude` 分支的 DOM 抓取方案作为 OAuth 的 fallback（提高首屏加载速度）
- [x] 引入 `claude` 分支的 `m.fanfou.com` 抓取最早消息时间逻辑（作为自己页面的 fallback）
- [x] 决定最终采用哪种修法 (已决定：组合方案)

## 3. 整合决策 (Integration decision)
- [x] Cherry-pick `claude` 分支的 `check-friendship` 修复（支持双向关系检查，且逻辑更稳健）
- [x] 确保 `proxiedFetch` 在 `gemini` 分支中也是可用的（或改用 `fanfouOAuth.request` 封装）
- [ ] 合并或关闭实验性分支

## 4. modernization 分支评估
- [ ] 检查 `modernization` 分支的当前状态
- [ ] 决定是继续推进构建系统现代化还是放弃

## 5. 其他
- [ ] 记录学习到的教训到 `tasks/lessons.md`

## 6. 分支比较与分析
- [x] 确立比较范围：关注 `gemini/fix-mv3` 与 `claude/fix-sidebar-friendship-e2e` 关于他人页面 sidebar 统计/注册时间/关系状态的差异
- [ ] 收集关键提交（`git log`/`git show`）并列出涉及的核心文件
- [ ] 记录问题列表（按严重级别）并判断哪个分支更稳妥，准备合并策略
