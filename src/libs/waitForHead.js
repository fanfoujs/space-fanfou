import simpleMemoize from 'just-once'
import keepRetry from '@libs/keepRetry'

export default simpleMemoize(() => keepRetry({
  checker: () => document.head,
  delay: 0, // 这里必须是 0，否则会影响到主样式的加载速度，进而出现样式抖动现象
}))
