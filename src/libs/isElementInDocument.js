// 判断元素是否存在于 DOM 树中
export default element => {
  const root = element.ownerDocument.documentElement
  const isInDocument = root.contains(element)

  return isInDocument
}
