import { browser } from 'wxt/browser'
export default () => {
  const { version, version_name: name } = browser.runtime.getManifest()

  // 优先使用展示版本，避免将 Chrome 的四位构建版本传给 semver。
  return name || version
}
