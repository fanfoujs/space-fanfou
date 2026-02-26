# 项目状态文档

> 更新时间：2026-02-26  
> 分支：`2026.2`  
> HEAD：`2b5e5a8`

## 1. 当前总体状态

- 项目处于活跃开发中，工作区为脏状态（包含多条功能线并行修改）。
- 头像墙「羊了个羊模式」已完成四轮迭代，当前重点从“规则可玩”转向“视觉拟真与可读性”。
- 状态发布增强（`status-form-enhancements`）相关文件也有在途改动，尚需统一回归验证。

## 2. 已完成的核心进展

### 2.1 头像墙羊模式

- 消除元素改为随机抽取关注列表中的 13 位用户，做到“1 类型 = 1 用户头像”。
- 槽位规则稳定为 7 格，支持三连消、失败、通关状态。
- 页面底部布局已调整为：
  - 左下：集卡槽
  - 右下：`反悔` / `打乱` / `重开`
- 已加入轻量遮挡关系（`base + overlay`），只允许点击未被覆盖的顶层牌。
- 入槽飞行动画可用，落点索引已修正，减少视觉错位。

### 2.2 本轮视觉纠偏（最新）

- 移除半透明下层预览层，避免“发灰、发脏”的叠影观感。
- 改为“清晰顶牌 + 堆叠厚度阴影”表达层级，读牌更清楚。
- 卡槽容器保持圆形并裁切，头像不再出现挤压/溢出感。
- 堆叠布局从“全网格填满”改为“簇状分布 + 稀疏覆盖层”。

## 3. 当前工作区状态（未提交）

### 3.1 已修改文件（Tracked）

- `AGENTS.md`
- `docs/project-status.md`
- `package.json`
- `playwright-report/index.html`
- `src/features/avatar-wallpaper/avatar-wallpaper@page.js`
- `src/features/avatar-wallpaper/avatar-wallpaper@page.less`
- `src/features/avatar-wallpaper/metadata.js`
- `src/features/status-form-enhancements/ajax-form@page.js`
- `src/features/status-form-enhancements/misc@page.less`
- `src/features/status-form-enhancements/textarea-state@page.js`
- `tasks/lessons.md`
- `tasks/todo.md`

### 3.2 新增未跟踪文件（Untracked）

- `debug-ajax-form.js`
- `tasks/popupbox-wallpaper-context.md`
- `tests/playwright/status-form.spec.ts`

## 4. 验证状态

本轮与头像墙相关改动已完成基础验证：

- `npx eslint src/features/avatar-wallpaper/avatar-wallpaper@page.js src/features/avatar-wallpaper/metadata.js` 通过
- `npx stylelint src/features/avatar-wallpaper/avatar-wallpaper@page.less` 通过
- `npm run build` 通过

说明：

- 仍存在仓库级提示（如 baseline-browser-mapping 版本提醒、stylelint 旧规则 deprecation 提示），不影响本次功能通过。

## 5. 风险与待办

- 羊模式已是“轻量拟真”，但仍非原版那种预置关卡脚本与难度曲线。
- `status-form-enhancements` 在途改动需安排单独回归，避免与头像墙改动交叉引入回归。
- 当前工作区改动面较大，建议后续按功能分批提交，降低审查和回滚成本。

## 6. 建议的下一步

1. 做一次人工体验验收（首页 + 状态页），重点确认堆叠可读性与误触率。  
2. 为羊模式补一组固定关卡种子（简单/普通/困难）作为可重复调优基线。  
3. 对 `status-form-enhancements` 跑专项回归并补齐 Playwright 用例后再合并。  
