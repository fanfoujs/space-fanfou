import isHotkey from '@libs/isHotkey'

const MAX_STATUS_LENGTH = 140
const WARN_WHEN_LESS_THAN = 20
const WARN_WHEN_GREATER_THAN_OR_EQUAL_TO = 120
const DANGER_WHEN_GREATER_THAN_OR_EQUAL_TO = 135

const CLASSNAME_STATUS_TEXTAREA_EMPTY = 'sf-status-form-textarea-empty'
const CLASSNAME_STATUS_TEXTAREA_FOCUSED = 'sf-status-form-textarea-focused'
const CLASSNAME_STATUS_WARNING = 'sf-status-warning'
const CLASSNAME_STATUS_DANGER = 'sf-status-danger'
const CLASSNAME_WARNING = 'sf-warning'
const CLASSNAME_EXCEEDED = 'sf-exceeded'

const TARGET_SELECTORS = '#phupdate textarea, #message textarea, #PopupBox textarea'

export default () => {
  function getFormWrapper(textarea) {
    return textarea.closest('#phupdate, #message, #PopupBox')
  }

  function getCounter(wrapper) {
    let counter = wrapper.querySelector('#sf-counter')
    if (!counter) {
      counter = document.createElement('span')
      counter.id = 'sf-counter'
      
      const loading = wrapper.querySelector('.act .actpost .loading, .actpost .loading, .loading')
      if (loading) {
        loading.after(counter)
      } else {
        const formbutton = wrapper.querySelector('.formbutton')
        if (formbutton) {
          formbutton.before(counter)
        }
      }
    }
    return counter
  }

  function onFocusedStateChanged(event) {
    const textarea = event.target
    if (!textarea.matches?.(TARGET_SELECTORS)) return

    const wrapper = getFormWrapper(textarea)
    if (!wrapper) return

    const isFocused = document.activeElement === textarea
    wrapper.classList.toggle(CLASSNAME_STATUS_TEXTAREA_FOCUSED, isFocused)
  }

  function onChange(event) {
    const textarea = event.target
    if (!textarea.matches?.(TARGET_SELECTORS)) return

    const wrapper = getFormWrapper(textarea)
    if (!wrapper) return

    const statusLength = textarea.value.length
    const isEmpty = statusLength === 0
    const remaining = MAX_STATUS_LENGTH - statusLength
    const hasExceeded = remaining < 0
    const isDangerous = remaining <= WARN_WHEN_LESS_THAN && !hasExceeded
    const hasStatusWarning = statusLength >= WARN_WHEN_GREATER_THAN_OR_EQUAL_TO
    const hasStatusDanger = statusLength >= DANGER_WHEN_GREATER_THAN_OR_EQUAL_TO

    wrapper.classList.toggle(CLASSNAME_STATUS_TEXTAREA_EMPTY, isEmpty)
    wrapper.classList.toggle(
      CLASSNAME_STATUS_WARNING,
      hasStatusWarning && !hasStatusDanger,
    )
    wrapper.classList.toggle(CLASSNAME_STATUS_DANGER, hasStatusDanger)

    const counter = getCounter(wrapper)
    if (counter) {
      counter.textContent = MAX_STATUS_LENGTH - statusLength
      counter.classList.toggle(CLASSNAME_WARNING, isDangerous)
      counter.classList.toggle(CLASSNAME_EXCEEDED, hasExceeded)
    }
  }

  function onKeyDown(event) {
    const textarea = event.target
    if (!textarea.matches?.(TARGET_SELECTORS)) return

    if (document.activeElement !== textarea) return
    if (!isHotkey(event, { key: 'Escape' })) return

    textarea.blur()
  }

  function scanAndInitialize() {
    document.querySelectorAll(TARGET_SELECTORS).forEach(textarea => {
      onChange({ target: textarea })
      if (document.activeElement === textarea) {
        onFocusedStateChanged({ target: textarea })
      }
    })
  }

  return {
    // 这三个表单可能在页面任意时刻加载，特别 PopupBox 是动态创建的
    applyWhen: () => Promise.resolve(true),

    onLoad() {
      document.addEventListener('focus', onFocusedStateChanged, true)
      document.addEventListener('blur', onFocusedStateChanged, true)
      document.addEventListener('change', onChange, true)
      document.addEventListener('input', onChange, true)
      document.addEventListener('keydown', onKeyDown, true)

      // 扫描现存的
      scanAndInitialize()
    },

    onUnload() {
      document.removeEventListener('focus', onFocusedStateChanged, true)
      document.removeEventListener('blur', onFocusedStateChanged, true)
      document.removeEventListener('change', onChange, true)
      document.removeEventListener('input', onChange, true)
      document.removeEventListener('keydown', onKeyDown, true)

      document.querySelectorAll('#phupdate, #message, #PopupBox').forEach(wrapper => {
        wrapper.classList.remove(CLASSNAME_STATUS_TEXTAREA_EMPTY)
        wrapper.classList.remove(CLASSNAME_STATUS_TEXTAREA_FOCUSED)
        wrapper.classList.remove(CLASSNAME_STATUS_WARNING)
        wrapper.classList.remove(CLASSNAME_STATUS_DANGER)

        const counter = wrapper.querySelector('#sf-counter')
        if (counter) counter.remove()
      })
    },
  }
}
