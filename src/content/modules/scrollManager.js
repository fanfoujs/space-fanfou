import wrapper from '@libs/wrapper'
import safelyInvokeFns from '@libs/safelyInvokeFns'
import arrayUniquePush from '@libs/arrayUniquePush'
import arrayRemove from '@libs/arrayRemove'

const CHECKING_INTERVAL = 32

let timerId = null
let prevY = -1 // 默认页面始终没有横向滚动条，所以只处理纵轴
const listeners = []

function handler() {
  const currY = scrollManager.getScrollTop()

  if (prevY !== -1 && currY !== prevY) {
    safelyInvokeFns(listeners)
  }

  prevY = currY
}

const scrollManager = wrapper({
  install() {
    if (timerId) return

    // 使用定时器而不是直接监听 scroll 事件，提升性能
    // https://johnresig.com/blog/learning-from-twitter/
    // 考虑换成 requestAnimationFrame？
    timerId = setInterval(handler, CHECKING_INTERVAL)
    // 初始化
    handler()
  },

  uninstall() {
    if (!timerId) return

    clearInterval(timerId)
    timerId = null
  },

  addListener(fn) {
    arrayUniquePush(listeners, fn)
  },

  removeListener(fn) {
    arrayRemove(listeners, fn)
  },

  getScrollTop() {
    return Math.max(
      document.documentElement ? document.documentElement.scrollTop : 0,
      document.body ? document.body.scrollTop : 0,
    )
  },
})

export default scrollManager
