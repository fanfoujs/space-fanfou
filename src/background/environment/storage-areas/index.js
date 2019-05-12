import local from './local'
import sync from './sync'
import session from './session'
import safelyInvokeFns from '@libs/safelyInvokeFns'
import arrayUniquePush from '@libs/arrayUniquePush'
import arrayRemove from '@libs/arrayRemove'

function initStorageAreas() {
  const storageAreas = { local, sync, session }
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
}

export default initStorageAreas()
