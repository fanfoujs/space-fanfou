# 贡献代码

## 本地构建

需要 Node.js 22.12 或更新版本。Fork 并 clone 项目后，在项目根目录运行：

```sh
npm ci --legacy-peer-deps
npm test
npm run build:all
npm run verify:build
```

旧 React 组件通过 Preact compat 运行，因此安装依赖时仍需 `--legacy-peer-deps` 以忽略它们过时的 peer dependency 声明。

构建输出位于 `.output/chrome-mv3`、`.output/firefox-mv3`、`.output/safari-mv3`。

## 本地安装

新版目前尚未上架浏览器扩展商店，可使用本地构建进行开发和测试。

- Chrome：在扩展管理页面开启开发者模式，加载 `.output/chrome-mv3`。
- Firefox：在 `about:debugging` 中临时加载 `.output/firefox-mv3/manifest.json`；正式安装需要 Mozilla 签名。
- Safari：macOS 安装 Xcode 后运行 `npm run safari:project`，打开 `.output/safari-project/Space Fanfou/Space Fanfou.xcodeproj`，选择签名团队后运行，并在 Safari 设置中启用扩展、授予饭否站点访问权限。

已有解压版升级时请先阅读 [迁移说明](docs/migration.md)，保持原来的扩展 ID 以保留设置。

## 开发与回归测试

1. `npm run dev` 启动 Chrome 开发环境；Firefox 使用 `npm run dev:firefox`。
1. `npm run test` 执行 TypeScript、ESLint 和 Vitest。
1. `npm run build:all && npm run verify:build` 构建并核对三个 MV3 产物。
1. `npx playwright install chromium && npm run test:e2e` 运行隔离的 Chrome 回归测试。
1. `npm run lint:firefox` 执行 Mozilla 静态检查；`npm run test:firefox` 使用独立临时 profile 验证 Firefox，非默认路径可设置 `FIREFOX_BINARY`。
1. macOS 上运行 `npm run safari:project` 生成 Safari Xcode 工程。不要把生成目录、证书或个人浏览器资料提交到仓库。

功能增删必须同步更新 `docs/feature-inventory.json`，并说明原因；迁移期间不要删除用户的原有设置键。

## Firefox 审核构建说明

提交审核的 Firefox 扩展包使用 WXT 和 Vite 构建。发布构建环境为 macOS 27.2（ARM64）、Node.js 26.12.1 和 npm 12.2.1。
从 [Node.js 官网](https://nodejs.org/)安装上述版本的 Node.js（包含 npm）。解压源码包后，在其根目录打开终端并运行：

```sh
npm ci --legacy-peer-deps
npm run pack:firefox
```

请保持 `package-lock.json` 不变。旧 React 组件通过 Preact 兼容别名运行，因此安装时需要 `--legacy-peer-deps`。安装脚本会自动执行 `wxt prepare`。构建无需凭据或环境变量。

扩展文件生成在 `.output/firefox-mv3/`，可安装的压缩包为 `.output/space-fanfou-2.0.0-firefox.zip`。审核时可将其解压后的内容与提交的扩展进行比较。配套的 `*-sources.zip` 包含构建所需的源文件，包括 `.postcssrc.js` 和 `.browserslistrc`。

## 约定

- 从 1.0.0 开始，使用[语义化版本控制](https://semver.org)
- 只提供必要的设置项，降低用户的决策负担
- 添加依赖时尽可能选择小巧、简单的包，维持打包体积、性能（比如使用 [just](https://github.com/angus-c/just) 替代 [lodash](https://lodash.com)、[Preact](https://preactjs.com/) 替代 [React](https://reactjs.org/)，以及 [tinydate](https://github.com/lukeed/tinydate) 替代 [moment.js](https://momentjs.com/)）
- 太空饭否添加上去的 CSS 类名或 ID 名，应该以 `sf-` 为前缀，且使用连字符风格（如 `sf-foo-bar`），避免和饭否原有的样式命名发生冲突
- 尽量不对图片作 base64 编码，因为会影响到性能
- 尽量不去调用饭否的 jQuery / YUI
- 使用图片素材时应考虑到 HiDPI 显示器的适配
- SVG 图片应该使用 [svgo](https://github.com/svg/svgo) 作优化处理
- 在 merge pull request 时应选择「Squash and merge」
- 代码注释和 git commit message 应使用中文
