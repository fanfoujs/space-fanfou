# 饭否扩展 Bug 修复上下文报告 (交接给 Codex)

本文件总结了近期针对饭否 Chrome 扩展项遇到的 2 个顽固 UI/注入 Bug 的背景信息、修复尝试以及失败分析。请 Codex 查阅此上下文并接手修复。

## 目标一：具体回复页面 `#PopupBox` 缺失动态图片上传按钮

### 1. 现象说明
在具体的推文状态页面（如 `https://fanfou.com/statuses/bHOFTeGkwxQ`），点击他人的回复按钮时，会弹出一个包含输入框的 `#PopupBox` 原生弹窗。我们期望像在主页一样，在发送按钮左侧挂载一个照相机图标（`.sf-upload-button`）支持上传图片。
**目前该按钮在该特定页面并没有出现。**

### 2. 代码位置
主要逻辑位于 `src/features/status-form-enhancements/ajax-form@page.js`。

### 3. 先前尝试与失败分析
- **我们做了什么**：我们目前在 `ajax-form@page.js` 底部使用了一个全局 `MutationObserver` 监听 `document.body`，寻找 `mutations.addedNodes` 里是否有 `#PopupBox` 或者寻找 `mutation.target.id === 'PopupBox'`。
- **为何失败**：
  在具体的 `/statuses/xxx` 页面，Fanfou 的前端逻辑可能并不是动态 append 一个新的 `<div id="PopupBox">`，而是这玩意常驻在 HTML 中处于隐藏状态。点击回复时，饭否可能是通过 `$('#PopupBox').html(htmlString)` 或者类似手段重新拼装内部的 form，然后调用 `show()`。
  我们的 Observer 虽然加上了对 `mutation.target` 自身是否是 `#PopupBox` 的判断，并在有变动时去查 `querySelector('form')` 并执行 `injectUploadButton(form)`，但似乎因为时序、或框架导致事件漏判。
- **建议给 Codex 的思路**：
  针对具体状态页可以考虑拦截原生函数的调用或者更暴力的监听。或者直接检查 `#PopupBox form:not([data-sf-upload-injected])`，不仅依赖 MutationObserver，还可以结合原生事件（比如监听所有的 click 事件，如果点击了 `.reply` 按钮，就加个短轮询 `setInterval(..., 100)` 去检测表单并注入）。

---

## 目标二：首页头像壁纸布局对齐与列数对称

### 1. 现象说明
在启用了“头像壁纸”特性后的主页（或者其他页面），中间的主要信息流 `div#container` 两旁会悬浮网格状的粉丝头像。
- 左侧有 6 列头像，右侧却有 7 列（因屏幕分辨率不同可能引发数字不一，但总而言之一侧比另一侧多一列）。
- 左右壁纸面板距离中心 `div#container` 的缝隙不一致（左侧刚好贴边，右侧缝隙过大或过小，未对齐）。

### 2. 代码位置
涉及两块：
- JS 侧：`src/features/avatar-wallpaper/avatar-wallpaper@page.js`
- 样式侧：`src/features/avatar-wallpaper/avatar-wallpaper@page.less`

### 3. 先前尝试与失败分析
- **初始逻辑**：JS 计算 `left = rect.left - 14`, `right = viewportWidth - rect.right - 14`，作为左右两个 Panel (`right: 0` 和 `left: 0`) 的固定宽度。然后根据各自的宽度 `paneWidth` 除以头像砖块大小算出列数 `capacity`。
- **为何失败**：因为 `viewportWidth` (可能是 `window.innerWidth`) 包含了原生滚动条（Scrollbar）宽度。这就使得计算出的右侧可用空间人为偏大，容纳了比如 7 列，而左侧只能容纳 6 列。
- **近期修改**：我们在 JS 强制让 `paneWidth = Math.min(left, right)`，并且将左右 Pane 的 CSS width 都硬设为了这个最小值。这导致左侧完美对齐（左靠左），但右侧因为 `right: 0; width: minValue`，直接缩水，导致其左边缘（也就是靠近中心内容区的那一边）大幅度向屏幕右侧退缩，酿成了巨大的“中间空白不对齐”。
- **建议给 Codex 的思路**：
  不要强行统一 `leftPane` 和 `rightPane` 的 CSS Width。
  `leftPane` 的 width 就应该是它真实的可用空间，`rightPane` 的 width 也是真实的右侧空间。
  但是，**用来计算 CSS Grid 大小以及请求多少头像的列数 (columns)** 必须是双方的 **最小值**（即 `Math.min(leftCols, rightCols)`）。
  通过在 JS 计算出统一相同的 `minColumns` 后，把这个变量设置到根节点的 CSS Variables `--sf-avatar-wallpaper-columns`。
  然后在 LESS 中，使用 `grid-template-columns: repeat(var(--sf-avatar-wallpaper-columns), var(--sf-avatar-wallpaper-tile-size))`。
  并在排版上，左 Pane 使用 `justify-content: end;`（靠右吸附中心区），右 Pane 使用 `justify-content: start;`（靠左吸附中心区）。这样无论左右框体具体多宽，它们的内部头像矩阵是绝对对称、并紧贴中心白条的。
