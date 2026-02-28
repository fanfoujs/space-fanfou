import log from '@libs/log'
import safelyInvokeFn from '@libs/safelyInvokeFn'

function isLocalStorageAvailable() {
  return typeof localStorage !== 'undefined'
}

export function readJSONFromLocalStorage(key) {
  if (!isLocalStorageAvailable()) {
    log.info('[SpaceFanfou] localStorage unavailable, skip read for key', key)
    return null
  }

  let value = null

  safelyInvokeFn(() => {
    value = JSON.parse(localStorage.getItem(key))
  })

  return value
}

export function writeJSONToLocalStorage(key, value) {
  if (!isLocalStorageAvailable()) {
    log.info('[SpaceFanfou] localStorage unavailable, skip write for key', key)
    return
  }

  safelyInvokeFn(() => {
    localStorage.setItem(key, JSON.stringify(value))
  })
}
