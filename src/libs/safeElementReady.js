import elementReady from 'element-ready'

// 持续查找匹配给定选择器的元素，直到 DOM 加载完成
export default selector => elementReady(selector, { stopOnDomReady: true })
