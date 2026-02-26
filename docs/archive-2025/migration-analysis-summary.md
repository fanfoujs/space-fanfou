# 太空饭否 Manifest V3 迁移战略决策摘要

**生成日期**: 2025-11-10
**决策建议**: 基于当前版本，移除问题代码，快速修复

---

## 📊 核心诊断结果

### 三个版本对比

| 版本 | 路径 | 图片上传状态 | 关键差异 |
|------|------|------------|---------|
| **原版 (MV2)** | https://github.com/fanfoujs/space-fanfou | ✅ **正常工作** | 简单逻辑，无 attachmentStore |
| **备份版本 (MV3)** | `/home/fiver/projects/space-fanfou-backup-20251107_135643` | ❌ **失败** | 无 attachmentStore，有防御性检查 |
| **当前版本 (MV3)** | `/home/fiver/projects/space-fanfou` (commit 3a3c5c0) | ❌ **失败** | 有 attachmentStore + setAttribute |

### 根本原因分析

根据详细代码对比，图片上传失败的**最可能原因**：

#### 🔴 原因 1: `setAttribute('value')` 导致浏览器状态冲突

**位置**: [fix-dnd-upload@page.js:142](../src/features/status-form-enhancements/fix-dnd-upload@page.js#L142)

```javascript
updateBase64.value = base64  // ✅ 设置 property（正确）
updateBase64.setAttribute('value', base64)  // ❌ 重复设置 attribute（问题）
```

**问题**:
- `<input>` 的 `value` property 和 `value` attribute 是不同的
- 重复设置可能导致浏览器内部状态不一致
- 原版只设置 property，工作正常
- **当前版本和备份版本都没有这行代码的必要性**

**证据**:
- 原版 (MV2) 工作正常，且没有 `setAttribute`
- 备份版本也失败了，但它同样没有 `setAttribute`（说明这不是唯一原因）

---

#### 🔴 原因 2: `attachmentStore` 引入的逻辑混乱

**位置**: [ajax-form@page.js:100-149](../src/features/status-form-enhancements/ajax-form@page.js#L100-L149)

**原版逻辑（清晰）**:
```javascript
// 拖放上传 → base64 存储在 photo_base64 字段
// 文件选择 → File 对象存储在 picture 字段
// 两者互斥，提交时自动选择正确的上传方式
```

**当前版本逻辑（混乱）**:
```javascript
// 拖放上传 → 同时设置 photo_base64 和存储 File 到 attachmentStore
updateBase64.value = base64  // 设置 base64
setAttachment({ file, ... })  // 存储 File 对象

// 提交时
const attachmentFile = domAttachment || storedAttachment?.file || null
if (attachmentFile) {
  formDataJson.picture = attachmentFile
  formDataJson.photo_base64 = null  // 🔴 清空 base64！
}
```

**问题**:
- 拖放上传时，转换的 base64 被**丢弃**
- 优先使用 File 对象，但 File 对象可能在异步操作后失效
- **attachmentStore 的引入没有解决问题，反而引入了新问题**

---

#### 🔴 原因 3: 备份版本失败的可能原因

备份版本与原版几乎相同，但为什么也失败？

**可能性 A**: `textarea.focus()` 时机问题
```javascript
// 备份版本
textarea.focus()  // ⚠️ 在异步操作之前
const base64 = await blobToBase64(file)
updateBase64.value = base64  // 可能被浏览器忽略
```

**可能性 B**: try-catch 改变了执行流程
```javascript
// 原版：直接执行，没有 try-catch
updateBase64.value = await blobToBase64(file)

// 备份版本：包裹在 try-catch 中
try {
  const base64 = await blobToBase64(file)
  updateBase64.value = base64
} catch (error) {
  console.error(...)
}
```

**可能性 C**: 防御性检查产生副作用
```javascript
// 备份版本新增的检查
if (!message || !action || !textarea || !uploadFilename || !updateBase64) {
  console.error(...)
  return  // ⚠️ 提前返回可能影响后续流程
}
```

---

## 🎯 战略决策

### ✅ 推荐方案：基于当前版本修复

**理由**:
1. ✅ Git 历史清晰，易于追踪修改
2. ✅ MV3 核心问题（alarms、DOM 解析）已修复
3. ✅ 保留了有价值的改进（try-catch-finally）
4. ✅ 只需移除问题代码，无需大规模重写

### ❌ 不推荐方案：基于备份版本

**理由**:
1. ❌ 备份版本同样失败，证明问题不在 attachmentStore
2. ❌ 缺少当前版本的一些修复（如 refreshToken 错误处理）
3. ❌ 需要额外分析为什么备份版本也失败

---

## 🔧 修复步骤（按优先级）

### 阶段 1: 快速验证（5 分钟）

#### 步骤 1.1: 移除 `setAttribute('value')`

**文件**: `src/features/status-form-enhancements/fix-dnd-upload@page.js`

```diff
  const base64 = await blobToBase64(file)
  updateBase64.value = base64
- updateBase64.setAttribute('value', base64)  // 删除这行
```

**测试**: 拖放上传图片，检查是否成功

---

### 阶段 2: 移除 attachmentStore（如果阶段 1 失败）

#### 步骤 2.1: 恢复 `ajax-form@page.js` 为原版逻辑

**文件**: `src/features/status-form-enhancements/ajax-form@page.js`

```diff
  function extractFormData() {
    const form = elementCollection.get('form')
-   const storedAttachment = getAttachment()
-   const domAttachment = form.elements.picture.files[0]
-   const attachmentFile = domAttachment || storedAttachment?.file || null

    let formDataJson = {
      ajax: 'yes',
      token: form.elements.token.value,
      action: form.elements.action.value,
      content: form.elements.content?.value,
      desc: form.elements.desc?.value,
      photo_base64: form.elements.photo_base64.value,
-     picture: domAttachment,
+     picture: form.elements.picture.files[0],
      // ...
    }

-   if (attachmentFile) {
-     formDataJson.picture = attachmentFile
-     formDataJson.photo_base64 = null
-     formDataJson.desc = formDataJson.desc || formDataJson.content || ''
-     formDataJson.action = API_ACTION_UPLOAD_IMAGE
-   }

    // ... 原版后续逻辑
  }
```

#### 步骤 2.2: 移除 attachmentStore 导入

**文件**:
- `src/features/status-form-enhancements/fix-dnd-upload@page.js`
- `src/features/status-form-enhancements/ajax-form@page.js`
- `src/features/status-form-enhancements/fix-upload-images@page.js`

```diff
- import { setAttachment, getAttachment, clearAttachment } from './attachmentStore'
```

#### 步骤 2.3: 删除 attachmentStore 文件

```bash
rm src/features/status-form-enhancements/attachmentStore.js
```

---

### 阶段 3: 调整 `textarea.focus()` 时机（如果阶段 2 仍失败）

**文件**: `src/features/status-form-enhancements/fix-dnd-upload@page.js`

```diff
- textarea.focus()  // 删除这行

  const base64 = await blobToBase64(file)
  updateBase64.value = base64

+ textarea.focus()  // 移到最后
```

---

### 阶段 4: 添加调试日志（如果以上都失败）

**文件**: `src/features/status-form-enhancements/ajax-form@page.js`

```javascript
function extractFormData() {
  const form = elementCollection.get('form')
  let formDataJson = { ... }

  // 调试日志
  console.log('[DEBUG] extractFormData:', {
    hasPhotoBase64: !!formDataJson.photo_base64,
    photoBase64Length: formDataJson.photo_base64?.length || 0,
    hasPicture: !!formDataJson.picture,
    pictureSize: formDataJson.picture?.size || 0,
    pictureName: formDataJson.picture?.name || '',
  })

  return { isImageAttached, formDataJson }
}

function performAjaxRequest(url, formDataJson, isImageAttached, ...) {
  const formData = objectToFormData(formDataJson)

  // 调试日志
  for (const [key, value] of formData.entries()) {
    console.log(`[DEBUG] FormData[${key}]:`, {
      type: typeof value,
      isFile: value instanceof File,
      size: value?.size,
      name: value?.name,
    })
  }

  // ... 后续逻辑
}
```

---

## 📝 测试计划

### 测试用例 1: 拖放上传
1. 拖放一张图片（<2M）到输入框
2. 查看控制台是否有错误
3. 点击发送
4. **预期**: 上传成功

### 测试用例 2: 文件选择上传
1. 点击上传按钮
2. 选择一张图片（<2M）
3. 点击发送
4. **预期**: 上传成功

### 测试用例 3: 粘贴上传
1. 复制一张图片
2. 在输入框中粘贴
3. 点击发送
4. **预期**: 上传成功

---

## 🔄 回滚策略

如果修复失败，逐步回滚：

1. **回滚到 commit 1337e68** (Service Worker 定时器修复)
   ```bash
   git reset --hard 1337e68
   ```

2. **对比备份版本和当前版本的详细差异**
   ```bash
   diff -r /home/fiver/projects/space-fanfou-backup-20251107_135643/src/features/status-form-enhancements \
           /home/fiver/projects/space-fanfou/src/features/status-form-enhancements
   ```

3. **从原版仓库复制上传相关文件**
   ```bash
   git clone https://github.com/fanfoujs/space-fanfou /tmp/space-fanfou-original
   cp /tmp/space-fanfou-original/src/features/status-form-enhancements/*.js \
      /home/fiver/projects/space-fanfou/src/features/status-form-enhancements/
   ```

4. **暂时回退到 Manifest V2**（最后手段）

---

## 🎓 关键教训

### 1. 保持简单 (KISS 原则)

原版的逻辑已经很清晰：
- 拖放 → base64
- 选择 → File

不需要引入额外的复杂度（attachmentStore）。

### 2. 最小化改动

MV3 迁移主要影响 **Background Scripts**（Service Worker）。

**Page Scripts 不受影响**，不应该在迁移过程中修改。

### 3. 防御性编程的陷阱

过度的防御性检查（try-catch、提前 focus、元素检查）可能：
- 改变执行流程
- 引入新的 bug
- 掩盖真实问题

### 4. 了解浏览器行为

- `input.value` (property) vs `input.setAttribute('value')` (attribute)
- File 对象的生命周期
- FormData 的序列化机制

这些细节决定了代码是否能正确工作。

---

## 📚 参考资料

### 官方文档
- [Chrome Extension Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [chrome.alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/)

### 项目文档
- [详细分析报告](./migration-analysis.md) - 完整的三版本对比
- [架构文档](./architecture.md) - 项目架构说明
- [CLAUDE.md](../CLAUDE.md) - 项目指南

---

## 🚀 下一步行动

### 立即执行（现在）

1. 在当前版本上修改 `fix-dnd-upload@page.js`
2. 删除 `updateBase64.setAttribute('value', base64)` 这一行
3. 运行 `npm run dev`
4. 在浏览器中测试拖放上传

### 如果成功

1. 提交修改：`git commit -m "fix: remove setAttribute for updateBase64 to fix image upload"`
2. 测试所有三种上传方式
3. 运行 `npm test` 确保没有回归
4. 考虑是否需要移除 attachmentStore

### 如果失败

1. 继续执行阶段 2：移除 attachmentStore
2. 对比网络请求中的 FormData 内容
3. 添加详细日志诊断问题

---

**决策总结**: 基于当前版本，优先移除 `setAttribute`，如失败则移除 attachmentStore，恢复原版简单逻辑。

**预期结果**: 图片上传功能恢复正常，MV3 核心功能保持工作。

**风险评估**: 低风险 - 主要是删除代码，不改变核心逻辑。
