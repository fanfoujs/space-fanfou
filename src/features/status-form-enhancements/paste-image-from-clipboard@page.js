import select from 'select-dom'
import { setAttachment } from './attachmentStore'
import { showElement } from '@libs/toggleVisibility'
import blobToBase64 from '@libs/blobToBase64'

function isImage(type) {
  return /^image\/(jpe?g|png|gif|bmp)$/.test(type)
}

async function onPaste(event) {
  const items = Array.from(event.clipboardData.items)
  const files = items.map(item => item.getAsFile()).filter(x => x instanceof Blob)
  const imageBlob = files.find(file => isImage(file.type))

  if (!imageBlob) return

  const imageType = imageBlob.type.replace('image/', '')

  const uploadFilename = select('#upload-filename')
  uploadFilename.textContent = `image-from-clipboard.${imageType}`
  showElement(uploadFilename)

  const close = select('#ul_close')
  showElement(close)

  const message = select('#message')
  message.setAttribute('action', '/home/upload')
  message.setAttribute('enctype', 'multipart/form-data')

  const actionField = select('#phupdate input[name="action"]')
  actionField.value = 'photo.upload'

  const textarea = select('#phupdate textarea')
  textarea.setAttribute('name', 'desc')

  const base64 = select('#upload-base64')
  const base64Value = await blobToBase64(imageBlob)
  base64.value = base64Value
  base64.setAttribute('value', base64Value)

  const fileForUpload = imageBlob instanceof File
    ? imageBlob
    : new File([ imageBlob ], uploadFilename.textContent, { type: imageBlob.type || `image/${imageType}` })

  setAttachment({
    file: fileForUpload,
    filename: uploadFilename.textContent,
    source: 'clipboard',
  })

  const uploadWrapper = select(('#upload-wrapper'))
  showElement(uploadWrapper)
}

export default context => {
  const { elementCollection, registerDOMEventListener } = context

  elementCollection.add({
    textarea: '#phupdate textarea',
  })

  registerDOMEventListener(window, 'paste', onPaste)

  return {
    applyWhen: () => elementCollection.ready('textarea'),
  }
}
