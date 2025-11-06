import safelyInvokeFn from '@libs/safelyInvokeFn'

export function readJSONFromLocalStorage(key) {
  let value = null

  // Service Worker 环境：localStorage 不可用
  if (typeof localStorage === 'undefined') {
    return null
  }

  safelyInvokeFn(() => {
    value = JSON.parse(localStorage.getItem(key))
  })

  return value
}

export function writeJSONToLocalStorage(key, value) {
  // Service Worker 环境：localStorage 不可用，静默失败
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(key, JSON.stringify(value))
}
