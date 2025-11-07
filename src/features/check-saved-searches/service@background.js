// Service Worker 环境检测：此功能需要大量 DOM 解析，无法在 Service Worker (Manifest V3) 中运行
// 在 Manifest V2 中此功能正常工作，因为 background page 有完整的 DOM API
// 在 Manifest V3 中，background 是 Service Worker，没有 DOM API

// eslint-disable-next-line no-console
console.info('[SpaceFanfou] check-saved-searches 功能在 Manifest V3 Service Worker 环境中不可用')
console.info('[SpaceFanfou] 此功能需要 DOM 解析（parseHTML + select-dom），仅在 Manifest V2 中可用')

export default () => ({
  onLoad() {},
  onUnload() {},
})
