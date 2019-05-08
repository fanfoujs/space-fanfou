import bridge from '../environment/bridge'
import wrapper from '@libs/wrapper'
import { PROXIED_CREATE_TAB } from '@constants'

export default wrapper({
  install() {
    return bridge.ready()
  },

  create(args) {
    return bridge.postMessage({
      action: PROXIED_CREATE_TAB,
      payload: args,
    })
  },
})
