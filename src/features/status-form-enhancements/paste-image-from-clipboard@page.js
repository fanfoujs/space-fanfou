/* eslint-disable no-console */
import select from 'select-dom'
import { setAttachment } from './attachmentStore'
import { showElement } from '@libs/toggleVisibility'
import blobToBase64 from '@libs/blobToBase64'

const MAX_CLIPBOARD_IMAGE_BYTES = Math.round(2.5 * 1024 * 1024)
const JPEG_QUALITIES = [ 0.92, 0.85, 0.75, 0.65, 0.55 ]

function isImage(type) {
  return /^image\/(jpe?g|png|gif|bmp)$/.test(type)
}

function getExtensionFromMimeType(type) {
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/png') return 'png'
  if (type === 'image/gif') return 'gif'
  if (type === 'image/x-ms-bmp') return 'bmp'
  return (type || 'image/png').replace('image/', '')
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()

    image.addEventListener('load', () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }, { once: true })
    image.addEventListener('error', error => {
      URL.revokeObjectURL(url)
      reject(error)
    }, { once: true })
    image.src = url
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('[SpaceFanfou Clipboard] canvas.toBlob 返回空结果'))
      }
    }, type, quality)
  })
}

async function normalizeClipboardImage(imageBlob) {
  if (imageBlob.type !== 'image/png' || imageBlob.size <= MAX_CLIPBOARD_IMAGE_BYTES) {
    return imageBlob
  }

  try {
    const image = await loadImageFromBlob(imageBlob)
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth || image.width
    canvas.height = image.naturalHeight || image.height

    const context = canvas.getContext('2d')
    if (!context) return imageBlob

    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0)

    let bestBlob = imageBlob

    for (const quality of JPEG_QUALITIES) {
      const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', quality)
      if (jpegBlob.size < bestBlob.size) {
        bestBlob = jpegBlob
      }
      if (jpegBlob.size <= MAX_CLIPBOARD_IMAGE_BYTES) {
        console.log('[SpaceFanfou Clipboard] 已将过大的 PNG 转为 JPEG 以上传:', {
          originalType: imageBlob.type,
          originalSize: imageBlob.size,
          normalizedType: jpegBlob.type,
          normalizedSize: jpegBlob.size,
          quality,
          width: canvas.width,
          height: canvas.height,
        })
        return jpegBlob
      }
    }

    if (bestBlob !== imageBlob) {
      console.log('[SpaceFanfou Clipboard] PNG 转 JPEG 后虽仍偏大，但已获得更小文件，使用更小版本上传:', {
        originalType: imageBlob.type,
        originalSize: imageBlob.size,
        normalizedType: bestBlob.type,
        normalizedSize: bestBlob.size,
        width: canvas.width,
        height: canvas.height,
      })
      return bestBlob
    }
  } catch (error) {
    console.warn('[SpaceFanfou Clipboard] 剪贴板图片归一化失败，回退原图上传:', error)
  }

  return imageBlob
}

async function onPaste(event) {
  const items = Array.from(event.clipboardData.items)
  const files = items.map(item => item.getAsFile()).filter(x => x instanceof Blob)
  const imageBlob = files.find(file => isImage(file.type))

  if (!imageBlob) return

  const normalizedBlob = await normalizeClipboardImage(imageBlob)
  const imageType = getExtensionFromMimeType(normalizedBlob.type)
  console.log('[SpaceFanfou Clipboard] 捕获到剪贴板图片:', {
    originalType: imageBlob.type,
    originalSize: imageBlob.size,
    uploadType: normalizedBlob.type,
    uploadSize: normalizedBlob.size,
  })

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
  const base64Value = await blobToBase64(normalizedBlob)
  base64.value = base64Value
  base64.setAttribute('value', base64Value)

  const fileForUpload = normalizedBlob instanceof File && normalizedBlob.name === uploadFilename.textContent
    ? normalizedBlob
    : new File([ normalizedBlob ], uploadFilename.textContent, { type: normalizedBlob.type || `image/${imageType}` })

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
