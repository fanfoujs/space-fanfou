import { isPrivateMessagePage } from '@libs/pageDetect'
import every from '@libs/promiseEvery'
import neg from '@libs/neg'

export default context => {
  const { requireModules, elementCollection } = context
  const { statusFormIntersectionObserver } = requireModules([ 'statusFormIntersectionObserver' ])

  let updatePlaceholder
  let isFloatingEnabled = false

  elementCollection.add({
    update: '#phupdate',
    act: { parent: 'update', selector: '.act' },
    textarea: { parent: 'update', selector: 'textarea' },
  })

  function enableFloating() {
    if (isFloatingEnabled) return
    isFloatingEnabled = true

    const update = elementCollection.get('update')

    // #phupdate 变成浮动状态后，它原本占据的空间需要有一个占位符来保持住
    // 否则页面高度会发生变化，从而出现内容位置抖动现象
    updatePlaceholder.style.height = `${update.offsetHeight}px`
    updatePlaceholder.style.margin = getComputedStyle(update).margin
    updatePlaceholder.hidden = false

    update.classList.add('sf-floating-status-form')
  }

  function disableFloating() {
    if (!isFloatingEnabled) return
    isFloatingEnabled = false

    updatePlaceholder.hidden = true

    elementCollection.get('update').classList.remove('sf-floating-status-form')
  }

  function intersectionObserverCallback(isIntersected) {
    if (isIntersected) {
      disableFloating()
    } else {
      enableFloating()
    }
  }

  function expandTextareaAndShowOperationButtons() {
    const { act, textarea } = elementCollection.getAll()

    // 初始状态下，输入框下面的一排操作按钮是隐藏状态的
    // 点击输入框或者输入文字，则输入框会扩展高度，同时把下面一排操作按钮显示出来
    // 但是如果在浮动状态下第一次点击输入框，则输入框高度会拉高
    // 而下面的操作按钮却不会在恢复非浮动状态后显示出来
    // 所以我们在这里主动调整显示状态，只需操作一次即可
    act.style.display = 'block'
    textarea.style.height = '4.6em'

    // 原本也可以用 addEventListener 的 { once: true } 参数
    // 但是相比于下面这种手动处理还是略差一些
    // 手动处理可以保证函数一定只执行一次，使用 { once: true } 则是各事件分别执行一次
    textarea.removeEventListener('click', expandTextareaAndShowOperationButtons)
    textarea.removeEventListener('input', expandTextareaAndShowOperationButtons)
  }

  return {
    applyWhen: () => every([
      neg(isPrivateMessagePage()),
      elementCollection.ready('update'),
    ]),

    onLoad() {
      const textarea = elementCollection.get('textarea')

      updatePlaceholder = document.createElement('div')
      updatePlaceholder.setAttribute('id', 'sf-phupdate-placeholder')
      updatePlaceholder.hidden = true
      elementCollection.get('update').before(updatePlaceholder)

      statusFormIntersectionObserver.addListener(intersectionObserverCallback)

      textarea.addEventListener('click', expandTextareaAndShowOperationButtons)
      textarea.addEventListener('input', expandTextareaAndShowOperationButtons)
    },

    onUnload() {
      disableFloating()

      updatePlaceholder.remove()
      updatePlaceholder = null

      statusFormIntersectionObserver.removeListener(intersectionObserverCallback)
    },
  }
}
