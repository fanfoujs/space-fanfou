import { clearAttachment } from './attachmentStore'
import truncateFilename from '@libs/truncateFilename'

const CLASSNAME_IMAGE_ATTACHED = 'sf-image-attached'

export default context => {
  const { registerDOMEventListener, elementCollection } = context

  let base64MutationObserver
  let filenameMutationObserver

  elementCollection.add({
    uploadWrapper: '#upload-wrapper',
    uploadButton: '#upload-button',
    uploadFile: '#upload-file',
    uploadBase64: '#upload-base64',
    uploadFilename: '#upload-filename',
    closeHandle: '.upload-close-handle',
  })

  registerDOMEventListener('uploadFile', 'change', onFileChange)
  registerDOMEventListener('closeHandle', 'click', onClickClose)

  function base64MutationObserverCallback() {
    console.log('[SpaceFanfou Upload] base64MutationObserverCallback 被触发')
    const isImageAttached = elementCollection.get('uploadBase64').value.length > 0
    console.log('[SpaceFanfou Upload] isImageAttached =', isImageAttached)

    toggleImageAttachedState(isImageAttached)
  }

  function filenameMutationObserverCallback() {
    console.log('[SpaceFanfou Upload] filenameMutationObserverCallback 被触发')
    const { uploadFilename } = elementCollection.getAll()
    const originalText = uploadFilename.textContent
    const truncatedText = truncateFilename(originalText, 28)
    console.log('[SpaceFanfou Upload] 文件名:', originalText, '→', truncatedText)

    // 只有当文件名真的需要改变时才修改，避免无限循环
    if (originalText !== truncatedText) {
      console.log('[SpaceFanfou Upload] 文件名需要截断，更新 textContent')
      uploadFilename.textContent = truncatedText
    } else {
      console.log('[SpaceFanfou Upload] 文件名无需截断，跳过')
    }
  }

  function onFileChange() {
    console.log('[SpaceFanfou Upload] onFileChange 被触发')
    const uploadFile = elementCollection.get('uploadFile')
    const isImageAttached = uploadFile.files.length > 0
    console.log('[SpaceFanfou Upload] 文件数量:', uploadFile.files.length)
    if (isImageAttached) {
      console.log('[SpaceFanfou Upload] 文件信息:', uploadFile.files[0].name, uploadFile.files[0].size, 'bytes')
    }

    toggleImageAttachedState(isImageAttached)
  }

  function onClickClose() {
    const { uploadBase64, uploadFile, uploadFilename } = elementCollection.getAll()

    uploadBase64.value = ''
    uploadBase64.setAttribute('value', '')
    uploadFile.value = ''
    uploadFilename.textContent = ''
    clearAttachment()
    toggleImageAttachedState(false)
  }

  function toggleImageAttachedState(isImageAttached) {
    console.log('[SpaceFanfou Upload] toggleImageAttachedState:', isImageAttached)
    const { uploadButton, uploadFilename, closeHandle } = elementCollection.getAll()

    uploadButton.classList.toggle(CLASSNAME_IMAGE_ATTACHED, isImageAttached)
    uploadFilename.style.display = isImageAttached ? 'inline' : 'none'
    closeHandle.style.display = isImageAttached ? 'inline' : 'none'
    console.log('[SpaceFanfou Upload] 按钮类名:', uploadButton.className)
  }

  return {
    applyWhen: () => elementCollection.ready('uploadWrapper'),

    onLoad() {
      base64MutationObserver = new MutationObserver(base64MutationObserverCallback)
      base64MutationObserver.observe(elementCollection.get('uploadBase64'), {
        attributes: true,
        attributeFilter: [ 'value' ],
      })

      filenameMutationObserver = new MutationObserver(filenameMutationObserverCallback)
      filenameMutationObserver.observe(elementCollection.get('uploadFilename'), {
        childList: true,
      })
    },

    onUnload() {
      base64MutationObserver.disconnect()
      base64MutationObserver = null

      filenameMutationObserver.disconnect()
      filenameMutationObserver = null
    },
  }
}
