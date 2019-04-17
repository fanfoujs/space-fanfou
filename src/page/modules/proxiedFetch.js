import bridge from '../environment/bridge'
import wrapper from '@libs/wrapper'
import { PROXIFIED_FETCH_GET } from '@constants'

export default wrapper({
  install() {
    return bridge.ready()
  },

  get(args) {
    return bridge.postMessage({
      action: PROXIFIED_FETCH_GET,
      payload: args,
    })
  },
})
