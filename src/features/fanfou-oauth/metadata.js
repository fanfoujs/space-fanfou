import { CONTROL_PLACEHOLDER } from '@constants'

export const options = {
  _: {
    defaultValue: true,
    label: '启用 OAuth 认证',
    comment: '已内置开发者密钥，无需自行申请。直接点击下方「开始授权」完成一次性授权即可。',
  },

  consumerKey: {
    defaultValue: '',
    label: `Consumer Key：${CONTROL_PLACEHOLDER}`,
    disableCloudSyncing: true,
    controlOptions: {
      placeholder: '留空则使用内置密钥',
      spellCheck: false,
      autoComplete: 'off',
    },
  },

  consumerSecret: {
    defaultValue: '',
    label: `Consumer Secret：${CONTROL_PLACEHOLDER}`,
    disableCloudSyncing: true,
    controlOptions: {
      placeholder: '留空则使用内置密钥',
      type: 'password',
      spellCheck: false,
      autoComplete: 'off',
    },
  },
}
