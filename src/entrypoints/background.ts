import { defineBackground } from 'wxt/utils/define-background'
import { browser } from 'wxt/browser'
import { clearFallbackSession } from '../platform/storage'
import messaging from '../background/environment/messaging'
import initialize from '../initialize'
import features from '../features/background'
import * as environment from '../background'
import {
  registerBackgroundEvents,
  setBackgroundReady,
} from '../platform/events'

export default defineBackground(() => {
  ;(globalThis as any).__SF_BACKGROUND_STATE__ = { phase: 'starting' }
  registerBackgroundEvents()
  browser.runtime.onStartup.addListener(() => {
    void clearFallbackSession().catch(console.error)
  })
  browser.runtime.onInstalled.addListener(() => {
    void browser.tabs
      .query({ url: ['*://fanfou.com/*'] })
      .then(async (tabs) => {
        const scripts = browser.runtime.getManifest().content_scripts || []
        for (const tab of tabs) {
          if (tab.id == null) continue
          for (const script of scripts) {
            try {
              if (script.js?.length)
                await browser.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: ['/content-scripts/content.js'],
                })
            } catch (error) {
              console.info('[SpaceFanfou] 无法注入已有标签页', error)
            }
          }
        }
      })
  })
  const ready = initialize(features, environment)
  setBackgroundReady(ready)
  messaging.setReady(ready)
  void ready
    .then(() => {
      ;(globalThis as any).__SF_BACKGROUND_STATE__ = { phase: 'ready' }
    })
    .catch((error) => {
      ;(globalThis as any).__SF_BACKGROUND_STATE__ = {
        phase: 'error',
        error: String(error),
        stack: error?.stack,
      }
      console.error(error)
    })
})
