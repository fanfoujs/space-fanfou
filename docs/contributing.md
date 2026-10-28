# 贡献代码

### 开发

1. 使用 Node.js 22.12 或更新的版本，fork 并 clone 项目。
1. `npm ci --legacy-peer-deps` 安装锁定的依赖。旧 React 组件通过 Preact compat 运行，因此仍需忽略它们过时的 peer dependency 声明。
1. `npm run dev` 启动 Chrome 开发环境；Firefox 使用 `npm run dev:firefox`。
1. `npm run test` 执行 TypeScript、ESLint 和 Vitest。
1. `npm run build:all && npm run verify:build` 构建并核对三个 MV3 产物。
1. `npx playwright install chromium && npm run test:e2e` 运行隔离的 Chrome 回归测试。
1. `npm run lint:firefox` 执行 Mozilla 静态检查；`npm run test:firefox` 使用独立临时 profile 验证 Firefox，非默认路径可设置 `FIREFOX_BINARY`。
1. macOS 上运行 `npm run safari:project` 生成 Safari Xcode 工程。不要把生成目录、证书或个人浏览器资料提交到仓库。

构建输出位于 `.output/chrome-mv3`、`.output/firefox-mv3`、`.output/safari-mv3`。功能增删必须同步更新 `docs/feature-inventory.json`，并说明原因；迁移期间不要删除用户的原有设置键。

### 约定

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
