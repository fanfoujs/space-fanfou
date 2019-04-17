import select from 'select-dom'
import isEditableElement from 'dom-element-is-natively-editable'
import isElementInViewport from 'element-visible'
import { isPhotoEntryPage } from '@libs/pageDetect'
import isHotkey from '@libs/isHotkey'
import animatedScrollTop from '@libs/animatedScrollTop'
import findElementWithSpecifiedContentInArray from '@libs/findElementWithSpecifiedContentInArray'

export default context => {
  const { registerDOMEventListener } = context

  const hotkeyHandlers = [
    [ { key: 'ArrowLeft' }, goPrevPage ],
    [ { key: 'ArrowRight' }, goNextPage ],
    [ { key: 't' }, animatedScrollTop ],
    [ { key: 'Enter' }, focusTextarea ],
  ]

  registerDOMEventListener(document.documentElement, 'keydown', keyboardEventHandler)

  function keyboardEventHandler(event) {
    // 如果用户是在输入框中按下快捷键，忽略之
    if (isEditableElement(event.target)) return

    for (const [ hotkeyOpts, handler ] of hotkeyHandlers) {
      if (isHotkey(event, hotkeyOpts)) {
        event.preventDefault()
        handler()

        break
      }
    }
  }

  function goPrevPage() {
    const prevPageButton = (
      getPagerButtonsByText('上一页') ||
      getPhotoPagerButtonByText('上一张')
    )

    if (prevPageButton) prevPageButton.click()
  }

  function goNextPage() {
    const nextPageButton = (
      getPagerButtonsByText('下一页') ||
      getPhotoPagerButtonByText('下一张')
    )

    if (nextPageButton) nextPageButton.click()
  }

  function getPagerButtonsByText(text) {
    const allPageButtons = select.all('.paginator > li > a')
    const buttonWithSpecifiedText = findElementWithSpecifiedContentInArray(allPageButtons, text)

    return buttonWithSpecifiedText
  }

  function getPhotoPagerButtonByText(text) {
    if (isPhotoEntryPage()) {
      const allPageButtons = select.all('#crumb > ul > li > a[href^="/photo/"]')
      const buttonWithSpecifiedText = findElementWithSpecifiedContentInArray(allPageButtons, text)

      return buttonWithSpecifiedText
    }
  }

  function focusTextarea() {
    const textarea = select('#phupdate textarea')

    if (textarea && isElementInViewport(textarea)) {
      textarea.focus()
    }
  }
}
