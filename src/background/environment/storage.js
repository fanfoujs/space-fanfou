import messaging from './messaging'
import initStorageAreas from './storage-areas'
import expose from '@libs/expose'
import { isLooseKebabCase, isLooseCamelCase } from '@libs/stringCases'
import { STORAGE_READ, STORAGE_WRITE, STORAGE_DELETE, STORAGE_CHANGED } from '@constants'

let storageAreas

function registerHandlers() {
  messaging.registerHandler(STORAGE_READ, async payload => {
    const { storageAreaName, key } = payload
    const value = await storage.read(key, storageAreaName)

    return { value }
  })

  messaging.registerHandler(STORAGE_WRITE, async payload => {
    const { storageAreaName, key, value } = payload

    await storage.write(key, value, storageAreaName)
  })

  messaging.registerHandler(STORAGE_DELETE, async payload => {
    const { storageAreaName, key } = payload

    await storage.delete(key, storageAreaName)
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

  read(key, storageAreaName = 'local') {
    return storageAreas[storageAreaName].read(key)
  },

  write(key, value, storageAreaName = 'local') {
    if (process.env.NODE_ENV === 'development' && storageAreaName !== 'session') {
      verifyStorageKeyFormat(key)
    }

    return storageAreas[storageAreaName].write(key, value)
  },

  delete(key, storageAreaName = 'local') {
    return storageAreas[storageAreaName].delete(key)
  },
}

expose({
  storage: {
    readAll(storageAreaName = 'local') {
      return storageAreas[storageAreaName].readAll()
    },

    async import({ sync, local }) {
      await Promise.all([
        storageAreas.sync.writeAll(sync),
        storageAreas.local.writeAll(local),
      ])
    },

    async export() {
      return {
        sync: await storageAreas.sync.readAll(),
        local: await storageAreas.local.readAll(),
        // session 不需要导出
      }
    },
  },
})

export default storage
