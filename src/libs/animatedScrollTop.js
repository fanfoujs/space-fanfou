import scrollManager from '@content/modules/scrollManager'

let isRunning = false
let afId = null
let prevY = -1

function scroll() {
  const currY = scrollManager.getScrollTop()
  // 向下取整，否则若 0.xxx 取整为 1 则永远也不能滚动到最顶部
  const next = Math.floor(currY / 1.15)

  if (currY === 0) return stop()
  // 如果在滑动过程中用户自行滚动了页面，视为用户希望取消滚动
  // 如果用户开启了缩放，`currY` 可能有小数，所以不直接比较相等
  if (prevY !== -1 && Math.abs(currY - prevY) > 1) return stop()

  // 默认页面始终没有横向滚动条，所以横轴坐标写死为 0
  window.scrollTo(0, next)
  prevY = next
  afId = requestAnimationFrame(scroll)
}

function start() {
  if (isRunning) return
  isRunning = true

  scroll()
}

function stop() {
  if (!isRunning) return
  isRunning = false

  cancelAnimationFrame(afId)
  afId = null
  prevY = -1
}

export default async () => {
  await scrollManager.ready()

  start()
}
