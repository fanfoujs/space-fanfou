// 传统解析 HTML 字符串为 DOM 的方式是，创建一个临时 div 元素然后设置 innerHTML
// 但是会执行其中的 JavaScript（包括 <script /> 以及各种元素的 onLoad 属性等）
// 并且会请求其中的图片等资源
// 但是我们想做的往往只是调用 querySelector 查找特定的信息罢了
// 下面这个办法完美规避了上述问题
export default html => {
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')

  return document
}
