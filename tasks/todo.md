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

## 7. 诊断与修复：注册时间与好友关系 (基于审核报告与竞品分析)
- [x] **Research (`nofan` 竞品方案对比)**
  - 调研结论: `nofan` 属于完全授权的 CLI 工具，它获取用户必须在使用前通过命令行的提示输入真实密码来换取 OAuth Token 授权。因为浏览器插件不应该去要求用户明文输入密码以防安全泄漏且不符合"免配置"的易用性场景，所以我们不应直接效仿它目前的做法。我们要回归依靠 Web 会话自身特权的思路。
- [x] **Research (验证 JSONP 的可行性)**
  - 调研结论: 饭否官方已经彻底封锁了对 `/users/show.json` 的无状态匿名访问（包含 JSONP）。在没有严格 OAuth 签名或有效的特定 Session 的情况下，会直接返回 **401 参数错误**。因此，恢复原版的 JSONP 获取注册时间路线**走不通**。
  - **最终破局点**: 我们决定直接在插件的 OAuth 流程中内置 `nofan` 开源的 Consumer Key 和 Secret。让用户不仅不需要去查找和输入那些晦涩的 Key，直接一键点击“前往官网授权”完成 OAuth 的闭环！
- [x] **Implementation (`sidebar-statistics` 与 OAuth 完美闭环)**
  - [x] 修改 `src/settings/components/OAuthPanel.js` 等面板代码，内置 `nofan` 的 Consumer Key 和 Secret，降低用户的登录门槛。
  - [x] (根据 Claude 反馈) 在 `src/background/environment/fanfouOAuth.js` 的 `handleAuthorize()` 中移除对 `enabled` 状态的强校验（由于内置 Key 永远有 Credential，不应因为没打开设置页开关而拦截用户的授权操作）。
- [x] **Implementation (`check-friendship`)**
  - [x] 抛弃不稳定的 `friends?u=目标用户` 页面匹配方案。
  - [x] 删除对自身 ID 强解析行为 (`getLoggedInUserId` / `normalizeUserId`) 带来的脆点。
  - [x] 收敛查询逻辑，变回仅向 `m.fanfou.com/followers/p.N` 发起请求并查找页面目标 ID。
  - [x] 修复当查询失败或遇到异常时死锁的缺陷，使检查行为可重试 (`hasChecked = false`)。
- [x] **Verification**
  - [x] 在真实 Chrome 环境及 Playwright E2E 中跑通 OAuth 授权链路和 `check-friendship` 流程。

## 8. 修复互相关注功能与桥接层异常
- [ ] 修复 `src/content/environment/bridge.js`，增加 try-catch 避免 SW 休眠导致的 postMessage 报错造成死锁
- [ ] 修复 `src/features/check-friendship/@page.js` 的 `hasChecked` 重置逻辑，确保成功和失败路径均能清空改标志以便下一次点击正常工作
- [x] 跑通端到端测试验证以上两处修复
