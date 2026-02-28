/* eslint-disable no-restricted-globals, no-console */
// Service Worker环境：self是全局上下文，用于存储初始化标记
// 保留console用于Service Worker生命周期调试
import messaging from './messaging'
import storage from './storage'
import settings from './settings'
import proxiedFetch from './proxiedFetch'
import proxiedAudio from './proxiedAudio'
import proxiedCreateTab from './proxiedCreateTab'
import fanfouOAuth from './fanfouOAuth'

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

function registerContentScriptInjectOnInstall() {
  if (self.__SF_ON_INSTALLED_HANDLER__) return

  chrome.runtime.onInstalled.addListener(details => {
    if (details.reason !== 'install' && details.reason !== 'update') return

    injectContentScriptsOnInstall().catch(error => {
      console.error('[SpaceFanfou] Failed to inject content scripts on install/update:', error)
    })
  })

  self.__SF_ON_INSTALLED_HANDLER__ = true
}

registerContentScriptInjectOnInstall()

export default async function createBackgroundEnvironment() {
  // 防止 Service Worker 重启时重复初始化监听器
  // Service Worker 休眠后重新唤醒时，整个 background.js 会重新执行
  // 但全局监听器（chrome.runtime.onConnect 等）会累积，导致功能模块被重复加载
  if (self.__SF_BACKGROUND_INITIALIZED__) {
    console.log('[SpaceFanfou] Background already initialized, skip reinstall')
    return { messaging, settings }
  }

  self.__SF_BACKGROUND_INITIALIZED__ = true
  console.log('[SpaceFanfou] Initializing background environment...')

  // 关键修复：立即注册 messaging 监听器（同步），确保 Content Scripts 重连时监听器已就绪
  // 必须在任何异步操作之前完成，避免 "Receiving end does not exist" 错误
  messaging.install()

  // 然后并行初始化其他模块（这些可以是异步的）
  self.__SF_BACKGROUND_READY__ = Promise.all([
    storage.install(),
    settings.install(), // ← Ensure SETTINGS_READ_ALL handler is registered
    proxiedFetch.install(),
    proxiedAudio.install(),
    proxiedCreateTab.install(),
    fanfouOAuth.install(),
  ])

  await self.__SF_BACKGROUND_READY__

  return { messaging, settings }
}
