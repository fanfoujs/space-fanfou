import { events } from '@platform/events'
import { browser } from 'wxt/browser'
import transformUrl from 'transform-url'

export default () => {
  // 参考：https://static.fanfou.com/js/bm_img_share.js

  const menuIds = []
  // Manifest V3: 不能在 create() 中使用 onclick，必须使用 onClicked 事件
  const menuItems = [ {
    id: 'share-to-fanfou-page',
    title: '分享到饭否',
    contexts: [ 'page', 'selection' ],
  // TODO: 拿不到链接标题
  // }, {
  //   id: 'share-to-fanfou-link',
  //   title: '分享链接到饭否',
  //   contexts: [ 'link' ],
  }, {
    id: 'share-to-fanfou-image',
    title: '分享图片到饭否',
    contexts: [ 'image' ],
  } ]

  function createSharerPopup(url, height) {
    // Service Worker 兼容：使用 browser.windows.create 替代 window.open
    return browser.windows.create({
      url,
      type: 'popup',
      width: 640,
      height,
    })
  }

  // Manifest V3: 使用 onClicked 事件监听器处理点击
  function handleMenuClick(info, tab) {
    let url
    let height = 440

    switch (info.menuItemId) {
    case 'share-to-fanfou-page':
      url = transformUrl('https://fanfou.com/sharer', {
        u: tab.url,
        t: tab.title,
        d: info.selectionText || '',
      })
      height = 440
      break

    case 'share-to-fanfou-image':
      url = transformUrl('https://fanfou.com/sharer/image', {
        u: tab.url,
        t: tab.title,
        img_src: info.srcUrl,
      })
      height = 540
      break

    default:
      return
    }

    return createSharerPopup(url, height)
  }

  async function registerMenuItems() {
    events.menuClicked.addListener(handleMenuClick)
    await browser.contextMenus.removeAll()
    menuIds.length = 0
    for (const menuItem of menuItems) {
      browser.contextMenus.create(menuItem)
      menuIds.push(menuItem.id)
    }
  }

  function unregisterMenuItems() {
    // 移除点击事件监听器
    events.menuClicked.removeListener(handleMenuClick)

    menuIds.forEach(menuId => browser.contextMenus.remove(menuId))
    menuIds.length = 0
  }

  return {
    onLoad() {
      return registerMenuItems()
    },

    onUnload() {
      unregisterMenuItems()
    },
  }
}
