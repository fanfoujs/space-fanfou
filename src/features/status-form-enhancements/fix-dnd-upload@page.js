import { h } from 'dom-chef'
import once from 'just-once'
import replaceExtensionOrigin from '@libs/replaceExtensionOrigin'
import blobToBase64 from '@libs/blobToBase64'

// https://www.flaticon.com/free-icon/download_24156
// eslint-disable-next-line import/newline-after-import
import DROP_ICON_URL from '@assets/images/download.svg'
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
    elementCollection.get('textareaWrapper').append(tip)
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

    // 防御性检查：确保所有元素存在
    if (!message || !action || !textarea || !uploadFilename || !updateBase64) {
      console.error('[SpaceFanfou] DND upload: Missing required elements', {
        message: !!message,
        action: !!action,
        textarea: !!textarea,
        uploadFilename: !!uploadFilename,
        updateBase64: !!updateBase64,
      })
      return
    }

    try {
      message.setAttribute('action', '/home/upload')
      message.setAttribute('enctype', 'multipart/form-data')
      action.value = 'photo.upload'
      textarea.setAttribute('name', 'desc')
      uploadFilename.textContent = file.name

      // 立即恢复 textarea 交互（在异步操作之前）
      textarea.focus()

      // 异步转换 base64，添加错误处理
      const base64 = await blobToBase64(file)
      updateBase64.value = base64
    } catch (error) {
      console.error('[SpaceFanfou] DND upload failed:', error)
      // 失败时清理状态
      uploadFilename.textContent = ''
      // 确保 textarea 可交互
      textarea.focus()
    }
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
