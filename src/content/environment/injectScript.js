import { browser } from 'wxt/browser'
import elementReady from 'element-ready'
import messaging from './messaging'

export default async function injectScript() {
  const root = await elementReady('html')
  let marker = document.querySelector('meta[name="space-fanfou-extension-origin"]')
  if (!marker) {
    marker = document.createElement('meta')
    marker.name = 'space-fanfou-extension-origin'
    root.append(marker)
  }
  marker.content = browser.runtime.getURL('/').replace(/\/$/, '')
  const result = await messaging.postMessage({ action: 'INJECT_PAGE_SCRIPT' })
  if (result?.error || result?.__isError) throw new Error(result.error || result.message)
}
