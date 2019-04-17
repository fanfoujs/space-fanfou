import simpleMemoize from 'just-once'
import safelyInvokeFns from '@libs/safelyInvokeFns'
import arrayUniquePush from '@libs/arrayUniquePush'
import arrayRemove from '@libs/arrayRemove'
import initLocalStorage from './localStorage'
import initSyncStorage from './syncStorage'
import initSessionStorage from './sessionStorage'

// 这里必须使用工厂函数，避免在非 background script 环境因为 import 而被意外执行，然后报错
export default simpleMemoize(() => {
  const storageAreas = {
    local: initLocalStorage(),
    sync: initSyncStorage(),
    session: initSessionStorage(),
  }
  const listeners = []

  const createListener = storageAreaName => changes => {
    for (const [ key, { oldValue, newValue } ] of Object.entries(changes)) {
      safelyInvokeFns({
        fns: listeners,
        args: [ {
          key,
          storageAreaName,
          oldValue,
          newValue,
        } ],
      })
    }
  }

  // sessionStorage 不需要监听改动
  for (const storageAreaName of [ 'local', 'sync' ]) {
    storageAreas[storageAreaName].listen(createListener(storageAreaName))
  }

  return {
    ...storageAreas,
    listen: fn => arrayUniquePush(listeners, fn),
    unlisten: fn => arrayRemove(listeners, fn),
  }
})
