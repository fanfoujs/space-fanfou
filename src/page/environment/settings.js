import wrapper from '@libs/wrapper'
import { SETTINGS_READ_ALL } from '@constants'
import bridge from './bridge'

const settings = wrapper({
  async install() {
    await bridge.ready()
  },

  readAll() {
    return bridge.postMessage({
      action: SETTINGS_READ_ALL,
    })
  },
})

export default settings
