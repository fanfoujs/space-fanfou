import bridge from '../environment/bridge'
import wrapper from '@libs/wrapper'
import { FANFOU_OAUTH_API_REQUEST } from '@constants'

export default wrapper({
  install() {
    return bridge.ready()
  },

  request(args) {
    return bridge.postMessage({
      action: FANFOU_OAUTH_API_REQUEST,
      payload: args,
    })
  },
})
