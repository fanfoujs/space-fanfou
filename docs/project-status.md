# 项目状态总览

> 最后更新：2026-02-23

## 分支关系图

```
upstream/main (e206891, MV2 上游，已停滞)
    │
    └── main (origin/main，与上游同步，不含 MV3 改动)
            │
            └── gemini/fix-mv3 ◄─── 当前活跃主干，+36 commits
                    │
                    ├── (分叉点 3ea8efb) ──► claude/fix-sidebar-friendship-e2e
                    │                           └── +9 commits（sidebar/friendship 修复）
                    │
                    └── codex/playwright-extension-test（从 gemini 早期分出，+32 commits）

main ──► modernization（构建系统现代化探索，+7 commits，状态不明）
```

---

## 各分支详情

### `main`（上游镜像）

| 项目 | 内容 |
|------|------|
| 最新提交 | `e206891` 细节调整 |
| 性质 | 上游 MV2 版本，仅用于追踪上游变化 |
| 状态 | 不在此分支开发 |

---

### `gemini/fix-mv3`（主开发分支，当前 HEAD）

| 项目 | 内容 |
|------|------|
| 最新提交 | `481924b` feat: 内置 nofan consumer key |
| 领先 main | +36 commits |
| 工作树 | `/home/fiver/projects/space-fanfou`（主目录） |

**主要里程碑**（近期）：
- `481924b` 内置饭否 consumer key，一键授权
- `13c7de8` MV3 迁移审核报告 & 修复计划文档
- `acac720` P0 JSONP restore + P1 check-friendship rollback

**工作区未提交改动**：
```
M  .gitignore       ← 新增 tasks/ 等忽略规则（待提交）
M  CLAUDE.md        ← 今日重构（待提交）
M  jest.config.js   ← 修改（待提交）
?? CLAUDE copy.md
?? docs/plans/2026-02-21-builtin-oauth-key.md
?? fanfou账号
?? image copy 3.png
?? img/
?? tasks/
```

---

### `claude/fix-sidebar-friendship-e2e`（工作树分支）

| 项目 | 内容 |
|------|------|
| 最新提交 | `b24347b` fix: 改用 proxiedFetch 调 api.fanfou.com |
| 工作树 | `/home/fiver/projects/space-fanfou/.worktrees/fix-sidebar-friendship` |
| 分叉点 | `3ea8efb`（与 gemini 共同祖先）|
| 独有提交 | +9 commits（相对于 gemini） |
| 落后 gemini | 3 commits（gemini 有新增，尚未合并） |

**独有提交主要内容**：
- `proxiedFetch` 调用 `api.fanfou.com` 获取他人注册时间
- JSONP 降级方案 + 饭香 fallback 修复
- `getCount` 选择器限定到 `#user_stats`，防止误匹配
- `decodeURIComponent` 修复中文用户 ID 匹配失败
- `check-friendship` 修复（`/followers/p.N` URL + hasChecked 重试）

**落后的 3 个 gemini 提交**（未合并进此分支）：
```
481924b feat: 内置 nofan consumer key
13c7de8 docs: MV3 迁移审核报告
acac720 fix: P0 JSONP restore + P1 check-friendship rollback
```

> **待决策**：此分支工作是否需要合并回 gemini？两者对 sidebar-statistics 的修法不同（见下方对比）。

---

### `codex/playwright-extension-test`（独立工作树）

| 项目 | 内容 |
|------|------|
| 最新提交 | `35046f4` feat: add oauth integration report |
| 工作树 | `/home/fiver/projects/space-fanfou-playwright-test` |
| 领先 main | +32 commits |

**背景**：Codex 主导的 Playwright e2e 测试基础设施探索，包含 OAuth 集成报告。与 gemini 分支独立演进，目前未合并。

---

### `modernization`（暂停）

| 项目 | 内容 |
|------|------|
| 最新提交 | `185088f` fix: 暂时移除 page script 注入以解决 MIME 类型错误 |
| 领先 main | +7 commits |
| 工作树 | 无 |

**背景**：构建系统现代化探索（Phase 1 规划 → Phase 2 构建迁移 → Phase 3 基础设施），遇到循环依赖和 MIME 问题后暂停。目前无活跃开发。

---

## 关键冲突：sidebar-statistics 两种修法

`claude` 与 `gemini` 分支对 `sidebar-statistics` 的修法**存在分歧**：

| | claude 分支 | gemini 分支（acac720） |
|---|---|---|
| 方法 | `proxiedFetch` → `api.fanfou.com` | 回退 JSONP 原版方案 |
| 失败降级 | 多层 fallback | 显示"API 不可用" |
| 状态 | 未经真实 Chrome 验证 | 未经真实 Chrome 验证 |

**两者均未经过真实 Chrome + cookie 环境验证**，合并前需先人工测试。

---

## 工作树汇总

| 路径 | 分支 | HEAD |
|------|------|------|
| `/home/fiver/projects/space-fanfou` | `gemini/fix-mv3` | `481924b` |
| `/home/fiver/projects/space-fanfou-playwright-test` | `codex/playwright-extension-test` | `35046f4` |
| `/home/fiver/projects/space-fanfou/.worktrees/fix-sidebar-friendship` | `claude/fix-sidebar-friendship-e2e` | `b24347b` |

---

## 下一步建议

1. **提交当前工作区**（gemini 主目录）：.gitignore、CLAUDE.md、jest.config.js 均有未提交改动
2. **验证 sidebar-statistics**：在真实 Windows Chrome 加载 `dist/`，确认哪种修法实际可用
3. **整合决策**：claude 分支的 check-friendship 修复已验证通过，可考虑 cherry-pick 到 gemini
4. **modernization 分支**：评估是否继续，或放弃（目前无进展且方向不明）
