import select from 'select-dom'

// 判断一个元素是否为 #stream > ol > li 的消息元素
// 区分开在 #stream > ol 中插入的其他元素（比如消息上下文的 div 容器元素）
// TODO: 需要更好的解决方法
export default element => (
  element.tagName.toLowerCase() === 'li' &&
  // 有些页面不显示头像和用户名，比如个人页面、收藏页面
  // select.exists(':scope > .avatar', element) &&
  // select.exists(':scope > .author', element) &&
  select.exists(':scope > .content', element) &&
  select.exists(':scope > .stamp', element) &&
  select.exists(':scope > .op', element)
)
