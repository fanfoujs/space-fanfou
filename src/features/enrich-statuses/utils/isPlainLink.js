// 判断一个 <a /> 元素是否为纯文本链接（不包含图片或其他内容）
export default link => (
  link.childNodes.length === 1 &&
  link.firstChild.nodeName === '#text'
)
