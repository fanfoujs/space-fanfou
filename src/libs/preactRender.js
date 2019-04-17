import { render } from 'preact'
import noop from '@libs/noop'

// 渲染后返回一个 unmount 函数
export default (vNode, container) => {
  let callback, root

  if (typeof container === 'function') {
    callback = container
    container = document.createElement('div')
  } else {
    callback = noop
  }

  root = render(vNode, container)
  callback(root)

  return function unmount() {
    // https://github.com/developit/preact/issues/53#issuecomment-184868295
    render(null, container, root)
    root = null
  }
}
