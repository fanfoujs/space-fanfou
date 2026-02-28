/* eslint-disable no-console */
// Service Worker 环境检测：此功能需要大量 DOM 解析，无法在 Service Worker (Manifest V3) 中运行
// 在 Manifest V2 中此功能正常工作，因为 background page 有完整的 DOM API
// 在 Manifest V3 中，background 是 Service Worker，没有 DOM API
// 保留console.info用于向开发者说明功能在MV3中不可用的原因

console.info('[SpaceFanfou] check-saved-searches 功能在 Manifest V3 Service Worker 环境中不可用')
console.info('[SpaceFanfou] 此功能需要 DOM 解析（parseHTML + select-dom），仅在 Manifest V2 中可用')

export default () => ({
  // MV3占位：在Service Worker环境中此功能不可用，保留空方法以保持接口一致性
  onLoad() {}, // eslint-disable-line no-empty-function
  onUnload() {}, // eslint-disable-line no-empty-function
})
