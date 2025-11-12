import { CONTROL_PLACEHOLDER } from '@constants'

export const options = {
  _: {
    defaultValue: false,
    label: '启用 OAuth 认证（填写下方字段并授权）',
    comment: '保存后请点击下方的「开始授权」按钮完成授权流程',
  },

  consumerKey: {
    defaultValue: '',
    label: `Consumer Key：${CONTROL_PLACEHOLDER}`,
    disableCloudSyncing: true,
    controlOptions: {
      placeholder: '例如：bc665764f87b0bd561…',
      spellCheck: false,
      autoComplete: 'off',
    },
  },

  consumerSecret: {
    defaultValue: '',
    label: `Consumer Secret：${CONTROL_PLACEHOLDER}`,
    disableCloudSyncing: true,
    controlOptions: {
      placeholder: '请输入 Consumer Secret',
      type: 'password',
      spellCheck: false,
      autoComplete: 'off',
    },
  },
}
