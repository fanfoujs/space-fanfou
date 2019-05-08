import bridge from '../environment/bridge'
import wrapper from '@libs/wrapper'
import { PROXIED_AUDIO } from '@constants'

export default wrapper({
  install() {
    return bridge.ready()
  },

  play(audioUrl) {
    return bridge.postMessage({
      action: PROXIED_AUDIO,
      payload: { audioUrl },
    })
  },
})
