import messaging from './messaging'
import storage from './storage'
import settings from './settings'
import proxiedFetch from './proxiedFetch'
import proxiedAudio from './proxiedAudio'
import proxiedCreateTab from './proxiedCreateTab'

// Manifest V3 兼容的 content script 注入
// 替换 webext-inject-on-install（使用了废弃的 chrome.tabs.executeScript）
async function injectContentScriptsOnInstall() {
  const manifest = chrome.runtime.getManifest()
  const scripts = manifest.content_scripts || []

  for (const script of scripts) {
    const tabs = await chrome.tabs.query({ url: script.matches })

    for (const tab of tabs) {
      try {
        // 使用 Manifest V3 的 chrome.scripting API
        if (script.js) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: script.all_frames },
            files: script.js,
          })
        }
        if (script.css) {
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id, allFrames: script.all_frames },
            files: script.css,
          })
        }
      } catch (error) {
        // 忽略已注入或无权限的 tab（如 chrome:// 页面）
        console.info('[SpaceFanfou] Skip inject on tab', tab.id, ':', error.message)
      }
    }
  }
}

export default async function createBackgroundEnvironment() {
  // 先完成所有初始化，确保 message handlers 都已注册
  await Promise.all([
    messaging.install(),
    storage.install(),
    settings.install(),      // ← 确保 SETTINGS_READ_ALL handler 已注册
    proxiedFetch.install(),
    proxiedAudio.install(),
    proxiedCreateTab.install(),
  ])

  // 然后再注入 content scripts（避免消息发送早于 handler 注册）
  await injectContentScriptsOnInstall()

  return { messaging, settings }
}
