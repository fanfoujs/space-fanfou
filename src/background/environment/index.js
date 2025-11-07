import messaging from './messaging'
import storage from './storage'
import settings from './settings'
import proxiedFetch from './proxiedFetch'
import proxiedAudio from './proxiedAudio'
import proxiedCreateTab from './proxiedCreateTab'

// Manifest V3 compatible content script injection
// Replaces webext-inject-on-install (uses deprecated chrome.tabs.executeScript)
async function injectContentScriptsOnInstall() {
  const manifest = chrome.runtime.getManifest()
  const scripts = manifest.content_scripts || []

  for (const script of scripts) {
    const tabs = await chrome.tabs.query({ url: script.matches })

    for (const tab of tabs) {
      try {
        // Use Manifest V3's chrome.scripting API
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
        // Ignore already injected or unauthorized tabs (like chrome:// pages)
        console.info('[SpaceFanfou] Skip inject on tab', tab.id, ':', error.message)
      }
    }
  }
}

export default async function createBackgroundEnvironment() {
  // Complete all initialization first to ensure message handlers are registered
  await Promise.all([
    messaging.install(),
    storage.install(),
    settings.install(),      // ← Ensure SETTINGS_READ_ALL handler is registered
    proxiedFetch.install(),
    proxiedAudio.install(),
    proxiedCreateTab.install(),
  ])

  // Then inject content scripts (avoid sending messages before handler registration)
  await injectContentScriptsOnInstall()

  return { messaging, settings }
}
