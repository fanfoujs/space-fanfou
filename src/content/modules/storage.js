import messaging from '../environment/messaging'
import wrapper from '@libs/wrapper'
import { STORAGE_READ, STORAGE_WRITE, STORAGE_DELETE } from '@constants'

export default wrapper({
  install() {
    return messaging.ready()
  },

  async read(key, storageArea) {
    const { value } = await messaging.postMessage({
      action: STORAGE_READ,
      payload: { storageArea, key },
    })

    return value
  },

  async write(key, value, storageArea) {
    await messaging.postMessage({
      action: STORAGE_WRITE,
      payload: { storageArea, key, value },
    })
  },

  async delete(key, storageArea) {
    await messaging.postMessage({
      action: STORAGE_DELETE,
      payload: { storageArea, key },
    })
  },
})
