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
const POPUP_RETRY_INTERVAL_MS = 100
const POPUP_RETRY_MAX_ATTEMPTS = 8
const POPUP_TRIGGER_SELECTOR = [
  '.reply',
  'a[href*="/reply"]',
  '.repost',
  'a[href*="/repost"]',
].join(', ')

const ERROR_FAILED_REFRESHING_TOKEN = new Error('刷新 token 失败')

// 我们感兴趣接管的表单选择器集合
const TARGET_FORM_SELECTORS = '#phupdate form, #message form, #PopupBox form'

export default context => {
  const { requireModules, elementCollection } = context
  const { notification, scrollManager, checkMyNewStatus, proxiedFetch } = requireModules([
    'notification',
    'scrollManager',
    'checkMyNewStatus',
    'proxiedFetch',
  ])

  // P0: State Management for Multiple Forms
  const submittingForms = new WeakMap()
  let popupObserver = null
  let popupBodyObserver = null
  let observedPopupBox = null
  let popupRetryTimer = null
  let popupEnsureTimer = null
  let popupEnsureRaf = 0

  // 简化基础的元素查找（由于我们要解耦多表单，这里只放依然全局唯一的核心）
  elementCollection.add({
    popupBox: '#PopupBox',
  })

  function toggleState(form, state) {
    if (!form) return
    const loading = form.querySelector('.loading') || form.closest('.actpost, #PopupBox')?.querySelector('.loading')
    const textarea = form.querySelector('textarea')
    const submitButton = form.querySelector('input[type="submit"], button[type="submit"]')

    submittingForms.set(form, state)

    if (state) {
      if (loading) loading.style.visibility = 'visible'
      if (textarea) textarea.disabled = true
      if (submitButton) submitButton.disabled = true
    } else {
      if (loading) loading.style.visibility = 'hidden'
      if (textarea) textarea.disabled = false
      if (submitButton) submitButton.disabled = false
    }
  }

  function resetReplyAndRepost(form) {
    if (!form) return
    if (form.elements.in_reply_to_status_id) form.elements.in_reply_to_status_id.value = ''
    if (form.elements.repost_status_id) form.elements.repost_status_id.value = ''

    // 关闭原生的 PopupBox
    const popupBox = document.getElementById('PopupBox')
    if (popupBox && form.closest('#PopupBox')) {
      popupBox.style.display = 'none'
    } else if (popupBox && form.closest('#phupdate')) {
      // 避免关闭浮动输入框插件一瞬间这个弹框又莫名其妙冒出来
      popupBox.style.display = 'none'
    }
  }

  function resetForm(form) {
    const textarea = form.querySelector('textarea')
    const uploadCloseHandle = form.querySelector('.upload-close-handle')
    const submitButton = form.querySelector('input[type="submit"], button[type="submit"]')

    if (textarea) {
      textarea.value = ''
      triggerEvent(textarea, 'change')
    }
    if (uploadCloseHandle) uploadCloseHandle.click()
    if (submitButton) submitButton.value = '发送'
    clearAttachment()
  }

  async function refreshToken(form) {
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

    if (form.elements.token) form.elements.token.value = token
  }

  function extractFormData(form) {
    const storedAttachment = getAttachment()
    const domAttachment = form.elements.picture?.files?.[0]
    const attachmentFile = domAttachment || storedAttachment?.file || null

    let formDataJson = {
      ajax: 'yes',
      token: form.elements.token?.value,
      // 含图片和不含图片对应的 action 有区别 (如果页面没有 action 默认为 msg.post)
      action: form.elements.action?.value || API_ACTION_PLAIN_MESSAGE,
      // 不含图片时的消息内容
      content: form.elements.content?.value || form.elements.status?.value,
      // 含图片时的消息内容
      desc: form.elements.desc?.value || form.elements.status?.value,
      // 通过拖放添加的图片
      photo_base64: form.elements.photo_base64?.value, // eslint-disable-line camelcase
      // 通过选择文件对话框添加的图片
      picture: domAttachment,
      in_reply_to_status_id: form.elements.in_reply_to_status_id?.value, // eslint-disable-line camelcase
      repost_status_id: form.elements.repost_status_id?.value, // eslint-disable-line camelcase
      location: form.elements.location?.value,
    }

    // Fallback if textarea is named simply "status" (like in some raw forms)
    if (!formDataJson.content && !formDataJson.desc) {
      const rawText = form.querySelector('textarea')?.value
      if (rawText) {
        formDataJson.content = rawText
        formDataJson.desc = rawText
      }
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

    // 过滤掉 undefined 或 null 属性
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
          reject(new Error('饭否服务器返回格式异常'))
        } else {
          resolve(json)
        }
      })
      // eslint-disable-next-line unicorn/prefer-add-event-listener
      xhr.onerror = () => reject(new Error('网络请求失败'))
      // eslint-disable-next-line unicorn/prefer-add-event-listener
      isImageAttached && (xhr.upload.onprogress = onUploadProgress)
      xhr.send(formData)
    })
  }

  function triggerSuccessEvent(form, formDataJson) {
    const event = new CustomEvent(POST_STATUS_SUCCESS_EVENT_TYPE, {
      detail: { formDataJson },
    })
    const textarea = form.querySelector('textarea')
    if (textarea) textarea.dispatchEvent(event)
  }

  async function postMessage(form) {
    console.log('[SpaceFanfou DEBUG] postMessage 开始', form)
    if (submittingForms.get(form)) {
      console.log('[SpaceFanfou DEBUG] 当前表单正在提交中，抛弃重复请求')
      return
    }
    toggleState(form, true)
    console.log('[SpaceFanfou DEBUG] 当前表单已禁用')

    let response
    let isSuccess = false
    let isImageAttached = false
    let formDataJson = {}
    let startTime = Date.now()

    try {
      // 总是先刷新 token，避免因 token 过期导致发送消息失败
      console.log('[SpaceFanfou DEBUG] 开始刷新 token')
      await refreshToken(form)
      console.log('[SpaceFanfou DEBUG] token 刷新完成')

      const extracted = extractFormData(form)
      const { isImageAttached: nextIsImageAttached, formDataJson: nextFormDataJson } = extracted
      isImageAttached = nextIsImageAttached
      formDataJson = nextFormDataJson

      console.log('[SpaceFanfou DEBUG] 提取表单数据:', {
        action: formDataJson.action,
        isImageAttached,
        hasPhotoBase64: !!formDataJson.photo_base64,
        hasPicture: !!formDataJson.picture,
        pictureType: formDataJson.picture?.constructor?.name,
        inReplyTo: formDataJson.in_reply_to_status_id,
      })
      const url = isImageAttached ? API_URL_UPLOAD_IMAGE : API_URL_PLAIN_MESSAGE
      startTime = Date.now()

      console.log('[SpaceFanfou DEBUG] 开始发送请求到:', url)
      const submitButton = form.querySelector('input[type="submit"], button[type="submit"]')

      response = await performAjaxRequest(url, formDataJson, isImageAttached, event => {
        if (!event.lengthComputable || event.total < 50 * 1024) return // 过小的文件不显示上传进度
        const progress = event.loaded / event.total
        const percent = `${Math.round(progress * 100)}%`
        if (submitButton) submitButton.value = percent
      })
      isSuccess = !!response?.status
      console.log('[SpaceFanfou DEBUG] 请求完成，成功:', isSuccess)
    } catch (error) {
      console.error('[SpaceFanfou DEBUG] postMessage 失败:', error)
      isSuccess = false
      // Fallback Strategy: Never revert to a raw `form.submit()` native fallback as that is prone to double posts or hanging.
      // We gracefully digest the error and show a toast so the user can literally hit `发送` again.
    } finally {
      console.log('[SpaceFanfou DEBUG] 进入 finally，准备恢复当前表单输入框')
      // 无论成功还是失败，都释放当前锁
      toggleState(form, false)
      console.log('[SpaceFanfou DEBUG] 当前表单锁已释放，UI恢复')
    }

    if (isSuccess) {
      notification.create(
        notification.INFO,
        response?.msg || (isImageAttached ? '图片上传成功！' : '发送成功！'),
      )
      resetForm(form)
      triggerSuccessEvent(form, formDataJson)
    } else {
      clearAttachment() // 失败清理缓存避免二次污染
      notification.create(
        notification.ERROR,
        response?.msg || (isImageAttached ? '图片上传失败，请重试' : '发送失败，请检查网络'),
      )
    }

    // 使输入框重获焦点，方便重新编辑或提交（如果不在可视区域或失败了）
    const textarea = form.querySelector('textarea')
    if (textarea && (!isSuccess || !scrollManager.getScrollTop())) {
      textarea.focus()
    }

    // 加载刚刚发送的消息
    if (isSuccess && isHomePage()) {
      checkMyNewStatus.check(startTime)
    }
  }

  // Selective Event Handling
  function onFormSubmit(event) {
    const form = event.target
    if (!form.matches?.(TARGET_FORM_SELECTORS)) return

    // 如果没有被锁住，就拦截原生提交流程接管
    if (!submittingForms.get(form)) {
      event.preventDefault()
      event.stopPropagation()
      postMessage(form)
    } else {
      // 如果正在提交，防御性禁止发出
      event.preventDefault()
    }
  }

  function onTextareaChange(event) {
    const textarea = event.target
    if (!textarea.matches?.('textarea')) return
    const form = textarea.closest('form')
    if (!form || !form.matches?.(TARGET_FORM_SELECTORS)) return

    if (textarea.value === '') {
      resetReplyAndRepost(form)
    }
  }

  function onTextareaKeyup(event) {
    const textarea = event.target
    if (!textarea.matches?.('textarea')) return

    if (isHotkey(event, { ctrl: true, key: 'Enter' })) {
      const form = textarea.closest('form')
      if (!form || !form.matches?.(TARGET_FORM_SELECTORS)) return

      event.preventDefault()
      postMessage(form)
    }
  }

  function findSendButton(form) {
    const selectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      'input.formbutton',
      'button.formbutton',
      'input[name="submit"]',
      'button[name="submit"]',
      '.formbutton',
    ]

    for (const selector of selectors) {
      const button = form.querySelector(selector)

      if (button) return button
    }

    return null
  }

  function hasPopupUploadButton(form) {
    return !!form.querySelector('.sf-popup-upload-wrapper, .sf-upload-button')
  }

  function injectUploadButton(form) {
    if (!form || hasPopupUploadButton(form)) return true

    const sendButton = findSendButton(form)
    if (!sendButton) return false

    // Create the upload HTML mimicking the native #phupdate UI but avoiding ID conflicts
    // Instead of id="upload-button", we use class="sf-upload-button"
    const uploadWrapper = document.createElement('span')
    uploadWrapper.className = 'upload-button-wrapper sf-popup-upload-wrapper'
    uploadWrapper.innerHTML = `
      <span class="sf-upload-button" data-form-source="popup" title="上传照片…"></span>
      <input type="file" name="picture" class="upload-file" accept="image/jpeg,image/gif,image/png,image/x-ms-bmp">
      <input type="hidden" name="photo_base64" value="">
    `
    // Ensure form has an explicit 'action' field, required by extractFormData
    if (!form.elements.action) {
      const actionInput = document.createElement('input')
      actionInput.type = 'hidden'
      actionInput.name = 'action'
      actionInput.value = API_ACTION_PLAIN_MESSAGE
      form.append(actionInput)
    }

    // Insert wrapper right before the Send button
    sendButton.before(uploadWrapper)
    form.dataset.sfUploadInjected = 'true'

    return true
  }

  function ensurePopupUploadInjected() {
    ensurePopupObserver()

    const popupWrapper = document.getElementById('PopupBox')
    if (!popupWrapper) return

    const form = popupWrapper.querySelector('form')
    if (!form || hasPopupUploadButton(form)) return

    injectUploadButton(form)
  }

  function ensurePopupObserver() {
    if (!popupObserver) return

    const popupWrapper = document.getElementById('PopupBox')
    if (!popupWrapper || popupWrapper === observedPopupBox) return

    popupObserver.disconnect()
    popupObserver.observe(popupWrapper, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [ 'style', 'class' ],
    })
    observedPopupBox = popupWrapper
  }

  function clearPopupEnsureTasks() {
    if (popupEnsureRaf) {
      cancelAnimationFrame(popupEnsureRaf)
      popupEnsureRaf = 0
    }
    if (popupEnsureTimer) {
      clearTimeout(popupEnsureTimer)
      popupEnsureTimer = null
    }
  }

  function schedulePopupEnsure() {
    ensurePopupUploadInjected()
    clearPopupEnsureTasks()

    popupEnsureRaf = requestAnimationFrame(() => {
      popupEnsureRaf = 0
      ensurePopupUploadInjected()
    })
    popupEnsureTimer = setTimeout(() => {
      popupEnsureTimer = null
      ensurePopupUploadInjected()
    }, POPUP_RETRY_INTERVAL_MS)
  }

  function stopPopupRetryLoop() {
    if (popupRetryTimer) {
      clearInterval(popupRetryTimer)
      popupRetryTimer = null
    }
  }

  function startPopupRetryLoop() {
    stopPopupRetryLoop()

    let attempts = 0
    popupRetryTimer = setInterval(() => {
      attempts += 1
      ensurePopupUploadInjected()

      const popupForm = document.querySelector('#PopupBox form')
      const isInjected = popupForm && hasPopupUploadButton(popupForm)

      if (isInjected || attempts >= POPUP_RETRY_MAX_ATTEMPTS) {
        stopPopupRetryLoop()
      }
    }, POPUP_RETRY_INTERVAL_MS)
  }

  function onPotentialPopupTriggerClick(event) {
    const trigger = event.target?.closest?.(POPUP_TRIGGER_SELECTOR)
    if (!trigger) return

    schedulePopupEnsure()
    startPopupRetryLoop()
  }

  // P0 & P1 MutationObserver to dynamically inject #PopupBox Upload UI
  function watchPopupBox() {
    if (popupObserver || popupBodyObserver) return

    popupObserver = new MutationObserver(() => {
      schedulePopupEnsure()
    })
    popupBodyObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const addedNode of mutation.addedNodes) {
          if (addedNode.nodeType !== Node.ELEMENT_NODE) continue

          if (addedNode.id === 'PopupBox' || addedNode.querySelector?.('#PopupBox')) {
            schedulePopupEnsure()
            return
          }
        }
      }
    })

    const popupWrapper = document.getElementById('PopupBox')
    if (popupWrapper) ensurePopupObserver()
    popupBodyObserver.observe(document.body, { childList: true, subtree: true })

    // Fallback: If it's already on the page when script loads
    schedulePopupEnsure()
  }

  return {
    applyWhen: () => Promise.resolve(true),

    onLoad() {
      // 变更为挂在根节点上的事件委托，精准拦截多级表单
      document.addEventListener('submit', onFormSubmit, true)
      document.addEventListener('input', onTextareaChange, true)
      document.addEventListener('change', onTextareaChange, true)
      document.addEventListener('keyup', onTextareaKeyup, true)
      document.addEventListener('click', onPotentialPopupTriggerClick, true)

      // Start watching for PopupBox
      watchPopupBox()
    },

    onUnload() {
      document.removeEventListener('submit', onFormSubmit, true)
      document.removeEventListener('input', onTextareaChange, true)
      document.removeEventListener('change', onTextareaChange, true)
      document.removeEventListener('keyup', onTextareaKeyup, true)
      document.removeEventListener('click', onPotentialPopupTriggerClick, true)

      if (popupObserver) {
        popupObserver.disconnect()
        popupObserver = null
      }
      observedPopupBox = null
      if (popupBodyObserver) {
        popupBodyObserver.disconnect()
        popupBodyObserver = null
      }
      clearPopupEnsureTasks()
      stopPopupRetryLoop()
    },
  }
}
