// 把原本在 page script 的音频播放放到 background script
// 因为 Chrome 限制非活动的标签页播放音频

import messaging from './messaging'
import { playBackgroundAudio } from '@platform/audio'
import { PROXIED_AUDIO } from '@constants'

function registerHandler() {
  messaging.registerHandler(PROXIED_AUDIO, payload => {
    const { audioUrl } = payload

    return playBackgroundAudio(audioUrl)
  })
}

export default {
  install() {
    registerHandler()
  },
}
