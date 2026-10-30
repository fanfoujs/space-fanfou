import bridge from '../environment/bridge'
import wrapper from '@libs/wrapper'
import { FANFOU_OAUTH_API_REQUEST } from '@constants'

function request(method, params) {
  return bridge.postMessage({
    action: FANFOU_OAUTH_API_REQUEST,
    payload: { method, params },
  })
}

export default wrapper({
  install() {
    return bridge.ready()
  },

  getUser(params) {
    return request('getUser', params)
  },

  getFollowings(params) {
    return request('getFollowings', params)
  },

  checkFriendshipDetail(params) {
    return request('checkFriendshipDetail', params)
  },
})
