import wrapper from '@libs/wrapper'
import safeElementReady from '@libs/safeElementReady'
import safelyInvokeFns from '@libs/safelyInvokeFns'
import arrayUniquePush from '@libs/arrayUniquePush'
import arrayRemove from '@libs/arrayRemove'

// #phupdate 为首页发送消息的表单所在的容器元素
// 我们放置一个 spy 元素，用来辅助判断页面是否滚动到 #phupdate 可见的位置
// 之所以监听 spy 元素而不是直接监听 #phupdate 元素，是因为需要考虑浮动输入框的情况

let observer
let spy
const listeners = []

function createSpy(update) {
  const documentRect = document.documentElement.getBoundingClientRect()
  const updateRect = update.getBoundingClientRect()
  // #phupdate 相对于 document 的纵向偏移量
  const updateOffset = updateRect.top - documentRect.top

  spy = document.createElement('div')
  spy.classList.add('sf-spy')
  spy.style.position = 'absolute'
  // 把 spy 放到相对 #phupdate 靠上一点的位置
  // 之所以要靠上一点，对于浮动输入框是否要开启浮动的判定有帮助
  spy.style.top = `${updateOffset - 11}px`
  spy.style.pointerEvents = 'none'
  document.body.appendChild(spy)

  return spy
}

function intersectionObserverCallback([ { intersectionRatio } ]) {
  const isIntersected = intersectionRatio > 0

  safelyInvokeFns({
    fns: listeners,
    args: [ isIntersected ],
  })
}

export default wrapper({
  async install() {
    const update = await safeElementReady('#phupdate')

    if (update) {
      createSpy(update)

      observer = new IntersectionObserver(intersectionObserverCallback)
      observer.observe(spy)
    }

    return !!update
  },

  uninstall() {
    if (observer) {
      observer.disconnect()
      spy.remove()
      observer = spy = null
      listeners.length = 0
    }
  },

  addListener(fn) {
    arrayUniquePush(listeners, fn)
  },

  removeListener(fn) {
    arrayRemove(listeners, fn)
  },
})
