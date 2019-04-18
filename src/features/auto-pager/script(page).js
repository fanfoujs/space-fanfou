import isVisible from 'is-visible'
import debounce from 'just-debounce-it'
import { isPublicTimelinePage } from '@libs/pageDetect'
import every from '@libs/promiseEvery'
import neg from '@libs/neg'

// 「更多」按钮与可视区域底部距离缩小到该值时即自动加载
const BUFFER = 500
const SCROLL_DEBOUNCE_WAIT = 250

export default context => {
  const { requireModules, elementCollection } = context
  const { scrollManager } = requireModules([ 'scrollManager' ])

  const onScroll = debounce(() => {
    if (!hasReachedBottom()) return
    if (isLoading()) return
    if (!isButtonVisible()) return

    loadMore()
  }, SCROLL_DEBOUNCE_WAIT)

  elementCollection.add({
    buttonMore: '#pagination-more',
  })

  function loadMore() {
    elementCollection.get('buttonMore').click()
  }

  function hasReachedBottom() {
    const scrollY = scrollManager.getScrollTop() + document.documentElement.clientHeight
    const buttonY = elementCollection.get('buttonMore').offsetTop

    return buttonY <= scrollY + BUFFER
  }

  function isLoading() {
    return elementCollection.get('buttonMore').classList.contains('loading')
  }

  function isButtonVisible() {
    return isVisible(elementCollection.get('buttonMore'))
  }

  return {
    applyWhen: () => every([
      neg(isPublicTimelinePage()),
      elementCollection.ready('buttonMore'),
    ]),

    onLoad() {
      scrollManager.addListener(onScroll)
    },

    onUnload() {
      scrollManager.removeListener(onScroll)
    },
  }
}
