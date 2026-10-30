import { CONTROL_PLACEHOLDER } from '@constants'

export const options = {
  _: {
    defaultValue: true,
    label: '允许展开回复和转发的消息',
  },

  fetchStatusNumberPerClick: {
    defaultValue: 3,
    label: `每次展开 ${CONTROL_PLACEHOLDER} 条消息`,
    controlOptions: {
      step: 1,
      min: 1,
      max: 7,
    },
  },

  autoFetch: {
    defaultValue: false,
    label: '消息载入后自动展开 1 条消息',
  },
}
