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
    const isImageAttached = elementCollection.get('uploadBase64').value.length > 0

    toggleImageAttachedState(isImageAttached)
  }

  function filenameMutationObserverCallback() {
    const { uploadFilename } = elementCollection.getAll()

    uploadFilename.textContent = truncateFilename(uploadFilename.textContent, 28)
  }

  function onFileChange() {
    const isImageAttached = elementCollection.get('uploadFile').files.length > 0

    toggleImageAttachedState(isImageAttached)
  }

  function onClickClose() {
    toggleImageAttachedState(false)
  }

  function toggleImageAttachedState(isImageAttached) {
    const { uploadButton, uploadFilename, closeHandle } = elementCollection.getAll()

    uploadButton.classList.toggle(CLASSNAME_IMAGE_ATTACHED, isImageAttached)
    uploadFilename.style.display = isImageAttached ? 'inline' : 'none'
    closeHandle.style.display = isImageAttached ? 'inline' : 'none'
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
