import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script'
import { EXTENSION_UNLOADED_EVENT_TYPE } from '../constants'

export default defineUnlistedScript(() => {
  const scope = globalThis as typeof globalThis & {
    __SF_PAGE_ENTRY_INITIALIZED__?: boolean
  }
  if (scope.__SF_PAGE_ENTRY_INITIALIZED__) return
  scope.__SF_PAGE_ENTRY_INITIALIZED__ = true
  window.addEventListener(
    EXTENSION_UNLOADED_EVENT_TYPE,
    () => {
      scope.__SF_PAGE_ENTRY_INITIALIZED__ = false
    },
    { once: true },
  )
  void Promise.all([
    import('../initialize'),
    import('../features/page'),
    import('../page'),
  ])
    .then(([{ default: initialize }, { default: features }, environment]) =>
      initialize(features, environment),
    )
    .catch(console.error)
})
