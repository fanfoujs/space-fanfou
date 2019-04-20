import deepEqual from 'fast-deep-equal'
import simpleMemoize from 'just-once'
import promisifyChromeApi from '@libs/promisifyChromeApi'
import safelyInvokeFns from '@libs/safelyInvokeFns'

export default simpleMemoize(() => {
  const get = promisifyChromeApi(::chrome.storage.sync.get)
  const set = promisifyChromeApi(::chrome.storage.sync.set)
  const remove = promisifyChromeApi(::chrome.storage.sync.remove)
  const listeners = []

  chrome.storage.sync.onChanged.addListener(changes => {
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
      const oldValue = await get(key)

      // 写入操作有限额，因此只在值确实发生了变化的情况下写入
      // Chrome 应该自带这个判断，但是实测并没有
      if (!deepEqual(oldValue, value)) {
        // 但是这个操作仍然可能因为超出限额而报错，需要注意
        await set({ [key]: value })
      }
    },

    async writeAll(object) {
      const oldValue = {}

      for (const key of Object.keys(object)) {
        oldValue[key] = await get(key)
      }

      if (!deepEqual(oldValue, object)) {
        await set(object)
      }
    },

    async delete(key) {
      await remove(key)
    },

    listen(fn) {
      listeners.push(fn)
    },
  }
})
