import domLoaded from 'dom-loaded'
import elementReady from 'element-ready'

// 持续查找匹配给定选择器的元素，直到 DOM 加载完成
// 复制自：https://github.com/sindresorhus/refined-github/blob/7c75af58f77c705bd03d1ec9b5e15b9042884f15/source/libs/utils.js#L67-L78
export default selector => {
  const waiting = elementReady(selector)

  domLoaded.then(() => requestAnimationFrame(::waiting.cancel))

  // 若没有匹配到，返回 null
  return waiting.catch(() => null)
}
