// 移除饭否原本对消息发送表单的事件监听器，便于实现提交 AJAX 化

import { isPrivateMessagePage } from '@libs/pageDetect'
import requireFanfouLib from '@libs/requireFanfouLib'
import keepRetry from '@libs/keepRetry'
import every from '@libs/promiseEvery'
import neg from '@libs/neg'

export default context => {
  const { elementCollection } = context

  let eventsBackup

  elementCollection.add({
    form: { selector: '#phupdate form' },
    textarea: { selector: '#phupdate textarea' },
  })

  function backupEventListeners() {
    const { Event } = window.YAHOO.util
    let formSubmit, textareaKeyup

    keepRetry({
      checker() {
        formSubmit = Event.getListeners(elementCollection.get('form'), 'submit')
        textareaKeyup = Event.getListeners(elementCollection.get('textarea'), 'keyup')

        return formSubmit && textareaKeyup
      },
      executor() {
        eventsBackup = {
          formSubmit: formSubmit[0].fn,
          textareaKeyup: textareaKeyup[0].fn,
        }

        Event.removeListener(elementCollection.get('form'), 'submit', eventsBackup.formSubmit)
        Event.removeListener(elementCollection.get('textarea'), 'keyup', eventsBackup.textareaKeyup)
      },
    })
  }

  function restoreEventListeners() {
    const { Event } = window.YAHOO.util

    Event.addListener(elementCollection.get('form'), 'submit', eventsBackup.formSubmit)
    Event.addListener(elementCollection.get('textarea'), 'keyup', eventsBackup.textareaKeyup)

    eventsBackup = null
  }

  return {
    applyWhen: () => every([
      neg(isPrivateMessagePage()), // 私信页面不通过 AJAX 提交
      elementCollection.ready('textarea'),
    ]),

    waitReady: () => requireFanfouLib('YAHOO'),

    onLoad() {
      backupEventListeners()
    },

    onUnload() {
      restoreEventListeners()
    },
  }
}
