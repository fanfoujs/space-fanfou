# 架构

### 太空饭否分为哪几个部分？

太空饭否分为四个部分：

- Background Scripts - 扩展的背景页面脚本
- Content Scripts - 通过 manifest.json 中 `content_scripts` 部分声明的脚本
- Page Scripts - 上面 Content Scripts 通过 `<script />` 注入到页面的脚本，和网站自身脚本处于同一执行环境
- Settings - 设置页面

以上四部分的 webpack entry 文件位于 `src/entries` 目录中，而前三者共用了同一个 entry 文件。原因是，它们都负责实现太空饭否的各种功能，因此会引用 `src/features` 中的文件，共用一个 entry 可以避免重复打包这部分代码。

### Background Scripts 是做什么的？

部分功能如检查是否有新 @ 提醒需要持续运行，所以放置在 Background Scripts 中。这部分不能直接与饭否页面接触。

### Content Scripts 和 Page Scripts 是做什么的？

负责在饭否网页上实现太空饭否的样式与功能，即与页面接触的部分。这两者实际上是非常相似的，但是也存在一些差别。

### 为什么同时存在 Content Scripts 和 Page Scripts？

一般情况下，修改页面或添加内容以实现功能，只需要 Content Scripts 就足够了。但是太空饭否某些功能必须调用饭否页面的 JS 接口才可以实现（比如要用到 jQuery 和 YUI 来禁用掉饭否原有的一些功能）。但是 Content Scripts 是在一个隔离的环境中执行的，无法访问页面这一侧的对象，也就无法调用饭否自己的 JS 接口。而 Page Scripts 就没有了这些限制。

此外，Content Scripts 还有一个缺点是，脚本改动后，必须重启扩展才能生效。而 Page Scripts 没有这个问题。

但是 Page Scripts 也不完美：

1. 不能像 Content Scripts 那样通过 Chrome 扩展 API 和 Background Scripts 通信。解决的办法是，利用 `CustomEvent` 实现了一个桥，先和 Content Scripts 通信，然后再由后者负责转发到 Background Scripts；Background Scripts 作出回复后再由 Content Scripts 转发给 Page Scripts。

2. Content Scripts 通过 `<script />` 把 Page Scripts 注入到页面后，后者总是会至少延迟数百毫秒才开始执行。如果是对加载速度比较敏感的需求（比如要修改页面样式），则会受到影响。因此这类需求往往在 Content Scripts 中实现。

因为 Content Scripts 改动后必须重启扩展才能生效，会影响到开发效率，所以对于二者皆可的情况，一般优先选择 Page Scripts。

待续……
