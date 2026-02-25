# Manifest V3 迁移与底层重构报告

致原作者团队：

近期我们对项目所在的 `gemini/fix-mv3` 分支进行了现代化重构，以应对 Chrome 全面推行 Manifest V3 (MV3) 标准以及饭否服务端 API 策略的限制。在此期间完成了底层通信模型与鉴权机制的重构。

以下是本次重构涉及的主要改动和解决的问题总结。

---

## 0. 2026.2 分支已合并功能概览（体验层）

在 MV3 底层改造之外，我们已将以下用户侧体验功能合并到当前默认分支 `2026.2`：

1. **输入框草稿自动保留（draft-save）**
   - 输入过程会自动保存草稿，刷新页面后可恢复。
   - 发文成功后自动清空对应草稿，避免历史内容误复用。

2. **输入框字数预警增强（word-count-warning）**
   - 在接近上限和超限阶段，输入框边框与计数器会联动增强提示。
   - 已做更高对比度样式，降低误超字数的概率。

3. **关注头像壁纸（avatar-wallpaper）**
   - 支持读取关注头像生成左右壁纸，并保留中间主阅读区域。
   - 支持有爱饭友优先、蓝色预设（1-10）、透明度调节、仅填缝模式。
   - 根据近期用户反馈，当前改为**默认关闭**，避免对不需要该视觉效果的用户造成打扰；可在设置页手动开启。

---

## 1. 架构升级：Background Page 迁移至 Service Worker

MV3 标准下，常驻的 Background Page 被替换为无 DOM 访问权且会在闲置后（约 30 秒）自动休眠的 Service Worker。

### 遗留问题：跨层通信 (IPC) 死锁
原有的模块架构（基于 `bridge.js` 与 `messaging`）依赖前后端 `postMessage` 长连接通信。在查询好友等场景下，如果后台的 Service Worker 已经进入休眠，`messaging.postMessage` 会因端口断开抛出 Rejected 异常。原逻辑未拦截该异常，导致调用链提前停止执行，前端的 await 挂起，UI 界面在重载前无法操作。

### 优化方案
在 `src/content/environment/bridge.js` 的 `eventHandler` 中增加了 `try-catch` 包裹。若跨层通信抛出异常，不再阻断后续执行，而是将捕获到的异常包装为 error 响应（例如 `Background unavailable`）抛回给前端脚本，前端捕获后会解除 await 锁并重置状态位（如 `hasChecked = false`），确保用户在通信降级时能够重试。

---

## 2. 鉴权策略迭代：弃用无状态抓取，全面接入 OAuth 1.0a

在原架构下，如拉取用户早期的状态时间、验证好友单双向等部分子功能，依赖于前台当前登录域名的 Cookie 并在后台利用无状态 `fetch` 方式或 JSONP 进行跨域提取。

近期 MV3 的跨域策略收紧，加之饭否服务端封锁了 `/users/show.json` 的无状态/JSONP 匿名访问（无 OAuth 签名的请求全部返回 401 Unauthorized 参数错误），之前依赖无签名接口的相关功能大规模失效。

### 优化方案：内部集成 OAuth 配置
将基于 Cookie 原样的抓取策略调整为原生 OAuth 1.0a 流程。
1. **自带配置参数**：项目内部硬编码了来自 `nofan` 开源项目的 Consumer Key / Secret 作为默认应用凭据，并补全了桌面级 Out-Of-Band (OOB) 所需的参数配置（即在获取 Access Token 时将 `oauth_verifier` 降级为 Optional 参数拦截白屏错误）。
2. **简化流程**：用户不再需要手动申请开发者接口，只需在设置页完成跳转授权即可直接走通鉴权链路并获取持久化的 Access Token。

---

## 3. OAuth API 端点协议覆盖 (API Spoofing)

在全面切向 OAuth 接口时，我们遇到了饭否 API 长期存在的一个旧有服务端问题。

### 遗留问题：HTTPS 基准下触发 Invalid Signature
现代浏览器对 `api.fanfou.com` 或者 `/oauth` 都支持原生的 HTTPS 加密访问。然而在实际拼装 OAuth 1.0 的签名串 (Signature Base String) 时，饭否后端的签名计算逻辑依然死板地强制将接收基准 URL 视为 `http://`。若将 `https://api.fanfou.com/...` 送去校验签名，服务端会抛出 401 Invalid Signature。

### 优化方案
在涉及 `fanfouOAuth.request` 的底层网络库垫片中，执行“协议覆盖”策略：在计算 OAuth 签名称要的前置步骤里，强行将目标 URL 从 `https://...` 替换为 `http://...` 以计算正确的 Authorization 头，随后使用还原后的 `https://...` 正常发送实际的网络请求，从而规避了服务端验签失败的缺陷。

---

## 4. Check-Friendship 查询逻辑鲁棒性优化

原先检查双向关注的方案，依赖抓取 HTML 并解析目标的 `friends` 和 `followers` 翻页视图。该路径受限于接口分页深度，在查询大数据量用户时效率偏低或经常出现超时未捕获情况。

在新版本中我们转以直接调用官方定义的 `GET /friendships/show.json`，但也修复了下述底层 API 异常：

### 遗留问题：URL 双重编码与 Login Name 拒收
1. **中文 ID 乱码报错**：`getCurrentPageOwnerUserId` 在读取 `window.location.pathname` 路由信息后，未进行 `decodeURIComponent` 解码。当用户的 ID 为中文等非 ASCII 字符时，此字符片段被传递到下游 OAuth 发包器后会被触发二次 URL 编码，引发饭否 API 误报未找到用户。
2. **特定的纯字母 ID 拒收**：部分用户采用自定义的老式字母 login name（如 `kesikesi`），即便编码正确，在送进 `friendships/show.json` 的 `target_id` 参数时，也会有概率不被合法解析，抛出接口异常。

### 优化方案：解码与双发探测
1. **注入解码器**：重构 `getCurrentPageOwnerUserId`，包裹 `decodeURIComponent` 执行严格提取。
2. **两步 ID 获取保障**：修改 `checkFriendship` 请求流。在访问关系检测端点前，必定隐式调用一次相对宽容的 `users/show.json?id=目标名称` 端点提取到该对象的原生底层 ID（格式如 `id: "~xxxxxx"`），以统一的高维 ID 作为 `target_id` 请求最终的关系校验接口。

---

这份基础架构重构报告整理自最新的迭代开发环节，希望能让你们在了解这段历史的重写时保持连贯。感谢开发出了如此优秀的基础设施。
