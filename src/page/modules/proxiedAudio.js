import bridge from '../environment/bridge'
import wrapper from '@libs/wrapper'
import { PROXIFIED_AUDIO } from '@constants'

export default wrapper({
  install() {
    return bridge.ready()
  },

  play(audioUrl) {
    return bridge.postMessage({
      action: PROXIFIED_AUDIO,
      payload: { audioUrl },
    })
  },
})
