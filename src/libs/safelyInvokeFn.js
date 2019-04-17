import defined from 'defined'
import log from '@libs/log'

function defaultExceptionHandler(error) {
  log.error(error)
}

// 使用 try-catch 包裹调用函数
export default opts => {
  let fn

  if (typeof opts === 'function') {
    fn = opts
    opts = {}
  } else {
    fn = opts.fn // eslint-disable-line prefer-destructuring
  }

  const exceptionHandler = defined(opts.exceptionHandler, defaultExceptionHandler)
  const args = defined(opts.args, [])

  try {
    fn(...args)
  } catch (error) {
    exceptionHandler(error)
  }
}
