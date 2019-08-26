import { h } from 'dom-chef'
import once from 'just-once'
import replaceExtensionOrigin from '@libs/replaceExtensionOrigin'
import blobToBase64 from '@libs/blobToBase64'

// https://www.flaticon.com/free-icon/download_24156
// eslint-disable-next-line import/newline-after-import
const DROP_ICON_URL = require('@assets/images/download.svg')
const CLASSNAME_SHOW_TIP = 'sf-show-dnd-upload-tip'

export default context => {
  const { registerDOMEventListener, elementCollection } = context

  let tip
  let n = 0

  elementCollection.add({
    update: '#phupdate',
    message: '#message',
    textareaWrapper: { parent: 'update', selector: '.textarea-wrapper' },
    action: { parent: 'update', selector: 'input[name=action]' },
    textarea: { parent: 'update', selector: 'textarea' },
    uploadFilename: '#upload-filename',
    uploadWrapper: '#upload-wrapper',
    updateBase64: '#upload-base64',
    act: { parent: 'update', selector: '.act' },
  })

  registerDOMEventListener(window, 'dragenter', onDragEnter)
  registerDOMEventListener(window, 'dragover', onDragOver)
  registerDOMEventListener(window, 'dragleave', onDragLeave)
  registerDOMEventListener(window, 'drop', onDrop)

  function createTip() {
    tip = (
      <div id="sf-dnd-upload-tip">
        <img src={replaceExtensionOrigin(DROP_ICON_URL)} />
        拖放图片到这里
      </div>
    )
    elementCollection.get('textareaWrapper').appendChild(tip)
  }

  function removeTip() {
    tip.remove()
    tip = null
  }

  const expandTextarea = once(() => {
    const { act, textarea } = elementCollection.getAll()

    act.style.display = 'block'
    textarea.style.height = '4.6em'
  })

  function isDraggingFiles(event) {
    return Array.from(event.dataTransfer.items)
      .some(item => item.kind === 'file')
  }

  function isDraggingImages(event) {
    return Array.from(event.dataTransfer.items)
      .some(item => item.type.startsWith('image/'))
  }

  function setDropEffect(event) {
    event.dataTransfer.dropEffect = isDraggingImages(event) ? 'copy' : 'none'
  }

  function onDragEnter(event) {
    if (!isDraggingFiles(event)) return

    event.preventDefault()
    setDropEffect(event)

    // https://stackoverflow.com/a/29808690/4617270
    if (isDraggingImages(event) && n++ === 0) {
      expandTextarea()
      document.body.classList.add(CLASSNAME_SHOW_TIP)
      elementCollection.get('textarea').blur()
    }
  }

  function onDragOver(event) {
    if (isDraggingFiles(event)) {
      event.preventDefault()
      setDropEffect(event)
    }
  }

  function onDragLeave(event) {
    if (isDraggingImages(event) && --n === 0) {
      document.body.classList.remove(CLASSNAME_SHOW_TIP)
    }
  }

  function onDrop(event) {
    if (!isDraggingImages(event)) return

    event.preventDefault()
    document.body.classList.remove(CLASSNAME_SHOW_TIP)
    n = 0

    const { update } = elementCollection.getAll()

    if (update.contains(event.target)) {
      const file = event.dataTransfer.files[0]

      processForm(file)
    }
  }

  async function processForm(file) {
    const { message, action, textarea, uploadFilename, updateBase64 } = elementCollection.getAll()

    message.setAttribute('action', '/home/upload')
    message.setAttribute('enctype', 'multipart/form-data')
    action.value = 'photo.upload'
    textarea.setAttribute('name', 'desc')
    textarea.focus()
    uploadFilename.textContent = file.name
    updateBase64.value = await blobToBase64(file)
  }

  return {
    applyWhen: () => elementCollection.ready('uploadWrapper'),

    onLoad() {
      createTip()
    },

    onUnload() {
      removeTip()
    },
  }
}
