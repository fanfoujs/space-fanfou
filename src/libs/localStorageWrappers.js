import safelyInvokeFn from '@libs/safelyInvokeFn'

export function readJSONFromLocalStorage(key) {
  let value = null

  safelyInvokeFn(() => {
    value = JSON.parse(localStorage.getItem(key))
  })

  return value
}

export function writeJSONToLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}
