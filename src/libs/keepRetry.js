import safelyInvokeFn from '@libs/safelyInvokeFn'
import noop from '@libs/noop'

function forever() {
  return false
}

async function keepRetry(opts) {
  const {
    checker,
    executor = noop,
    delay = 100,
    until = forever,
    resolve,
    reject,
  } = opts

  if (await checker()) {
    safelyInvokeFn(executor)
    resolve(true)
  } else if (until()) {
    reject()
  } else {
    setTimeout(keepRetry, delay, opts)
  }
}

export default opts => new Promise((resolve, reject) => {
  keepRetry({ ...opts, resolve, reject })
})
