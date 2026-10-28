<img src="https://raw.githubusercontent.com/fanfoujs/space-fanfou/master/static/icons/icon-256.png" alt="太空饭否 logo" align="right" width="82px" />

# 太空饭否

[![](https://github.com/fanfoujs/space-fanfou/workflows/Node%20CI/badge.svg)](https://github.com/fanfoujs/space-fanfou/actions)
[![](https://img.shields.io/github/release/fanfoujs/space-fanfou.svg)](https://github.com/fanfoujs/space-fanfou/releases)
[![](https://img.shields.io/github/license/fanfoujs/space-fanfou.svg)](https://github.com/fanfoujs/space-fanfou/blob/master/LICENSE)

### 简介

太空饭否是一个免费、用心的开源项目，是目前最强大最好用的饭否浏览器扩展。可以给饭否添加回复和转发展开、桌面通知、浮动输入框、多用户切换、消息批量管理、自动翻页等功能，并且使饭否页面变得更美更舒心，符合您的使用习惯。

### 团队

| **[@太空小孩](https://fanfou.com/anegie)** | **[@锐风](https://fanfou.com/ruif)** | **[@饭小默](https://fanfou.com/lito)** | **[@Xidorn](https://fanfou.com/xidorn)** | **[@.rex](https://fanfou.com/zhasm)** |
| :----------------------------------------: | :----------------------------------: | :------------------------------------: | :--------------------------------------: | :-----------------------------------: |

### 下载安装

项目已迁移至 WXT 与 Manifest V3，提供 Chrome、Firefox 和 Safari macOS 的独立构建。兼容差异、数据升级注意事项及验收范围见 [迁移说明](docs/migration.md)。

Chrome 原商店链接：

<a href="https://chrome.google.com/webstore/detail/mfofmcdbaeajgdeihmcjjohmhepcdcol">
  <img src="https://raw.githubusercontent.com/fanfoujs/space-fanfou/master/media/chrome-web-store-badge.png" alt="Download on the Chrome Web Store" width="248px" height="75px" />
</a>

### 本地构建

需要 Node.js 22.12 或更新版本。

```sh
npm ci --legacy-peer-deps
npm test
npm run build:all
npm run verify:build
```

- Chrome：在扩展管理页面加载 `.output/chrome-mv3`。
- Firefox：在 `about:debugging` 中临时加载 `.output/firefox-mv3/manifest.json`；正式安装需要 Mozilla 签名。
- Safari：macOS 安装 Xcode 后运行 `npm run safari:project`，打开 `.output/safari-project/Space Fanfou/Space Fanfou.xcodeproj`，选择签名团队后运行。

开发与回归测试命令见 [贡献指南](docs/contributing.md)。已有解压版升级时请先阅读迁移说明，保持原来的扩展 ID 以保留设置。

### 参阅

- [太空饭否 3D 打印冰箱贴](Artifacts/SpaceFanfouMagnet/README.md)：50 mm 蓝底白字模型、STL、3MF 和描摹 SVG。

| **→ [官方饭否](https://fanfou.com/spacefanfou)** | **→ [入门手册](https://spacekid.me/spacefanfou/)** |
| :----------------------------------------------: | :------------------------------------------------: |

### 协议

基于 [GPL v3](COPYING) 协议发布。版权所有 © 2011-2020 太空饭否开发组。
