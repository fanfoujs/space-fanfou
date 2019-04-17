import { EXTENSION_UNLOADED_EVENT_TYPE } from '@constants'

export default {
  trigger() {
    const event = new CustomEvent(EXTENSION_UNLOADED_EVENT_TYPE)

    window.dispatchEvent(event)
  },

  addListener(fn) {
    window.addEventListener(EXTENSION_UNLOADED_EVENT_TYPE, fn, { once: true })
  },
}
