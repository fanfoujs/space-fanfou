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

## 9. Claude 执行计划接管（2026-02-25）
- [x] 阅读并对齐输入文档：`docs/project-status.md`、`docs/plans/2026-02-25-claude-execution-plan.md`、`CLAUDE.md`、`GEMINI.md`
- [x] 创建 4 个并行工作树（均基于 `gemini/fix-mv3`）：
  - `../space-fanfou-word-count` on `feat/word-count-warning`
  - `../space-fanfou-draft-save` on `feat/draft-save`
  - `../space-fanfou-collapse-repost` on `feat/collapse-repost`
  - `../space-fanfou-custom-avatar` on `feat/custom-avatar`
- [x] `feat/word-count-warning`：在 `status-form-enhancements` 中实现字数预警可视化（120+ 黄色、135+ 红色，输入框与计数器联动）
- [x] `feat/draft-save`：在 `status-form-enhancements` 中实现草稿自动保存/恢复，并在恢复后触发原生 `input` 事件；发文成功后清空草稿
- [x] `feat/collapse-repost`：新增 `collapse-repost-chain` 功能目录，支持长转发链折叠/展开
- [x] `feat/custom-avatar`：新增 `custom-avatar` 功能目录，支持设置页配置头像 URL 并在页面替换“我的空间”头像
- [x] 各工作树分别执行验证（至少 `npm run build`）并修复构建问题
- [x] 每个特性分支分别提交 commit（含清晰 why）
- [x] 回填本节 Review 结果：记录每个分支的构建结果、风险点、待人工验证项

### 9.1 Review 结果（2026-02-25）

#### feat/word-count-warning
- Worktree: `/home/fiver/projects/space-fanfou-word-count`
- Commit: `a6c36d6`
- 变更:
  - `src/features/status-form-enhancements/textarea-state@page.js`
  - `src/features/status-form-enhancements/misc@page.less`
- 验证:
  - `npx eslint src/features/status-form-enhancements/textarea-state@page.js`
  - `npx stylelint src/features/status-form-enhancements/misc@page.less`
  - `npm run build`
- 结果: 通过

#### feat/draft-save
- Worktree: `/home/fiver/projects/space-fanfou-draft-save`
- Commit: `1ff07d4`
- 变更:
  - `src/features/status-form-enhancements/draft-save@page.js`
- 验证:
  - `npx eslint src/features/status-form-enhancements/draft-save@page.js`
  - `npm run build`
- 结果: 通过

#### feat/collapse-repost
- Worktree: `/home/fiver/projects/space-fanfou-collapse-repost`
- Commit: `194b54b`
- 变更:
  - `src/features/collapse-repost-chain/metadata.js`
  - `src/features/collapse-repost-chain/@page.js`
  - `src/features/collapse-repost-chain/@page.less`
  - `src/settings/getTabDefs.js`
- 验证:
  - `npx eslint src/features/collapse-repost-chain/@page.js src/features/collapse-repost-chain/metadata.js src/settings/getTabDefs.js`
  - `npx stylelint src/features/collapse-repost-chain/@page.less`
  - `npm run build`
- 结果: 通过

#### feat/custom-avatar
- Worktree: `/home/fiver/projects/space-fanfou-custom-avatar`
- Commit: `1f9b478`
- 变更:
  - `src/features/custom-avatar/metadata.js`
  - `src/features/custom-avatar/@page.js`
  - `src/settings/getTabDefs.js`
- 验证:
  - `npx eslint src/features/custom-avatar/@page.js src/features/custom-avatar/metadata.js src/settings/getTabDefs.js`
  - `npm run build`
- 结果: 通过

#### 风险与待人工验证
- `collapse-repost-chain` 的“过长转发链”判断基于文本规则（`// @xxx:` 次数 + 长度阈值），建议在真实时间线多样样本下人工确认阈值是否过严/过宽。
- `custom-avatar` 仅替换可归属到当前登录用户 ID 的头像，建议在「首页 / 他人页 / 我的空间」三类页面人工验证覆盖率与误替换率。

### 9.2 用户反馈后修正（2026-02-25）
- [x] `feat/collapse-repost`：修复“长转发链不明显生效”
  - 放宽触发阈值（2 次转发标记即可触发），兼容全角 `／／`，并在 `onLoad` 主动扫描现有消息
  - 提升按钮可见性（边框、背景、加粗）
  - 新 commit: `74b9f24`
- [x] `feat/word-count-warning`：增强 120+/135+ 阶段视觉对比
  - 计数器字号/字重增强，warning/danger 颜色加强
  - 文本框增加更明显的边框、阴影和背景提示
  - 新 commit: `bf52c22`

## 10. 自定义头像上传修复与方案调研（2026-02-25）
- [x] 在 `feat/custom-avatar` 实现设置页图片上传（非 URL 依赖）
- [x] 实现自动居中裁剪并缩放为 48x48（内部存储可用 96x96 提高清晰度）
- [x] 接入预览与清除按钮，保留开关逻辑
- [x] 页面替换逻辑改为读取本地上传结果并应用
- [x] 在 `feat/custom-avatar` 运行 lint/build 验证并提交
- [x] 调研“自动读取关注用户头像并拼接壁纸”的开源方案，整理可复用路径与风险

### 10.1 Review 结果（2026-02-25）
- `feat/custom-avatar` 新提交: `f008334`
- 关键变更:
  - 新增设置页上传组件 `src/settings/components/CustomAvatarPanel.js`
  - 新增存储常量 `src/features/custom-avatar/constants.js`
  - `custom-avatar` 页面逻辑改为读取 `chrome.storage.local` 头像数据并应用替换
  - 设置页 `getTabDefs` 挂载 `CustomAvatarPanel`
- 验证:
  - `eslint`（自定义头像与设置页相关文件）通过
  - `stylelint src/settings/styles/settings.less` 通过
  - `npm run build` 通过

## 11. Avatar Wallpaper 体验修正（2026-02-25）
- [x] 调整左右头像墙与中间内容区的保留间距（重点：右侧不再贴边）
- [x] 修复“有爱饭友优先”逻辑：有爱饭友固定在前排，非有爱头像继续随机重排
- [x] 运行验证（至少 `eslint` + `npm run build`）并记录结果

### 11.1 Review 结果（2026-02-25）
- 关键改动：
  - `src/features/avatar-wallpaper/avatar-wallpaper@page.js`
    - 新增左右中缝常量：`LEFT_PANE_CENTER_GUTTER = 14`、`RIGHT_PANE_CENTER_GUTTER = 24`
    - `resolveSidePaneWidths()` 按新中缝计算，右侧头像栏远离主内容区，避免贴边
    - `getRenderAvatarUrls()` 改为“有爱饭友固定前排 + 普通头像随机重排”
- 验证：
  - `npx eslint src/features/avatar-wallpaper/avatar-wallpaper@page.js`
  - `npm run build`
- 结果：通过

## 12. 文档更新与头像墙默认策略调整（2026-02-25）
- [x] 更新 `docs/MV3-优化与重构报告.md`，补充 2026.2 已合并功能介绍
- [x] 将 `avatar-wallpaper` 主开关默认值改为关闭（手动开启）
- [x] 运行验证并回填结果

### 12.1 Review 结果（2026-02-25）
- 关键改动：
  - `docs/MV3-优化与重构报告.md`
    - 新增「0. 2026.2 分支已合并功能概览（体验层）」章节，补充草稿保留、字数预警、头像墙能力与默认策略说明。
  - `src/features/avatar-wallpaper/metadata.js`
    - 主开关 `_` 的 `defaultValue` 从 `true` 调整为 `false`（默认关闭，用户手动开启）。
- 验证：
  - `npx eslint src/features/avatar-wallpaper/metadata.js src/features/avatar-wallpaper/avatar-wallpaper@page.js`
  - `npm run build`
- 结果：通过
