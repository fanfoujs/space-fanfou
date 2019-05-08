import messaging from '../environment/messaging'
import wrapper from '@libs/wrapper'
import { STORAGE_READ, STORAGE_WRITE, STORAGE_DELETE } from '@constants'

export default wrapper({
  install() {
    return messaging.ready()
  },

  async read(key, storageAreaName) {
    const { value } = await messaging.postMessage({
      action: STORAGE_READ,
      payload: { storageAreaName, key },
    })

    return value
  },

  async write(key, value, storageAreaName) {
    await messaging.postMessage({
      action: STORAGE_WRITE,
      payload: { storageAreaName, key, value },
    })
  },

  async delete(key, storageAreaName) {
    await messaging.postMessage({
      action: STORAGE_DELETE,
      payload: { storageAreaName, key },
    })
  },
})
