import { CONTROL_PLACEHOLDER } from '@constants'

export const options = {
  _: {
    defaultValue: false,
    label: '显示关注者头像壁纸',
    comment: '自动读取关注用户头像并拼接为背景壁纸。该功能默认关闭，可在此手动开启。',
  },

  opacity: {
    defaultValue: 0.22,
    label: `壁纸透明度 ${CONTROL_PLACEHOLDER} (0.08 - 0.65)`,
    controlOptions: {
      step: 0.02,
      min: 0.08,
      max: 0.65,
    },
  },

  backgroundPreset: {
    defaultValue: 2,
    label: `蓝色背景方案 ${CONTROL_PLACEHOLDER} (1 - 10)`,
    comment: '1 雾蓝 / 2 海盐蓝 / 3 深海蓝 / 4 天青蓝 / 5 夜幕蓝 / 6 冰川蓝 / 7 钴蓝 / 8 风暴蓝 / 9 晨雾蓝 / 10 星夜蓝',
    controlOptions: {
      step: 1,
      min: 1,
      max: 10,
    },
  },

  fillBlueOnlyInGaps: {
    defaultValue: true,
    label: '蓝色仅填充头像间隙',
    comment: '开启后蓝色只显示在头像之间的空隙，不覆盖头像本身。',
  },

  prioritizeFavoriteFanfouers: {
    defaultValue: true,
    label: '优先显示有爱饭友（星标）',
    comment: '开启后，有爱饭友中的头像会优先出现在两侧头像墙前排。',
  },

  fetchIntervalDays: {
    defaultValue: 7,
    label: `自动刷新缓存周期 ${CONTROL_PLACEHOLDER} 天`,
    controlOptions: {
      step: 1,
      min: 1,
      max: 30,
    },
  },
}
