# 饭否OAuth应用申请模板

## 申请步骤

### 1. 访问V2EX饭否论坛
https://www.v2ex.com/go/fanfou

### 2. 发布新主题

**标题**：
```
申请饭否应用 - 太空饭否 Chrome 扩展
```

**正文**：
```
你好，我想为太空饭否 Chrome 扩展申请一个饭否应用，用于获取用户注册时间。

应用信息：
- 应用名称：太空饭否（Space Fanfou）
- 应用类型：Chrome 浏览器扩展（开源项目）
- GitHub：https://github.com/fanfoujs/space-fanfou
- Chrome 商店：https://chromewebstore.google.com/detail/太空饭否/pcdccnooldbkdmoikbolgdpjnlplhond
- 用户数量：约 1000+ 用户
- 回调地址：oob（Out Of Band，手动输入PIN码）

使用场景：
太空饭否的「统计信息」功能需要通过 OAuth API 获取用户的真实注册时间（created_at 字段），
以便在侧边栏显示准确的「饭龄」统计数据。目前饭否网页不显示此信息，API是唯一可靠的数据源。

API 权限需求：
- users/show.json（只读，获取用户公开资料）

隐私说明：
- 仅读取用户公开资料，不涉及隐私数据
- 所有 OAuth Access Token 存储在用户浏览器本地
- 开源透明，代码可在 GitHub 审计

Consumer Key/Secret 用途：
- 硬编码在扩展代码中（按照第三方客户端惯例）
- 用户首次使用时需授权（类似饭否官方移动客户端）
- Access Token 永久有效，用户无需重复授权

谢谢！
```

### 3. 等待审核

- 审核时间：通常 1-7 天（非官方统计）
- 关注V2EX通知

### 4. 审核通过后

1. 访问饭否应用管理：http://fanfou.com/apps
2. 找到你的应用
3. 记录以下信息：
   - **Consumer Key**（公开，类似：`abc123def456`）
   - **Consumer Secret**（保密，类似：`xyz789uvw012`）

4. 将凭据通过GitHub Issue私密方式发送给项目维护者，或：
   - Fork 项目
   - 在 `src/background/modules/fanfouOAuth.js` 中填入凭据
   - 提交Pull Request（注意：Secret会公开在代码中）

### 5. 测试

1. 在本地构建扩展
2. 访问饭否用户主页
3. 侧边栏统计信息应显示真实注册时间

## 注意事项

### Consumer Secret 的安全性

**问题**：Secret 会硬编码在开源代码中，是否有风险？

**答**：
- ✅ 第三方客户端广泛使用此模式（如安能饭否）
- ✅ 只读权限（users/show），风险较低
- ⚠️ 理论上可被滥用，但实际影响有限
- ✅ 饭否API有速率限制，防止恶意调用

**最佳实践**：
- 定期检查API调用日志
- 如发现滥用，在饭否后台撤销应用权限
- 重新申请新的Consumer Key/Secret

### 其他开源扩展的做法

参考其他开源浏览器扩展的OAuth实现：
- Tampermonkey：提供用户自配置选项
- Greasemonkey：硬编码凭据（类似方案）
- OneTab：使用代理服务器保护Secret

太空饭否选择硬编码方案的原因：
1. 用户配置门槛太高（大部分用户不会使用）
2. 代理服务器需要额外维护成本
3. 第三方客户端已证明此方案可行

## FAQ

### Q: 为什么不让用户自行申请凭据？
A: 技术门槛太高，99%的用户不会操作。硬编码凭据可以提供"开箱即用"的体验。

### Q: Secret 泄露会有什么后果？
A: 恶意用户可以使用太空饭否的凭据调用饭否API。但由于只有只读权限（users/show），影响有限。饭否API也有速率限制。

### Q: 能否使用代理服务器保护Secret？
A: 可以，但需要额外的服务器维护成本（约$5-10/月）。对于只读API来说，投入产出比较低。

### Q: 审核被拒怎么办？
A: 可以：
1. 修改申请理由，强调开源透明
2. 联系饭否官方账号询问原因
3. 最后手段：使用默认值 2010-01-01（当前实现）

## 相关链接

- V2EX 饭否论坛：https://www.v2ex.com/go/fanfou
- 饭否应用管理：http://fanfou.com/apps
- 饭否OAuth文档：https://github.com/FanfouAPI/FanFouAPIDoc/wiki/Oauth
- 太空饭否GitHub：https://github.com/fanfoujs/space-fanfou
