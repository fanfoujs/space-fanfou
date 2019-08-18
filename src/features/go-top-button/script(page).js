import select from 'select-dom'
import elementReady from 'element-ready'
import { h } from 'dom-chef'
import debounce from 'just-debounce-it'
import animatedScrollTop from '@libs/animatedScrollTop'
import any from '@libs/promiseAny'

// #main 最顶部的纵坐标。硬编码不太好，但是逻辑简单许多。
const MAIN_TOP = 66
const SCROLL_DEBOUNCE_WAIT = 500

export default context => {
  const { requireModules } = context
  const { scrollManager } = requireModules([ 'scrollManager' ])

  let toTopButton
  let isHidden = false

  function createButton() {
    const existingButton = select('#pagination-totop')
    const container = (
      (select('#stream') && select('#stream').parentElement) ||
      select('.inner-content')
    )
    toTopButton = (
      <a id="pagination-totop" onClick={clickHandler}>返回顶部</a>
    )

    if (existingButton) existingButton.remove()
    container.appendChild(toTopButton)
    hideButton()

    return toTopButton
  }

  function clickHandler(event) {
    event.preventDefault()

    hideButton()
    animatedScrollTop()
  }

  const debouncedScrollHandler = debounce(() => {
    if (scrollManager.getScrollTop() > MAIN_TOP) {
      showButton()
    } else {
      hideButton()
    }
  }, SCROLL_DEBOUNCE_WAIT)

  function scrollHandler() {
    hideButton()
    debouncedScrollHandler()
  }

  function showButton() {
    if (!isHidden) return
    isHidden = false

    toTopButton.style.display = ''
    requestAnimationFrame(() => Object.assign(toTopButton.style, {
      opacity: 0.5,
      cursor: 'pointer',
      transition: 'opacity .4s ease-in-out',
    }))
  }

  function hideButton() {
    if (isHidden) return
    isHidden = true

    Object.assign(toTopButton.style, {
      display: 'none',
      opacity: 0,
      transition: '',
    })
  }

  return {
    applyWhen: () => any([
      elementReady('#stream'),
      elementReady('.inner-content'),
    ]),

    onLoad() {
      toTopButton = createButton()
      scrollManager.addListener(scrollHandler)
    },

    onUnload() {
      toTopButton.remove()
      toTopButton = null
      scrollManager.removeListener(scrollHandler)
    },
  }
}
