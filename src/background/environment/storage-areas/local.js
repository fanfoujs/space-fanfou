import promisifyChromeApi from '@libs/promisifyChromeApi'
import safelyInvokeFns from '@libs/safelyInvokeFns'

function initLocalStorage() {
  const get = promisifyChromeApi(::chrome.storage.local.get)
  const set = promisifyChromeApi(::chrome.storage.local.set)
  const remove = promisifyChromeApi(::chrome.storage.local.remove)
  const listeners = []

  chrome.storage.local.onChanged.addListener(changes => {
    safelyInvokeFns({
      fns: listeners,
      args: [ changes ],
    })
  })

  return {
    async read(key) {
      return (await get(key))[key]
    },

    readAll() {
      return get(null)
    },

    async write(key, value) {
      await set({ [key]: value })
    },

    async writeAll(object) {
      await set(object)
    },

    async delete(key) {
      await remove(key)
    },

    listen(fn) {
      listeners.push(fn)
    },
  }
}

export default initLocalStorage()
