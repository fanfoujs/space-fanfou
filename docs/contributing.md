# 贡献代码

### 开发

1. fork 并 clone 项目
1. 安装依赖 `npm install`
1. 进入开发模式 `npm run dev`，webpack 会持续监听文件变化并重新构建
1. 在 Chrome 中加载 `dist` 目录
1. 请确保 `npm test` 测试通过

### 约定

- 从 1.0.0 开始，使用[语义化版本控制](https://semver.org)
- 只提供必要的设置项，降低用户的决策负担
- 添加依赖时尽可能选择小巧、简单的包，维持打包体积、性能（比如使用 [just](https://github.com/angus-c/just) 替代 [lodash](https://lodash.com)、[Preact](https://preactjs.com/) 替代 [React](https://reactjs.org/)，以及 [tinydate](https://github.com/lukeed/tinydate) 替代 [moment.js](https://momentjs.com/)）
- 太空饭否添加上去的 CSS 类名或 ID 名，应该以 `sf-` 为前缀，且使用连字符风格（如 `sf-foo-bar`），避免和饭否原有的样式命名发生冲突
- 尽量不对图片作 base64 编码，因为会影响到性能
- 尽量不去调用饭否的 jQuery / YUI
- 使用图片素材时应考虑到 HiDPI 显示器的适配
- SVG 图片应该使用 [svgo](https://github.com/svg/svgo) 作优化处理
- 在 merge pull request 时应选择“Squash and merge”
