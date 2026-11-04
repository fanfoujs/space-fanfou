import { defineContentScript } from 'wxt/utils/define-content-script'
import { EXTENSION_UNLOADED_EVENT_TYPE } from '../constants'

export default defineContentScript({
  matches: ['*://fanfou.com/*'],
  runAt: 'document_start',
  async main() {
    const scope = globalThis as typeof globalThis & {
      __SF_CONTENT_ENTRY_INITIALIZED__?: boolean
    }
    if (scope.__SF_CONTENT_ENTRY_INITIALIZED__) return
    window.dispatchEvent(new Event(EXTENSION_UNLOADED_EVENT_TYPE))
    scope.__SF_CONTENT_ENTRY_INITIALIZED__ = true
    const [{ default: initialize }, { default: features }, environment] =
      await Promise.all([
        import('../initialize'),
        import('../features/content'),
        import('../content'),
      ])
    await initialize(features, environment)
  },
})
