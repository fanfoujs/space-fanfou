// 我们在构建时期无法得知扩展的 id，使用一个占位符来表示
// 在运行时拿到扩展 id 再做替换
// 替换后格式为 chrome-extension://<extension-id>
export const EXTENSION_ORIGIN_PLACEHOLDER = '<EXTENSION_ORIGIN_PLACEHOLDER>'
export const EXTENSION_ORIGIN_PLACEHOLDER_RE = new RegExp(EXTENSION_ORIGIN_PLACEHOLDER, 'g')
