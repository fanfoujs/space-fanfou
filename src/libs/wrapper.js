import isPromise from 'is-promise'
import extensionUnloaded from '@libs/extensionUnloaded'
import noop from '@libs/noop'

function toBooleanPromise(x) {
  // 如果 install() 没有返回 Boolean|Promise<Boolean>，默认返回 Promise<true>
  return typeof x === 'boolean'
    ? x
    : isPromise(x) ? x.then(toBooleanPromise) : Promise.resolve(true)
}

export default module => {
  let promise
  const { install = noop, uninstall = noop, ...rest } = module

  extensionUnloaded.addListener(uninstall)

  return {
    ...rest,

    ready() {
      return promise || (promise = toBooleanPromise(install()))
    },
  }
}
