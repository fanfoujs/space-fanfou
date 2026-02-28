import { POST_STATUS_SUCCESS_EVENT_TYPE } from '@constants'

const DRAFT_STORAGE_KEY = 'space-fanfou:status-form:draft'

export default context => {
  const { registerDOMEventListener, elementCollection } = context

  elementCollection.add({
    textarea: '#phupdate textarea',
  })

  registerDOMEventListener('textarea', 'input', onTextareaInput)
  registerDOMEventListener('textarea', POST_STATUS_SUCCESS_EVENT_TYPE, onPostStatusSuccess)

  function getDraft() {
    try {
      return localStorage.getItem(DRAFT_STORAGE_KEY) || ''
    } catch {
      return ''
    }
  }

  function saveDraft(value) {
    try {
      if (value) {
        localStorage.setItem(DRAFT_STORAGE_KEY, value)
      } else {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
      }
    } catch {
      // 忽略 localStorage 不可用场景，避免影响发文流程
    }
  }

  function onTextareaInput() {
    const textarea = elementCollection.get('textarea')
    saveDraft(textarea.value)
  }

  function onPostStatusSuccess() {
    saveDraft('')
  }

  return {
    applyWhen: () => elementCollection.ready('textarea'),

    onLoad() {
      const textarea = elementCollection.get('textarea')
      const draft = getDraft()

      if (!draft || textarea.value) return

      textarea.value = draft
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    },
  }
}
