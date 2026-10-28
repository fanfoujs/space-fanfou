import { h } from 'preact'
import arrayRemove from 'just-remove'
import messaging from './messaging'
import VersionHistory from './components/VersionHistory'
import HelpAndSupport from './components/HelpAndSupport'
import OAuthPanel from './components/OAuthPanel'
import { GET_OPTION_DEFS } from '@constants'

const tabDefs = [ {
  title: '页面功能',
  sections: [ {
    title: 'Timeline 时间线',
    options: [
      'show-contextual-statuses',
      'enrich-statuses',
      'auto-pager',
      'process-unread-statuses',
    ],
  }, {
    title: '输入框',
    options: [
      'floating-status-form',
    ],
  }, {
    title: '侧栏',
    options: [
      'favorite-fanfouers',
      'check-saved-searches',
    ],
  }, {
    title: '批量管理',
    options: [
      'batch-remove-statuses',
      'batch-remove-private-messages',
      'batch-manage-relationships',
    ],
  }, {
    title: '其他',
    options: [
      'check-friendship',
    ],
  } ],
}, {
  title: '页面外观',
  sections: [ {
    title: '功能',
    options: [
      'remove-personalized-theme',
      'remove-app-recommendations',
    ],
  }, {
    title: '细节',
    options: [
      'translucent-sidebar',
      'box-shadows',
      'remove-logo-beta',
      'avatar-wallpaper',
    ],
  } ],
}, {
  title: '工具',
  sections: [ {
    title: '桌面通知',
    options: [
      'notifications',
    ],
  }, {
    title: '右键菜单',
    options: [
      'share-to-fanfou',
    ],
  }, {
    title: 'API 接入',
    options: [
      'fanfou-oauth',
    ],
    children: <OAuthPanel />,
  } ],
}, {
  title: '更新历史',
  children: <VersionHistory />,
}, {
  title: '帮助与支持',
  children: <HelpAndSupport />,
} ]

export default async () => {
  await messaging.ready()

  const optionDefs = await messaging.postMessage({
    action: GET_OPTION_DEFS,
  })

  const a = Object.keys(optionDefs)
  const b = []

  for (const tabDef of tabDefs) {
    if (!tabDef.sections) continue

    for (const section of tabDef.sections) {
      b.push(...section.options)

      section.options = section.options.map(featureName => optionDefs[featureName])
    }
  }

  const x = arrayRemove(a, b)
  const y = arrayRemove(b, a)

  if (x.length) {
    console.error('tabDefs 遗漏了部分 feature：', x)
  } else if (y.length) {
    console.error('tabDefs 包含了不存在的 feature：', y)
  }

  return tabDefs
}
