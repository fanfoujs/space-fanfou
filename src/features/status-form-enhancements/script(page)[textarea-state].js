// 这个 subfeature 自身没有可见效果，但是可以辅助其他 feature 实现特定功能。

import isHotkey from '@libs/isHotkey'

const MAX_STATUS_LENGTH = 140
const WARN_WHEN_LESS_THAN = 20

const CLASSNAME_STATUS_TEXTAREA_EMPTY = 'sf-status-form-textarea-empty'
const CLASSNAME_STATUS_TEXTAREA_FOCUSED = 'sf-status-form-textarea-focused'
const CLASSNAME_WARNING = 'sf-warning'
const CLASSNAME_EXCEEDED = 'sf-exceeded'

export default context => {
  const { registerDOMEventListener, elementCollection } = context

  let counter

  elementCollection.add({
    update: '#phupdate',
    textarea: { parent: 'update', selector: 'textarea' },
    loading: { parent: 'update', selector: '.act .actpost .loading' },
  })

  registerDOMEventListener('textarea', 'focus', onFocusedStateChanged)
  registerDOMEventListener('textarea', 'change', onChange)
  registerDOMEventListener('textarea', 'input', onChange)
  registerDOMEventListener('textarea', 'keyup', onKeyUp)
  registerDOMEventListener('textarea', 'blur', onFocusedStateChanged)

  function onFocusedStateChanged() {
    const { update, textarea } = elementCollection.getAll()
    const isFocused = document.activeElement === textarea

    update.classList.toggle(CLASSNAME_STATUS_TEXTAREA_FOCUSED, isFocused)
  }

  function onChange() {
    const { update, textarea } = elementCollection.getAll()
    const statusLength = textarea.value.length
    const isEmpty = statusLength === 0
    const remaining = MAX_STATUS_LENGTH - statusLength
    const hasExceeded = remaining < 0
    const isDangerous = remaining <= WARN_WHEN_LESS_THAN && !hasExceeded

    update.classList.toggle(CLASSNAME_STATUS_TEXTAREA_EMPTY, isEmpty)
    counter.textContent = MAX_STATUS_LENGTH - statusLength
    counter.classList.toggle(CLASSNAME_WARNING, isDangerous)
    counter.classList.toggle(CLASSNAME_EXCEEDED, hasExceeded)
  }

  function onKeyUp(event) {
    const { textarea } = elementCollection.getAll()

    if (document.activeElement !== textarea) return
    if (!isHotkey(event, { key: 'Escape' })) return

    textarea.blur()
  }

  function createCounter() {
    counter = document.createElement('span')
    counter.setAttribute('id', 'sf-counter')
    elementCollection.get('loading').after(counter)
  }

  return {
    applyWhen: () => elementCollection.ready('update'),

    onLoad() {
      createCounter()
      onChange()
    },

    onUnload() {
      const update = elementCollection.get('update')

      update.classList.remove(CLASSNAME_STATUS_TEXTAREA_EMPTY)
      update.classList.remove(CLASSNAME_STATUS_TEXTAREA_FOCUSED)

      counter.remove()
      counter = null
    },
  }
}
