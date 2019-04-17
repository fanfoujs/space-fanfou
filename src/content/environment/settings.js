import messaging from './messaging'
import wrapper from '@libs/wrapper'
import { SETTINGS_READ_ALL } from '@constants'

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
