import wrapper from '@libs/wrapper'
import { SETTINGS_READ_ALL } from '@constants'
import messaging from './messaging'

const settings = wrapper({
  async install() {
    await messaging.ready()
  },

  readAll() {
    return messaging.postMessage({
      action: SETTINGS_READ_ALL,
    })
  },
})

export default settings
