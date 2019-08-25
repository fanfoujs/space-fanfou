import loadAsset, { appendToRoot } from '@libs/loadAsset'

export default () => {
  const URL_INJECTED_JS = chrome.runtime.getURL('page.js')

  // 保证先于饭否的脚本执行
  loadAsset({ type: 'script', url: URL_INJECTED_JS, mount: appendToRoot })
}
