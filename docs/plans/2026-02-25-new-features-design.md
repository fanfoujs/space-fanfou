# 新功能设计草案

> 讨论日期：2026-02-25

---

## 1. 字数预警可视化

**目标**：在接近饭否 140 字上限时给用户视觉反馈。

**设计**：
- 输入框边框在字数接近上限时渐变颜色（如 120+ 变黄，135+ 变红）
- 现有字数计数器数字同步变色
- 实现位置：`src/features/status-form-enhancements/`

---

## 2. 草稿自动保存

**目标**：防止误关标签页导致未发送内容丢失。

**设计**：
- 用户在输入框打字时，内容实时写入 `localStorage`
- 下次打开饭否页面时，若检测到未清除的草稿，自动恢复到输入框并提示
- 发帖成功后清除草稿
- 实现位置：`src/features/status-form-enhancements/`（新增 `draft-save@page.js`）

---

## 3. 消息折叠/展开

**目标**：转发链过长时自动折叠，保持时间线整洁。

**设计**：
- 超过一定层数（默认 2 层）的转发链自动折叠，显示「展开 N 层转发」按钮
- 点击按钮展开完整转发链
- 实现位置：新增 `src/features/collapse-repost-chain/`

---

## 4. 自定义头像（本地版）

**目标**：饭否官方已关闭修改头像功能，允许用户在本地替换自己显示的头像。

**设计**：
- 用户在插件设置页填入一个自定义头像图片 URL
- 插件将 URL 存入 `chrome.storage.local`
- 页面渲染时将当前登录用户的所有头像 `<img>` 替换为自定义 URL
- **仅本人可见**（无后端，无需他人安装插件）
- 实现位置：新增 `src/features/custom-avatar/`

---

## 5. 关注者头像壁纸

**目标**：将「我的关注」的头像自动拼合成平铺壁纸，作为饭否页面背景。

### 效果
- 48×48px 正方形头像密铺，CSS `background-repeat: repeat` 无缝平铺
- 可选：为每个头像添加圆形裁切边框

### 技术流程

```
OAuth Token
  → Fanfou API /friendships/friends（分页，最多 3 次请求）
  → 收集所有头像 URL
  → Background Script fetch 各图片（绕过 CORS）→ 转为 data URL
  → Canvas 按 N×M 网格绘制（48×48px/格）
  → 导出为 PNG data URL
  → chrome.storage.local 缓存
  → Content Script 注入 CSS：body { background-image: url(...); background-size: 48px; }
```

### 选项
| 选项 | 说明 |
|------|------|
| 圆形边框 | 开启后头像以圆形裁切显示 |
| 壁纸透明度 | 默认较低透明度，避免干扰阅读 |
| 手动刷新 | 设置页提供「重新生成壁纸」按钮 |
| 自动刷新周期 | 每 N 天自动重新抓取（默认 7 天） |

### 缓存策略
- 生成结果存入 `chrome.storage.local`（key: `avatarWallpaper`）
- 超过设定天数或手动触发时重新生成
- 生成过程在 Background Service Worker 中执行，不阻塞页面

### 实现位置
新增 `src/features/avatar-wallpaper/`：
- `metadata.js`
- `fetch-avatars@background.js` — 调 API + 抓图片
- `render-canvas@background.js` — Canvas 拼图逻辑
- `apply-wallpaper@content.js` — 注入 CSS 背景
- `avatar-wallpaper@content.less`

---

## 优先级建议

| 功能 | 复杂度 | 优先级 |
|------|--------|--------|
| 字数预警可视化 | 低 | ⭐⭐⭐ |
| 草稿自动保存 | 低 | ⭐⭐⭐ |
| 消息折叠/展开 | 中 | ⭐⭐ |
| 自定义头像（本地） | 低 | ⭐⭐ |
| 关注者头像壁纸 | 中高 | ⭐⭐⭐ |
