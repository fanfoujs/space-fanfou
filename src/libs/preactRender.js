import { render } from 'preact'
import { unmountComponentAtNode } from 'preact/compat'

/*
 * Preact 10 调整了 `render()` 的行为，现在它接受三个参数。
 *
 * 对于 React 来说，调用 `render(vNode, root)` 会重用 `root` 这个元素；但对于 Preact，
 * 调用 `render(vNode, root)` 会在 `root` 元素内创建子元素作为 `vNode` 的根元素挂载点
 * （或者重用 `root` 内已有的子元素）。假如想要把我们的 Preact 组件的根元素挂载到
 * `container` 这个元素中，不能直接使用 `render(vNode, container)`，这很可能会导致
 * `container` 原有的内容被改写。所以不得不额外创建一个元素 `wrapper`，放到 `container`
 * 内，再调用 `render(vNode, wrapper)`，这就导致多出来了一个无用元素。

 * 如果使用第三个参数，即 `render(vNode, root, root)`，可以使得 Preact 获得和 React 一
 * 样的行为——重用 `root` 元素。但是也带来问题——调用 `unmountComponentAtNode()` 无效。

 * 所以使用下面的方法来同时规避上面两种情况各自的问题。
 */

export default (vNode, callback) => {
  // 创建一个临时容器，这个容器只用来存放 `vNode` 渲染出来的元素，不会暴露到函数外
  let container = document.createElement('div')

  render(vNode, container)
  // 这里用户会把渲染出来的内容挂载到 DOM 中所需要的位置，这些内容不再是 `container` 的子元素
  if (callback) callback(container.firstChild)

  return function unmount() {
    unmountComponentAtNode(container)
    container = null
  }
}
