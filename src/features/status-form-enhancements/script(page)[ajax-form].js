import triggerEvent from 'compat-trigger-event'
import objectToFormData from 'object-to-formdata'
import safeJSONParse from 'safe-json-parse'
import flush from 'just-flush'
import { isHomePage } from '@libs/pageDetect'
import isHotkey from '@libs/isHotkey'
import { POST_STATUS_SUCCESS_EVENT_TYPE } from '@constants'

const API_URL_PLAIN_MESSAGE = '/home'
const API_URL_UPLOAD_IMAGE = '/home/upload'
const API_ACTION_PLAIN_MESSAGE = 'msg.post'
const API_ACTION_UPLOAD_IMAGE = 'photo.upload'

export default context => {
  const { requireModules, registerDOMEventListener, elementCollection } = context
  const { notification, scrollManager, checkMyNewStatus } = requireModules([
    'notification',
    'scrollManager',
    'checkMyNewStatus',
  ])

  let isSubmitting = false

  elementCollection.add({
    form: '#phupdate form',
    loading: '#phupdate .loading',
    textarea: '#phupdate textarea',
    uploadCloseHandle: '#phupdate .upload-close-handle',
    submitButton: '#phupdate input[type="submit"]',
    popupBox: '#PopupBox',
  })

  registerDOMEventListener('form', 'submit', onFormSubmit)
  registerDOMEventListener('textarea', 'input', onTextareaChange)
  registerDOMEventListener('textarea', 'change', onTextareaChange)
  registerDOMEventListener('textarea', 'keyup', onTextareaKeyup)

  function toggleState(state) {
    const { loading, textarea, submitButton } = elementCollection.getAll()

    if (isSubmitting = state) {
      loading.style.visibility = 'visible'
      textarea.disabled = true
      submitButton.disabled = true
    } else {
      loading.style.visibility = 'hidden'
      textarea.disabled = false
      submitButton.disabled = false
    }
  }

  function resetReplyAndRepost() {
    const { form, popupBox } = elementCollection.getAll()

    form.elements.in_reply_to_status_id.value = ''
    form.elements.repost_status_id.value = ''

    // #PopupBox 为饭否原始的用于回复或转发的弹框
    // 如果开启了浮动输入框，虽然这个弹框不可见，但是也手工把它关闭一下
    // 避免关闭浮动输入框插件一瞬间这个弹框又莫名其妙冒出来
    popupBox.style.display = 'none'
  }

  function resetForm() {
    const { textarea, uploadCloseHandle, submitButton } = elementCollection.getAll()

    textarea.value = ''
    triggerEvent(textarea, 'change')
    uploadCloseHandle.click()
    submitButton.value = '发送'
  }

  function extractFormData() {
    const form = elementCollection.get('form')
    let formDataJson = {
      ajax: 'yes',
      token: form.elements.token.value,
      // 含图片和不含图片对应的 action 有区别
      action: form.elements.action.value,
      // 不含图片时的消息内容
      content: form.elements.content?.value,
      // 含图片时的消息内容
      desc: form.elements.desc?.value,
      // 通过拖放添加的图片
      photo_base64: form.elements.photo_base64.value, // eslint-disable-line camelcase
      // 通过选择文件对话框添加的图片
      picture: form.elements.picture.files[0],
      in_reply_to_status_id: form.elements.in_reply_to_status_id.value, // eslint-disable-line camelcase
      repost_status_id: form.elements.repost_status_id.value, // eslint-disable-line camelcase
      location: form.elements.location?.value,
    }
    const isImageAttached = !!(formDataJson.photo_base64 || formDataJson.picture)

    // 偶尔出现没有图片需要上传，但是部分字段需要调整的情况
    if (!isImageAttached && formDataJson.action === API_ACTION_UPLOAD_IMAGE) {
      formDataJson.action = API_ACTION_PLAIN_MESSAGE
      formDataJson.content = formDataJson.desc
    }

    if (isImageAttached) {
      delete formDataJson.content
    } else {
      delete formDataJson.desc
      delete formDataJson.photo_base64
      delete formDataJson.picture
    }

    formDataJson = flush(formDataJson)

    return { isImageAttached, formDataJson }
  }

  function performAjaxRequest(url, formDataJson, isImageAttached, onUploadProgress) {
    return new Promise((resolve, reject) => {
      // 不使用 fetch 因为不支持读取上传进度
      const xhr = new XMLHttpRequest()
      const formData = objectToFormData(formDataJson)

      xhr.open('POST', url, true)
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
      xhr.onload = () => safeJSONParse(xhr.responseText, (error, json) => {
        if (error) {
          reject()
        } else {
          resolve(json)
        }
      })
      xhr.onerror = () => reject()
      isImageAttached && (xhr.upload.onprogress = onUploadProgress)
      xhr.send(formData)
    })
  }

  function triggerSuccessEvent(formDataJson) {
    const event = new CustomEvent(POST_STATUS_SUCCESS_EVENT_TYPE, {
      detail: { formDataJson },
    })

    elementCollection.get('textarea').dispatchEvent(event)
  }

  async function postMessage() {
    if (isSubmitting) return
    toggleState(true)

    const { isImageAttached, formDataJson } = extractFormData()
    const url = isImageAttached ? API_URL_UPLOAD_IMAGE : API_URL_PLAIN_MESSAGE
    const startTime = Date.now()
    let response
    let isSuccess

    try {
      response = await performAjaxRequest(url, formDataJson, isImageAttached, event => {
        if (!event.lengthComputable) return
        if (event.total < 50 * 1024) return // 过小的文件不显示上传进度

        const progress = event.loaded / event.total
        const percent = `${Math.round(progress * 100)}%`

        elementCollection.get('submitButton').value = percent
      })
      isSuccess = !!response?.status
    } catch (error) {
      isSuccess = false
    }
    toggleState(false)

    if (isSuccess) {
      notification.create(
        notification.INFO,
        response?.msg || (isImageAttached ? '图片上传成功！' : '发送成功！'),
      )
      resetForm()
      triggerSuccessEvent(formDataJson)
    } else {
      notification.create(
        notification.ERROR,
        response?.msg || (isImageAttached ? '图片上传失败' : '发送失败'),
      )
    }

    // 使输入框获得焦点，方便用户编辑或者重新提交
    if (!isSuccess || !scrollManager.getScrollTop()) {
      elementCollection.get('textarea').focus()
    }

    // 加载刚刚发送的消息
    if (isSuccess && isHomePage()) {
      checkMyNewStatus.check(startTime)
    }
  }

  function onFormSubmit(event) {
    event.preventDefault()
    postMessage()
  }

  function onTextareaChange() {
    if (elementCollection.get('textarea').value === '') {
      resetReplyAndRepost()
    }
  }

  function onTextareaKeyup(event) {
    if (isHotkey(event, { ctrl: true, key: 'Enter' })) {
      event.preventDefault()
      postMessage()
    }
  }

  return {
    applyWhen: () => elementCollection.ready('form'),
  }
}
