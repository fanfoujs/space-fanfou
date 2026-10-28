import { browser } from 'wxt/browser'
export default () => {
  const { version, version_name: name } = browser.runtime.getManifest()

  // version_name 字段用于存放 beta 版本号，为空时表示正式版
  return name || version
}
