import bridge from '../environment/bridge'
import wrapper from '@libs/wrapper'
import { STORAGE_READ, STORAGE_WRITE, STORAGE_DELETE } from '@constants'

export default wrapper({
  install() {
    return bridge.ready()
  },

  async read(key, storageAreaName) {
    const { value } = await bridge.postMessage({
      action: STORAGE_READ,
      payload: { storageAreaName, key },
    })

    return value
  },

  async write(key, value, storageAreaName) {
    await bridge.postMessage({
      action: STORAGE_WRITE,
      payload: { storageAreaName, key, value },
    })
  },

  async delete(key, storageAreaName) {
    await bridge.postMessage({
      action: STORAGE_DELETE,
      payload: { storageAreaName, key },
    })
  },
})
