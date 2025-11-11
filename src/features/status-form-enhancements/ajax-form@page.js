/* eslint-disable no-console */
// 保留console用于表单提交和AJAX错误调试
import select from 'select-dom'
import triggerEvent from 'compat-trigger-event'
import objectToFormData from 'object-to-formdata'
import safeJSONParse from 'safe-json-parse'
import flush from 'just-flush'
import { getAttachment, clearAttachment } from './attachmentStore'
import { isHomePage } from '@libs/pageDetect'
import parseHTML from '@libs/parseHTML'
import isHotkey from '@libs/isHotkey'
import { POST_STATUS_SUCCESS_EVENT_TYPE } from '@constants'

const API_URL_PLAIN_MESSAGE = '/home'
const API_URL_UPLOAD_IMAGE = '/home/upload'
const API_ACTION_PLAIN_MESSAGE = 'msg.post'
const API_ACTION_UPLOAD_IMAGE = 'photo.upload'
const URL_FANFOU_M_HOME = `${window.location.protocol}//m.fanfou.com/home`

const ERROR_FAILED_REFRESHING_TOKEN = new Error('刷新 token 失败')

export default context => {
  const { requireModules, registerDOMEventListener, elementCollection } = context
  const { notification, scrollManager, checkMyNewStatus, proxiedFetch } = requireModules([
    'notification',
    'scrollManager',
    'checkMyNewStatus',
    'proxiedFetch',
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
    clearAttachment()
  }

  async function refreshToken() {
    const { error: ajaxError, responseText: html } = await proxiedFetch.get({
      url: URL_FANFOU_M_HOME,
    })

    if (ajaxError) {
      throw ERROR_FAILED_REFRESHING_TOKEN
    }

    const document = parseHTML(html)
    const token = select('input[name="token"]', document)?.value

    if (!token) {
      throw ERROR_FAILED_REFRESHING_TOKEN
    }

    elementCollection.get('form').elements.token.value = token
  }

  function extractFormData() {
    const form = elementCollection.get('form')
    const storedAttachment = getAttachment()
    const domAttachment = form.elements.picture.files[0]
    const attachmentFile = domAttachment || storedAttachment?.file || null

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
      picture: domAttachment,
      in_reply_to_status_id: form.elements.in_reply_to_status_id.value, // eslint-disable-line camelcase
      repost_status_id: form.elements.repost_status_id.value, // eslint-disable-line camelcase
      location: form.elements.location?.value,
    }
    if (attachmentFile) {
      // 如果已有 base64（拖放/粘贴场景），优先使用 base64
      if (formDataJson.photo_base64) {
        formDataJson.picture = null
      } else {
        // 否则使用 File 对象（文件选择器场景）
        formDataJson.picture = attachmentFile
      }
      formDataJson.desc = formDataJson.desc || formDataJson.content || ''
      formDataJson.action = API_ACTION_UPLOAD_IMAGE
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
      // eslint-disable-next-line unicorn/prefer-add-event-listener
      xhr.onload = () => safeJSONParse(xhr.responseText, (error, json) => {
        if (error) {
          reject()
        } else {
          resolve(json)
        }
      })
      // eslint-disable-next-line unicorn/prefer-add-event-listener
      xhr.onerror = () => reject()
      // eslint-disable-next-line unicorn/prefer-add-event-listener
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
    console.log('[SpaceFanfou DEBUG] postMessage 开始')
    if (isSubmitting) {
      console.log('[SpaceFanfou DEBUG] 正在提交中，跳过')
      return
    }
    toggleState(true)
    console.log('[SpaceFanfou DEBUG] 输入框已禁用')

    let response
    let isSuccess = false
    let isImageAttached = false
    let formDataJson = {}
    let startTime = Date.now()

    try {
      // 总是先刷新 token，避免因 token 过期导致发送消息失败
      console.log('[SpaceFanfou DEBUG] 开始刷新 token')
      await refreshToken()
      console.log('[SpaceFanfou DEBUG] token 刷新完成')

      const {
        isImageAttached: extractedIsImageAttached,
        formDataJson: extractedFormDataJson,
      } = extractFormData()
      isImageAttached = extractedIsImageAttached
      formDataJson = extractedFormDataJson
      console.log('[SpaceFanfou DEBUG] 提取表单数据:', {
        isImageAttached,
        hasPhotoBase64: !!formDataJson.photo_base64,
        hasPicture: !!formDataJson.picture,
        pictureType: formDataJson.picture?.constructor.name,
      })
      const url = isImageAttached ? API_URL_UPLOAD_IMAGE : API_URL_PLAIN_MESSAGE
      startTime = Date.now()

      console.log('[SpaceFanfou DEBUG] 开始发送请求到:', url)
      response = await performAjaxRequest(url, formDataJson, isImageAttached, event => {
        if (!event.lengthComputable) return
        if (event.total < 50 * 1024) return // 过小的文件不显示上传进度

        const progress = event.loaded / event.total
        const percent = `${Math.round(progress * 100)}%`

        elementCollection.get('submitButton').value = percent
      })
      isSuccess = !!response?.status
      console.log('[SpaceFanfou DEBUG] 请求完成，成功:', isSuccess)
    } catch (error) {
      console.error('[SpaceFanfou DEBUG] postMessage 失败:', error)
      console.error('[SpaceFanfou DEBUG] 错误堆栈:', error.stack)
      isSuccess = false
    } finally {
      console.log('[SpaceFanfou DEBUG] 进入 finally，准备恢复输入框')
      // 无论成功还是失败，都恢复 textarea 状态
      toggleState(false)
      console.log('[SpaceFanfou DEBUG] 输入框已恢复')
    }

    if (isSuccess) {
      notification.create(
        notification.INFO,
        response?.msg || (isImageAttached ? '图片上传成功！' : '发送成功！'),
      )
      resetForm()
      triggerSuccessEvent(formDataJson)
    } else {
      // 失败时也清理附件，避免下次误用
      clearAttachment()
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
