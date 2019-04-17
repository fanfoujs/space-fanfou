// 把原本在 page script 的音频播放放到 background script
// 因为 Chrome 限制非活动的标签页播放音频

import playSound from '@libs/playSound'
import { PROXIFIED_AUDIO } from '@constants'
import messaging from './messaging'

function registerHandler() {
  messaging.registerHandler(PROXIFIED_AUDIO, payload => {
    const { audioUrl } = payload

    playSound(audioUrl)
  })
}

export default {
  install() {
    registerHandler()
  },
}
