import select from 'select-dom'
import { isTimelinePage } from '@libs/pageDetect'

// TODO: 可以改为取消绑定原来的事件

function onClick(event) {
  const img = event.target
  const link = img.parentElement

  if (img.naturalHeight / img.naturalWidth > 3) {
    // 如果照片纵向过长，在当前页面直接显示效果会不理想，图片会缩得太小看不清
    // 所以改为在新窗口显示大图
    const photoEntryUrl = window.location.origin + link.getAttribute('name')

    event.stopImmediatePropagation()
    event.preventDefault()

    window.open(photoEntryUrl)
  } else {
    // 饭否似乎是等待图片预加载完才会把图片显示出来
    // 因此偶尔出现点击图片显示的是前一次点击的图片的情况
    // 在用户点击缩略图后立即修改大图的地址，以解决这个问题
    select('#ZoomImage').src = link.href
  }
}

function processStatus(li) {
  const photo = select('.photo.zoom img', li)

  if (photo) photo.addEventListener('click', onClick)
}

function mutationObserverCallback(mutationRecords) {
  for (const { addedNodes } of mutationRecords) {
    for (const li of addedNodes) processStatus(li)
  }
}

export default context => {
  const { requireModules } = context
  const { timelineElementObserver } = requireModules([ 'timelineElementObserver' ])

  return {
    applyWhen: () => isTimelinePage(),

    onLoad() {
      timelineElementObserver.addCallback(mutationObserverCallback)
    },

    onUnload() {
      timelineElementObserver.removeCallback(mutationObserverCallback)
    },
  }
}
