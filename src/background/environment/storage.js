import messaging from './messaging'
import initStorageAreas from './storage-areas'
import { isLooseKebabCase, isLooseCamelCase } from '@libs/stringCases'
import { STORAGE_READ, STORAGE_WRITE, STORAGE_DELETE, STORAGE_CHANGED } from '@constants'

let storageAreas

function registerHandlers() {
  messaging.registerHandler(STORAGE_READ, async payload => {
    const { storageArea, key } = payload
    const value = await storage.read(key, storageArea)

    return { value }
  })

  messaging.registerHandler(STORAGE_WRITE, async payload => {
    const { storageArea, key, value } = payload

    await storage.write(key, value, storageArea)
  })

  messaging.registerHandler(STORAGE_DELETE, async payload => {
    const { storageArea, key } = payload

    await storage.delete(key, storageArea)
  })

  storageAreas.listen(changeDetails => {
    messaging.broadcastMessage({
      action: STORAGE_CHANGED,
      payload: changeDetails,
    })
  })
}

// 格式应为 "foo-bar" 或者 "foo-bar/helloWorld"
function verifyStorageKeyFormat(key) {
  const splitString = key.split('/')
  const [ namespace, member ] = splitString
  const isValid = (
    splitString.length <= 2 &&
    isLooseKebabCase(namespace) &&
    (member ? isLooseCamelCase(member) : true)
  )

  if (!isValid) {
    throw new Error(`storage key 格式违法：${key}`)
  }
}

const storage = {
  install() {
    storageAreas = initStorageAreas()
    registerHandlers()
  },

  read(key, storageArea = 'local') {
    return storageAreas[storageArea].read(key)
  },

  write(key, value, storageArea = 'local') {
    if (process.env.NODE_ENV === 'development' && storageArea !== 'session') {
      verifyStorageKeyFormat(key)
    }

    return storageAreas[storageArea].write(key, value)
  },

  delete(key, storageArea = 'local') {
    return storageAreas[storageArea].delete(key)
  },
}

// 方便测试
if (process.env.NODE_ENV === 'development') {
  Object.assign(storage, {
    readAll(storageArea = 'local') {
      return storageAreas[storageArea].readAll()
    },

    async import({ sync, local }) {
      await Promise.all([
        storageAreas.sync.writeAll(sync),
        storageAreas.local.writeAll(local),
      ])
    },

    async export() {
      return {
        sync: await storage.readAll('sync'),
        local: await storage.readAll('local'),
        // session 不需要导出
      }
    },
  })

  window.storage = storage
}

export default storage
