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
    fn = opts.fn
  }

  const exceptionHandler = defined(opts.exceptionHandler, defaultExceptionHandler)
  const args = defined(opts.args, [])

  try {
    const result = fn(...args)
    return result?.catch ? result.catch(exceptionHandler) : result
  } catch (error) {
    exceptionHandler(error)
  }
}
