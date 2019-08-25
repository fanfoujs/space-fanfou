import select from 'select-dom'
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
  base64.value = await blobToBase64(imageBlob)

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
