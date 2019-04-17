import dotProp from 'dot-prop'
import Deferred from '@libs/Deferred'

const CHECKING_INTERVAL = 16

const libs = new Map()
const pending = new Set()
let timer

function hasRequested(libName) {
  return libs.has(libName)
}

function request(libName) {
  libs.set(libName, new Deferred())
  pending.add(libName)
  setTimer()
}

function setTimer() {
  if (timer) return

  timer = setInterval(check, CHECKING_INTERVAL)
}

function clearTimer() {
  if (!timer) return

  clearInterval(timer)
  timer = null
}

function check() {
  for (const libName of pending) {
    const lib = dotProp.get(window, libName)

    if (typeof lib !== 'undefined') {
      pending.delete(libName)
      libs.get(libName).resolve(lib)
    }
  }

  if (!pending.size) clearTimer()
}

function resolve(libName) {
  return libs.get(libName).promise
}

export default libName => {
  if (!hasRequested(libName)) {
    request(libName)
  }

  return resolve(libName)
}
